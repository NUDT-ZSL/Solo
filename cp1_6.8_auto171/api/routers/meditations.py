import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException

from ..database import get_db
from ..models import MeditationCreate, MeditationResponse
from ..routers.encouragement import ENCOURAGEMENTS, pick_encouragement

router = APIRouter(prefix="/api/meditations", tags=["meditations"])


@router.get("", response_model=list[MeditationResponse])
async def list_meditations():
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM meditations ORDER BY created_at DESC")
        rows = await cursor.fetchall()
        return [
            MeditationResponse(
                id=row["id"],
                duration=row["duration"],
                depth=row["depth"],
                emotion=row["emotion"],
                createdAt=row["created_at"],
                encouragement=row["encouragement"],
            )
            for row in rows
        ]
    finally:
        await db.close()


@router.post("", response_model=MeditationResponse, status_code=201)
async def create_meditation(data: MeditationCreate):
    encouragement = pick_encouragement(data.emotion)
    record_id = uuid.uuid4().hex
    created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO meditations (id, duration, depth, emotion, created_at, encouragement) VALUES (?, ?, ?, ?, ?, ?)",
            (record_id, data.duration, data.depth, data.emotion, created_at, encouragement),
        )
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        await db.close()

    return MeditationResponse(
        id=record_id,
        duration=data.duration,
        depth=data.depth,
        emotion=data.emotion,
        createdAt=created_at,
        encouragement=encouragement,
    )
