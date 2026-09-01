from datetime import datetime
import random
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from backend.app.core.database import DatabaseService
from backend.app.core.security import get_current_user, require_security, require_admin, get_optional_current_user
from backend.app.schemas.schemas import VisitorCreate, VisitorVerifyRequest, ParcelCreate, SecurityCreate, StaffCreate
from backend.app.services.notification_service import NotificationService
from backend.app.services.log_service import LogService

visitors_router = APIRouter(prefix="/visitors", tags=["Visitors"])
parcels_router = APIRouter(prefix="/parcels", tags=["Parcels"])
security_router = APIRouter(prefix="/security", tags=["Security & Guards"])
staff_router = APIRouter(prefix="/staff", tags=["Staff Directory"])

# ==================== VISITORS ====================

@visitors_router.get("", response_model=List[Dict[str, Any]])
async def get_visitors(
    resident_id: Optional[str] = Query(None),
    society_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    client = DatabaseService.get_client()
    visitors = []
    if client:
        try:
            q = client.table("visitor").select("*")
            if resident_id:
                q = q.eq("resident_id", resident_id)
            if society_id:
                q = q.eq("society_id", society_id)
            if status and status != "All":
                q = q.eq("status", status)
            res = q.order("entry_time", desc=True).execute()
            visitors = res.data or []
        except Exception:
            visitors = []

    if not visitors:
        store = DatabaseService.get_store()
        visitors = list(store.get("visitor", []))
        if resident_id:
            visitors = [v for v in visitors if v.get("resident_id") == resident_id]
        if society_id:
            visitors = [v for v in visitors if v.get("society_id") == society_id]
        if status and status != "All":
            visitors = [v for v in visitors if v.get("status") == status]

    return visitors

@visitors_router.post("", response_model=Dict[str, Any])
async def create_visitor(payload: VisitorCreate, current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    visitor_id = f"VIS-{uuid.uuid4().hex[:6].upper()}"
    otp_code = f"{random.randint(100000, 999999)}"
    qr_code = f"QR-PASS-{uuid.uuid4().hex[:8].upper()}"

    entry_time = payload.entry_time or datetime.utcnow().isoformat()
    
    visitor_data = payload.model_dump()
    visitor_data["id"] = str(uuid.uuid4())
    visitor_data["visitor_id"] = visitor_id
    visitor_data["otp_code"] = payload.otp_code or otp_code
    visitor_data["qr_pass_code"] = payload.qr_pass_code or qr_code
    visitor_data["entry_time"] = entry_time
    visitor_data["status"] = payload.status or "Expected"

    client = DatabaseService.get_client()
    if client:
        try:
            client.table("visitor").insert(visitor_data).execute()
        except Exception:
            pass

    store = DatabaseService.get_store()
    store["visitor"].append(visitor_data)

    # Notify Resident of visitor request / arrival
    await NotificationService.create_notification(
        recipient_id=payload.resident_id,
        recipient_role="resident",
        title=f"Visitor Alert: {payload.name} ({payload.purpose})",
        message=f"{payload.name} has requested entry for Flat {payload.tower}-{payload.flat_no}. Passcode: {visitor_data['otp_code']}",
        notif_type="alert",
        society_id=payload.society_id
    )

    return {
        "status": "success",
        "message": f"Visitor pass #{visitor_id} generated!",
        "visitor": visitor_data
    }

@visitors_router.post("/verify-pass", response_model=Dict[str, Any])
async def verify_visitor_pass(payload: VisitorVerifyRequest):
    store = DatabaseService.get_store()
    client = DatabaseService.get_client()
    visitor = None

    if client:
        try:
            if payload.otp_code:
                res = client.table("visitor").select("*").eq("otp_code", payload.otp_code).execute()
                if res.data:
                    visitor = res.data[0]
            elif payload.qr_pass_code:
                res = client.table("visitor").select("*").eq("qr_pass_code", payload.qr_pass_code).execute()
                if res.data:
                    visitor = res.data[0]
        except Exception:
            pass

    if not visitor:
        for v in store.get("visitor", []):
            if (payload.otp_code and v.get("otp_code") == payload.otp_code) or \
               (payload.qr_pass_code and v.get("qr_pass_code") == payload.qr_pass_code):
                visitor = v
                break

    if not visitor:
        raise HTTPException(status_code=404, detail="Invalid OTP or QR Passcode. Gate entry denied.")

    return {
        "status": "success",
        "message": "Valid visitor pass verified",
        "visitor": visitor
    }

@visitors_router.put("/{visitor_id}/entry")
async def record_visitor_entry(visitor_id: str):
    now = datetime.utcnow().isoformat()
    updates = {"status": "In Premises", "entry_time": now}
    
    client = DatabaseService.get_client()
    if client:
        try:
            client.table("visitor").update(updates).eq("visitor_id", visitor_id).execute()
        except Exception:
            pass

    store = DatabaseService.get_store()
    for v in store.get("visitor", []):
        if v.get("visitor_id") == visitor_id:
            v.update(updates)
            break

    return {"status": "success", "message": f"Visitor {visitor_id} checked into premises", "entry_time": now}

@visitors_router.put("/{visitor_id}/exit")
async def record_visitor_exit(visitor_id: str):
    now = datetime.utcnow().isoformat()
    updates = {"status": "Checked Out", "exit_time": now}
    
    client = DatabaseService.get_client()
    if client:
        try:
            client.table("visitor").update(updates).eq("visitor_id", visitor_id).execute()
        except Exception:
            pass

    store = DatabaseService.get_store()
    for v in store.get("visitor", []):
        if v.get("visitor_id") == visitor_id:
            v.update(updates)
            break

    return {"status": "success", "message": f"Visitor {visitor_id} checked out", "exit_time": now}

# ==================== PARCELS ====================

@parcels_router.get("", response_model=List[Dict[str, Any]])
async def get_parcels(resident_id: Optional[str] = Query(None), society_id: Optional[str] = Query(None)):
    client = DatabaseService.get_client()
    parcels = []
    if client:
        try:
            q = client.table("parcel").select("*")
            if resident_id:
                q = q.eq("resident_id", resident_id)
            if society_id:
                q = q.eq("society_id", society_id)
            res = q.order("received_at", desc=True).execute()
            parcels = res.data or []
        except Exception:
            parcels = []

    if not parcels:
        store = DatabaseService.get_store()
        parcels = list(store.get("parcel", []))
        if resident_id:
            parcels = [p for p in parcels if p.get("resident_id") == resident_id]
        if society_id:
            parcels = [p for p in parcels if p.get("society_id") == society_id]

    return parcels

@parcels_router.post("", response_model=Dict[str, Any])
async def log_parcel_arrival(payload: ParcelCreate):
    parcel_id = f"PAR-{uuid.uuid4().hex[:6].upper()}"
    received_at = payload.received_at or datetime.utcnow().isoformat()

    parcel_data = payload.model_dump()
    parcel_data["id"] = str(uuid.uuid4())
    parcel_data["parcel_id"] = parcel_id
    parcel_data["received_at"] = received_at
    parcel_data["status"] = payload.status or "Held at Gate"

    client = DatabaseService.get_client()
    if client:
        try:
            client.table("parcel").insert(parcel_data).execute()
        except Exception:
            pass

    store = DatabaseService.get_store()
    store["parcel"].append(parcel_data)

    # Notify resident of parcel arrival
    await NotificationService.create_notification(
        recipient_id=payload.resident_id,
        recipient_role="resident",
        title=f"Parcel Arrived: {payload.courier_company}",
        message=f"A package from {payload.courier_company} for Flat {payload.tower}-{payload.flat_no} has arrived at the Main Security Gate.",
        notif_type="info",
        society_id=payload.society_id
    )

    return {"status": "success", "message": "Parcel recorded at gate", "parcel": parcel_data}

@parcels_router.put("/{parcel_id}/collect")
async def collect_parcel(parcel_id: str):
    now = datetime.utcnow().isoformat()
    updates = {"status": "Collected", "collected_at": now}

    client = DatabaseService.get_client()
    if client:
        try:
            client.table("parcel").update(updates).eq("parcel_id", parcel_id).execute()
        except Exception:
            pass

    store = DatabaseService.get_store()
    for p in store.get("parcel", []):
        if p.get("parcel_id") == parcel_id:
            p.update(updates)
            break

    return {"status": "success", "message": f"Parcel {parcel_id} marked as collected", "collected_at": now}

# ==================== SECURITY & STAFF ====================

@security_router.get("", response_model=List[Dict[str, Any]])
async def get_security_guards(society_id: Optional[str] = Query(None)):
    client = DatabaseService.get_client()
    if client:
        try:
            res = client.table("security").select("*").execute()
            if res.data:
                return [{k: v for k, v in g.items() if k != "password"} for g in res.data]
        except Exception:
            pass

    store = DatabaseService.get_store()
    guards = store.get("security", [])
    if not guards:
        guards = [
            {"security_id": "S001", "name": "Ramesh Kumar (Chief Guard)", "phone": "+91 98765 11111", "shift": "Day (06:00 - 18:00)", "role": "security", "society_id": "GV2026"},
            {"security_id": "S002", "name": "Vikram Singh (Night Guard)", "phone": "+91 98765 11112", "shift": "Night (18:00 - 06:00)", "role": "security", "society_id": "GV2026"}
        ]
    return [{k: v for k, v in g.items() if k != "password"} for g in guards]

@security_router.post("", response_model=Dict[str, Any])
async def create_security_guard(payload: SecurityCreate, current_user: Dict[str, Any] = Depends(require_admin)):
    data = payload.model_dump()
    data["id"] = str(uuid.uuid4())
    client = DatabaseService.get_client()
    if client:
        try:
            client.table("security").insert(data).execute()
        except Exception:
            pass
    DatabaseService.get_store()["security"].append(data)
    return {"status": "success", "guard": {k: v for k, v in data.items() if k != "password"}}

@staff_router.get("", response_model=List[Dict[str, Any]])
async def get_staff(service_type: Optional[str] = Query(None), society_id: Optional[str] = Query(None)):
    client = DatabaseService.get_client()
    if client:
        try:
            q = client.table("staff").select("*")
            if service_type and service_type != "All":
                q = q.eq("service_type", service_type)
            res = q.execute()
            if res.data:
                return res.data
        except Exception:
            pass

    store = DatabaseService.get_store()
    staff_list = store.get("staff", [])
    if not staff_list:
        staff_list = [
            {"staff_id": "ST-01", "name": "Santosh Electricals", "service_type": "Electrician", "phone": "+91 98234 56781", "rating": 4.9, "status": "Available", "society_id": "GV2026"},
            {"staff_id": "ST-02", "name": "Manoj Quick Plumber", "service_type": "Plumber", "phone": "+91 98234 56782", "rating": 4.8, "status": "Available", "society_id": "GV2026"},
            {"staff_id": "ST-03", "name": "Sunil Carpenter Works", "service_type": "Carpenter", "phone": "+91 98234 56783", "rating": 4.7, "status": "Available", "society_id": "GV2026"},
            {"staff_id": "ST-04", "name": "CleanWave Housekeeping", "service_type": "Cleaner", "phone": "+91 98234 56784", "rating": 4.9, "status": "Available", "society_id": "GV2026"}
        ]
    return staff_list
