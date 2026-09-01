import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from backend.app.core.database import DatabaseService
from backend.app.core.security import get_current_user, require_admin, get_optional_current_user
from backend.app.schemas.schemas import TenantCreate, TenantUpdate, FamilyMemberCreate, VehicleCreate
from backend.app.services.log_service import LogService

tenants_router = APIRouter(prefix="/tenants", tags=["Tenants"])
family_router = APIRouter(prefix="/family-members", tags=["Family Members"])
vehicles_router = APIRouter(prefix="/vehicles", tags=["Vehicles"])

# --- Tenants ---
@tenants_router.get("", response_model=List[Dict[str, Any]])
async def get_tenants(current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    client = DatabaseService.get_client()
    if client:
        try:
            res = client.table("tenant").select("*").execute()
            if res.data:
                return res.data
        except Exception:
            pass
    return DatabaseService.get_store().get("tenant", [])

@tenants_router.post("", response_model=Dict[str, Any])
async def create_tenant(payload: TenantCreate, current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    tenant_id = payload.tenant_id or f"TNT-{uuid.uuid4().hex[:6].upper()}"
    tenant_data = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "resident_id": payload.resident_id,
        "name": payload.name,
        "tower": payload.tower,
        "flat": payload.flat,
        "phone": payload.phone,
        "email": payload.email,
        "lease_start_date": payload.lease_start_date,
        "lease_end_date": payload.lease_end_date,
        "verification_status": payload.verification_status or "Pending",
        "society_id": payload.society_id
    }
    client = DatabaseService.get_client()
    if client:
        try:
            client.table("tenant").insert(tenant_data).execute()
        except Exception:
            pass
    store = DatabaseService.get_store()
    store["tenant"].append(tenant_data)
    return {"status": "success", "message": "Tenant registered successfully", "tenant": tenant_data}

@tenants_router.put("/{tenant_id}/verify")
async def verify_tenant(tenant_id: str, status_val: str = "Verified", current_user: Dict[str, Any] = Depends(require_admin)):
    client = DatabaseService.get_client()
    if client:
        try:
            client.table("tenant").update({"verification_status": status_val}).eq("tenant_id", tenant_id).execute()
        except Exception:
            pass
    store = DatabaseService.get_store()
    for t in store.get("tenant", []):
        if t.get("tenant_id") == tenant_id:
            t["verification_status"] = status_val
    return {"status": "success", "message": f"Tenant {tenant_id} marked as {status_val}"}

# --- Family Members ---
@family_router.get("", response_model=List[Dict[str, Any]])
async def get_family_members(resident_id: Optional[str] = None):
    client = DatabaseService.get_client()
    if client:
        try:
            q = client.table("family_member").select("*")
            if resident_id:
                q = q.eq("resident_id", resident_id)
            res = q.execute()
            if res.data:
                return res.data
        except Exception:
            pass
    store = DatabaseService.get_store().get("family_member", [])
    if resident_id:
        return [m for m in store if m.get("resident_id") == resident_id]
    return store

@family_router.post("", response_model=Dict[str, Any])
async def add_family_member(payload: FamilyMemberCreate):
    member_id = payload.member_id or f"FAM-{uuid.uuid4().hex[:6].upper()}"
    data = payload.model_dump()
    data["member_id"] = member_id
    data["id"] = str(uuid.uuid4())
    client = DatabaseService.get_client()
    if client:
        try:
            client.table("family_member").insert(data).execute()
        except Exception:
            pass
    DatabaseService.get_store()["family_member"].append(data)
    return {"status": "success", "member": data}

# --- Vehicles ---
@vehicles_router.get("", response_model=List[Dict[str, Any]])
async def get_vehicles(resident_id: Optional[str] = None):
    client = DatabaseService.get_client()
    if client:
        try:
            q = client.table("vehicle").select("*")
            if resident_id:
                q = q.eq("resident_id", resident_id)
            res = q.execute()
            if res.data:
                return res.data
        except Exception:
            pass
    store = DatabaseService.get_store().get("vehicle", [])
    if resident_id:
        return [v for v in store if v.get("resident_id") == resident_id]
    return store

@vehicles_router.post("", response_model=Dict[str, Any])
async def add_vehicle(payload: VehicleCreate):
    vehicle_id = payload.vehicle_id or f"VEH-{uuid.uuid4().hex[:6].upper()}"
    data = payload.model_dump()
    data["vehicle_id"] = vehicle_id
    data["id"] = str(uuid.uuid4())
    client = DatabaseService.get_client()
    if client:
        try:
            client.table("vehicle").insert(data).execute()
        except Exception:
            pass
    DatabaseService.get_store()["vehicle"].append(data)
    return {"status": "success", "vehicle": data}
