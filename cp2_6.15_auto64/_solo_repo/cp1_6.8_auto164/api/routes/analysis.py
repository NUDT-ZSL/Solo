from fastapi import APIRouter, HTTPException

from database import get_db
from models import AudioFeatures, HeatmapData
from services.audio_service import compute_heatmap

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.get("/heatmap", response_model=HeatmapData)
async def get_heatmap():
    db = await get_db()
    data = await compute_heatmap(db)
    return data


@router.get("/audio/{audio_id}/features", response_model=AudioFeatures)
async def get_audio_features(audio_id: str):
    db = await get_db()
    cursor = await db.execute(
        "SELECT average_rms, average_freq, tempo, loudness, warmth FROM audio_markers WHERE id = ?",
        (audio_id,),
    )
    row = await cursor.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Audio marker not found")

    return AudioFeatures(
        averageRms=row["average_rms"],
        averageFreq=row["average_freq"],
        tempo=row["tempo"],
        loudness=row["loudness"],
        warmth=row["warmth"],
    )
