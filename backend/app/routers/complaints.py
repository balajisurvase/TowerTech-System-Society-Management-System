from datetime import datetime, date
from typing import Any, Dict, List, Optional, Union
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from backend.app.core.database import DatabaseService
from backend.app.core.security import get_current_user, require_admin, get_optional_current_user
from backend.app.schemas.schemas import ComplaintCreate, ComplaintStatusUpdate, ComplaintCommentCreate, ComplaintResponse
from backend.app.ai.complaint_intelligence import ComplaintIntelligence
from backend.app.services.notification_service import NotificationService
from backend.app.services.log_service import LogService

router = APIRouter(prefix="/complaints", tags=["Complaints"])

@router.get("", response_model=List[Dict[str, Any]])
async def get_complaints(
    resident_id: Optional[str] = Query(None),
    society_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    client = DatabaseService.get_client()
    complaints = []

    if client:
        try:
            q = client.table("complaint").select("*")
            if resident_id:
                q = q.eq("resident_id", resident_id)
            if society_id:
                q = q.eq("society_id", society_id)
            if status and status != "All":
                q = q.eq("status", status)
            if category and category != "All":
                q = q.eq("category", category)
            
            res = q.order("created_at", desc=True).execute()
            complaints = res.data or []
        except Exception:
            complaints = []

    # Merge / Fallback with local store
    if not complaints:
        store = DatabaseService.get_store()
        complaints = list(store.get("complaint", []))
        if resident_id:
            complaints = [c for c in complaints if c.get("resident_id") == resident_id]
        if society_id:
            complaints = [c for c in complaints if c.get("society_id") == society_id]
        if status and status != "All":
            complaints = [c for c in complaints if c.get("status") == status]
        if category and category != "All":
            complaints = [c for c in complaints if c.get("category") == category]

    # Attach resident names and media
    resident_ids = list({c.get("resident_id") for c in complaints if c.get("resident_id")})
    complaint_ids = list({c.get("complaint_id") for c in complaints if c.get("complaint_id")})

    residents_map = {}
    media_map = {}

    if client and resident_ids:
        try:
            res_data = client.table("resident").select("resident_id, name").in_("resident_id", resident_ids).execute()
            residents_map = {r["resident_id"]: r["name"] for r in (res_data.data or [])}
        except Exception:
            pass

    if client and complaint_ids:
        try:
            m_data = client.table("media").select("*").in_("complaint_id", complaint_ids).execute()
            for m in (m_data.data or []):
                media_map.setdefault(m.get("complaint_id"), []).append(m)
        except Exception:
            pass

    # Local store fallback for resident names and media
    store = DatabaseService.get_store()
    for r in store.get("resident", []):
        if r.get("resident_id") not in residents_map:
            residents_map[r.get("resident_id")] = r.get("name")

    for m in store.get("complaint_media", []):
        media_map.setdefault(m.get("complaint_id"), []).append(m)

    enriched = []
    for c in complaints:
        cid = c.get("complaint_id")
        rid = c.get("resident_id")
        enriched.append({
            **c,
            "resident_name": residents_map.get(rid, c.get("resident_name", "Resident")),
            "media": media_map.get(cid, c.get("media", []))
        })

    return enriched

@router.get("/{complaint_id}")
async def get_complaint_by_id(complaint_id: str):
    client = DatabaseService.get_client()
    if client:
        try:
            res = client.table("complaint").select("*").eq("complaint_id", complaint_id).execute()
            if res.data and len(res.data) > 0:
                c = res.data[0]
                # Attach media
                m_res = client.table("media").select("*").eq("complaint_id", complaint_id).execute()
                c["media"] = m_res.data or []
                return c
        except Exception:
            pass

    store = DatabaseService.get_store()
    for c in store.get("complaint", []):
        if c.get("complaint_id") == complaint_id or c.get("id") == complaint_id:
            c["media"] = [m for m in store.get("complaint_media", []) if m.get("complaint_id") == complaint_id]
            return c

    raise HTTPException(status_code=404, detail="Complaint not found")

@router.post("", response_model=Dict[str, Any])
async def create_complaint(
    payload: ComplaintCreate,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    if not payload.resident_id or not payload.tower or not payload.flat_no:
        raise HTTPException(
            status_code=400,
            detail="Resident ID, Tower, and Flat Number are mandatory for filing a complaint."
        )

    # 1. AI Categorization & Priority prediction
    ai_insights = ComplaintIntelligence.categorize_and_prioritize(payload.description)
    category = payload.category if (payload.category and payload.category != "General") else ai_insights["predicted_category"]
    priority = ai_insights["predicted_priority"]

    # 2. Sequential ID generation
    timestamp = int(datetime.utcnow().timestamp())
    complaint_id = f"C{timestamp % 100000:05d}"
    raw_id = str(uuid.uuid4())

    complaint_data = {
        "id": raw_id,
        "complaint_id": complaint_id,
        "resident_id": payload.resident_id,
        "tower": payload.tower,
        "flat_no": str(payload.flat_no),
        "complaint_date": payload.complaint_date or date.today().isoformat(),
        "category": category,
        "description": payload.description,
        "status": payload.status or "Pending",
        "priority": priority,
        "society_id": payload.society_id,
        "created_at": datetime.utcnow().isoformat()
    }

    client = DatabaseService.get_client()
    if client:
        try:
            client.table("complaint").insert(complaint_data).execute()
        except Exception:
            # Try minimal schema insert
            try:
                minimal = {
                    "complaint_id": complaint_id,
                    "resident_id": payload.resident_id,
                    "tower": payload.tower,
                    "flat_no": str(payload.flat_no),
                    "complaint_date": payload.complaint_date or date.today().isoformat(),
                    "description": payload.description,
                    "status": "Pending",
                    "society_id": payload.society_id
                }
                client.table("complaint").insert(minimal).execute()
            except Exception:
                pass

    store = DatabaseService.get_store()
    store["complaint"].append(complaint_data)

    # Save media if provided
    if payload.media_url:
        media_entry = {
            "id": str(uuid.uuid4()),
            "media_id": f"M-{timestamp}-{str(uuid.uuid4())[:4]}",
            "complaint_id": complaint_id,
            "file_url": payload.media_url,
            "uploaded_by": payload.resident_id,
            "society_id": payload.society_id,
            "uploaded_at": datetime.utcnow().isoformat()
        }
        if client:
            try:
                client.table("media").insert(media_entry).execute()
            except Exception:
                pass
        store["complaint_media"].append(media_entry)

    # 3. Create Notification for Admin
    await NotificationService.create_notification(
        recipient_id="ADMIN",
        recipient_role="admin",
        title=f"New Complaint: {category} ({priority})",
        message=f"Flat {payload.tower}-{payload.flat_no} filed complaint #{complaint_id}: {payload.description[:60]}...",
        notif_type="complaint",
        society_id=payload.society_id
    )

    # 4. Audit Log
    user_name = current_user.get("name", "Resident") if current_user else "Resident"
    await LogService.log_activity(
        user_id=payload.resident_id,
        user_name=user_name,
        user_role="resident",
        action="CREATE",
        module="Complaint",
        record_id=complaint_id,
        details=f"Filed complaint #{complaint_id} ({category}) with AI priority {priority}",
        society_id=payload.society_id
    )

    return {
        "status": "success",
        "message": "Complaint filed successfully!",
        "complaint_id": complaint_id,
        "ai_insights": ai_insights,
        "complaint": complaint_data
    }

@router.put("/{complaint_id}/status")
async def update_complaint_status(
    complaint_id: str,
    payload: ComplaintStatusUpdate,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    updates: Dict[str, Any] = {"status": payload.status}
    if payload.admin_comment:
        updates["admin_comment"] = payload.admin_comment
    if payload.assigned_to:
        updates["assigned_to"] = payload.assigned_to
    if payload.priority:
        updates["priority"] = payload.priority

    client = DatabaseService.get_client()
    if client:
        try:
            client.table("complaint").update(updates).eq("complaint_id", complaint_id).execute()
        except Exception:
            pass

    store = DatabaseService.get_store()
    target = None
    for c in store.get("complaint", []):
        if c.get("complaint_id") == complaint_id or c.get("id") == complaint_id:
            c.update(updates)
            target = c
            break

    # Notify Resident
    if target and target.get("resident_id"):
        await NotificationService.create_notification(
            recipient_id=target["resident_id"],
            recipient_role="resident",
            title=f"Complaint Status: {payload.status}",
            message=f"Your complaint #{complaint_id} status updated to {payload.status}." + (f" Admin comment: {payload.admin_comment}" if payload.admin_comment else ""),
            notif_type="complaint",
            society_id=target.get("society_id", "GV2026")
        )

    return {"status": "success", "message": f"Complaint {complaint_id} updated to {payload.status}"}

@router.delete("/{complaint_id}")
async def delete_complaint(
    complaint_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    client = DatabaseService.get_client()
    if client:
        try:
            client.table("complaint").delete().eq("complaint_id", complaint_id).execute()
        except Exception:
            pass

    store = DatabaseService.get_store()
    store["complaint"] = [c for c in store.get("complaint", []) if c.get("complaint_id") != complaint_id and c.get("id") != complaint_id]

    return {"status": "success", "message": f"Complaint {complaint_id} deleted"}
