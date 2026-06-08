import os
import uuid
import random
from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

app = FastAPI(title="回声驿站 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AUDIO_DIR = os.path.join(os.path.dirname(__file__), "audio_files")
os.makedirs(AUDIO_DIR, exist_ok=True)

voices_db: dict[str, dict] = {}
connections_db: dict[str, dict] = {}

BLUR_TITLES = [
    "一段深夜的低语",
    "海风带来的秘密",
    "星光下的独白",
    "潮汐间的思绪",
    "远方的呼唤",
    "月光洒落的瞬间",
    "浪花里的心事",
    "贝壳中的回响",
    "晨曦中的问候",
    "漂流瓶里的微笑",
    "暮色中的叹息",
    "海鸥掠过的记忆",
]


class RespondRequest(BaseModel):
    responder_id: str
    text: str


@app.post("/api/voices")
async def upload_voice(
    audio: UploadFile = File(...),
    anonymous_id: str = Form(...),
    blur_title: str = Form(None),
):
    voice_id = str(uuid.uuid4())
    filename = f"{voice_id}.webm"
    filepath = os.path.join(AUDIO_DIR, filename)
    content = await audio.read()
    with open(filepath, "wb") as f:
        f.write(content)

    title = blur_title or random.choice(BLUR_TITLES)
    voice = {
        "id": voice_id,
        "anonymous_id": anonymous_id,
        "audio_url": f"/api/audio/{filename}",
        "blur_title": title,
        "duration": 0,
        "created_at": datetime.utcnow().isoformat(),
    }
    voices_db[voice_id] = voice
    return voice


@app.get("/api/voices/random")
async def get_random_voice(exclude_id: Optional[str] = None):
    available = [
        v for v in voices_db.values()
        if v["anonymous_id"] != exclude_id
        and not any(
            c["voice_id"] == v["id"] and c["responder_id"] == exclude_id
            for c in connections_db.values()
        )
    ]
    if not available:
        return {
            "id": "",
            "anonymous_id": "",
            "audio_url": "",
            "blur_title": "漂流海暂时空空如也，投一条语音吧...",
            "duration": 0,
            "created_at": datetime.utcnow().isoformat(),
        }
    return random.choice(available)


@app.post("/api/voices/{voice_id}/respond")
async def respond_to_voice(voice_id: str, body: RespondRequest):
    if voice_id not in voices_db:
        raise HTTPException(status_code=404, detail="Voice not found")

    voice = voices_db[voice_id]
    connection_id = str(uuid.uuid4())
    now = datetime.utcnow()
    expires = now + timedelta(hours=24)

    connection = {
        "id": connection_id,
        "voice_id": voice_id,
        "sender_id": voice["anonymous_id"],
        "responder_id": body.responder_id,
        "created_at": now.isoformat(),
        "expires_at": expires.isoformat(),
        "response_text": body.text,
        "response_audio_url": None,
        "blur_title": voice["blur_title"],
    }
    connections_db[connection_id] = connection
    return connection


@app.post("/api/voices/{voice_id}/respond-with-audio")
async def respond_to_voice_with_audio(
    voice_id: str,
    responder_id: str = Form(...),
    text: str = Form(...),
    audio: UploadFile = File(None),
):
    if voice_id not in voices_db:
        raise HTTPException(status_code=404, detail="Voice not found")

    voice = voices_db[voice_id]
    connection_id = str(uuid.uuid4())
    now = datetime.utcnow()
    expires = now + timedelta(hours=24)

    audio_url = None
    if audio:
        filename = f"resp_{connection_id}.webm"
        filepath = os.path.join(AUDIO_DIR, filename)
        content = await audio.read()
        with open(filepath, "wb") as f:
            f.write(content)
        audio_url = f"/api/audio/{filename}"

    connection = {
        "id": connection_id,
        "voice_id": voice_id,
        "sender_id": voice["anonymous_id"],
        "responder_id": responder_id,
        "created_at": now.isoformat(),
        "expires_at": expires.isoformat(),
        "response_text": text,
        "response_audio_url": audio_url,
        "blur_title": voice["blur_title"],
    }
    connections_db[connection_id] = connection
    return connection


@app.get("/api/connections")
async def get_connections(user_id: str):
    user_connections = [
        c for c in connections_db.values()
        if c["sender_id"] == user_id or c["responder_id"] == user_id
    ]
    now = datetime.utcnow()
    for conn in user_connections:
        expires = datetime.fromisoformat(conn["expires_at"])
        remaining = expires - now
        conn["remaining_seconds"] = max(0, int(remaining.total_seconds()))
        conn["is_expired"] = remaining.total_seconds() <= 0
    return user_connections


@app.get("/api/audio/{filename}")
async def get_audio(filename: str):
    filepath = os.path.join(AUDIO_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Audio not found")
    return FileResponse(filepath, media_type="audio/webm")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
