import uuid
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from emotion_engine import generate_poem

app = FastAPI(title="情绪回声 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

emotions_db: list[dict] = []


class CreateEmotionRequest(BaseModel):
    category: str
    emoji: str
    color: str
    intensity: int


@app.post("/api/emotions")
def create_emotion(req: CreateEmotionRequest):
    poem = generate_poem(req.category, req.intensity)
    record = {
        "id": str(uuid.uuid4()),
        "category": req.category,
        "emoji": req.emoji,
        "color": req.color,
        "intensity": req.intensity,
        "poem": poem,
        "createdAt": datetime.now().isoformat(),
    }
    emotions_db.append(record)
    return record


@app.get("/api/emotions")
def get_emotions(category: Optional[str] = Query(None)):
    results = emotions_db
    if category:
        results = [r for r in results if r["category"] == category]
    return sorted(results, key=lambda x: x["createdAt"], reverse=True)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
