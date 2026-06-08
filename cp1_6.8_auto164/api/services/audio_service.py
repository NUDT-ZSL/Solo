import os
import uuid
import random
import math

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "audio")

os.makedirs(UPLOAD_DIR, exist_ok=True)


async def save_audio_file(file_content: bytes, filename: str) -> str:
    file_id = uuid.uuid4().hex[:12]
    ext = os.path.splitext(filename)[1] or ".webm"
    saved_name = f"{file_id}{ext}"
    saved_path = os.path.join(UPLOAD_DIR, saved_name)
    with open(saved_path, "wb") as f:
        f.write(file_content)
    return saved_path


def extract_features(file_size: int) -> dict:
    loudness = min(max(20 * math.log10(file_size / 1024 + 1) - 10, -30), 0)
    return {
        "averageRms": round(random.uniform(0.1, 0.8), 4),
        "averageFreq": round(random.uniform(200, 2000), 2),
        "tempo": round(random.uniform(60, 180), 2),
        "loudness": round(loudness, 2),
        "warmth": round(random.uniform(0, 1), 4),
    }


async def compute_heatmap(db) -> dict:
    cursor = await db.execute(
        "SELECT lat, lng, loudness, warmth FROM audio_markers"
    )
    rows = await cursor.fetchall()

    if not rows:
        return {
            "points": [],
            "bounds": {"north": 0, "south": 0, "east": 0, "west": 0},
        }

    points = []
    for row in rows:
        lat = row["lat"]
        lng = row["lng"]
        loudness = row["loudness"]
        warmth = row["warmth"]
        intensity = max(0.1, min(1.0, (loudness + 30) / 30))
        audio_type = "warm" if warmth > 0.5 else "cool"
        points.append(
            {
                "lat": lat,
                "lng": lng,
                "intensity": round(intensity, 4),
                "audioType": audio_type,
            }
        )

    lats = [p["lat"] for p in points]
    lngs = [p["lng"] for p in points]
    padding = 0.01
    bounds = {
        "north": max(lats) + padding,
        "south": min(lats) - padding,
        "east": max(lngs) + padding,
        "west": min(lngs) - padding,
    }

    clustered = _cluster_points(points)

    return {"points": clustered, "bounds": bounds}


def _cluster_points(points: list[dict], radius: float = 0.005) -> list[dict]:
    if not points:
        return []

    clustered = []
    used = [False] * len(points)

    for i, p in enumerate(points):
        if used[i]:
            continue
        cluster = [p]
        used[i] = True
        for j in range(i + 1, len(points)):
            if used[j]:
                continue
            dist = math.sqrt(
                (p["lat"] - points[j]["lat"]) ** 2
                + (p["lng"] - points[j]["lng"]) ** 2
            )
            if dist < radius:
                cluster.append(points[j])
                used[j] = True

        avg_lat = sum(c["lat"] for c in cluster) / len(cluster)
        avg_lng = sum(c["lng"] for c in cluster) / len(cluster)
        total_intensity = sum(c["intensity"] for c in cluster) / len(cluster)
        warm_count = sum(1 for c in cluster if c["audioType"] == "warm")
        audio_type = "warm" if warm_count > len(cluster) / 2 else "cool"

        clustered.append(
            {
                "lat": round(avg_lat, 6),
                "lng": round(avg_lng, 6),
                "intensity": round(min(total_intensity * (1 + 0.1 * len(cluster)), 1.0), 4),
                "audioType": audio_type,
            }
        )

    return clustered
