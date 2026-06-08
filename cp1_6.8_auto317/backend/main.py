import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from database import init_db, get_db
from models import (
    BottleCreate,
    BottleResponse,
    ResonanceCreate,
    ResonanceResponse,
    PassRequest,
    UserCreate,
    UserResponse,
    UserStats,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="气味漂流瓶", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/users", response_model=UserResponse)
async def create_user(data: UserCreate):
    user_id = str(uuid.uuid4())
    async with get_db() as db:
        await db.execute(
            "INSERT INTO users (id, nickname) VALUES (?, ?)",
            (user_id, data.nickname),
        )
        await db.commit()
        return UserResponse(id=user_id, nickname=data.nickname)


@app.get("/api/bottles/drift", response_model=list[BottleResponse])
async def drift_bottles(user_id: str = Query(...)):
    async with get_db() as db:
        cursor = await db.execute(
            """
            SELECT id, description, emoji, category, creator_id, resonance_count, created_at
            FROM bottles
            WHERE id NOT IN (
                SELECT bottle_id FROM passed_bottles WHERE user_id = ?
                UNION
                SELECT bottle_id FROM resonances WHERE user_id = ?
            )
            ORDER BY RANDOM() LIMIT 5
            """,
            (user_id, user_id),
        )
        rows = await cursor.fetchall()
        return [
            BottleResponse(
                id=row["id"],
                description=row["description"],
                emoji=row["emoji"],
                category=row["category"],
                creator_id=row["creator_id"],
                resonance_count=row["resonance_count"],
                created_at=row["created_at"],
            )
            for row in rows
        ]


@app.get("/api/bottles/hot", response_model=list[BottleResponse])
async def hot_bottles():
    async with get_db() as db:
        cursor = await db.execute(
            """
            SELECT id, description, emoji, category, creator_id, resonance_count, created_at
            FROM bottles ORDER BY resonance_count DESC LIMIT 20
            """
        )
        rows = await cursor.fetchall()
        return [
            BottleResponse(
                id=row["id"],
                description=row["description"],
                emoji=row["emoji"],
                category=row["category"],
                creator_id=row["creator_id"],
                resonance_count=row["resonance_count"],
                created_at=row["created_at"],
            )
            for row in rows
        ]


@app.post("/api/bottles", response_model=BottleResponse)
async def create_bottle(data: BottleCreate):
    bottle_id = str(uuid.uuid4())
    async with get_db() as db:
        await db.execute(
            "INSERT INTO bottles (id, description, emoji, category, creator_id) VALUES (?, ?, ?, ?, ?)",
            (bottle_id, data.description, data.emoji, data.category, data.creator_id),
        )
        await db.commit()
        cursor = await db.execute(
            "SELECT id, description, emoji, category, creator_id, resonance_count, created_at FROM bottles WHERE id = ?",
            (bottle_id,),
        )
        row = await cursor.fetchone()
        return BottleResponse(
            id=row["id"],
            description=row["description"],
            emoji=row["emoji"],
            category=row["category"],
            creator_id=row["creator_id"],
            resonance_count=row["resonance_count"],
            created_at=row["created_at"],
        )


@app.get("/api/bottles/{bottle_id}", response_model=BottleResponse)
async def get_bottle(bottle_id: str):
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT id, description, emoji, category, creator_id, resonance_count, created_at FROM bottles WHERE id = ?",
            (bottle_id,),
        )
        row = await cursor.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Bottle not found")
        return BottleResponse(
            id=row["id"],
            description=row["description"],
            emoji=row["emoji"],
            category=row["category"],
            creator_id=row["creator_id"],
            resonance_count=row["resonance_count"],
            created_at=row["created_at"],
        )


@app.post("/api/bottles/{bottle_id}/resonate", response_model=ResonanceResponse)
async def resonate_bottle(bottle_id: str, data: ResonanceCreate):
    async with get_db() as db:
        cursor = await db.execute("SELECT id FROM bottles WHERE id = ?", (bottle_id,))
        if await cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Bottle not found")

        cursor = await db.execute(
            "SELECT id FROM resonances WHERE bottle_id = ? AND user_id = ?",
            (bottle_id, data.user_id),
        )
        if await cursor.fetchone() is not None:
            raise HTTPException(status_code=400, detail="Already resonated with this bottle")

        resonance_id = str(uuid.uuid4())
        await db.execute(
            "INSERT INTO resonances (id, bottle_id, user_id, description, emoji) VALUES (?, ?, ?, ?, ?)",
            (resonance_id, bottle_id, data.user_id, data.description, data.emoji),
        )
        await db.execute(
            "UPDATE bottles SET resonance_count = resonance_count + 1 WHERE id = ?",
            (bottle_id,),
        )
        await db.commit()

        cursor = await db.execute(
            "SELECT id, bottle_id, description, emoji, user_id, created_at FROM resonances WHERE id = ?",
            (resonance_id,),
        )
        row = await cursor.fetchone()
        return ResonanceResponse(
            id=row["id"],
            bottle_id=row["bottle_id"],
            description=row["description"],
            emoji=row["emoji"],
            user_id=row["user_id"],
            created_at=row["created_at"],
        )


