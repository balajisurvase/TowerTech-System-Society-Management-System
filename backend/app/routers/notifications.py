from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from backend.app.core.database import DatabaseService
from backend.app.core.security import get_current_user, get_optional_current_user

notifications_router = APIRouter(prefix="/notifications", tags=["Notifications"])

@notifications_router.get("", response_model=List[Dict[str, Any]])
async def get_notifications(
    user_id: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    society_id: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    target_id = user_id or (current_user.get("id") if current_user else None)
    target_role = role or (current_user.get("role") if current_user else None)

    client = DatabaseService.get_client()
    notifs = []
    if client:
        try:
            q = client.table("notification").select("*")
            if society_id:
                q = q.eq("society_id", society_id)
            res = q.order("created_at", desc=True).limit(50).execute()
            notifs = res.data or []
        except Exception:
            notifs = []

    if not notifs:
        store = DatabaseService.get_store()
        notifs = list(store.get("notification", []))

    filtered = []
    for n in notifs:
        rec_id = n.get("recipient_id")
        rec_role = n.get("recipient_role")
        if rec_id in ["ALL", target_id] or rec_role in ["ALL", target_role]:
            filtered.append(n)

    if not filtered:
        filtered = [
            {
                "notification_id": "NOTIF-INIT",
                "recipient_id": "ALL",
                "title": "Welcome to TowerTech Smart Society System",
                "message": "Your society digital management platform is active and running on FastAPI with AI intelligence.",
                "type": "info",
                "is_read": False,
                "created_at": datetime.utcnow().isoformat(),
                "society_id": "GV2026"
            }
        ]

    return filtered

@notifications_router.put("/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    client = DatabaseService.get_client()
    if client:
        try:
            client.table("notification").update({"is_read": True}).eq("notification_id", notification_id).execute()
        except Exception:
            pass

    store = DatabaseService.get_store()
    for n in store.get("notification", []):
        if n.get("notification_id") == notification_id:
            n["is_read"] = True
            break

    return {"status": "success", "message": "Notification marked as read"}

@notifications_router.put("/read-all")
async def mark_all_notifications_read():
    store = DatabaseService.get_store()
    for n in store.get("notification", []):
        n["is_read"] = True
    return {"status": "success", "message": "All notifications marked as read"}
