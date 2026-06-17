import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Download } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

type TimeRange = 'all' | '30d' | '7d';

interface RatingTrendItem {
  date: string;
  rating: number;
}

interface OriginStatItem {
  origin: string;
  avgRating: number;
  count: number;
}

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: '30d', label: '近30天' },
  { key: '7d', label: '近7天' },
];

const BAR_COLORS = [
  '#6366F1', '#7176F1', '#7F8AF1', '#8D9EF1',
  '#9B8BEE', '#A978EA', '#B565E7', '#C052E3',
];

export default function Stats() {
  const [range, setRange] = useState<TimeRange>('all');
  const [ratingTrend, setRatingTrend] = useState<RatingTrendItem[]>([]);
  const [originStats, setOriginStats] = useState<OriginStatItem[]>([]);
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null);
  const [filteredRecords, setFilteredRecords] = useState<OriginStatItem[]>([]);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/brews/stats?range=${range}`);
      const data = await res.json();
      setRatingTrend(data.ratingTrend);
      setOriginStats(data.originStats);
      setSelectedOrigin(null);
      setFilteredRecords([]);
    } catch {
      console.error('获取统计数据失败');
    }
  }, [range]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleBarClick = (data: OriginStatItem) => {
    if (selectedOrigin === data.origin) {
      setSelectedOrigin(null);
      setFilteredRecords([]);
    } else {
      setSelectedOrigin(data.origin);
      setFilteredRecords(originStats.filter((s) => s.origin === data.origin));
    }
  };

  const handleExportChart = async () => {
    if (!chartContainerRef.current || ratingTrend.length === 0) {
      alert('暂无数据可导出');
      return;
    }

    const svg = chartContainerRef.current.querySelector('svg');
    if (!svg) {
      alert('图表加载中，请稍后再试');
      return;
    }

    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = 2;
        canvas.width = svg.clientWidth * scale;
        canvas.height = svg.clientHeight * scale;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.fillStyle = '#FFF8F0';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.scale(scale, scale);
          ctx.drawImage(img, 0, 0);

          const pngUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          const rangeLabel =
            range === 'all' ? '全部' : range === '30d' ? '近30天' : '近7天';
          link.download = `评分趋势图_${rangeLabel}.png`;
          link.href = pngUrl;
          link.click();
        }

        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        alert('导出失败，请重试');
        URL.revokeObjectURL(url);
      };
      img.src = url;
    } catch {
      alert('导出失败，请重试');
    }
  };

  return (
    <div className="stats-page">
      <div className="stats-header">
        <h2 className="page-title">数据统计</h2>
        <button className="btn btn-export" onClick={handleExportChart}>
          <Download size={16} />
          导出图表
        </button>
      </div>

      <div className="range-tabs">
        {TIME_RANGES.map(({ key, label }) => (
          <button
            key={key}
            className={`range-tab ${range === key ? 'range-tab--active' : ''}`}
            onClick={() => setRange(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="chart-section">
        <h3 className="section-title">评分趋势</h3>
        <div ref={chartContainerRef}>
          {ratingTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={ratingTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d8" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6B7280' }} />
              <YAxis
                domain={[0, 10]}
                tick={{ fontSize: 12, fill: '#6B7280' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFF8F0',
                  border: '1px solid #6B4226',
                  borderRadius: 6,
                }}
              />
              <Line
                type="monotone"
                dataKey="rating"
                stroke="#3B82F6"
                strokeWidth={2}
                strokeOpacity={0.6}
                dot={{ fill: '#3B82F6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="no-data">暂无评分数据</p>
        )}
        </div>
      </div>

      <div className="chart-section">
        <h3 className="section-title">产地评分对比</h3>
        {originStats.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={originStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d8" />
              <XAxis dataKey="origin" tick={{ fontSize: 12, fill: '#6B7280' }} />
              <YAxis
                domain={[0, 10]}
                tick={{ fontSize: 12, fill: '#6B7280' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFF8F0',
                  border: '1px solid #6B4226',
                  borderRadius: 6,
                }}
                formatter={(value: number) => [`${value} 分`, '平均评分']}
              />
              <Bar dataKey="avgRating" radius={[4, 4, 0, 0]} onClick={handleBarClick as never}>
                {originStats.map((_, index) => (
                  <Cell
                    key={index}
                    fill={BAR_COLORS[index % BAR_COLORS.length]}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="no-data">暂无产地数据</p>
        )}
      </div>

      {selectedOrigin && (
        <div className="filtered-section">
          <h3 className="section-title">
            筛选：{selectedOrigin}
            <button
              className="clear-filter"
              onClick={() => {
                setSelectedOrigin(null);
                setFilteredRecords([]);
              }}
            >
              清除筛选
            </button>
          </h3>
          <div className="filtered-list">
            {filteredRecords.map((r) => (
              <div key={r.origin} className="filtered-item">
                <span className="filtered-origin">{r.origin}</span>
                <span className="filtered-rating">
                  平均 {r.avgRating} 分 / {r.count} 条记录
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
