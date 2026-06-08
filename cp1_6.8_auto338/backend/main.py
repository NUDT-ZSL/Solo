import uuid
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import quote

from fastapi import FastAPI, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from poem_matcher import generate_poem

app = FastAPI(title="言灵诗歌")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

poems_list: list[dict[str, Any]] = []
lines_list: list[dict[str, Any]] = []
users_dict: dict[str, dict[str, Any]] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _make_anonymous_id() -> str:
    return f"灵_{uuid.uuid4().hex[:4]}"


def _make_line_id() -> str:
    return f"line_{uuid.uuid4().hex[:8]}"


def _make_poem_id() -> str:
    return f"poem_{uuid.uuid4().hex[:8]}"


class SubmitRequest(BaseModel):
    content: str


@app.post("/api/poems/submit")
def submit_poem(body: SubmitRequest, response: Response) -> dict[str, Any]:
    anonymous_id = _make_anonymous_id()
    line_id = _make_line_id()

    line_data: dict[str, Any] = {
        "id": line_id,
        "content": body.content,
        "anonymous_id": anonymous_id,
        "created_at": _now_iso(),
        "stitch_count": 0,
    }

    lines_list.append(line_data)

    if anonymous_id not in users_dict:
        users_dict[anonymous_id] = {"anonymous_id": anonymous_id, "lines": []}
    users_dict[anonymous_id]["lines"].append(line_id)

    poem = generate_poem(line_data, lines_list)

    if poem and len(poem["lines"]) > 1:
        for matched_line in poem["lines"][1:]:
            for stored_line in lines_list:
                if stored_line["id"] == matched_line["id"]:
                    stored_line["stitch_count"] = stored_line.get("stitch_count", 0) + 1
                    break
        poems_list.append(poem)
    else:
        poem_id = _make_poem_id()
        poem = {
            "id": poem_id,
            "lines": [line_data],
            "created_at": _now_iso(),
            "stitch_count": 0,
        }
        poems_list.append(poem)

    response.set_cookie(key="anonymous_id", value=quote(anonymous_id))
    return {"anonymous_id": anonymous_id, "line_id": line_id, "poem": poem}


@app.get("/api/poems/recent")
def get_recent_poems(limit: int = Query(default=20, ge=1, le=100)) -> list[dict[str, Any]]:
    return poems_list[-limit:][::-1]


@app.get("/api/users/{anonymous_id}")
def get_user_profile(anonymous_id: str) -> dict[str, Any]:
    if anonymous_id not in users_dict:
        return {"anonymous_id": anonymous_id, "lines": [], "total_lines": 0, "total_stitched": 0}

    user = users_dict[anonymous_id]
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    recent_lines = []
    total_stitched = 0
    for line_id in user["lines"]:
        for line in lines_list:
            if line["id"] == line_id:
                created = datetime.fromisoformat(line["created_at"])
                if created.tzinfo is None:
                    created = created.replace(tzinfo=timezone.utc)
                if created >= thirty_days_ago:
                    recent_lines.append(line)
                total_stitched += line.get("stitch_count", 0)
                break

    return {
        "anonymous_id": anonymous_id,
        "lines": recent_lines,
        "total_lines": len(user["lines"]),
        "total_stitched": total_stitched,
    }


@app.get("/api/poems/hot")
def get_hot_poems() -> list[dict[str, Any]]:
    now = datetime.now(timezone.utc)
    twenty_four_hours_ago = now - timedelta(hours=24)

    recent_poems = []
    for poem in poems_list:
        created = datetime.fromisoformat(poem["created_at"])
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        if created >= twenty_four_hours_ago:
            recent_poems.append(poem)

    recent_poems.sort(key=lambda p: p.get("stitch_count", 0), reverse=True)
    return recent_poems[:10]


@app.get("/api/search")
def search(q: str = Query(default="")) -> dict[str, Any]:
    results: list[dict[str, Any]] = []

    for line in lines_list:
        if q in line["content"] or line["anonymous_id"].startswith(q):
            results.append({"type": "line", "data": line})

    for aid, user in users_dict.items():
        if aid.startswith(q) and not any(
            r["type"] == "user" and r["data"]["anonymous_id"] == aid for r in results
        ):
            results.append({"type": "user", "data": user})

    return {"results": results}


def _seed_data() -> None:
    now = datetime.now(timezone.utc)

    seed_lines_data = [
        ("月光落在旧窗台上", -1),
        ("风穿过空旷的街道", -1),
        ("雨后的空气有薄荷味", -2),
        ("黄昏把影子拉得很长", -3),
        ("星星掉进咖啡杯里", -3),
        ("雪花落在睫毛上融化", -4),
        ("远处传来钢琴声", -5),
        ("书页间夹着干枯的花", -6),
        ("灯塔在雾中闪烁", -6),
        ("河流带走了夏天的秘密", -8),
        ("清晨的第一缕阳光", -10),
        ("猫在屋顶上行走", -12),
        ("秋叶铺满回家的路", -15),
        ("海浪轻声说着晚安", -20),
        ("时间在指尖悄悄溜走", -25),
        ("夜色温柔地拥抱城市", -30),
    ]

    aid_map: dict[str, str] = {}
    for content, days_ago in seed_lines_data:
        aid = _make_anonymous_id()
        while aid in users_dict:
            aid = _make_anonymous_id()
        aid_map[content] = aid

        line_id = _make_line_id()
        created = now + timedelta(days=days_ago)
        line: dict[str, Any] = {
            "id": line_id,
            "content": content,
            "anonymous_id": aid,
            "created_at": created.isoformat(),
            "stitch_count": 0,
        }
        lines_list.append(line)
        users_dict[aid] = {"anonymous_id": aid, "lines": [line_id]}

    for i in range(0, min(8, len(lines_list)), 2):
        poem_lines = lines_list[i : i + 3] if i + 3 <= len(lines_list) else lines_list[i : i + 2]
        poem_id = _make_poem_id()
        created = now + timedelta(days=-(i // 2))
        poem: dict[str, Any] = {
            "id": poem_id,
            "lines": poem_lines,
            "created_at": created.isoformat(),
            "stitch_count": i,
        }
        poems_list.append(poem)
        for pl in poem_lines:
            pl["stitch_count"] = pl.get("stitch_count", 0) + 1


@app.on_event("startup")
def on_startup() -> None:
    _seed_data()
