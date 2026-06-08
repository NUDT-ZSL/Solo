import re
import uuid
import hashlib
from typing import Optional
from datetime import datetime

import httpx
import numpy as np
from bs4 import BeautifulSoup
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="回声书签 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

cards_db: dict = {}

POSITIVE_KEYWORDS = [
    "love", "happy", "great", "amazing", "wonderful", "excellent", "beautiful",
    "joy", "hope", "inspire", "success", "win", "best", "brilliant", "awesome",
    "喜欢", "快乐", "幸福", "美好", "精彩", "优秀", "温暖", "感动", "希望",
    "梦想", "成功", "热爱", "赞美", "欣赏", "欢乐", "光明", "勇气", "力量",
    "inspire", "create", "innovate", "celebrate", "freedom", "peace", "harmony",
]
NEGATIVE_KEYWORDS = [
    "hate", "sad", "bad", "terrible", "awful", "horrible", "angry", "fear",
    "pain", "loss", "fail", "worst", "death", "war", "crisis", "destroy",
    "悲伤", "痛苦", "失败", "恐惧", "愤怒", "绝望", "孤独", "黑暗", "灾难",
    "讨厌", "可怕", "崩溃", "失去", "困难", "挣扎", "无奈", "忧伤", "消沉",
]
NEUTRAL_KEYWORDS = [
    "info", "data", "report", "study", "analysis", "research", "method",
    "system", "process", "structure", "function", "model", "framework",
    "信息", "数据", "报告", "研究", "分析", "方法", "系统", "过程",
    "结构", "功能", "模型", "框架", "技术", "说明", "概述", "介绍",
]


class CreateCardRequest(BaseModel):
    url: str


class ResonateRequest(BaseModel):
    card_id: str


def analyze_sentiment(text: str) -> dict:
    text_lower = text.lower()
    pos_count = sum(1 for kw in POSITIVE_KEYWORDS if kw in text_lower)
    neg_count = sum(1 for kw in NEGATIVE_KEYWORDS if kw in text_lower)
    neu_count = sum(1 for kw in NEUTRAL_KEYWORDS if kw in text_lower)

    total = pos_count + neg_count + neu_count
    if total == 0:
        pos_score, neg_score, neu_score = 0.2, 0.2, 0.6
    else:
        pos_score = pos_count / total
        neg_score = neg_count / total
        neu_score = neu_count / total

    if pos_score >= neg_score and pos_score >= neu_score:
        sentiment = "positive"
    elif neg_score >= pos_score and neg_score >= neu_score:
        sentiment = "negative"
    else:
        sentiment = "neutral"

    return {
        "sentiment": sentiment,
        "scores": {"positive": round(pos_score, 3), "negative": round(neg_score, 3), "neutral": round(neu_score, 3)},
    }


def generate_wave_params(sentiment_data: dict) -> dict:
    scores = sentiment_data["scores"]
    sentiment = sentiment_data["sentiment"]
    np.random.seed(hash(str(scores)) % (2**31))

    base_freq = 0.02
    if sentiment == "positive":
        amplitude = 30 + scores["positive"] * 40
        frequency = base_freq + scores["positive"] * 0.03
        harmonics = [1.0, 0.5, 0.3, 0.15]
    elif sentiment == "negative":
        amplitude = 25 + scores["negative"] * 35
        frequency = base_freq + scores["negative"] * 0.025
        harmonics = [1.0, 0.7, 0.4, 0.2]
    else:
        amplitude = 15 + scores["neutral"] * 20
        frequency = base_freq + scores["neutral"] * 0.015
        harmonics = [1.0, 0.3, 0.15, 0.08]

    return {
        "amplitude": round(amplitude, 2),
        "frequency": round(frequency, 4),
        "harmonics": harmonics,
        "phase": round(np.random.uniform(0, 2 * np.pi), 4),
        "noise": round(np.random.uniform(0.5, 2.0), 2),
    }


def generate_poetic_comment(title: str, sentiment: str, scores: dict) -> str:
    templates = {
        "positive": [
            "在字里行间，阳光悄然铺展，温暖如初见。",
            "这些文字携带着远方的光，落入心湖便泛起金色的涟漪。",
            "如黎明前的第一缕曙光，照亮了阅读者的瞳孔。",
            "翻开这一页，世界正用最温柔的方式回应你的凝视。",
            "光在文字中行走，每一步都留下温暖的足迹。",
        ],
        "negative": [
            "深夜的独白，在寂静中回荡成一首低沉的挽歌。",
            "这些字符承载着不可言说的重量，如潮汐般缓缓退去。",
            "暮色中的独行者，在文字的阴影里找到了同路人。",
            "如同雨后未被触及的落叶，安静地诉说着消逝的痕迹。",
            "在深渊的边缘，文字是唯一不肯松开的手。",
        ],
        "neutral": [
            "如水墨在宣纸上缓缓晕开，不急不徐，自成一派风景。",
            "这些文字像一面静湖，映照着思考者的倒影。",
            "在信息与意念的交汇处，平静本身就是一种深度。",
            "似山间清泉，无悲无喜，却滋润了途经的一切。",
            "文字如同一条安静的河流，载着思绪缓缓前行。",
        ],
    }

    pool = templates.get(sentiment, templates["neutral"])
    idx = int(hashlib.md5(title.encode()).hexdigest(), 16) % len(pool)
    return pool[idx]


