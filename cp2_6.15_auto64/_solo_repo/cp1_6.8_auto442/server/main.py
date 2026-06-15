from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uuid
import json
import os

app = FastAPI(title="灵感图谱 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = os.path.join(os.path.dirname(__file__), "data.json")

class CardCreate(BaseModel):
    title: str = "新灵感"
    description: str = ""
    color: str = "#6c8cff"
    x: float = 0
    y: float = 0

class CardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None

class ConnectionCreate(BaseModel):
    source_id: str
    target_id: str
    source_offset_x: float = 0
    source_offset_y: float = 0
    target_offset_x: float = 0
    target_offset_y: float = 0

class ConnectionUpdate(BaseModel):
    source_offset_x: Optional[float] = None
    source_offset_y: Optional[float] = None
    target_offset_x: Optional[float] = None
    target_offset_y: Optional[float] = None

def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"cards": {}, "connections": {}}

def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

@app.get("/api/graph")
def get_graph():
    return load_data()

@app.post("/api/cards")
def create_card(card: CardCreate):
    data = load_data()
    card_id = str(uuid.uuid4())[:8]
    data["cards"][card_id] = {
        "id": card_id,
        "title": card.title,
        "description": card.description,
        "color": card.color,
        "x": card.x,
        "y": card.y,
    }
    save_data(data)
    return data["cards"][card_id]

@app.put("/api/cards/{card_id}")
def update_card(card_id: str, card: CardUpdate):
    data = load_data()
    if card_id not in data["cards"]:
        raise HTTPException(status_code=404, detail="Card not found")
    existing = data["cards"][card_id]
    update_data = card.model_dump(exclude_none=True)
    existing.update(update_data)
    save_data(data)
    return existing

@app.delete("/api/cards/{card_id}")
def delete_card(card_id: str):
    data = load_data()
    if card_id not in data["cards"]:
        raise HTTPException(status_code=404, detail="Card not found")
    del data["cards"][card_id]
    to_delete = [cid for cid, conn in data["connections"].items()
                 if conn["source_id"] == card_id or conn["target_id"] == card_id]
    for cid in to_delete:
        del data["connections"][cid]
    save_data(data)
    return {"ok": True}

@app.post("/api/connections")
def create_connection(conn: ConnectionCreate):
    data = load_data()
    if conn.source_id not in data["cards"] or conn.target_id not in data["cards"]:
        raise HTTPException(status_code=404, detail="Card not found")
    conn_id = str(uuid.uuid4())[:8]
    data["connections"][conn_id] = {
        "id": conn_id,
        "source_id": conn.source_id,
        "target_id": conn.target_id,
        "source_offset_x": conn.source_offset_x,
        "source_offset_y": conn.source_offset_y,
        "target_offset_x": conn.target_offset_x,
        "target_offset_y": conn.target_offset_y,
    }
    save_data(data)
    return data["connections"][conn_id]

@app.put("/api/connections/{conn_id}")
def update_connection(conn_id: str, conn: ConnectionUpdate):
    data = load_data()
    if conn_id not in data["connections"]:
        raise HTTPException(status_code=404, detail="Connection not found")
    existing = data["connections"][conn_id]
    update_data = conn.model_dump(exclude_none=True)
    existing.update(update_data)
    save_data(data)
    return existing

@app.delete("/api/connections/{conn_id}")
def delete_connection(conn_id: str):
    data = load_data()
    if conn_id not in data["connections"]:
        raise HTTPException(status_code=404, detail="Connection not found")
    del data["connections"][conn_id]
    save_data(data)
    return {"ok": True}

@app.get("/api/vitality")
def get_vitality():
    data = load_data()
    card_count = len(data["cards"])
    conn_count = len(data["connections"])
    max_possible = max(card_count * (card_count - 1) / 2, 1)
    density = conn_count / max_possible if card_count > 1 else 0
    vitality = min(100, (card_count * 5 + density * 50 + conn_count * 3))
    return {"vitality": vitality, "card_count": card_count, "connection_count": conn_count, "density": density}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
