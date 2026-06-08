import asyncio
import json
import uuid
from datetime import datetime
from typing import Dict, List, Set, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="声波画板 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StrokeData:
    def __init__(self, stroke_id: str, user_id: str, color: str,
                 line_width: int, tool: str, points: List[Dict[str, float]]):
        self.id = stroke_id
        self.user_id = user_id
        self.color = color
        self.line_width = line_width
        self.tool = tool
        self.points = points
        self.created_at = datetime.utcnow().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "userId": self.user_id,
            "color": self.color,
            "lineWidth": self.line_width,
            "tool": self.tool,
            "points": self.points,
            "createdAt": self.created_at,
        }


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_ids: Dict[str, str] = {}
        self.strokes: Dict[str, StrokeData] = {}
        self.active_strokes: Dict[str, StrokeData] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        conn_id = str(uuid.uuid4())
        self.active_connections[conn_id] = websocket
        self.user_ids[conn_id] = user_id
        await self.broadcast_user_count()

    def disconnect(self, conn_id: str):
        self.active_connections.pop(conn_id, None)
        self.user_ids.pop(conn_id, None)

    async def broadcast(self, message: Dict[str, Any], exclude: str = None):
        data = json.dumps(message, ensure_ascii=False)
        disconnected = []
        for conn_id, ws in self.active_connections.items():
            if conn_id == exclude:
                continue
            try:
                await ws.send_text(data)
            except Exception:
                disconnected.append(conn_id)
        for conn_id in disconnected:
            self.disconnect(conn_id)

    async def broadcast_user_count(self):
        count = len(self.active_connections)
        await self.broadcast({"type": "user_count", "count": count})

    def add_stroke(self, stroke: StrokeData):
        self.active_strokes[stroke.id] = stroke

    def update_stroke(self, stroke_id: str, point: Dict[str, float]):
        if stroke_id in self.active_strokes:
            self.active_strokes[stroke_id].points.append(point)

    def finalize_stroke(self, stroke_id: str):
        if stroke_id in self.active_strokes:
            stroke = self.active_strokes.pop(stroke_id)
            self.strokes[stroke_id] = stroke

    def clear_all(self):
        self.strokes.clear()
        self.active_strokes.clear()

    def get_history(self) -> List[Dict[str, Any]]:
        return [s.to_dict() for s in self.strokes.values()]

    def get_connection_id(self, websocket: WebSocket) -> str:
        for conn_id, ws in self.active_connections.items():
            if ws is websocket:
                return conn_id
        return ""


manager = ConnectionManager()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, userId: str = "anonymous"):
    await manager.connect(websocket, userId)
    conn_id = manager.get_connection_id(websocket)

    try:
        history = manager.get_history()
        if history:
            await websocket.send_text(json.dumps({
                "type": "history",
                "strokes": history
            }, ensure_ascii=False))
    except Exception:
        pass

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get("type")

            if msg_type == "stroke_start":
                stroke_data = msg.get("stroke", {})
                stroke = StrokeData(
                    stroke_id=stroke_data.get("id", str(uuid.uuid4())),
                    user_id=stroke_data.get("userId", userId),
                    color=stroke_data.get("color", "#FF3B3B"),
                    line_width=stroke_data.get("lineWidth", 4),
                    tool=stroke_data.get("tool", "brush"),
                    points=stroke_data.get("points", []),
                )
                manager.add_stroke(stroke)
                await manager.broadcast(msg, exclude=conn_id)

            elif msg_type == "stroke_move":
                stroke_id = msg.get("strokeId", "")
                point = msg.get("point", {})
                manager.update_stroke(stroke_id, point)
                await manager.broadcast(msg, exclude=conn_id)

            elif msg_type == "stroke_end":
                stroke_id = msg.get("strokeId", "")
                manager.finalize_stroke(stroke_id)
                await manager.broadcast(msg, exclude=conn_id)

            elif msg_type == "clear":
                manager.clear_all()
                await manager.broadcast(msg, exclude=conn_id)

            elif msg_type == "note_event":
                await manager.broadcast(msg, exclude=conn_id)

            elif msg_type == "history":
                history = manager.get_history()
                try:
                    await websocket.send_text(json.dumps({
                        "type": "history",
                        "strokes": history
                    }, ensure_ascii=False))
                except Exception:
                    pass

    except WebSocketDisconnect:
        manager.disconnect(conn_id)
        await manager.broadcast_user_count()
    except Exception:
        manager.disconnect(conn_id)
        await manager.broadcast_user_count()


@app.get("/api/history")
async def get_history():
    return {"strokes": manager.get_history(), "count": len(manager.strokes)}


@app.get("/api/snapshot")
async def get_snapshot():
    return {
        "strokes": manager.get_history(),
        "activeUsers": len(manager.active_connections),
        "activeStrokes": len(manager.active_strokes),
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.delete("/api/clear")
async def clear_canvas():
    manager.clear_all()
    await manager.broadcast({"type": "clear"})
    return {"status": "cleared"}


@app.get("/api/stats")
async def get_stats():
    return {
        "totalStrokes": len(manager.strokes),
        "activeUsers": len(manager.active_connections),
        "activeStrokes": len(manager.active_strokes),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
