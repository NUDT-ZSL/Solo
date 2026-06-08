from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ScentMarkCreate(BaseModel):
    lat: float
    lng: float
    description: str
    scent_type: str
    user_id: str


class ScentMark(BaseModel):
    id: str
    lat: float
    lng: float
    description: str
    scent_type: str
    user_id: str
    audio_url: Optional[str] = None
    created_at: str


class UserFootprint(BaseModel):
    user_id: str
    marks: list[ScentMark]
    total_count: int
    last_activity: Optional[str] = None
