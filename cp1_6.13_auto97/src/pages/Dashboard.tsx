import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { generateLineChartConfig, getMoodCardBackground, formatDate, getMoodColor } from '../utils/chartGenerator';
import type { MoodDataPoint } from '../utils/chartGenerator';
import WordCloud from '../components/WordCloud';

interface Entry {
  id: string;
  mood: number;
  note: string;
  date: string;
  createdAt: string;
}

const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<{
    daily: MoodDataPoint[];
    overallAvg: number | null;
    totalEntries: number;
  } | null>(null);
  const [allEntries, setAllEntries] = useState<Entry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<{ date: string; notes: string[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, entriesRes] = await Promise.all([
        axios.get('/api/stats/summary'),
        axios.get('/api/entries/all'),
      ]);
      setSummary(summaryRes.data);
      setAllEntries(entriesRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const highlightedDates = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const dates = new Set<string>();
    allEntries.forEach((e) => {
      if (e.note.toLowerCase().includes(searchQuery.toLowerCase())) {
        dates.add(e.date);
      }
    });
    return dates;
  }, [searchQuery, allEntries]);

  const chartConfig = useMemo(
    () => generateLineChartConfig(summary?.daily || [], Array.from(highlightedDates)),
    [summary?.daily, highlightedDates]
  );

  const allNotes = useMemo(
    () => allEntries.map((e) => e.note).filter((n) => n.trim()),
    [allEntries]
  );

  const handleExport = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    const monthEntries = allEntries.filter((e) => e.date.startsWith(monthStr));
    const monthMoods = monthEntries.map((e) => e.mood);
    const monthAvg =
      monthMoods.length > 0
        ? (monthMoods.reduce((a, b) => a + b, 0) / monthMoods.length).toFixed(2)
        : 'N/A';

    const dailyStats: Record<string, { moods: number[]; notes: string[] }> = {};
    monthEntries.forEach((e) => {
      if (!dailyStats[e.date]) dailyStats[e.date] = { moods: [], notes: [] };
      dailyStats[e.date].moods.push(e.mood);
      if (e.note) dailyStats[e.date].notes.push(e.note);
    });

    const exportData = {
      reportMonth: monthStr,
      overallAverage: monthAvg,
      totalEntries: monthEntries.length,
      dailyBreakdown: Object.entries(dailyStats).map(([date, data]) => ({
        date,
        averageMood: (data.moods.reduce((a, b) => a + b, 0) / data.moods.length).toFixed(2),
        entryCount: data.moods.length,
        notes: data.notes,
      })),
      wordCloudSnapshot: allNotes.join(' ').slice(0, 500),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mind-palette-report-${monthStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDotClick = (payload: MoodDataPoint) => {
    if (payload.notes && payload.notes.length > 0) {
      setSelectedNote({ date: payload.date, notes: payload.notes });
    }
  };

  const isCardVisible = (day: MoodDataPoint): boolean => {
    if (!searchQuery.trim()) return true;
    const hasMatchingNote = day.notes.some((n) =>
      n.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return hasMatchingNote;
  };

  if (loading) {
    return (
      <div className="loading-state-full">
        <div>加载中...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-toolbar">
        <div className="search-box-wrapper">
          <svg
            className="search-box-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9ca3af"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索笔记关键词..."
            className="search-input"
          />
        </div>

        <button
          className="btn-export"
          onClick={handleExport}
        >
          导出本月报告
        </button>
      </div>

      <section className="dashboard-section">
        <h3 className="page-section-title">最近7天情绪</h3>
        <div className="mood-cards-scroll">
          {(summary?.daily || []).map((day) => {
            const visible = isCardVisible(day);
            return (
              <div
                key={day.date}
                className={`mood-card ${visible ? '' : 'mood-card-dimmed'}`}
                style={{ background: getMoodCardBackground(day.avgMood) }}
                onClick={() => {
                  if (day.notes.length > 0) {
                    setSelectedNote({ date: day.date, notes: day.notes });
                  }
                }}
              >
                <div className="mood-card-date">{formatDate(day.date)}</div>
                <div className="mood-card-value-row">
                  <span
                    className="mood-card-value"
                    style={{ color: day.avgMood !== null ? getMoodColor(day.avgMood) : '#d1d5db' }}
                  >
                    {day.avgMood !== null ? day.avgMood.toFixed(1) : '--'}
                  </span>
                  <span className="mood-card-count">
                    {day.count > 0 ? `${day.count}条` : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="chart-card">
          <h3 className="page-section-title">本周情绪趋势</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartConfig.data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                domain={[1, 10]}
                ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
                formatter={(value: string | number) => [
                  value != null ? Number(value).toFixed(1) : '无数据',
                  '平均情绪',
                ]}
                labelFormatter={formatDate}
              />
              <Line
                type="monotone"
                dataKey="avgMood"
                stroke={chartConfig.lineColor}
                strokeWidth={2}
                dot={(dotProps: { cx?: number; cy?: number; payload?: MoodDataPoint }) => {
                  const { cx, cy, payload } = dotProps;
                  if (cx === undefined || cy === undefined || !payload) return <circle key="empty" />;
                  const isHighlighted = highlightedDates.has(payload.date);
                  return (
                    <circle
                      key={payload.date}
                      cx={cx}
                      cy={cy}
                      r={isHighlighted ? 7 : 4}
                      fill={isHighlighted ? '#f97316' : chartConfig.dotColor}
                      stroke={isHighlighted ? '#f97316' : '#fff'}
                      strokeWidth={isHighlighted ? 3 : 2}
                      style={{ cursor: 'pointer', transition: 'all 0.2s ease-out' }}
                      onClick={() => handleDotClick(payload)}
                    />
                  );
                }}
                activeDot={{
                  r: 6,
                  fill: chartConfig.dotColor,
                  stroke: '#fff',
                  strokeWidth: 2,
                  onClick: (_props: Record<string, unknown>, payload: { payload: MoodDataPoint }) => {
                    handleDotClick(payload.payload);
                  },
                }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="dashboard-section">
        <h3 className="page-section-title">词语云</h3>
        <div className="wordcloud-section">
          <WordCloud notes={allNotes} />
        </div>
      </section>

      {selectedNote && (
        <div className="modal-overlay" onClick={() => setSelectedNote(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4 className="modal-title">{formatDate(selectedNote.date)} 笔记</h4>
              <button className="modal-close" onClick={() => setSelectedNote(null)}>
                ✕
              </button>
            </div>
            {selectedNote.notes.map((note, i) => (
              <div key={i} className="modal-note-item">{note}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
