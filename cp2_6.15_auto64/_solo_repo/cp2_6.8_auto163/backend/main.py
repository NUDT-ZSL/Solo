import io
import os
import uuid
import json
import zipfile
from typing import Dict, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageEnhance
import numpy as np

app = FastAPI(title="图片批量处理 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_IMAGE_SIZE = 1200
image_store: Dict[str, Image.Image] = {}


def resize_if_needed(img: Image.Image) -> Image.Image:
    w, h = img.size
    if max(w, h) > MAX_IMAGE_SIZE:
        ratio = MAX_IMAGE_SIZE / max(w, h)
        new_w = int(w * ratio)
        new_h = int(h * ratio)
        img = img.resize((new_w, new_h), Image.LANCZOS)
    return img


def apply_crop(img: Image.Image, crop_ratio: str) -> Image.Image:
    if crop_ratio == "original":
        return img
    w, h = img.size
    if crop_ratio == "1:1":
        target_w, target_h = 1, 1
    elif crop_ratio == "4:3":
        target_w, target_h = 4, 3
    elif crop_ratio == "16:9":
        target_w, target_h = 16, 9
    elif crop_ratio == "9:16":
        target_w, target_h = 9, 16
    else:
        return img

    img_ratio = w / h
    target_ratio = target_w / target_h

    if abs(img_ratio - target_ratio) < 0.001:
        return img

    if img_ratio > target_ratio:
        new_w = int(h * target_ratio)
        new_h = h
        left = (w - new_w) // 2
        top = 0
        right = left + new_w
        bottom = h
    else:
        new_w = w
        new_h = int(w / target_ratio)
        left = 0
        top = (h - new_h) // 2
        right = w
        bottom = top + new_h

    return img.crop((left, top, right, bottom))


def apply_filter(img: Image.Image, strength: int) -> Image.Image:
    if strength == 0:
        return img
    strength = max(0, min(100, strength))
    factor = strength / 100.0

    if img.mode != "HSV":
        img_hsv = img.convert("HSV")
    else:
        img_hsv = img.copy()

    h, s, v = img_hsv.split()

    h_arr = np.array(h, dtype=np.int32)
    s_arr = np.array(s, dtype=np.int32)

    hue_shift = int(60 * factor)
    h_arr = (h_arr + hue_shift) % 256
    sat_boost = min(255, int(s_arr.mean() * 0.5 * factor)) if factor > 0 else 0
    s_arr = np.clip(s_arr + sat_boost, 0, 255)

    h = Image.fromarray(h_arr.astype(np.uint8), mode="L")
    s = Image.fromarray(s_arr.astype(np.uint8), mode="L")

    img_hsv = Image.merge("HSV", (h, s, v))
    return img_hsv.convert("RGB")


def apply_brightness(img: Image.Image, value: int) -> Image.Image:
    if value == 0:
        return img
    value = max(-50, min(50, value))
    factor = 1.0 + (value / 100.0)
    enhancer = ImageEnhance.Brightness(img)
    return enhancer.enhance(factor)


def apply_contrast(img: Image.Image, value: int) -> Image.Image:
    if value == 0:
        return img
    value = max(-50, min(50, value))
    factor = 1.0 + (value / 100.0)
    enhancer = ImageEnhance.Contrast(img)
    return enhancer.enhance(factor)


def process_image(
    img: Image.Image,
    filter_strength: int,
    crop_ratio: str,
    brightness: int,
    contrast: int,
) -> Image.Image:
    img = resize_if_needed(img)
    img = apply_crop(img, crop_ratio)
    img = apply_filter(img, filter_strength)
    img = apply_brightness(img, brightness)
    img = apply_contrast(img, contrast)
    return img


def image_to_bytes(img: Image.Image, fmt: str = "JPEG") -> bytes:
    buf = io.BytesIO()
    if img.mode == "RGBA" and fmt == "JPEG":
        img = img.convert("RGB")
    img.save(buf, format=fmt, quality=90)
    return buf.getvalue()


@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="请上传图片文件")

    try:
        contents = await file.read()
        img = Image.open(io.BytesIO(contents))
        img.load()
    except Exception:
        raise HTTPException(status_code=400, detail="无法解析图片文件")

    image_id = str(uuid.uuid4())
    image_store[image_id] = img

    return JSONResponse({"image_id": image_id, "filename": file.filename or "image"})


