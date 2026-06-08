from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class DiaryCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)
    date: str = Field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d"))


class DiaryUpdate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)


class SentimentResponse(BaseModel):
    sentiment: str
    sentiment_score: float
    keywords: List[str]


class DiaryEntry(BaseModel):
    id: str
    content: str
    date: str
    sentiment: str
    sentiment_score: float
    keywords: List[str]
    created_at: str
    updated_at: str


class TimelinePoint(BaseModel):
    date: str
    sentiment: str
    sentiment_score: float
    summary: str
    keywords: List[str]


class AnalyzeRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)
