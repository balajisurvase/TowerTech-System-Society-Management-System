from datetime import datetime
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from backend.app.core.database import DatabaseService
from backend.app.core.security import get_current_user, get_optional_current_user
from backend.app.schemas.schemas import ChatMessageCreate

router = APIRouter(prefix="/chat", tags=["Community Chat"])

@router.get("/messages", response_model=List[Dict[str, Any]])
async def get_chat_messages(
    group_id: str = Query("general"),
    society_id: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    client = DatabaseService.get_client()
    messages = []
    if client:
        try:
            q = client.table("chat_message").select("*").eq("group_id", group_id)
            if society_id:
                q = q.eq("society_id", society_id)
            res = q.order("created_at", desc=False).limit(100).execute()
            messages = res.data or []
        except Exception:
            messages = []

    if not messages:
        store = DatabaseService.get_store()
        messages = [m for m in store.get("chat_message", []) if m.get("group_id") == group_id]

    if not messages and group_id == "general":
        messages = [
            {
                "message_id": "MSG-01",
                "group_id": "general",
                "sender_id": "A001",
                "sender_name": "Society Management Admin",
                "sender_role": "admin",
                "sender_tower_flat": "Society Office",
                "content": "Welcome everyone to the TowerTech Community Forum! Please use this group for general discussions, community updates, and neighborhood coordination.",
                "created_at": "2026-03-01T09:00:00Z",
                "society_id": "GV2026"
            },
            {
                "message_id": "MSG-02",
                "group_id": "general",
                "sender_id": "R001",
                "sender_name": "Rahul Sharma",
                "sender_role": "resident",
                "sender_tower_flat": "Tower A - Flat 401",
                "content": "Thank you! Quick question: What are the weekend swimming pool timings for families?",
                "created_at": "2026-03-01T10:15:00Z",
                "society_id": "GV2026"
            },
            {
                "message_id": "MSG-03",
                "group_id": "general",
                "sender_id": "A001",
                "sender_name": "Society Management Admin",
                "sender_role": "admin",
                "sender_tower_flat": "Society Office",
                "content": "Hi Rahul! Weekend pool hours are 06:00 AM - 11:00 AM and 04:00 PM - 09:00 PM. Life guard is on duty during both slots.",
                "created_at": "2026-03-01T10:20:00Z",
                "society_id": "GV2026"
            }
        ]

    return messages

@router.post("/messages", response_model=Dict[str, Any])
async def send_chat_message(
    payload: ChatMessageCreate,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    sender_name = "Resident"
    sender_role = "resident"
    sender_id = "user"
    tower_flat = "Tower A - Flat 401"

    if current_user:
        sender_name = current_user.get("name", "User")
        sender_role = current_user.get("role", "resident")
        sender_id = current_user.get("id", "user")
        tower = current_user.get("tower")
        flat = current_user.get("flat")
        if tower and flat:
            tower_flat = f"{tower} - Flat {flat}"
        elif sender_role == "admin":
            tower_flat = "Society Office"
        elif sender_role == "security":
            tower_flat = "Main Security Gate"

    msg_id = f"MSG-{uuid.uuid4().hex[:8].upper()}"
    new_message = {
        "id": str(uuid.uuid4()),
        "message_id": msg_id,
        "group_id": payload.group_id,
        "sender_id": sender_id,
        "sender_name": sender_name,
        "sender_role": sender_role,
        "sender_tower_flat": tower_flat,
        "content": payload.content,
        "media_url": payload.media_url,
        "created_at": datetime.utcnow().isoformat(),
        "society_id": payload.society_id
    }

    client = DatabaseService.get_client()
    if client:
        try:
            client.table("chat_message").insert(new_message).execute()
        except Exception:
            pass

    store = DatabaseService.get_store()
    store["chat_message"].append(new_message)

    return {"status": "success", "message": new_message}
