import json
import os
import uuid
from datetime import datetime, timedelta
from pathlib import Path

BASE_DIR = Path(__file__).parent
AUDIO_DIR = BASE_DIR / "audio"
MESSAGES_FILE = BASE_DIR / "messages.json"

EMOTION_MAP = {
    "happy": "开心",
    "sad": "忧伤",
    "calm": "平静",
    "angry": "愤怒",
}

SEED_MESSAGES = [
    {
        "emotion": "happy",
        "duration": 5.2,
        "volume_data": [0.3, 0.5, 0.8, 0.6, 0.4, 0.7, 0.9, 0.5, 0.3, 0.6],
    },
    {
        "emotion": "calm",
        "duration": 8.1,
        "volume_data": [0.2, 0.3, 0.2, 0.4, 0.3, 0.2, 0.3, 0.2, 0.3, 0.2],
    },
    {
        "emotion": "sad",
        "duration": 6.5,
        "volume_data": [0.5, 0.4, 0.3, 0.5, 0.6, 0.4, 0.3, 0.2, 0.3, 0.4],
    },
    {
        "emotion": "angry",
        "duration": 4.3,
        "volume_data": [0.7, 0.9, 1.0, 0.8, 0.9, 0.7, 0.8, 0.9, 0.6, 0.7],
    },
    {
        "emotion": "happy",
        "duration": 7.0,
        "volume_data": [0.4, 0.6, 0.7, 0.5, 0.8, 0.6, 0.7, 0.5, 0.4, 0.6],
    },
    {
        "emotion": "calm",
        "duration": 9.2,
        "volume_data": [0.3, 0.2, 0.3, 0.2, 0.3, 0.4, 0.3, 0.2, 0.3, 0.2],
    },
]


def _ensure_dirs():
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    if not MESSAGES_FILE.exists():
        MESSAGES_FILE.write_text("[]", encoding="utf-8")


def _load_messages():
    _ensure_dirs()
    with open(MESSAGES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_messages(messages):
    with open(MESSAGES_FILE, "w", encoding="utf-8") as f:
        json.dump(messages, f, ensure_ascii=False, indent=2)


def _init_seed_data():
    messages = _load_messages()
    if len(messages) > 0:
        return
    now = datetime.now()
    for i, seed in enumerate(SEED_MESSAGES):
        msg_id = str(uuid.uuid4())
        offset_hours = i * 8
        created_at = (now - timedelta(hours=offset_hours)).isoformat()
        msg = {
            "id": msg_id,
            "audio_url": f"/api/audio/{msg_id}.webm",
            "duration": seed["duration"],
            "emotion": seed["emotion"],
            "emotion_label": EMOTION_MAP[seed["emotion"]],
            "created_at": created_at,
            "resonance_count": 0,
            "parent_id": None,
            "volume_data": seed["volume_data"],
        }
        messages.append(msg)
        placeholder_path = AUDIO_DIR / f"{msg_id}.webm"
        if not placeholder_path.exists():
            placeholder_path.write_bytes(b"")
    _save_messages(messages)


_ensure_dirs()
_init_seed_data()


def save_message(audio_bytes: bytes, emotion: str, duration: float, volume_data: list, parent_id: str | None = None) -> dict:
    msg_id = str(uuid.uuid4())
    audio_path = AUDIO_DIR / f"{msg_id}.webm"
    audio_path.write_bytes(audio_bytes)
    msg = {
        "id": msg_id,
        "audio_url": f"/api/audio/{msg_id}.webm",
        "duration": duration,
        "emotion": emotion,
        "emotion_label": EMOTION_MAP.get(emotion, emotion),
        "created_at": datetime.now().isoformat(),
        "resonance_count": 0,
        "parent_id": parent_id,
        "volume_data": volume_data,
    }
    messages = _load_messages()
    messages.append(msg)
    _save_messages(messages)
    return msg


def get_all_messages() -> list:
    return _load_messages()


def get_audio_path(msg_id: str) -> Path | None:
    audio_path = AUDIO_DIR / f"{msg_id}.webm"
    if audio_path.exists():
        return audio_path
    return None


def get_stats() -> dict:
    messages = _load_messages()
    emotion_counts = {"happy": 0, "sad": 0, "calm": 0, "angry": 0}
    daily_counts = {}
    today = datetime.now().date()
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        daily_counts[d.isoformat()] = 0
    for msg in messages:
        e = msg.get("emotion", "")
        if e in emotion_counts:
            emotion_counts[e] += 1
        created = msg.get("created_at", "")
        try:
            msg_date = datetime.fromisoformat(created).date().isoformat()
            if msg_date in daily_counts:
                daily_counts[msg_date] += 1
        except (ValueError, TypeError):
            pass
    return {
        **emotion_counts,
        "daily_counts": [{"date": k, "count": v} for k, v in daily_counts.items()],
    }


def delete_message(msg_id: str) -> bool:
    messages = _load_messages()
    new_messages = [m for m in messages if m["id"] != msg_id]
    if len(new_messages) == len(messages):
        return False
    _save_messages(new_messages)
    audio_path = AUDIO_DIR / f"{msg_id}.webm"
    if audio_path.exists():
        audio_path.unlink()
    return True
