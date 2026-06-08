import uuid
import time
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()

wishes_db: list[dict] = []

class WishCreate(BaseModel):
    text: str = Field(..., max_length=100)
    color: str
    user_id: str

class BlessRequest(BaseModel):
    user_id: str

@router.post("/wishes")
def create_wish(data: WishCreate):
    wish = {
        "id": str(uuid.uuid4()),
        "text": data.text,
        "color": data.color,
        "user_id": data.user_id,
        "blessings": 0,
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
    }
    wishes_db.append(wish)
    return wish

@router.get("/wishes")
def get_all_wishes(user_id: Optional[str] = None):
    if user_id:
        return [w for w in wishes_db if w["user_id"] == user_id]
    return wishes_db

@router.delete("/wishes/{wish_id}")
def delete_wish(wish_id: str, user_id: str):
    for i, w in enumerate(wishes_db):
        if w["id"] == wish_id:
            if w["user_id"] != user_id:
                raise HTTPException(status_code=403, detail="Not your wish")
            wishes_db.pop(i)
            return {"ok": True}
    raise HTTPException(status_code=404, detail="Wish not found")

@router.post("/wishes/{wish_id}/bless")
def bless_wish(wish_id: str, data: BlessRequest):
    for w in wishes_db:
        if w["id"] == wish_id:
            w["blessings"] += 1
            return w
    raise HTTPException(status_code=404, detail="Wish not found")

@router.get("/leaderboard")
def get_leaderboard():
    sorted_wishes = sorted(wishes_db, key=lambda w: w["blessings"], reverse=True)
    return sorted_wishes[:10]
