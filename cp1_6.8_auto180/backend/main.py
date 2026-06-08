import os
import uuid
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from models import ScentMark, ScentMarkCreate, UserFootprint
from seed_data import SEED_MARKS

app = FastAPI(title="气味地图 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

marks_db: list[ScentMark] = list(SEED_MARKS)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/api/marks")
def get_marks(scent_type: Optional[str] = None, user_id: Optional[str] = None):
    results = marks_db
    if scent_type:
        results = [m for m in results if m.scent_type == scent_type]
    if user_id:
        results = [m for m in results if m.user_id == user_id]
    return results


@app.get("/api/marks/{mark_id}")
def get_mark(mark_id: str):
    for m in marks_db:
        if m.id == mark_id:
            return m
    raise HTTPException(status_code=404, detail="Mark not found")


@app.post("/api/marks", response_model=ScentMark)
async def create_mark(
    lat: float = Form(...),
    lng: float = Form(...),
    description: str = Form(...),
    scent_type: str = Form(...),
    user_id: str = Form(...),
    audio: Optional[UploadFile] = File(None),
):
    audio_url = None
    if audio:
        ext = os.path.splitext(audio.filename or "audio.wav")[1]
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        content = await audio.read()
        with open(filepath, "wb") as f:
            f.write(content)
        audio_url = f"/uploads/{filename}"

    mark = ScentMark(
        id=f"mark_{uuid.uuid4().hex[:8]}",
        lat=lat,
        lng=lng,
        description=description,
        scent_type=scent_type,
        user_id=user_id,
        audio_url=audio_url,
        created_at=datetime.now().isoformat(),
    )
    marks_db.append(mark)
    return mark


@app.delete("/api/marks/{mark_id}")
def delete_mark(mark_id: str):
    global marks_db
    original_len = len(marks_db)
    marks_db = [m for m in marks_db if m.id != mark_id]
    if len(marks_db) == original_len:
        raise HTTPException(status_code=404, detail="Mark not found")
    return {"ok": True}


@app.get("/api/footprint/{user_id}", response_model=UserFootprint)
def get_footprint(user_id: str):
    user_marks = [m for m in marks_db if m.user_id == user_id]
    last_activity = None
    if user_marks:
        sorted_marks = sorted(user_marks, key=lambda m: m.created_at)
        last_activity = sorted_marks[-1].created_at
    return UserFootprint(
        user_id=user_id,
        marks=user_marks,
        total_count=len(user_marks),
        last_activity=last_activity,
    )


@app.get("/api/scent_types")
def get_scent_types():
    return ["甜", "酸", "苦", "辛", "腥"]
