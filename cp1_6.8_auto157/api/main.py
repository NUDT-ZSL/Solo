import sqlite3
import json
import uuid
from datetime import datetime
from contextlib import contextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import (
    DiaryCreate,
    DiaryUpdate,
    DiaryEntry,
    SentimentResponse,
    TimelinePoint,
    AnalyzeRequest,
)

app = FastAPI(title="记忆余晖 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "diaries.db"

POSITIVE_WORDS_ZH = [
    "开心", "快乐", "幸福", "美好", "温暖", "感动", "喜欢", "爱", "感恩", "满足",
    "欣喜", "期待", "兴奋", "安心", "愉快", "舒畅", "欣慰", "甜蜜", "浪漫", "阳光",
]
NEGATIVE_WORDS_ZH = [
    "难过", "悲伤", "焦虑", "压力", "烦躁", "失望", "孤独", "疲惫", "痛苦", "迷茫",
    "沮丧", "无聊", "恐惧", "愤怒", "郁闷", "伤心", "无奈", "崩溃", "绝望", "忧虑",
]
POSITIVE_WORDS_EN = [
    "happy", "love", "joy", "grateful", "wonderful", "beautiful", "excited",
    "hope", "peaceful", "amazing", "great", "good", "nice", "awesome", "blessed",
]
NEGATIVE_WORDS_EN = [
    "sad", "angry", "anxious", "depressed", "lonely", "tired", "stressed",
    "frustrated", "disappointed", "hopeless", "awful", "terrible", "bad", "hurt", "pain",
]


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS diaries (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                date TEXT NOT NULL,
                sentiment TEXT NOT NULL DEFAULT 'neutral',
                sentiment_score REAL NOT NULL DEFAULT 0.0,
                keywords TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_diaries_date ON diaries(date)
        """)
        conn.commit()


init_db()


def analyze_text(content: str) -> SentimentResponse:
    lower = content.lower()
    score = 0.0
    found_keywords = []

    for w in POSITIVE_WORDS_ZH + POSITIVE_WORDS_EN:
        if w in lower:
            score += 0.25
            found_keywords.append(w)

    for w in NEGATIVE_WORDS_ZH + NEGATIVE_WORDS_EN:
        if w in lower:
            score -= 0.25
            found_keywords.append(w)

    try:
        from textblob import TextBlob
        blob = TextBlob(content)
        polarity = blob.sentiment.polarity
        score += polarity * 0.5
    except Exception:
        pass

    score = max(-1.0, min(1.0, score))

    if score > 0.1:
        sentiment = "positive"
    elif score < -0.1:
        sentiment = "negative"
    else:
        sentiment = "neutral"

    if not found_keywords:
        found_keywords = ["日常"]

    return SentimentResponse(
        sentiment=sentiment,
        sentiment_score=round(score, 2),
        keywords=found_keywords[:8],
    )


@app.get("/api/diaries", response_model=list[DiaryEntry])
def get_diaries():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM diaries ORDER BY date DESC"
        ).fetchall()
        return [_row_to_entry(r) for r in rows]


@app.get("/api/diaries/{diary_id}", response_model=DiaryEntry)
def get_diary(diary_id: str):
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM diaries WHERE id = ?", (diary_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="日记不存在")
        return _row_to_entry(row)


@app.post("/api/diaries", response_model=DiaryEntry)
def create_diary(data: DiaryCreate):
    analysis = analyze_text(data.content)
    now = datetime.now().isoformat()
    entry_id = uuid.uuid4().hex[:12]

    with get_db() as conn:
        conn.execute(
            """INSERT INTO diaries (id, content, date, sentiment, sentiment_score, keywords, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                entry_id,
                data.content,
                data.date,
                analysis.sentiment,
                analysis.sentiment_score,
                json.dumps(analysis.keywords, ensure_ascii=False),
                now,
                now,
            ),
        )
        conn.commit()

    return DiaryEntry(
        id=entry_id,
        content=data.content,
        date=data.date,
        sentiment=analysis.sentiment,
        sentiment_score=analysis.sentiment_score,
        keywords=analysis.keywords,
        created_at=now,
        updated_at=now,
    )


@app.put("/api/diaries/{diary_id}", response_model=DiaryEntry)
def update_diary(diary_id: str, data: DiaryUpdate):
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM diaries WHERE id = ?", (diary_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="日记不存在")

    analysis = analyze_text(data.content)
    now = datetime.now().isoformat()

    with get_db() as conn:
        conn.execute(
            """UPDATE diaries SET content=?, sentiment=?, sentiment_score=?,
               keywords=?, updated_at=? WHERE id=?""",
            (
                data.content,
                analysis.sentiment,
                analysis.sentiment_score,
                json.dumps(analysis.keywords, ensure_ascii=False),
                now,
                diary_id,
            ),
        )
        conn.commit()

    return DiaryEntry(
        id=diary_id,
        content=data.content,
        date=row["date"],
        sentiment=analysis.sentiment,
        sentiment_score=analysis.sentiment_score,
        keywords=analysis.keywords,
        created_at=row["created_at"],
        updated_at=now,
    )


@app.delete("/api/diaries/{diary_id}")
def delete_diary(diary_id: str):
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM diaries WHERE id = ?", (diary_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="日记不存在")
        conn.execute("DELETE FROM diaries WHERE id = ?", (diary_id,))
        conn.commit()
    return {"message": "已删除"}


@app.post("/api/analyze", response_model=SentimentResponse)
def analyze(data: AnalyzeRequest):
    return analyze_text(data.content)


@app.get("/api/timeline", response_model=list[TimelinePoint])
def get_timeline():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM diaries ORDER BY date ASC"
        ).fetchall()
        result = []
        for r in rows:
            content = r["content"]
            summary = content[:60] + "..." if len(content) > 60 else content
            result.append(
                TimelinePoint(
                    date=r["date"],
                    sentiment=r["sentiment"],
                    sentiment_score=r["sentiment_score"],
                    summary=summary,
                    keywords=json.loads(r["keywords"]),
                )
            )
        return result


def _row_to_entry(row) -> DiaryEntry:
    return DiaryEntry(
        id=row["id"],
        content=row["content"],
        date=row["date"],
        sentiment=row["sentiment"],
        sentiment_score=row["sentiment_score"],
        keywords=json.loads(row["keywords"]),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
