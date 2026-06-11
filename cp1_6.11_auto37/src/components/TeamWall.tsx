/**
 * ============================================================
 *  TeamWall 团队动态墙组件 - 瀑布流 + 虚拟滚动 + 过滤动画
 * ============================================================
 *
 *  调用关系:
 *    ├── 上游调用 (被谁使用):
 *    │   └── src/App.tsx -> 渲染为 <TeamWall ideas filter onFilterChange isLoading />
 *    └── 下游依赖 (使用谁):
 *        ├── src/types.ts        (Idea / FilterType / IdeaType 类型)
 *        └── src/api.ts          (filterIdeasByType 本地过滤方法)
 *
 *  数据流向:
 *    App.tsx props (ideas[], filter, onFilterChange, isLoading)
 *        │
 *        ▼
 *    1. useMemo: filterIdeasByType -> 得到 filteredIdeas
 *    2. 响应式 columns (2/3/4列) -> 计算每张卡片的 left/top/width/height
 *    3. scrollTop + containerHeight -> 计算 visibleRange (视口内的索引区间)
 *        │
 *        ▼
 *    仅渲染可见区间 [start-BUFFER, end+BUFFER] 的卡片 (绝对定位) -> 提升性能
 *
 *  过渡动画:
 *    onFilterChange(新filter) -> App 更新 filter props ->
 *    useEffect 检测到 filter 变化 -> 先 opacity:0 (300ms fade-out) ->
 *    切换 displayFilter -> opacity:1 (300ms fade-in)
 * ============================================================
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Idea, FilterType, IdeaType } from '../types';
import { filterIdeasByType } from '../api';

interface TeamWallProps {
  ideas: Idea[];
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  isLoading: boolean;
}

/** 类型对应的 emoji 图标 */
const TYPE_EMOJI: Record<IdeaType, string> = {
  progress: '🚀',
  blocker: '🚧',
  plan: '📋',
};

/** 过滤按钮对应的中文标签 */
const TYPE_LABELS: Record<FilterType, string> = {
  all: '全部',
  progress: '仅进度',
  blocker: '仅阻碍',
  plan: '仅计划',
};

/** 所有过滤按钮类型 */
const FILTER_BUTTONS: FilterType[] = ['all', 'progress', 'blocker', 'plan'];

/** 超过此数量启用虚拟滚动 */
const VIRTUAL_THRESHOLD = 30;
/** 视口上下各缓冲的卡片数量, 减少快速滚动时的白屏 */
const BUFFER_ITEMS = 5;
/** 卡片之间的间距 (px) */
const GAP = 16;
/** 容器内边距 (px) */
const PADDING = 8;

/** 根据成员名字字符串哈希生成 HSL 颜色 (色相均匀分布 0-360) */
function hashNameToColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

/** 获取成员姓名的首字母 (大写) */
function getInitial(name: string): string {
  if (!name) return '?';
  const trimmed = name.trim();
  const firstChar = trimmed.charAt(0);
  return firstChar.toUpperCase();
}

/** 相对时间格式化 (刚刚/X分钟前/X小时前/X天前/月日 时分) */
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