@app.post("/api/process")
async def process_endpoint(
    file: Optional[UploadFile] = File(None),
    image_id: Optional[str] = Form(None),
    filter_strength: int = Form(0),
    crop_ratio: str = Form("original"),
    brightness: int = Form(0),
    contrast: int = Form(0),
):
    try:
        if file is not None:
            contents = await file.read()
            img = Image.open(io.BytesIO(contents))
            img.load()
        elif image_id and image_id in image_store:
            img = image_store[image_id].copy()
        else:
            raise HTTPException(status_code=400, detail="未提供图片或图片ID无效")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="无法解析图片")

    processed = process_image(img, filter_strength, crop_ratio, brightness, contrast)

    fmt = "PNG" if (file and file.filename and file.filename.lower().endswith(".png")) or processed.mode == "RGBA" else "JPEG"
    img_bytes = image_to_bytes(processed, fmt)
    media_type = "image/png" if fmt == "PNG" else "image/jpeg"

    return StreamingResponse(
        io.BytesIO(img_bytes),
        media_type=media_type,
    )


@app.post("/api/export")
async def export_images(request: Request):
    content_type = request.headers.get("content-type", "")

    if "multipart/form-data" in content_type:
        form = await request.form()
        count_str = form.get("count")
        if count_str is None:
            raise HTTPException(status_code=400, detail="缺少 count 参数")
        count = int(count_str)

        zip_buf = io.BytesIO()
        used_names = set()

        with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for i in range(count):
                file_key = f"file_{i}"
                params_key = f"params_{i}"

                upload_file = form.get(file_key)
                params_raw = form.get(params_key)

                if not upload_file or not params_raw:
                    continue

                try:
                    if isinstance(upload_file, UploadFile):
                        contents = await upload_file.read()
                        img = Image.open(io.BytesIO(contents))
                        img.load()
                    else:
                        continue

                    params = json.loads(str(params_raw))
                    processed = process_image(
                        img,
                        int(params.get("filter_strength", 0)),
                        str(params.get("crop_ratio", "original")),
                        int(params.get("brightness", 0)),
                        int(params.get("contrast", 0)),
                    )

                    original_name = str(params.get("filename", f"image_{i}.jpg"))
                    name, ext = os.path.splitext(original_name)
                    fmt = "PNG" if ext.lower() in (".png",) or processed.mode == "RGBA" else "JPEG"
                    if ext.lower() not in (".jpg", ".jpeg", ".png"):
                        ext = ".jpg"

                    final_name = f"{name}_processed{ext}"
                    counter = 1
                    while final_name in used_names:
                        final_name = f"{name}_processed_{counter}{ext}"
                        counter += 1
                    used_names.add(final_name)

                    img_bytes = image_to_bytes(processed, fmt)
                    zf.writestr(final_name, img_bytes)

                except Exception as e:
                    print(f"处理第 {i} 张图片时出错: {e}")
                    continue

        zip_buf.seek(0)
        return StreamingResponse(
            zip_buf,
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=processed_images.zip"},
        )

    else:
        body = await request.json()
        images = body.get("images", [])
        zip_buf = io.BytesIO()
        used_names = set()

        with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for idx, item in enumerate(images):
                image_id = item.get("image_id")
                if image_id not in image_store:
                    continue

                try:
                    img = image_store[image_id].copy()
                    params = item.get("params", {})
                    processed = process_image(
                        img,
                        int(params.get("filter_strength", 0)),
                        str(params.get("crop_ratio", "original")),
                        int(params.get("brightness", 0)),
                        int(params.get("contrast", 0)),
                    )

                    filename = item.get("filename", f"image_{idx}.jpg")
                    name, ext = os.path.splitext(filename)
                    fmt = "PNG" if ext.lower() in (".png",) or processed.mode == "RGBA" else "JPEG"
                    if ext.lower() not in (".jpg", ".jpeg", ".png"):
                        ext = ".jpg"

                    final_name = f"{name}_processed{ext}"
                    counter = 1
                    while final_name in used_names:
                        final_name = f"{name}_processed_{counter}{ext}"
                        counter += 1
                    used_names.add(final_name)

                    img_bytes = image_to_bytes(processed, fmt)
                    zf.writestr(final_name, img_bytes)

                except Exception as e:
                    print(f"处理图片 {image_id} 时出错: {e}")
                    continue

        zip_buf.seek(0)
        return StreamingResponse(
            zip_buf,
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=processed_images.zip"},
        )


@app.get("/")
async def root():
    return {"message": "图片批量处理 API 运行中"}
