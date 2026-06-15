import os
import aiosqlite

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
DB_PATH = os.path.join(DB_DIR, "meditations.db")

SEED_DATA = [
    ("seed-001", 300, 3, "calm", "2026-06-02 08:15:00", "你的宁静如湖水般澄澈"),
    ("seed-002", 600, 4, "joy", "2026-06-03 09:30:00", "你的喜悦如阳光般温暖"),
    ("seed-003", 180, 2, "anxiety", "2026-06-04 20:45:00", "焦虑是来访的云而你永远是那片天空"),
    ("seed-004", 480, 5, "calm", "2026-06-05 07:00:00", "每一次呼吸都是与内心的温柔对话"),
    ("seed-005", 360, 4, "joy", "2026-06-06 18:20:00", "快乐是一种力量"),
]


async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    return db


async def init_db():
    os.makedirs(DB_DIR, exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS meditations (
                id TEXT PRIMARY KEY,
                duration INTEGER NOT NULL,
                depth INTEGER NOT NULL CHECK(depth BETWEEN 1 AND 5),
                emotion TEXT NOT NULL CHECK(emotion IN ('calm', 'joy', 'anxiety')),
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                encouragement TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_meditations_created_at ON meditations(created_at);
            CREATE INDEX IF NOT EXISTS idx_meditations_emotion ON meditations(emotion);
        """)
        cursor = await db.execute("SELECT COUNT(*) FROM meditations")
        count = (await cursor.fetchone())[0]
        if count == 0:
            await db.executemany(
                "INSERT INTO meditations (id, duration, depth, emotion, created_at, encouragement) VALUES (?, ?, ?, ?, ?, ?)",
                SEED_DATA,
            )
            await db.commit()