@app.get("/api/bottles/{bottle_id}/resonances", response_model=list[ResonanceResponse])
async def get_resonances(bottle_id: str):
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT id, bottle_id, description, emoji, user_id, created_at FROM resonances WHERE bottle_id = ?",
            (bottle_id,),
        )
        rows = await cursor.fetchall()
        return [
            ResonanceResponse(
                id=row["id"],
                bottle_id=row["bottle_id"],
                description=row["description"],
                emoji=row["emoji"],
                user_id=row["user_id"],
                created_at=row["created_at"],
            )
            for row in rows
        ]


@app.post("/api/bottles/{bottle_id}/pass")
async def pass_bottle(bottle_id: str, data: PassRequest):
    async with get_db() as db:
        cursor = await db.execute("SELECT id FROM bottles WHERE id = ?", (bottle_id,))
        if await cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Bottle not found")

        cursor = await db.execute(
            "SELECT id FROM passed_bottles WHERE bottle_id = ? AND user_id = ?",
            (bottle_id, data.user_id),
        )
        if await cursor.fetchone() is not None:
            raise HTTPException(status_code=400, detail="Already passed this bottle")

        pass_id = str(uuid.uuid4())
        await db.execute(
            "INSERT INTO passed_bottles (id, bottle_id, user_id) VALUES (?, ?, ?)",
            (pass_id, bottle_id, data.user_id),
        )
        await db.commit()
        return {"message": "Passed"}


@app.get("/api/users/{user_id}/published", response_model=list[BottleResponse])
async def get_user_published(user_id: str):
    async with get_db() as db:
        cursor = await db.execute(
            """
            SELECT id, description, emoji, category, creator_id, resonance_count, created_at
            FROM bottles WHERE creator_id = ? ORDER BY created_at DESC
            """,
            (user_id,),
        )
        rows = await cursor.fetchall()
        return [
            BottleResponse(
                id=row["id"],
                description=row["description"],
                emoji=row["emoji"],
                category=row["category"],
                creator_id=row["creator_id"],
                resonance_count=row["resonance_count"],
                created_at=row["created_at"],
            )
            for row in rows
        ]


@app.get("/api/users/{user_id}/resonated", response_model=list[BottleResponse])
async def get_user_resonated(user_id: str):
    async with get_db() as db:
        cursor = await db.execute(
            """
            SELECT b.id, b.description, b.emoji, b.category, b.creator_id, b.resonance_count, b.created_at
            FROM bottles b
            INNER JOIN resonances r ON b.id = r.bottle_id
            WHERE r.user_id = ?
            ORDER BY r.created_at DESC
            """,
            (user_id,),
        )
        rows = await cursor.fetchall()
        return [
            BottleResponse(
                id=row["id"],
                description=row["description"],
                emoji=row["emoji"],
                category=row["category"],
                creator_id=row["creator_id"],
                resonance_count=row["resonance_count"],
                created_at=row["created_at"],
            )
            for row in rows
        ]


@app.get("/api/users/{user_id}/stats", response_model=UserStats)
async def get_user_stats(user_id: str):
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT COUNT(*) FROM bottles WHERE creator_id = ?", (user_id,)
        )
        total_published = (await cursor.fetchone())[0]

        cursor = await db.execute(
            "SELECT COUNT(*) FROM resonances WHERE user_id = ?", (user_id,)
        )
        total_resonated = (await cursor.fetchone())[0]

        cursor = await db.execute(
            "SELECT category, COUNT(*) as cnt FROM bottles WHERE creator_id = ? GROUP BY category",
            (user_id,),
        )
        rows = await cursor.fetchall()
        category_distribution = {row["category"]: row["cnt"] for row in rows}

        return UserStats(
            total_published=total_published,
            total_resonated=total_resonated,
            category_distribution=category_distribution,
        )
