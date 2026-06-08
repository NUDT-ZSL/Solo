import json
import os
import uuid
import hashlib
from datetime import datetime

DATA_FILE = os.path.join(os.path.dirname(__file__), 'mysteries.json')

COLORS = ['warm-yellow', 'cyan-green', 'light-blue']

SAMPLE_RIDDLES = [
    {"riddle": "千条线，万条线，掉到水里看不见", "answer": "雨"},
    {"riddle": "一个老头，不跑不走，请他睡觉，他就摇头", "answer": "不倒翁"},
    {"riddle": "红口袋，绿口袋，有人害怕有人爱", "answer": "辣椒"},
    {"riddle": "麻屋子，红帐子，里面住个白胖子", "answer": "花生"},
    {"riddle": "上边毛，下边毛，中间一颗黑葡萄", "answer": "眼睛"},
    {"riddle": "千颗星，万颗星，满天星星数不清", "answer": "雪花"},
    {"riddle": "有面没有口，有脚没有手，虽有四只脚，自己不会走", "answer": "桌子"},
    {"riddle": "白胖娃娃泥里藏，腰身细细心眼多", "answer": "藕"},
    {"riddle": "身穿绿衣裳，肚里水汪汪，生的子儿多，个个黑脸膛", "answer": "西瓜"},
    {"riddle": "头戴红帽子，身穿白袍子，走路摆架子，说话伸脖子", "answer": "鹅"},
    {"riddle": "一物生来身穿三百多件衣，每天脱一件，年底剩张皮", "answer": "日历"},
    {"riddle": "弟兄七八个，围着柱子坐，只要一分开，衣服就扯破", "answer": "蒜"},
]


def _load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    data = {"mysteries": [], "solved_ids": []}
    for item in SAMPLE_RIDDLES:
        m = {
            "id": str(uuid.uuid4()),
            "riddle": item["riddle"],
            "answer_hash": hashlib.sha256(item["answer"].encode('utf-8')).hexdigest(),
            "color": COLORS[hash(item["riddle"]) % 3],
            "created_at": datetime.utcnow().isoformat() + "Z",
            "solved": False,
            "solved_at": None,
        }
        data["mysteries"].append(m)
    _save_data(data)
    return data


def _save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def get_all_mysteries():
    data = _load_data()
    solved_ids = data.get("solved_ids", [])
    result = []
    for m in data["mysteries"]:
        result.append({
            "id": m["id"],
            "riddle_preview": m["riddle"][:6] + "..." if len(m["riddle"]) > 6 else m["riddle"],
            "color": m["color"],
            "created_at": m["created_at"],
            "solved": m["id"] in solved_ids,
        })
    return result


def get_mystery_by_id(mystery_id):
    data = _load_data()
    for m in data["mysteries"]:
        if m["id"] == mystery_id:
            solved_ids = data.get("solved_ids", [])
            return {
                "id": m["id"],
                "riddle": m["riddle"],
                "color": m["color"],
                "created_at": m["created_at"],
                "solved": m["id"] in solved_ids,
            }
    return None


def create_mystery(riddle, answer):
    data = _load_data()
    m = {
        "id": str(uuid.uuid4()),
        "riddle": riddle.strip(),
        "answer_hash": hashlib.sha256(answer.strip().encode('utf-8')).hexdigest(),
        "color": COLORS[hash(riddle) % 3],
        "created_at": datetime.utcnow().isoformat() + "Z",
        "solved": False,
        "solved_at": None,
    }
    data["mysteries"].append(m)
    _save_data(data)
    return {
        "id": m["id"],
        "riddle_preview": m["riddle"][:6] + "..." if len(m["riddle"]) > 6 else m["riddle"],
        "color": m["color"],
        "created_at": m["created_at"],
    }


def verify_answer(mystery_id, user_answer):
    data = _load_data()
    for m in data["mysteries"]:
        if m["id"] == mystery_id:
            user_hash = hashlib.sha256(user_answer.strip().encode('utf-8')).hexdigest()
            correct = user_hash == m["answer_hash"]
            if correct:
                if mystery_id not in data.get("solved_ids", []):
                    if "solved_ids" not in data:
                        data["solved_ids"] = []
                    data["solved_ids"].append(mystery_id)
                    m["solved"] = True
                    m["solved_at"] = datetime.utcnow().isoformat() + "Z"
                    _save_data(data)
                return {
                    "correct": True,
                    "riddle": m["riddle"],
                    "answer": user_answer.strip(),
                }
            else:
                return {
                    "correct": False,
                    "riddle": m["riddle"],
                    "answer": "",
                }
    return {"correct": False, "riddle": "", "answer": ""}


def get_solved_mysteries():
    data = _load_data()
    solved_ids = data.get("solved_ids", [])
    result = []
    for m in data["mysteries"]:
        if m["id"] in solved_ids:
            result.append({
                "id": m["id"],
                "riddle": m["riddle"],
                "answer": "",
                "color": m["color"],
                "solved_at": m.get("solved_at", ""),
            })
    return result
