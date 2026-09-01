import random
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from backend.app.core.database import DatabaseService
from backend.app.core.security import get_current_user, require_admin, get_optional_current_user
from backend.app.schemas.schemas import ResidentCreate, ResidentUpdate, ResidentResponse
from backend.app.services.log_service import LogService

router = APIRouter(prefix="/residents", tags=["Residents"])

@router.get("", response_model=List[Dict[str, Any]])
async def get_residents(
    tower: Optional[str] = Query(None),
    floor: Optional[int] = Query(None),
    flat: Optional[str] = Query(None),
    society_id: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    client = DatabaseService.get_client()
    data = []
    
    if client:
        try:
            q = client.table("resident").select("*")
            if society_id:
                q = q.eq("society_id", society_id)
            if tower and tower != "All":
                q = q.eq("tower", tower)
            if floor is not None and str(floor) != "All":
                q = q.eq("floor", floor)
            if flat and flat != "All":
                q = q.eq("flat", flat)
            
            res = q.order("resident_id").execute()
            data = res.data or []
        except Exception:
            data = []

    # Merge / Fallback with local store
    if not data:
        store = DatabaseService.get_store()
        data = list(store.get("resident", []))
        if society_id:
            data = [r for r in data if r.get("society_id") == society_id]
        if tower and tower != "All":
            data = [r for r in data if r.get("tower") == tower]
        if floor is not None and str(floor) != "All":
            data = [r for r in data if r.get("floor") == floor]
        if flat and flat != "All":
            data = [r for r in data if r.get("flat") == flat]

    # Filter out demo artifacts if needed
    cleaned = []
    seen = set()
    for r in data:
        rid = r.get("resident_id")
        if rid and rid not in seen:
            seen.add(rid)
            cleaned.append({k: v for k, v in r.items() if k != "password"})
            
    return cleaned

@router.get("/{resident_id}")
async def get_resident_by_id(resident_id: str, current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    client = DatabaseService.get_client()
    if client:
        try:
            res = client.table("resident").select("*").eq("resident_id", resident_id).execute()
            if res.data and len(res.data) > 0:
                item = res.data[0]
                return {k: v for k, v in item.items() if k != "password"}
        except Exception:
            pass

    store = DatabaseService.get_store()
    for r in store.get("resident", []):
        if r.get("resident_id") == resident_id:
            return {k: v for k, v in r.items() if k != "password"}

    raise HTTPException(status_code=404, detail="Resident not found")

@router.post("", response_model=Dict[str, Any])
async def create_resident(
    payload: ResidentCreate,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    resident_id = payload.resident_id
    if not resident_id:
        random_suffix = random.randint(100, 999)
        resident_id = f"R{random.randint(1000, 9999)}"

    new_resident = {
        "id": str(uuid.uuid4()),
        "resident_id": resident_id,
        "name": payload.name,
        "tower": payload.tower,
        "floor": payload.floor,
        "flat": payload.flat,
        "email": payload.email,
        "phone": payload.phone,
        "password": payload.password,
        "society_id": payload.society_id,
        "status": payload.status or "Active",
        "created_at": str(uuid.uuid1())
    }

    client = DatabaseService.get_client()
    if client:
        try:
            client.table("resident").insert(new_resident).execute()
        except Exception as e:
            # Retry minimal
            try:
                minimal = {
                    "resident_id": resident_id,
                    "name": payload.name,
                    "tower": payload.tower,
                    "floor": payload.floor,
                    "flat": payload.flat,
                    "phone": payload.phone,
                    "password": payload.password,
                    "society_id": payload.society_id
                }
                client.table("resident").insert(minimal).execute()
            except Exception:
                pass

    store = DatabaseService.get_store()
    store["resident"].append(new_resident)

    if current_user:
        await LogService.log_activity(
            user_id=current_user.get("id", "system"),
            user_name=current_user.get("name", "Admin"),
            user_role=current_user.get("role", "admin"),
            action="CREATE",
            module="Resident",
            record_id=resident_id,
            details=f"Registered resident {payload.name} ({resident_id}) in {payload.tower} Flat {payload.flat}",
            society_id=payload.society_id
        )

    return {
        "status": "success",
        "message": f"Resident added successfully! ID: {resident_id}",
        "resident": {k: v for k, v in new_resident.items() if k != "password"}
    }

@router.put("/{resident_id}")
async def update_resident(
    resident_id: str,
    payload: ResidentUpdate,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    
    client = DatabaseService.get_client()
    if client:
        try:
            client.table("resident").update(updates).eq("resident_id", resident_id).execute()
        except Exception:
            pass

    store = DatabaseService.get_store()
    for r in store.get("resident", []):
        if r.get("resident_id") == resident_id:
            r.update(updates)
            break

    if current_user:
        await LogService.log_activity(
            user_id=current_user.get("id", "user"),
            user_name=current_user.get("name", "User"),
            user_role=current_user.get("role", "resident"),
            action="UPDATE",
            module="Resident",
            record_id=resident_id,
            details=f"Updated profile for resident {resident_id}",
            society_id=current_user.get("society_id", "GV2026")
        )

    return {"status": "success", "message": f"Resident {resident_id} updated successfully"}

@router.delete("/{resident_id}")
async def delete_resident(
    resident_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    client = DatabaseService.get_client()
    if client:
        try:
            client.table("resident").delete().eq("resident_id", resident_id).execute()
        except Exception:
            pass

    store = DatabaseService.get_store()
    store["resident"] = [r for r in store.get("resident", []) if r.get("resident_id") != resident_id]

    if current_user:
        await LogService.log_activity(
            user_id=current_user.get("id", "admin"),
            user_name=current_user.get("name", "Admin"),
            user_role=current_user.get("role", "admin"),
            action="DELETE",
            module="Resident",
            record_id=resident_id,
            details=f"Deleted resident record {resident_id}",
            society_id=current_user.get("society_id", "GV2026")
        )

    return {"status": "success", "message": f"Resident {resident_id} deleted successfully"}
