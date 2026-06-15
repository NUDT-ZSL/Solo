import os
import time
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Timeline Workshop Export API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@app.post("/api/export")
async def export_png(
    file: UploadFile = File(...),
    filename: Optional[str] = Form(None),
):
    ts = int(time.time() * 1000)
    safe_name = filename or f"timeline-{ts}.png"
    if not safe_name.lower().endswith(".png"):
        safe_name += ".png"
    name, ext = os.path.splitext(safe_name)
    stored = f"{name}-{ts}{ext}"
    target = UPLOAD_DIR / stored
    content = await file.read()
    target.write_bytes(content)
    return JSONResponse(
        {
            "success": True,
            "downloadUrl": f"/api/download/{stored}",
            "filename": stored,
        }
    )


@app.get("/api/download/{filename}")
async def download_file(filename: str):
    path = UPLOAD_DIR / filename
    if not path.exists():
        return JSONResponse({"success": False, "error": "not found"}, status_code=404)
    return FileResponse(path, media_type="image/png", filename=filename)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