/** 每张卡片在瀑布流中的绝对坐标与尺寸 */
interface CardLayout {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * 根据内容长度估算卡片高度
 * 此估算用于首屏渲染与虚拟滚动计算, 真实高度会通过 ResizeObserver 更新
 */
function estimateCardHeight(idea: Idea, cardWidth: number): number {
  const charPerLine = Math.max(12, Math.floor((cardWidth - 32) / 14));
  const contentLines = Math.ceil(idea.content.length / charPerLine);
  const headerHeight = 52; // 头像 + 姓名 + 时间
  const contentPadding = 32; // 上下 padding
  const footerHeight = 44; // 底部时间 + 语音按钮
  const totalLines = contentLines + 2; // 内容行 + 留白
  return headerHeight + contentPadding + totalLines * 22 + footerHeight;
}

/** 计算瀑布流布局：每张卡片的 left/top/width/height + 总高度 */
function computeLayout(
  ideas: Idea[],
  columns: number,
  containerWidth: number,
  storedHeights: Map<string, number>
): { layouts: CardLayout[]; totalHeight: number; cardWidth: number } {
  const layouts: CardLayout[] = [];
  const colHeights: number[] = new Array(columns).fill(0);
  const availableWidth = Math.max(320, containerWidth) - PADDING * 2;
  const cardWidth = (availableWidth - GAP * (columns - 1)) / columns;

  ideas.forEach((idea) => {
    const realHeight = storedHeights.get(idea.id);
    const height = realHeight ?? estimateCardHeight(idea, cardWidth);

    // 找当前最短的列 (瀑布流核心逻辑)
    let minCol = 0;
    for (let c = 1; c < columns; c++) {
      if (colHeights[c] < colHeights[minCol]) {
        minCol = c;
      }
    }

    layouts.push({
      left: PADDING + minCol * (cardWidth + GAP),
      top: colHeights[minCol],
      width: cardWidth,
      height,
    });

    colHeights[minCol] += height + GAP;
  });

  const totalHeight = Math.max(...colHeights, 0);
  return { layouts, totalHeight, cardWidth };
}

/** 响应式列数 Hook: <768px=2列, 768-1199px=3列, >=1200px=4列 */
function useResponsiveColumns(): number {
  const [columns, setColumns] = useState<number>(() => {
    if (typeof window === 'undefined') return 3;
    if (window.innerWidth < 768) return 2;
    if (window.innerWidth < 1200) return 3;
    return 4;
  });

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width < 768) setColumns(2);
      else if (width < 1200) setColumns(3);
      else setColumns(4);
    };
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
  // ========= 基础 Refs & State =========
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const masonryRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(800);
  const [containerHeight, setContainerHeight] = useState(500);
  const cardHeightsRef = useRef<Map<string, number>>(new Map());
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // ========= 播放语音相关 =========
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ========= 过滤过渡动画 =========
  // displayFilter: 实际用于渲染列表的 filter
  // fadeStage: 'in'(显示) | 'out'(隐藏中) -> 配合 opacity 动画
  const [displayFilter, setDisplayFilter] = useState<FilterType>(filter);
  const [fadeStage, setFadeStage] = useState<'in' | 'out'>('in');
  const prevFilterRef = useRef<FilterType>(filter);

  // ========= 响应式列数 =========
  const columns = useResponsiveColumns();

  // ========================================================
  //  过滤过渡动画效果 (300ms ease-in-out)
  //  阶段: filter变化 -> fade-out (opacity:0, 300ms)
  //       -> 切换 displayFilter -> fade-in (opacity:1, 300ms)
  // ========================================================
  useEffect(() => {
    if (prevFilterRef.current !== filter) {
      // 阶段1: 先淡出
      setFadeStage('out');
      const t1 = window.setTimeout(() => {
        // 阶段2: 切换数据并淡入
        setDisplayFilter(filter);
        prevFilterRef.current = filter;
        setFadeStage('in');
      }, 300);
      return () => window.clearTimeout(t1);
    }
  }, [filter]);

  // ========================================================
  //  过滤后的 Idea 列表 (使用 displayFilter 做延迟切换)
  // ========================================================
  const filteredIdeas = useMemo(
    () => filterIdeasByType(ideas, displayFilter),
    [ideas, displayFilter]
  );

  // ========================================================
  //  监听滚动容器尺寸变化 (ResizeObserver 比 onresize 更精确)
  // ========================================================
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateSize = () => {
      setContainerWidth(container.clientWidth);
      setContainerHeight(container.clientHeight);
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    resizeObserverRef.current = observer;
    return () => observer.disconnect();
  }, []);

  // ========================================================
  //  滚动事件处理 (requestAnimationFrame 节流, 保证30FPS+)
  // ========================================================
  const rafIdRef = useRef<number | null>(null);
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    // rAF 节流: 每次浏览器重绘前仅更新一次 scrollTop, 避免过度渲染
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      setScrollTop(container.scrollTop);
      rafIdRef.current = null;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // ========================================================
  //  计算瀑布流布局 (每张卡片的绝对坐标)
  // ========================================================
  const { layouts, totalHeight } = useMemo(
    () => computeLayout(filteredIdeas, columns, containerWidth, cardHeightsRef.current),
    [filteredIdeas, columns, containerWidth]
  );

  // ========================================================
  //  虚拟滚动: 计算视口内可见卡片的索引区间 [start, end)
  //  + 上下 BUFFER_ITEMS 缓冲, 减少快速滚动白屏
  // ========================================================
  const visibleRange = useMemo(() => {
    const total = filteredIdeas.length;
    // 不超过阈值 -> 不启用虚拟滚动
    if (total <= VIRTUAL_THRESHOLD) {
      return { start: 0, end: total };
    }

    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + containerHeight;
    let start = 0;
    let end = total;

    // 遍历布局, 找到第一张 top+height > viewportTop 的卡片
    for (let i = 0; i < total; i++) {
      if (layouts[i] && layouts[i].top + layouts[i].height > viewportTop) {
        start = i;
        break;
      }
    }
    // 找到最后一张 top < viewportBottom 的卡片
    for (let i = start; i < total; i++) {
      if (layouts[i] && layouts[i].top > viewportBottom) {
        end = i;
        break;
      }
    }

    // 加缓冲
    start = Math.max(0, start - BUFFER_ITEMS);
    end = Math.min(total, end + BUFFER_ITEMS);
    return { start, end };
  }, [scrollTop, containerHeight, layouts, filteredIdeas.length]);

  // ========================================================
  //  ResizeObserver 监听每张卡片真实高度, 更新 cardHeightsRef
  //  解决首屏估算不准导致的瀑布流重叠问题
  // ========================================================
  const measureCard = useCallback((ideaId: string, el: HTMLDivElement | null) => {
    if (!el) return;
    const update = () => {
      const h = el.getBoundingClientRect().height;
      const prev = cardHeightsRef.current.get(ideaId);
      if (prev !== h) {
        cardHeightsRef.current.set(ideaId, h);
      }
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    // 卡片卸载时停止观察
    const oldCleanup = (el as any).__cleanupObs;
    if (oldCleanup) oldCleanup();
    (el as any).__cleanupObs = () => obs.disconnect();
  }, []);

  // ========================================================
  //  语音播放/停止 (使用 base64 作为 Audio src)
  // ========================================================
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

  // 组件卸载时停止播放
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // ========================================================
  //  渲染: Loading 状态
  // ========================================================
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

  // ========================================================
  //  渲染: 主视图
  // ========================================================
  return (
    <div className="team-wall-container">
      {/* ===== 顶部过滤栏 ===== */}
      <div className="filter-bar">
        <div className="filter-buttons">
          {FILTER_BUTTONS.map((btn) => {
            const isActive = filter === btn;
            return (
              <button
                key={btn}
                className={`filter-btn ${isActive ? `filter-btn-active filter-btn-${btn}` : ''}`}
                onClick={() => onFilterChange(btn)}
                title={`筛选${TYPE_LABELS[btn]}内容`}
              >
                {btn !== 'all' && (
                  <span className="filter-btn-emoji">{TYPE_EMOJI[btn as IdeaType]}</span>
                )}
                <span>{TYPE_LABELS[btn]}</span>
                <span className="filter-count">
                  ({filterIdeasByType(ideas, btn).length})
                </span>
              </button>
            );
          })}
        </div>
        <div className="ideas-count">
          共 {filteredIdeas.length} 条动态
          {useVirtual && (
            <span className="virtual-hint">
              {' '}· 已启用虚拟滚动 (渲染{visibleRange.end - visibleRange.start}/{filteredIdeas.length})
            </span>
          )}
        </div>
      </div>

      {/* ===== 滚动容器 ===== */}
      <div
        ref={scrollContainerRef}
        className="team-wall-scroll"
        onScroll={handleScroll}
      >
        {filteredIdeas.length === 0 ? (
          // ===== 空状态 =====
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p className="empty-title">暂无{TYPE_LABELS[displayFilter]}动态</p>
            <p className="empty-desc">快在上方输入框分享你的第一条进展吧！</p>
          </div>
        ) : (
          // ===== 瀑布流外层: 总高度由 position 撑开 =====
          <div
            ref={masonryRef}
            className={`team-wall-masonry fade-stage-${fadeStage} ${useVirtual ? 'masonry-virtual' : 'masonry-grid'}`}
            style={{
              height: useVirtual ? totalHeight : 'auto',
            }}
          >
            {/* 切片只渲染视口内的卡片 (虚拟滚动核心) */}
            {filteredIdeas
              .slice(visibleRange.start, visibleRange.end)
              .map((idea, i) => {
                const idx = visibleRange.start + i;
                const layout = layouts[idx];
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
                      left: useVirtual ? layout?.left : undefined,
                      top: useVirtual ? layout?.top : undefined,
                      width: useVirtual ? layout?.width : undefined,
                      height: useVirtual ? layout?.height : undefined,
                      marginBottom: useVirtual ? 0 : GAP,
                      overflow: 'hidden',
                    }}
                  >
                    {/* 卡片头部: 头像 + 姓名/时间 + 类型徽章 */}
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

                    {/* 卡片内容 */}
                    <div className="card-content">
                      <p>{idea.content}</p>
                    </div>

                    {/* 卡片底部: 完整时间 + 语音按钮 */}
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
                          <span className="voice-label">
                            {isPlaying ? '播放中' : '语音'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* ===== 所有样式 (inline <style> 确保 CSS 与组件一起打包) ===== */}
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

        .virtual-hint {
          color: rgba(100, 181, 246, 0.8);
        }

        .team-wall-scroll {
          max-height: calc(100vh - 400px);
          min-height: 400px;
          overflow-y: auto;
          padding: ${PADDING}px;
          border-radius: 12px;
          scroll-behavior: auto;
          will-change: scroll-position;
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

        /* 普通模式 (≤30条): Grid 瀑布流 */
        .team-wall-masonry.masonry-grid {
          display: grid;
          gap: ${GAP}px;
          position: relative;
        }
        @media (max-width: 767px) {
          .team-wall-masonry.masonry-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 768px) and (max-width: 1199px) {
          .team-wall-masonry.masonry-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 1200px) {
          .team-wall-masonry.masonry-grid { grid-template-columns: repeat(4, 1fr); }
        }

        /* 虚拟滚动模式 (>30条): 绝对定位瀑布流 */
        .team-wall-masonry.masonry-virtual {
          position: relative;
          display: block;
        }

        /* ===== 过滤过渡: 300ms ease-in-out ===== */
        .team-wall-masonry.fade-stage-out {
          opacity: 0;
          transition: opacity 300ms ease-in-out;
        }
        .team-wall-masonry.fade-stage-in {
          opacity: 1;
          transition: opacity 300ms ease-in-out;
        }

        /* ===== Idea 卡片 (瀑布流单元) ===== */
        .idea-card {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
          transition: transform 200ms ease-in-out, box-shadow 200ms ease-in-out,
                      border-color 200ms ease-in-out;
          display: flex;
          flex-direction: column;
        }

        .idea-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.5);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .idea-card-progress { border-left: 3px solid #4CAF50; }
        .idea-card-blocker  { border-left: 3px solid #F44336; }
        .idea-card-plan     { border-left: 3px solid #2196F3; }

        .card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          flex-shrink: 0;
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

        .card-type-progress { background: rgba(76, 175, 80, 0.2); }
        .card-type-blocker  { background: rgba(244, 67, 54, 0.2); }
        .card-type-plan     { background: rgba(33, 150, 243, 0.2); }

        .card-content {
          flex: 1;
          margin-bottom: 12px;
          min-height: 0;
          overflow: hidden;
        }

        .card-content p {
          font-size: 14px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.85);
          white-space: pre-wrap;
          word-break: break-word;
          margin: 0;
        }

        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
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
          50%      { box-shadow: 0 0 0 6px rgba(100, 181, 246, 0); }
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
