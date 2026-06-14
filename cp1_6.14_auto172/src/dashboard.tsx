import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getVolunteers, getActivities, type Volunteer, type Activity } from './mock-api';
import { computeMonthlyStats, computeLeaderboard, type MonthlyStats, type LeaderboardItem } from './data-processor';

type ActivityType = '垃圾分类宣传' | '河道清洁' | '植树' | null;
type SortOrder = 'asc' | 'desc';

const typeColors: Record<Exclude<ActivityType, null>, string> = {
  '垃圾分类宣传': 'green',
  '河道清洁': 'blue',
  '植树': 'orange'
};

const typeLabels: Array<{ type: Exclude<ActivityType, null>; label: string; color: string }> = [
  { type: '垃圾分类宣传', label: '垃圾分类宣传', color: 'green' },
  { type: '河道清洁', label: '河道清洁', color: 'blue' },
  { type: '植树', label: '植树', color: 'orange' }
];

const currentYear = 2026;

class EventBus {
  private events: Map<string, Array<(...args: unknown[]) => void>> = new Map();

  on(event: string, callback: (...args: unknown[]) => void): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  emit(event: string, ...args: unknown[]): void {
    if (this.events.has(event)) {
      this.events.get(event)!.forEach((cb) => cb(...args));
    }
  }
}

const eventBus = new EventBus();

