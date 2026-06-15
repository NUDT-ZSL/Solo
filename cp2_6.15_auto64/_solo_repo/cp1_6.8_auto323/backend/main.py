from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import ScentBottleCreate, ResonanceCreate, ScentBottle, Resonance, UserProfile
from datetime import datetime
import uuid
import random

app = FastAPI(title="气味漂流瓶 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bottles_db: dict[str, dict] = {}
user_published: dict[str, list[str]] = {}
user_resonated: dict[str, list[str]] = {}

CATEGORIES = ["自然", "食物", "生活", "书卷", "花香", "木质", "雨露", "烟火"]

SEED_DATA = [
    {"description": "雨后泥土的芬芳，混着青草被碾碎的汁液味", "emoji": "🌧️", "category": "自然", "authorId": "seed-user-1"},
    {"description": "街角面包店刚出炉的可颂，黄油在空气中弥漫", "emoji": "🥐", "category": "食物", "authorId": "seed-user-2"},
    {"description": "翻开旧书页，纸浆和时间混合的干燥气息", "emoji": "📖", "category": "书卷", "authorId": "seed-user-3"},
    {"description": "清晨窗台上茉莉花微微湿润的香气", "emoji": "🌸", "category": "花香", "authorId": "seed-user-4"},
    {"description": "老木桌面上残留的松木香，指腹划过纹理", "emoji": "🪵", "category": "木质", "authorId": "seed-user-5"},
    {"description": "秋日傍晚烟囱里飘出的柴火烟味", "emoji": "🔥", "category": "烟火", "authorId": "seed-user-6"},
    {"description": "夏日暴雨前空气里电离的金属味道", "emoji": "⛈️", "category": "雨露", "authorId": "seed-user-7"},
    {"description": "奶奶衣柜里樟木和薰衣草香囊的味道", "emoji": "💜", "category": "生活", "authorId": "seed-user-8"},
]


def _make_bottle(desc: str, emoji: str, category: str, author_id: str, resonance_count: int = 0) -> dict:
    bid = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    bottle = {
        "id": bid,
        "description": desc,
        "emoji": emoji,
        "category": category,
        "authorId": author_id,
        "resonances": [],
        "resonanceCount": resonance_count,
        "createdAt": now,
    }
    bottles_db[bid] = bottle
    if author_id not in user_published:
        user_published[author_id] = []
    user_published[author_id].append(bid)
    return bottle


def _add_seed_resonances(bottle: dict, count: int) -> None:
    res_emojis = ["✨", "🌿", "💫", "🍃", "🌾", "🕯️", "🫧", "🍂"]
    res_descs = [
        "这也让我想起了……",
        "完全一样的感受！",
        "好温暖的气味记忆",
        "我也有类似的经历",
        "这个味道太治愈了",
        "立刻被拉回了某个下午",
        "闻到过几乎一样的！",
        "原来不止我一个人记得这种味道",
    ]
    for i in range(count):
        rid = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        res = {
            "id": rid,
            "bottleId": bottle["id"],
            "description": res_descs[i % len(res_descs)],
            "emoji": res_emojis[i % len(res_emojis)],
            "authorId": f"resonance-user-{i}",
            "createdAt": now,
        }
        bottle["resonances"].append(res)


@app.on_event("startup")
def seed_data() -> None:
    for i, s in enumerate(SEED_DATA):
        rc = random.randint(2, 15)
        bottle = _make_bottle(s["description"], s["emoji"], s["category"], s["authorId"], rc)
        _add_seed_resonances(bottle, rc)
    for i, s in enumerate(SEED_DATA):
        uid = f"demo-user-{i}"
        if uid not in user_resonated:
            user_resonated[uid] = []
        keys = list(bottles_db.keys())
        target_key = keys[i] if i < len(keys) else keys[0]
        if target_key not in user_resonated[uid]:
            user_resonated[uid].append(target_key)


@app.get("/api/bottles/drift", response_model=list[ScentBottle])
def get_drift_bottles(count: int = 5):
    all_bottles = list(bottles_db.values())
    sample_size = min(count, len(all_bottles))
    sampled = random.sample(all_bottles, sample_size) if all_bottles else []
    return sampled


@app.get("/api/bottles/hot", response_model=list[ScentBottle])
def get_hot_bottles(limit: int = 20):
    sorted_bottles = sorted(bottles_db.values(), key=lambda b: b["resonanceCount"], reverse=True)
    return sorted_bottles[:limit]


@app.post("/api/bottles", response_model=ScentBottle)
def create_bottle(data: ScentBottleCreate):
    author_id = f"anon-{str(uuid.uuid4())[:8]}"
    bottle = _make_bottle(data.description, data.emoji, data.category, author_id)
    return bottle


@app.get("/api/bottles/{bottle_id}", response_model=ScentBottle)
def get_bottle(bottle_id: str):
    if bottle_id not in bottles_db:
        raise HTTPException(status_code=404, detail="Bottle not found")
    return bottles_db[bottle_id]


@app.post("/api/bottles/{bottle_id}/resonate", response_model=Resonance)
def resonate_bottle(bottle_id: str, data: ResonanceCreate):
    if bottle_id not in bottles_db:
        raise HTTPException(status_code=404, detail="Bottle not found")
    bottle = bottles_db[bottle_id]
    author_id = f"anon-{str(uuid.uuid4())[:8]}"
    rid = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    res = {
        "id": rid,
        "bottleId": bottle_id,
        "description": data.description,
        "emoji": data.emoji,
        "authorId": author_id,
        "createdAt": now,
    }
    bottle["resonances"].append(res)
    bottle["resonanceCount"] = len(bottle["resonances"])
    if author_id not in user_resonated:
        user_resonated[author_id] = []
    user_resonated[author_id].append(bottle_id)
    return res


@app.post("/api/bottles/{bottle_id}/pass")
def pass_bottle(bottle_id: str):
    return {"message": "瓶子已漂走，愿它找到下一位有缘人"}


@app.get("/api/profile/{user_id}", response_model=UserProfile)
def get_profile(user_id: str):
    published = []
    for bid in user_published.get(user_id, []):
        if bid in bottles_db:
            published.append(bottles_db[bid])

    resonated = []
    for bid in user_resonated.get(user_id, []):
        if bid in bottles_db:
            resonated.append(bottles_db[bid])

    cat_count: dict[str, int] = {}
    for b in published:
        cat = b["category"]
        cat_count[cat] = cat_count.get(cat, 0) + 1
    top_cat = max(cat_count, key=cat_count.get) if cat_count else "暂无"

    return {
        "id": user_id,
        "publishedBottles": published,
        "resonatedBottles": resonated,
        "totalPublished": len(published),
        "totalResonated": len(resonated),
        "topCategory": top_cat,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
