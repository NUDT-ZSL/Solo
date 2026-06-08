import uuid

from database import get_db
from models import AudioFeatures, AudioMarker


async def create_route(user_id: str, name: str, description: str) -> dict:
    db = await get_db()
    route_id = uuid.uuid4().hex[:16]
    await db.execute(
        "INSERT INTO routes (id, user_id, name, description) VALUES (?, ?, ?, ?)",
        (route_id, user_id, name, description),
    )
    await db.commit()
    return {
        "id": route_id,
        "name": name,
        "description": description,
        "markers": [],
        "createdAt": _now(),
    }


async def get_all_routes(user_id: str = "default-user") -> list[dict]:
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM routes WHERE user_id = ? ORDER BY created_at DESC",
        (user_id,),
    )
    routes = await cursor.fetchall()
    result = []
    for route in routes:
        markers = await _get_markers_for_route(db, route["id"])
        result.append(
            {
                "id": route["id"],
                "name": route["name"],
                "description": route["description"] or "",
                "markers": markers,
                "createdAt": route["created_at"],
            }
        )
    return result


async def get_route_by_id(route_id: str) -> dict | None:
    db = await get_db()
    cursor = await db.execute("SELECT * FROM routes WHERE id = ?", (route_id,))
    route = await cursor.fetchone()
    if route is None:
        return None
    markers = await _get_markers_for_route(db, route["id"])
    return {
        "id": route["id"],
        "name": route["name"],
        "description": route["description"] or "",
        "markers": markers,
        "createdAt": route["created_at"],
    }


async def update_route(route_id: str, name: str | None, description: str | None) -> dict | None:
    db = await get_db()
    cursor = await db.execute("SELECT * FROM routes WHERE id = ?", (route_id,))
    route = await cursor.fetchone()
    if route is None:
        return None

    new_name = name if name is not None else route["name"]
    new_desc = description if description is not None else route["description"]

    await db.execute(
        "UPDATE routes SET name = ?, description = ? WHERE id = ?",
        (new_name, new_desc, route_id),
    )
    await db.commit()

    markers = await _get_markers_for_route(db, route_id)
    return {
        "id": route_id,
        "name": new_name,
        "description": new_desc or "",
        "markers": markers,
        "createdAt": route["created_at"],
    }


async def delete_route(route_id: str) -> bool:
    db = await get_db()
    cursor = await db.execute("SELECT * FROM routes WHERE id = ?", (route_id,))
    route = await cursor.fetchone()
    if route is None:
        return False

    marker_cursor = await db.execute(
        "SELECT audio_path FROM audio_markers WHERE route_id = ?", (route_id,)
    )
    markers = await marker_cursor.fetchall()

    import os

    for marker in markers:
        path = marker["audio_path"]
        if os.path.exists(path):
            os.remove(path)

    await db.execute("DELETE FROM comments WHERE audio_marker_id IN (SELECT id FROM audio_markers WHERE route_id = ?)", (route_id,))
    await db.execute("DELETE FROM ratings WHERE audio_marker_id IN (SELECT id FROM audio_markers WHERE route_id = ?)", (route_id,))
    await db.execute("DELETE FROM audio_markers WHERE route_id = ?", (route_id,))
    await db.execute("DELETE FROM routes WHERE id = ?", (route_id,))
    await db.commit()
    return True


async def _get_markers_for_route(db, route_id: str) -> list[dict]:
    cursor = await db.execute(
        "SELECT * FROM audio_markers WHERE route_id = ? ORDER BY created_at",
        (route_id,),
    )
    rows = await cursor.fetchall()
    result = []
    for row in rows:
        result.append(_row_to_marker(row))
    return result


def _row_to_marker(row) -> dict:
    return {
        "id": row["id"],
        "routeId": row["route_id"],
        "lat": row["lat"],
        "lng": row["lng"],
        "audioUrl": f"/api/audio/{row['id']}/stream",
        "duration": row["duration"],
        "features": {
            "averageRms": row["average_rms"],
            "averageFreq": row["average_freq"],
            "tempo": row["tempo"],
            "loudness": row["loudness"],
            "warmth": row["warmth"],
        },
        "createdAt": row["created_at"],
    }


def _now() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat()
