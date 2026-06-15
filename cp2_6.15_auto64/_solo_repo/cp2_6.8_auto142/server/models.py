from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class JournalEntry(BaseModel):
    emotion: str = Field(..., pattern="^(happy|sad|anxious|calm|excited)$")
    activities: List[str] = Field(default_factory=list)
    text: str = Field(..., max_length=200)
    timestamp: Optional[str] = None


class HeatmapItem(BaseModel):
    day: str
    hour: int
    emotion: Optional[str]


class RadarItem(BaseModel):
    activity: str
    count: int


class TrendsResponse(BaseModel):
    heatmap: List[HeatmapItem]
    radar: List[RadarItem]
