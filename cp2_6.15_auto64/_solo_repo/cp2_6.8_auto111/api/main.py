from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .models import RetroCreate, RetroResponse
from .storage import storage
from .services.word_freq import analyze_word_freq
from .services.sentiment import analyze_sentiment


app = FastAPI(title="Retro API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _build_response() -> RetroResponse:
    items = storage.get_all()
    word_freq = analyze_word_freq(items)
    sentiment = analyze_sentiment(items)
    return RetroResponse(items=items, word_freq=word_freq, sentiment=sentiment)


@app.post("/api/retro", response_model=RetroResponse, status_code=200)
async def create_retro(data: RetroCreate):
    try:
        storage.add_item(data.type, data.content)
        return _build_response()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/retro", response_model=RetroResponse, status_code=200)
async def get_retro():
    try:
        return _build_response()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/retro/{item_id}", response_model=RetroResponse, status_code=200)
async def delete_retro(item_id: str):
    try:
        deleted = storage.delete_item(item_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Item not found")
        return _build_response()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
