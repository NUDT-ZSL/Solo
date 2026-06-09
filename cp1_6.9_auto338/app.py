import os
import io
import uuid
import math
import struct
import tempfile
import wave
from datetime import datetime

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

try:
    from pydub import AudioSegment
    PYDUB_AVAILABLE = True
except Exception:
    PYDUB_AVAILABLE = False
    print("[WARN] pydub not available, using fallback FFT analysis")

import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

MAX_FILE_SIZE = 1 * 1024 * 1024
TARGET_SAMPLE_RATE = 22050
TARGET_CHANNELS = 1
ENERGY_SAMPLES = 60

LAYER_CONFIG = {
    "low": {"min_freq": 20, "max_freq": 250, "radius": 2.5, "speed": 0.3, "color": "#1a3c6e"},
    "mid": {"min_freq": 250, "max_freq": 2000, "radius": 3.5, "speed": 0.6, "color": "#2ecc71"},
    "high": {"min_freq": 2000, "max_freq": 11025, "radius": 4.5, "speed": 0.9, "color": "#ff6b35"},
}

app = Flask(__name__, static_folder=None)
CORS(app)
app.config["MAX_CONTENT_LENGTH"] = MAX_FILE_SIZE * 2


def decode_audio_to_pcm(file_storage) -> tuple[np.ndarray, int, float]:
    raw_bytes = file_storage.read()
    if len(raw_bytes) == 0:
        raise ValueError("Empty audio file")
    if len(raw_bytes) > MAX_FILE_SIZE * 2:
        raise ValueError("Audio file too large")

    audio_data = None
    sample_rate = TARGET_SAMPLE_RATE

    if PYDUB_AVAILABLE:
        try:
            audio = AudioSegment.from_file(io.BytesIO(raw_bytes))
            audio = audio.set_frame_rate(TARGET_SAMPLE_RATE).set_channels(TARGET_CHANNELS)
            sample_rate = audio.frame_rate
            samples = np.array(audio.get_array_of_samples(), dtype=np.float64)
            if audio.sample_width == 2:
                samples /= 32768.0
            elif audio.sample_width == 1:
                samples = (samples - 128) / 128.0
            elif audio.sample_width == 4:
                samples /= 2147483648.0
            audio_data = samples
        except Exception as e:
            print(f"[WARN] pydub decode failed: {e}, trying raw WAV decode")

    if audio_data is None:
        try:
            with wave.open(io.BytesIO(raw_bytes), "rb") as wf:
                sr = wf.getframerate()
                nch = wf.getnchannels()
                sw = wf.getsampwidth()
                nframes = wf.getnframes()
                raw_pcm = wf.readframes(nframes)
                if sw == 2:
                    fmt = f"<{nframes * nch}h"
                    samples = np.array(struct.unpack(fmt, raw_pcm), dtype=np.float64) / 32768.0
                elif sw == 1:
                    fmt = f"<{nframes * nch}B"
                    samples = (np.array(struct.unpack(fmt, raw_pcm), dtype=np.float64) - 128) / 128.0
                elif sw == 4:
                    fmt = f"<{nframes * nch}i"
                    samples = np.array(struct.unpack(fmt, raw_pcm), dtype=np.float64) / 2147483648.0
                else:
                    raise ValueError(f"Unsupported sample width: {sw}")
                if nch > 1:
                    samples = samples.reshape(-1, nch).mean(axis=1)
                audio_data = samples
                sample_rate = sr
                if sample_rate != TARGET_SAMPLE_RATE:
                    ratio = TARGET_SAMPLE_RATE / sample_rate
                    new_len = int(len(audio_data) * ratio)
                    audio_data = np.interp(
                        np.linspace(0, len(audio_data) - 1, new_len),
                        np.arange(len(audio_data)),
                        audio_data,
                    )
                    sample_rate = TARGET_SAMPLE_RATE
        except Exception as e2:
            print(f"[INFO] WAV decode also failed: {e2}, treating as raw float32/f64")
            try:
                audio_data = np.frombuffer(raw_bytes, dtype=np.float32).astype(np.float64)
                sample_rate = TARGET_SAMPLE_RATE
            except Exception:
                audio_data = np.frombuffer(raw_bytes, dtype=np.int16).astype(np.float64) / 32768.0
                sample_rate = TARGET_SAMPLE_RATE

    if audio_data is None or len(audio_data) == 0:
        raise ValueError("Could not decode audio")

    duration = len(audio_data) / sample_rate
    return audio_data, sample_rate, duration


def encode_pcm_to_wav(audio_data: np.ndarray, sample_rate: int) -> bytes:
    audio_data = np.clip(audio_data, -1.0, 1.0)
    pcm = (audio_data * 32767.0).astype(np.int16)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(TARGET_CHANNELS)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm.tobytes())
    return buf.getvalue()


