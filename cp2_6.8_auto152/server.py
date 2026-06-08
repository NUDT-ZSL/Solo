import asyncio
import time
import json
from typing import Dict, List, Any, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio

sio = socketio.AsyncServer(
    cors_allowed_origins="*",
    async_mode="asgi",
    ping_timeout=20,
    ping_interval=25
)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

socketio_app = socketio.ASGIApp(sio, app)

boards: Dict[str, Dict[str, Any]] = {}


def get_board(board_id: str) -> Optional[Dict[str, Any]]:
    if board_id not in boards:
        boards[board_id] = {
            "elements": [],
            "history": [],
            "users": {},
            "sockets": {}
        }
    return boards[board_id]


@sio.event
async def connect(sid: str, environ):
    print(f"Client connected: {sid}")


@sio.event
async def disconnect(sid: str):
    print(f"Client disconnected: {sid}")
    for board_id, board in boards.items():
        if sid in board["sockets"]:
            user_id = board["sockets"][sid]
            del board["sockets"][sid]
            if user_id in board["users"]:
                board["users"][user_id]["lastSeen"] = int(time.time() * 1000)
            await sio.emit("user_left", user_id, room=board_id)
            await sio.emit("user_presence", {
                "userId": user_id,
                "lastSeen": int(time.time() * 1000)
            }, room=board_id)
            break


@sio.event
async def join_board(sid: str, data):
    board_id = data.get("boardId", "")
    user = data.get("user", {})
    user_id = user.get("id", "")

    if not board_id or not user_id:
        return

    board = get_board(board_id)
    board["sockets"][sid] = user_id

    user["lastSeen"] = int(time.time() * 1000)
    user["cursor"] = None
    board["users"][user_id] = user

    await sio.enter_room(sid, board_id)

    await sio.emit("board_state", {
        "elements": board["elements"],
        "history": board["history"],
        "users": list(board["users"].values())
    }, to=sid)

    await sio.emit("user_joined", user, room=board_id, skip_sid=sid)


@sio.event
async def update_cursor(sid: str, data):
    board_id = data.get("boardId", "")
    user_id = data.get("userId", "")
    cursor = data.get("cursor", None)

    board = boards.get(board_id)
    if not board or user_id not in board["users"]:
        return

    board["users"][user_id]["cursor"] = cursor
    board["users"][user_id]["lastSeen"] = int(time.time() * 1000)

    await sio.emit("cursor_update", {
        "userId": user_id,
        "cursor": cursor
    }, room=board_id, skip_sid=sid)


@sio.event
async def add_element(sid: str, data):
    board_id = data.get("boardId", "")
    element = data.get("element")
    history_entry = data.get("historyEntry")

    board = boards.get(board_id)
    if not board:
        return

    board["elements"].append(element)
    board["history"].insert(0, history_entry)
    if len(board["history"]) > 200:
        board["history"] = board["history"][:200]

    await sio.emit("element_added", {
        "element": element,
        "historyEntry": history_entry
    }, room=board_id, skip_sid=sid)


@sio.event
async def move_element(sid: str, data):
    board_id = data.get("boardId", "")
    element_id = data.get("elementId", "")
    x = data.get("x", 0)
    y = data.get("y", 0)
    history_entry = data.get("historyEntry")

    board = boards.get(board_id)
    if not board:
        return

    for el in board["elements"]:
        if el.get("id") == element_id and el.get("type") in ["sticky", "emoji"]:
            el["x"] = x
            el["y"] = y
            break

    board["history"].insert(0, history_entry)
    if len(board["history"]) > 200:
        board["history"] = board["history"][:200]

    await sio.emit("element_moved", {
        "elementId": element_id,
        "x": x,
        "y": y,
        "historyEntry": history_entry
    }, room=board_id, skip_sid=sid)


@sio.event
async def clear_canvas(sid: str, data):
    board_id = data.get("boardId", "")
    history_entry = data.get("historyEntry")

    board = boards.get(board_id)
    if not board:
        return

    board["elements"] = []
    board["history"].insert(0, history_entry)
    if len(board["history"]) > 200:
        board["history"] = board["history"][:200]

    await sio.emit("canvas_cleared", history_entry, room=board_id, skip_sid=sid)


@app.get("/api/health")
async def health():
    return {"status": "ok", "boards": len(boards)}


@app.get("/api/boards/{board_id}")
async def get_board_state(board_id: str):
    board = boards.get(board_id)
    if not board:
        return {"exists": False}
    return {
        "exists": True,
        "elementCount": len(board["elements"]),
        "historyCount": len(board["history"]),
        "userCount": len(board["users"])
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(socketio_app, host="0.0.0.0", port=8000, log_level="info")
