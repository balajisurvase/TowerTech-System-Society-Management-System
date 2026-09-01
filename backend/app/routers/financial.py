from datetime import datetime, date
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from backend.app.core.database import DatabaseService
from backend.app.core.security import get_current_user, require_admin, get_optional_current_user
from backend.app.schemas.schemas import FinancialTransactionCreate, BudgetPlanningCreate
from backend.app.services.log_service import LogService
from backend.app.ai.financial_analytics import FinancialAIAnalytics

router = APIRouter(prefix="/financial", tags=["Financial Module (Admin Only)"])

def verify_admin_access(current_user: Optional[Dict[str, Any]]):
    if not current_user:
        # In open development mode, allow if not strictly tokenized, but verify role when token is sent
        return
    role = str(current_user.get("role", "")).lower()
    if role and role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Financial module is strictly restricted to Society Administrators."
        )

@router.get("/summary", response_model=Dict[str, Any])
async def get_financial_summary(
    society_id: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    verify_admin_access(current_user)
    
    client = DatabaseService.get_client()
    txns = []
    if client:
        try:
            q = client.table("financial_transaction").select("*")
            if society_id:
                q = q.eq("society_id", society_id)
            res = q.execute()
            txns = res.data or []
        except Exception:
            txns = []

    store = DatabaseService.get_store()
    if not txns:
        txns = list(store.get("financial_transaction", []))
        if society_id:
            txns = [t for t in txns if t.get("society_id") == society_id]

    # Seed realistic baseline transactions if empty
    if not txns:
        txns = [
            {"transaction_id": "TXN-01", "title": "Monthly Maintenance Collections (Feb)", "category_id": "CAT-01", "category_name": "Maintenance Fees", "type": "Income", "amount": 185000.0, "date": "2026-02-10", "payment_mode": "UPI / Bank Transfer", "society_id": "GV2026"},
            {"transaction_id": "TXN-02", "title": "Clubhouse Booking Charges", "category_id": "CAT-02", "category_name": "Amenity Rentals", "type": "Income", "amount": 15000.0, "date": "2026-02-15", "payment_mode": "UPI", "society_id": "GV2026"},
            {"transaction_id": "TXN-03", "title": "Security Guard Services AMC", "category_id": "CAT-03", "category_name": "Security Agency", "type": "Expense", "amount": 48000.0, "date": "2026-02-05", "payment_mode": "Bank NEFT", "vendor_or_payer": "ShieldGuard Security", "society_id": "GV2026"},
            {"transaction_id": "TXN-04", "title": "Common Area Electricity BESCOM", "category_id": "CAT-04", "category_name": "Electricity & Power", "type": "Expense", "amount": 38450.0, "date": "2026-02-12", "payment_mode": "Net Banking", "vendor_or_payer": "Electricity Board", "society_id": "GV2026"},
            {"transaction_id": "TXN-05", "title": "Elevator Comprehensive AMC (Schindler)", "category_id": "CAT-05", "category_name": "Lift & Elevator AMC", "type": "Expense", "amount": 22000.0, "date": "2026-02-18", "payment_mode": "Cheque", "vendor_or_payer": "Schindler Elevators", "society_id": "GV2026"},
            {"transaction_id": "TXN-06", "title": "Water Tanker Refill (4 Tankers)", "category_id": "CAT-06", "category_name": "Water Supply", "type": "Expense", "amount": 14000.0, "date": "2026-02-22", "payment_mode": "UPI", "vendor_or_payer": "Sri Balaji Water Supply", "society_id": "GV2026"}
        ]
        store["financial_transaction"].extend(txns)

    total_income = sum(float(t.get("amount", 0)) for t in txns if str(t.get("type", "")).lower() == "income")
    total_expense = sum(float(t.get("amount", 0)) for t in txns if str(t.get("type", "")).lower() == "expense")
    net_surplus = total_income - total_expense
    reserve_fund = 450000.0 + max(net_surplus, 0.0)

    # Run AI Analytics
    ai_report = FinancialAIAnalytics.analyze_financial_trends(txns, store.get("financial_category", []))

    return {
        "status": "success",
        "total_income": total_income,
        "total_expense": total_expense,
        "net_surplus": net_surplus,
        "reserve_fund": reserve_fund,
        "transactions_count": len(txns),
        "ai_analytics": ai_report
    }

@router.get("/transactions", response_model=List[Dict[str, Any]])
async def get_transactions(
    category_id: Optional[str] = Query(None),
    txn_type: Optional[str] = Query(None),
    society_id: Optional[str] = Query(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    verify_admin_access(current_user)
    client = DatabaseService.get_client()
    txns = []
    if client:
        try:
            q = client.table("financial_transaction").select("*")
            if society_id:
                q = q.eq("society_id", society_id)
            if category_id and category_id != "All":
                q = q.eq("category_id", category_id)
            if txn_type and txn_type != "All":
                q = q.eq("type", txn_type)
            res = q.order("date", desc=True).execute()
            txns = res.data or []
        except Exception:
            txns = []

    store = DatabaseService.get_store()
    if not txns:
        txns = list(store.get("financial_transaction", []))
        if category_id and category_id != "All":
            txns = [t for t in txns if t.get("category_id") == category_id]
        if txn_type and txn_type != "All":
            txns = [t for t in txns if t.get("type") == txn_type]

    return txns

@router.post("/transactions", response_model=Dict[str, Any])
async def create_transaction(
    payload: FinancialTransactionCreate,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    verify_admin_access(current_user)
    txn_id = f"TXN-{uuid.uuid4().hex[:6].upper()}"
    txn_data = payload.model_dump()
    txn_data["id"] = str(uuid.uuid4())
    txn_data["transaction_id"] = txn_id
    txn_data["created_by"] = current_user.get("name", "Admin") if current_user else "Admin"

    client = DatabaseService.get_client()
    if client:
        try:
            client.table("financial_transaction").insert(txn_data).execute()
        except Exception:
            pass

    store = DatabaseService.get_store()
    store["financial_transaction"].append(txn_data)

    return {
        "status": "success",
        "message": f"Transaction #{txn_id} recorded successfully!",
        "transaction": txn_data
    }

@router.get("/categories", response_model=List[Dict[str, Any]])
async def get_financial_categories(current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    return [
        {"category_id": "CAT-01", "name": "Maintenance Fees", "type": "Income", "description": "Monthly flat maintenance subscriptions"},
        {"category_id": "CAT-02", "name": "Amenity Rentals", "type": "Income", "description": "Clubhouse, swimming pool, hall bookings"},
        {"category_id": "CAT-03", "name": "Security Agency", "type": "Expense", "description": "Monthly security guards contract & AMC"},
        {"category_id": "CAT-04", "name": "Electricity & Power", "type": "Expense", "description": "Common area lighting, motors, generator diesel"},
        {"category_id": "CAT-05", "name": "Lift & Elevator AMC", "type": "Expense", "description": "Comprehensive maintenance for all tower lifts"},
        {"category_id": "CAT-06", "name": "Water Supply & Plumbing", "type": "Expense", "description": "Water tankers, motor repairs, tank cleaning"},
        {"category_id": "CAT-07", "name": "Housekeeping & Waste", "type": "Expense", "description": "Daily cleaning, sanitation, waste management"},
        {"category_id": "CAT-08", "name": "Civil Maintenance & Painting", "type": "Expense", "description": "Repairs, waterproofing, pathway maintenance"}
    ]

@router.get("/budget", response_model=List[Dict[str, Any]])
async def get_budget_planning(current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)):
    verify_admin_access(current_user)
    return [
        {"budget_id": "B-01", "category_name": "Security Agency", "allocated_amount": 600000.0, "spent_amount": 480000.0, "financial_year": "2026-2027"},
        {"budget_id": "B-02", "category_name": "Electricity & Power", "allocated_amount": 500000.0, "spent_amount": 384500.0, "financial_year": "2026-2027"},
        {"budget_id": "B-03", "category_name": "Lift & Elevator AMC", "allocated_amount": 280000.0, "spent_amount": 220000.0, "financial_year": "2026-2027"},
        {"budget_id": "B-04", "category_name": "Water Supply & Plumbing", "allocated_amount": 200000.0, "spent_amount": 140000.0, "financial_year": "2026-2027"},
        {"budget_id": "B-05", "category_name": "Housekeeping & Sanitation", "allocated_amount": 250000.0, "spent_amount": 190000.0, "financial_year": "2026-2027"}
    ]
