from datetime import datetime, date
from typing import Any, Dict
from backend.app.core.database import DatabaseService

class LateFeeService:
    @staticmethod
    def calculate_late_fine(due_date_str: str, base_amount: float, status: str, society_id: str = "GV2026") -> Dict[str, Any]:
        """
        Dynamically computes late fines based on system settings and due date.
        Never requires manual entry.
        """
        if status.lower() == "paid":
            return {"late_fine": 0.0, "total_amount": base_amount, "is_overdue": False, "days_overdue": 0}

        try:
            due_date = datetime.strptime(due_date_str.split("T")[0], "%Y-%m-%d").date()
            today = date.today()
            
            if today <= due_date:
                return {"late_fine": 0.0, "total_amount": base_amount, "is_overdue": False, "days_overdue": 0}
            
            days_overdue = (today - due_date).days
            
            # Fetch settings
            store = DatabaseService.get_store()
            settings_list = store.get("system_settings", [])
            settings = settings_list[0] if settings_list else {
                "late_fine_percentage": 5.0,
                "late_fine_fixed": 100.0
            }
            
            pct = float(settings.get("late_fine_percentage", 5.0))
            fixed = float(settings.get("late_fine_fixed", 100.0))
            
            # Dynamic calculation: Fixed fee + 0.1% per day overdue or flat monthly percentage
            percentage_fine = (base_amount * (pct / 100.0))
            fine = round(fixed + percentage_fine, 2)
            
            return {
                "late_fine": fine,
                "total_amount": round(base_amount + fine, 2),
                "is_overdue": True,
                "days_overdue": days_overdue
            }
        except Exception:
            return {"late_fine": 0.0, "total_amount": base_amount, "is_overdue": False, "days_overdue": 0}
