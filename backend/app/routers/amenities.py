import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from backend.app.core.database import DatabaseService
from backend.app.core.security import get_current_user, require_admin, get_optional_current_user
from backend.app.schemas.schemas import AmenityCreate, AmenityUpdate, BookingCreate, BookingStatusUpdate
from backend.app.services.notification_service import NotificationService
from backend.app.services.log_service import LogService

amenities_router = APIRouter(prefix="/amenities", tags=["Amenities"])
bookings_router = APIRouter(prefix="/bookings", tags=["Bookings"])

# ==================== AMENITIES ====================

@amenities_router.get("", response_model=List[Dict[str, Any]])
async def get_amenities(society_id: Optional[str] = Query(None)):
    client = DatabaseService.get_client()
    amenities = []
    if client:
        try:
            q = client.table("amenity").select("*")
            if society_id:
                q = q.eq("society_id", society_id)
            res = q.execute()
            amenities = res.data or []
        except Exception:
            amenities = []

    if not amenities:
        store = DatabaseService.get_store()
        amenities = list(store.get("amenity", []))
        if society_id:
            amenities = [a for a in amenities if a.get("society_id") == society_id]

    if not amenities:
        amenities = [
            {"amenity_id": "AM001", "name": "Clubhouse Banquet Hall", "type": "Indoor", "charges": 5000, "base_hours": 4, "extra_hour_charge": 500, "facilities": "AC, Sound System, Chairs, Stage", "society_id": "GV2026"},
            {"amenity_id": "AM002", "name": "Olympic Swimming Pool", "type": "Outdoor", "charges": 2000, "base_hours": 2, "extra_hour_charge": 300, "facilities": "Changing Rooms, Life Guard, Shower", "society_id": "GV2026"},
            {"amenity_id": "AM003", "name": "Fitness Gymnasium", "type": "Indoor", "charges": 1000, "base_hours": 2, "extra_hour_charge": 0, "facilities": "Treadmills, Dumbbells, Trainer", "society_id": "GV2026"},
            {"amenity_id": "AM004", "name": "Badminton Court", "type": "Indoor", "charges": 800, "base_hours": 1, "extra_hour_charge": 200, "facilities": "Wooden Flooring, Lighting", "society_id": "GV2026"},
            {"amenity_id": "AM005", "name": "Tennis Court", "type": "Outdoor", "charges": 1200, "base_hours": 1, "extra_hour_charge": 300, "facilities": "Synthetic Turf, Floodlights", "society_id": "GV2026"},
            {"amenity_id": "AM006", "name": "Community Garden & Lawn", "type": "Outdoor", "charges": 3500, "base_hours": 4, "extra_hour_charge": 400, "facilities": "Gazebo, Lawn Lights", "society_id": "GV2026"}
        ]

    return amenities