async def fetch_url_metadata(url: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(url, headers={
                "User-Agent": "Mozilla/5.0 (compatible; EchoBookmark/1.0)"
            })
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")

            title = ""
            if soup.title and soup.title.string:
                title = soup.title.string.strip()
            og_title = soup.find("meta", property="og:title")
            if og_title and og_title.get("content"):
                title = title or og_title["content"].strip()

            summary = ""
            og_desc = soup.find("meta", property="og:description")
            if og_desc and og_desc.get("content"):
                summary = og_desc["content"].strip()
            meta_desc = soup.find("meta", attrs={"name": "description"})
            if not summary and meta_desc and meta_desc.get("content"):
                summary = meta_desc["content"].strip()
            if not summary:
                paragraphs = soup.find_all("p")
                texts = [p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True)]
                summary = " ".join(texts)[:300]

            full_text = f"{title} {summary}"
            sentiment_data = analyze_sentiment(full_text)
            wave_params = generate_wave_params(sentiment_data)
            poetic_comment = generate_poetic_comment(title, sentiment_data["sentiment"], sentiment_data["scores"])

            return {
                "title": title or url,
                "summary": summary or "此页面暂无摘要描述。",
                "sentiment": sentiment_data,
                "wave_params": wave_params,
                "poetic_comment": poetic_comment,
            }
    except Exception as e:
        default_sentiment = {"sentiment": "neutral", "scores": {"positive": 0.2, "negative": 0.2, "neutral": 0.6}}
        return {
            "title": url,
            "summary": f"无法获取页面内容：{str(e)[:100]}",
            "sentiment": default_sentiment,
            "wave_params": generate_wave_params(default_sentiment),
            "poetic_comment": generate_poetic_comment(url, "neutral", default_sentiment["scores"]),
        }


@app.post("/api/cards")
async def create_card(req: CreateCardRequest):
    url = req.url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    metadata = await fetch_url_metadata(url)
    card_id = str(uuid.uuid4())[:8]

    card = {
        "id": card_id,
        "url": url,
        "title": metadata["title"],
        "summary": metadata["summary"],
        "sentiment": metadata["sentiment"],
        "wave_params": metadata["wave_params"],
        "poetic_comment": metadata["poetic_comment"],
        "resonances": 0,
        "created_at": datetime.now().isoformat(),
    }
    cards_db[card_id] = card
    return card


@app.get("/api/cards")
async def list_cards(
    sentiment: Optional[str] = None,
    search: Optional[str] = None,
):
    cards = list(cards_db.values())
    if sentiment and sentiment != "all":
        cards = [c for c in cards if c["sentiment"]["sentiment"] == sentiment]
    if search:
        pattern = re.compile(re.escape(search), re.IGNORECASE)
        cards = [c for c in cards if pattern.search(c["title"])]
    cards.sort(key=lambda c: c["created_at"], reverse=True)
    return cards


@app.get("/api/cards/{card_id}")
async def get_card(card_id: str):
    card = cards_db.get(card_id)
    if not card:
        return {"error": "Card not found"}
    return card


@app.post("/api/cards/{card_id}/resonate")
async def resonate(card_id: str):
    card = cards_db.get(card_id)
    if not card:
        return {"error": "Card not found"}
    card["resonances"] += 1
    return {"id": card_id, "resonances": card["resonances"]}


@app.on_event("startup")
async def seed_data():
    seeds = [
        ("https://github.com", "GitHub: Where the world builds software", "The world's leading software development platform. Millions of developers and companies build, ship, and maintain their software on GitHub.", "neutral"),
        ("https://www.poetryfoundation.org", "Poetry Foundation", "Discover the best poems, poets, and poetry resources. A vibrant community of poetry lovers and creators.", "positive"),
        ("https://www.bbc.com/news/climate", "Climate Change News", "Global climate crisis reports, environmental challenges and the latest scientific findings on planetary health.", "negative"),
        ("https://developer.mozilla.org", "MDN Web Docs", "Resources for developers, by developers. Documenting web technologies, CSS, JavaScript, and APIs.", "neutral"),
        ("https://www.nature.com", "Nature Journal", "Breaking science news and research publications. Exploring the frontiers of human knowledge and discovery.", "positive"),
        ("https://www.wikipedia.org", "Wikipedia", "The free encyclopedia that anyone can edit. Knowledge freely accessible to all who seek it.", "neutral"),
    ]

    sentiments_map = {
        "positive": {"sentiment": "positive", "scores": {"positive": 0.65, "negative": 0.1, "neutral": 0.25}},
        "negative": {"sentiment": "negative", "scores": {"positive": 0.1, "negative": 0.6, "neutral": 0.3}},
        "neutral": {"sentiment": "neutral", "scores": {"positive": 0.2, "negative": 0.15, "neutral": 0.65}},
    }

    for url, title, summary, sent_key in seeds:
        card_id = str(uuid.uuid4())[:8]
        sentiment = sentiments_map[sent_key]
        cards_db[card_id] = {
            "id": card_id,
            "url": url,
            "title": title,
            "summary": summary,
            "sentiment": sentiment,
            "wave_params": generate_wave_params(sentiment),
            "poetic_comment": generate_poetic_comment(title, sent_key, sentiment["scores"]),
            "resonances": np.random.randint(3, 42),
            "created_at": datetime.now().isoformat(),
        }
