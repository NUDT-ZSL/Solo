import os
import uuid
import hashlib
import json
import random
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, Header
from fastapi.responses import FileResponse
from pydantic import BaseModel

from server.audio_processor import extract_audio_features, generate_illustration_params

router = APIRouter(prefix="/api")

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

USERS: dict[str, dict] = {}
TOKENS: dict[str, str] = {}
SOUNDSCAPES: dict[str, dict] = {}
COMMENTS: dict[str, list[dict]] = {}
LIKES: set[tuple[str, str]] = set()

VALID_MOODS = ["宁静", "欢快", "忧郁", "激昂", "梦幻", "温暖"]


class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class CommentRequest(BaseModel):
    content: str


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def _generate_token() -> str:
    return uuid.uuid4().hex + uuid.uuid4().hex


def _get_user_id(authorization: Optional[str] = None) -> Optional[str]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization[7:]
    return TOKENS.get(token)


def _require_auth(authorization: Optional[str] = Header(None)) -> str:
    user_id = _get_user_id(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="未登录")
    return user_id


@router.post("/auth/register")
async def register(req: RegisterRequest):
    if not req.email or "@" not in req.email:
        raise HTTPException(status_code=400, detail="邮箱格式不正确")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="密码至少6位")
    if req.email in USERS:
        raise HTTPException(status_code=400, detail="邮箱已注册")
    user_id = uuid.uuid4().hex
    USERS[req.email] = {
        "id": user_id,
        "email": req.email,
        "password_hash": _hash_password(req.password),
    }
    token = _generate_token()
    TOKENS[token] = user_id
    return {"token": token, "user": {"id": user_id, "email": req.email}}


@router.post("/auth/login")
async def login(req: LoginRequest):
    user = USERS.get(req.email)
    if not user or user["password_hash"] != _hash_password(req.password):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")
    token = _generate_token()
    TOKENS[token] = user["id"]
    return {"token": token, "user": {"id": user["id"], "email": user["email"]}}


@router.get("/auth/me")
async def get_me(user_id: str = Depends(_require_auth)):
    for email, user in USERS.items():
        if user["id"] == user_id:
            return {"id": user_id, "email": user["email"]}
    raise HTTPException(status_code=401, detail="用户不存在")


@router.post("/soundscapes")
async def create_soundscape(
    title: str = Form(...),
    mood: str = Form(...),
    audio: UploadFile = File(...),
    user_id: str = Depends(_require_auth),
):
    if mood not in VALID_MOODS:
        raise HTTPException(status_code=400, detail=f"无效的心情标签，可选: {VALID_MOODS}")
    if not title.strip():
        raise HTTPException(status_code=400, detail="标题不能为空")

    audio_data = await audio.read()
    if len(audio_data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="音频文件过大（最大10MB）")

    ext = os.path.splitext(audio.filename or "audio.wav")[1] or ".wav"
    file_id = uuid.uuid4().hex
    filename = f"{file_id}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(audio_data)

    audio_url = f"/uploads/{filename}"

    features = extract_audio_features(audio_data)
    illustration = generate_illustration_params(features, mood)

    soundscape_id = uuid.uuid4().hex
    soundscape = {
        "id": soundscape_id,
        "title": title.strip(),
        "mood": mood,
        "audio_url": audio_url,
        "illustration": illustration,
        "likes": 0,
        "user_id": user_id,
        "created_at": datetime.now().isoformat(),
    }
    SOUNDSCAPES[soundscape_id] = soundscape
    COMMENTS[soundscape_id] = []

    return soundscape


@router.get("/soundscapes")
async def list_soundscapes(
    mood: Optional[str] = None,
    sort: Optional[str] = "newest",
    limit: int = 50,
    offset: int = 0,
):
    items = list(SOUNDSCAPES.values())
    if mood and mood in VALID_MOODS:
        items = [s for s in items if s["mood"] == mood]
    if sort == "oldest":
        items.sort(key=lambda s: s["created_at"])
    elif sort == "popular":
        items.sort(key=lambda s: s["likes"], reverse=True)
    else:
        items.sort(key=lambda s: s["created_at"], reverse=True)
    total = len(items)
    items = items[offset : offset + limit]
    return {"items": items, "total": total}


@router.get("/soundscapes/random")
async def random_soundscapes(count: int = 6):
    items = list(SOUNDSCAPES.values())
    if len(items) <= count:
        random.shuffle(items)
        return {"items": items}
    selected = random.sample(items, count)
    return {"items": selected}


@router.get("/soundscapes/{soundscape_id}")
async def get_soundscape(soundscape_id: str):
    soundscape = SOUNDSCAPES.get(soundscape_id)
    if not soundscape:
        raise HTTPException(status_code=404, detail="声音风景不存在")
    comments = COMMENTS.get(soundscape_id, [])
    return {**soundscape, "comments": comments}


@router.post("/soundscapes/{soundscape_id}/like")
async def like_soundscape(soundscape_id: str, user_id: str = Depends(_require_auth)):
    soundscape = SOUNDSCAPES.get(soundscape_id)
    if not soundscape:
        raise HTTPException(status_code=404, detail="声音风景不存在")
    key = (user_id, soundscape_id)
    if key in LIKES:
        LIKES.discard(key)
        soundscape["likes"] = max(0, soundscape["likes"] - 1)
        return {"liked": False, "likes": soundscape["likes"]}
    else:
        LIKES.add(key)
        soundscape["likes"] += 1
        return {"liked": True, "likes": soundscape["likes"]}


@router.get("/soundscapes/{soundscape_id}/like-status")
async def like_status(soundscape_id: str, authorization: Optional[str] = Header(None)):
    user_id = _get_user_id(authorization)
    if not user_id:
        return {"liked": False}
    key = (user_id, soundscape_id)
    return {"liked": key in LIKES}


@router.post("/soundscapes/{soundscape_id}/comments")
async def add_comment(
    soundscape_id: str, req: CommentRequest, user_id: str = Depends(_require_auth)
):
    soundscape = SOUNDSCAPES.get(soundscape_id)
    if not soundscape:
        raise HTTPException(status_code=404, detail="声音风景不存在")
    content = req.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="评论不能为空")
    if len(content) > 50:
        raise HTTPException(status_code=400, detail="评论不能超过50字")
    comment = {
        "id": uuid.uuid4().hex,
        "content": content,
        "created_at": datetime.now().isoformat(),
    }
    COMMENTS[soundscape_id].append(comment)
    return comment


@router.get("/soundscapes/{soundscape_id}/comments")
async def list_comments(soundscape_id: str):
    if soundscape_id not in SOUNDSCAPES:
        raise HTTPException(status_code=404, detail="声音风景不存在")
    return COMMENTS.get(soundscape_id, [])
