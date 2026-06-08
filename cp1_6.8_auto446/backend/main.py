from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import math
import hashlib
from pathlib import Path

app = FastAPI(title="词韵织机 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

POEMS_PATH = Path(__file__).parent / "poems_data.json"

with open(POEMS_PATH, "r", encoding="utf-8") as f:
    POEMS = json.load(f)

CATEGORY_DIMS = {
    "山川": 0, "水文": 1, "天象": 2, "植物": 3, "动物": 4,
    "情感": 5, "季节": 6, "时间": 7, "色彩": 8, "人事": 9,
    "建筑": 10, "器物": 11, "音乐": 12, "饮食": 13, "行旅": 14,
}

WORD_CATEGORIES: dict[str, list[str]] = {
    "山": ["山川"], "峰": ["山川"], "岭": ["山川"], "岩": ["山川"], "崖": ["山川"],
    "谷": ["山川"], "岳": ["山川"], "壁": ["山川"], "石": ["山川"],
    "海": ["水文"], "河": ["水文"], "江": ["水文"], "溪": ["水文"], "泉": ["水文"],
    "湖": ["水文"], "波": ["水文"], "浪": ["水文"], "潮": ["水文"], "涧": ["水文"],
    "潭": ["水文"], "池": ["水文"],
    "月": ["天象"], "星": ["天象"], "云": ["天象"], "风": ["天象"], "雨": ["天象"],
    "雪": ["天象", "季节"], "霜": ["天象", "季节"], "露": ["天象"], "雾": ["天象"],
    "日": ["天象", "时间"], "虹": ["天象", "色彩"], "霞": ["天象", "色彩"],
    "花": ["植物"], "草": ["植物"], "木": ["植物"], "林": ["植物"], "松": ["植物"],
    "竹": ["植物"], "柳": ["植物"], "梅": ["植物", "季节"], "兰": ["植物"],
    "菊": ["植物", "季节"], "荷": ["植物"], "桃": ["植物"], "叶": ["植物"],
    "枝": ["植物"], "蕊": ["植物"],
    "鸟": ["动物"], "雁": ["动物"], "鹤": ["动物"], "鱼": ["动物", "水文"],
    "蝶": ["动物"], "莺": ["动物"], "燕": ["动物"], "龙": ["动物"],
    "凤": ["动物"], "蚕": ["动物"],
    "愁": ["情感"], "喜": ["情感"], "思": ["情感"], "恨": ["情感"], "怨": ["情感"],
    "爱": ["情感"], "忆": ["情感"], "梦": ["情感"], "情": ["情感"], "忧": ["情感"],
    "欢": ["情感"], "悲": ["情感"], "惜": ["情感"],
    "春": ["季节"], "夏": ["季节"], "秋": ["季节"], "冬": ["季节"],
    "朝": ["时间"], "暮": ["时间"], "夜": ["时间"], "晓": ["时间"], "夕": ["时间"],
    "昼": ["时间"], "辰": ["时间"],
    "红": ["色彩"], "翠": ["色彩", "植物"], "碧": ["色彩", "水文"],
    "青": ["色彩"], "白": ["色彩"], "紫": ["色彩"], "金": ["色彩"],
    "墨": ["色彩"],
    "人": ["人事"], "客": ["人事", "行旅"], "僧": ["人事"], "君": ["人事"],
    "童": ["人事"], "妇": ["人事"], "翁": ["人事"], "友": ["人事"],
    "楼": ["建筑"], "阁": ["建筑"], "亭": ["建筑"], "台": ["建筑"],
    "桥": ["建筑"], "门": ["建筑"], "窗": ["建筑"], "寺": ["建筑"],
    "剑": ["器物"], "琴": ["器物", "音乐"], "笛": ["器物", "音乐"],
    "箫": ["器物", "音乐"], "钟": ["器物", "音乐"], "鼓": ["器物", "音乐"],
    "瑟": ["器物", "音乐"], "杯": ["器物", "饮食"], "盏": ["器物", "饮食"],
    "酒": ["饮食"], "茶": ["饮食"],
    "路": ["行旅"], "舟": ["行旅", "水文"], "马": ["行旅"], "车": ["行旅"],
    "归": ["行旅"], "行": ["行旅"],
    "光": ["天象"], "影": ["天象"], "声": ["天象"],
    "香": ["植物"], "烟": ["天象"],
    "山": ["山川"], "海": ["水文"], "月": ["天象"], "风": ["天象"],
    "花": ["植物"], "雪": ["天象", "季节"],
    "月光": ["天象"], "山水": ["山川", "水文"], "风雨": ["天象"],
    "落花": ["植物", "季节"], "流云": ["天象"], "清泉": ["水文"],
    "长河": ["水文"], "明月": ["天象"], "春风": ["天象", "季节"],
    "秋月": ["天象", "季节"], "白雪": ["天象", "季节", "色彩"],
    "青山": ["山川", "色彩"], "碧水": ["水文", "色彩"],
    "红尘": ["色彩", "人事"], "天涯": ["行旅"],
    "孤舟": ["行旅", "水文"], "古道": ["行旅"],
}

DIM_COUNT = len(CATEGORY_DIMS)


def word_to_vector(word: str) -> list[float]:
    vector = [0.0] * DIM_COUNT
    categories = WORD_CATEGORIES.get(word, [])
    if categories:
        for cat in categories:
            if cat in CATEGORY_DIMS:
                vector[CATEGORY_DIMS[cat]] = 1.0
    else:
        h = hashlib.sha256(word.encode("utf-8")).hexdigest()
        for i in range(DIM_COUNT):
            idx = (i * 4) % (len(h) - 4)
            val = int(h[idx:idx + 4], 16) / 65535.0
            vector[i] = val * 0.3
    mag = math.sqrt(sum(v * v for v in vector))
    if mag > 0:
        vector = [v / mag for v in vector]
    return vector


def cosine_similarity(v1: list[float], v2: list[float]) -> float:
    dot = sum(a * b for a, b in zip(v1, v2))
    m1 = math.sqrt(sum(a * a for a in v1))
    m2 = math.sqrt(sum(b * b for b in v2))
    if m1 == 0 or m2 == 0:
        return 0.0
    return dot / (m1 * m2)


class VectorsRequest(BaseModel):
    words: list[str]


class PoemsRequest(BaseModel):
    words: list[str]


@app.post("/api/vectors")
def get_vectors(req: VectorsRequest):
    words = req.words
    vectors = {w: word_to_vector(w) for w in words}
    word_order = list(words)
    n = len(word_order)
    sim_matrix = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            sim_matrix[i][j] = cosine_similarity(
                vectors[word_order[i]], vectors[word_order[j]]
            )
    return {
        "vectors": vectors,
        "similarity_matrix": sim_matrix,
        "word_order": word_order,
    }


@app.post("/api/poems")
def get_poems(req: PoemsRequest):
    matches: dict[str, list[dict]] = {}
    for word in req.words:
        word_matches = []
        for poem in POEMS:
            if any(kw in word or word in kw for kw in poem["keywords"]):
                word_matches.append({
                    "keyword": word,
                    "poem": poem["content"],
                    "poet": poem["poet"],
                    "source": poem["source"],
                })
                if len(word_matches) >= 3:
                    break
        if not word_matches:
            for poem in POEMS:
                word_matches.append({
                    "keyword": word,
                    "poem": poem["content"],
                    "poet": poem["poet"],
                    "source": poem["source"],
                })
                if len(word_matches) >= 1:
                    break
        matches[word] = word_matches
    return {"matches": matches}


@app.get("/api/health")
def health():
    return {"status": "ok"}
