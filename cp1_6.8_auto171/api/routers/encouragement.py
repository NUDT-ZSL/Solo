import random
from typing import Literal

from fastapi import APIRouter, HTTPException

from ..models import EmotionDistribution

ENCOURAGEMENTS: dict[str, list[str]] = {
    "calm": [
        "你的宁静如湖水般澄澈",
        "每一次呼吸都是与内心的温柔对话",
        "宁静不是远离喧嚣而是在心中修篱种菊",
    ],
    "joy": [
        "你的喜悦如阳光般温暖",
        "快乐是一种力量",
        "带着这份欢喜继续播种善意",
    ],
    "anxiety": [
        "焦虑是来访的云而你永远是那片天空",
        "承认焦虑需要勇气",
        "每一朵乌云后面都有阳光",
    ],
}

router = APIRouter(prefix="/api/encouragement", tags=["encouragement"])


def pick_encouragement(emotion: str) -> str:
    return random.choice(ENCOURAGEMENTS[emotion])


@router.get("")
async def get_encouragement(emotion: Literal["calm", "joy", "anxiety"]):
    return {"emotion": emotion, "message": pick_encouragement(emotion)}
