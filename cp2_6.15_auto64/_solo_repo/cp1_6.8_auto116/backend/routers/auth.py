import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services import artwork_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


class AuthRequest(BaseModel):
    username: str


@router.post("/register")
def register(req: AuthRequest):
    if not req.username or len(req.username.strip()) < 2:
        raise HTTPException(status_code=400, detail="Username must be at least 2 characters")
    result = artwork_service.register_user(req.username.strip())
    return result


@router.post("/login")
def login(req: AuthRequest):
    if not req.username or len(req.username.strip()) < 2:
        raise HTTPException(status_code=400, detail="Username must be at least 2 characters")
    result = artwork_service.login_user(req.username.strip())
    if result is None:
        raise HTTPException(status_code=404, detail="User not found")
    return result
