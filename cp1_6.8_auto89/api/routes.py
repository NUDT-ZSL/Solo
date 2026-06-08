from fastapi import APIRouter, HTTPException
from .models import WishCreate, WishResponse
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path

router = APIRouter()

DB_PATH = Path(__file__).parent.parent / "wishes.db"


def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS wishes (
            id TEXT PRIMARY KEY,
            content TEXT NOT NULL CHECK(length(content) <= 120),
            style INTEGER NOT NULL CHECK(style BETWEEN 1 AND 6),
            created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
            light_count INTEGER NOT NULL DEFAULT 0
        )
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_wishes_light_count
        ON wishes(light_count DESC)
    """)
    conn.commit()
    conn.close()


def row_to_response(row) -> WishResponse:
    return WishResponse(
        id=row["id"],
        content=row["content"],
        style=row["style"],
        created_at=row["created_at"],
        light_count=row["light_count"],
    )


@router.post("/wishes", response_model=WishResponse)
async def create_wish(wish: WishCreate):
    conn = get_db()
    wish_id = str(uuid.uuid4())
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conn.execute(
        "INSERT INTO wishes (id, content, style, created_at) VALUES (?, ?, ?, ?)",
        (wish_id, wish.content, wish.style, now),
    )
    conn.commit()
    row = conn.execute(
        "SELECT * FROM wishes WHERE id = ?", (wish_id,)
    ).fetchone()
    conn.close()
    return row_to_response(row)


@router.get("/wishes", response_model=list[WishResponse])
async def get_wishes():
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM wishes ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    return [row_to_response(row) for row in rows]


@router.post("/wishes/{wish_id}/light", response_model=WishResponse)
async def light_wish(wish_id: str):
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM wishes WHERE id = ?", (wish_id,)
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Wish not found")
    conn.execute(
        "UPDATE wishes SET light_count = light_count + 1 WHERE id = ?",
        (wish_id,),
    )
    conn.commit()
    row = conn.execute(
        "SELECT * FROM wishes WHERE id = ?", (wish_id,)
    ).fetchone()
    conn.close()
    return row_to_response(row)


@router.get("/wishes/leaderboard", response_model=list[WishResponse])
async def get_leaderboard(limit: int = 50):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM wishes WHERE light_count > 0 ORDER BY light_count DESC LIMIT ?",
        (limit,),
    ).fetchall()
    conn.close()
    return [row_to_response(row) for row in rows]
