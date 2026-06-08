from datetime import datetime, timedelta

from fastapi import APIRouter

from ..database import get_db
from ..models import DailyStats, EmotionDistribution, StreakInfo

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/daily", response_model=list[DailyStats])
async def daily_stats(days: int = 7):
    if days < 1:
        days = 7
    db = await get_db()
    try:
        since = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        cursor = await db.execute(
            "SELECT DATE(created_at) AS date, SUM(duration) AS total_duration, COUNT(*) AS session_count "
            "FROM meditations WHERE DATE(created_at) >= ? GROUP BY DATE(created_at) ORDER BY date",
            (since,),
        )
        rows = await cursor.fetchall()
        return [
            DailyStats(
                date=row["date"],
                totalDuration=row["total_duration"],
                sessionCount=row["session_count"],
            )
            for row in rows
        ]
    finally:
        await db.close()


@router.get("/emotions", response_model=EmotionDistribution)
async def emotion_distribution():
    db = await get_db()
    try:
        cursor = await db.execute("SELECT emotion, COUNT(*) AS cnt FROM meditations GROUP BY emotion")
        rows = await cursor.fetchall()
        counts = {row["emotion"]: row["cnt"] for row in rows}
        total = sum(counts.values())
        if total == 0:
            return EmotionDistribution(calm=0, joy=0, anxiety=0)
        return EmotionDistribution(
            calm=round(counts.get("calm", 0) / total * 100, 1),
            joy=round(counts.get("joy", 0) / total * 100, 1),
            anxiety=round(counts.get("anxiety", 0) / total * 100, 1),
        )
    finally:
        await db.close()


@router.get("/streak", response_model=StreakInfo)
async def streak():
    db = await get_db()
    try:
        cursor = await db.execute("SELECT DISTINCT DATE(created_at) AS d FROM meditations ORDER BY d DESC")
        dates = [row["d"] for row in await cursor.fetchall()]

        if not dates:
            return StreakInfo(currentStreak=0, longestStreak=0)

        date_set = set(dates)
        today = datetime.now().strftime("%Y-%m-%d")
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

        current = 0
        if today in date_set or yesterday in date_set:
            start = today if today in date_set else yesterday
            d = datetime.strptime(start, "%Y-%m-%d")
            while d.strftime("%Y-%m-%d") in date_set:
                current += 1
                d -= timedelta(days=1)

        longest = 0
        streak_count = 1
        sorted_dates = sorted(dates)
        for i in range(1, len(sorted_dates)):
            prev = datetime.strptime(sorted_dates[i - 1], "%Y-%m-%d")
            curr = datetime.strptime(sorted_dates[i], "%Y-%m-%d")
            if (curr - prev).days == 1:
                streak_count += 1
            else:
                longest = max(longest, streak_count)
                streak_count = 1
        longest = max(longest, streak_count)

        return StreakInfo(currentStreak=current, longestStreak=longest)
    finally:
        await db.close()
