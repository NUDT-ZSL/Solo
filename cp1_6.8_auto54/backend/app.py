import os
import json
import uuid
import time
import numpy as np
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder='../dist', static_url_path='')
CORS(app)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), 'uploads')
DATA_FILE = os.path.join(os.path.dirname(__file__), 'data.json')
os.makedirs(UPLOAD_DIR, exist_ok=True)


def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []


def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def analyze_audio(filepath):
    try:
        from scipy.io import wavfile
        sample_rate, data = wavfile.read(filepath)
        if data.ndim > 1:
            data = data[:, 0]
        data = data.astype(np.float64)
        peak = np.max(np.abs(data))
        if peak > 0:
            data = data / peak

        rms = np.sqrt(np.mean(data ** 2))
        volume = min(rms * 5, 1.0)

        corr = np.correlate(data[:4096], data[:4096], mode='full')
        corr = corr[len(corr) // 2:]
        diff = np.diff(np.sign(corr))
        zero_cross = np.where(diff != 0)[0]
        if len(zero_cross) > 1:
            period = zero_cross[1] - zero_cross[0]
            pitch_hz = sample_rate / max(period, 1)
        else:
            pitch_hz = 200
        pitch = min(pitch_hz / 500, 1.0)

        zero_crossings = np.sum(np.abs(np.diff(np.sign(data))) > 0)
        duration = len(data) / sample_rate
        speed = min((zero_crossings / duration) / 200, 1.0) if duration > 0 else 0.5

        score0 = volume * 0.5 + speed * 0.5
        score1 = (1 - volume) * 0.4 + (1 - speed) * 0.3 + (1 - pitch) * 0.3
        score2 = (1 - volume) * 0.3 + (1 - speed) * 0.3 + pitch * 0.4

        presets = [
            {'start': '#ff4444', 'end': '#ff8800', 'label': '热烈红橙'},
            {'start': '#00cccc', 'end': '#4488ff', 'label': '平静蓝绿'},
            {'start': '#8855aa', 'end': '#778899', 'label': '忧郁紫灰'},
        ]
        scores = [score0, score1, score2]
        gradient = presets[scores.index(max(scores))]

        block_size = max(len(data) // 120, 1)
        waveform = []
        for i in range(120):
            start = i * block_size
            chunk = data[start:start + block_size]
            if len(chunk) > 0:
                waveform.append(float(np.mean(np.abs(chunk))))
            else:
                waveform.append(0.0)
        max_w = max(waveform) if waveform else 1
        waveform = [w / max_w for w in waveform]

        return gradient, waveform, volume, pitch, speed

    except Exception:
        return {'start': '#8855aa', 'end': '#778899', 'label': '忧郁紫灰'}, [0.5] * 120, 0.5, 0.5, 0.5


@app.route('/api/stars', methods=['GET'])
def get_stars():
    data = load_data()
    return jsonify(data)


@app.route('/api/upload', methods=['POST'])
def upload():
    audio_file = request.files.get('audio')
    if not audio_file:
        return jsonify({'error': 'no audio file'}), 400

    star_id = str(uuid.uuid4())[:8]
    filename = f'{star_id}.webm'
    filepath = os.path.join(UPLOAD_DIR, filename)
    audio_file.save(filepath)

    owner_id = request.form.get('ownerId', 'anonymous')
    gradient_str = request.form.get('gradient', '')
    waveform_str = request.form.get('waveform', '')

    try:
        gradient = json.loads(gradient_str) if gradient_str else None
        waveform = json.loads(waveform_str) if waveform_str else None
    except json.JSONDecodeError:
        gradient = None
        waveform = None

    if not gradient or not waveform:
        gradient, waveform, vol, pitch, speed = analyze_audio(filepath)

    audio_url = f'/api/audio/{filename}'

    star = {
        'id': star_id,
        'gradient': gradient,
        'audioUrl': audio_url,
        'duration': 5000,
        'playCount': 0,
        'mergeCount': 0,
        'ownerId': owner_id,
        'waveform': waveform,
        'createdAt': int(time.time() * 1000),
    }

    data = load_data()
    data.append(star)
    save_data(data)

    return jsonify(star)


@app.route('/api/audio/<filename>', methods=['GET'])
def get_audio(filename):
    return send_from_directory(UPLOAD_DIR, filename)


@app.route('/api/merge', methods=['POST'])
def merge():
    body = request.get_json(force=True)
    from_user_id = body.get('fromUserId', '')
    to_star_id = body.get('toStarId', '')

    data = load_data()
    to_star = next((s for s in data if s['id'] == to_star_id), None)
    from_star = next((s for s in data if s['ownerId'] == from_user_id and s['id'] != to_star_id), None)

    if not to_star or not from_star:
        return jsonify({'error': 'stars not found'}), 404

    def mix_hex(c1, c2):
        r1, g1, b1 = int(c1[1:3], 16), int(c1[3:5], 16), int(c1[5:7], 16)
        r2, g2, b2 = int(c2[1:3], 16), int(c2[3:5], 16), int(c2[5:7], 16)
        r = (r1 + r2) // 2
        g = (g1 + g2) // 2
        b = (b1 + b2) // 2
        return f'#{r:02x}{g:02x}{b:02x}'

    to_star['mergeCount'] = to_star.get('mergeCount', 0) + 1
    to_star['gradient'] = {
        'start': mix_hex(from_star['gradient']['start'], to_star['gradient']['start']),
        'end': mix_hex(from_star['gradient']['end'], to_star['gradient']['end']),
        'label': f"{from_star['gradient']['label']}·{to_star['gradient']['label']}",
    }

    save_data(data)
    return jsonify(to_star)


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_spa(path):
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')


if __name__ == '__main__':
    app.run(debug=True, port=5000)