export default function Dashboard() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<ActivityType>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      const [volunteersData, activitiesData] = await Promise.all([
        getVolunteers(),
        getActivities()
      ]);
      setVolunteers(volunteersData);
      setActivities(activitiesData);
      setLoading(false);
    };
    loadData();
  }, []);

  const volunteerMap = useMemo(() => {
    const map = new Map<string, Volunteer>();
    volunteers.forEach((v) => map.set(v.id, v));
    return map;
  }, [volunteers]);

  const monthlyStats = useMemo((): MonthlyStats[] => {
    if (activities.length === 0) return [];
    return computeMonthlyStats(activities, currentYear);
  }, [activities]);

  const leaderboard = useMemo((): LeaderboardItem[] => {
    if (activities.length === 0 || volunteers.length === 0) return [];
    return computeLeaderboard(activities, volunteers);
  }, [activities, volunteers]);

  const filteredActivities = useMemo((): Activity[] => {
    let result = [...activities];
    if (filterType) {
      result = result.filter((a) => a.type === filterType);
    }
    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
    return result;
  }, [activities, filterType, sortOrder]);

  const handleFilterClick = useCallback((type: Exclude<ActivityType, null>) => {
    const startTime = performance.now();
    setFilterType((prev) => (prev === type ? null : type));
    eventBus.emit('filterChange', type, performance.now() - startTime);
  }, []);

  const handleSortToggle = useCallback(() => {
    const startTime = performance.now();
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    eventBus.emit('sortChange', sortOrder === 'asc' ? 'desc' : 'asc', performance.now() - startTime);
  }, [sortOrder]);

  useEffect(() => {
    if (monthlyStats.length === 0 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 30, right: 10, bottom: 40, left: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    const maxCount = Math.max(...monthlyStats.map((s) => s.count), 1);
    const maxDuration = Math.max(...monthlyStats.map((s) => s.duration), 1);

    const barWidth = 20;
    const innerGap = 10;
    const groupWidth = barWidth * 2 + innerGap;
    const totalGroupWidth = groupWidth * 12;
    const startX = padding.left + (chartWidth - totalGroupWidth) / 2;

    ctx.font = '11px -apple-system, sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'center';
    for (let i = 0; i < 12; i++) {
      ctx.fillText(`${i + 1}月`, startX + i * groupWidth + groupWidth / 2, height - padding.bottom + 20);
    }

    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(startX - 5, y);
      ctx.lineTo(startX + totalGroupWidth + 5, y);
      ctx.stroke();

      const countValue = Math.round(maxCount - (maxCount / 4) * i);
      ctx.fillStyle = '#3b82f6';
      ctx.textAlign = 'right';
      ctx.fillText(String(countValue), startX - 8, y + 4);

      const durationValue = Math.round(maxDuration - (maxDuration / 4) * i);
      ctx.fillStyle = '#f59e0b';
      ctx.textAlign = 'left';
      ctx.fillText(String(durationValue), startX + totalGroupWidth + 8, y + 4);
    }

    monthlyStats.forEach((stat, index) => {
      const countHeight = (stat.count / maxCount) * chartHeight;
      const durationHeight = (stat.duration / maxDuration) * chartHeight;
      const groupX = startX + index * groupWidth;

      if (hoveredMonth === index + 1) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
        ctx.fillRect(groupX - 2, padding.top, groupWidth + 4, chartHeight);
      }

      ctx.fillStyle = '#3b82f6';
      const countX = groupX;
      const countY = padding.top + chartHeight - countHeight;
      ctx.fillRect(countX, countY, barWidth, countHeight);

      ctx.fillStyle = '#f59e0b';
      const durationX = groupX + barWidth + innerGap;
      const durationY = padding.top + chartHeight - durationHeight;
      ctx.fillRect(durationX, durationY, barWidth, durationHeight);
    });

    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 11px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('次数', startX - 5, padding.top - 8);
    ctx.fillStyle = '#f59e0b';
    ctx.textAlign = 'right';
    ctx.fillText('时长(分)', startX + totalGroupWidth + 5, padding.top - 8);
  }, [monthlyStats, hoveredMonth]);

  const handleChartMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !chartContainerRef.current || monthlyStats.length === 0) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const containerRect = chartContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const width = rect.width;
    const padding = { top: 30, right: 10, bottom: 40, left: 10 };
    const chartWidth = width - padding.left - padding.right;
    const barWidth = 20;
    const innerGap = 10;
    const groupWidth = barWidth * 2 + innerGap;
    const totalGroupWidth = groupWidth * 12;
    const startX = padding.left + (chartWidth - totalGroupWidth) / 2;

    let foundMonth: number | null = null;
    for (let i = 0; i < 12; i++) {
      const groupX = startX + i * groupWidth;
      if (x >= groupX && x <= groupX + groupWidth) {
        foundMonth = i + 1;
        break;
      }
    }

    if (foundMonth !== hoveredMonth) {
      setHoveredMonth(foundMonth);
    }

    if (foundMonth) {
      setTooltipPos({
        x: e.clientX - containerRect.left,
        y: e.clientY - containerRect.top - 10
      });
    }
  }, [hoveredMonth, monthlyStats]);

  const handleChartMouseLeave = useCallback(() => {
    setHoveredMonth(null);
  }, []);

  const getTooltipContent = useCallback(() => {
    if (!hoveredMonth || monthlyStats.length === 0) return '';
    const stat = monthlyStats[hoveredMonth - 1];
    return `${hoveredMonth}月：${stat.count}次活动，${stat.duration}分钟`;
  }, [hoveredMonth, monthlyStats]);

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="dashboard">
        <div className="panel panel-left">
          <h2 className="panel-title">{currentYear}年 月度统计</h2>
          <div
            className="chart-container"
            ref={chartContainerRef}
          >
            <canvas
              ref={canvasRef}
              onMouseMove={handleChartMouseMove}
              onMouseLeave={handleChartMouseLeave}
            />
            {hoveredMonth && (
              <div
                className="chart-tooltip"
                style={{
                  left: tooltipPos.x,
                  top: tooltipPos.y
                }}
              >
                {getTooltipContent()}
              </div>
            )}
          </div>
          <div className="chart-legend">
            <div className="legend-item">
              <span className="legend-color blue" />
              <span>活动次数</span>
            </div>
            <div className="legend-item">
              <span className="legend-color orange" />
              <span>时长(分钟)</span>
            </div>
          </div>

          <h2 className="panel-title" style={{ marginTop: '32px' }}>活动记录</h2>

          <div className="filter-bar">
            {typeLabels.map(({ type, label, color }) => (
              <button
                key={type}
                className={`filter-btn ${filterType === type ? `active-${color}` : ''}`}
                onClick={() => handleFilterClick(type)}
              >
                {label}
              </button>
            ))}
          </div>

          <table className="activity-table">
            <thead>
              <tr>
                <th onClick={handleSortToggle} className="sortable-header">
                  <span className="header-content">
                    日期
                    <span className={`sort-arrow ${sortOrder}`}>
                      <span className="arrow-up">▲</span>
                      <span className="arrow-down">▼</span>
                    </span>
                  </span>
                </th>
                <th>志愿者</th>
                <th>活动类型</th>
                <th>时长(分钟)</th>
              </tr>
            </thead>
            <tbody>
              {filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">暂无活动记录</div>
                  </td>
                </tr>
              ) : (
                filteredActivities.map((activity) => {
                  const volunteer = volunteerMap.get(activity.volunteerId);
                  return (
                    <tr key={activity.id}>
                      <td>{activity.date}</td>
                      <td>{volunteer?.name || '-'}</td>
                      <td>
                        <span className={`tag tag-${typeColors[activity.type]}`}>
                          {activity.type}
                        </span>
                      </td>
                      <td className="duration">{activity.duration}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="panel panel-right">
          <h2 className="panel-title">志愿者排行榜</h2>
          <ul className="leaderboard-list">
            {leaderboard.length === 0 ? (
              <li>
                <div className="empty-state">暂无排名数据</div>
              </li>
            ) : (
              leaderboard.map((item) => (
                <li
                  key={item.volunteerId}
                  className={`leaderboard-item ${item.rank === 1 ? 'top-1' : ''}`}
                >
                  <span className="leaderboard-rank">{item.rank}</span>
                  <div className="leaderboard-avatar">{item.avatar}</div>
                  <div className="leaderboard-info">
                    <div className="leaderboard-name">{item.name}</div>
                    <div className="leaderboard-duration">
                      累计 {Math.round(item.totalDuration / 60 * 10) / 10} 小时
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
