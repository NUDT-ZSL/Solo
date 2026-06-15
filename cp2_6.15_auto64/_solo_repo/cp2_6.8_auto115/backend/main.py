from datetime import datetime, timedelta
from typing import Dict, List, Literal
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="闪卡复习系统 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Card(BaseModel):
    id: str
    front: str
    back: str
    interval: float
    ease_factor: float
    next_review: str
    created_at: str


class CardDeck(BaseModel):
    id: str
    title: str
    cards: List[Card]
    created_at: str


class CreateDeckRequest(BaseModel):
    title: str


class AddCardRequest(BaseModel):
    front: str
    back: str


class ReviewRequest(BaseModel):
    rating: Literal["hard", "good", "easy"]


class ReviewResponse(BaseModel):
    card_id: str
    next_review: str
    new_interval: float
    new_ease_factor: float


def _now_iso() -> str:
    return datetime.now().isoformat()


def _create_card(front: str, back: str) -> Card:
    now = datetime.now()
    return Card(
        id=str(uuid4()),
        front=front,
        back=back,
        interval=1.0,
        ease_factor=2.5,
        next_review=now.isoformat(),
        created_at=now.isoformat(),
    )


def _create_deck(title: str, cards: List[Card] | None = None) -> CardDeck:
    return CardDeck(
        id=str(uuid4()),
        title=title,
        cards=cards or [],
        created_at=_now_iso(),
    )


def _apply_sm2(card: Card, rating: Literal["hard", "good", "easy"]) -> Card:
    interval = card.interval
    ease = card.ease_factor

    if rating == "hard":
        interval = max(1.0, interval * 1.2)
        ease = max(1.3, ease - 0.2)
    elif rating == "good":
        interval = interval * ease
    elif rating == "easy":
        interval = interval * ease * 1.3
        ease = ease + 0.15

    interval = min(max(1.0, interval), 365.0)
    next_date = datetime.now() + timedelta(days=interval)

    card.interval = round(interval, 2)
    card.ease_factor = round(ease, 2)
    card.next_review = next_date.isoformat()
    return card


vue_cards = [
    _create_card(
        "Vue.js 中 v-if 和 v-show 的区别是什么？",
        "v-if 是真正的条件渲染，会切换组件的创建和销毁；v-show 只是切换 display CSS 属性，适合频繁切换的场景。v-if 有更高的切换开销，v-show 有更高的初始渲染开销。"
    ),
    _create_card(
        "Vue.js 的响应式原理是什么？",
        "Vue 2 使用 Object.defineProperty 对对象属性进行 getter/setter 劫持，结合发布-订阅模式实现响应式。Vue 3 使用 Proxy 代理整个对象，能检测到属性的新增和删除。"
    ),
    _create_card(
        "computed 和 watch 的区别是什么？",
        "computed 是计算属性，有缓存，依赖不变不会重新计算，必须有返回值；watch 是监听器，用于观察数据变化执行异步或开销较大的操作，没有返回值。"
    ),
    _create_card(
        "Vue 组件的生命周期钩子有哪些？",
        "创建阶段：beforeCreate、created；挂载阶段：beforeMount、mounted；更新阶段：beforeUpdate、updated；销毁阶段：beforeUnmount、unmounted（Vue 3）。"
    ),
    _create_card(
        "什么是 Vuex / Pinia？它们的作用是什么？",
        "Vuex 和 Pinia 都是 Vue 的状态管理库，用于集中管理组件共享状态。Pinia 是 Vue 官方推荐的新一代状态管理，支持组合式 API，更轻量且类型友好。"
    ),
]

css_cards = [
    _create_card(
        "Flexbox 中 justify-content 和 align-items 的区别？",
        "justify-content 控制主轴（默认水平方向）上的对齐方式；align-items 控制交叉轴（默认垂直方向）上的对齐方式。"
    ),
    _create_card(
        "CSS Grid 中 fr 单位代表什么？",
        "fr 是 fraction（分数）的缩写，表示剩余空间的等分。例如 grid-template-columns: 1fr 2fr 表示第一列占 1/3，第二列占 2/3。"
    ),
    _create_card(
        "position: relative 和 position: absolute 的区别？",
        "relative 相对于自身原来位置定位，不脱离文档流；absolute 相对于最近的定位祖先元素定位，脱离文档流，不占据空间。"
    ),
    _create_card(
        "BFC 是什么？如何触发？",
        "BFC（Block Formatting Context）块级格式化上下文，是一个独立的渲染区域。触发方式：overflow: hidden/auto、display: inline-block/flex/grid、position: absolute/fixed、float: left/right 等。"
    ),
    _create_card(
        "CSS 选择器优先级如何计算？",
        "!important > 内联样式 > ID 选择器 > 类/伪类/属性选择器 > 标签/伪元素选择器。同级选择器后者覆盖前者。可以用 0-0-0-0 的四位数来记忆优先级权重。"
    ),
]


_decks: Dict[str, CardDeck] = {}

_vue_deck = _create_deck("Vue.js 基础问题", vue_cards)
_css_deck = _create_deck("CSS 布局技巧", css_cards)
_decks[_vue_deck.id] = _vue_deck
_decks[_css_deck.id] = _css_deck


@app.get("/api/decks", response_model=List[CardDeck])
def get_decks() -> List[CardDeck]:
    return list(_decks.values())


@app.get("/api/decks/{deck_id}", response_model=CardDeck)
def get_deck(deck_id: str) -> CardDeck:
    deck = _decks.get(deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="卡片组不存在")
    return deck


@app.post("/api/decks", response_model=CardDeck)
def create_deck(req: CreateDeckRequest) -> CardDeck:
    deck = _create_deck(req.title)
    _decks[deck.id] = deck
    return deck


@app.post("/api/decks/{deck_id}/cards", response_model=Card)
def add_card_to_deck(deck_id: str, req: AddCardRequest) -> Card:
    deck = _decks.get(deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="卡片组不存在")
    card = _create_card(req.front, req.back)
    deck.cards.append(card)
    return card


@app.post("/api/cards/{card_id}/review", response_model=ReviewResponse)
def review_card(card_id: str, req: ReviewRequest) -> ReviewResponse:
    for deck in _decks.values():
        for card in deck.cards:
            if card.id == card_id:
                updated = _apply_sm2(card, req.rating)
                return ReviewResponse(
                    card_id=updated.id,
                    next_review=updated.next_review,
                    new_interval=updated.interval,
                    new_ease_factor=updated.ease_factor,
                )
    raise HTTPException(status_code=404, detail="卡片不存在")


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
