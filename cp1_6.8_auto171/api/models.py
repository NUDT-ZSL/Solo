from typing import Literal

from pydantic import BaseModel, Field


class MeditationCreate(BaseModel):
    duration: int = Field(gt=0)
    depth: int = Field(ge=1, le=5)
    emotion: Literal["calm", "joy", "anxiety"]


class MeditationResponse(BaseModel):
    id: str
    duration: int
    depth: int
    emotion: str
    createdAt: str
    encouragement: str


class DailyStats(BaseModel):
    date: str
    totalDuration: int
    sessionCount: int


class EmotionDistribution(BaseModel):
    calm: float = Field(ge=0, le=100)
    joy: float = Field(ge=0, le=100)
    anxiety: float = Field(ge=0, le=100)


class StreakInfo(BaseModel):
    currentStreak: int
    longestStreak: int
