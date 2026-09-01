import random
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from backend.app.core.database import DatabaseService
from backend.app.core.security import get_current_user, require_admin, get_optional_current_user
from backend.app.schemas.schemas import SocietyCreate, SocietyResponse, AdminResponse
from backend.app.services.log_service import LogService

router = APIRouter(prefix="/society", tags=["Society"])

@router.get("", response_model=List[Dict[str, Any]])
async def get_society_list(current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    client = DatabaseService.get_client()
    if client:
        try:
            res = client.table("society").select("*").execute()
            if res.data and len(res.data) > 0:
                return res.data
        except Exception:
            pass

    store = DatabaseService.get_store()
    if store.get("society"):
        return store["society"]

    return [{
        "society_id": "GV2026",
        "name": "Green Valley Premium Society",
        "towers": 4,
        "floors_per_tower": 14,
        "flats_per_floor": 4,
        "admin_email": "admin@towertech.com",
        "phone": "+91 98765 43210",
        "address": "TowerTech Boulevard, Phase 1",
        "city": "Bengaluru"
    }]

@router.post("", response_model=Dict[str, Any])
async def create_society(payload: SocietyCreate):
    random_digits = random.randint(1000, 9999)
    society_id = f"SOC2026{random_digits}"
    admin_id = "A001"

    society_data = {
        "id": str(uuid.uuid4()),
        "society_id": society_id,
        "name": payload.name,
        "towers": payload.towers,
        "floors_per_tower": payload.floors_per_tower,
        "flats_per_floor": payload.flats_per_floor,
        "admin_email": payload.admin_email,
        "phone": payload.phone,
        "address": payload.address,
        "city": payload.city
    }

    admin_data = {
        "id": str(uuid.uuid4()),
        "admin_id": admin_id,
        "name": payload.admin_name or f"Admin - {payload.name}",
        "email": payload.admin_email,
        "phone": payload.phone,
        "password": payload.admin_password,
        "society_id": society_id,
        "role": "admin"
    }

    client = DatabaseService.get_client()
    if client:
        try:
            client.table("society").insert(society_data).execute()
        except Exception:
            pass
        try:
            client.table("admin").insert(admin_data).execute()
        except Exception:
            pass

    store = DatabaseService.get_store()
    store["society"].append(society_data)
    store["admin"].append(admin_data)

    # Initial amenities bootstrap
    default_amenities = [
        {"amenity_id": f"AM001_{random_digits}", "name": "Clubhouse & Banquet", "type": "Indoor", "charges": 5000, "society_id": society_id},
        {"amenity_id": f"AM002_{random_digits}", "name": "Olympic Swimming Pool", "type": "Outdoor", "charges": 2000, "society_id": society_id},
        {"amenity_id": f"AM003_{random_digits}", "name": "Fitness Gymnasium", "type": "Indoor", "charges": 1000, "society_id": society_id},
        {"amenity_id": f"AM004_{random_digits}", "name": "Badminton Court", "type": "Indoor", "charges": 800, "society_id": society_id}
    ]
    if client:
        for a in default_amenities:
            try:
                client.table("amenity").insert(a).execute()
            except Exception:
                pass
    store["amenity"].extend(default_amenities)

    await LogService.log_activity(
        user_id=admin_data["id"],
        user_name=admin_data["name"],
        user_role="admin",
        action="CREATE",
        module="Society",
        record_id=society_id,
        details=f"Society {payload.name} registered with Admin ID {admin_id}",
        society_id=society_id
    )

    admin_resp = {k: v for k, v in admin_data.items() if k != "password"}
    return {
        "status": "success",
        "message": f"Society registered successfully! Society ID: {society_id}, Admin ID: {admin_id}",
        "society": society_data,
        "admin": admin_resp
    }

@router.put("/{society_id}")
async def update_society(
    society_id: str,
    payload: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(require_admin)
):
    client = DatabaseService.get_client()
    if client:
        try:
            client.table("society").update(payload).eq("society_id", society_id).execute()
        except Exception:
            pass

    store = DatabaseService.get_store()
    for soc in store.get("society", []):
        if soc.get("society_id") == society_id:
            soc.update(payload)
            return {"status": "success", "society": soc}

    return {"status": "success", "message": "Society updated"}
