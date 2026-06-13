import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';
import { generateLineChartConfig, getMoodCardBackground, formatDate, getMoodColor } from '../utils/chartGenerator';
import type { MoodDataPoint } from '../utils/chartGenerator';

interface Entry {
  id: string;
  mood: number;
  note: string;
  date: string;
  createdAt: string;
}

interface WordItem {
  text: string;
  size: number;
  color: string;
  x: number;
  y: number;
}

const WORD_CLOUD_COLORS = ['#3b82f6', '#ec4899', '#f59e0b', '#10b981'];

function generateWordCloud(notes: string[]): WordItem[] {
  const stopWords = new Set([
    '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
    '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
    '自己', '这', '他', '她', '它', '们', '那', '些', '什么', '吗', '吧', '啊', '呢',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
    'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either',
    'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his',
    'she', 'her', 'it', 'its', 'they', 'them', 'their', 'this', 'that',
  ]);

  const freq: Record<string, number> = {};
  notes.forEach((note) => {
    const words = note
      .replace(/[^\u4e00-\u9fa5a-zA-Z\s]/g, '')
      .split(/[\s]+/)
      .filter((w) => w.length > 1 && !stopWords.has(w.toLowerCase()));
    words.forEach((w) => {
      const key = w.toLowerCase();
      freq[key] = (freq[key] || 0) + 1;
    });
  });

  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);

  if (sorted.length === 0) return [];

  const maxFreq = sorted[0][1];
  const minFreq = sorted[sorted.length - 1][1];
  const range = maxFreq - minFreq || 1;

  const placed: WordItem[] = [];
  const containerW = 400;
  const containerH = 400;

  sorted.forEach(([word, count]) => {
    const size = 12 + ((count - minFreq) / range) * 24;
    const color = WORD_CLOUD_COLORS[Math.floor(Math.random() * WORD_CLOUD_COLORS.length)];

    let x = 0;
    let y = 0;
    let found = false;

    for (let attempt = 0; attempt < 100; attempt++) {
      x = 20 + Math.random() * (containerW - 80);
      y = 20 + Math.random() * (containerH - 60);

      const overlap = placed.some((p) => {
        const dx = Math.abs(p.x - x);
        const dy = Math.abs(p.y - y);
        return dx < 60 && dy < 30;
      });

      if (!overlap) {
        found = true;
        break;
      }
    }

    if (!found) {
      x = 20 + Math.random() * (containerW - 80);
      y = 20 + Math.random() * (containerH - 60);
    }

    placed.push({ text: word, size, color, x, y });
  });

  return placed;
}

