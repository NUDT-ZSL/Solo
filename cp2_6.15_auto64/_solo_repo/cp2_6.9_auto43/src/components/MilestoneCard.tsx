import React, { useState, useRef, useEffect } from 'react';
import type { Milestone, Priority } from '../types';

interface MilestoneCardProps {
  milestone: Milestone;
  isDragging: boolean;
  onDragStart: (e: React.MouseEvent | React.TouchEvent, id: string) => void;
  onProgressChange: (id: string, progress: number) => void;
  onDelete: (id: string) => void;
}

const PRIORITY_COLORS: Record<Priority, string> = {
  high: '#e74c3c',
  medium: '#f39c12',
  low: '#27ae60',
};

const PRIORITY_GRADIENTS: Record<Priority, string> = {
  high: 'linear-gradient(90deg, #e74c3c, #f1948a)',
  medium: 'linear-gradient(90deg, #f39c12, #f7dc6f)',
  low: 'linear-gradient(90deg, #27ae60, #82e0aa)',
};

const MilestoneCard: React.FC<MilestoneCardProps> = ({
  milestone,
  isDragging,
  onDragStart,
  onProgressChange,
  onDelete,
}) => {
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  const [tempProgress, setTempProgress] = useState(milestone.progress);
  const [isDeleting, setIsDeleting] = useState(false);
  const [animateProgress, setAnimateProgress] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const color = PRIORITY_COLORS[milestone.priority];
  const gradient = PRIORITY_GRADIENTS[milestone.priority];

  useEffect(() => {
    setAnimateProgress(true);
    const timer = setTimeout(() => setAnimateProgress(false), 300);
    return () => clearTimeout(timer);
  }, [milestone.progress]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sliderRef.current && !sliderRef.current.contains(e.target as Node)) {
        setIsEditingProgress(false);
      }
    };
    if (isEditingProgress) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditingProgress]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    onDragStart(e, milestone.id);
  };

  const handleDelete = () => {
    setIsDeleting(true);
    setTimeout(() => {
      onDelete(milestone.id);
    }, 200);
  };

  const handleProgressConfirm = () => {
    onProgressChange(milestone.id, tempProgress);
    setIsEditingProgress(false);
  };

  const handleProgressClick = () => {
    setTempProgress(milestone.progress);
    setIsEditingProgress(true);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const cardStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'stretch',
    width: '180px',
    minHeight: '120px',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    boxShadow: isDragging
      ? '0 8px 20px rgba(0,0,0,0.2)'
      : '0 2px 8px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    cursor: isDragging ? 'grabbing' : 'default',
    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
    position: 'relative',
    userSelect: 'none',
  };

  const handleStyle: React.CSSProperties = {
    width: '12px',
    backgroundColor: '#bdc3c7',
    cursor: isDragging ? 'grabbing' : 'grab',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'background-color 0.2s ease',
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minWidth: 0,
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '8px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: '#333',
    margin: 0,
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const deleteBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#95a5a6',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    transition: 'color 0.2s ease, background-color 0.2s ease',
    flexShrink: 0,
  };

  const dateStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#7f8c8d',
    marginTop: '4px',
  };

  const bottomStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '8px',
    position: 'relative',
  };

  const progressBarContainerStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    position: 'relative',
    flexShrink: 0,
  };

  const getProgressStyle = (): React.CSSProperties => {
    const radius = 16;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (milestone.progress / 100) * circumference;
    return {
      transition: animateProgress ? 'stroke-dashoffset 0.3s ease-out' : 'none',
      strokeDasharray: circumference,
      strokeDashoffset: offset,
    };
  };

  const progressTextStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '12px',
    fontWeight: 600,
    color: '#333',
    cursor: 'pointer',
  };

  const priorityBarStyle: React.CSSProperties = {
    width: '4px',
    height: '100%',
    backgroundColor: color,
    flexShrink: 0,
  };

  const sliderContainerStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '100%',
    right: 0,
    marginBottom: '8px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '12px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    zIndex: 100,
    width: '160px',
  };

  return (
    <div
      className={isDeleting ? 'animate-fade-out' : 'animate-slide-in'}
      style={cardStyle}
    >
      <div
        style={handleStyle}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
        onMouseEnter={(e) => {
          if (!isDragging) {
            (e.currentTarget as HTMLDivElement).style.backgroundColor = '#95a5a6';
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = '#bdc3c7';
        }}
      >
        <svg width="8" height="20" viewBox="0 0 8 20" fill="#7f8c8d">
          <circle cx="2" cy="4" r="1.5" />
          <circle cx="6" cy="4" r="1.5" />
          <circle cx="2" cy="10" r="1.5" />
          <circle cx="6" cy="10" r="1.5" />
          <circle cx="2" cy="16" r="1.5" />
          <circle cx="6" cy="16" r="1.5" />
        </svg>
      </div>

      <div style={priorityBarStyle} />

      <div style={contentStyle}>
        <div>
          <div style={headerStyle}>
            <h3 style={titleStyle} title={milestone.title}>
              {milestone.title}
            </h3>
            <button
              style={deleteBtnStyle}
              onClick={handleDelete}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = '#e74c3c';
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fdf2f2';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = '#95a5a6';
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
          <div style={dateStyle}>{formatDate(milestone.date)}</div>
        </div>

        <div style={bottomStyle}>
          <div
            style={{
              height: '6px',
              borderRadius: '3px',
              backgroundColor: '#ecf0f1',
              flex: 1,
              marginRight: '12px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${milestone.progress}%`,
                background: gradient,
                transition: 'width 0.3s ease-out',
                borderRadius: '3px',
              }}
            />
          </div>

          <div style={progressBarContainerStyle}>
            <svg width="40" height="40" viewBox="0 0 40 40">
              <circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke="#ecf0f1"
                strokeWidth="3"
              />
              <circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke={color}
                strokeWidth="3"
                strokeLinecap="round"
                transform="rotate(-90 20 20)"
                style={getProgressStyle()}
              />
            </svg>
            <span
              style={progressTextStyle}
              onClick={handleProgressClick}
              className={animateProgress ? 'animate-number-jump' : ''}
            >
              {milestone.progress}%
            </span>

            {isEditingProgress && (
              <div ref={sliderRef} style={sliderContainerStyle}>
                <div style={{ fontSize: '12px', marginBottom: '8px', color: '#666' }}>
                  调整进度: {tempProgress}%
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={tempProgress}
                  onChange={(e) => setTempProgress(Number(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: color,
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button
                    onClick={() => setIsEditingProgress(false)}
                    style={{
                      flex: 1,
                      padding: '6px',
                      borderRadius: '6px',
                      border: '1px solid #ddd',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleProgressConfirm}
                    style={{
                      flex: 1,
                      padding: '6px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: color,
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    确定
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MilestoneCard;
