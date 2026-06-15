from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from diary_router import router as diary_router
import sqlite3
import os

app = FastAPI(title="情绪色谱日记")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "diary.db")


def get_db_path():
    return DB_PATH


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS diaries (
            id TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            emotion TEXT NOT NULL CHECK(emotion IN ('happy','sad','calm','anxious','angry','grateful')),
            intensity INTEGER NOT NULL CHECK(intensity >= 1 AND intensity <= 10),
            date TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_diaries_date ON diaries(date)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_diaries_emotion ON diaries(emotion)"
    )
    conn.commit()
    conn.close()


@app.on_event("startup")
def startup():
    init_db()


app.include_router(diary_router, prefix="/api")
