import uuid
import os

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse

from database import get_db
from services.audio_service import save_audio_file, extract_features

router = APIRouter(prefix="/api/audio", tags=["audio"])


@router.post("/upload")
async def upload_audio(
    file: UploadFile = File(...),
    routeId: str = Form(...),
    lat: float = Form(...),
    lng: float = Form(...),
    locationName: str = Form(default=""),
):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty audio file")

    db = await get_db()
    cursor = await db.execute("SELECT id FROM routes WHERE id = ?", (routeId,))
    if await cursor.fetchone() is None:
        raise HTTPException(status_code=404, detail="Route not found")

    audio_path = await save_audio_file(content, file.filename or "audio.webm")
    features = extract_features(len(content))
    duration = round(len(content) / 16000, 2)

    marker_id = uuid.uuid4().hex[:16]
    await db.execute(
        """INSERT INTO audio_markers
           (id, route_id, lat, lng, audio_path, location_name, duration,
            average_rms, average_freq, tempo, loudness, warmth)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            marker_id,
            routeId,
            lat,
            lng,
            audio_path,
            locationName,
            duration,
            features["averageRms"],
            features["averageFreq"],
            features["tempo"],
            features["loudness"],
            features["warmth"],
        ),
    )
    await db.commit()

    return {
        "id": marker_id,
        "routeId": routeId,
        "lat": lat,
        "lng": lng,
        "audioUrl": f"/api/audio/{marker_id}/stream",
        "duration": duration,
        "features": features,
        "createdAt": _now(),
    }


@router.get("/{audio_id}")
async def get_audio(audio_id: str):
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM audio_markers WHERE id = ?", (audio_id,)
    )
    row = await cursor.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Audio marker not found")

    return _row_to_marker(row)


@router.delete("/{audio_id}")
async def delete_audio(audio_id: str):
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM audio_markers WHERE id = ?", (audio_id,)
    )
    row = await cursor.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Audio marker not found")

    audio_path = row["audio_path"]
    if os.path.exists(audio_path):
        os.remove(audio_path)

    await db.execute("DELETE FROM comments WHERE audio_marker_id = ?", (audio_id,))
    await db.execute("DELETE FROM ratings WHERE audio_marker_id = ?", (audio_id,))
    await db.execute("DELETE FROM audio_markers WHERE id = ?", (audio_id,))
    await db.commit()

    return {"message": "Audio marker deleted"}


@router.get("/{audio_id}/stream")
async def stream_audio(audio_id: str):
    db = await get_db()
    cursor = await db.execute(
        "SELECT audio_path FROM audio_markers WHERE id = ?", (audio_id,)
    )
    row = await cursor.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Audio marker not found")

    audio_path = row["audio_path"]
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="Audio file not found on disk")

    ext = os.path.splitext(audio_path)[1].lower()
    content_type_map = {
        ".webm": "audio/webm",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".ogg": "audio/ogg",
        ".m4a": "audio/mp4",
    }
    content_type = content_type_map.get(ext, "application/octet-stream")

    file_size = os.path.getsize(audio_path)

    async def iter_chunks():
        chunk_size = 64 * 1024
        with open(audio_path, "rb") as f:
            while True:
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                yield chunk

    return StreamingResponse(
        iter_chunks(),
        media_type=content_type,
        headers={
            "Content-Length": str(file_size),
            "Accept-Ranges": "bytes",
        },
    )


def _row_to_marker(row) -> dict:
    return {
        "id": row["id"],
        "routeId": row["route_id"],
        "lat": row["lat"],
        "lng": row["lng"],
        "audioUrl": f"/api/audio/{row['id']}/stream",
        "duration": row["duration"],
        "features": {
            "averageRms": row["average_rms"],
            "averageFreq": row["average_freq"],
            "tempo": row["tempo"],
            "loudness": row["loudness"],
            "warmth": row["warmth"],
        },
        "createdAt": row["created_at"],
    }


def _now() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat()
