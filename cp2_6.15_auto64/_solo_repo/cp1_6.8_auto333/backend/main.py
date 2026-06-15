import sqlite3
import uuid
from contextlib import contextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from emotion_handler import generate_audio_params

app = FastAPI(title="情绪回声")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "emotion_echo.db"


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS emotions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id),
                text TEXT NOT NULL,
                emoji TEXT NOT NULL,
                color TEXT NOT NULL,
                frequency REAL NOT NULL DEFAULT 440.0,
                waveform TEXT NOT NULL DEFAULT 'sine',
                duration REAL NOT NULL DEFAULT 1.5,
                attack REAL NOT NULL DEFAULT 0.05,
                decay REAL NOT NULL DEFAULT 0.2,
                sustain REAL NOT NULL DEFAULT 0.4,
                release REAL NOT NULL DEFAULT 0.3,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS resonances (
                id TEXT PRIMARY KEY,
                emotion_id TEXT NOT NULL REFERENCES emotions(id) ON DELETE CASCADE,
                user_id TEXT NOT NULL REFERENCES users(id),
                tag TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_emotions_user_id ON emotions(user_id);
            CREATE INDEX IF NOT EXISTS idx_emotions_created_at ON emotions(created_at);
            CREATE INDEX IF NOT EXISTS idx_resonances_emotion_id ON resonances(emotion_id);
        """)


def seed_data():
    with get_db() as conn:
        count = conn.execute("SELECT COUNT(*) FROM emotions").fetchone()[0]
        if count > 0:
            return
        user_id = uuid.uuid4().hex
        conn.execute(
            "INSERT INTO users (id, username) VALUES (?, ?)",
            (user_id, "echo_lover"),
        )
        samples = [
            ("今天阳光真好，心情像蓝天一样明朗", "☀️", "#4A90D9"),
            ("有些焦虑，但我会慢慢调整", "😰", "#7B68EE"),
            ("感恩身边每一个温暖的人", "🙏", "#2ECC71"),
            ("小挫折而已，没什么大不了", "💪", "#E74C3C"),
            ("安静的夜晚，适合和自己对话", "🌙", "#9B59B6"),
        ]
        for text, emoji, color in samples:
            params = generate_audio_params(color)
            conn.execute(
                """INSERT INTO emotions (id, user_id, text, emoji, color, frequency, waveform, duration, attack, decay, sustain, release)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    uuid.uuid4().hex,
                    user_id,
                    text,
                    emoji,
                    color,
                    params["frequency"],
                    params["waveform"],
                    params["duration"],
                    params["attack"],
                    params["decay"],
                    params["sustain"],
                    params["release"],
                ),
            )


@app.on_event("startup")
def startup():
    init_db()
    seed_data()


class RegisterRequest(BaseModel):
    username: str


class UserResponse(BaseModel):
    user_id: str
    username: str


class EmotionCreate(BaseModel):
    text: str
    emoji: str
    color: str


class EmotionUpdate(BaseModel):
    text: Optional[str] = None
    emoji: Optional[str] = None
    color: Optional[str] = None


class ResonanceCreate(BaseModel):
    tag: str


class ResonanceResponse(BaseModel):
    id: str
    emotion_id: str
    user_id: Optional[str]
    tag: str
    created_at: str


class EmotionResponse(BaseModel):
    id: str
    user_id: str
    text: str
    emoji: str
    color: str
    frequency: float
    waveform: str
    duration: float
    attack: float
    decay: float
    sustain: float
    release: float
    created_at: str
    resonances_count: int = 0


def get_current_user(request: Request) -> Optional[str]:
    user_id = request.headers.get("user-id")
    if not user_id:
        user_id = request.cookies.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="未登录")
    with get_db() as conn:
        user = conn.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="用户不存在")
    return user_id


@app.post("/api/users/register", response_model=UserResponse)
def register(body: RegisterRequest):
    user_id = uuid.uuid4().hex
    with get_db() as conn:
        try:
            conn.execute(
                "INSERT INTO users (id, username) VALUES (?, ?)",
                (user_id, body.username),
            )
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=400, detail="用户名已存在")
    return UserResponse(user_id=user_id, username=body.username)


