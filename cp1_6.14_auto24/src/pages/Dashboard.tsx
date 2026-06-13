import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarData,
  CalendarCell,
  getReadingCalendar,
  getReadingTrend,
  getLeaderboard,
  Leaderboard,
  saveReadingLog,
  TrendPoint,
} from '../client/activity';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  userId: string;
  username: string;
}

const pad = (n: number) => n.toString().padStart(2, '0');
const dateKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const buildCalendar = (calendar: CalendarData) => {
  const today = new Date();
  const startDay = today.getDay();
  const totalDays = 52 * 7 + startDay + 1;
  const weeks: { date: string; data: CalendarCell }[][] = [];
  let currentWeek: { date: string; data: CalendarCell }[] = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    if (weeks.length === 0 && weeks.length === 0 && d.getDay() !== 0) {
      for (let j = 0; j < d.getDay(); j++) {
        currentWeek.push({ date: '', data: { minutes: 0, pages: 0, intensity: 0 });
      }
    }
    currentWeek.push({
      date: key, data: calendar[key] || { minutes: 0, pages: 0, intensity: 0 }
    });
    if (d.getDay() === 6 || i === 0) {
      if (currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
  }
  return weeks;
};

const monthLabels = (weeks: { date: string; data: CalendarCell }[][]) => {
  const labels: { offset: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, idx) => {
    const firstValid = week.find((d) => d.date);
    if (firstValid) {
      const m = new Date(firstValid.date).getMonth();
      if (m !== lastMonth) {
        labels.push({ offset: idx * 15, label: `${m + 1}月` });
        lastMonth = m;
      }
    }
  });
  return labels;
};

const Dashboard: React.FC<DashboardProps> = ({ userId, username }) => {
  const [calendar, setCalendar] = useState<CalendarData>({});
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm] = useState({ pages: 0, minutes: 0, note: '' });
  const weeks = useMemo(() => buildCalendar(calendar), [calendar]);
  const months = useMemo(() => monthLabels(weeks), [weeks]);

  const loadData = async () => {
    const [cal, trendData, board] = await Promise.all([
      getReadingCalendar(userId),
      getReadingTrend(userId),
      getLeaderboard(),
    ]);
    setCalendar(cal);
    setTrend(trendData);
    setLeaderboard(board);
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const onCellClick = (day: { date: string }) => {
    if (!day.date) return;
    setSelectedDay(day.date);
    const existing = calendar[day.date] || { pages: 0, minutes: 0, intensity: 0 };
    setLogForm({
      pages: existing.pages || 0, minutes: existing.minutes || 0, note: '' });
    setShowLogModal(true);
  };

  const submitLog = async () => {
    if (!selectedDay) return;
    await saveReadingLog({
      userId,
      date: selectedDay,
      pages: Number(logForm.pages) || 0,
      minutes: Number(logForm.minutes) || 0,
      note: logForm.note,
    });
    setShowLogModal(false);
    await loadData();
  };

  const trendChartData = trend.map((t) => ({
    name: t.date.slice(5),
    页数: t.pages,
    分钟: t.minutes,
  }));

  return (
    <div>
      <h1 className="page-title">📊 {username} 的阅读看板</h1>

      {leaderboard && (
        <div className="stats-summary">
          <div className="stat-card">
            <div className="stat-card-value">{leaderboard.stats.members}</div>
            <div className="stat-card-label">俱乐部成员</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value">{leaderboard.stats.books}</div>
            <div className="stat-card-label">俱乐部图书</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value">{leaderboard.stats.totalPages.toLocaleString()}</div>
            <div className="stat-card-label">俱乐部总阅读页数</div>
          </div>
        </div>
      )}

      <div className="dashboard-full">
        <div className="card">
          <h2 className="section-title">🔥 阅读打卡热力图（点击任意格子填写记录）</h2>
          <div className="heatmap-container">
            <div className="heatmap-wrapper">
              <div className="heatmap-months">
                {months.map((m, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0 }}>{m.label}</span>
                </div>
              ))}
              </div>
              <div className="heatmap-body">
                <div className="heatmap-weekdays">
                  <div>日</div>
                  <div style={{ opacity: 0 }}>一</div>
                  <div>二</div>
                  <div style={{ opacity: 0 }}>三</div>
                  <div>四</div>
                  <div style={{ opacity: 0 }}>五</div>
                  <div>六</div>
                </div>
                <div className="heatmap-weeks">
                  {weeks.map((week, wIdx) => (
                    <div key={wIdx} className="heatmap-week">
                      {week.map((day, dIdx) => (
                        <div
                          key={dIdx}
                          className={`heatmap-cell heatmap-${day.data.intensity}`}
                          onClick={() => onCellClick(day)}
                          title={day.date ? `${day.date}: ${day.data.minutes}分钟, ${day.data.pages}页` : ''}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <div className="heatmap-legend">
                <span>少</span>
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className={`heatmap-legend-box heatmap-${i}`} />
                )}
                <span>多</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h2 className="section-title">📈 最近30天阅读趋势</h2>
          <div className="trend-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0e6d6" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#a08a74' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#a08a74' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e8d5c0', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="页数" stroke="#d97706" strokeWidth={2} dot={{ fill: '#d97706', r: 3 }} />
                <Line type="monotone" dataKey="分钟" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h2 className="section-title">🏆 俱乐部阅读排行榜</h2>
          <div className="leaderboard-list">
            {leaderboard?.board.map((item) => (
              <div
                key={item.userId}
                className={`leaderboard-item ${item.medal}`}
              >
                <div className={`leaderboard-rank ${item.medal}`}>
                  {item.medal ? (
                    <span className="medal-icon">
                      {item.medal === 'gold' && '🥇'}
                      {item.medal === 'silver' && '🥈'}
                      {item.medal === 'bronze' && '🥉'}
                    </span>
                  ) : (
                    item.rank
                  )}
                </div>
                <img src={item.avatar} alt={item.username} className="leaderboard-avatar" />
                <div className="leaderboard-name">{item.username}</div>
                <div>
                  <span className="leaderboard-pages">{item.pages.toLocaleString()}</span>
                  <span className="leaderboard-unit">页</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showLogModal && (
        <div className="modal-overlay" onClick={() => setShowLogModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">📖 {selectedDay} 阅读记录</div>
            <div className="form-group">
              <label>阅读页数</label>
              <input
                type="number"
                className="form-input"
                value={logForm.pages}
                onChange={(e) => setLogForm((p) => ({ ...p, pages: Number(e.target.value) })}
              />
            </div>
            <div className="form-group" style={{ marginTop: '14px' }}>
              <label>阅读时长（分钟）</label>
              <input
                type="number"
                className="form-input"
                value={logForm.minutes}
                onChange={(e) => setLogForm((p) => ({ ...p, minutes: Number(e.target.value) })}
              />
            </div>
            <div className="form-group" style={{ marginTop: '14px' }}>
              <label>阅读感悟</label>
              <textarea
                className="form-input"
                style={{ minHeight: '80px' }}
                placeholder="今日心得..."
                value={logForm.note}
                onChange={(e) => setLogForm((p) => ({ ...p, note: e.target.value }))}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowLogModal(false)}>取消</button>
              <button className="btn-primary" onClick={submitLog}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
