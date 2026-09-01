from datetime import date, time, datetime
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, EmailStr, Field

# --- Auth Schemas ---
class LoginRequest(BaseModel):
    loginId: str
    password: str
    societyId: str = "GV2026"
    role: str = "resident"  # admin, resident, security, staff, tenant

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class ResetPasswordRequest(BaseModel):
    email: EmailStr

# --- Society Schemas ---
class SocietyBase(BaseModel):
    name: str
    towers: int = 1
    floors_per_tower: int = 10
    flats_per_floor: int = 4
    admin_email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None

class SocietyCreate(SocietyBase):
    admin_password: str
    admin_name: Optional[str] = None

class SocietyResponse(SocietyBase):
    society_id: str
    created_at: Optional[Union[str, datetime]] = None

# --- Admin Schemas ---
class AdminBase(BaseModel):
    admin_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    society_id: str = "GV2026"
    role: str = "admin"

class AdminCreate(AdminBase):
    password: str

class AdminUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None

class AdminResponse(AdminBase):
    id: Optional[str] = None
    created_at: Optional[Union[str, datetime]] = None

# --- Resident Schemas ---
class ResidentBase(BaseModel):
    resident_id: Optional[str] = None
    name: str
    tower: str
    floor: int = 1
    flat: str
    email: Optional[str] = None
    phone: str
    society_id: str = "GV2026"
    role: str = "resident"
    status: str = "Active"
    is_owner: bool = True
    emergency_contact: Optional[str] = None
    profile_picture_url: Optional[str] = None

class ResidentCreate(ResidentBase):
    password: str = "Resident@123"

class ResidentUpdate(BaseModel):
    name: Optional[str] = None
    tower: Optional[str] = None
    floor: Optional[int] = None
    flat: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    status: Optional[str] = None
    is_owner: Optional[bool] = None
    emergency_contact: Optional[str] = None
    profile_picture_url: Optional[str] = None

class ResidentResponse(ResidentBase):
    id: Optional[str] = None
    created_at: Optional[Union[str, datetime]] = None

# --- Tenant Schemas ---
class TenantBase(BaseModel):
    tenant_id: Optional[str] = None
    resident_id: str  # Owner resident ID
    name: str
    tower: str
    flat: str
    phone: str
    email: Optional[str] = None
    lease_start_date: Optional[str] = None
    lease_end_date: Optional[str] = None
    verification_status: str = "Pending"  # Pending, Verified, Rejected
    society_id: str = "GV2026"

class TenantCreate(TenantBase):
    password: Optional[str] = "Tenant@123"

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    lease_start_date: Optional[str] = None
    lease_end_date: Optional[str] = None
    verification_status: Optional[str] = None

# --- Family Member Schemas ---
class FamilyMemberBase(BaseModel):
    member_id: Optional[str] = None
    resident_id: str
    name: str
    relation: str  # Spouse, Child, Parent, Sibling, Other
    phone: Optional[str] = None
    age: Optional[int] = None
    society_id: str = "GV2026"

class FamilyMemberCreate(FamilyMemberBase):
    pass

# --- Vehicle Schemas ---
class VehicleBase(BaseModel):
    vehicle_id: Optional[str] = None
    resident_id: str
    vehicle_type: str = "4-Wheeler"  # 2-Wheeler, 4-Wheeler, EV
    vehicle_number: str
    parking_slot: Optional[str] = None
    sticker_number: Optional[str] = None
    society_id: str = "GV2026"

class VehicleCreate(VehicleBase):
    pass

# --- Security & Staff Schemas ---
class SecurityBase(BaseModel):
    security_id: str
    name: str
    phone: str
    shift: Optional[str] = "Day"  # Day, Night, Rotational
    society_id: str = "GV2026"
    role: str = "security"

class SecurityCreate(SecurityBase):
    password: str = "Security@123"

class StaffBase(BaseModel):
    staff_id: str
    name: str
    service_type: str  # Electrician, Plumber, Cleaner, Guard, Gardener
    phone: str
    society_id: str = "GV2026"
    rating: float = 5.0
    status: str = "Available"

class StaffCreate(StaffBase):
    pass

# --- Complaint Schemas ---
class MediaItem(BaseModel):
    media_id: Optional[str] = None
    complaint_id: Optional[str] = None
    file_url: str
    uploaded_at: Optional[str] = None
    uploaded_by: Optional[str] = None
    society_id: Optional[str] = "GV2026"

class ComplaintBase(BaseModel):
    complaint_id: Optional[str] = None
    resident_id: str
    flat_no: Union[str, int]
    tower: str
    complaint_date: Optional[str] = None
    category: Optional[str] = "General"  # Plumbing, Electrical, Lift, Security, Noise, Cleaning
    description: str
    status: str = "Pending"  # Pending, Assigned, In Progress, Resolved, Closed
    society_id: str = "GV2026"
    admin_id: Optional[str] = None
    admin_comment: Optional[str] = None
    priority: Optional[str] = "Medium"  # Low, Medium, High, Critical
    assigned_to: Optional[str] = None

