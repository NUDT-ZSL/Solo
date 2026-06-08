from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class VoteHistoryItem(BaseModel):
    type: str
    timestamp: str
    score: int


class Card(BaseModel):
    id: str
    title: str
    description: str
    color: str
    upvotes: int
    downvotes: int
    voteHistory: List[VoteHistoryItem]


class CardCreate(BaseModel):
    title: str
    description: str
    color: str


class VoteCreate(BaseModel):
    type: str


AVAILABLE_COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"]


def now_iso() -> str:
    return datetime.now().isoformat()


def calc_score(c: Card) -> int:
    return c.upvotes - c.downvotes


cards: List[Card] = []


def seed_data():
    examples = [
        {
            "title": "远程团队咖啡时光",
            "description": "每周五下午举办虚拟咖啡时光，大家随意聊天，增进感情。",
            "color": "#4ECDC4",
            "upvotes": 8,
            "downvotes": 1,
        },
        {
            "title": "设计灵感库共享",
            "description": "建立一个共享的设计灵感看板，每人每周分享3个喜欢的作品。",
            "color": "#45B7D1",
            "upvotes": 5,
            "downvotes": 2,
        },
        {
            "title": "异步沟通优先",
            "description": "重要决策尽量用文档异步沟通，减少不必要的会议。",
            "color": "#FFEAA7",
            "upvotes": 12,
            "downvotes": 3,
        },
    ]
    for ex in examples:
        card_id = str(uuid.uuid4())
        score = ex["upvotes"] - ex["downvotes"]
        history: List[VoteHistoryItem] = []
        for i in range(ex["upvotes"]):
            history.append(
                VoteHistoryItem(
                    type="up",
                    timestamp=now_iso(),
                    score=score - ex["upvotes"] + i + 1,
                )
            )
        for i in range(ex["downvotes"]):
            history.append(
                VoteHistoryItem(
                    type="down",
                    timestamp=now_iso(),
                    score=score - i - 1,
                )
            )
        cards.append(
            Card(
                id=card_id,
                title=ex["title"],
                description=ex["description"],
                color=ex["color"],
                upvotes=ex["upvotes"],
                downvotes=ex["downvotes"],
                voteHistory=history[-10:],
            )
        )


seed_data()


@app.get("/api/cards")
def get_cards() -> List[Card]:
    return sorted(cards, key=lambda c: calc_score(c), reverse=True)


@app.post("/api/cards")
def create_card(card_data: CardCreate) -> Card:
    if card_data.color not in AVAILABLE_COLORS:
        raise HTTPException(status_code=400, detail="Invalid color")
    card_id = str(uuid.uuid4())
    new_card = Card(
        id=card_id,
        title=card_data.title,
        description=card_data.description,
        color=card_data.color,
        upvotes=0,
        downvotes=0,
        voteHistory=[],
    )
    cards.append(new_card)
    return new_card


@app.post("/api/cards/{card_id}/vote")
def vote_card(card_id: str, vote_data: VoteCreate) -> Card:
    if vote_data.type not in ("up", "down"):
        raise HTTPException(status_code=400, detail="Invalid vote type")
    card = next((c for c in cards if c.id == card_id), None)
    if card is None:
        raise HTTPException(status_code=404, detail="Card not found")
    if vote_data.type == "up":
        card.upvotes += 1
    else:
        card.downvotes += 1
    new_score = calc_score(card)
    card.voteHistory.append(
        VoteHistoryItem(type=vote_data.type, timestamp=now_iso(), score=new_score)
    )
    if len(card.voteHistory) > 10:
        card.voteHistory = card.voteHistory[-10:]
    return card
