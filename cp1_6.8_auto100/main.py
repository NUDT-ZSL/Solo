from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid
import random

app = FastAPI(title="浪花记忆 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BOTTLE_STYLES = ["classic", "glaze", "conch", "shell", "raft"]

stories_db: dict = {}

PRESET_STORIES = [
    {"title": "远方的灯塔", "content": "那年夏天，我在海边的小屋里，每晚都能看到远方灯塔的光。后来我才知道，那不是灯塔，是有人在为等我而亮着灯。", "style": "classic"},
    {"title": "贝壳里的秘密", "content": "捡到一个贝壳，贴在耳边听到的不是海浪声，而是一个女孩在念一首关于月亮的诗。", "style": "shell"},
    {"title": "漂流瓶的信", "content": "我在瓶子里写了一封信，没想到三年后收到了回信，写信的人住在我隔壁的隔壁。", "style": "glaze"},
    {"title": "海螺之歌", "content": "传说海螺里住着海妖，她唱的歌能让人忘记悲伤。我把海螺还给了大海，因为我需要记住那个让我悲伤的人。", "style": "conch"},
    {"title": "木筏上的日记", "content": "在木筏上漂了七天，日记写满了水渍。最后一页写着：陆地不是终点，漂泊才是。", "style": "raft"},
    {"title": "月光海", "content": "凌晨三点的海面像一块碎银，我把自己埋进沙子里，假装自己是大地的一部分。", "style": "classic"},
    {"title": "消失的岛", "content": "渔夫们说那座岛只在满月之夜出现，上面开满了透明的花，闻到花香的人会忘记自己最重要的事。", "style": "glaze"},
    {"title": "深海的灯", "content": "深海里有一盏灯，没有人知道谁放的。但每条迷路的鱼都能找到它，然后找到回家的路。", "style": "conch"},
]


class StoryCreate(BaseModel):
    title: Optional[str] = None
    content: str
    style: str = "classic"


class StoryResponse(BaseModel):
    id: str
    title: Optional[str]
    content: str
    style: str
    created_at: str
    read_count: int
    salvage_count: int


def _story_to_response(sid: str) -> StoryResponse:
    s = stories_db[sid]
    return StoryResponse(
        id=sid,
        title=s["title"],
        content=s["content"],
        style=s["style"],
        created_at=s["created_at"],
        read_count=s["read_count"],
        salvage_count=s["salvage_count"],
    )


@app.on_event("startup")
def seed_stories():
    for preset in PRESET_STORIES:
        sid = str(uuid.uuid4())[:8]
        stories_db[sid] = {
            "title": preset["title"],
            "content": preset["content"],
            "style": preset["style"],
            "created_at": datetime.now().isoformat(),
            "read_count": random.randint(0, 50),
            "salvage_count": random.randint(0, 10),
        }


@app.get("/api/stories", response_model=list[StoryResponse])
def list_stories():
    return [_story_to_response(sid) for sid in stories_db]


@app.get("/api/stories/hot", response_model=list[StoryResponse])
def hot_stories():
    sorted_ids = sorted(stories_db.keys(), key=lambda s: stories_db[s]["read_count"], reverse=True)
    return [_story_to_response(sid) for sid in sorted_ids]


@app.get("/api/stories/random", response_model=StoryResponse)
def random_story():
    if not stories_db:
        raise HTTPException(status_code=404, detail="No stories")
    sid = random.choice(list(stories_db.keys()))
    return _story_to_response(sid)


@app.post("/api/stories", response_model=StoryResponse)
def create_story(story: StoryCreate):
    if len(story.content) > 200:
        raise HTTPException(status_code=400, detail="故事不能超过200字")
    if story.style not in BOTTLE_STYLES:
        raise HTTPException(status_code=400, detail=f"样式必须是: {BOTTLE_STYLES}")
    sid = str(uuid.uuid4())[:8]
    stories_db[sid] = {
        "title": story.title,
        "content": story.content,
        "style": story.style,
        "created_at": datetime.now().isoformat(),
        "read_count": 0,
        "salvage_count": 0,
    }
    return _story_to_response(sid)


@app.post("/api/stories/{story_id}/read", response_model=StoryResponse)
def read_story(story_id: str):
    if story_id not in stories_db:
        raise HTTPException(status_code=404, detail="故事不存在")
    stories_db[story_id]["read_count"] += 1
    return _story_to_response(story_id)


@app.post("/api/stories/{story_id}/salvage", response_model=StoryResponse)
def salvage_story(story_id: str):
    if story_id not in stories_db:
        raise HTTPException(status_code=404, detail="故事不存在")
    stories_db[story_id]["salvage_count"] += 1
    return _story_to_response(story_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
