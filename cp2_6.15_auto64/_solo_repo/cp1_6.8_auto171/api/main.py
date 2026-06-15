from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db
from .routers import encouragement, meditations, stats

app = FastAPI(title="呼吸回响", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meditations.router)
app.include_router(stats.router)
app.include_router(encouragement.router)


@app.on_event("startup")
async def startup():
    await init_db()
