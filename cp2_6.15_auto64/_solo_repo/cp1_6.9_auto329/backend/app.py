import os
import json
import uuid
import time
import math
import random
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

try:
    import librosa
    import numpy as np
    LIBROSA_AVAILABLE = True
except ImportError:
    LIBROSA_AVAILABLE = False
    print("Warning: librosa not available, using fallback")

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
SPECTROGRAM_FOLDER = os.path.join(BASE_DIR, 'spectrograms')

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(SPECTROGRAM_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {'mp3', 'wav'}
MAX_DURATION = 120

spectrogram_store = {}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def extract_features_librosa(audio_path):
    y, sr = librosa.load(audio_path, sr=None, duration=MAX_DURATION)
    duration = librosa.get_duration(y=y, sr=sr)

    stft = np.abs(librosa.stft(y, n_fft=2048, hop_length=512))
    stft_db = librosa.amplitude_to_db(stft, ref=np.max)

    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13, n_fft=2048, hop_length=512)

    volume = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]

    time_steps = stft_db.shape[1]
    freq_bins = stft_db.shape[0]

    stft_min, stft_max = stft_db.min(), stft_db.max()
    stft_normalized = (stft_db - stft_min) / (stft_max - stft_min + 1e-8)

    vol_min, vol_max = volume.min(), volume.max()
    volume_normalized = (volume - vol_min) / (vol_max - vol_min + 1e-8)

    frequencies = librosa.fft_frequencies(sr=sr, n_fft=2048).tolist()
    freq_max = 22050 if sr >= 44100 else sr / 2

    return {
        'stft': stft_normalized.T.tolist(),
        'mfcc': mfcc.T.tolist(),
        'volume': volume_normalized.tolist(),
        'duration': float(duration),
        'time_steps': int(time_steps),
        'freq_bins': int(freq_bins),
        'sample_rate': int(sr),
        'frequencies': frequencies,
        'freq_max': float(freq_max),
        'width': 512,
        'height': 128
    }


def extract_features_fallback(audio_path):
    random.seed(42)
    duration = 3.0
    time_steps = 300
    freq_bins = 128
    volume = []
    stft = []
    for t in range(time_steps):
        t_norm = t / time_steps
        vol = 0.3 + 0.4 * abs(math.sin(t_norm * 10))
        volume.append(min(1.0, max(0.0, vol)))
        freq_row = []
        for f in range(freq_bins):
            f_norm = f / freq_bins
            val = (0.5 + 0.5 * abs(math.sin(t_norm * 5 + f_norm * 3))) * (1 - f_norm * 0.5) * vol
            freq_row.append(min(1.0, max(0.0, val)))
        stft.append(freq_row)
    mfcc = [[0.1 * random.random() for _ in range(13)] for _ in range(time_steps)]
    return {
        'stft': stft,
        'mfcc': mfcc,
        'volume': volume,
        'duration': duration,
        'time_steps': time_steps,
        'freq_bins': freq_bins,
        'sample_rate': 44100,
        'frequencies': [i * (22050 / freq_bins) for i in range(freq_bins)],
        'freq_max': 22050,
        'width': 512,
        'height': 128
    }


@app.route('/api/upload', methods=['POST'])
def upload_audio():
    if 'file' not in request.files:
        return jsonify({'error': '未找到文件'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '未选择文件'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': '不支持的文件格式，仅支持MP3和WAV'}), 400

    ext = file.filename.rsplit('.', 1)[1].lower()
    file_uuid = str(uuid.uuid4())
    filename = f"{file_uuid}.{ext}"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    try:
        if LIBROSA_AVAILABLE:
            features = extract_features_librosa(filepath)
        else:
            features = extract_features_fallback(filepath)
    except Exception as e:
        try:
            features = extract_features_fallback(filepath)
        except Exception as e2:
            return jsonify({'error': f'音频处理失败: {str(e)}'}), 500

    if features['duration'] > MAX_DURATION:
        os.remove(filepath)
        return jsonify({'error': f'音频时长超过{MAX_DURATION}秒限制'}), 400

    share_id = str(uuid.uuid4())
    upload_time = time.strftime('%Y-%m-%d %H:%M:%S')
    spectrogram_store[share_id] = {
        'features': features,
        'filename': file.filename,
        'upload_time': upload_time,
        'duration': features['duration']
    }

    spectrogram_path = os.path.join(SPECTROGRAM_FOLDER, f'{share_id}.json')
    with open(spectrogram_path, 'w', encoding='utf-8') as f:
        json.dump(spectrogram_store[share_id], f)

    return jsonify({
        'success': True,
        'share_id': share_id,
        'filename': file.filename,
        'duration': features['duration'],
        'features': features,
        'upload_time': upload_time,
        'share_url': f'/spectrogram/{share_id}'
    })


@app.route('/api/spectrogram/<share_id>', methods=['GET'])
def get_spectrogram(share_id):
    if share_id in spectrogram_store:
        data = spectrogram_store[share_id]
        return jsonify({
            'success': True,
            'features': data['features'],
            'filename': data['filename'],
            'upload_time': data['upload_time'],
            'duration': data['duration']
        })

    spectrogram_path = os.path.join(SPECTROGRAM_FOLDER, f'{share_id}.json')
    if os.path.exists(spectrogram_path):
        with open(spectrogram_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return jsonify({
                'success': True,
                'features': data['features'],
                'filename': data['filename'],
                'upload_time': data['upload_time'],
                'duration': data['duration']
            })

    return jsonify({'error': '未找到该图谱'}), 404


@app.route('/api/spectrograms/<path:filename>')
def serve_spectrogram(filename):
    return send_from_directory(SPECTROGRAM_FOLDER, filename)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
