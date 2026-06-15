from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ResonanceCreate(BaseModel):
    description: str
    emoji: str


class ScentBottleCreate(BaseModel):
    description: str
    emoji: str
    category: str


class Resonance(BaseModel):
    id: str
    bottleId: str
    description: str
    emoji: str
    authorId: str
    createdAt: str


class ScentBottle(BaseModel):
    id: str
    description: str
    emoji: str
    category: str
    authorId: str
    resonances: list[Resonance]
    resonanceCount: int
    createdAt: str


class UserProfile(BaseModel):
    id: str
    publishedBottles: list[ScentBottle]
    resonatedBottles: list[ScentBottle]
    totalPublished: int
    totalResonated: int
    topCategory: str
