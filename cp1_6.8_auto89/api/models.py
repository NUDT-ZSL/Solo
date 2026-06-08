from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class WishCreate(BaseModel):
    content: str = Field(..., max_length=120, min_length=1)
    style: int = Field(..., ge=1, le=6)


class WishResponse(BaseModel):
    id: str
    content: str
    style: int
    created_at: str
    light_count: int


class LightResponse(BaseModel):
    id: str
    content: str
    style: int
    created_at: str
    light_count: int
