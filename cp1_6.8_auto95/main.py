from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
from jose import jwt, jwe
import json
import os
import uuid
from apscheduler.schedulers.background import BackgroundScheduler

app = FastAPI(title="时光胶囊", description="匿名未来信件投递应用")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = "letters_data.json"
ENCRYPTION_KEY = "time-capsule-secret-key-2024-very-long"
JWT_SECRET = "jwt-time-capsule-secret-2024"
ALGORITHM = "HS256"

class LetterCreate(BaseModel):
    content: str
    title: str
    emotion: str
    deliver_at: str
    email: str = ""

class LetterTokenQuery(BaseModel):
    token: str

def load_letters():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def save_letters(letters):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(letters, f, ensure_ascii=False, indent=2)

def encrypt_content(content: str) -> str:
    payload = content.encode("utf-8")
    token = jwt.encode({"data": content}, JWT_SECRET, algorithm=ALGORITHM)
    return token

def decrypt_content(encrypted: str) -> str:
    try:
        payload = jwt.decode(encrypted, JWT_SECRET, algorithms=[ALGORITHM])
        return payload.get("data", "")
    except Exception:
        return ""

def generate_anonymous_token() -> str:
    return str(uuid.uuid4())

def check_and_notify_due_letters():
    letters = load_letters()
    now = datetime.now()
    changed = False
    for letter in letters:
        if letter["status"] == "sealed":
            deliver_time = datetime.fromisoformat(letter["deliver_at"])
            if now >= deliver_time:
                letter["status"] = "delivered"
                letter["notified"] = True
                letter["delivered_at"] = now.isoformat()
                changed = True
                print(f"[NotificationScheduler] 信件 '{letter['title']}' 已到期，邮件通知已发送至 {letter.get('email', '匿名')}")
    if changed:
        save_letters(letters)

scheduler = BackgroundScheduler()
scheduler.add_job(check_and_notify_due_letters, "interval", minutes=1)

@app.on_event("startup")
async def startup_event():
    if not os.path.exists(DATA_FILE):
        save_letters([])
    scheduler.start()

@app.on_event("shutdown")
async def shutdown_event():
    scheduler.shutdown()

@app.post("/api/letters")
async def create_letter(letter: LetterCreate):
    try:
        deliver_at = datetime.fromisoformat(letter.deliver_at)
    except ValueError:
        raise HTTPException(status_code=400, detail="日期格式无效")

    now = datetime.now()
    min_deliver = now + timedelta(days=365)
    max_deliver = now + timedelta(days=3650)

    if deliver_at < min_deliver:
        raise HTTPException(status_code=400, detail="投递日期至少为1年后")
    if deliver_at > max_deliver:
        raise HTTPException(status_code=400, detail="投递日期最多为10年后")

    encrypted = encrypt_content(letter.content)
    token = generate_anonymous_token()

    letter_data = {
        "id": str(uuid.uuid4()),
        "title": letter.title,
        "encrypted_content": encrypted,
        "emotion": letter.emotion,
        "deliver_at": letter.deliver_at,
        "email": letter.email,
        "status": "sealed",
        "notified": False,
        "created_at": now.isoformat(),
        "delivered_at": None,
        "owner_token": token,
    }

    letters = load_letters()
    letters.append(letter_data)
    save_letters(letters)

    return {
        "id": letter_data["id"],
        "owner_token": token,
        "message": "时光胶囊已封存，将在指定日期送达",
        "deliver_at": letter.deliver_at,
    }

@app.get("/api/letters/{token}")
async def get_letters_by_token(token: str):
    letters = load_letters()
    user_letters = [l for l in letters if l["owner_token"] == token]

    if not user_letters:
        raise HTTPException(status_code=404, detail="未找到该令牌对应的信件")

    result = []
    for l in user_letters:
        item = {
            "id": l["id"],
            "title": l["title"],
            "emotion": l["emotion"],
            "deliver_at": l["deliver_at"],
            "status": l["status"],
            "created_at": l["created_at"],
        }
        if l["status"] == "delivered":
            item["content"] = decrypt_content(l["encrypted_content"])
            item["delivered_at"] = l.get("delivered_at")
        else:
            deliver_time = datetime.fromisoformat(l["deliver_at"])
            remaining = deliver_time - datetime.now()
            item["remaining_days"] = max(0, remaining.days)
        result.append(item)

    return {"letters": result}

@app.post("/api/letters/{letter_id}/open")
async def open_letter(letter_id: str, body: LetterTokenQuery):
    letters = load_letters()
    target = None
    for l in letters:
        if l["id"] == letter_id and l["owner_token"] == body.token:
            target = l
            break

    if not target:
        raise HTTPException(status_code=404, detail="信件不存在或令牌无效")

    if target["status"] != "delivered":
        raise HTTPException(status_code=400, detail="信件尚未到期")

    target["status"] = "opened"
    save_letters(letters)

    return {
        "id": target["id"],
        "title": target["title"],
        "content": decrypt_content(target["encrypted_content"]),
        "emotion": target["emotion"],
        "deliver_at": target["deliver_at"],
        "delivered_at": target.get("delivered_at"),
        "created_at": target["created_at"],
    }

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}
