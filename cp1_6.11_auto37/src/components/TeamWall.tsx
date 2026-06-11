import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Idea, FilterType, IdeaType } from '../types';
import { filterIdeasByType } from '../api';

interface TeamWallProps {
  ideas: Idea[];
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  isLoading: boolean;
}

const TYPE_EMOJI: Record<IdeaType, string> = {
  progress: '🚀',
  blocker: '🚧',
  plan: '📋',
};

const TYPE_LABELS: Record<FilterType, string> = {
  all: '全部',
  progress: '仅进度',
  blocker: '仅阻碍',
  plan: '仅计划',
};

const FILTER_BUTTONS: FilterType[] = ['all', 'progress', 'blocker', 'plan'];

const VIRTUAL_THRESHOLD = 30;
const BUFFER_ITEMS = 5;

function hashNameToColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

function getInitial(name: string): string {
  if (!name) return '?';
  const trimmed = name.trim();
  const firstChar = trimmed.charAt(0);
  return firstChar.toUpperCase();
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month}月${day}日 ${hours}:${minutes}`;
}

interface CardPosition {
  left: number;
  top: number;
  width: number;
  height: number;
  columnIndex: number;
}

function useResponsiveColumns(): number {
  const [columns, setColumns] = useState(3);

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width < 768) setColumns(2);
      else if (width < 1200) setColumns(3);
      else setColumns(4);
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  return columns;
}

export default function TeamWall({
  ideas,
  filter,
  onFilterChange,
  isLoading,
}: TeamWallProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);
  const [filterAnimating, setFilterAnimating] = useState(false);
  const [displayFilter, setDisplayFilter] = useState<FilterType>(filter);
  const prevFilterRef = useRef<FilterType>(filter);
  const cardHeightsRef = useRef<Map<string, number>>(new Map());
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const columns = useResponsiveColumns();

  const filteredIdeas = useMemo(
    () => filterIdeasByType(ideas, displayFilter),
    [ideas, displayFilter]
  );

  useEffect(() => {
    if (prevFilterRef.current !== filter) {
      setFilterAnimating(true);
      const timer1 = setTimeout(() => {
        setDisplayFilter(filter);
        prevFilterRef.current = filter;
      }, 300);
      const timer2 = setTimeout(() => {
        setFilterAnimating(false);
      }, 600);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [filter]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateSize = () => {
      setContainerHeight(container.clientHeight);
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    setScrollTop(container.scrollTop);
  }, []);

  const positions = useMemo((): { positions: CardPosition[]; totalHeight: number } => {
    const gap = 16;
    const padding = 8;
    const colHeights: number[] = new Array(columns).fill(0);
    const positions: CardPosition[] = [];
    const availableWidth = (scrollContainerRef.current?.clientWidth || 800) - padding * 2;
    const cardWidth = (availableWidth - gap * (columns - 1)) / columns;

    filteredIdeas.forEach((idea) => {
      const storedHeight = cardHeightsRef.current.get(idea.id);
      const estimatedLines = Math.ceil(idea.content.length / 28) + 3;
      const estimatedHeight = storedHeight ?? Math.max(140, estimatedLines * 24 + 80);

      let minCol = 0;
      for (let c = 1; c < columns; c++) {
        if (colHeights[c] < colHeights[minCol]) minCol = c;
      }

      positions.push({
        left: padding + minCol * (cardWidth + gap),
        top: colHeights[minCol],
        width: cardWidth,
        height: estimatedHeight,
        columnIndex: minCol,
      });

      colHeights[minCol] += estimatedHeight + gap;
    });

    const totalHeight = Math.max(...colHeights, containerHeight);
    return { positions, totalHeight };
  }, [filteredIdeas, columns, containerHeight]);

  const measureCard = useCallback((id: string, element: HTMLDivElement | null) => {
    if (!element) return;
    const height = element.offsetHeight;
    const prev = cardHeightsRef.current.get(id);
    if (prev !== height) {
      cardHeightsRef.current.set(id, height);
    }
  }, []);

  const visibleRange = useMemo(() => {
    if (filteredIdeas.length <= VIRTUAL_THRESHOLD) {
      return { start: 0, end: filteredIdeas.length };
    }

    const avgHeight = positions.totalHeight / Math.max(filteredIdeas.length, 1);
    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + containerHeight;

    let start = Math.max(0, Math.floor(viewportTop / avgHeight) - BUFFER_ITEMS);
    let end = Math.min(
      filteredIdeas.length,
      Math.ceil(viewportBottom / avgHeight) + BUFFER_ITEMS
    );

    return { start, end };
  }, [scrollTop, containerHeight, positions.totalHeight, filteredIdeas.length]);

  const handlePlayVoice = useCallback((idea: Idea) => {
    if (!idea.voiceUrl) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      if (playingVoiceId === idea.id) {
        setPlayingVoiceId(null);
        return;
      }
    }

    try {
      const audio = new Audio(idea.voiceUrl);
      audio.onended = () => {
        setPlayingVoiceId(null);
        audioRef.current = null;
      };
      audio.play().catch((err) => console.error('播放失败:', err));
      audioRef.current = audio;
      setPlayingVoiceId(idea.id);
    } catch (err) {
      console.error('创建音频失败:', err);
    }
  }, [playingVoiceId]);

  const getFilterButtonStyle = (btn: FilterType): string => {
    const isActive = filter === btn;
    let baseClass = 'filter-btn';
    if (isActive) {
      baseClass += ` filter-btn-active filter-btn-${btn}`;
    }
    return baseClass;
  };

  if (isLoading && ideas.length === 0) {
    return (
      <div className="team-wall-container">
        <div className="team-wall-loading">
          <div className="loading-spinner"></div>
          <span>正在加载团队动态...</span>
        </div>
      </div>
    );
  }

  const useVirtual = filteredIdeas.length > VIRTUAL_THRESHOLD;
  const itemsToRender = useVirtual
    ? filteredIdeas.slice(visibleRange.start, visibleRange.end)
    : filteredIdeas;

  return (
    <div className="team-wall-container">
      <div className="filter-bar">
        <div className="filter-buttons">
          {FILTER_BUTTONS.map((btn) => (
            <button
              key={btn}
              className={getFilterButtonStyle(btn)}
              onClick={() => onFilterChange(btn)}
              title={`筛选${TYPE_LABELS[btn]}内容`}
            >
              {btn !== 'all' && <span className="filter-btn-emoji">{TYPE_EMOJI[btn as IdeaType]}</span>}
              <span>{TYPE_LABELS[btn]}</span>
              <span className="filter-count">
                ({filterIdeasByType(ideas, btn).length})
              </span>
            </button>
          ))}
        </div>
        <div className="ideas-count">
          共 {filteredIdeas.length} 条动态
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="team-wall-scroll"
        onScroll={handleScroll}
      >
        {filteredIdeas.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p className="empty-title">暂无{TYPE_LABELS[displayFilter]}动态</p>
            <p className="empty-desc">快在上方输入框分享你的第一条进展吧！</p>
          </div>
        ) : (
          <div
            className={`team-wall-masonry ${filterAnimating ? 'fade-transition' : ''}`}
            style={{
              height: useVirtual ? positions.totalHeight : 'auto',
              position: 'relative',
            }}
          >
            {itemsToRender.map((idea, idx) => {
              const actualIndex = useVirtual ? idx + visibleRange.start : idx;
              const pos = positions.positions[actualIndex];
              const avatarColor = hashNameToColor(idea.memberName);
              const initial = getInitial(idea.memberName);
              const isPlaying = playingVoiceId === idea.id;

              return (
                <div
                  key={idea.id}
                  ref={(el) => measureCard(idea.id, el)}
                  className={`idea-card idea-card-${idea.type}`}
                  style={{
                    position: useVirtual ? 'absolute' : 'relative',
                    left: useVirtual ? pos.left : undefined,
                    top: useVirtual ? pos.top : undefined,
                    width: useVirtual ? pos.width : undefined,
                    marginBottom: useVirtual ? 0 : 16,
                  }}
                >
                  <div className="card-header">
                    <div
                      className="member-avatar"
                      style={{ backgroundColor: avatarColor }}
                    >
                      {initial}
                    </div>
                    <div className="card-meta">
                      <div className="member-name">{idea.memberName}</div>
                      <div className="card-time">{formatTimestamp(idea.timestamp)}</div>
                    </div>
                    <div className={`card-type-badge card-type-${idea.type}`}>
                      {TYPE_EMOJI[idea.type]}
                    </div>
                  </div>

                  <div className="card-content">
                    <p>{idea.content}</p>
                  </div>

                  <div className="card-footer">
                    <div className="card-timestamp">
                      {new Date(idea.timestamp).toLocaleString('zh-CN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    {idea.voiceUrl && (
                      <button
                        className={`voice-play-btn ${isPlaying ? 'playing' : ''}`}
                        onClick={() => handlePlayVoice(idea)}
                        title={isPlaying ? '点击停止' : '播放语音'}
                      >
                        <span className="voice-icon">{isPlaying ? '⏸' : '▶'}</span>
                        <span className="voice-label">{isPlaying ? '播放中' : '语音'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .team-wall-container {
          margin-top: 24px;
        }

        .team-wall-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          gap: 16px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top: 3px solid #64B5F6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .filter-bar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .filter-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .filter-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.7);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 200ms ease-in-out;
        }

        .filter-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.9);
        }

        .filter-btn-emoji {
          font-size: 14px;
        }

        .filter-count {
          font-size: 12px;
          opacity: 0.7;
        }

        .filter-btn-active {
          color: white;
          border-color: transparent;
        }

        .filter-btn-all.filter-btn-active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          box-shadow: 0 0 16px rgba(102, 126, 234, 0.4);
        }

        .filter-btn-progress.filter-btn-active {
          background: linear-gradient(135deg, #4CAF50 0%, #81C784 100%);
          box-shadow: 0 0 16px rgba(76, 175, 80, 0.4);
        }

        .filter-btn-blocker.filter-btn-active {
          background: linear-gradient(135deg, #F44336 0%, #EF9A9A 100%);
          box-shadow: 0 0 16px rgba(244, 67, 54, 0.4);
        }

        .filter-btn-plan.filter-btn-active {
          background: linear-gradient(135deg, #2196F3 0%, #64B5F6 100%);
          box-shadow: 0 0 16px rgba(33, 150, 243, 0.4);
        }

        .ideas-count {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
        }

        .team-wall-scroll {
          max-height: calc(100vh - 400px);
          min-height: 400px;
          overflow-y: auto;
          padding: 8px;
          border-radius: 12px;
        }

        .team-wall-scroll::-webkit-scrollbar {
          width: 8px;
        }

        .team-wall-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }

        .team-wall-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }

        .team-wall-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .team-wall-masonry {
          column-gap: 16px;
          display: grid;
          grid-template-columns: repeat(${Math.max(2, Math.min(4, columns))}, 1fr);
        }

        @media (max-width: 767px) {
          .team-wall-masonry {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        @media (min-width: 768px) and (max-width: 1199px) {
          .team-wall-masonry {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }

        @media (min-width: 1200px) {
          .team-wall-masonry {
            grid-template-columns: repeat(4, 1fr) !important;
          }
        }

        .fade-transition {
          transition: opacity 300ms ease-in-out;
        }

        .idea-card {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
          transition: all 200ms ease-in-out;
          display: flex;
          flex-direction: column;
          break-inside: avoid;
        }

        .idea-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.5);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .idea-card-progress {
          border-left: 3px solid #4CAF50;
        }

        .idea-card-blocker {
          border-left: 3px solid #F44336;
        }

        .idea-card-plan {
          border-left: 3px solid #2196F3;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .member-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 16px;
          flex-shrink: 0;
        }

        .card-meta {
          flex: 1;
          min-width: 0;
        }

        .member-name {
          font-size: 14px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .card-time {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 2px;
        }

        .card-type-badge {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }

        .card-type-progress {
          background: rgba(76, 175, 80, 0.2);
        }

        .card-type-blocker {
          background: rgba(244, 67, 54, 0.2);
        }

        .card-type-plan {
          background: rgba(33, 150, 243, 0.2);
        }

        .card-content {
          flex: 1;
          margin-bottom: 12px;
        }

        .card-content p {
          font-size: 14px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.85);
          white-space: pre-wrap;
          word-break: break-word;
        }

        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .card-timestamp {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
        }

        .voice-play-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 16px;
          border: 1px solid rgba(100, 181, 246, 0.4);
          background: rgba(100, 181, 246, 0.15);
          color: #64B5F6;
          font-size: 12px;
          cursor: pointer;
          transition: all 200ms ease-in-out;
        }

        .voice-play-btn:hover {
          background: rgba(100, 181, 246, 0.25);
          border-color: rgba(100, 181, 246, 0.6);
        }

        .voice-play-btn.playing {
          background: rgba(100, 181, 246, 0.35);
          animation: pulsePlaying 1.2s ease-in-out infinite;
        }

        @keyframes pulsePlaying {
          0%, 100% { box-shadow: 0 0 0 0 rgba(100, 181, 246, 0.4); }
          50% { box-shadow: 0 0 0 6px rgba(100, 181, 246, 0); }
        }

        .voice-icon {
          font-size: 12px;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          text-align: center;
        }

        .empty-icon {
          font-size: 56px;
          margin-bottom: 16px;
        }

        .empty-title {
          font-size: 18px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 8px;
        }

        .empty-desc {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
}