class ComplaintCreate(BaseModel):
    resident_id: str
    flat_no: Union[str, int]
    tower: str
    category: Optional[str] = "General"
    description: str
    status: str = "Pending"
    society_id: str = "GV2026"
    complaint_date: Optional[str] = None
    media_url: Optional[str] = None

class ComplaintStatusUpdate(BaseModel):
    status: str
    admin_comment: Optional[str] = None
    assigned_to: Optional[str] = None
    priority: Optional[str] = None

class ComplaintCommentCreate(BaseModel):
    comment: str
    user_name: str
    user_role: str

class ComplaintResponse(ComplaintBase):
    id: Optional[str] = None
    resident_name: Optional[str] = None
    media: List[MediaItem] = []
    created_at: Optional[Union[str, datetime]] = None

# --- Maintenance Schemas ---
class MaintenanceBase(BaseModel):
    maintenance_id: Optional[str] = None
    bill_no: Optional[str] = None
    resident_id: str
    resident_name: Optional[str] = None
    flat_no: str
    tower: str
    month: str
    amount: float
    status: str = "Unpaid"  # Paid, Unpaid, Overdue
    due_date: str
    society_id: str = "GV2026"
    admin_id: Optional[str] = None
    late_fine: float = 0.0
    total_amount: Optional[float] = None
    payment_date: Optional[str] = None
    payment_method: Optional[str] = None  # UPI, Card, Net Banking, Cash
    transaction_id: Optional[str] = None

class MaintenanceBillCreate(BaseModel):
    resident_id: str
    resident_name: Optional[str] = None
    flat_no: str
    tower: str
    month: str
    amount: float
    status: str = "Unpaid"
    due_date: str
    society_id: str = "GV2026"
    admin_id: Optional[str] = None

class MaintenanceBulkCreate(BaseModel):
    month: str
    due_date: str
    amount: float
    society_id: str = "GV2026"
    admin_id: Optional[str] = None
    bills: Optional[List[MaintenanceBillCreate]] = None

class MaintenancePaymentRequest(BaseModel):
    payment_method: str = "UPI"
    transaction_id: Optional[str] = None
    amount_paid: Optional[float] = None

class MaintenanceStatusUpdate(BaseModel):
    status: str  # Paid, Unpaid
    payment_date: Optional[str] = None

class MaintenanceResponse(MaintenanceBase):
    id: Optional[str] = None
    created_at: Optional[Union[str, datetime]] = None

# --- Amenity & Booking Schemas ---
class AmenityBase(BaseModel):
    amenity_id: Optional[str] = None
    name: str
    type: Optional[str] = "Indoor"
    charges: float = 0.0
    price: Optional[float] = None
    society_id: str = "GV2026"
    description: Optional[str] = None
    base_hours: Optional[int] = 2
    extra_hour_charge: Optional[float] = 0.0
    facilities: Optional[str] = None
    is_active: bool = True

class AmenityCreate(AmenityBase):
    pass

class AmenityUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    charges: Optional[float] = None
    description: Optional[str] = None
    base_hours: Optional[int] = None
    extra_hour_charge: Optional[float] = None
    facilities: Optional[str] = None
    is_active: Optional[bool] = None

class BookingBase(BaseModel):
    booking_id: Optional[str] = None
    resident_id: str
    name: str
    tower: str
    flat: str
    amenity_name: str
    amenity_type: Optional[str] = "Indoor"
    event_name: str
    booking_date: str
    start_time: str
    end_time: str
    charges: float = 0.0
    status: str = "Pending"  # Pending, Approved, Rejected, Cancelled
    society_id: str = "GV2026"
    admin_id: Optional[str] = None
    admin_comment: Optional[str] = None

class BookingCreate(BookingBase):
    pass

class BookingStatusUpdate(BaseModel):
    status: str
    admin_comment: Optional[str] = None

class BookingResponse(BookingBase):
    id: Optional[str] = None
    created_at: Optional[Union[str, datetime]] = None

# --- Visitor & Security Schemas ---
class VisitorBase(BaseModel):
    visitor_id: Optional[str] = None
    name: str
    phone: str
    purpose: str = "Personal"  # Delivery, Guest, Service, Cab
    resident_id: str
    tower: str
    flat_no: str
    vehicle_number: Optional[str] = None
    entry_time: Optional[str] = None
    exit_time: Optional[str] = None
    status: str = "Expected"  # Expected, Approved, In Premises, Checked Out, Denied
    otp_code: Optional[str] = None
    qr_pass_code: Optional[str] = None
    society_id: str = "GV2026"
    security_id: Optional[str] = None

class VisitorCreate(VisitorBase):
    pass

