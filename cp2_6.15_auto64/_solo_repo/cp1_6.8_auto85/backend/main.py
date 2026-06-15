import json
from pathlib import Path

import uvicorn
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

import audio_storage

app = FastAPI(title="回声驿站 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AUDIO_DIR = Path(__file__).parent / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)


@app.post("/api/messages/upload")
async def upload_message(
    audio: UploadFile = File(...),
    emotion: str = Form(...),
    duration: float = Form(...),
    volume_data: str = Form("[]"),
    parent_id: str | None = Form(None),
):
    audio_bytes = await audio.read()
    vd = json.loads(volume_data)
    msg = audio_storage.save_message(
        audio_bytes=audio_bytes,
        emotion=emotion,
        duration=duration,
        volume_data=vd,
        parent_id=parent_id,
    )
    return msg


@app.get("/api/messages")
async def list_messages():
    return audio_storage.get_all_messages()


@app.get("/api/messages/{msg_id}/audio")
async def get_audio(msg_id: str):
    audio_path = audio_storage.get_audio_path(msg_id)
    if audio_path is None:
        return {"error": "not found"}
    return StreamingResponse(
        open(audio_path, "rb"),
        media_type="audio/webm",
        headers={"Content-Disposition": f"inline; filename={msg_id}.webm"},
    )


@app.post("/api/messages/{msg_id}/resonate")
async def resonate_message(
    msg_id: str,
    audio: UploadFile = File(...),
    duration: float = Form(...),
):
    messages = audio_storage.get_all_messages()
    parent = next((m for m in messages if m["id"] == msg_id), None)
    if parent is None:
        return {"error": "parent not found"}

    parent_audio_path = audio_storage.get_audio_path(msg_id)
    new_audio_bytes = await audio.read()

    if parent_audio_path and parent_audio_path.exists() and parent_audio_path.stat().st_size > 0:
        parent_bytes = parent_audio_path.read_bytes()
        mixed_bytes = parent_bytes + new_audio_bytes
    else:
        mixed_bytes = new_audio_bytes

    new_msg = audio_storage.save_message(
        audio_bytes=mixed_bytes,
        emotion=parent["emotion"],
        duration=parent["duration"] + duration,
        volume_data=parent.get("volume_data", []),
        parent_id=msg_id,
    )

    for i, m in enumerate(messages):
        if m["id"] == msg_id:
            messages[i]["resonance_count"] = messages[i].get("resonance_count", 0) + 1
            break
    with open(audio_storage.MESSAGES_FILE, "w", encoding="utf-8") as f:
        json.dump(messages, f, ensure_ascii=False, indent=2)

    return new_msg


@app.get("/api/stats")
async def stats():
    return audio_storage.get_stats()


app.mount("/api/audio", StaticFiles(directory=str(AUDIO_DIR)), name="audio")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
