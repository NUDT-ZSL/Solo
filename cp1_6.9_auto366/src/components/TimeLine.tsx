import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Capsule } from '../types';
import { MOOD_MAP } from '../types';
import { formatRemainingTime, isUnlocked, calculateDotSize } from '../utils/timeUtils';
import '../styles/timeline.css';

interface TimeLineProps {
  capsules: Capsule[];
}

interface HoveredCapsule {
  capsule: Capsule;
  x: number;
  y: number;
}

interface PreviewState {
  capsule: Capsule;
  isUnlocked: boolean;
}

const TimeLine: React.FC<TimeLineProps> = ({ capsules }) => {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState<HoveredCapsule | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [nowTick, setNowTick] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setNowTick((v) => v + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const sortedCapsules = [...capsules].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const handleMouseEnter = useCallback(
    (capsule: Capsule, e: React.MouseEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setHovered({
          capsule,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (hovered) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setHovered({
            ...hovered,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
        }
      }
    },
    [hovered]
  );

  const handleMouseLeave = useCallback(() => {
    setHovered(null);
  }, []);

  const handleDotClick = useCallback(
    (capsule: Capsule) => {
      const unlocked = isUnlocked(capsule.unlock_at);
      setPreview({ capsule, isUnlocked: unlocked });
    },
    []
  );

  const getContentSummary = (content: string, unlocked: boolean): string => {
    if (unlocked) return content;
    if (content.length <= 30) return content;
    return content.slice(0, 30) + '…';
  };

  return (
    <div className="timeline-wrapper" ref={containerRef} onMouseMove={handleMouseMove}>
      <div className="timeline-axis-line" />

      <div className="timeline-dots-container">
        {sortedCapsules.map((capsule, index) => {
          const moodInfo = MOOD_MAP[capsule.mood];
          const size = calculateDotSize(capsule.content.length);
          const isHovered = hovered?.capsule.id === capsule.id;
          const unlocked = isUnlocked(capsule.unlock_at);
          const isEven = index % 2 === 0;
          void nowTick;

          return (
            <div
              key={capsule.id}
              className={`timeline-item ${isEven ? 'left' : 'right'}`}
            >
              <div className="timeline-connector" />

              <div
                className={`capsule-dot-wrapper ${isHovered ? 'hovered' : ''} ${
                  unlocked ? 'unlocked' : 'locked'
                }`}
                style={{
                  width: size,
                  height: size,
                }}
                onMouseEnter={(e) => handleMouseEnter(capsule, e)}
                onMouseLeave={handleMouseLeave}
                onClick={() => handleDotClick(capsule)}
              >
                <div
                  className="capsule-dot"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${moodInfo.color}ee 0%, ${moodInfo.color}aa 50%, ${moodInfo.color}66 100%)`,
                    boxShadow: `0 0 ${isHovered ? '32px' : '16px'} ${moodInfo.color}${
                      isHovered ? '70' : '40'
                    }, inset 0 -4px 12px rgba(0,0,0,0.25)`,
                  }}
                >
                  {!unlocked && <div className="capsule-lock">🔒</div>}
                  {unlocked && !capsule.is_read && <div className="capsule-unread" />}
                </div>
              </div>

              <div className="timeline-item-label">
                <div className="timeline-date">
                  {new Date(capsule.created_at).toLocaleDateString('zh-CN', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div className="timeline-mood-badge" style={{ borderColor: moodInfo.color }}>
                  <span style={{ color: moodInfo.color }}>{moodInfo.emoji}</span>
                  {moodInfo.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hovered && (
        <div
          className="hover-tooltip"
          style={{
            left: Math.min(hovered.x + 16, (containerRef.current?.clientWidth || 0) - 260),
            top: Math.max(hovered.y - 70, 10),
          }}
        >
          <div className="tooltip-title">{hovered.capsule.title}</div>
          <div
            className="tooltip-remaining"
            style={{ color: isUnlocked(hovered.capsule.unlock_at) ? '#2ecc71' : '#8b5cf6' }}
          >
            {isUnlocked(hovered.capsule.unlock_at)
              ? '🔓 已解锁'
              : `⏳ ${formatRemainingTime(hovered.capsule.unlock_at)}`}
          </div>
        </div>
      )}

      {preview && (
        <div className="preview-overlay" onClick={() => setPreview(null)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <button className="preview-close" onClick={() => setPreview(null)}>
              ×
            </button>

            <div
              className="preview-color-bar"
              style={{ background: MOOD_MAP[preview.capsule.mood].color }}
            />

            <div className="preview-content">
              <div className="preview-header">
                <div
                  className="preview-mood-tag"
                  style={{
                    borderColor: MOOD_MAP[preview.capsule.mood].color,
                    color: MOOD_MAP[preview.capsule.mood].color,
                  }}
                >
                  {MOOD_MAP[preview.capsule.mood].emoji} {MOOD_MAP[preview.capsule.mood].label}
                </div>
                {preview.isUnlocked ? (
                  <span className="preview-status unlocked">🔓 已解锁</span>
                ) : (
                  <span className="preview-status locked">
                    ⏳ {formatRemainingTime(preview.capsule.unlock_at)}
                  </span>
                )}
              </div>

              <h3 className="preview-title">{preview.capsule.title}</h3>

              <div className="preview-body">
                {preview.isUnlocked ? (
                  <p className="preview-text full">{preview.capsule.content}</p>
                ) : (
                  <p className="preview-text summary">
                    {getContentSummary(preview.capsule.content, false)}
                  </p>
                )}
              </div>

              <div className="preview-meta">
                <span>创建于 {new Date(preview.capsule.created_at).toLocaleDateString('zh-CN')}</span>
                <span>
                  解锁于 {new Date(preview.capsule.unlock_at).toLocaleDateString('zh-CN')}
                </span>
              </div>

              <div className="preview-actions">
                <button className="btn-secondary" onClick={() => setPreview(null)}>
                  关闭
                </button>
                {preview.isUnlocked && (
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setPreview(null);
                      navigate(`/capsule/${preview.capsule.id}`);
                    }}
                  >
                    查看完整内容 →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeLine;
