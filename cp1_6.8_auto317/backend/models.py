from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class BottleCreate(BaseModel):
    description: str
    emoji: str
    category: str
    creator_id: str


class BottleResponse(BaseModel):
    id: str
    description: str
    emoji: str
    category: str
    creator_id: str
    resonance_count: int
    created_at: str


class ResonanceCreate(BaseModel):
    description: str
    emoji: str
    user_id: str


class ResonanceResponse(BaseModel):
    id: str
    bottle_id: str
    description: str
    emoji: str
    user_id: str
    created_at: str


class PassRequest(BaseModel):
    user_id: str


class UserCreate(BaseModel):
    nickname: str


class UserResponse(BaseModel):
    id: str
    nickname: str


class UserStats(BaseModel):
    total_published: int
    total_resonated: int
    category_distribution: dict
