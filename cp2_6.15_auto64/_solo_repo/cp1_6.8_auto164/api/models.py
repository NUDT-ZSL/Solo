from pydantic import BaseModel
from typing import Literal


class AudioFeatures(BaseModel):
    averageRms: float
    averageFreq: float
    tempo: float
    loudness: float
    warmth: float


class AudioMarker(BaseModel):
    id: str
    routeId: str
    lat: float
    lng: float
    audioUrl: str
    duration: float
    features: AudioFeatures
    createdAt: str


class Route(BaseModel):
    id: str
    name: str
    description: str
    markers: list[AudioMarker]
    createdAt: str


class RouteCreate(BaseModel):
    name: str
    description: str = ""


class RouteUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class Comment(BaseModel):
    id: str
    audioMarkerId: str
    userId: str
    content: str
    createdAt: str


class CommentCreate(BaseModel):
    audioMarkerId: str
    userId: str = "default-user"
    content: str


class Rating(BaseModel):
    audioMarkerId: str
    averageScore: float
    totalCount: int


class RatingCreate(BaseModel):
    audioMarkerId: str
    userId: str = "default-user"
    score: int


class HeatmapPoint(BaseModel):
    lat: float
    lng: float
    intensity: float
    audioType: Literal["warm", "cool"]


class HeatmapBounds(BaseModel):
    north: float
    south: float
    east: float
    west: float


class HeatmapData(BaseModel):
    points: list[HeatmapPoint]
    bounds: HeatmapBounds
