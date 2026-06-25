import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Work } from '../types';
import { logClick, logDuration } from '../api/dataService';
import './WorkList.css';

const TAG_COLORS: Record<string, string> = {
  '抽象': '#ab47bc',
  '风景': '#66bb6a',
  '人物': '#ffa726',
  '插画': '#26c6da',
  '其他': '#78909c',
};

const DEFAULT_TAGS = ['抽象', '风景', '人物', '插画', '其他'];

const VISIBLE_ITEMS = 20;
const ITEM_HEIGHT = 360;
const GAP = 20;

interface WorkListProps {
  works: Work[];
  onDataUpdate: () => void;
}

const WorkList: React.FC<WorkListProps> = ({ works, onDataUpdate }) => {
  const [sortBy, setSortBy] = useState<'createdAt' | 'clicks' | 'duration'>('createdAt');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewingWork, setViewingWork] = useState<Work | null>(null);
  const [viewStartTime, setViewStartTime] = useState<number | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const rowHeight = ITEM_HEIGHT + GAP;

  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth < 600);
      setIsTablet(window.innerWidth < 1024);
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  const getColumns = () => {
    if (isMobile) return 1;
    if (isTablet) return 2;
    return 4;
  };

  const columns = getColumns();

  const filteredWorks = works.filter(work => 
    !selectedTag || work.tags.includes(selectedTag)
  );

  const sortedWorks = [...filteredWorks].sort((a, b) => {
    if (sortBy === 'createdAt') return b.createdAt - a.createdAt;
    if (sortBy === 'clicks') return b.clicks - a.clicks;
    if (sortBy === 'duration') {
      const avgA = a.clicks > 0 ? a.totalDuration / a.clicks : 0;
      const avgB = b.clicks > 0 ? b.totalDuration / b.clicks : 0;
      return avgB - avgA;
    }
    return 0;
  });

  const totalRows = Math.ceil(sortedWorks.length / columns);
  const totalHeight = totalRows * rowHeight;

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  const getVisibleRange = () => {
    if (sortedWorks.length <= VISIBLE_ITEMS) {
      return { start: 0, end: sortedWorks.length };
    }
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - 2);
    const visibleRows = Math.ceil((window.innerHeight - 200) / rowHeight) + 4;
    const endRow = Math.min(totalRows, startRow + visibleRows);
    return {
      start: startRow * columns,
      end: Math.min(sortedWorks.length, endRow * columns),
    };
  };

  const { start, end } = getVisibleRange();
  const visibleWorks = sortedWorks.slice(start, end);

  const handleWorkClick = async (work: Work) => {
    const now = Date.now();
    try {
      await logClick(work.id, now);
      setViewingWork(work);
      setViewStartTime(now);
      onDataUpdate();
    } catch (error) {
      console.error('上报点击失败:', error);
    }
  };

  const handleCloseDetail = useCallback(async () => {
    if (viewingWork && viewStartTime) {
      const duration = Math.round((Date.now() - viewStartTime) / 1000);
      try {
        await logDuration(viewingWork.id, duration, Date.now());
        onDataUpdate();
      } catch (error) {
        console.error('上报时长失败:', error);
      }
    }
    setViewingWork(null);
    setViewStartTime(null);
  }, [viewingWork, viewStartTime, onDataUpdate]);

  useEffect(() => {
    if (viewingWork) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') handleCloseDetail();
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [viewingWork, handleCloseDetail]);

  return (
    <div className="work-list-page fade-in">
      <div className="page-header">
        <h2>作品列表</h2>
        <div className="controls">
          <div className="sort-control">
            <label>排序方式：</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
              <option value="createdAt">按上传时间降序</option>
              <option value="clicks">按点击次数降序</option>
              <option value="duration">按停留时长降序</option>
            </select>
          </div>
          <div className="tag-filters">
            <button
              className={`tag-btn ${selectedTag === null ? 'active' : ''}`}
              onClick={() => setSelectedTag(null)}
            >
              全部
            </button>
            {DEFAULT_TAGS.map(tag => (
              <button
                key={tag}
                className={`tag-btn ${selectedTag === tag ? 'active' : ''}`}
                onClick={() => setSelectedTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div 
        className="works-container"
        ref={containerRef}
        onScroll={handleScroll}
      >
        <div 
          className="works-grid"
          style={{ height: totalHeight, position: 'relative' }}
        >
          {visibleWorks.map((work, idx) => {
            const globalIndex = start + idx;
            const row = Math.floor(globalIndex / columns);
            const col = globalIndex % columns;
            const itemWidth = `calc((100% - ${(columns - 1) * GAP}px) / ${columns})`;
            
            return (
              <div
                key={work.id}
                className="work-card"
                style={{
                  position: 'absolute',
                  top: row * rowHeight,
                  left: `calc(${col} * (${itemWidth} + ${GAP}px))`,
                  width: itemWidth,
                  height: ITEM_HEIGHT,
                }}
                onClick={() => handleWorkClick(work)}
              >
                <div className="work-thumbnail">
                  <img src={work.image} alt={work.title} />
                  <div className="work-tags">
                    {work.tags.slice(0, 2).map(tag => (
                      <span
                        key={tag}
                        className="work-tag"
                        style={{ 
                          backgroundColor: TAG_COLORS[tag] || TAG_COLORS['其他'],
                          borderRadius: '8px',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="work-info">
                  <h3 className="work-title">{work.title}</h3>
                  <div className="work-stats">
                    <span>👁️ {work.clicks}</span>
                    <span>⏱️ {work.clicks > 0 ? Math.round(work.totalDuration / work.clicks) : 0}s</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {sortedWorks.length === 0 && (
          <div className="empty-state">
            <p>暂无作品，点击左侧"上传作品"按钮开始吧</p>
          </div>
        )}
      </div>

      {viewingWork && (
        <div className="modal-overlay" onClick={handleCloseDetail}>
          <div className="work-detail" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={handleCloseDetail}>×</button>
            <img src={viewingWork.image} alt={viewingWork.title} />
            <div className="detail-info">
              <h2>{viewingWork.title}</h2>
              <div className="detail-tags">
                {viewingWork.tags.map(tag => (
                  <span
                    key={tag}
                    className="work-tag"
                    style={{ 
                      backgroundColor: TAG_COLORS[tag] || TAG_COLORS['其他'],
                      borderRadius: '8px',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="detail-stats">
                <div>
                  <span className="stat-label">点击次数</span>
                  <span className="stat-value">{viewingWork.clicks}</span>
                </div>
                <div>
                  <span className="stat-label">平均停留</span>
                  <span className="stat-value">
                    {viewingWork.clicks > 0 ? Math.round(viewingWork.totalDuration / viewingWork.clicks) : 0}秒
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkList;
