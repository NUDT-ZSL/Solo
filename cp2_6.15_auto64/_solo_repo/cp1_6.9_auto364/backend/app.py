from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from PIL import Image
import os
import uuid
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
DATA_FILE = os.path.join(BASE_DIR, 'cards.json')

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

cards_db = {}

def load_cards():
    global cards_db
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                cards_db = json.load(f)
        except Exception:
            cards_db = {}

def save_cards():
    try:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(cards_db, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Save cards error: {e}")

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

load_cards()

@app.route('/api/cards', methods=['GET'])
def get_cards():
    return jsonify(list(cards_db.values()))

@app.route('/api/cards', methods=['POST'])
def create_card():
    data = request.get_json(force=True)
    card_id = str(uuid.uuid4())
    now = datetime.now().isoformat()
    card = {
        'id': card_id,
        'title': data.get('title', '未命名卡片'),
        'description': data.get('description', ''),
        'tags': data.get('tags', []),
        'image': data.get('image', None),
        'x': data.get('x', 100),
        'y': data.get('y', 100),
        'groupId': data.get('groupId', None),
        'createdAt': now,
        'updatedAt': now
    }
    cards_db[card_id] = card
    save_cards()
    return jsonify(card), 201

@app.route('/api/cards/<card_id>', methods=['PUT'])
def update_card(card_id):
    if card_id not in cards_db:
        return jsonify({'error': 'Card not found'}), 404
    data = request.get_json(force=True)
    card = cards_db[card_id]
    for key in ['title', 'description', 'tags', 'image', 'x', 'y', 'groupId']:
        if key in data:
            card[key] = data[key]
    card['updatedAt'] = datetime.now().isoformat()
    cards_db[card_id] = card
    save_cards()
    return jsonify(card)

@app.route('/api/cards/<card_id>', methods=['DELETE'])
def delete_card(card_id):
    if card_id not in cards_db:
        return jsonify({'error': 'Card not found'}), 404
    del cards_db[card_id]
    save_cards()
    return jsonify({'message': 'Card deleted successfully'})

@app.route('/api/upload', methods=['POST'])
def upload_image():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        ext = file.filename.rsplit('.', 1)[1].lower()
        filename = f"{uuid.uuid4()}.{ext}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        try:
            img = Image.open(file)
            img.thumbnail((800, 800), Image.LANCZOS)
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            img.save(filepath, optimize=True, quality=85)
        except Exception as e:
            file.seek(0)
            file.save(filepath)
        file_url = f"/api/uploads/{filename}"
        return jsonify({'url': file_url, 'filename': filename})
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/api/uploads/<filename>', methods=['GET'])
def serve_upload(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
