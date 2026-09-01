import os
import json
import logging
from typing import Any, Dict, List, Optional
from supabase import create_client, Client
from backend.app.core.config import settings

logger = logging.getLogger("towertech.database")

# In-memory storage cache for prototype fallback / transient testing if tables are not yet migrated in Supabase
_local_store: Dict[str, List[Dict[str, Any]]] = {
    "society": [],
    "admin": [],
    "resident": [],
    "tenant": [],
    "family_member": [],
    "vehicle": [],
    "security": [],
    "staff": [],
    "complaint": [],
    "complaint_media": [],
    "complaint_comment": [],
    "maintenance": [],
    "maintenance_payment": [],
    "amenity": [],
    "booking": [],
    "visitor": [],
    "parcel": [],
    "chat_group": [],
    "chat_message": [],
    "notice": [],
    "notification": [],
    "emergency_alert": [],
    "financial_category": [],
    "financial_transaction": [],
    "budget_planning": [],
    "activity_log": [],
    "system_settings": [
        {
            "id": "1",
            "society_id": "GV2026",
            "late_fine_percentage": 5.0,
            "late_fine_fixed": 100.0,
            "due_days": 15,
            "emergency_contact_phone": "+91 98765 43210",
            "security_gate_phone": "+91 98765 43211",
            "ai_analytics_enabled": True
        }
    ]
}

class DatabaseService:
    _instance = None
    client: Optional[Client] = None

    def __init__(self):
        try:
            if settings.SUPABASE_URL and settings.SUPABASE_ANON_KEY:
                # Use service role key if available, otherwise anon key
                key = settings.SUPABASE_SERVICE_ROLE_KEY if settings.SUPABASE_SERVICE_ROLE_KEY else settings.SUPABASE_ANON_KEY
                self.client = create_client(settings.SUPABASE_URL, key)
                logger.info("Supabase client initialized successfully")
            else:
                logger.warning("Supabase credentials missing, fallback mode enabled")
        except Exception as e:
            logger.error(f"Error initializing Supabase client: {e}")
            self.client = None

    @classmethod
    def get_client(cls) -> Optional[Client]:
        if cls._instance is None:
            cls._instance = DatabaseService()
        return cls._instance.client

    @classmethod
    def get_store(cls) -> Dict[str, List[Dict[str, Any]]]:
        return _local_store

db_service = DatabaseService()
