import json
import random
import string
import time
from flask import Flask, jsonify, request
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins="*")
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

with open("riddles.json", "r", encoding="utf-8") as f:
    RIDDLES = json.load(f)

CATEGORIES = sorted(set(r["category"] for r in RIDDLES))

ROOMS = {}
ROOM_TIMEOUT = 300


def gen_code(length=6):
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


def sanitize_answer(answer):
    return answer.strip().lower().replace(" ", "")


def get_room_state(room_code):
    room = ROOMS[room_code]
    return {
        "code": room_code,
        "name": room["name"],
        "host": room["host"],
        "players": room["players"],
        "riddles": [
            {k: v for k, v in r.items() if k != "answer"}
            for r in room["riddles"]
        ],
        "solved": room["solved"],
        "likes": room["likes"],
        "timeLeft": room["time_left"],
        "status": room["status"],
        "maxPlayers": room["max_players"],
        "category": room["category"],
    }


@app.route("/api/rooms", methods=["GET"])
def list_rooms():
    search = request.args.get("search", "").strip().lower()
    category = request.args.get("category", "").strip()
    result = []
    for code, room in ROOMS.items():
        if room["status"] == "finished":
            continue
        if search and search not in room["name"].lower() and search not in code.lower():
            continue
        if category and room["category"] != category and room["category"] != "all":
            continue
        result.append(get_room_state(code))
    return jsonify(result)


@app.route("/api/rooms", methods=["POST"])
def create_room():
    data = request.json or {}
    name = data.get("name", "回响灯谜")
    category = data.get("category", "all")
    max_players = min(max(data.get("maxPlayers", 8), 2), 8)
    player_name = data.get("playerName", f"玩家{random.randint(100,999)}")

    code = gen_code()
    while code in ROOMS:
        code = gen_code()

    if category == "all":
        pool = list(RIDDLES)
    else:
        pool = [r for r in RIDDLES if r["category"] == category]
    if not pool:
        pool = list(RIDDLES)

    selected = random.sample(pool, min(20, len(pool)))

    ROOMS[code] = {
        "name": name,
        "host": player_name,
        "players": [player_name],
        "riddles": selected,
        "solved": [],
        "likes": {},
        "time_left": ROOM_TIMEOUT,
        "status": "waiting",
        "max_players": max_players,
        "category": category,
        "timer_start": None,
    }

    return jsonify(get_room_state(code)), 201


@app.route("/api/rooms/<code>", methods=["GET"])
def get_room(code):
    if code not in ROOMS:
        return jsonify({"error": "房间不存在"}), 404
    return jsonify(get_room_state(code))


@app.route("/api/rooms/<code>/join", methods=["POST"])
def join_room_api(code):
    if code not in ROOMS:
        return jsonify({"error": "房间不存在"}), 404
    room = ROOMS[code]
    data = request.json or {}
    player_name = data.get("playerName", f"玩家{random.randint(100,999)}")

    if len(room["players"]) >= room["max_players"]:
        return jsonify({"error": "房间已满"}), 400
    if player_name in room["players"]:
        return jsonify({"error": "该昵称已被使用"}), 400
    if room["status"] == "finished":
        return jsonify({"error": "游戏已结束"}), 400

    room["players"].append(player_name)
    return jsonify(get_room_state(code))


@app.route("/api/categories", methods=["GET"])
def get_categories():
    return jsonify(CATEGORIES)


@socketio.on("connect")
def on_connect():
    pass


@socketio.on("disconnect")
def on_disconnect():
    pass


@socketio.on("join_room")
def on_join_room(data):
    code = data.get("roomCode", "")
    player_name = data.get("playerName", "")
    if code not in ROOMS:
        emit("error", {"message": "房间不存在"})
        return
    room = ROOMS[code]
    if player_name not in room["players"]:
        room["players"].append(player_name)
    join_room(code)
    emit("room_update", get_room_state(code), room=code)


@socketio.on("start_game")
def on_start_game(data):
    code = data.get("roomCode", "")
    if code not in ROOMS:
        emit("error", {"message": "房间不存在"})
        return
    room = ROOMS[code]
    room["status"] = "playing"
    room["timer_start"] = time.time()
    emit("room_update", get_room_state(code), room=code)
    emit("game_started", get_room_state(code), room=code)


@socketio.on("submit_answer")
def on_submit_answer(data):
    code = data.get("roomCode", "")
    riddle_id = data.get("riddleId")
    answer = data.get("answer", "")
    player_name = data.get("playerName", "")

    if code not in ROOMS:
        emit("answer_result", {"correct": False, "message": "房间不存在"})
        return

    room = ROOMS[code]
    if room["status"] != "playing":
        emit("answer_result", {"correct": False, "message": "游戏未开始"})
        return

    riddle = None
    for r in room["riddles"]:
        if r["id"] == riddle_id:
            riddle = r
            break

    if riddle is None:
        emit("answer_result", {"correct": False, "message": "谜题不存在"})
        return

    if riddle_id in room["solved"]:
        emit("answer_result", {"correct": False, "message": "已被解答"})
        return

    clean_answer = sanitize_answer(answer)
    clean_correct = sanitize_answer(riddle["answer"])

    if clean_answer == clean_correct:
        room["solved"].append(riddle_id)
        room["likes"][riddle_id] = room["likes"].get(riddle_id, [])
        emit(
            "answer_result",
            {
                "correct": True,
                "riddleId": riddle_id,
                "playerName": player_name,
                "answer": riddle["answer"],
            },
            room=code,
        )
        if len(room["solved"]) >= len(room["riddles"]):
            room["status"] = "finished"
            emit("game_over", get_room_state(code), room=code)
    else:
        emit(
            "answer_result",
            {
                "correct": False,
                "riddleId": riddle_id,
                "playerName": player_name,
                "message": "答案不对，再想想！",
            },
            room=code,
        )


@socketio.on("like_riddle")
def on_like_riddle(data):
    code = data.get("roomCode", "")
    riddle_id = data.get("riddleId")
    player_name = data.get("playerName", "")

    if code not in ROOMS:
        return
    room = ROOMS[code]
    if riddle_id not in room["solved"]:
        return
    if riddle_id not in room["likes"]:
        room["likes"][riddle_id] = []
    if player_name not in room["likes"][riddle_id]:
        room["likes"][riddle_id].append(player_name)
    emit(
        "like_update",
        {"riddleId": riddle_id, "likes": room["likes"][riddle_id]},
        room=code,
    )


@socketio.on("tick")
def on_tick(data):
    code = data.get("roomCode", "")
    if code not in ROOMS:
        return
    room = ROOMS[code]
    if room["status"] != "playing" or room["timer_start"] is None:
        return
    elapsed = time.time() - room["timer_start"]
    room["time_left"] = max(0, ROOM_TIMEOUT - int(elapsed))
    if room["time_left"] <= 0:
        room["status"] = "finished"
        emit("game_over", get_room_state(code), room=code)
    emit("timer_update", {"timeLeft": room["time_left"]}, room=code)


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
