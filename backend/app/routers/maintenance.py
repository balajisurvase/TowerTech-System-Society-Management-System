from datetime import datetime, date
from typing import Any, Dict, List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from backend.app.core.database import DatabaseService
from backend.app.core.security import get_current_user, require_admin, get_optional_current_user
from backend.app.schemas.schemas import (
    MaintenanceBillCreate,
    MaintenanceBulkCreate,
    MaintenancePaymentRequest,
    MaintenanceStatusUpdate,
    MaintenanceResponse
)
from backend.app.services.late_fee_service import LateFeeService
from backend.app.services.notification_service import NotificationService
from backend.app.services.log_service import LogService

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])

@router.get("", response_model=List[Dict[str, Any]])
async def get_maintenance_records(
    resident_id: Optional[str] = Query(None),
    society_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    month: Optional[str] = Query(None),
    tower: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    client = DatabaseService.get_client()
    records = []

    if client:
        try:
            q = client.table("maintenance").select("*")
            if resident_id:
                q = q.eq("resident_id", resident_id)
            if society_id:
                q = q.eq("society_id", society_id)
            if status and status != "All":
                q = q.eq("status", status)
            if month and month != "All":
                q = q.eq("month", month)
            if tower and tower != "All":
                q = q.eq("tower", tower)

            res = q.order("due_date", desc=True).execute()
            records = res.data or []
        except Exception:
            records = []

    if not records:
        store = DatabaseService.get_store()
        records = list(store.get("maintenance", []))
        if resident_id:
            records = [r for r in records if r.get("resident_id") == resident_id]
        if society_id:
            records = [r for r in records if r.get("society_id") == society_id]
        if status and status != "All":
            records = [r for r in records if r.get("status") == status]
        if month and month != "All":
            records = [r for r in records if r.get("month") == month]
        if tower and tower != "All":
            records = [r for r in records if r.get("tower") == tower]

    # Calculate dynamic late fines for each record
    processed = []
    for r in records:
        base_amt = float(r.get("amount", 0.0))
        rec_status = r.get("status", "Unpaid")
        due_date = r.get("due_date", date.today().isoformat())
        soc_id = r.get("society_id", "GV2026")

        fine_calc = LateFeeService.calculate_late_fine(due_date, base_amt, rec_status, soc_id)
        processed.append({
            **r,
            "late_fine": fine_calc["late_fine"],
            "total_amount": fine_calc["total_amount"],
            "is_overdue": fine_calc["is_overdue"],
            "days_overdue": fine_calc["days_overdue"]
        })

    return processed

@router.post("", response_model=Dict[str, Any])
async def create_maintenance_bill(
    payload: MaintenanceBillCreate,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    client = DatabaseService.get_client()

    # 1. Check duplicate bill for same flat and month
    if client:
        try:
            dup_res = client.table("maintenance").select("maintenance_id").eq("society_id", payload.society_id).eq("tower", payload.tower).eq("flat_no", payload.flat_no).eq("month", payload.month).execute()
            if dup_res.data and len(dup_res.data) > 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Maintenance bill already generated for Flat {payload.tower}-{payload.flat_no} for {payload.month}"
                )
        except HTTPException:
            raise
        except Exception:
            pass

    store = DatabaseService.get_store()
    for existing in store.get("maintenance", []):
        if (existing.get("society_id") == payload.society_id and 
            existing.get("tower") == payload.tower and 
            existing.get("flat_no") == payload.flat_no and 
            existing.get("month") == payload.month):
            raise HTTPException(
                status_code=400,
                detail=f"Maintenance bill already generated for Flat {payload.tower}-{payload.flat_no} for {payload.month}"
            )

    # 2. Sequential maintenance ID
    timestamp = int(datetime.utcnow().timestamp())
    maintenance_id = f"M{timestamp % 100000:04d}"
    bill_no = f"BILL-{random_digits := str(uuid.uuid4())[:6].upper()}"
    raw_id = str(uuid.uuid4())

    new_bill = {
        "id": raw_id,
        "maintenance_id": maintenance_id,
        "bill_no": bill_no,
        "resident_id": payload.resident_id,
        "resident_name": payload.resident_name or "Resident",
        "flat_no": payload.flat_no,
        "tower": payload.tower,
        "month": payload.month,
        "amount": payload.amount,
        "status": payload.status or "Unpaid",
        "due_date": payload.due_date,
        "society_id": payload.society_id,
        "admin_id": payload.admin_id,
        "created_at": datetime.utcnow().isoformat()
    }

    if client:
        try:
            client.table("maintenance").insert(new_bill).execute()
        except Exception:
            # Minimal insert fallback
            try:
                minimal = {
                    "maintenance_id": maintenance_id,
                    "resident_id": payload.resident_id,
                    "flat_no": payload.flat_no,
                    "tower": payload.tower,
                    "month": payload.month,
                    "amount": int(payload.amount),
                    "status": "Unpaid",
                    "due_date": payload.due_date,
                    "society_id": payload.society_id
                }
                client.table("maintenance").insert(minimal).execute()
            except Exception:
                pass

    store["maintenance"].append(new_bill)

    # Notification to resident
    await NotificationService.create_notification(
        recipient_id=payload.resident_id,
        recipient_role="resident",
        title=f"Maintenance Bill Generated: {payload.month}",
        message=f"Your maintenance bill of ₹{payload.amount:,.0f} for {payload.month} is due on {payload.due_date}.",
        notif_type="payment",
        society_id=payload.society_id
    )

    return {
        "status": "success",
        "message": f"Bill generated successfully! Bill No: {bill_no}",
        "bill": new_bill
    }

@router.post("/bulk", response_model=Dict[str, Any])
async def create_bulk_maintenance_bills(
    payload: MaintenanceBulkCreate,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    client = DatabaseService.get_client()
    store = DatabaseService.get_store()
    
    # Fetch all active residents
    residents = []
    if client:
        try:
            r_res = client.table("resident").select("*").eq("society_id", payload.society_id).execute()
            residents = r_res.data or []
        except Exception:
            residents = []
    
    if not residents:
        residents = [r for r in store.get("resident", []) if r.get("society_id") == payload.society_id]

    if not residents:
        raise HTTPException(status_code=400, detail="No residents found to generate maintenance bills for.")

    created_count = 0
    bills_created = []

    for r in residents:
        rid = r.get("resident_id")
        flat = r.get("flat")
        tower = r.get("tower")
        
        # Check duplicate
        is_dup = any(
            b.get("resident_id") == rid and b.get("month") == payload.month 
            for b in store.get("maintenance", [])
        )
        if is_dup:
            continue

        m_id = f"M{int(datetime.utcnow().timestamp()) % 100000:04d}{created_count:02d}"
        bill = {
            "id": str(uuid.uuid4()),
            "maintenance_id": m_id,
            "bill_no": f"BILL-{uuid.uuid4().hex[:6].upper()}",
            "resident_id": rid,
            "resident_name": r.get("name", "Resident"),
            "flat_no": flat,
            "tower": tower,
            "month": payload.month,
            "amount": payload.amount,
            "status": "Unpaid",
            "due_date": payload.due_date,
            "society_id": payload.society_id,
            "admin_id": payload.admin_id,
            "created_at": datetime.utcnow().isoformat()
        }

        if client:
            try:
                client.table("maintenance").insert(bill).execute()
            except Exception:
                pass

        store["maintenance"].append(bill)
        bills_created.append(bill)
        created_count += 1

    return {
        "status": "success",
        "message": f"Successfully generated {created_count} maintenance bills for {payload.month}",
        "count": created_count,
        "bills": bills_created
    }

@router.put("/{maintenance_id}/status")
async def update_maintenance_status(
    maintenance_id: str,
    payload: MaintenanceStatusUpdate,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    updates: Dict[str, Any] = {"status": payload.status}
    if payload.status.lower() == "paid":
        updates["payment_date"] = payload.payment_date or datetime.utcnow().isoformat()
    else:
        updates["payment_date"] = None

    client = DatabaseService.get_client()
    if client:
        try:
            client.table("maintenance").update(updates).eq("maintenance_id", maintenance_id).execute()
        except Exception:
            pass

    store = DatabaseService.get_store()
    for m in store.get("maintenance", []):
        if m.get("maintenance_id") == maintenance_id or m.get("id") == maintenance_id:
            m.update(updates)
            break

    return {"status": "success", "message": f"Maintenance {maintenance_id} marked as {payload.status}"}

@router.put("/{maintenance_id}/pay")
async def pay_maintenance_bill(
    maintenance_id: str,
    payload: MaintenancePaymentRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    payment_time = datetime.utcnow().isoformat()
    txn_id = payload.transaction_id or f"UPI-TXN-{uuid.uuid4().hex[:8].upper()}"

    updates = {
        "status": "Paid",
        "payment_date": payment_time,
        "payment_method": payload.payment_method,
        "transaction_id": txn_id
    }

    client = DatabaseService.get_client()
    if client:
        try:
            client.table("maintenance").update(updates).eq("maintenance_id", maintenance_id).execute()
        except Exception:
            pass

    store = DatabaseService.get_store()
    target = None
    for m in store.get("maintenance", []):
        if m.get("maintenance_id") == maintenance_id or m.get("id") == maintenance_id:
            m.update(updates)
            target = m
            break

    # Record in financial transactions as Income
    if target:
        income_txn = {
            "id": str(uuid.uuid4()),
            "transaction_id": f"TXN-INC-{uuid.uuid4().hex[:6].upper()}",
            "title": f"Maintenance Payment: Flat {target.get('tower')}-{target.get('flat_no')} ({target.get('month')})",
            "category_id": "CAT-MAINT",
            "category_name": "Maintenance Fees",
            "type": "Income",
            "amount": target.get("amount", 0.0),
            "date": date.today().isoformat(),
            "payment_mode": payload.payment_method,
            "reference_no": txn_id,
            "vendor_or_payer": target.get("resident_name", "Resident"),
            "society_id": target.get("society_id", "GV2026")
        }
        if client:
            try:
                client.table("financial_transaction").insert(income_txn).execute()
            except Exception:
                pass
        store["financial_transaction"].append(income_txn)

    return {
        "status": "success",
        "message": f"Payment of ₹{target.get('amount', 0):,.0f} processed successfully!",
        "transaction_id": txn_id,
        "payment_date": payment_time
    }

@router.delete("/{maintenance_id}")
async def delete_maintenance_record(
    maintenance_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    client = DatabaseService.get_client()
    if client:
        try:
            client.table("maintenance").delete().eq("maintenance_id", maintenance_id).execute()
        except Exception:
            pass

    store = DatabaseService.get_store()
    store["maintenance"] = [m for m in store.get("maintenance", []) if m.get("maintenance_id") != maintenance_id and m.get("id") != maintenance_id]

    return {"status": "success", "message": f"Maintenance record {maintenance_id} deleted"}
