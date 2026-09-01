from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
import logging
from backend.app.core.database import DatabaseService

logger = logging.getLogger("towertech.notification_service")

class NotificationService:
    @staticmethod
    async def create_notification(
        recipient_id: str,
        title: str,
        message: str,
        notif_type: str = "info",
        link_url: Optional[str] = None,
        recipient_role: Optional[str] = None,
        society_id: str = "GV2026"
    ) -> Dict[str, Any]:
        notif_entry = {
            "id": str(uuid.uuid4()),
            "notification_id": f"NOTIF-{int(datetime.utcnow().timestamp())}-{str(uuid.uuid4())[:4]}",
            "recipient_id": recipient_id,
            "recipient_role": recipient_role,
            "title": title,
            "message": message,
            "type": notif_type,
            "link_url": link_url,
            "is_read": False,
            "created_at": datetime.utcnow().isoformat(),
            "society_id": society_id
        }

        client = DatabaseService.get_client()
        if client:
            try:
                client.table("notification").insert(notif_entry).execute()
            except Exception as e:
                logger.debug(f"Direct Supabase notification insert skipped: {e}")

        store = DatabaseService.get_store()
        store["notification"].append(notif_entry)
        return notif_entry

    @staticmethod
    async def broadcast_notification(
        society_id: str,
        title: str,
        message: str,
        notif_type: str = "alert",
        recipient_role: Optional[str] = None
    ):
        """Broadcasts notice/emergency alert to all users or role in society"""
        return await NotificationService.create_notification(
            recipient_id="ALL",
            title=title,
            message=message,
            notif_type=notif_type,
            recipient_role=recipient_role or "ALL",
            society_id=society_id
        )
