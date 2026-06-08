from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from typing import List, Dict, Any

from models import JournalEntry, TrendsResponse, HeatmapItem, RadarItem
import storage

app = FastAPI(title="Emotion Journal API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DAY_NAMES = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
DEFAULT_ACTIVITIES = ["运动", "阅读", "社交", "工作", "学习"]


def _get_weekday_name(dt: datetime) -> str:
    weekday = dt.weekday()
    return DAY_NAMES[weekday]


def _build_empty_heatmap(start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
    heatmap: List[Dict[str, Any]] = []

    current = start_date
    while current <= end_date:
        day_name = _get_weekday_name(current)
        for hour in range(24):
            heatmap.append({
                "day": day_name,
                "hour": hour,
                "emotion": None,
            })
        current += timedelta(days=1)

    if len(heatmap) > 7 * 24:
        heatmap = heatmap[: 7 * 24]
    elif len(heatmap) < 7 * 24:
        last_date = end_date
        while len(heatmap) < 7 * 24:
            last_date += timedelta(days=1)
            day_name = _get_weekday_name(last_date)
            for hour in range(24):
                if len(heatmap) >= 7 * 24:
                    break
                heatmap.append({
                    "day": day_name,
                    "hour": hour,
                    "emotion": None,
                })

    return heatmap


@app.post("/journal")
def create_journal(entry: JournalEntry):
    try:
        record = storage.add_journal(entry.dict())
        return {"status": "success", "data": record}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/journal/trends", response_model=TrendsResponse)
def get_trends(
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format"),
):
    try:
        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    if start_dt > end_dt:
        raise HTTPException(status_code=400, detail="start_date must be before or equal to end_date")

    journals = storage.get_journals_in_range(start_date, end_date)

    heatmap_data = _build_empty_heatmap(start_dt, end_dt)

    for j in journals:
        try:
            ts = datetime.fromisoformat(j["timestamp"].replace("Z", "+00:00"))
            day_name = _get_weekday_name(ts)
            hour = ts.hour
            for item in heatmap_data:
                if item["day"] == day_name and item["hour"] == hour:
                    item["emotion"] = j["emotion"]
                    break
        except (ValueError, KeyError):
            continue

    activity_counts: Dict[str, int] = {}
    for act in DEFAULT_ACTIVITIES:
        activity_counts[act] = 0

    for j in journals:
        for act in j.get("activities", []):
            if act in activity_counts:
                activity_counts[act] += 1
            else:
                activity_counts[act] = activity_counts.get(act, 0) + 1

    radar_data: List[RadarItem] = [
        RadarItem(activity=act, count=count)
        for act, count in activity_counts.items()
    ]

    return TrendsResponse(
        heatmap=[HeatmapItem(**item) for item in heatmap_data],
        radar=radar_data,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
