from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
import time
import copy

app = Flask(__name__)
CORS(app)

BLESSINGS = [
    "愿你岁月静好，浅笑安然",
    "愿你三冬暖，愿你春不寒",
    "愿所有美好如期而至",
    "愿你心有繁花，一路芬芳",
    "愿山高水长，别来无恙",
    "愿此生尽兴，赤诚善良",
    "愿你眼里有光，心中有爱",
    "愿往事清零，爱恨随意",
    "愿岁月温柔以待",
    "愿你前路漫漫，未来可期",
    "愿烟火人间，事事值得",
    "愿你所得皆所期，所失亦无碍",
    "愿清风徐来，花自盛开",
    "愿你眉目舒展，顺问冬安",
    "愿山河无恙，人间皆安",
    "愿你温柔且坚定，知足且上进",
    "愿以梦为马，不负韶华",
    "愿历尽千帆，归来仍是少年",
    "愿时光能缓，愿故人不散",
    "愿世间美好与你环环相扣",
]

poems_db = [
    {
        "id": str(uuid.uuid4()),
        "content": "明月松间照，清泉石上流。竹喧归浣女，莲动下渔舟。",
        "createdAt": int(time.time() * 1000) - 3600000,
        "viewed": False,
    },
    {
        "id": str(uuid.uuid4()),
        "content": "愿有岁月可回首，且以深情共白头。",
        "createdAt": int(time.time() * 1000) - 7200000,
        "viewed": False,
    },
    {
        "id": str(uuid.uuid4()),
        "content": "人生如逆旅，我亦是行人。",
        "createdAt": int(time.time() * 1000) - 10800000,
        "viewed": False,
    },
    {
        "id": str(uuid.uuid4()),
        "content": "落花人独立，微雨燕双飞。",
        "createdAt": int(time.time() * 1000) - 14400000,
        "viewed": False,
    },
    {
        "id": str(uuid.uuid4()),
        "content": "春江潮水连海平，海上明月共潮生。",
        "createdAt": int(time.time() * 1000) - 18000000,
        "viewed": False,
    },
    {
        "id": str(uuid.uuid4()),
        "content": "众里寻他千百度，蓦然回首，那人却在，灯火阑珊处。",
        "createdAt": int(time.time() * 1000) - 21600000,
        "viewed": False,
    },
    {
        "id": str(uuid.uuid4()),
        "content": "回首向来萧瑟处，归去，也无风雨也无晴。",
        "createdAt": int(time.time() * 1000) - 25200000,
        "viewed": False,
    },
    {
        "id": str(uuid.uuid4()),
        "content": "十年生死两茫茫，不思量，自难忘。",
        "createdAt": int(time.time() * 1000) - 28800000,
        "viewed": False,
    },
]


@app.route("/api/poems", methods=["GET"])
def get_poems():
    unviewed = [copy.deepcopy(p) for p in poems_db if not p["viewed"]]
    unviewed.sort(key=lambda x: x["createdAt"], reverse=True)
    return jsonify({"poems": unviewed, "total": len(unviewed)})


@app.route("/api/poems", methods=["POST"])
def create_poem():
    data = request.get_json(force=True)
    content = data.get("content", "").strip()
    if not content:
        return jsonify({"error": "内容不能为空"}), 400
    if len(content) > 140:
        content = content[:140]
    poem = {
        "id": str(uuid.uuid4()),
        "content": content,
        "createdAt": int(time.time() * 1000),
        "viewed": False,
    }
    poems_db.insert(0, poem)
    return jsonify({"poem": copy.deepcopy(poem)}), 201


@app.route("/api/poems/<poem_id>", methods=["GET"])
def get_poem(poem_id):
    for p in poems_db:
        if p["id"] == poem_id:
            return jsonify({"poem": copy.deepcopy(p)})
    return jsonify({"error": "诗笺不存在"}), 404


@app.route("/api/poems/<poem_id>/view", methods=["POST"])
def mark_viewed(poem_id):
    for p in poems_db:
        if p["id"] == poem_id:
            p["viewed"] = True
            import random
            return jsonify({
                "viewed": True,
                "blessing": random.choice(BLESSINGS),
            })
    return jsonify({"error": "诗笺不存在"}), 404


@app.route("/api/poems/<poem_id>", methods=["DELETE"])
def delete_poem(poem_id):
    global poems_db
    for i, p in enumerate(poems_db):
        if p["id"] == poem_id:
            deleted = poems_db.pop(i)
            return jsonify({"deleted": copy.deepcopy(deleted)})
    return jsonify({"error": "诗笺不存在"}), 404


@app.route("/api/blessings", methods=["GET"])
def get_blessings():
    import random
    return jsonify({
        "blessings": BLESSINGS,
        "random": random.choice(BLESSINGS),
    })


@app.route("/api/blessings/random", methods=["GET"])
def get_random_blessing():
    import random
    return jsonify({"blessing": random.choice(BLESSINGS)})


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "poems": len(poems_db), "viewed": sum(1 for p in poems_db if p["viewed"])})


if __name__ == "__main__":
    print("=" * 60)
    print("  流光诗笺 · Flask 后端服务启动中")
    print("  监听端口: http://localhost:5000")
    print("  API 前缀: /api")
    print(f"  初始诗笺数: {len(poems_db)}  祝福语数: {len(BLESSINGS)}")
    print("=" * 60)
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)