class VisitorVerifyRequest(BaseModel):
    otp_code: Optional[str] = None
    qr_pass_code: Optional[str] = None
    visitor_id: Optional[str] = None

class ParcelBase(BaseModel):
    parcel_id: Optional[str] = None
    resident_id: str
    tower: str
    flat_no: str
    courier_company: str  # Amazon, Flipkart, Swiggy, Zomato, BlueDart, Other
    tracking_number: Optional[str] = None
    received_at: Optional[str] = None
    collected_at: Optional[str] = None
    status: str = "Held at Gate"  # Held at Gate, Collected, Returned
    society_id: str = "GV2026"
    security_id: Optional[str] = None

class ParcelCreate(ParcelBase):
    pass

# --- Chat & Communication Schemas ---
class ChatMessageBase(BaseModel):
    message_id: Optional[str] = None
    group_id: str = "general"
    sender_id: str
    sender_name: str
    sender_role: str
    sender_tower_flat: Optional[str] = None  # e.g., "Tower A - Flat 401"
    content: str
    media_url: Optional[str] = None
    created_at: Optional[str] = None
    society_id: str = "GV2026"

class ChatMessageCreate(BaseModel):
    group_id: str = "general"
    content: str
    media_url: Optional[str] = None
    society_id: str = "GV2026"

# --- Notice & Emergency Schemas ---
class NoticeBase(BaseModel):
    notice_id: Optional[str] = None
    title: str
    content: str
    priority: str = "Normal"  # Low, Normal, High, Urgent
    category: str = "General"  # Maintenance, Event, Security, Rules, Meeting
    target_tower: Optional[str] = "All"  # All or specific Tower A, B, etc.
    attachment_url: Optional[str] = None
    posted_by: str = "Admin"
    created_at: Optional[str] = None
    society_id: str = "GV2026"

class NoticeCreate(NoticeBase):
    pass

class EmergencyAlertBase(BaseModel):
    alert_id: Optional[str] = None
    alert_type: str  # Fire, Medical, Security, Lift Failure, Water Shortage, Gas Leakage, Power Outage
    title: str
    description: str
    location_details: Optional[str] = None
    severity: str = "Critical"  # High, Critical, Extreme
    status: str = "Active"  # Active, Resolved, False Alarm
    created_at: Optional[str] = None
    created_by: str = "Admin"
    society_id: str = "GV2026"

class EmergencyAlertCreate(EmergencyAlertBase):
    pass

# --- Financial Module Schemas (ADMIN ONLY) ---
class FinancialCategory(BaseModel):
    category_id: str
    name: str
    type: str  # Income, Expense
    description: Optional[str] = None
    society_id: str = "GV2026"

class FinancialTransactionBase(BaseModel):
    transaction_id: Optional[str] = None
    title: str
    category_id: str
    category_name: str
    type: str  # Income, Expense
    amount: float
    date: str
    payment_mode: str = "Bank Transfer"
    reference_no: Optional[str] = None
    vendor_or_payer: Optional[str] = None
    description: Optional[str] = None
    receipt_url: Optional[str] = None
    society_id: str = "GV2026"
    created_by: Optional[str] = None

class FinancialTransactionCreate(FinancialTransactionBase):
    pass

class BudgetPlanningBase(BaseModel):
    budget_id: Optional[str] = None
    financial_year: str = "2026-2027"
    month: Optional[str] = None
    category_name: str
    allocated_amount: float
    spent_amount: float = 0.0
    society_id: str = "GV2026"

class BudgetPlanningCreate(BudgetPlanningBase):
    pass

# --- Notification Schemas ---
class NotificationBase(BaseModel):
    notification_id: Optional[str] = None
    recipient_id: str
    recipient_role: Optional[str] = None
    title: str
    message: str
    type: str = "info"  # info, alert, payment, complaint, booking, emergency
    link_url: Optional[str] = None
    is_read: bool = False
    created_at: Optional[str] = None
    society_id: str = "GV2026"

class NotificationCreate(NotificationBase):
    pass

# --- Activity Log & Audit Schemas ---
class ActivityLogBase(BaseModel):
    log_id: Optional[str] = None
    user_id: str
    user_name: str
    user_role: str
    action: str  # CREATE, UPDATE, DELETE, LOGIN, APPROVE
    module: str  # Maintenance, Complaint, Resident, Booking, Financial, Security
    record_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: Optional[str] = None
    society_id: str = "GV2026"

class ActivityLogCreate(ActivityLogBase):
    pass

# --- System Settings Schemas ---
class SystemSettings(BaseModel):
    id: Optional[str] = "1"
    society_id: str = "GV2026"
    late_fine_percentage: float = 5.0
    late_fine_fixed: float = 100.0
    due_days: int = 15
    emergency_contact_phone: str = "+91 98765 43210"
    security_gate_phone: str = "+91 98765 43211"
    ai_analytics_enabled: bool = True
