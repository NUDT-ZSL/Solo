import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import EmotionForm from './components/EmotionForm';
import EmotionBubbleChart from './components/EmotionBubbleChart';
import type { EmotionRecord } from './types';
import { EMOTION_CONFIG, INTENSITY_LABELS } from './types';

type PageType = 'home' | 'chart';

interface ToastMessage {
  type: 'success' | 'error';
  message: string;
  id: number;
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

function getWeekDaysFromToday(days: number): string[] {
  const result: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result.push(d.toISOString().split('T')[0]);
  }
  return result;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return {
    date: d.getDate(),
    weekday: WEEKDAY_LABELS[d.getDay()],
    full: dateStr,
  };
}

function generateEmotionSummary(
  records: EmotionRecord[]
): {
  total: number;
  mostFrequent: string;
  avgIntensity: number;
  description: string;
} {
  const total = records.length;
  if (total === 0) {
    return {
      total: 0,
      mostFrequent: '-',
      avgIntensity: 0,
      description: '暂无情绪记录，期待你的第一条记录～',
    };
  }

  const typeCount: Record<string, number> = {};
  let intensitySum = 0;
  let maxIntensity = 0;
  let minIntensity = 5;

  records.forEach((r) => {
    typeCount[r.type] = (typeCount[r.type] || 0) + 1;
    intensitySum += r.intensity;
    if (r.intensity > maxIntensity) maxIntensity = r.intensity;
    if (r.intensity < minIntensity) minIntensity = r.intensity;
  });

  const sortedTypes = Object.entries(typeCount).sort((a, b) => b[1] - a[1]);
  let mostFrequent: string;
  if (
    sortedTypes.length >= 2 &&
    sortedTypes[0][1] === sortedTypes[1][1] &&
    sortedTypes[0][1] === Math.ceil(total / sortedTypes.length)
  ) {
    mostFrequent = '多样';
  } else {
    mostFrequent = EMOTION_CONFIG[sortedTypes[0][0] as keyof typeof EMOTION_CONFIG].label;
  }

  const avgIntensity = Math.round((intensitySum / total) * 10) / 10;
  const intensityRange = maxIntensity - minIntensity;

  const topType = sortedTypes[0][0] as keyof typeof EMOTION_CONFIG;
  const topLabel = EMOTION_CONFIG[topType].label;
  const topRatio = sortedTypes[0][1] / total;

  let description = '';
  if (intensityRange >= 3) {
    description = `本周情绪波动较大，以${topLabel}为主`;
  } else if (topRatio >= 0.6) {
    if (avgIntensity >= 3.5) {
      description = `本周情绪以${topLabel}为主，整体感受强烈`;
    } else {
      description = `本周情绪以${topLabel}为主，整体状态温和`;
    }
  } else if (avgIntensity <= 1.5) {
    description = '本周整体情绪较为平淡，波澜不惊';
  } else if (avgIntensity >= 3.5) {
    description = '本周情绪体验丰富，感受较为浓烈';
  } else {
    description = `本周情绪以${topLabel}和${
      EMOTION_CONFIG[sortedTypes[1]?.[0] as keyof typeof EMOTION_CONFIG]?.label ||
      '其他'
    }为主，状态平稳`;
  }

  return {
    total,
    mostFrequent,
    avgIntensity,
    description,
  };
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [emotionRecords, setEmotionRecords] = useState<EmotionRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const weekDays = getWeekDaysFromToday(7);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { type, message, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const fetchEmotions = useCallback(async () => {
    try {
      const response = await axios.get('/api/emotions', {
        params: { days: 7 },
      });
      if (response.data.success) {
        setEmotionRecords(response.data.data);
      }
    } catch (error) {
      console.error('获取情绪记录失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmotions();
  }, [fetchEmotions]);

  const handleFormSubmit = useCallback(
    async (data: {
      date: string;
      type: EmotionRecord['type'];
      intensity: number;
      note: string;
    }) => {
      try {
        const response = await axios.post('/api/emotions', data);
        if (response.data.success) {
          showToast('success', '情绪已记录');
          await fetchEmotions();
          return true;
        } else {
          showToast('error', response.data.error || '记录失败');
          return false;
        }
      } catch (error: any) {
        const msg =
          error?.response?.data?.error || '网络错误，请稍后重试';
        showToast('error', msg);
        return false;
      }
    },
    [fetchEmotions, showToast]
  );

  const handleUpdateRecord = useCallback(
    async (
      id: string,
      data: { type?: EmotionRecord['type']; intensity?: number }
    ) => {
      try {
        const response = await axios.put(`/api/emotions/${id}`, data);
        if (response.data.success) {
          showToast('success', '记录已更新');
          await fetchEmotions();
          return true;
        } else {
          showToast('error', response.data.error || '更新失败');
          return false;
        }
      } catch (error: any) {
        const msg = error?.response?.data?.error || '更新失败';
        showToast('error', msg);
        return false;
      }
    },
    [fetchEmotions, showToast]
  );

  const handleDeleteRecord = useCallback(
    async (id: string) => {
      try {
        const response = await axios.delete(`/api/emotions/${id}`);
        if (response.data.success) {
          showToast('success', '记录已删除');
          await fetchEmotions();
          return true;
        } else {
          showToast('error', response.data.error || '删除失败');
          return false;
        }
      } catch (error: any) {
        const msg = error?.response?.data?.error || '删除失败';
        showToast('error', msg);
        return false;
      }
    },
    [fetchEmotions, showToast]
  );

  const filteredRecords = selectedDate
    ? emotionRecords.filter((r) => r.date === selectedDate)
    : emotionRecords;

  const sortedRecords = [...filteredRecords].sort(
    (a, b) => a.timestamp - b.timestamp
  );

  const stats = generateEmotionSummary(emotionRecords);

  const emotionsByDate: Record<string, EmotionRecord[]> = {};
  emotionRecords.forEach((r) => {
    if (!emotionsByDate[r.date]) emotionsByDate[r.date] = [];
    emotionsByDate[r.date].push(r);
  });

  return (
    <div className="app-container">
      <div className="main-content">
        <header className="app-header">
          <h1 className="app-title">情绪涟漪</h1>
          <p className="app-subtitle">记录每一次心跳的波动，编织你独特的情绪网络</p>
        </header>

        <nav className="nav-tabs">
          <button
            className={`nav-tab ${currentPage === 'home' ? 'active' : ''}`}
            onClick={() => setCurrentPage('home')}
          >
            记录情绪
          </button>
          <button
            className={`nav-tab ${currentPage === 'chart' ? 'active' : ''}`}
            onClick={() => {
              setCurrentPage('chart');
              setSelectedDate(null);
            }}
          >
            情绪图表
          </button>
        </nav>

        <div className="pages-container" key={currentPage}>
          {currentPage === 'home' && (
            <div className="home-page">
              <div className="home-layout">
                <EmotionForm onSubmit={handleFormSubmit} />
                <div className="glass-card">
                  <h2
                    style={{
                      color: '#ffffff',
                      fontSize: '22px',
                      marginBottom: '24px',
                      textAlign: 'center',
                    }}
                  >
                    最近记录
                  </h2>
                  {emotionRecords.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">💭</div>
                      <div className="empty-state-text">
                        还没有情绪记录
                        <br />
                        开始你的第一次记录吧
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {emotionRecords.slice(0, 5).map((r) => {
                        const cfg = EMOTION_CONFIG[r.type];
                        return (
                          <div
                            key={r.id}
                            style={{
                              padding: '14px',
                              background: 'rgba(255,255,255,0.04)',
                              borderRadius: '12px',
                              border: '1px solid rgba(255,255,255,0.06)',
                              display: 'flex',
                              gap: '12px',
                              alignItems: 'flex-start',
                            }}
                          >
                            <div
                              style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                background: cfg.color,
                                boxShadow: `0 0 12px ${cfg.color}`,
                                marginTop: '4px',
                                flexShrink: 0,
                              }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  marginBottom: '4px',
                                }}
                              >
                                <span
                                  style={{
                                    color: cfg.color,
                                    fontWeight: 600,
                                    fontSize: '14px',
                                  }}
                                >
                                  {cfg.label} ·{' '}
                                  {INTENSITY_LABELS[r.intensity]}
                                </span>
                                <span
                                  style={{
                                    color: 'rgba(224,224,224,0.5)',
                                    fontSize: '12px',
                                  }}
                                >
                                  {r.date}
                                </span>
                              </div>
                              <div
                                style={{
                                  color: 'rgba(224,224,224,0.7)',
                                  fontSize: '13px',
                                  lineHeight: 1.5,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                }}
                              >
                                {r.note}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentPage === 'chart' && (
            <div className="chart-page">
              <div className="calendar-strip">
                <div className="calendar-strip-inner">
                  {weekDays.map((dateStr) => {
                    const { date, weekday } = formatDate(dateStr);
                    const dayEmotions = emotionsByDate[dateStr] || [];
                    const isSelected = selectedDate === dateStr;
                    return (
                      <div
                        key={dateStr}
                        className={`calendar-day ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                      >
                        <div className="calendar-date">{date}</div>
                        <div className="calendar-weekday">周{weekday}</div>
                        <div className="calendar-emotions">
                          {dayEmotions.slice(0, 4).map((e, i) => (
                            <div
                              key={`${e.id}-${i}`}
                              className="calendar-emotion-dot"
                              style={{
                                background: EMOTION_CONFIG[e.type].color,
                                color: EMOTION_CONFIG[e.type].color,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="chart-wrapper">
                {isLoading ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">⏳</div>
                    <div className="empty-state-text">加载中...</div>
                  </div>
                ) : (
                  <>
                    <EmotionBubbleChart
                      records={sortedRecords}
                      onUpdate={handleUpdateRecord}
                      onDelete={handleDeleteRecord}
                    />
                    <div className="stats-panel">
                      <div className="stats-title">📊 情绪统计</div>
                      <div className="stats-item">
                        <span className="stats-label">记录总数</span>
                        <span className="stats-value">{stats.total}</span>
                      </div>
                      <div className="stats-item">
                        <span className="stats-label">最频繁</span>
                        <span className="stats-value">{stats.mostFrequent}</span>
                      </div>
                      <div className="stats-item">
                        <span className="stats-label">平均强度</span>
                        <span className="stats-value">{stats.avgIntensity.toFixed(1)}</span>
                      </div>
                      <div className="stats-summary">💫 {stats.description}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
