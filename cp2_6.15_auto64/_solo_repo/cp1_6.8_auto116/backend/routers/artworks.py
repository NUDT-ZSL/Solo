import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from services import artwork_service

router = APIRouter(prefix="/api/artworks", tags=["artworks"])


def _get_username(request: Request) -> str | None:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
        return artwork_service.verify_token(token)
    return None


class UploadRequest(BaseModel):
    title: str
    tags: list[str]
    image_base64: str


class CommentRequest(BaseModel):
    content: str


@router.get("")
def list_artworks(page: int = 1, page_size: int = 50):
    return artwork_service.get_artworks(page, page_size)


@router.get("/{artwork_id}")
def get_artwork(artwork_id: str):
    result = artwork_service.get_artwork(artwork_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Artwork not found")
    return result


@router.post("")
def upload_artwork(req: UploadRequest, request: Request):
    username = _get_username(request)
    if username is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if not req.title or len(req.title.strip()) == 0:
        raise HTTPException(status_code=400, detail="Title is required")
    if not req.image_base64:
        raise HTTPException(status_code=400, detail="Image is required")
    result = artwork_service.create_artwork(req.title.strip(), req.tags, req.image_base64)
    return result


@router.post("/{artwork_id}/like")
def toggle_like(artwork_id: str, request: Request):
    username = _get_username(request)
    if username is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    result = artwork_service.toggle_like(artwork_id, username)
    if result is None:
        raise HTTPException(status_code=404, detail="Artwork not found")
    return result


@router.post("/{artwork_id}/comments")
def add_comment(artwork_id: str, req: CommentRequest, request: Request):
    username = _get_username(request)
    if username is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if not req.content or len(req.content.strip()) == 0:
        raise HTTPException(status_code=400, detail="Comment content is required")
    result = artwork_service.add_comment(artwork_id, username, req.content.strip())
    if result is None:
        raise HTTPException(status_code=404, detail="Artwork not found")
    return result
