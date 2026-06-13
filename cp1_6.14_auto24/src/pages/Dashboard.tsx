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
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface DashboardProps {
  userId: string;
  username: string;
}

const pad = (n: number) => n.toString().padStart(2, '0');
const dateKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const HEAT_COLORS = ['#f0ebe0', '#bbf7d0', '#86efac', '#4ade80', '#16a34a'];

const buildLastNDays = (n: number) => {
  const list: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    list.push(dateKey(d));
  }
  return list;
};

const CircularCalendar: React.FC<{
  cal: CalendarData;
  onSelect: (date: string) => void;
}> = ({ cal, onSelect }) => {
  const days = buildLastNDays(365);
  const cx = 260;
  const cy = 260;
  const outerR = 240;
  const innerR = 70;
  const rings = 13;
  const cellAngle = (2 * Math.PI) / (Math.ceil(365 / rings));
  const ringWidth = (outerR - innerR) / rings;

  const cells: React.ReactNode[] = [];
  const labelAngles: { angle: number; label: string; x: number; y: number }[] = [];
  const monthSet = new Set<string>();

  days.forEach((day, idx) => {
    const ring = idx % rings;
    const wedge = Math.floor(idx / rings);
    const angle = wedge * cellAngle - Math.PI / 2;
    const r0 = innerR + ring * ringWidth + 1;
    const r1 = r0 + ringWidth - 2;
    const a0 = angle;
    const a1 = angle + cellAngle - 0.02;
    const x0o = cx + r1 * Math.cos(a0);
    const y0o = cy + r1 * Math.sin(a0);
    const x1o = cx + r1 * Math.cos(a1);
    const y1o = cy + r1 * Math.sin(a1);
    const x0i = cx + r0 * Math.cos(a1);
    const y0i = cy + r0 * Math.sin(a1);
    const x1i = cx + r0 * Math.cos(a0);
    const y1i = cy + r0 * Math.sin(a0);
    const largeArc = cellAngle > Math.PI ? 1 : 0;
    const data = cal[day] || { intensity: 0, minutes: 0, pages: 0 };
    const fill = HEAT_COLORS[data.intensity];
    const path = `M ${x0o} ${y0o} A ${r1} ${r1} 0 ${largeArc} 1 ${x1o} ${y1o} L ${x0i} ${y0i} A ${r0} ${r0} 0 ${largeArc} 0 ${x1i} ${y1i} Z`;
    cells.push(
      <path
        key={idx}
        d={path}
        fill={fill}
        stroke="#ffffff"
        strokeWidth={0.4}
        style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
        onClick={() => onSelect(day)}
      >
        <title>{`${day}\n阅读 ${data.minutes} 分钟 · ${data.pages} 页`}</title>
      </path>
    );
    const monthKey = day.slice(0, 7);
    if (!monthSet.has(monthKey) && wedge % 3 === 0) {
      monthSet.add(monthKey);
      const [y, m] = monthKey.split('-');
      const midA = angle + cellAngle / 2;
      const lr = outerR + 18;
      labelAngles.push({
        angle: midA,
        label: `${parseInt(m, 10)}月`,
        x: cx + lr * Math.cos(midA),
        y: cy + lr * Math.sin(midA),
      });
    }
  });

  const todayIdx = days.length - 1;
  const todayRing = todayIdx % rings;
  const todayWedge = Math.floor(todayIdx / rings);
  const todayA = todayWedge * cellAngle + cellAngle / 2 - Math.PI / 2;
  const tr = innerR + todayRing * ringWidth + ringWidth / 2;
  const todayX = cx + tr * Math.cos(todayA);
  const todayY = cy + tr * Math.sin(todayA);

  const streak = (() => {
    let s = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      const d = cal[days[i]];
      if (d && d.minutes > 0) s++;
      else break;
    }
    return s;
  })();

  const totalDays = days.filter((d) => cal[d]?.minutes > 0).length;
  const totalMin = days.reduce((s, d) => s + (cal[d]?.minutes || 0), 0);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
      <svg viewBox="0 0 520 520" style={{ maxWidth: '100%', height: 'auto' }}>
        <defs>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff7ed" />
            <stop offset="100%" stopColor="#ffedd5" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={innerR - 4} fill="url(#centerGlow)" stroke="#fed7aa" strokeWidth={1} />
        {cells}
        {labelAngles.map((l, i) => (
          <text key={i} x={l.x} y={l.y} fontSize="10" fill="#92400e" textAnchor="middle" dominantBaseline="middle" fontWeight={600}>
            {l.label}
          </text>
        ))}
        <circle cx={todayX} cy={todayY} r={5} fill="#d97706" stroke="#ffffff" strokeWidth={1.5}>
          <animate attributeName="r" values="5;7;5" dur="1.8s" repeatCount="indefinite" />
        </circle>
        <text x={cx} y={cy - 18} textAnchor="middle" fontSize="11" fill="#92400e" fontWeight={600}>
          🔥 连续打卡
        </text>
        <text x={cx} y={cy + 8} textAnchor="middle" fontSize="36" fontWeight={800} fill="#d97706">
          {streak}
        </text>
        <text x={cx} y={cy + 32} textAnchor="middle" fontSize="11" fill="#a16207">
          天
        </text>
        <text x={cx - 32} y={cy + 52} textAnchor="middle" fontSize="10" fill="#7a5a48">
          {totalDays}天
        </text>
        <text x={cx + 32} y={cy + 52} textAnchor="middle" fontSize="10" fill="#7a5a48">
          {Math.round(totalMin / 60)}h
        </text>
      </svg>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ userId, username }) => {
  const [calendar, setCalendar] = useState<CalendarData>({});
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm] = useState({ pages: 0, minutes: 0, note: '' });

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

  const onSelectDay = (date: string) => {
    setSelectedDay(date);
    const existing = calendar[date] || { pages: 0, minutes: 0, intensity: 0 };
    setLogForm({
      pages: existing.pages || 0,
      minutes: existing.minutes || 0,
      note: '',
    });
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
          <h2 className="section-title">🔥 阅读打卡圆形日历（点击任意扇区填写记录）</h2>
          <div style={{ position: 'relative' }}>
            <CircularCalendar cal={calendar} onSelect={onSelectDay} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginTop: '14px', fontSize: '12px', color: '#7a5a48' }}>
            <span>阅读强度：</span>
            {HEAT_COLORS.map((c, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{
                  width: '16px', height: '16px', background: c,
                  borderRadius: '3px', border: '1px solid #ffffff'
                }} />
                <span>{['无', '少', '中', '多', '强'][i]}</span>
              </span>
            ))}
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
                <Line
                  type="monotone" dataKey="页数" stroke="#d97706" strokeWidth={2}
                  dot={{ fill: '#d97706', r: 3 }}
                />
                <Line
                  type="monotone" dataKey="分钟" stroke="#22c55e" strokeWidth={2}
                  dot={{ fill: '#22c55e', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h2 className="section-title">🏆 俱乐部阅读排行榜</h2>
          <div className="leaderboard-list">
            {leaderboard?.board.map((item) => (
              <div key={item.userId} className={`leaderboard-item ${item.medal}`}>
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
                type="number" className="form-input"
                value={logForm.pages}
                onChange={(e) => setLogForm((p) => ({ ...p, pages: Number(e.target.value) }))}
              />
            </div>
            <div className="form-group" style={{ marginTop: '14px' }}>
              <label>阅读时长（分钟）</label>
              <input
                type="number" className="form-input"
                value={logForm.minutes}
                onChange={(e) => setLogForm((p) => ({ ...p, minutes: Number(e.target.value) }))}
              />
            </div>
            <div className="form-group" style={{ marginTop: '14px' }}>
              <label>阅读感悟</label>
              <textarea
                className="form-input" style={{ minHeight: '80px' }}
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
