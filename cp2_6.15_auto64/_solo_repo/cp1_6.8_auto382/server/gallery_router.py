import sqlite3
import uuid
import os
import time
import string
import random
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"


def get_db():
    conn = sqlite3.connect(str(BASE_DIR / "gallery.db"))
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def generate_short_url(conn: sqlite3.Connection, length=8):
    chars = string.ascii_lowercase + string.digits
    while True:
        code = "".join(random.choices(chars, k=length))
        row = conn.execute("SELECT id FROM images WHERE short_url = ?", (code,)).fetchone()
        if not row:
            return code


class CommentCreate(BaseModel):
    content: str


class CommentOut(BaseModel):
    id: str
    content: str
    created_at: str


class ImageOut(BaseModel):
    id: str
    short_url: str
    image_url: str
    description: Optional[str]
    created_at: str


class GalleryItem(BaseModel):
    id: str
    thumbnail_url: str
    description: Optional[str]
    comment_count: int
    created_at: str


class GalleryList(BaseModel):
    items: List[GalleryItem]
    total: int
    page: int
    page_size: int


class ImageDetail(BaseModel):
    id: str
    image_url: str
    description: Optional[str]
    short_url: str
    comments: List[CommentOut]
    created_at: str


@router.post("/upload", response_model=ImageOut)
async def upload_image(
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    db: sqlite3.Connection = Depends(get_db),
):
    allowed_types = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="不支持的图片格式，仅支持 jpg/png/gif/webp")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="图片大小不能超过 10MB")

    image_id = uuid.uuid4().hex[:12]
    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "jpg"
    filename = f"{image_id}_{int(time.time())}.{ext}"
    filepath = UPLOAD_DIR / filename

    with open(filepath, "wb") as f:
        f.write(content)

    short_url = generate_short_url(db)

    if description is not None:
        description = description.strip()[:200] or None

    db.execute(
        "INSERT INTO images (id, filename, short_url, description) VALUES (?, ?, ?, ?)",
        (image_id, filename, short_url, description),
    )
    db.commit()

    return ImageOut(
        id=image_id,
        short_url=short_url,
        image_url=f"/uploads/{filename}",
        description=description,
        created_at=db.execute("SELECT created_at FROM images WHERE id = ?", (image_id,)).fetchone()["created_at"],
    )


@router.get("/gallery", response_model=GalleryList)
def get_gallery(
    page: int = 1,
    page_size: int = 20,
    db: sqlite3.Connection = Depends(get_db),
):
    offset = (page - 1) * page_size
    total = db.execute("SELECT COUNT(*) as cnt FROM images").fetchone()["cnt"]
    rows = db.execute(
        """
        SELECT i.id, i.filename, i.description, i.created_at,
               (SELECT COUNT(*) FROM comments WHERE image_id = i.id) as comment_count
        FROM images i
        ORDER BY i.created_at DESC
        LIMIT ? OFFSET ?
        """,
        (page_size, offset),
    ).fetchall()

    items = [
        GalleryItem(
            id=row["id"],
            thumbnail_url=f"/uploads/{row['filename']}",
            description=row["description"],
            comment_count=row["comment_count"],
            created_at=row["created_at"],
        )
        for row in rows
    ]

    return GalleryList(items=items, total=total, page=page, page_size=page_size)


@router.get("/gallery/{image_id}", response_model=ImageDetail)
def get_image_detail(image_id: str, db: sqlite3.Connection = Depends(get_db)):
    row = db.execute("SELECT * FROM images WHERE id = ?", (image_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="图片不存在")

    comments_rows = db.execute(
        "SELECT * FROM comments WHERE image_id = ? ORDER BY created_at ASC",
        (image_id,),
    ).fetchall()

    comments = [
        CommentOut(id=c["id"], content=c["content"], created_at=c["created_at"])
        for c in comments_rows
    ]

    return ImageDetail(
        id=row["id"],
        image_url=f"/uploads/{row['filename']}",
        description=row["description"],
        short_url=row["short_url"],
        comments=comments,
        created_at=row["created_at"],
    )


@router.post("/gallery/{image_id}/comments", response_model=CommentOut)
def add_comment(
    image_id: str,
    comment: CommentCreate,
    db: sqlite3.Connection = Depends(get_db),
):
    row = db.execute("SELECT id FROM images WHERE id = ?", (image_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="图片不存在")

    content = comment.content.strip()
    if not content or len(content) > 50:
        raise HTTPException(status_code=400, detail="评论内容需在1-50字之间")

    comment_id = uuid.uuid4().hex[:12]
    db.execute(
        "INSERT INTO comments (id, image_id, content) VALUES (?, ?, ?)",
        (comment_id, image_id, content),
    )
    db.commit()

    created_at = db.execute("SELECT created_at FROM comments WHERE id = ?", (comment_id,)).fetchone()["created_at"]
    return CommentOut(id=comment_id, content=content, created_at=created_at)
