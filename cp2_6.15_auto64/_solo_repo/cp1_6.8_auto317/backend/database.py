import aiosqlite
import os
from contextlib import asynccontextmanager

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scent_drift.db")

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    nickname TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS bottles (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    emoji TEXT NOT NULL,
    category TEXT NOT NULL,
    creator_id TEXT NOT NULL REFERENCES users(id),
    resonance_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS resonances (
    id TEXT PRIMARY KEY,
    bottle_id TEXT NOT NULL REFERENCES bottles(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    description TEXT NOT NULL,
    emoji TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS passed_bottles (
    id TEXT PRIMARY KEY,
    bottle_id TEXT NOT NULL REFERENCES bottles(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bottles_creator ON bottles(creator_id);
CREATE INDEX IF NOT EXISTS idx_bottles_resonance ON bottles(resonance_count DESC);
CREATE INDEX IF NOT EXISTS idx_resonances_bottle ON resonances(bottle_id);
CREATE INDEX IF NOT EXISTS idx_resonances_user ON resonances(user_id);
CREATE INDEX IF NOT EXISTS idx_passed_bottle_user ON passed_bottles(bottle_id, user_id);
"""

SEED_BOTTLES = [
    ("bottle-1", "清晨松林间的雾气，带着泥土和树脂的芬芳", "🌲", "自然", "default-user", 3),
    ("bottle-2", "刚出炉的可颂面包，黄油与面粉交融的温暖", "🥐", "食物", "default-user", 5),
    ("bottle-3", "旧书页翻动时的墨香，岁月沉淀的宁静", "📖", "书香", "default-user", 2),
    ("bottle-4", "雨后城市的柏油路面，水汽蒸腾的清新", "🌧️", "生活", "default-user", 7),
    ("bottle-5", "春日花园里茉莉花开，淡雅而持久的花香", "🌸", "花草", "default-user", 4),
    ("bottle-6", "秋日午后晒过的棉被，阳光和干燥植物的气息", "🍂", "季节", "default-user", 1),
    ("bottle-7", "深夜便利店的咖啡香，城市孤独的慰藉", "☕", "城市", "default-user", 6),
    ("bottle-8", "童年外婆家的柴火灶，烟熏味里的温暖记忆", "🔥", "记忆", "default-user", 8),
]


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(SCHEMA_SQL)

        cursor = await db.execute("SELECT COUNT(*) FROM users WHERE id = ?", ("default-user",))
        row = await cursor.fetchone()
        if row[0] == 0:
            await db.execute(
                "INSERT INTO users (id, nickname) VALUES (?, ?)",
                ("default-user", "漂流者"),
            )

        cursor = await db.execute("SELECT COUNT(*) FROM bottles WHERE creator_id = ?", ("default-user",))
        row = await cursor.fetchone()
        if row[0] == 0:
            for b in SEED_BOTTLES:
                await db.execute(
                    "INSERT INTO bottles (id, description, emoji, category, creator_id, resonance_count) VALUES (?, ?, ?, ?, ?, ?)",
                    b,
                )

        await db.commit()


@asynccontextmanager
async def get_db():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()
