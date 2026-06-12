import { useState, useEffect, useMemo, useCallback } from 'react';
import SentimentTimeline from './components/SentimentTimeline';
import EmotionRadar from './components/EmotionRadar';
import MediaWall from './components/MediaWall';
import { fetchInitialData } from './services/api';
import {
  EMOTION_COLORS,
  EMOTION_LABELS_CN,
  EMOTION_EMOJI,
} from './types';
import type {
  InitialData,
  EmotionType,
  TimelinePoint,
  Comment,
  MediaItem,
  EmotionSummary,
} from './types';

type EmotionKey = Exclude<EmotionType, 'all'>;

export default function App() {
  const [data, setData] = useState<InitialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType>('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTimePoint, setSelectedTimePoint] = useState<TimelinePoint | null>(null);
  const [contentVisible, setContentVisible] = useState(false);
  const [filterKey, setFilterKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const result = await fetchInitialData();
      if (!mounted) return;
      setData(result);
      setLoading(false);
      requestAnimationFrame(() => {
        setContentVisible(true);
      });
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleEmotionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedEmotion(e.target.value as EmotionType);
      setFilterKey((k) => k + 1);
    },
    []
  );

  const filteredTimeline = useMemo<TimelinePoint[]>(() => {
    if (!data) return [];
    if (selectedEmotion === 'all') return data.timeline;
    const emo = selectedEmotion as EmotionKey;
    return data.timeline.map((tp) => ({
      ...tp,
      avg_sentiment: (tp.emotion_distribution[emo] ?? 0) / 10,
    }));
  }, [data, selectedEmotion]);

  const filteredEmotionSummary = useMemo<Record<EmotionKey, EmotionSummary> | null>(() => {
    if (!data) return null;
    if (selectedEmotion === 'all') return data.emotion_summary;
    const emo = selectedEmotion as EmotionKey;
    const base = data.emotion_summary[emo];
    return {
      joy: { ...base, score: emo === 'joy' ? base.score : base.score * 0.15 },
      surprise: { ...base, score: emo === 'surprise' ? base.score : base.score * 0.15 },
      sadness: { ...base, score: emo === 'sadness' ? base.score : base.score * 0.15 },
      anger: { ...base, score: emo === 'anger' ? base.score : base.score * 0.15 },
      fear: { ...base, score: emo === 'fear' ? base.score : base.score * 0.15 },
    } as Record<EmotionKey, EmotionSummary>;
  }, [data, selectedEmotion]);

  const filteredMedia = useMemo<MediaItem[]>(() => {
    if (!data) return [];
    if (selectedEmotion === 'all') return data.media;
    return data.media.filter((m) => m.emotion === selectedEmotion);
  }, [data, selectedEmotion]);

  const timePointComments = useMemo<Comment[]>(() => {
    if (!data || !selectedTimePoint) return [];
    const all = data.comments.filter((c) => c.timestamp === selectedTimePoint.timestamp);
    if (selectedEmotion !== 'all') {
      return all.filter((c) => c.emotion === selectedEmotion).sort((a, b) => b.score - a.score);
    }
    return all.sort((a, b) => b.timestamp - a.timestamp || b.score - a.score);
  }, [data, selectedTimePoint, selectedEmotion]);

  const handlePointClick = useCallback((point: TimelinePoint) => {
    setSelectedTimePoint(point);
    setSidebarOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    setTimeout(() => setSelectedTimePoint(null), 350);
  }, []);

  if (loading || !data) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <div className="loading-text">加载看板数据中...</div>
      </div>
    );
  }

  return (
    <div className={`app-container ${contentVisible ? 'fade-in' : ''}`}>
      <header className="app-header">
        <div className="header-info">
          <h1>🎵 VibeSandbox</h1>
          <div className="event-meta">
            <span>📅 {data.event_date}</span>
            <span>⏱ {data.event_duration}</span>
            <span>📍 {data.event_name}</span>
          </div>
        </div>
        <div className="header-stats">
          <div className="stat-item">
            <div className="stat-value">{data.stats.total_comments}</div>
            <div className="stat-label">评论</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{data.stats.total_media}</div>
            <div className="stat-label">媒体</div>
          </div>
          <div className="stat-item">
            <div
              className="stat-value"
              style={{
                color: data.stats.avg_sentiment > 0.3 ? '#69f0ae' : data.stats.avg_sentiment < -0.3 ? '#ff8a80' : '#40c4ff',
              }}
            >
              {(data.stats.avg_sentiment > 0 ? '+' : '') + data.stats.avg_sentiment.toFixed(2)}
            </div>
            <div className="stat-label">平均情绪</div>
          </div>
          <select
            className="filter-select"
            value={selectedEmotion}
            onChange={handleEmotionChange}
          >
            <option value="all">全部情绪</option>
            {(['joy', 'surprise', 'sadness', 'anger', 'fear'] as EmotionKey[]).map((emo) => (
              <option key={emo} value={emo}>
                {EMOTION_EMOJI[emo]} {EMOTION_LABELS_CN[emo]}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="app-content">
        <section className="panel timeline-panel">
          <h2 className="panel-title">
            {selectedEmotion === 'all'
              ? '情绪时间轴'
              : `${EMOTION_LABELS_CN[selectedEmotion as EmotionKey]} 情绪趋势`}
          </h2>
          <SentimentTimeline
            key={`timeline-${filterKey}`}
            data={filteredTimeline}
            emotionType={selectedEmotion}
            onPointClick={handlePointClick}
          />
        </section>

        <div className="bottom-section">
          <section className="panel radar-panel">
            <h2 className="panel-title">情绪维度分析</h2>
            {filteredEmotionSummary && (
              <EmotionRadar key={`radar-${filterKey}`} data={filteredEmotionSummary} />
            )}
          </section>

          <section className="panel media-panel">
            <h2 className="panel-title">
              媒体墙
              {selectedEmotion !== 'all' && (
                <span style={{ fontSize: 13, fontWeight: 400, color: '#90a4ae', marginLeft: 8 }}>
                  共 {filteredMedia.length} 张
                </span>
              )}
            </h2>
            <MediaWall key={`media-${filterKey}`} items={filteredMedia} />
          </section>
        </div>
      </div>

      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={closeSidebar}
      />
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-title">
            {selectedTimePoint ? `${selectedTimePoint.time} 评论详情` : '评论详情'}
          </span>
          <button className="sidebar-close" onClick={closeSidebar}>
            ×
          </button>
        </div>
        <div className="sidebar-body">
          {timePointComments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💬</div>
              <div>该时间点暂无匹配的评论</div>
            </div>
          ) : (
            timePointComments.map((comment) => (
              <div key={comment.id} className="comment-item">
                <div
                  className="comment-emotion-dot"
                  style={{ backgroundColor: EMOTION_COLORS[comment.emotion] }}
                />
                <div className="comment-body">
                  <div className="comment-text">{comment.text}</div>
                  <div className="comment-meta">
                    <span>{comment.user}</span>
                    <span>
                      {comment.emotion_label} {(comment.score > 0 ? '+' : '') + comment.score.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
