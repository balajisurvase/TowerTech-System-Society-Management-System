from datetime import datetime
from typing import Any, Dict, Optional
import uuid
import logging
from backend.app.core.database import DatabaseService

logger = logging.getLogger("towertech.log_service")

class LogService:
    @staticmethod
    async def log_activity(
        user_id: str,
        user_name: str,
        user_role: str,
        action: str,
        module: str,
        record_id: Optional[str] = None,
        details: Optional[str] = None,
        ip_address: Optional[str] = None,
        society_id: str = "GV2026"
    ) -> Dict[str, Any]:
        log_entry = {
            "id": str(uuid.uuid4()),
            "log_id": f"LOG-{int(datetime.utcnow().timestamp())}-{str(uuid.uuid4())[:4]}",
            "user_id": user_id,
            "user_name": user_name,
            "user_role": user_role,
            "action": action,
            "module": module,
            "record_id": record_id,
            "details": details,
            "ip_address": ip_address or "127.0.0.1",
            "timestamp": datetime.utcnow().isoformat(),
            "created_at": datetime.utcnow().isoformat(),
            "society_id": society_id
        }

        client = DatabaseService.get_client()
        if client:
            try:
                client.table("activity_log").insert(log_entry).execute()
            except Exception as e:
                logger.debug(f"Direct Supabase activity_log insert skipped or table missing: {e}")

        # Also store in local cache
        store = DatabaseService.get_store()
        store["activity_log"].append(log_entry)
        return log_entry
