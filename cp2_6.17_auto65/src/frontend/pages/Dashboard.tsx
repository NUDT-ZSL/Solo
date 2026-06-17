import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';
import WordCloud from 'wordcloud';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import 'dayjs/locale/zh-cn';
import type { DashboardData, CategoryHeat, FilmWithStats, Rating } from '../../types.js';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const API_BASE = '';

const TABS = ['全部', '剧情', '纪录片', '动画'] as const;
type TabType = typeof TABS[number];

const COLORS = {
  barStart: '#42a5f5',
  barEnd: '#7e57c2',
  line: '#66bb6a',
  wordCloudStart: '#e91e63',
  wordCloudEnd: '#3f51b5',
};

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('全部');
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0 });
  const [showModal, setShowModal] = useState(false);
  const [showFilmList, setShowFilmList] = useState<string | null>(null);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [relatedComments, setRelatedComments] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const wordCloudRef = useRef<HTMLCanvasElement>(null);
  const wordCloudContainerRef = useRef<HTMLDivElement>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    category: '剧情' as '剧情' | '纪录片' | '动画',
    posterUrl: '',
    description: '',
    director: '',
    releaseDate: dayjs().format('YYYY-MM-DD'),
  });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/dashboard`);
      const result = await res.json();
      setData(result);
    } catch (error) {
      showToast('加载数据失败', 'error');
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const updateIndicator = () => {
      const activeIndex = TABS.indexOf(activeTab);
      const activeTabEl = tabRefs.current[activeIndex];
      if (activeTabEl) {
        setTabIndicator({
          left: activeTabEl.offsetLeft,
          width: activeTabEl.offsetWidth,
        });
      }
    };

    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [activeTab]);

  useEffect(() => {
    if (!data || !wordCloudRef.current || !wordCloudContainerRef.current) return;

    const renderWordCloud = () => {
      const canvas = wordCloudRef.current;
      const container = wordCloudContainerRef.current;
      if (!canvas || !container) return;

      const width = container.clientWidth;
      const height = 400;
      canvas.width = width;
      canvas.height = height;

      const wordList = data.wordCloud.map(item => [item.text, item.weight] as [string, number]);

      const getRandomColor = () => {
        const start = COLORS.wordCloudStart;
        const end = COLORS.wordCloudEnd;
        const startR = parseInt(start.slice(1, 3), 16);
        const startG = parseInt(start.slice(3, 5), 16);
        const startB = parseInt(start.slice(5, 7), 16);
        const endR = parseInt(end.slice(1, 3), 16);
        const endG = parseInt(end.slice(3, 5), 16);
        const endB = parseInt(end.slice(5, 7), 16);
        const ratio = Math.random();
        const r = Math.round(startR + (endR - startR) * ratio);
        const g = Math.round(startG + (endG - startG) * ratio);
        const b = Math.round(startB + (endB - startB) * ratio);
        return `rgb(${r}, ${g}, ${b})`;
      };

      WordCloud(canvas, {
        list: wordList,
        gridSize: 8,
        weightFactor: (weight) => {
          const minWeight = Math.min(...data.wordCloud.map(w => w.weight));
          const maxWeight = Math.max(...data.wordCloud.map(w => w.weight));
          const normalized = maxWeight === minWeight ? 1 : (weight - minWeight) / (maxWeight - minWeight);
          return 8 + normalized * 24;
        },
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif',
        color: getRandomColor,
        rotateRatio: 0.3,
        rotationSteps: 2,
        backgroundColor: 'transparent',
        shuffle: true,
        drawOutOfBound: false,
        click: (item) => {
          if (item) {
            handleWordClick(item[0]);
          }
        },
      });
    };

    renderWordCloud();

    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(renderWordCloud, 200);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [data]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleWordClick = async (word: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/ratings`);
      const ratings: Rating[] = await res.json();
      const filtered = ratings.filter(r => r.comment && r.comment.includes(word));
      setRelatedComments(filtered);
      setShowComments(word);
    } catch (error) {
      showToast('加载评论失败', 'error');
    }
  };

  const handleBarClick = (category: string) => {
    setShowFilmList(category === showFilmList ? null : category);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/films`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '添加失败');
      }

      showToast('添加成功', 'success');
      setShowModal(false);
      setFormData({
        title: '',
        category: '剧情',
        posterUrl: '',
        description: '',
        director: '',
        releaseDate: dayjs().format('YYYY-MM-DD'),
      });
      fetchData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '添加失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredFilms = data?.topFilms.filter(film => {
    if (activeTab === '全部') return true;
    return film.category === activeTab;
  }) || [];

  const renderBarGradient = (id: string) => (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={COLORS.barStart} />
        <stop offset="100%" stopColor={COLORS.barEnd} />
      </linearGradient>
    </defs>
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p style={{ fontWeight: 'bold', marginBottom: 4 }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!data) {
    return <div className="empty-state">加载中...</div>;
  }

  return (
    <div className="dashboard">
      <h1 className="page-title">数据分析</h1>

      <div className="dashboard-tabs">
        {TABS.map((tab, index) => (
          <button
            key={tab}
            ref={el => tabRefs.current[index] = el}
            className={`dashboard-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
        <div
          className="dashboard-tab-indicator"
          style={{ left: tabIndicator.left, width: tabIndicator.width }}
        />
      </div>

      <div className="chart-container">
        <h2 className="chart-title">分类热度</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.categoryHeats}>
            {renderBarGradient('barGradient')}
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="category" stroke="#5d4037" />
            <YAxis stroke="#5d4037" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="heat" name="热度" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(data: any) => data?.payload?.category && handleBarClick(data.payload.category)}>
              {data.categoryHeats.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={showFilmList === entry.category ? COLORS.barEnd : 'url(#barGradient)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {showFilmList && (
          <div style={{ marginTop: 16 }}>
            <h3 style={{ fontSize: 16, marginBottom: 12, color: '#3e2723' }}>
              {showFilmList}类影片列表
            </h3>
            {data.topFilms
              .filter(f => f.category === showFilmList)
              .map(film => (
                <div key={film.id} className="film-list-item">
                  <span className="film-list-title">{film.title}</span>
                  <span className="film-list-score">★ {film.averageScore}</span>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="chart-container">
        <h2 className="chart-title">每日投票趋势</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.dailyTrends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="date"
              stroke="#5d4037"
              tickFormatter={(date) => dayjs(date).format('MM-DD')}
            />
            <YAxis stroke="#5d4037" />
            <Tooltip
              content={<CustomTooltip />}
              labelFormatter={(date) => dayjs(date).format('YYYY-MM-DD')}
            />
            <Line
              type="monotone"
              dataKey="count"
              name="投票数"
              stroke={COLORS.line}
              strokeWidth={2}
              dot={{ fill: COLORS.line, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="wordcloud-container" ref={wordCloudContainerRef}>
        <canvas ref={wordCloudRef} id="wordCloudCanvas" />
      </div>

      {showComments && (
        <div className="modal-overlay" onClick={() => setShowComments(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ height: 'auto', maxHeight: '80vh' }}>
            <h2 className="modal-title">包含 "{showComments}" 的评论</h2>
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }}>
              {relatedComments.length > 0 ? (
                relatedComments.map(comment => (
                  <div key={comment.id} className="comment-item" style={{ marginBottom: 8 }}>
                    <div className="comment-header">
                      <span className="comment-time">{dayjs(comment.createdAt).fromNow()}</span>
                    </div>
                    <p className="comment-text">{comment.comment}</p>
                  </div>
                ))
              ) : (
                <div className="empty-state">暂无相关评论</div>
              )}
            </div>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowComments(null)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      <button className="add-film-btn" onClick={() => setShowModal(true)}>
        + 添加影片
      </button>

      {activeTab !== '全部' && (
        <div className="chart-container">
          <h2 className="chart-title">{activeTab}类影片</h2>
          {filteredFilms.length > 0 ? (
            filteredFilms.map(film => (
              <div key={film.id} className="film-list-item">
                <span className="film-list-title">{film.title}</span>
                <span className="film-list-score">★ {film.averageScore} ({film.voteCount}人评价)</span>
              </div>
            ))
          ) : (
            <div className="empty-state">暂无该分类影片</div>
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">添加新影片</h2>
            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">标题</label>
                <input
                  type="text"
                  name="title"
                  className="form-input"
                  value={formData.title}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">分类</label>
                <select
                  name="category"
                  className="form-input"
                  value={formData.category}
                  onChange={handleFormChange}
                  required
                >
                  <option value="剧情">剧情</option>
                  <option value="纪录片">纪录片</option>
                  <option value="动画">动画</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">海报URL</label>
                <input
                  type="url"
                  name="posterUrl"
                  className="form-input"
                  value={formData.posterUrl}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">导演</label>
                <input
                  type="text"
                  name="director"
                  className="form-input"
                  value={formData.director}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">上映日期</label>
                <input
                  type="date"
                  name="releaseDate"
                  className="form-input"
                  value={formData.releaseDate}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">简介</label>
                <textarea
                  name="description"
                  className="form-input form-textarea"
                  value={formData.description}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="modal-btn cancel" onClick={() => setShowModal(false)}>
                  取消
                </button>
                <button type="submit" className="modal-btn submit" disabled={loading}>
                  {loading ? <div className="spinner" /> : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast" style={{ backgroundColor: toast.type === 'success' ? '#4caf50' : '#f44336' }}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
