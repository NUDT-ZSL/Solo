import os
import uuid
import json
import random
import math
import sqlite3
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, g
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
DB_PATH = os.path.join(BASE_DIR, "sculptures.db")

os.makedirs(UPLOAD_DIR, exist_ok=True)

EMOTION_TAGS = ["宁静", "柔和", "明亮", "活力", "温暖", "深沉", "空灵", "激烈"]


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = sqlite3.connect(DB_PATH)
    db.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS sculptures (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            tags TEXT NOT NULL DEFAULT '',
            features TEXT NOT NULL DEFAULT '{}',
            audio_filename TEXT,
            created_at TEXT NOT NULL
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS favorites (
            user_id TEXT NOT NULL,
            sculpture_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY (user_id, sculpture_id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (sculpture_id) REFERENCES sculptures(id)
        )
    """)
    db.commit()

    cursor = db.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        demo_user_id = str(uuid.uuid4())
        db.execute(
            "INSERT INTO users (id, username, created_at) VALUES (?, ?, ?)",
            (demo_user_id, "demo", datetime.utcnow().isoformat()),
        )

        sample_sculptures = [
            {
                "name": "晨间鸟鸣",
                "tags": "自然,清晨,鸟鸣,宁静",
                "feature_seed": {
                    "freq_bias": "high",
                    "energy_range": (0.2, 0.6),
                    "emotions": ["宁静", "明亮", "空灵"],
                    "duration": 8.5,
                },
            },
            {
                "name": "雨夜独白",
                "tags": "雨,夜晚,沉思,深沉",
                "feature_seed": {
                    "freq_bias": "low",
                    "energy_range": (0.1, 0.4),
                    "emotions": ["深沉", "柔和", "宁静"],
                    "duration": 12.0,
                },
            },
            {
                "name": "城市脉搏",
                "tags": "城市,节奏,活力,现代",
                "feature_seed": {
                    "freq_bias": "mid",
                    "energy_range": (0.4, 0.9),
                    "emotions": ["活力", "激烈", "明亮"],
                    "duration": 6.0,
                },
            },
            {
                "name": "山林风语",
                "tags": "山,风,自然,空灵",
                "feature_seed": {
                    "freq_bias": "mid",
                    "energy_range": (0.15, 0.5),
                    "emotions": ["空灵", "柔和", "宁静"],
                    "duration": 15.0,
                },
            },
            {
                "name": "海浪低吟",
                "tags": "海,浪,潮汐,温暖",
                "feature_seed": {
                    "freq_bias": "low",
                    "energy_range": (0.2, 0.55),
                    "emotions": ["温暖", "深沉", "柔和"],
                    "duration": 18.0,
                },
            },
            {
                "name": "星空回响",
                "tags": "星空,宇宙,回响,空灵",
                "feature_seed": {
                    "freq_bias": "high",
                    "energy_range": (0.1, 0.5),
                    "emotions": ["空灵", "明亮", "温暖"],
                    "duration": 10.0,
                },
            },
        ]

        for s in sample_sculptures:
            sid = str(uuid.uuid4())
            features = generate_features(s["feature_seed"])
            db.execute(
                "INSERT INTO sculptures (id, name, tags, features, audio_filename, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (sid, s["name"], s["tags"], json.dumps(features, ensure_ascii=False), None, datetime.utcnow().isoformat()),
            )

        db.commit()
    db.close()


def freq_to_color(freq_ratio):
    low_color = (255, 107, 53)
    mid_color = (0, 212, 170)
    high_color = (123, 104, 238)

    if freq_ratio <= 0.5:
        t = freq_ratio / 0.5
        r = int(low_color[0] + (mid_color[0] - low_color[0]) * t)
        g = int(low_color[1] + (mid_color[1] - low_color[1]) * t)
        b = int(low_color[2] + (mid_color[2] - low_color[2]) * t)
    else:
        t = (freq_ratio - 0.5) / 0.5
        r = int(mid_color[0] + (high_color[0] - mid_color[0]) * t)
        g = int(mid_color[1] + (high_color[1] - mid_color[1]) * t)
        b = int(mid_color[2] + (high_color[2] - mid_color[2]) * t)

    return "#{:02x}{:02x}{:02x}".format(
        max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b))
    )


def generate_features(seed=None):
    num_bands = 32
    freq_min = 20.0
    freq_max = 20000.0

    log_min = math.log10(freq_min)
    log_max = math.log10(freq_max)
    log_step = (log_max - log_min) / num_bands

    bands = []
    for i in range(num_bands):
        center_freq = 10 ** (log_min + log_step * (i + 0.5))
        freq_ratio = i / (num_bands - 1)

        if seed:
            energy_min, energy_max = seed["energy_range"]
            if seed["freq_bias"] == "low":
                weight = 1.0 - freq_ratio * 0.6
            elif seed["freq_bias"] == "high":
                weight = 0.4 + freq_ratio * 0.6
            else:
                weight = 1.0 - abs(freq_ratio - 0.5) * 0.4
            energy = round(random.uniform(energy_min, energy_max) * weight, 3)
            emotion_tag = random.choice(seed["emotions"])
        else:
            energy = round(random.uniform(0.05, 0.95), 3)
            emotion_tag = random.choice(EMOTION_TAGS)

        energy = max(0.0, min(1.0, energy))
        color = freq_to_color(freq_ratio)

        bands.append({
            "centerFreq": round(center_freq, 1),
            "energy": energy,
            "emotionTag": emotion_tag,
            "color": color,
        })

    duration = seed["duration"] if seed else round(random.uniform(5.0, 20.0), 1)

    num_peaks = random.randint(3, 12)
    rhythm_peaks = sorted(round(random.uniform(0, duration), 2) for _ in range(num_peaks))

    return {
        "frequencyBands": bands,
        "rhythmPeaks": rhythm_peaks,
        "duration": duration,
    }


@app.route("/api/upload", methods=["POST"])
def upload():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files["audio"]
    name = request.form.get("name", "Untitled")

    if not audio_file.filename:
        return jsonify({"error": "Empty filename"}), 400

    ext = os.path.splitext(audio_file.filename)[1] or ".wav"
    filename = str(uuid.uuid4()) + ext
    filepath = os.path.join(UPLOAD_DIR, filename)
    audio_file.save(filepath)

    features = generate_features()

    db = get_db()
    sculpture_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    tags = request.form.get("tags", "")

    db.execute(
        "INSERT INTO sculptures (id, name, tags, features, audio_filename, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (sculpture_id, name, tags, json.dumps(features, ensure_ascii=False), filename, now),
    )
    db.commit()

    return jsonify({
        "sculptureId": sculpture_id,
        "features": features,
    }), 201


@app.route("/api/sculptures/<sculpture_id>", methods=["GET"])
def get_sculpture(sculpture_id):
    db = get_db()
    row = db.execute("SELECT * FROM sculptures WHERE id = ?", (sculpture_id,)).fetchone()
    if not row:
        return jsonify({"error": "Sculpture not found"}), 404

    return jsonify(row_to_dict(row))


@app.route("/api/sculptures", methods=["GET"])
def list_sculptures():
    page = max(1, int(request.args.get("page", 1)))
    limit = max(1, min(100, int(request.args.get("limit", 20))))
    offset = (page - 1) * limit

    db = get_db()
    total = db.execute("SELECT COUNT(*) FROM sculptures").fetchone()[0]
    rows = db.execute("SELECT * FROM sculptures ORDER BY created_at DESC LIMIT ? OFFSET ?", (limit, offset)).fetchall()

    return jsonify({
        "items": [row_to_dict(r) for r in rows],
        "total": total,
        "page": page,
        "limit": limit,
    })


@app.route("/api/search", methods=["GET"])
def search():
    q = request.args.get("q", "").strip()
    page = max(1, int(request.args.get("page", 1)))
    limit = max(1, min(100, int(request.args.get("limit", 20))))
    offset = (page - 1) * limit

    if not q:
        return jsonify({"error": "Query parameter q is required"}), 400

    db = get_db()
    like = f"%{q}%"
    total = db.execute("SELECT COUNT(*) FROM sculptures WHERE name LIKE ? OR tags LIKE ?", (like, like)).fetchone()[0]
    rows = db.execute("SELECT * FROM sculptures WHERE name LIKE ? OR tags LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?", (like, like, limit, offset)).fetchall()

    return jsonify({
        "items": [row_to_dict(r) for r in rows],
        "total": total,
        "page": page,
        "limit": limit,
    })


@app.route("/api/random", methods=["GET"])
def random_sculpture():
    db = get_db()
    row = db.execute("SELECT * FROM sculptures ORDER BY RANDOM() LIMIT 1").fetchone()
    if not row:
        return jsonify({"error": "No sculptures available"}), 404
    return jsonify(row_to_dict(row))


@app.route("/api/favorites", methods=["GET"])
def list_favorites():
    user_id = request.args.get("userId", "").strip()
    if not user_id:
        return jsonify({"error": "userId is required"}), 400

    db = get_db()
    rows = db.execute(
        """SELECT s.* FROM sculptures s
           JOIN favorites f ON s.id = f.sculpture_id
           WHERE f.user_id = ?
           ORDER BY f.created_at DESC""",
        (user_id,),
    ).fetchall()

    return jsonify({"items": [row_to_dict(r) for r in rows]})


@app.route("/api/favorites", methods=["POST"])
def add_favorite():
    data = request.get_json()
    if not data:
        return jsonify({"error": "JSON body required"}), 400

    user_id = data.get("userId", "").strip()
    sculpture_id = data.get("sculptureId", "").strip()

    if not user_id or not sculpture_id:
        return jsonify({"error": "userId and sculptureId are required"}), 400

    db = get_db()
    user = db.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        return jsonify({"error": "User not found"}), 404

    sculpture = db.execute("SELECT id FROM sculptures WHERE id = ?", (sculpture_id,)).fetchone()
    if not sculpture:
        return jsonify({"error": "Sculpture not found"}), 404

    existing = db.execute("SELECT 1 FROM favorites WHERE user_id = ? AND sculpture_id = ?", (user_id, sculpture_id)).fetchone()
    if existing:
        return jsonify({"message": "Already favorited"}), 200

    now = datetime.utcnow().isoformat()
    db.execute("INSERT INTO favorites (user_id, sculpture_id, created_at) VALUES (?, ?, ?)", (user_id, sculpture_id, now))
    db.commit()

    return jsonify({"message": "Favorite added"}), 201


@app.route("/api/favorites/<sculpture_id>", methods=["DELETE"])
def remove_favorite(sculpture_id):
    user_id = request.args.get("userId", "").strip()
    if not user_id:
        return jsonify({"error": "userId is required"}), 400

    db = get_db()
    db.execute("DELETE FROM favorites WHERE user_id = ? AND sculpture_id = ?", (user_id, sculpture_id))
    db.commit()

    return jsonify({"message": "Favorite removed"}), 200


@app.route("/uploads/<path:filename>", methods=["GET"])
def serve_upload(filename):
    return send_from_directory(UPLOAD_DIR, filename)


def row_to_dict(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "tags": row["tags"],
        "features": json.loads(row["features"]) if row["features"] else {},
        "audioFilename": row["audio_filename"],
        "createdAt": row["created_at"],
    }


init_db()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
