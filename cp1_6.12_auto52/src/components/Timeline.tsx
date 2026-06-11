import { useState, useEffect, useMemo } from 'react';
import type { Memory } from '../types';
import { MOOD_COLOR } from '../types';

interface TimelineProps {
  memories: Memory[];
  selectedMemoryId: string | null;
  onMemoryClick: (memory: Memory) => void;
  selectedYear: number | null;
  onYearChange: (year: number | null) => void;
}

export default function Timeline({
  memories,
  selectedMemoryId,
  onMemoryClick,
  selectedYear,
  onYearChange
}: TimelineProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const years = useMemo(() => {
    const yearSet = new Set<number>();
    memories.forEach(memory => {
      const year = new Date(memory.created_at).getFullYear();
      yearSet.add(year);
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [memories]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    });
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setIsAnimating(true);
    setTimeout(() => {
      onYearChange(value ? parseInt(value, 10) : null);
      setIsAnimating(false);
    }, 150);
  };

  const handleItemClick = (memory: Memory) => {
    onMemoryClick(memory);
  };

  const handleHeaderClick = (e: React.MouseEvent) => {
    if (window.innerWidth < 769) {
      e.stopPropagation();
      setIsExpanded(!isExpanded);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 769) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`timeline-container ${isExpanded ? 'expanded' : ''}`}>
      <div className="timeline-header" onClick={handleHeaderClick}>
        <h2 className="timeline-title">
          <span className="timeline-title-icon">📍</span>
          我的回忆
        </h2>
        <select
          className="year-select"
          value={selectedYear || ''}
          onChange={handleYearChange}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="">全部年份</option>
          {years.map(year => (
            <option key={year} value={year}>{year}年</option>
          ))}
        </select>
      </div>

      <div className={`timeline-list ${isAnimating ? 'fade-in' : ''}`} key={selectedYear || 'all'}>
        {memories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <div>这一年还没有回忆<br/>快去添加第一个吧！</div>
          </div>
        ) : (
          memories.map((memory) => (
            <div
              key={memory.id}
              className={`timeline-item ${selectedMemoryId === memory.id ? 'active' : ''}`}
              onClick={() => handleItemClick(memory)}
            >
              <div
                className="timeline-dot"
                style={{ backgroundColor: MOOD_COLOR[memory.mood] }}
              />
              <div className="timeline-content">
                <div className="timeline-date">
                  {formatDate(memory.created_at)}
                </div>
                <div className="timeline-item-title">
                  {memory.title}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
