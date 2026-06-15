from datetime import datetime
from enum import Enum
from typing import List, Dict
from pydantic import BaseModel, Field, validator


class RetroType(str, Enum):
    good = "good"
    improve = "improve"
    action = "action"


class RetroCreate(BaseModel):
    type: RetroType
    content: str = Field(..., min_length=1, max_length=1000)


class RetroItem(BaseModel):
    id: str
    type: RetroType
    content: str
    created_at: datetime
    order: int


class WordFreq(BaseModel):
    text: str
    value: int


class SentimentStats(BaseModel):
    positive: int
    neutral: int
    negative: int


class RetroResponse(BaseModel):
    items: List[RetroItem]
    word_freq: List[WordFreq]
    sentiment: SentimentStats
