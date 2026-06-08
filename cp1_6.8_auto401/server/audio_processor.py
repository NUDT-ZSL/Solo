import random
import struct
import math
from typing import Any


def extract_audio_features(audio_data: bytes) -> dict[str, Any]:
    if len(audio_data) < 44:
        return _default_features()
    try:
        sample_values = []
        step = max(1, len(audio_data) // 2000)
        for i in range(44, min(len(audio_data), 44 + 80000), step):
            if i + 1 < len(audio_data):
                val = struct.unpack_from('<h', audio_data, i)[0]
                sample_values.append(val / 32768.0)
        if not sample_values:
            return _default_features()
        avg_amplitude = sum(abs(v) for v in sample_values) / len(sample_values)
        zero_crossings = sum(
            1 for i in range(1, len(sample_values))
            if (sample_values[i] >= 0) != (sample_values[i - 1] >= 0)
        )
        estimated_freq = zero_crossings / 2.0 / max(len(sample_values) / 44100.0, 0.01)
        energy = sum(v * v for v in sample_values) / len(sample_values)
        spectral_centroid = sum(
            abs(sample_values[i]) * i for i in range(len(sample_values))
        ) / max(sum(abs(v) for v in sample_values), 0.0001)
        return {
            "avg_amplitude": float(avg_amplitude),
            "estimated_freq": float(min(estimated_freq, 4000)),
            "energy": float(energy),
            "spectral_centroid": float(spectral_centroid / max(len(sample_values), 1)),
            "zero_crossing_rate": float(zero_crossings / max(len(sample_values), 1)),
        }
    except Exception:
        return _default_features()


def _default_features() -> dict[str, Any]:
    return {
        "avg_amplitude": random.uniform(0.1, 0.5),
        "estimated_freq": random.uniform(200, 2000),
        "energy": random.uniform(0.01, 0.2),
        "spectral_centroid": random.uniform(0.2, 0.7),
        "zero_crossing_rate": random.uniform(0.05, 0.3),
    }


def generate_illustration_params(features: dict[str, Any], mood: str) -> dict[str, Any]:
    mood_palettes = {
        "宁静": {
            "bg_colors": ["#e0f2fe", "#dbeafe", "#f0f9ff"],
            "shape_colors": ["#93c5fd", "#a5b4fc", "#c4b5fd", "#7dd3fc", "#bae6fd"],
            "particle_colors": ["#93c5fd", "#c4b5fd", "#e0e7ff"],
        },
        "欢快": {
            "bg_colors": ["#fef9c3", "#fef3c7", "#fff7ed"],
            "shape_colors": ["#fbbf24", "#f97316", "#fb923c", "#facc15", "#fdba74"],
            "particle_colors": ["#fbbf24", "#fb923c", "#fde68a"],
        },
        "忧郁": {
            "bg_colors": ["#e0e7ff", "#c7d2fe", "#e8e0f0"],
            "shape_colors": ["#818cf8", "#6366f1", "#a78bfa", "#7c3aed", "#8b5cf6"],
            "particle_colors": ["#818cf8", "#a78bfa", "#c7d2fe"],
        },
        "激昂": {
            "bg_colors": ["#fee2e2", "#fecaca", "#fff1f2"],
            "shape_colors": ["#ef4444", "#f97316", "#eab308", "#dc2626", "#f59e0b"],
            "particle_colors": ["#ef4444", "#f97316", "#fbbf24"],
        },
        "梦幻": {
            "bg_colors": ["#f3e8ff", "#ede9fe", "#faf5ff"],
            "shape_colors": ["#c084fc", "#e879f9", "#a78bfa", "#d946ef", "#8b5cf6"],
            "particle_colors": ["#c084fc", "#e879f9", "#e9d5ff"],
        },
        "温暖": {
            "bg_colors": ["#fff7ed", "#ffedd5", "#fef3c7"],
            "shape_colors": ["#fb923c", "#fdba74", "#fbbf24", "#f59e0b", "#fcd34d"],
            "particle_colors": ["#fb923c", "#fbbf24", "#fde68a"],
        },
    }
    palette = mood_palettes.get(mood, mood_palettes["宁静"])

    amplitude = features.get("avg_amplitude", 0.3)
    freq = features.get("estimated_freq", 500)
    energy = features.get("energy", 0.1)
    spectral_centroid = features.get("spectral_centroid", 0.4)

    bg_index1 = random.randint(0, len(palette["bg_colors"]) - 1)
    bg_index2 = (bg_index1 + 1) % len(palette["bg_colors"])

    bg_gradient = {
        "color1": palette["bg_colors"][bg_index1],
        "color2": palette["bg_colors"][bg_index2],
        "angle": random.uniform(0, 360),
    }

    num_shapes = int(6 + energy * 80 + random.uniform(0, 5))
    num_shapes = min(num_shapes, 20)
    shapes = []
    shape_types = ["circle", "rect", "triangle"]

    for _ in range(num_shapes):
        shape_type = random.choice(shape_types)
        size = 20 + amplitude * 200 + random.uniform(-30, 30)
        size = max(10, min(size, 250))
        shape = {
            "type": shape_type,
            "x": random.uniform(0.05, 0.95),
            "y": random.uniform(0.05, 0.95),
            "size": size,
            "color": random.choice(palette["shape_colors"]),
            "opacity": 0.15 + amplitude * 0.5 + random.uniform(-0.1, 0.1),
            "rotation": random.uniform(0, 360),
            "pulseSpeed": 0.5 + freq / 2000,
            "pulseAmplitude": 0.05 + energy * 0.3,
        }
        shape["opacity"] = max(0.1, min(shape["opacity"], 0.85))
        shapes.append(shape)

    particle_count = int(40 + spectral_centroid * 120 + random.uniform(0, 20))
    particle_count = min(particle_count, 200)

    particle_config = {
        "count": particle_count,
        "colors": palette["particle_colors"],
        "sizeRange": [1.5 + amplitude * 3, 3 + amplitude * 6],
        "speedRange": [0.2 + energy * 2, 0.8 + energy * 4],
        "frequency_response": freq / 2000,
        "beat_sensitivity": 0.3 + energy * 0.7,
    }

    waveform_config = {
        "color": random.choice(palette["shape_colors"]),
        "opacity": 0.6 + amplitude * 0.3,
        "lineWidth": 2 + amplitude * 3,
        "amplitudeScale": 0.3 + spectral_centroid * 0.5,
    }

    return {
        "bg_gradient": bg_gradient,
        "shapes": shapes,
        "particle_config": particle_config,
        "waveform_config": waveform_config,
        "mood": mood,
        "features_snapshot": features,
    }
