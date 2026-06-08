from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

router = APIRouter()

dreams_db: list[dict] = []

EMOTIONS = ["恐惧", "喜悦", "困惑", "忧伤", "宁静", "惊奇"]


class DreamCreate(BaseModel):
    title: str
    description: str
    emotion: str


class DreamUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    emotion: Optional[str] = None


@router.get("")
def list_dreams(emotion: Optional[str] = None, order: str = "desc"):
    results = dreams_db[:]
    if emotion:
        emotions_filter = [e.strip() for e in emotion.split(",")]
        results = [d for d in results if d["emotion"] in emotions_filter]
    reverse = order == "desc"
    results.sort(key=lambda d: d["created_at"], reverse=reverse)
    return results


@router.post("", status_code=201)
def create_dream(dream: DreamCreate):
    if dream.emotion not in EMOTIONS:
        raise HTTPException(status_code=400, detail=f"Invalid emotion. Must be one of {EMOTIONS}")
    entry = {
        "id": str(uuid.uuid4()),
        "title": dream.title,
        "description": dream.description,
        "emotion": dream.emotion,
        "created_at": datetime.now().isoformat(),
    }
    dreams_db.append(entry)
    return entry


@router.get("/{dream_id}")
def get_dream(dream_id: str):
    for d in dreams_db:
        if d["id"] == dream_id:
            return d
    raise HTTPException(status_code=404, detail="Dream not found")


@router.delete("/{dream_id}")
def delete_dream(dream_id: str):
    for i, d in enumerate(dreams_db):
        if d["id"] == dream_id:
            dreams_db.pop(i)
            return {"message": "deleted"}
    raise HTTPException(status_code=404, detail="Dream not found")
