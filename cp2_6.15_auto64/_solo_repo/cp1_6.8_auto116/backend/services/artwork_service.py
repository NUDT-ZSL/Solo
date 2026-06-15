import json
import os
import uuid
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage")

USERS_FILE = os.path.join(DATA_DIR, "users.json")
ARTWORKS_FILE = os.path.join(DATA_DIR, "artworks.json")


def _read_json(path: str):
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _write_json(path: str, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def register_user(username: str) -> dict:
    users = _read_json(USERS_FILE)
    for u in users:
        if u["username"] == username:
            return {"token": u["token"], "username": u["username"]}
    token = str(uuid.uuid4())
    user = {"username": username, "token": token}
    users.append(user)
    _write_json(USERS_FILE, users)
    return {"token": token, "username": username}


def login_user(username: str) -> dict | None:
    users = _read_json(USERS_FILE)
    for u in users:
        if u["username"] == username:
            return {"token": u["token"], "username": u["username"]}
    return None


def verify_token(token: str) -> str | None:
    users = _read_json(USERS_FILE)
    for u in users:
        if u["token"] == token:
            return u["username"]
    return None


def get_artworks(page: int = 1, page_size: int = 50) -> dict:
    artworks = _read_json(ARTWORKS_FILE)
    total = len(artworks)
    start = (page - 1) * page_size
    end = start + page_size
    items = artworks[start:end]
    return {
        "artworks": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def get_artwork(artwork_id: str) -> dict | None:
    artworks = _read_json(ARTWORKS_FILE)
    for a in artworks:
        if a["id"] == artwork_id:
            return a
    return None


def create_artwork(title: str, tags: list[str], image_base64: str) -> dict:
    artworks = _read_json(ARTWORKS_FILE)
    artwork_id = str(uuid.uuid4())
    image_data = image_base64
    if "," in image_data:
        image_data = image_data.split(",", 1)[1]

    import base64
    img_bytes = base64.b64decode(image_data)
    img_path = os.path.join(STORAGE_DIR, f"{artwork_id}.png")
    with open(img_path, "wb") as f:
        f.write(img_bytes)

    artwork = {
        "id": artwork_id,
        "title": title,
        "tags": tags,
        "image_url": f"/storage/{artwork_id}.png",
        "upload_time": datetime.utcnow().isoformat() + "Z",
        "likes": [],
        "comments": [],
    }
    artworks.append(artwork)
    _write_json(ARTWORKS_FILE, artworks)
    return {"id": artwork_id}


def toggle_like(artwork_id: str, username: str) -> dict | None:
    artworks = _read_json(ARTWORKS_FILE)
    for a in artworks:
        if a["id"] == artwork_id:
            if username in a["likes"]:
                a["likes"].remove(username)
            else:
                a["likes"].append(username)
            _write_json(ARTWORKS_FILE, artworks)
            return {"likes": len(a["likes"]), "liked": username in a["likes"]}
    return None


def add_comment(artwork_id: str, username: str, content: str) -> dict | None:
    artworks = _read_json(ARTWORKS_FILE)
    for a in artworks:
        if a["id"] == artwork_id:
            comment = {
                "id": str(uuid.uuid4()),
                "username": username,
                "content": content,
                "created_at": datetime.utcnow().isoformat() + "Z",
            }
            a["comments"].append(comment)
            _write_json(ARTWORKS_FILE, artworks)
            return comment
    return None
