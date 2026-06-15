from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json
import uuid
import os
from datetime import datetime

app = FastAPI(title="流光便笺 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = os.path.join(os.path.dirname(__file__), "inspirations.json")

POSITIVE_WORDS = [
    "开心", "快乐", "幸福", "美好", "希望", "爱", "梦想", "温暖", "阳光",
    "笑", "喜欢", "感谢", "感动", "精彩", "成功", "自由", "勇气", "力量",
    "加油", "棒", "好", "美", "甜", "善", "真", "乐", "趣", "喜",
]

NEGATIVE_WORDS = [
    "难过", "伤心", "失望", "孤独", "寂寞", "无奈", "疲惫", "痛苦",
    "迷茫", "焦虑", "烦躁", "崩溃", "压力", "悲伤", "绝望", "恐惧",
    "后悔", "遗憾", "沮丧", "无力", "痛", "哭", "泪", "暗", "冷",
]


def analyze_emotion(text: str) -> str:
    positive_score = sum(1 for w in POSITIVE_WORDS if w in text)
    negative_score = sum(1 for w in NEGATIVE_WORDS if w in text)
    if positive_score > negative_score:
        return "positive"
    elif negative_score > positive_score:
        return "negative"
    return "neutral"


def load_data() -> list:
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("inspirations", [])


def save_data(inspirations: list):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump({"inspirations": inspirations}, f, ensure_ascii=False, indent=2)


class CreateInspirationRequest(BaseModel):
    content: str


class ContinueInspirationRequest(BaseModel):
    id: str
    continuation: str


@app.get("/api/inspirations")
def get_inspirations():
    return load_data()


@app.post("/api/inspirations")
def create_inspiration(req: CreateInspirationRequest):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    if len(req.content) > 150:
        raise HTTPException(status_code=400, detail="Content exceeds 150 characters")

    inspirations = load_data()
    new_insp = {
        "id": str(uuid.uuid4()),
        "content": req.content.strip(),
        "emotion": analyze_emotion(req.content),
        "resonanceCount": 0,
        "createdAt": datetime.utcnow().isoformat() + "Z",
    }
    inspirations.insert(0, new_insp)
    save_data(inspirations)
    return new_insp


@app.post("/api/inspirations/{inspiration_id}/resonate")
def resonate_inspiration(inspiration_id: str):
    inspirations = load_data()
    for insp in inspirations:
        if insp["id"] == inspiration_id:
            insp["resonanceCount"] = insp.get("resonanceCount", 0) + 1
            save_data(inspirations)
            return insp
    raise HTTPException(status_code=404, detail="Inspiration not found")


@app.post("/api/inspirations/{inspiration_id}/continue")
def continue_inspiration(inspiration_id: str, req: ContinueInspirationRequest):
    if not req.continuation.strip():
        raise HTTPException(status_code=400, detail="Continuation cannot be empty")

    inspirations = load_data()
    for insp in inspirations:
        if insp["id"] == inspiration_id:
            insp["continuation"] = req.continuation.strip()
            save_data(inspirations)
            return insp
    raise HTTPException(status_code=404, detail="Inspiration not found")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
