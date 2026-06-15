import os
import io
import uuid
import json
import base64
import threading
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from PIL import Image
from collections import defaultdict

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
THUMBNAIL_FOLDER = os.path.join(BASE_DIR, 'thumbnails')
DATA_FILE = os.path.join(BASE_DIR, 'photos.json')

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(THUMBNAIL_FOLDER, exist_ok=True)

photos = {}
photos_lock = threading.Lock()


def load_photos():
    global photos
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                photos = json.load(f)
        except Exception:
            photos = {}


def save_photos():
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(photos, f, ensure_ascii=False)


load_photos()


def median_cut(pixels, num_colors=3, max_depth=8):
    if len(pixels) == 0:
        return [(128, 128, 128)]

    buckets = [pixels]

    for _ in range(max_depth):
        if len(buckets) >= num_colors:
            break
        new_buckets = []
        for bucket in buckets:
            if len(bucket) < 2:
                new_buckets.append(bucket)
                continue

            r_range = max(p[0] for p in bucket) - min(p[0] for p in bucket)
            g_range = max(p[1] for p in bucket) - min(p[1] for p in bucket)
            b_range = max(p[2] for p in bucket) - min(p[2] for p in bucket)

            channel = 0
            if g_range >= r_range and g_range >= b_range:
                channel = 1
            elif b_range >= r_range and b_range >= g_range:
                channel = 2

            sorted_bucket = sorted(bucket, key=lambda p: p[channel])
            mid = len(sorted_bucket) // 2
            new_buckets.append(sorted_bucket[:mid])
            new_buckets.append(sorted_bucket[mid:])

        buckets = new_buckets

    result = []
    for bucket in buckets:
        if len(bucket) > 0:
            avg_r = sum(p[0] for p in bucket) // len(bucket)
            avg_g = sum(p[1] for p in bucket) // len(bucket)
            avg_b = sum(p[2] for p in bucket) // len(bucket)
            result.append((avg_r, avg_g, avg_b))

    while len(result) < num_colors:
        result.append(result[-1] if result else (128, 128, 128))

    return result[:num_colors]


def extract_dominant_colors(image, num_colors=3):
    small_img = image.resize((100, 100), Image.Resampling.LANCZOS)
    if small_img.mode != 'RGB':
        small_img = small_img.convert('RGB')
    pixels = list(small_img.getdata())
    colors = median_cut(pixels, num_colors)
    return [f'rgb({c[0]}, {c[1]}, {c[2]})' for c in colors]


def rgb_to_hex(rgb_str):
    rgb = rgb_str.replace('rgb(', '').replace(')', '').split(', ')
    return '#{:02x}{:02x}{:02x}'.format(int(rgb[0]), int(rgb[1]), int(rgb[2]))


@app.route('/api/upload', methods=['POST'])
def upload_photo():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    description = request.form.get('description', '')

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    try:
        img = Image.open(file)
        original_format = img.format or 'JPEG'
        file.seek(0)

        photo_id = str(uuid.uuid4())

        original_ext = os.path.splitext(file.filename)[1] or '.jpg'
        original_path = os.path.join(UPLOAD_FOLDER, f'{photo_id}{original_ext}')
        file.save(original_path)
        file_size = os.path.getsize(original_path)

        thumb = img.copy()
        thumb.thumbnail((300, 300), Image.Resampling.LANCZOS)
        if thumb.mode != 'RGB':
            thumb = thumb.convert('RGB')
        thumb_path = os.path.join(THUMBNAIL_FOLDER, f'{photo_id}.jpg')
        thumb.save(thumb_path, 'JPEG', quality=85)

        dominant_colors = extract_dominant_colors(img)

        shot_time = None
        try:
            exif_data = img._getexif()
            if exif_data:
                for tag_id, value in exif_data.items():
                    if tag_id == 36867:
                        shot_time = value
                        break
        except Exception:
            pass

        photo_data = {
            'id': photo_id,
            'original_name': file.filename,
            'file_size': file_size,
            'thumbnail': f'/api/thumbnail/{photo_id}',
            'dominant_colors': dominant_colors,
            'dominant_colors_hex': [rgb_to_hex(c) for c in dominant_colors],
            'shot_time': shot_time,
            'upload_time': datetime.now().isoformat(),
            'description': description,
        }

        with photos_lock:
            photos[photo_id] = photo_data
            save_photos()

        return jsonify(photo_data)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/photos', methods=['GET'])
def get_photos():
    with photos_lock:
        return jsonify(list(photos.values()))


@app.route('/api/photo/<photo_id>/description', methods=['PUT'])
def update_description(photo_id):
    data = request.get_json()
    description = data.get('description', '')

    with photos_lock:
        if photo_id not in photos:
            return jsonify({'error': 'Photo not found'}), 404
        photos[photo_id]['description'] = description
        save_photos()
        return jsonify(photos[photo_id])


@app.route('/api/thumbnail/<photo_id>', methods=['GET'])
def get_thumbnail(photo_id):
    return send_from_directory(THUMBNAIL_FOLDER, f'{photo_id}.jpg')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
