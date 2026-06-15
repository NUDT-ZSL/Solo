import aiosqlite
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "yinji.db")

_db: aiosqlite.Connection | None = None


async def get_db() -> aiosqlite.Connection:
    global _db
    if _db is None:
        _db = await aiosqlite.connect(DB_PATH)
        _db.row_factory = aiosqlite.Row
        await _db.execute("PRAGMA journal_mode=WAL")
        await _db.execute("PRAGMA foreign_keys=ON")
    return _db


async def close_db():
    global _db
    if _db is not None:
        await _db.close()
        _db = None


async def init_db():
    db = await get_db()

    await db.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS routes (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id),
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS audio_markers (
            id TEXT PRIMARY KEY,
            route_id TEXT NOT NULL REFERENCES routes(id),
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            audio_path TEXT NOT NULL,
            location_name TEXT DEFAULT '',
            duration REAL DEFAULT 0,
            average_rms REAL DEFAULT 0,
            average_freq REAL DEFAULT 0,
            tempo REAL DEFAULT 0,
            loudness REAL DEFAULT 0,
            warmth REAL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS comments (
            id TEXT PRIMARY KEY,
            audio_marker_id TEXT NOT NULL REFERENCES audio_markers(id),
            user_id TEXT NOT NULL REFERENCES users(id),
            content TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS ratings (
            id TEXT PRIMARY KEY,
            audio_marker_id TEXT NOT NULL REFERENCES audio_markers(id),
            user_id TEXT NOT NULL REFERENCES users(id),
            score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(audio_marker_id, user_id)
        );

        CREATE INDEX IF NOT EXISTS idx_audio_markers_route ON audio_markers(route_id);
        CREATE INDEX IF NOT EXISTS idx_comments_marker ON comments(audio_marker_id);
        CREATE INDEX IF NOT EXISTS idx_ratings_marker ON ratings(audio_marker_id);
    """)

    cursor = await db.execute(
        "SELECT COUNT(*) FROM users WHERE id = ?", ("default-user",)
    )
    row = await cursor.fetchone()
    if row[0] == 0:
        await db.execute(
            "INSERT INTO users (id, email, name) VALUES (?, ?, ?)",
            ("default-user", "demo@yinji.com", "探索者"),
        )

    await db.commit()
