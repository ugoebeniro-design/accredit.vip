"""Secure file upload validation"""

from fastapi import UploadFile, HTTPException, status
import mimetypes
import os
import magic  # python-magic for file type detection
import logging

logger = logging.getLogger(__name__)

# Configuration
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".pdf", ".doc", ".docx"}
ALLOWED_MIMETYPES = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

# File signatures (magic bytes)
FILE_SIGNATURES = {
    b"\xff\xd8\xff": ".jpg",
    b"\x89PNG": ".png",
    b"GIF8": ".gif",
    b"%PDF": ".pdf",
    b"PK\x03\x04": [".docx", ".xlsx", ".pptx"],  # OOXML
    b"\xd0\xcf\x11": ".doc",  # OLE (old Office)
}


class FileUploadSecurityService:
    """Validate and secure file uploads"""

    @staticmethod
    async def validate_upload(file: UploadFile) -> None:
        """Validate file upload for security issues"""
        if not file or not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No file provided",
            )

        # Check file size
        if file.size and file.size > MAX_UPLOAD_SIZE:
            max_mb = MAX_UPLOAD_SIZE / 1024 / 1024
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum size is {max_mb}MB",
            )

        # Check file extension
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}",
            )

        # Check MIME type from headers
        mime_type, _ = mimetypes.guess_type(file.filename)
        if mime_type and mime_type not in ALLOWED_MIMETYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file MIME type: {mime_type}",
            )

        # Read file contents for magic byte verification
        contents = await file.read()
        await file.seek(0)  # Reset file pointer

        if not contents:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File is empty",
            )

        # Verify file signature (magic bytes)
        file_valid = False
        for signature, ext in FILE_SIGNATURES.items():
            if contents.startswith(signature):
                if isinstance(ext, list):
                    if file_ext in ext:
                        file_valid = True
                        break
                else:
                    if file_ext == ext:
                        file_valid = True
                        break

        if not file_valid:
            logger.warning(
                f"File signature mismatch: {file.filename} (ext: {file_ext})"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File signature does not match file extension",
            )

        # Check for dangerous patterns
        try:
            if b"<script" in contents or b"<?php" in contents:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="File contains potentially dangerous content",
                )
        except Exception:
            pass  # Binary files might cause encoding issues

        logger.info(f"File upload validated: {file.filename} ({file.size} bytes)")

    @staticmethod
    def generate_safe_filename(original_filename: str, user_id: int) -> str:
        """Generate a safe filename for storage"""
        import uuid

        # Extract extension
        _, ext = os.path.splitext(original_filename)

        # Generate safe filename with user ID and UUID
        safe_name = f"{user_id}_{uuid.uuid4().hex}{ext.lower()}"
        return safe_name