@app.get("/api/users/me", response_model=UserResponse)
def get_me(user_id: str = Depends(get_current_user)):
    with get_db() as conn:
        user = conn.execute("SELECT id, username FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return UserResponse(user_id=user["id"], username=user["username"])


@app.get("/api/emotions", response_model=list[EmotionResponse])
def list_emotions():
    with get_db() as conn:
        rows = conn.execute(
            """SELECT e.*, COUNT(r.id) as resonances_count
               FROM emotions e
               LEFT JOIN resonances r ON r.emotion_id = e.id
               GROUP BY e.id
               ORDER BY e.created_at DESC"""
        ).fetchall()
    return [_row_to_emotion(row) for row in rows]


@app.get("/api/emotions/user/{user_id}", response_model=list[EmotionResponse])
def list_user_emotions(user_id: str):
    with get_db() as conn:
        user = conn.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        rows = conn.execute(
            """SELECT e.*, COUNT(r.id) as resonances_count
               FROM emotions e
               LEFT JOIN resonances r ON r.emotion_id = e.id
               WHERE e.user_id = ?
               GROUP BY e.id
               ORDER BY e.created_at DESC""",
            (user_id,),
        ).fetchall()
    return [_row_to_emotion(row) for row in rows]


@app.post("/api/emotions", response_model=EmotionResponse)
def create_emotion(body: EmotionCreate, user_id: str = Depends(get_current_user)):
    params = generate_audio_params(body.color)
    emotion_id = uuid.uuid4().hex
    with get_db() as conn:
        conn.execute(
            """INSERT INTO emotions (id, user_id, text, emoji, color, frequency, waveform, duration, attack, decay, sustain, release)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                emotion_id,
                user_id,
                body.text,
                body.emoji,
                body.color,
                params["frequency"],
                params["waveform"],
                params["duration"],
                params["attack"],
                params["decay"],
                params["sustain"],
                params["release"],
            ),
        )
        row = conn.execute(
            """SELECT e.*, COUNT(r.id) as resonances_count
               FROM emotions e
               LEFT JOIN resonances r ON r.emotion_id = e.id
               WHERE e.id = ?
               GROUP BY e.id""",
            (emotion_id,),
        ).fetchone()
    return _row_to_emotion(row)


@app.put("/api/emotions/{emotion_id}", response_model=EmotionResponse)
def update_emotion(emotion_id: str, body: EmotionUpdate, user_id: str = Depends(get_current_user)):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM emotions WHERE id = ?", (emotion_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="情绪不存在")
        if row["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="无权修改")
        updates = []
        values = []
        for field in ("text", "emoji", "color"):
            val = getattr(body, field)
            if val is not None:
                updates.append(f"{field} = ?")
                values.append(val)
        if body.color is not None:
            params = generate_audio_params(body.color)
            for key in ("frequency", "waveform", "duration", "attack", "decay", "sustain", "release"):
                updates.append(f"{key} = ?")
                values.append(params[key])
        if not updates:
            raise HTTPException(status_code=400, detail="无更新内容")
        values.append(emotion_id)
        conn.execute(f"UPDATE emotions SET {', '.join(updates)} WHERE id = ?", values)
        row = conn.execute(
            """SELECT e.*, COUNT(r.id) as resonances_count
               FROM emotions e
               LEFT JOIN resonances r ON r.emotion_id = e.id
               WHERE e.id = ?
               GROUP BY e.id""",
            (emotion_id,),
        ).fetchone()
    return _row_to_emotion(row)


@app.delete("/api/emotions/{emotion_id}")
def delete_emotion(emotion_id: str, user_id: str = Depends(get_current_user)):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM emotions WHERE id = ?", (emotion_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="情绪不存在")
        if row["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="无权删除")
        conn.execute("DELETE FROM emotions WHERE id = ?", (emotion_id,))
    return {"detail": "已删除"}


@app.post("/api/emotions/{emotion_id}/resonance", response_model=ResonanceResponse)
def create_resonance(emotion_id: str, body: ResonanceCreate, user_id: str = Depends(get_current_user)):
    with get_db() as conn:
        emotion = conn.execute("SELECT id FROM emotions WHERE id = ?", (emotion_id,)).fetchone()
        if not emotion:
            raise HTTPException(status_code=404, detail="情绪不存在")
        res_id = uuid.uuid4().hex
        conn.execute(
            "INSERT INTO resonances (id, emotion_id, user_id, tag) VALUES (?, ?, ?, ?)",
            (res_id, emotion_id, user_id, body.tag),
        )
        row = conn.execute("SELECT * FROM resonances WHERE id = ?", (res_id,)).fetchone()
    return ResonanceResponse(
        id=row["id"],
        emotion_id=row["emotion_id"],
        user_id=row["user_id"],
        tag=row["tag"],
        created_at=row["created_at"],
    )


@app.get("/api/emotions/{emotion_id}/resonance", response_model=list[ResonanceResponse])
def list_resonances(emotion_id: str):
    with get_db() as conn:
        emotion = conn.execute("SELECT id FROM emotions WHERE id = ?", (emotion_id,)).fetchone()
        if not emotion:
            raise HTTPException(status_code=404, detail="情绪不存在")
        rows = conn.execute(
            "SELECT * FROM resonances WHERE emotion_id = ? ORDER BY created_at DESC",
            (emotion_id,),
        ).fetchall()
    return [
        ResonanceResponse(
            id=r["id"],
            emotion_id=r["emotion_id"],
            user_id=r["user_id"],
            tag=r["tag"],
            created_at=r["created_at"],
        )
        for r in rows
    ]


def _row_to_emotion(row: sqlite3.Row) -> EmotionResponse:
    return EmotionResponse(
        id=row["id"],
        user_id=row["user_id"],
        text=row["text"],
        emoji=row["emoji"],
        color=row["color"],
        frequency=row["frequency"],
        waveform=row["waveform"],
        duration=row["duration"],
        attack=row["attack"],
        decay=row["decay"],
        sustain=row["sustain"],
        release=row["release"],
        created_at=row["created_at"],
        resonances_count=row["resonances_count"],
    )
