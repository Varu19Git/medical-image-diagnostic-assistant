import os
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
import uuid
from PIL import Image as PILImage
import yaml
from datetime import datetime

from database.database import get_db
from database.models import Image, User
from utils.auth import get_current_active_user

# Load configuration
def load_config():
    with open("../config.yaml", "r") as file:
        return yaml.safe_load(file)

config = load_config()
UPLOADS_DIR = config["storage"]["uploads_dir"]
MAX_UPLOAD_SIZE_MB = config["storage"]["max_upload_size_mb"]

# Ensure uploads directory exists
os.makedirs(UPLOADS_DIR, exist_ok=True)

router = APIRouter()

class ImageResponse(BaseModel):
    id: int
    filename: str
    upload_date: datetime
    content_type: str
    prediction_id: Optional[int] = None

    class Config:
        from_attributes = True

@router.post("/upload", response_model=ImageResponse)
async def upload_image(
    file: UploadFile = File(...),
    image_type: str = Form(...),  # X-ray, CT, MRI, etc.
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Upload a medical image file."""
    # Validate file size
    file_size = 0
    file_content = await file.read()
    file_size = len(file_content)
    await file.seek(0)  # Reset file pointer
    
    max_size_bytes = MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if file_size > max_size_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE_MB}MB"
        )
    
    # Validate file type
    content_type = file.content_type
    if not content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="File must be an image"
        )
    
    # Generate unique filename
    original_filename = file.filename
    ext = os.path.splitext(original_filename)[1]
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOADS_DIR, unique_filename)
    
    # Save the file
    with open(file_path, "wb") as buffer:
        buffer.write(file_content)
    
    # Get image dimensions
    try:
        with PILImage.open(file_path) as img:
            width, height = img.size
    except Exception as e:
        os.remove(file_path)  # Clean up on error
        raise HTTPException(
            status_code=400,
            detail=f"Error processing image: {str(e)}"
        )
    
    # Save to database
    db_image = Image(
        filename=unique_filename,
        original_filename=original_filename,
        file_path=file_path,
        file_size=file_size,
        mime_type=content_type,
        image_type=image_type,
        width=width,
        height=height
    )
    
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    
    return db_image

@router.get("/{image_id}", response_model=ImageResponse)
async def get_image(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get image details by ID."""
    db_image = db.query(Image).filter(Image.id == image_id).first()
    if db_image is None:
        raise HTTPException(status_code=404, detail="Image not found")
    return db_image

@router.get("/", response_model=List[ImageResponse])
async def list_images(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all uploaded images."""
    images = db.query(Image).offset(skip).limit(limit).all()
    return images

@router.delete("/{image_id}")
async def delete_image(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete an image by ID."""
    # Check for admin role
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions"
        )
    
    db_image = db.query(Image).filter(Image.id == image_id).first()
    if db_image is None:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Delete the file
    try:
        if os.path.exists(db_image.file_path):
            os.remove(db_image.file_path)
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error deleting file: {str(e)}"
        )
    
    # Delete from database
    db.delete(db_image)
    db.commit()
    
    return {"message": "Image deleted successfully"}
