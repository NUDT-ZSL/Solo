from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from sentiment import analyze_sentiment

app = FastAPI(title="灵感星图 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

inspirations: list[dict] = []
resonances: dict[str, list[str]] = {}


class InspirationInput(BaseModel):
    content: str
    emoji: str = "✨"
    user_id: str = "anonymous"


class ResonanceInput(BaseModel):
    inspiration_id: str
    user_id: str = "anonymous"


@app.get("/api/inspirations")
def get_inspirations():
    return inspirations


@app.post("/api/inspirations")
def create_inspiration(data: InspirationInput):
    if len(data.content) > 200:
        raise HTTPException(status_code=400, detail="灵感内容不能超过200字")

    sentiment = analyze_sentiment(data.content)

    inspiration = {
        "id": f"star_{len(inspirations)}_{datetime.now().timestamp()}",
        "content": data.content,
        "emoji": data.emoji,
        "sentiment": sentiment,
        "user_id": data.user_id,
        "created_at": datetime.now().isoformat(),
        "resonance_count": 0,
        "resonated_by": [],
    }

    inspirations.append(inspiration)
    return inspiration


@app.post("/api/resonance")
def add_resonance(data: ResonanceInput):
    for ins in inspirations:
        if ins["id"] == data.inspiration_id:
            if data.user_id in ins["resonated_by"]:
                return ins
            ins["resonated_by"].append(data.user_id)
            ins["resonance_count"] = len(ins["resonated_by"])
            ins["has_resonance"] = True
            return ins

    raise HTTPException(status_code=404, detail="灵感不存在")


@app.delete("/api/inspirations/{inspiration_id}")
def delete_inspiration(inspiration_id: str, user_id: str = "anonymous"):
    for i, ins in enumerate(inspirations):
        if ins["id"] == inspiration_id and ins["user_id"] == user_id:
            inspirations.pop(i)
            return {"status": "ok"}

    raise HTTPException(status_code=404, detail="灵感不存在或无权删除")


@app.put("/api/inspirations/{inspiration_id}")
def update_inspiration(inspiration_id: str, data: InspirationInput):
    for ins in inspirations:
        if ins["id"] == inspiration_id and ins["user_id"] == data.user_id:
            if len(data.content) > 200:
                raise HTTPException(status_code=400, detail="灵感内容不能超过200字")
            sentiment = analyze_sentiment(data.content)
            ins["content"] = data.content
            ins["emoji"] = data.emoji
            ins["sentiment"] = sentiment
            return ins

    raise HTTPException(status_code=404, detail="灵感不存在或无权编辑")
