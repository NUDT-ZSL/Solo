from pydantic import BaseModel
from typing import Optional
import uuid
import time
import random

IDEA_COLORS = [
    "#FF2D95",
    "#00D4FF",
    "#39FF14",
    "#FF6B35",
    "#BF40BF",
    "#00FF7F",
    "#FF4500",
    "#7DF9FF",
    "#FF1493",
    "#00FA9A",
]

class Idea(BaseModel):
    id: str
    content: str
    color: str
    x: float
    y: float
    inspiredCount: int
    createdAt: float

class IdeaCreateRequest(BaseModel):
    content: str

class InspireRequest(BaseModel):
    fromId: str
    toId: str

class DataStore:
    def __init__(self):
        self.ideas: dict[str, Idea] = {}
        self._color_index = 0
        self._seed_data()

    def _next_color(self) -> str:
        color = IDEA_COLORS[self._color_index % len(IDEA_COLORS)]
        self._color_index += 1
        return color

    def _random_position(self) -> tuple[float, float]:
        return (round(random.uniform(0.05, 0.95), 3), round(random.uniform(0.05, 0.95), 3))

    def _seed_data(self):
        seeds = [
            "用AI生成每日穿搭建议",
            "让植物通过传感器说话",
            "城市声音地图应用",
            "梦境可视化记录器",
            "气味记忆贩卖机",
            "情绪天气预报",
            "时间胶囊社交平台",
            "反向健身游戏",
            "漂浮音乐节",
            "思维导图拼图",
        ]
        for content in seeds:
            x, y = self._random_position()
            idea = Idea(
                id=str(uuid.uuid4())[:8],
                content=content,
                color=self._next_color(),
                x=x,
                y=y,
                inspiredCount=random.randint(0, 5),
                createdAt=time.time() - random.uniform(0, 86400),
            )
            self.ideas[idea.id] = idea

    def get_all(self) -> list[Idea]:
        return list(self.ideas.values())

    def get_leaderboard(self, limit: int = 10) -> list[Idea]:
        sorted_ideas = sorted(self.ideas.values(), key=lambda i: i.inspiredCount, reverse=True)
        return sorted_ideas[:limit]

    def create(self, content: str) -> Idea:
        x, y = self._random_position()
        idea = Idea(
            id=str(uuid.uuid4())[:8],
            content=content[:50],
            color=self._next_color(),
            x=x,
            y=y,
            inspiredCount=0,
            createdAt=time.time(),
        )
        self.ideas[idea.id] = idea
        return idea

    def inspire(self, from_id: str, to_id: str) -> Optional[Idea]:
        target = self.ideas.get(to_id)
        if not target:
            return None
        target.inspiredCount += 1
        self.ideas[to_id] = target
        return target


store = DataStore()