def compute_band_energies(audio_data: np.ndarray, sample_rate: int) -> dict[str, list[float]]:
    n = len(audio_data)
    chunk_size = max(512, int(sample_rate / 10))
    num_chunks = max(1, min(ENERGY_SAMPLES, n // chunk_size))
    actual_chunk = n // num_chunks if num_chunks > 0 else n

    energies = {band: [] for band in LAYER_CONFIG}

    for ci in range(num_chunks):
        start = ci * actual_chunk
        end = start + actual_chunk
        chunk = audio_data[start:end].astype(np.float64)

        if len(chunk) < 32:
            for band in energies:
                energies[band].append(0.0)
            continue

        window = np.hanning(len(chunk))
        chunk_win = chunk * window

        fft_size = 1
        while fft_size < len(chunk_win):
            fft_size <<= 1
        padded = np.zeros(fft_size, dtype=np.float64)
        padded[: len(chunk_win)] = chunk_win

        spectrum = np.abs(np.fft.rfft(padded))
        freqs = np.fft.rfftfreq(fft_size, d=1.0 / sample_rate)

        for band, cfg in LAYER_CONFIG.items():
            mask = (freqs >= cfg["min_freq"]) & (freqs < cfg["max_freq"])
            if np.any(mask):
                band_energy = float(np.mean(spectrum[mask] ** 2))
            else:
                band_energy = 0.0
            energies[band].append(band_energy)

    max_e = 1e-12
    for band in energies:
        if energies[band]:
            max_e = max(max_e, max(energies[band]))

    for band in energies:
        energies[band] = [min(1.0, e / max_e) for e in energies[band]]
        while len(energies[band]) < ENERGY_SAMPLES:
            energies[band].append(0.0)
        energies[band] = energies[band][:ENERGY_SAMPLES]

    return energies


@app.route("/api/amber/create", methods=["POST"])
def create_amber():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    file = request.files["audio"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    try:
        audio_data, sample_rate, duration = decode_audio_to_pcm(file)
    except Exception as e:
        print(f"[ERROR] decode failed: {e}")
        return jsonify({"error": f"Audio decode failed: {str(e)}"}), 400

    if duration > 31:
        return jsonify({"error": "Audio too long (max 30s)"}), 400

    wav_bytes = encode_pcm_to_wav(audio_data, sample_rate)
    if len(wav_bytes) > MAX_FILE_SIZE * 2:
        return jsonify({"error": "Encoded audio too large"}), 400

    amber_id = f"amber_{uuid.uuid4().hex[:12]}"
    filename = f"{amber_id}.wav"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    with open(filepath, "wb") as f:
        f.write(wav_bytes)

    file_size = os.path.getsize(filepath)
    if file_size > MAX_FILE_SIZE * 2:
        os.remove(filepath)
        return jsonify({"error": "Audio file exceeds size limit"}), 400

    try:
        band_energies = compute_band_energies(audio_data, sample_rate)
    except Exception as e:
        print(f"[ERROR] energy analysis failed: {e}")
        band_energies = {band: [0.5] * ENERGY_SAMPLES for band in LAYER_CONFIG}

    layers = []
    for band, cfg in LAYER_CONFIG.items():
        layers.append({
            "freq_band": band,
            "radius": cfg["radius"],
            "speed": cfg["speed"],
            "color": cfg["color"],
            "energy_data": band_energies.get(band, [0.5] * ENERGY_SAMPLES),
        })

    audio_url = f"/api/amber/{amber_id}/audio"

    return jsonify({
        "id": amber_id,
        "audio_url": audio_url,
        "duration": round(duration, 2),
        "sample_rate": sample_rate,
        "channels": TARGET_CHANNELS,
        "file_size": file_size,
        "created_at": datetime.now().isoformat(),
        "layers": layers,
    })


@app.route("/api/amber/<amber_id>/audio", methods=["GET"])
def get_amber_audio(amber_id):
    safe_id = "".join(c for c in amber_id if c.isalnum() or c in "-_")
    filename = f"{safe_id}.wav"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(filepath):
        return jsonify({"error": "Audio not found"}), 404
    return send_from_directory(
        UPLOAD_FOLDER,
        filename,
        mimetype="audio/wav",
        as_attachment=False,
        download_name=filename,
    )


@app.route("/api/amber/list", methods=["GET"])
def list_ambers():
    files = []
    for name in sorted(os.listdir(UPLOAD_FOLDER), reverse=True):
        if name.endswith(".wav") and name.startswith("amber_"):
            aid = name[:-4]
            path = os.path.join(UPLOAD_FOLDER, name)
            try:
                size = os.path.getsize(path)
                mtime = os.path.getmtime(path)
                files.append({
                    "id": aid,
                    "audio_url": f"/api/amber/{aid}/audio",
                    "file_size": size,
                    "created_at": datetime.fromtimestamp(mtime).isoformat(),
                })
            except OSError:
                continue
    return jsonify({"count": len(files), "ambers": files})


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "ok",
        "pydub_available": PYDUB_AVAILABLE,
        "upload_dir": UPLOAD_FOLDER,
        "max_file_size": MAX_FILE_SIZE,
        "sample_rate": TARGET_SAMPLE_RATE,
        "timestamp": datetime.now().isoformat(),
    })


if __name__ == "__main__":
    print("=" * 60)
    print(" 回声琥珀 Echo Amber - Flask Backend")
    print("=" * 60)
    print(f" Pydub available: {PYDUB_AVAILABLE}")
    print(f" Upload folder:   {UPLOAD_FOLDER}")
    print(f" Sample rate:     {TARGET_SAMPLE_RATE}Hz (mono)")
    print(f" Max file size:   {MAX_FILE_SIZE // 1024}KB")
    print(f" Listening on:    http://localhost:5000")
    print("=" * 60)
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
