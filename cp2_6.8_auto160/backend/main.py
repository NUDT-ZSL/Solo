import json
import uuid
from datetime import datetime
from typing import List
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "messages.json"

main = FastAPI(title="情绪气泡墙 API")

main.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=500)
    author: str = Field(default="匿名", max_length=50)


class Message(BaseModel):
    id: str
    content: str
    author: str
    emotion: str
    timestamp: str


def _analyze_emotion(content: str) -> str:
    text = content.lower()
    happy_keywords = [
        "开心", "高兴", "快乐", "愉快", "幸福", "喜欢", "爱好", "很棒",
        "美好", "很好", "真好", "不错",
        "nice", "happy", "love", "great", "joy", "smile", "哈哈",
        "嘻嘻", "😊", "😄", "🥰", "😍", "❤️", "✨", "🎉",
    ]
    sad_keywords = [
        "难过", "伤心", "悲伤", "哭泣", "痛苦", "失落", "沮丧", "忧郁",
        "sad", "cry", "hurt", "pain", "lonely", "depressed", "😭", "😢",
        "💔", "😔",
    ]
    angry_keywords = [
        "生气", "愤怒", "讨厌", "烦躁", "恼火", "暴躁", "气愤", "气死",
        "好烦", "很烦", "太烦",
        "angry", "hate", "mad", "furious", "rage", "😡", "🤬", "💢", "🔥",
    ]

    scores = {"happy": 0, "sad": 0, "angry": 0}
    for kw in happy_keywords:
        if kw in text:
            scores["happy"] += len(kw)
    for kw in sad_keywords:
        if kw in text:
            scores["sad"] += len(kw)
    for kw in angry_keywords:
        if kw in text:
            scores["angry"] += len(kw)

    max_emotion = max(scores, key=scores.get)
    if scores[max_emotion] > 0:
        return max_emotion
    return "neutral"


def _load_messages() -> List[dict]:
    if not DATA_FILE.exists():
        return []
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return []


def _save_messages(messages: List[dict]) -> None:
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(messages, f, ensure_ascii=False, indent=2)


@main.get("/api/messages", response_model=List[Message])
def get_messages():
    return _load_messages()


@main.post("/api/messages", response_model=Message)
def create_message(msg_in: MessageCreate):
    messages = _load_messages()
    emotion = _analyze_emotion(msg_in.content)
    msg = Message(
        id=str(uuid.uuid4()),
        content=msg_in.content,
        author=msg_in.author or "匿名",
        emotion=emotion,
        timestamp=datetime.now().isoformat(),
    )
    messages.append(msg.dict())
    _save_messages(messages)
    return msg
