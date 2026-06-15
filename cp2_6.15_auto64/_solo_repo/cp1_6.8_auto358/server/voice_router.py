import os
import uuid
import time
from pathlib import Path

import aiosqlite
from fastapi import APIRouter, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api")

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "data" / "mystery.db"
UPLOADS_DIR = BASE_DIR / "uploads"

DB_PATH.parent.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


async def get_db():
    return await aiosqlite.connect(str(DB_PATH))


async def init_db():
    db = await get_db()
    await db.executescript("""
        CREATE TABLE IF NOT EXISTS mysteries (
            id TEXT PRIMARY KEY,
            audio_filename TEXT NOT NULL,
            type TEXT NOT NULL,
            answer TEXT NOT NULL,
            keywords TEXT NOT NULL,
            creator_id TEXT NOT NULL,
            created_at REAL NOT NULL
        );
        CREATE TABLE IF NOT EXISTS connections (
            id TEXT PRIMARY KEY,
            mystery_id TEXT NOT NULL,
            guesser_id TEXT NOT NULL,
            creator_id TEXT NOT NULL,
            created_at REAL NOT NULL,
            expires_at REAL NOT NULL,
            FOREIGN KEY (mystery_id) REFERENCES mysteries(id)
        );
    """)
    await db.commit()
    await db.close()


def fuzzy_match(answer: str, keywords: str) -> bool:
    answer_clean = answer.strip().lower()
    for kw in keywords.split(","):
        kw_clean = kw.strip().lower()
        if kw_clean and kw_clean in answer_clean:
            return True
    return False


@router.post("/mysteries")
async def create_mystery(
    audio: UploadFile = File(...),
    type: str = Form(...),
    answer: str = Form(...),
    keywords: str = Form(...),
    creator_id: str = Form(...),
):
    mystery_id = str(uuid.uuid4())
    ext = os.path.splitext(audio.filename or "audio.wav")[1] or ".wav"
    audio_filename = f"{mystery_id}{ext}"
    audio_path = UPLOADS_DIR / audio_filename
    content = await audio.read()
    with open(audio_path, "wb") as f:
        f.write(content)

    now = time.time()
    db = await get_db()
    await db.execute(
        "INSERT INTO mysteries (id, audio_filename, type, answer, keywords, creator_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (mystery_id, audio_filename, type, answer, keywords, creator_id, now),
    )
    await db.commit()
    await db.close()

    return {
        "id": mystery_id,
        "audio_filename": audio_filename,
        "type": type,
        "answer": answer,
        "keywords": keywords,
        "creator_id": creator_id,
        "created_at": now,
        "audio_url": f"/api/audio/{audio_filename}",
    }


@router.get("/mysteries/random")
async def get_random_mystery(creator_id: str = Query(...)):
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM mysteries WHERE creator_id != ? ORDER BY RANDOM() LIMIT 1",
        (creator_id,),
    )
    row = await cursor.fetchone()
    await db.close()

    if not row:
        return {"error": "No mysteries available"}

    columns = [desc[0] for desc in cursor.description]
    mystery = dict(zip(columns, row))
    mystery["audio_url"] = f"/api/audio/{mystery['audio_filename']}"
    return mystery


@router.get("/audio/{filename}")
async def serve_audio(filename: str):
    file_path = UPLOADS_DIR / filename
    if not file_path.exists():
        return {"error": "Audio file not found"}
    return FileResponse(str(file_path), media_type="audio/wav")


class GuessRequest(BaseModel):
    mystery_id: str
    answer: str
    guesser_id: str


@router.post("/guess")
async def guess_mystery(body: GuessRequest):
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM mysteries WHERE id = ?",
        (body.mystery_id,),
    )
    row = await cursor.fetchone()
    if not row:
        await db.close()
        return {"correct": False, "hint": "谜题不存在"}

    columns = [desc[0] for desc in cursor.description]
    mystery = dict(zip(columns, row))

    correct = fuzzy_match(body.answer, mystery["keywords"])

    result: dict = {"correct": correct}

    if correct:
        conn_id = str(uuid.uuid4())
        now = time.time()
        expires_at = now + 86400
        await db.execute(
            "INSERT INTO connections (id, mystery_id, guesser_id, creator_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
            (conn_id, body.mystery_id, body.guesser_id, mystery["creator_id"], now, expires_at),
        )
        await db.commit()
        result["connection"] = {
            "id": conn_id,
            "mystery_id": body.mystery_id,
            "guesser_id": body.guesser_id,
            "creator_id": mystery["creator_id"],
            "created_at": now,
            "expires_at": expires_at,
        }
    else:
        answer_lower = mystery["answer"].strip().lower()
        hint_len = max(1, len(answer_lower) // 3)
        result["hint"] = answer_lower[:hint_len] + "..." if answer_lower else "..."

    await db.close()
    return result


@router.get("/connections")
async def get_connections(user_id: str = Query(...)):
    db = await get_db()
    now = time.time()
    await db.execute(
        "DELETE FROM connections WHERE expires_at < ?",
        (now,),
    )
    await db.commit()

    cursor = await db.execute(
        """
        SELECT c.*, m.type as mystery_type
        FROM connections c
        JOIN mysteries m ON c.mystery_id = m.id
        WHERE c.creator_id = ? OR c.guesser_id = ?
        """,
        (user_id, user_id),
    )
    rows = await cursor.fetchall()
    columns = [desc[0] for desc in cursor.description]
    connections = [dict(zip(columns, row)) for row in rows]
    await db.close()
    return {"connections": connections}
