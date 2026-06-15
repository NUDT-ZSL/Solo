import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

interface DailyDuration {
  date: string;
  label: string;
  duration: number;
}

interface KnowledgeStat {
  name: string;
  score: number;
}

interface Stats {
  dailyDurations: DailyDuration[];
  knowledgeStats: KnowledgeStat[];
}

const KNOWLEDGE_POINTS = ['组件设计', '状态管理', '路由配置', '性能优化', '工程化'];

interface StarRatingProps {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}

const StarRating = React.memo(({ value, onChange, size = 28 }: StarRatingProps) => {
  const [clickedStar, setClickedStar] = useState<number | null>(null);
  const [hoverStar, setHoverStar] = useState<number>(0);

  const handleClick = (star: number) => {
    setClickedStar(star);
    onChange(star);
    setTimeout(() => setClickedStar(null), 300);
  };

  const displayValue = hoverStar > 0 ? hoverStar : value;

  return (
    <div className="star-rating" style={{ gap: '2px' }}>
      {[1, 2, 3, 4, 5].map(star => {
        const isActive = star <= displayValue;
        const isClicked = clickedStar === star;
        return (
          <span
            key={star}
            className={`star ${isActive ? 'star--active' : ''} ${isClicked ? 'star--click' : ''}`}
            style={{ fontSize: `${size}px` }}
            onClick={() => handleClick(star)}
            onMouseEnter={() => setHoverStar(star)}
            onMouseLeave={() => setHoverStar(0)}
            role="button"
            aria-label={`${star}星`}
            tabIndex={0}
          >
            ★
          </span>
        );
      })}
    </div>
  );
});

StarRating.displayName = 'StarRating';

const TrackingModule: React.FC = () => {
  const [duration, setDuration] = useState<number>(30);
  const [description, setDescription] = useState<string>('');
  const [knowledgeScores, setKnowledgeScores] = useState<Record<string, number>>(() => {
    const scores: Record<string, number> = {};
    KNOWLEDGE_POINTS.forEach(p => { scores[p] = 0; });
    return scores;
  });
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [chartKey, setChartKey] = useState<number>(0);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/stats');
      setStats(res.data);
      setChartKey(prev => prev + 1);
    } catch {
      setError('加载统计数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!description.trim()) {
      setError('请填写学习内容描述');
      return;
    }
    if (duration < 15) {
      setError('学习时长不能少于15分钟');
      return;
    }

    setSubmitting(true);
    setError('');
    const today = new Date().toISOString().split('T')[0];

    try {
      await axios.post('/api/activity', {
        date: today,
        duration,
        description: description.trim(),
        knowledge_scores: knowledgeScores,
      });
      setDescription('');
      setDuration(30);
      const resetScores: Record<string, number> = {};
      KNOWLEDGE_POINTS.forEach(p => { resetScores[p] = 0; });
      setKnowledgeScores(resetScores);
      await loadStats();
    } catch (err: any) {
      setError(err.response?.data?.error || '提交失败');
    } finally {
      setSubmitting(false);
    }
  }, [duration, description, knowledgeScores, loadStats]);

  const barChartData = useMemo(() => {
    if (!stats?.dailyDurations) return [];
    return stats.dailyDurations.map(d => ({
      name: d.label,
      时长: Math.round(d.duration),
    }));
  }, [stats]);

  const radarData = useMemo(() => {
    if (!stats?.knowledgeStats) {
      return KNOWLEDGE_POINTS.map(name => ({ name, score: 0 }));
    }
    return stats.knowledgeStats.map(k => ({
      name: k.name,
      score: k.score,
    }));
  }, [stats]);

  const handleKnowledgeScore = useCallback((point: string, score: number) => {
    setKnowledgeScores(prev => ({ ...prev, [point]: score }));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📊 进度追踪</h1>
        <p className="page-subtitle">记录每日学习活动，追踪知识掌握度</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <h3 className="card-title">📝 记录学习活动</h3>

        <div className="form-group">
          <label className="form-label">学习时长（拖拽滑块调节）</label>
          <div className="slider-container">
            <input
              type="range"
              className="slider"
              min={15}
              max={240}
              step={5}
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
            />
            <span className="slider-value">{duration} 分钟</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">学习内容描述</label>
          <textarea
            className="form-textarea"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="描述今天的学习内容、收获或遇到的问题..."
            rows={3}
          />
        </div>

        <div className="form-group">
          <label className="form-label">知识点掌握度评分</label>
          <div className="knowledge-score-list">
            {KNOWLEDGE_POINTS.map(point => (
              <div className="knowledge-score-item" key={point}>
                <span className="knowledge-score-label">{point}</span>
                <StarRating
                  value={knowledgeScores[point] || 0}
                  onChange={score => handleKnowledgeScore(point, score)}
                  size={26}
                />
              </div>
            ))}
          </div>
        </div>

        <button
          className="btn"
          onClick={handleSubmit}
          disabled={submitting}
          style={{ width: '100%' }}
        >
          {submitting ? <span className="spinner" /> : null}
          {submitting ? '提交中...' : '提交学习记录'}
        </button>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="pulse-circle" />
        </div>
      )}

      {!loading && stats && (
        <div className="stats-dashboard">
          <div className="chart-container">
            <h4 className="chart-title">📈 最近7天学习时长</h4>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                key={`bar-${chartKey}`}
                data={barChartData}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eceff1" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#78909c' }} />
                <YAxis tick={{ fontSize: 12, fill: '#78909c' }} unit="分" />
                <Tooltip
                  formatter={(value: number) => [`${value} 分钟`, '学习时长']}
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                />
                <Bar
                  dataKey="时长"
                  fill="#4fc3f7"
                  radius={[4, 4, 0, 0]}
                  animationDuration={500}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h4 className="chart-title">🎯 知识点掌握度</h4>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart
                key={`radar-${chartKey}`}
                data={radarData}
                cx="50%"
                cy="50%"
                outerRadius="70%"
              >
                <PolarGrid stroke="#cfd8dc" />
                <PolarAngleAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#546e7a' }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: '#90a4ae' }}
                />
                <Radar
                  name="掌握度"
                  dataKey="score"
                  stroke="#4fc3f7"
                  fill="#4fc3f7"
                  fillOpacity={0.35}
                  animationDuration={500}
                  animationEasing="ease-out"
                  isAnimationActive={true}
                />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, '掌握度']}
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!loading && !stats && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <div className="empty-state-text">提交学习记录后，这里将展示你的学习统计</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackingModule;
