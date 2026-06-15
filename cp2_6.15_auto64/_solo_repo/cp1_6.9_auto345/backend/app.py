from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dataclasses import asdict
import base64
import io
import math
import os

import models

app = Flask(__name__)
CORS(app)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024


def sculpture_to_dict(s):
    return {
        "id": s.id,
        "title": s.title,
        "artist": s.artist,
        "description": s.description,
        "materialType": s.material_type,
        "modelUrl": s.model_url,
        "geometryType": s.geometry_type,
        "color": s.color,
        "scale": s.scale
    }


def snapshot_to_dict(snap):
    sculp = models.get_sculpture_by_id(snap.sculpture_id)
    return {
        "id": snap.id,
        "sculptureId": snap.sculpture_id,
        "sculptureTitle": sculp.title if sculp else "",
        "position": snap.position,
        "target": snap.target,
        "zoom": snap.zoom,
        "imageBase64": snap.image_base64,
        "thumbnailBase64": snap.image_base64,
        "clickCount": snap.click_count
    }


def generate_dummy_png(width: int = 800, height: int = 600, color_hex: str = "#1a1a2e", accent_hex: str = "#ff8c00") -> str:
    try:
        from PIL import Image, ImageDraw, ImageFont
        bg_rgb = tuple(int(color_hex.lstrip('#')[i:i+2], 16) for i in (0, 2, 4))
        accent_rgb = tuple(int(accent_hex.lstrip('#')[i:i+2], 16) for i in (0, 2, 4))

        img = Image.new('RGB', (width, height), bg_rgb)
        draw = ImageDraw.Draw(img)

        for y in range(height):
            alpha = y / height
            r = int(bg_rgb[0] * (1 - alpha * 0.3) + 10 * alpha)
            g = int(bg_rgb[1] * (1 - alpha * 0.3) + 10 * alpha)
            b = int(bg_rgb[2] * (1 - alpha * 0.3) + 46 * alpha)
            draw.line([(0, y), (width, y)], fill=(r, g, b))

        cx, cy = width // 2, height // 2
        for i in range(3):
            radius = int(min(width, height) * (0.25 + i * 0.08))
            for angle in range(0, 360, 3):
                rad = math.radians(angle)
                x = cx + int(radius * math.cos(rad))
                y = cy + int(radius * math.sin(rad) * 0.6)
                size = 2 + int(2 * abs(math.sin(rad * 3)))
                brightness = 0.5 + 0.5 * math.sin(rad * 2 + i)
                cr = int(accent_rgb[0] * brightness + bg_rgb[0] * (1 - brightness))
                cg = int(accent_rgb[1] * brightness + bg_rgb[1] * (1 - brightness))
                cb = int(accent_rgb[2] * brightness + bg_rgb[2] * (1 - brightness))
                draw.ellipse([x - size, y - size, x + size, y + size], fill=(cr, cg, cb))

        for _ in range(80):
            import random
            random.seed(_)
            sx = random.randint(0, width)
            sy = random.randint(0, height)
            ss = random.randint(1, 3)
            brightness = random.random() * 0.6 + 0.4
            draw.ellipse([sx - ss, sy - ss, sx + ss, sy + ss],
                        fill=(int(255 * brightness), int(255 * brightness * 0.9), int(255 * brightness * 0.7)))

        buf = io.BytesIO()
        img.save(buf, format='PNG', optimize=True)
        buf.seek(0)
        return base64.b64encode(buf.read()).decode('utf-8')
    except ImportError:
        png_header = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        return base64.b64encode(png_header).decode('utf-8')


@app.route('/sculptures', methods=['GET'])
def get_sculptures():
    sculptures = models.get_all_sculptures()
    return jsonify([sculpture_to_dict(s) for s in sculptures])


@app.route('/capture', methods=['POST'])
def capture_view():
    data = request.get_json(force=True, silent=True) or {}

    sculpture_id = data.get('sculptureId', 'scu-001')
    position = data.get('position', {"x": 0, "y": 0, "z": 0})
    target = data.get('target', {"x": 0, "y": 0, "z": 0})
    zoom = float(data.get('zoom', 5.0))

    sculpture = models.get_sculpture_by_id(sculpture_id)
    color_hex = sculpture.color if sculpture else "#1a1a2e"

    image_base64 = generate_dummy_png(800, 600, color_hex=color_hex)

    snapshot = models.create_snapshot(
        sculpture_id=sculpture_id,
        position=position,
        target=target,
        zoom=zoom,
        image_base64=image_base64
    )

    return jsonify({
        "id": snapshot.id,
        "imageBase64": snapshot.image_base64,
        "clickCount": snapshot.click_count
    })


@app.route('/featured', methods=['GET'])
def get_featured():
    featured = models.get_featured_snapshots(limit=12)
    result = []
    for snap in featured:
        if not snap.image_base64:
            sculp = models.get_sculpture_by_id(snap.sculpture_id)
            color_hex = sculp.color if sculp else "#1a1a2e"
            snap.image_base64 = generate_dummy_png(800, 600, color_hex=color_hex)
        result.append(snapshot_to_dict(snap))
    return jsonify(result)


@app.route('/featured/<snapshot_id>/click', methods=['POST'])
def record_click(snapshot_id):
    snap = models.increment_snapshot_clicks(snapshot_id)
    if not snap:
        return jsonify({"error": "Snapshot not found"}), 404
    return jsonify({"id": snap.id, "clickCount": snap.click_count})


@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "service": "art-gallery-backend"})


if __name__ == '__main__':
    models.initialize_data()
    app.run(host='0.0.0.0', port=5000, debug=False)
