import os
import uuid
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from backend.app.core.database import DatabaseService
from backend.app.core.security import get_optional_current_user

upload_router = APIRouter(prefix="/upload", tags=["File Upload"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".mp4", ".mov"}
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB

@upload_router.post("", response_model=Dict[str, Any])
async def upload_file(
    file: UploadFile = File(...),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    ext = os.path.splitext(file.filename)[1].lower() if file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Read content
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds maximum allowed limit of 15MB")

    # Generate safe filename
    file_id = f"file_{uuid.uuid4().hex}{ext}"
    
    # Save to local public upload directory
    uploads_dir = os.path.join(os.getcwd(), "public", "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    file_path = os.path.join(uploads_dir, file_id)

    with open(file_path, "wb") as f:
        f.write(content)

    public_url = f"/uploads/{file_id}"

    # Try uploading to Supabase Storage if configured
    client = DatabaseService.get_client()
    if client:
        try:
            client.storage.from_("towertech-media").upload(file_id, content)
            public_url = client.storage.from_("towertech-media").get_public_url(file_id)
        except Exception:
            pass

    return {
        "status": "success",
        "message": "File uploaded successfully",
        "file_url": public_url,
        "filename": file.filename,
        "size_bytes": len(content)
    }
