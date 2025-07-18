from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from fastapi.responses import JSONResponse
import logging
import os
import shutil
from typing import List
from pathlib import Path

from utils.database import DatabaseManager, get_database
from utils.auth import get_current_active_user
from models.user import UserInDB

logger = logging.getLogger(__name__)
router = APIRouter()

# Create uploads directory if it doesn't exist
UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)

@router.post("/images")
async def upload_images(
    images: List[UploadFile] = File(...),
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Upload multiple images"""
    try:
        if not images:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No files uploaded"
            )

        uploaded_files = []
        
        for image in images:
            # Validate file type
            if not image.content_type.startswith("image/"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File {image.filename} is not an image"
                )
            
            # Generate unique filename
            file_extension = Path(image.filename).suffix
            unique_filename = f"{current_user.id}_{os.urandom(8).hex()}{file_extension}"
            file_path = UPLOADS_DIR / unique_filename
            
            # Save file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)
            
            uploaded_files.append({
                "filename": unique_filename,
                "originalname": image.filename,
                "path": f"/uploads/{unique_filename}",
                "size": file_path.stat().st_size,
                "mimetype": image.content_type
            })
        
        return {
            "message": "Files uploaded successfully",
            "files": uploaded_files
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error uploading files"
        )

@router.delete("/images/{filename}")
async def delete_image(
    filename: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db: DatabaseManager = Depends(get_database)
):
    """Delete uploaded image"""
    try:
        file_path = UPLOADS_DIR / filename
        
        if file_path.exists():
            file_path.unlink()
            return {"message": "File deleted successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting file"
        ) 