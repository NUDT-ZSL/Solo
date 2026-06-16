import { useMemo } from 'react';

interface HeatmapCalendarProps {
  dailyMinutes: Record<string, number>;
  currentStreak: number;
  weeks?: number;
}

const LEVEL_COLORS = [
  '#1E1B2E',
  '#312E81',
  '#4F46E5',
  '#8B5CF6',
  '#A78BFA',
  '#C4B5FD',
];

const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function HeatmapCalendar({
  dailyMinutes,
  currentStreak,
  weeks = 12,
}: HeatmapCalendarProps) {
  const { weeks: weekList, maxMinutes } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDay = today.getDay();
    const lastDay = new Date(today);
    lastDay.setDate(today.getDate() + (6 - endDay));

    const startDay = new Date(lastDay);
    startDay.setDate(lastDay.getDate() - (weeks * 7 - 1));

    const weeksArr: { date: Date; minutes: number; level: number }[][] = [];
    let maxMin = 0;

    let currentWeek: { date: Date; minutes: number; level: number }[] = [];
    let d = new Date(startDay);

    while (d <= lastDay) {
      const key = formatDateKey(d);
      const minutes = dailyMinutes[key] || 0;
      if (minutes > maxMin) maxMin = minutes;
      currentWeek.push({ date: new Date(d), minutes, level: 0 });

      if (d.getDay() === 6) {
        weeksArr.push(currentWeek);
        currentWeek = [];
      }
      d.setDate(d.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        const nextDay = new Date(currentWeek[currentWeek.length - 1].date);
        nextDay.setDate(nextDay.getDate() + 1);
        currentWeek.push({ date: nextDay, minutes: 0, level: 0 });
      }
      weeksArr.push(currentWeek);
    }

    const normalizedWeeks = weeksArr.map(week =>
      week.map(day => {
        let level = 0;
        if (day.minutes > 0 && maxMin > 0) {
          const ratio = day.minutes / Math.max(maxMin, 30);
          level = Math.min(LEVEL_COLORS.length - 1, Math.ceil(ratio * (LEVEL_COLORS.length - 1)));
          if (day.minutes > 0 && level === 0) level = 1;
        }
        return { ...day, level };
      })
    );

    return { weeks: normalizedWeeks, maxMinutes: maxMin };
  }, [dailyMinutes, weeks]);

  const totalDays = useMemo(
    () => Object.keys(dailyMinutes).filter(k => dailyMinutes[k] > 0).length,
    [dailyMinutes]
  );

  const totalMinutes = useMemo(
    () => Object.values(dailyMinutes).reduce((s, v) => s + v, 0),
    [dailyMinutes]
  );

  return (
    <div className="heatmap-calendar">
      <div className="heatmap-header">
        <div className="heatmap-stats">
          <div className="heatmap-stat">
            <span className="heatmap-stat-num">{totalDays}</span>
            <span className="heatmap-stat-label">练习天数</span>
          </div>
          <div className="heatmap-stat">
            <span className="heatmap-stat-num highlight">
              🔥 {currentStreak}
            </span>
            <span className="heatmap-stat-label">连续打卡</span>
          </div>
          <div className="heatmap-stat">
            <span className="heatmap-stat-num">{Math.floor(totalMinutes / 60)}h</span>
            <span className="heatmap-stat-label">总练习时长</span>
          </div>
        </div>
        <div className="heatmap-legend">
          <span className="legend-label">少</span>
          {LEVEL_COLORS.map((color, i) => (
            <span
              key={i}
              className="legend-block"
              style={{ backgroundColor: color }}
            />
          ))}
          <span className="legend-label">多</span>
        </div>
      </div>

      <div className="heatmap-grid-wrapper">
        <div className="heatmap-weekdays">
          {WEEK_LABELS.map((label, i) => (
            <span key={i} className="weekday-label">{label}</span>
          ))}
        </div>
        <div className="heatmap-grid">
          {weekList.map((week, wi) => (
            <div key={wi} className="heatmap-week">
              {week.map((day, di) => {
                const isToday = formatDateKey(day.date) === formatDateKey(new Date());
                return (
                  <div
                    key={di}
                    className={`heatmap-cell ${isToday ? 'today' : ''}`}
                    style={{ backgroundColor: LEVEL_COLORS[day.level] }}
                    title={`${day.date.getMonth() + 1}月${day.date.getDate()}日: ${day.minutes}分钟`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
