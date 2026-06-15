from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import (
    BottleCreate, ResonationCreate, DriftRequest,
    ScentBottle, Resonation, UserStats,
    SCENT_TYPES, new_id, now_iso,
)
import random

app = FastAPI(title="气味漂流瓶 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bottles: dict[str, dict] = {}
resonated_by: dict[str, set[str]] = {}
skipped_by: dict[str, set[str]] = {}


def _bottle_to_model(b: dict) -> ScentBottle:
    resos = [Resonation(**r) for r in b.get("resonations", [])]
    return ScentBottle(
        id=b["id"],
        emoji=b["emoji"],
        description=b["description"],
        scent_type=b["scent_type"],
        author_id=b["author_id"],
        resonate_count=b["resonate_count"],
        resonations=resos,
        created_at=b["created_at"],
    )


def _hot_bottles_sorted() -> list[dict]:
    sorted_bottles = sorted(bottles.values(), key=lambda x: x["resonate_count"], reverse=True)
    return sorted_bottles[:10]


def _seed_data():
    seeds = [
        {"emoji": "🌧️", "description": "雨后泥土的清香，像是大地在呼吸", "scent_type": "雨后", "author_id": "seed"},
        {"emoji": "🍞", "description": "清晨面包房飘出的烤面包香，温暖又安心", "scent_type": "美食", "author_id": "seed"},
        {"emoji": "📖", "description": "翻开发黄的老书页，那种墨香和纸香交织的味道", "scent_type": "书卷", "author_id": "seed"},
        {"emoji": "🌸", "description": "春天路边的樱花，空气里淡淡的甜味", "scent_type": "花香", "author_id": "seed"},
        {"emoji": "☕", "description": "手冲咖啡冒出的第一缕香气，带着微微的焦糖味", "scent_type": "美食", "author_id": "seed"},
        {"emoji": "🌊", "description": "海边咸湿的风，夹杂着海藻的腥甜", "scent_type": "海洋", "author_id": "seed"},
        {"emoji": "🪵", "description": "老木屋里松木的清冽，像是走进了一座森林", "scent_type": "木质", "author_id": "seed"},
        {"emoji": "🍋", "description": "切开柠檬的那一瞬，酸爽的柑橘香弥漫开来", "scent_type": "果香", "author_id": "seed"},
        {"emoji": "🌿", "description": "雨后草地上的青草味，清新得像洗了个澡", "scent_type": "草木", "author_id": "seed"},
        {"emoji": "🕯️", "description": "熄灭蜡烛后那缕白烟的味道，温柔又怀旧", "scent_type": "烟熏", "author_id": "seed"},
        {"emoji": "🍂", "description": "踩在秋天落叶上，干燥的草木气息扑面而来", "scent_type": "草木", "author_id": "seed"},
        {"emoji": "🌺", "description": "夏夜茉莉花的幽香，在阳台上悄悄绽放", "scent_type": "花香", "author_id": "seed"},
        {"emoji": "🍯", "description": "打开蜂蜜罐的瞬间，甜蜜的花蜜香涌出", "scent_type": "美食", "author_id": "seed"},
        {"emoji": "🌍", "description": "暴雨前的泥土味，闷热中透着大地的气息", "scent_type": "泥土", "author_id": "seed"},
        {"emoji": "🍃", "description": "薄荷叶子揉碎后的清凉香气，让人清醒", "scent_type": "草木", "author_id": "seed"},
        {"emoji": "🍎", "description": "秋天果园里苹果的甜香，阳光晒过的味道", "scent_type": "果香", "author_id": "seed"},
        {"emoji": "🔥", "description": "壁炉里柴火噼啪作响，烟熏味弥漫整个房间", "scent_type": "烟熏", "author_id": "seed"},
        {"emoji": "🧴", "description": "洗衣液和阳光晒过的被子，干净又温暖", "scent_type": "其他", "author_id": "seed"},
    ]
    for s in seeds:
        bid = new_id()
        bottles[bid] = {
            "id": bid,
            "emoji": s["emoji"],
            "description": s["description"],
            "scent_type": s["scent_type"],
            "author_id": s["author_id"],
            "resonate_count": random.randint(0, 25),
            "resonations": [],
            "created_at": now_iso(),
        }


_seed_data()


@app.get("/api/bottles/random")
def get_random_bottles(user_id: str = "", count: int = 5):
    available = []
    for bid, b in bottles.items():
        if b["author_id"] == user_id:
            continue
        if user_id and bid in resonated_by.get(user_id, set()):
            continue
        if user_id and bid in skipped_by.get(user_id, set()):
            continue
        available.append(b)
    random.shuffle(available)
    result = available[:count]
    return [_bottle_to_model(b) for b in result]


@app.get("/api/bottles/hot")
def get_hot_bottles():
    hot = _hot_bottles_sorted()
    result = []
    for idx, b in enumerate(hot):
        model = _bottle_to_model(b)
        model.is_hot = True
        result.append(model)
    return result


@app.post("/api/bottles", response_model=ScentBottle)
def create_bottle(data: BottleCreate):
    if data.scent_type not in SCENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid scent_type, must be one of {SCENT_TYPES}")
    bid = new_id()
    b = {
        "id": bid,
        "emoji": data.emoji,
        "description": data.description,
        "scent_type": data.scent_type,
        "author_id": data.author_id,
        "resonate_count": 0,
        "resonations": [],
        "created_at": now_iso(),
    }
    bottles[bid] = b
    return _bottle_to_model(b)


@app.post("/api/bottles/{bottle_id}/resonate", response_model=ScentBottle)
def resonate_bottle(bottle_id: str, data: ResonationCreate):
    if bottle_id not in bottles:
        raise HTTPException(status_code=404, detail="Bottle not found")
    if data.author_id in resonated_by.get(bottle_id, set()):
        raise HTTPException(status_code=400, detail="Already resonated with this bottle")
    rid = new_id()
    reso = {
        "id": rid,
        "emoji": data.emoji,
        "description": data.description,
        "author_id": data.author_id,
        "created_at": now_iso(),
    }
    bottles[bottle_id]["resonations"].append(reso)
    bottles[bottle_id]["resonate_count"] += 1
    if bottle_id not in resonated_by:
        resonated_by[bottle_id] = set()
    resonated_by[bottle_id].add(data.author_id)
    return _bottle_to_model(bottles[bottle_id])


@app.post("/api/bottles/{bottle_id}/drift")
def drift_bottle(bottle_id: str, data: DriftRequest):
    if bottle_id not in bottles:
        raise HTTPException(status_code=404, detail="Bottle not found")
    if data.author_id not in skipped_by:
        skipped_by[data.author_id] = set()
    skipped_by[data.author_id].add(bottle_id)
    return {"message": "ok"}


@app.get("/api/users/{user_id}/bottles")
def get_user_bottles(user_id: str):
    user_bottles = [b for b in bottles.values() if b["author_id"] == user_id]
    user_bottles.sort(key=lambda x: x["created_at"], reverse=True)
    return [_bottle_to_model(b) for b in user_bottles]


@app.get("/api/users/{user_id}/resonated")
def get_user_resonated(user_id: str):
    reso_bottle_ids = set()
    for bid, user_set in resonated_by.items():
        if user_id in user_set:
            reso_bottle_ids.add(bid)
    result = []
    for bid in reso_bottle_ids:
        if bid in bottles:
            result.append(_bottle_to_model(bottles[bid]))
    result.sort(key=lambda x: x.created_at, reverse=True)
    return result


@app.get("/api/users/{user_id}/stats", response_model=UserStats)
def get_user_stats(user_id: str):
    user_bottles = [b for b in bottles.values() if b["author_id"] == user_id]
    total_published = len(user_bottles)
    total_resonated = 0
    for bid, user_set in resonated_by.items():
        if user_id in user_set:
            total_resonated += 1
    scent_dist: dict[str, int] = {}
    for b in user_bottles:
        st = b["scent_type"]
        scent_dist[st] = scent_dist.get(st, 0) + 1
    for bid, user_set in resonated_by.items():
        if user_id in user_set and bid in bottles:
            st = bottles[bid]["scent_type"]
            scent_dist[st] = scent_dist.get(st, 0) + 1
    return UserStats(
        total_published=total_published,
        total_resonated=total_resonated,
        scent_type_distribution=scent_dist,
    )


@app.get("/api/scent-types")
def get_scent_types():
    return SCENT_TYPES
