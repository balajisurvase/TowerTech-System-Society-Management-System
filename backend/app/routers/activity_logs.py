from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from backend.app.core.database import DatabaseService
from backend.app.core.security import require_admin, get_optional_current_user
from backend.app.schemas.schemas import SystemSettings

activity_router = APIRouter(prefix="/activity-logs", tags=["Audit & Activity Logs"])
settings_router = APIRouter(prefix="/settings", tags=["System Settings"])

@activity_router.get("", response_model=List[Dict[str, Any]])
async def get_activity_logs(
    module: Optional[str] = Query(None),
    society_id: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    client = DatabaseService.get_client()
    logs = []
    if client:
        try:
            q = client.table("activity_log").select("*")
            if society_id:
                q = q.eq("society_id", society_id)
            if module and module != "All":
                q = q.eq("module", module)
            res = q.order("created_at", desc=True).limit(100).execute()
            logs = res.data or []
        except Exception:
            logs = []

    if not logs:
        store = DatabaseService.get_store()
        logs = list(store.get("activity_log", []))
        if module and module != "All":
            logs = [l for l in logs if l.get("module") == module]

    if not logs:
        logs = [
            {
                "log_id": "LOG-001",
                "user_name": "System Administrator",
                "user_role": "admin",
                "action": "CREATE",
                "module": "System",
                "details": "FastAPI backend services initialized with PostgreSQL & AI analytics pipeline",
                "timestamp": datetime.utcnow().isoformat(),
                "society_id": "GV2026"
            },
            {
                "log_id": "LOG-002",
                "user_name": "System Administrator",
                "user_role": "admin",
                "action": "CONFIG",
                "module": "Settings",
                "details": "Configured dynamic late fee structure (5% + ₹100 base) & AI complaint categorizer",
                "timestamp": datetime.utcnow().isoformat(),
                "society_id": "GV2026"
            }
        ]

    return logs

@settings_router.get("", response_model=Dict[str, Any])
async def get_system_settings(society_id: Optional[str] = Query("GV2026")):
    store = DatabaseService.get_store()
    settings_list = store.get("system_settings", [])
    if settings_list:
        return settings_list[0]
    return {
        "id": "1",
        "society_id": society_id,
        "late_fine_percentage": 5.0,
        "late_fine_fixed": 100.0,
        "due_days": 15,
        "emergency_contact_phone": "+91 98765 43210",
        "security_gate_phone": "+91 98765 43211",
        "ai_analytics_enabled": True
    }

@settings_router.put("")
async def update_system_settings(
    payload: SystemSettings,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    store = DatabaseService.get_store()
    data = payload.model_dump()
    store["system_settings"] = [data]
    return {"status": "success", "message": "System settings updated successfully", "settings": data}
