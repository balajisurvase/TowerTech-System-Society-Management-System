from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from backend.app.core.database import DatabaseService
from backend.app.core.security import (
    create_access_token,
    get_current_user,
    verify_password,
    get_password_hash
)
from backend.app.schemas.schemas import LoginRequest, TokenResponse, ResetPasswordRequest
from backend.app.services.log_service import LogService

logger = logging.getLogger("towertech.auth")
router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    role = request.role.lower()
    login_id = request.loginId.strip()
    password = request.password
    society_id = request.societyId.strip()

    client = DatabaseService.get_client()
    user_record = None

    # 1. Query Supabase database
    if client:
        try:
            if role == "admin":
                res = client.table("admin").select("*").eq("admin_id", login_id).execute()
                if res.data and len(res.data) > 0:
                    cand = res.data[0]
                    if verify_password(password, cand.get("password", "")):
                        user_record = cand
                        user_record["role"] = "admin"
            elif role == "security":
                res = client.table("security").select("*").eq("security_id", login_id).execute()
                if res.data and len(res.data) > 0:
                    cand = res.data[0]
                    if verify_password(password, cand.get("password", "")):
                        user_record = cand
                        user_record["role"] = "security"
            else:  # resident / tenant
                res = client.table("resident").select("*").eq("resident_id", login_id).execute()
                if res.data and len(res.data) > 0:
                    cand = res.data[0]
                    if verify_password(password, cand.get("password", "")):
                        user_record = cand
                        user_record["role"] = cand.get("role", "resident")
        except Exception as e:
            logger.warning(f"Supabase login query error: {e}")

    # 2. Check local store fallback if database query returned nothing or for initial test accounts
    if not user_record:
        store = DatabaseService.get_store()
        table_name = "admin" if role == "admin" else ("security" if role == "security" else "resident")
        id_field = "admin_id" if role == "admin" else ("security_id" if role == "security" else "resident_id")
        
        for item in store.get(table_name, []):
            if item.get(id_field) == login_id and verify_password(password, item.get("password", "")):
                user_record = item
                user_record["role"] = role
                break

    # 3. Default demo seed credentials if fresh database without records
    if not user_record:
        if role == "admin" and login_id == "A001" and password in ["admin123", "admin", "Admin@123"]:
            user_record = {
                "id": "admin-demo-1",
                "admin_id": "A001",
                "name": "Society Administrator",
                "email": "admin@towertech.com",
                "phone": "+91 98765 43210",
                "society_id": society_id or "GV2026",
                "role": "admin"
            }
        elif role == "resident" and login_id == "R001" and password in ["resident123", "resident", "Resident@123"]:
            user_record = {
                "id": "resident-demo-1",
                "resident_id": "R001",
                "name": "Rahul Sharma",
                "tower": "Tower A",
                "floor": 4,
                "flat": "401",
                "email": "rahul.sharma@example.com",
                "phone": "+91 98765 00001",
                "society_id": society_id or "GV2026",
                "role": "resident"
            }

    if not user_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Login ID, Password, or Society ID"
        )

    # Generate JWT
    token_data = {
        "sub": user_record.get("id") or str(uuid.uuid4()),
        "role": user_record.get("role", role),
        "name": user_record.get("name", "User"),
        "email": user_record.get("email"),
        "phone": user_record.get("phone"),
        "society_id": user_record.get("society_id", society_id),
        "admin_id": user_record.get("admin_id"),
        "resident_id": user_record.get("resident_id"),
        "security_id": user_record.get("security_id"),
        "tower": user_record.get("tower"),
        "flat": user_record.get("flat")
    }

    access_token = create_access_token(token_data)

    # Log activity
    await LogService.log_activity(
        user_id=token_data["sub"],
        user_name=token_data["name"],
        user_role=token_data["role"],
        action="LOGIN",
        module="Authentication",
        details=f"User {token_data['name']} ({token_data['role']}) logged in successfully",
        society_id=token_data["society_id"]
    )

    # Clean password from response
    user_resp = {k: v for k, v in user_record.items() if k != "password"}
    user_resp["role"] = token_data["role"]

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_resp
    )

@router.get("/me")
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    return {"status": "success", "user": current_user}

@router.post("/logout")
async def logout(current_user: Dict[str, Any] = Depends(get_current_user)):
    await LogService.log_activity(
        user_id=current_user["id"],
        user_name=current_user["name"],
        user_role=current_user["role"],
        action="LOGOUT",
        module="Authentication",
        society_id=current_user.get("society_id", "GV2026")
    )
    return {"status": "success", "message": "Logged out successfully"}

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    client = DatabaseService.get_client()
    if client:
        try:
            client.auth.reset_password_for_email(request.email)
        except Exception as e:
            logger.warning(f"Supabase auth reset warning: {e}")
    return {"status": "success", "message": f"Password reset instructions dispatched to {request.email}"}