@amenities_router.post("", response_model=Dict[str, Any])
async def create_amenity(payload: AmenityCreate, current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    amenity_id = payload.amenity_id or f"AM{uuid.uuid4().hex[:4].upper()}"
    data = payload.model_dump()
    data["amenity_id"] = amenity_id
    data["id"] = str(uuid.uuid4())
    data["charges"] = float(payload.charges or payload.price or 0.0)

    client = DatabaseService.get_client()
    if client:
        try:
            client.table("amenity").insert(data).execute()
        except Exception:
            pass

    DatabaseService.get_store()["amenity"].append(data)
    return {"status": "success", "message": "Amenity added successfully", "amenity": data}

@amenities_router.put("/{amenity_id}")
async def update_amenity(amenity_id: str, payload: AmenityUpdate, current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    client = DatabaseService.get_client()
    if client:
        try:
            client.table("amenity").update(updates).eq("amenity_id", amenity_id).execute()
        except Exception:
            pass

    store = DatabaseService.get_store()
    for a in store.get("amenity", []):
        if a.get("amenity_id") == amenity_id:
            a.update(updates)
            break

    return {"status": "success", "message": f"Amenity {amenity_id} updated"}

@amenities_router.delete("/{amenity_id}")
async def delete_amenity(amenity_id: str, current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    client = DatabaseService.get_client()
    if client:
        try:
            client.table("amenity").delete().eq("amenity_id", amenity_id).execute()
        except Exception:
            pass

    store = DatabaseService.get_store()
    store["amenity"] = [a for a in store.get("amenity", []) if a.get("amenity_id") != amenity_id]
    return {"status": "success", "message": f"Amenity {amenity_id} deleted"}

# ==================== BOOKINGS ====================

@bookings_router.get("", response_model=List[Dict[str, Any]])
async def get_bookings(
    resident_id: Optional[str] = Query(None),
    society_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    client = DatabaseService.get_client()
    bookings = []
    if client:
        try:
            q = client.table("booking").select("*")
            if resident_id:
                q = q.eq("resident_id", resident_id)
            if society_id:
                q = q.eq("society_id", society_id)
            if status and status != "All":
                q = q.eq("status", status)
            res = q.order("booking_date", desc=True).execute()
            bookings = res.data or []
        except Exception:
            bookings = []

    if not bookings:
        store = DatabaseService.get_store()
        bookings = list(store.get("booking", []))
        if resident_id:
            bookings = [b for b in bookings if b.get("resident_id") == resident_id]
        if society_id:
            bookings = [b for b in bookings if b.get("society_id") == society_id]
        if status and status != "All":
            bookings = [b for b in bookings if b.get("status") == status]

    return bookings

@bookings_router.post("", response_model=Dict[str, Any])
async def create_booking(payload: BookingCreate, current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    client = DatabaseService.get_client()
    store = DatabaseService.get_store()

    # 1. Double Booking Prevention Check!
    # Check if there is an existing Approved or Pending booking for the same amenity on the same date with overlapping times
    existing_bookings = []
    if client:
        try:
            chk = client.table("booking").select("*").eq("amenity_name", payload.amenity_name).eq("booking_date", payload.booking_date).in_("status", ["Approved", "Pending"]).execute()
            existing_bookings = chk.data or []
        except Exception:
            pass

    if not existing_bookings:
        existing_bookings = [
            b for b in store.get("booking", [])
            if b.get("amenity_name") == payload.amenity_name
            and b.get("booking_date") == payload.booking_date
            and b.get("status") in ["Approved", "Pending"]
        ]

    for eb in existing_bookings:
        # Check time overlap: (StartA < EndB) and (EndA > StartB)
        start_a = payload.start_time
        end_a = payload.end_time
        start_b = eb.get("start_time", "")
        end_b = eb.get("end_time", "")

        if (start_a < end_b) and (end_a > start_b):
            raise HTTPException(
                status_code=400,
                detail=f"Time slot conflict! {payload.amenity_name} is already booked on {payload.booking_date} from {start_b} to {end_b} (Booking #{eb.get('booking_id')})."
            )

    booking_id = f"BK{uuid.uuid4().hex[:6].upper()}"
    booking_data = payload.model_dump()
    booking_data["booking_id"] = booking_id
    booking_data["id"] = str(uuid.uuid4())
    booking_data["status"] = payload.status or "Pending"

    if client:
        try:
            client.table("booking").insert(booking_data).execute()
        except Exception:
            try:
                minimal = {
                    "booking_id": booking_id,
                    "resident_id": payload.resident_id,
                    "name": payload.name,
                    "tower": payload.tower,
                    "flat": payload.flat,
                    "amenity_name": payload.amenity_name,
                    "event_name": payload.event_name,
                    "booking_date": payload.booking_date,
                    "start_time": payload.start_time,
                    "end_time": payload.end_time,
                    "charges": float(payload.charges),
                    "status": "Pending",
                    "society_id": payload.society_id
                }
                client.table("booking").insert(minimal).execute()
            except Exception:
                pass

    store["booking"].append(booking_data)

    # Notify Admin
    await NotificationService.create_notification(
        recipient_id="ADMIN",
        recipient_role="admin",
        title=f"New Amenity Booking: {payload.amenity_name}",
        message=f"{payload.name} (Flat {payload.tower}-{payload.flat}) requested {payload.amenity_name} on {payload.booking_date} ({payload.start_time} - {payload.end_time})",
        notif_type="booking",
        society_id=payload.society_id
    )

    return {
        "status": "success",
        "message": f"Booking request #{booking_id} submitted for approval!",
        "booking": booking_data
    }

@bookings_router.put("/{booking_id}/status")
async def update_booking_status(booking_id: str, payload: BookingStatusUpdate, current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    updates = {"status": payload.status}
    if payload.admin_comment:
        updates["admin_comment"] = payload.admin_comment

    client = DatabaseService.get_client()
    if client:
        try:
            client.table("booking").update(updates).eq("booking_id", booking_id).execute()
        except Exception:
            pass

    store = DatabaseService.get_store()
    target = None
    for b in store.get("booking", []):
        if b.get("booking_id") == booking_id or b.get("id") == booking_id:
            b.update(updates)
            target = b
            break

    if target and target.get("resident_id"):
        await NotificationService.create_notification(
            recipient_id=target["resident_id"],
            recipient_role="resident",
            title=f"Booking {payload.status}: {target.get('amenity_name')}",
            message=f"Your booking #{booking_id} for {target.get('amenity_name')} has been {payload.status.lower()}.",
            notif_type="booking",
            society_id=target.get("society_id", "GV2026")
        )

    return {"status": "success", "message": f"Booking #{booking_id} updated to {payload.status}"}

@bookings_router.delete("/{booking_id}")
async def delete_booking(booking_id: str, current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    client = DatabaseService.get_client()
    if client:
        try:
            client.table("booking").delete().eq("booking_id", booking_id).execute()
        except Exception:
            pass

    store = DatabaseService.get_store()
    store["booking"] = [b for b in store.get("booking", []) if b.get("booking_id") != booking_id and b.get("id") != booking_id]
    return {"status": "success", "message": f"Booking #{booking_id} deleted"}
