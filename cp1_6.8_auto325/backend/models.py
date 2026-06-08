from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

SCENT_TYPES = ["花香", "果香", "草木", "美食", "雨后", "烟熏", "木质", "书卷", "泥土", "海洋", "其他"]

EMOJI_OPTIONS = ["🌸", "🌿", "🍋", "🍞", "🌧️", "💨", "🪵", "📖", "🌍", "🌊", "🕯️", "☕", "🧴", "🍃", "🌺", "🍎", "🍯", "🍂", "🔥", "💨"]


class BottleCreate(BaseModel):
    emoji: str
    description: str
    scent_type: str
    author_id: str


class ResonationCreate(BaseModel):
    emoji: str
    description: str
    author_id: str


class DriftRequest(BaseModel):
    author_id: str


class Resonation(BaseModel):
    id: str
    emoji: str
    description: str
    author_id: str
    created_at: str


class ScentBottle(BaseModel):
    id: str
    emoji: str
    description: str
    scent_type: str
    author_id: str
    resonate_count: int
    resonations: list[Resonation]
    created_at: str
    is_hot: bool = False


class UserStats(BaseModel):
    total_published: int
    total_resonated: int
    scent_type_distribution: dict[str, int]


def new_id() -> str:
    return str(uuid.uuid4())[:8]


def now_iso() -> str:
    return datetime.now().isoformat()
