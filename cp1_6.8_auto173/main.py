import json
import random
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="词汇联想API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_PATH = Path(__file__).parent / "word_data.json"

with open(DATA_PATH, "r", encoding="utf-8") as f:
    raw_data = json.load(f)

word_list = raw_data["words"]
word_index: dict[str, dict] = {w["word"]: w for w in word_list}


class AssociationItem(BaseModel):
    word: str
    strength: float


class WordResponse(BaseModel):
    word: str
    pos: str
    definition: str
    examples: list[str]
    associations: list[AssociationItem]


class AssociationNode(BaseModel):
    word: str
    pos: str
    definition: str
    strength: float


class WordAssociationResponse(BaseModel):
    word: str
    pos: str
    definition: str
    examples: list[str]
    associations: list[AssociationNode]


class SearchResult(BaseModel):
    word: str
    pos: str
    definition: str


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResult]


@app.get("/api/word/associations", response_model=Optional[WordAssociationResponse])
def get_associations(word: str = Query(..., description="查询的词汇")):
    entry = word_index.get(word)
    if not entry:
        return None
    assoc_nodes = []
    for a in entry["associations"]:
        target = word_index.get(a["word"])
        if target:
            assoc_nodes.append(
                AssociationNode(
                    word=target["word"],
                    pos=target["pos"],
                    definition=target["definition"],
                    strength=a["strength"],
                )
            )
        else:
            assoc_nodes.append(
                AssociationNode(
                    word=a["word"],
                    pos="unknown",
                    definition="",
                    strength=a["strength"],
                )
            )
    return WordAssociationResponse(
        word=entry["word"],
        pos=entry["pos"],
        definition=entry["definition"],
        examples=entry["examples"],
        associations=assoc_nodes,
    )


@app.get("/api/word/random", response_model=WordAssociationResponse)
def get_random_word():
    entry = random.choice(word_list)
    assoc_nodes = []
    for a in entry["associations"]:
        target = word_index.get(a["word"])
        if target:
            assoc_nodes.append(
                AssociationNode(
                    word=target["word"],
                    pos=target["pos"],
                    definition=target["definition"],
                    strength=a["strength"],
                )
            )
        else:
            assoc_nodes.append(
                AssociationNode(
                    word=a["word"],
                    pos="unknown",
                    definition="",
                    strength=a["strength"],
                )
            )
    return WordAssociationResponse(
        word=entry["word"],
        pos=entry["pos"],
        definition=entry["definition"],
        examples=entry["examples"],
        associations=assoc_nodes,
    )


@app.get("/api/word/search", response_model=SearchResponse)
def search_word(q: str = Query(..., description="搜索关键词")):
    results = []
    for w in word_list:
        if q in w["word"] or q in w["definition"]:
            results.append(
                SearchResult(word=w["word"], pos=w["pos"], definition=w["definition"])
            )
    return SearchResponse(query=q, results=results)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
