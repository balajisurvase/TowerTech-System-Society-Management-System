from datetime import datetime
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from backend.app.core.database import DatabaseService
from backend.app.core.security import get_current_user, require_admin, get_optional_current_user
from backend.app.schemas.schemas import NoticeCreate, EmergencyAlertCreate
from backend.app.services.notification_service import NotificationService
from backend.app.services.log_service import LogService

notices_router = APIRouter(prefix="/notices", tags=["Notices & Announcements"])
emergency_router = APIRouter(prefix="/emergency", tags=["Emergency Module"])

# ==================== NOTICES ====================

@notices_router.get("", response_model=List[Dict[str, Any]])
async def get_notices(
    category: Optional[str] = Query(None),
    tower: Optional[str] = Query(None),
    society_id: Optional[str] = Query(None)
):
    client = DatabaseService.get_client()
    notices = []
    if client:
        try:
            q = client.table("notice").select("*")
            if society_id:
                q = q.eq("society_id", society_id)
            if category and category != "All":
                q = q.eq("category", category)
            res = q.order("created_at", desc=True).execute()
            notices = res.data or []
        except Exception:
            notices = []

    if not notices:
        store = DatabaseService.get_store()
        notices = list(store.get("notice", []))
        if category and category != "All":
            notices = [n for n in notices if n.get("category") == category]

    if not notices:
        notices = [
            {
                "notice_id": "NOT-01",
                "title": "Annual General Meeting (AGM) 2026",
                "content": "The Society AGM is scheduled for Sunday at 10:30 AM in the Clubhouse. Agenda includes financial audit presentation, rooftop solar panel proposal, and committee elections.",
                "priority": "High",
                "category": "Meeting",
                "target_tower": "All",
                "posted_by": "Management Committee",
                "created_at": "2026-03-01T08:00:00Z",
                "society_id": "GV2026"
            },
            {
                "notice_id": "NOT-02",
                "title": "Scheduled Overhead Water Tank Cleaning",
                "content": "Towers A & B overhead water tanks will undergo deep cleaning and disinfection on Tuesday from 10:00 AM to 02:00 PM. Water supply will be paused during this period.",
                "priority": "Urgent",
                "category": "Maintenance",
                "target_tower": "Tower A",
                "posted_by": "Facility Manager",
                "created_at": "2026-02-28T14:30:00Z",
                "society_id": "GV2026"
            }
        ]

    # Filter target tower
    if tower and tower != "All":
        notices = [n for n in notices if n.get("target_tower") in ["All", tower]]

    return notices

@notices_router.post("", response_model=Dict[str, Any])
async def create_notice(
    payload: NoticeCreate,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    notice_id = f"NOT-{uuid.uuid4().hex[:6].upper()}"
    notice_data = payload.model_dump()
    notice_data["id"] = str(uuid.uuid4())
    notice_data["notice_id"] = notice_id
    notice_data["created_at"] = datetime.utcnow().isoformat()
    notice_data["posted_by"] = current_user.get("name", "Management Committee") if current_user else "Admin"

    client = DatabaseService.get_client()
    if client:
        try:
            client.table("notice").insert(notice_data).execute()
        except Exception:
            pass

    store = DatabaseService.get_store()
    store["notice"].append(notice_data)

    # Broadcast notification to society
    await NotificationService.broadcast_notification(
        society_id=payload.society_id,
        title=f"Notice: {payload.title}",
        message=f"[{payload.priority}] {payload.content[:90]}...",
        notif_type="info"
    )

    return {"status": "success", "message": "Notice published successfully", "notice": notice_data}

@notices_router.delete("/{notice_id}")
async def delete_notice(notice_id: str, current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    client = DatabaseService.get_client()
    if client:
        try:
            client.table("notice").delete().eq("notice_id", notice_id).execute()
        except Exception:
            pass

    store = DatabaseService.get_store()
    store["notice"] = [n for n in store.get("notice", []) if n.get("notice_id") != notice_id]
    return {"status": "success", "message": f"Notice {notice_id} removed"}

# ==================== EMERGENCY MODULE ====================

@emergency_router.get("/alerts", response_model=List[Dict[str, Any]])
async def get_emergency_alerts(society_id: Optional[str] = Query(None)):
    client = DatabaseService.get_client()
    alerts = []
    if client:
        try:
            q = client.table("emergency_alert").select("*")
            if society_id:
                q = q.eq("society_id", society_id)
            res = q.order("created_at", desc=True).execute()
            alerts = res.data or []
        except Exception:
            alerts = []

    if not alerts:
        store = DatabaseService.get_store()
        alerts = list(store.get("emergency_alert", []))

    return alerts

@emergency_router.post("/trigger", response_model=Dict[str, Any])
async def trigger_emergency_alert(
    payload: EmergencyAlertCreate,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    alert_id = f"EMG-{uuid.uuid4().hex[:6].upper()}"
    alert_data = payload.model_dump()
    alert_data["id"] = str(uuid.uuid4())
    alert_data["alert_id"] = alert_id
    alert_data["created_at"] = datetime.utcnow().isoformat()
    alert_data["status"] = "Active"
    alert_data["created_by"] = current_user.get("name", "Security Desk") if current_user else "Security"

    client = DatabaseService.get_client()
    if client:
        try:
            client.table("emergency_alert").insert(alert_data).execute()
        except Exception:
            pass

    store = DatabaseService.get_store()
    store["emergency_alert"].append(alert_data)

    # Broadcast high-priority emergency notification immediately to ALL
    await NotificationService.broadcast_notification(
        society_id=payload.society_id,
        title=f"🚨 EMERGENCY ALERT: {payload.alert_type.upper()}",
        message=f"{payload.title} - {payload.description}. Location: {payload.location_details or 'Premises'}",
        notif_type="emergency"
    )

    return {
        "status": "success",
        "message": f"🚨 Emergency broadcast #{alert_id} dispatched to all residents, staff, and security units!",
        "alert": alert_data
    }

@emergency_router.put("/resolve/{alert_id}")
async def resolve_emergency_alert(alert_id: str):
    client = DatabaseService.get_client()
    if client:
        try:
            client.table("emergency_alert").update({"status": "Resolved"}).eq("alert_id", alert_id).execute()
        except Exception:
            pass

    store = DatabaseService.get_store()
    for a in store.get("emergency_alert", []):
        if a.get("alert_id") == alert_id:
            a["status"] = "Resolved"
            break

    return {"status": "success", "message": f"Emergency alert #{alert_id} marked as resolved."}