const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<{ daily: MoodDataPoint[]; overallAvg: number | null; totalEntries: number } | null>(null);
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

  const filteredDaily = summary?.daily.map((d) => {
    if (!searchQuery.trim()) return d;
    const hasMatch = d.notes.some((n) => n.toLowerCase().includes(searchQuery.toLowerCase()));
    return { ...d, highlighted: hasMatch };
  }) || [];

  const filteredEntries = searchQuery.trim()
    ? allEntries.filter(
        (e) =>
          e.note.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.date.includes(searchQuery)
      )
    : allEntries;

  const filteredDailyMap: Record<string, Entry[]> = {};
  filteredEntries.forEach((e) => {
    if (!filteredDailyMap[e.date]) filteredDailyMap[e.date] = [];
    filteredDailyMap[e.date].push(e);
  });

  const highlightedDates = filteredDaily
    .filter((d) => d.highlighted)
    .map((d) => d.date);

  const chartConfig = generateLineChartConfig(summary?.daily || [], highlightedDates);

  const allNotes = allEntries.map((e) => e.note).filter((n) => n.trim());
  const wordCloudItems = generateWordCloud(allNotes);

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
      wordCloud: wordCloudItems.map((w) => ({ word: w.text, size: w.size })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mind-palette-report-${monthStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDotClick = (data: MoodDataPoint) => {
    if (data.notes && data.notes.length > 0) {
      setSelectedNote({ date: data.date, notes: data.notes });
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ fontSize: 16, color: '#9ca3af' }}>加载中...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
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
            style={{
              width: 320,
              height: 40,
              paddingLeft: 36,
              paddingRight: 12,
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#6366f1')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
          />
        </div>

        <button
          onClick={handleExport}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          style={{
            width: 160,
            height: 40,
            backgroundColor: '#64748b',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease-out',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#475569')}
          onMouseLeave2={(e) => (e.currentTarget.style.backgroundColor = '#64748b')}
        >
          导出本月报告
        </button>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 16 }}>
          最近7天情绪
        </h3>
        <div
          style={{
            display: 'flex',
            gap: 12,
            overflowX: 'auto',
            paddingBottom: 8,
          }}
        >
          {(summary?.daily || []).map((day) => {
            const dayEntries = filteredDailyMap[day.date] || [];
            const isFiltered = searchQuery.trim() && dayEntries.length === 0;
            return (
              <div
                key={day.date}
                style={{
                  minWidth: 160,
                  width: 160,
                  height: 100,
                  borderRadius: 12,
                  background: getMoodCardBackground(day.avgMood),
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease-out',
                  cursor: day.notes.length > 0 ? 'pointer' : 'default',
                  opacity: isFiltered ? 0.4 : 1,
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                onClick={() => {
                  if (day.notes.length > 0) {
                    setSelectedNote({ date: day.date, notes: day.notes });
                  }
                }}
              >
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                  {formatDate(day.date)}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span
                    style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: day.avgMood !== null ? getMoodColor(day.avgMood) : '#d1d5db',
                    }}
                  >
                    {day.avgMood !== null ? day.avgMood.toFixed(1) : '--'}
                  </span>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>
                    {day.count > 0 ? `${day.count}条` : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
          padding: 24,
          marginBottom: 32,
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 16 }}>
          本周情绪趋势
        </h3>
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
              formatter={(value: number | null) => [
                value !== null ? value.toFixed(1) : '无数据',
                '平均情绪',
              ]}
              labelFormatter={formatDate}
            />
            <Line
              type="monotone"
              dataKey="avgMood"
              stroke={chartConfig.lineColor}
              strokeWidth={2}
              dot={{
                r: 4,
                fill: chartConfig.dotColor,
                stroke: '#fff',
                strokeWidth: 2,
                cursor: 'pointer',
              }}
              activeDot={{
                r: 6,
                fill: chartConfig.dotColor,
                stroke: '#fff',
                strokeWidth: 2,
                onClick: (_: unknown, payload: { payload: MoodDataPoint }) => {
                  handleDotClick(payload.payload);
                },
              }}
              connectNulls={false}
            />
            {chartConfig.highlightedDates.map((date) => {
              const dataPoint = chartConfig.data.find((d) => d.date === date);
              if (!dataPoint || dataPoint.avgMood === null) return null;
              return (
                <ReferenceDot
                  key={date}
                  x={date}
                  y={dataPoint.avgMood}
                  r={6}
                  fill={chartConfig.highlightColor}
                  stroke="#fff"
                  strokeWidth={3}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleDotClick(dataPoint)}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div
        style={{
          backgroundColor: '#f9fafb',
          borderRadius: 16,
          padding: 24,
          marginBottom: 32,
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 16 }}>
          词语云
        </h3>
        {wordCloudItems.length > 0 ? (
          <div
            style={{
              position: 'relative',
              width: 400,
              height: 400,
              margin: '0 auto',
              maxWidth: '100%',
            }}
          >
            {wordCloudItems.map((word, i) => (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  left: word.x,
                  top: word.y,
                  fontSize: word.size,
                  color: word.color,
                  fontWeight: 600,
                  transition: 'all 0.2s ease-out',
                  cursor: 'default',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {word.text}
              </span>
            ))}
          </div>
        ) : (
          <div
            style={{
              width: 400,
              height: 400,
              maxWidth: '100%',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af',
              fontSize: 14,
            }}
          >
            暂无笔记数据，记录心情后词语云将自动生成
          </div>
        )}
      </div>

      {selectedNote && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelectedNote(null)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 24,
              maxWidth: 400,
              width: '90%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, color: '#1f2937' }}>
                {formatDate(selectedNote.date)} 笔记
              </h4>
              <button
                onClick={() => setSelectedNote(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 20,
                  cursor: 'pointer',
                  color: '#9ca3af',
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
            {selectedNote.notes.map((note, i) => (
              <div
                key={i}
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#f9fafb',
                  borderRadius: 8,
                  marginBottom: 8,
                  fontSize: 14,
                  color: '#374151',
                  lineHeight: 1.6,
                }}
              >
                {note}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
