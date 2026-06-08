from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from data_store import IdeaCreateRequest, InspireRequest, store

app = FastAPI(title="灵感网格 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/ideas")
def get_ideas():
    return store.get_all()

@app.post("/api/ideas")
def create_idea(req: IdeaCreateRequest):
    if not req.content or not req.content.strip():
        raise HTTPException(status_code=400, detail="创意内容不能为空")
    if len(req.content) > 50:
        raise HTTPException(status_code=400, detail="创意内容不能超过50字")
    return store.create(req.content.strip())

@app.post("/api/ideas/inspire")
def inspire_idea(req: InspireRequest):
    result = store.inspire(req.fromId, req.toId)
    if not result:
        raise HTTPException(status_code=404, detail="目标创意不存在")
    return result

@app.get("/api/ideas/leaderboard")
def get_leaderboard():
    return store.get_leaderboard(10)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
