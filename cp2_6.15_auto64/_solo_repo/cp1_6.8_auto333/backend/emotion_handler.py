import numpy as np


def hex_to_hue(color: str) -> float:
    color = color.lstrip("#")
    r = int(color[0:2], 16) / 255.0
    g = int(color[2:4], 16) / 255.0
    b = int(color[4:6], 16) / 255.0
    c_max = np.max([r, g, b])
    c_min = np.min([r, g, b])
    delta = c_max - c_min
    if delta == 0:
        return 0.0
    if c_max == r:
        hue = 60 * (((g - b) / delta) % 6)
    elif c_max == g:
        hue = 60 * (((b - r) / delta) + 2)
    else:
        hue = 60 * (((r - g) / delta) + 4)
    return float(hue % 360)


def get_waveform_type(hue: float) -> str:
    if 180 <= hue < 270:
        return "sine"
    if 60 <= hue < 180:
        return "triangle"
    if hue < 60 or hue >= 330:
        return "sawtooth"
    if 270 <= hue < 330:
        return "square"
    return "sine"


def hue_to_frequency(hue: float) -> float:
    return float(200 + (hue / 360) * 600)


def generate_audio_params(color: str) -> dict:
    hue = hex_to_hue(color)
    frequency = hue_to_frequency(hue)
    waveform = get_waveform_type(hue)
    return {
        "frequency": frequency,
        "waveform": waveform,
        "duration": 1.5,
        "attack": 0.05,
        "decay": 0.2,
        "sustain": 0.4,
        "release": 0.3,
    }
