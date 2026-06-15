import React, { useRef, useCallback, useMemo } from 'react';
import { MoodTea, TEA_CATALOG, formatTime, addHuigan } from './TeaHouseEngine';
import { createFloatState, buildFloatStyle, spawnHuiganParticle, staggerDelay } from './BubbleService';

interface EmotionTeaProps {
  tea: MoodTea;
  index: number;
  onUpdate: (tea: MoodTea) => void;
}

const EmotionTea: React.FC<EmotionTeaProps> = ({ tea, index, onUpdate }) => {
  const [open, setOpen] = React.useState(false);
  const cupRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const floatState = useMemo(() => createFloatState(), []);

  const meta = TEA_CATALOG[tea.teaType];

  const handleCupClick = useCallback(() => {
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setOpen(false);
    }
  }, []);

  const handleHuigan = useCallback(() => {
    const updated = addHuigan(tea.id);
    if (updated) {
      onUpdate(updated);
    }
    if (cupRef.current && containerRef.current) {
      spawnHuiganParticle(containerRef.current, cupRef.current, () => {});
    }
  }, [tea.id, onUpdate]);

  const animDelay = staggerDelay(index);

  return (
    <div
      ref={containerRef}
      className="tea-item"
      style={{ animationDelay: `${animDelay}ms` }}
    >
      <div
        ref={cupRef}
        className="tea-float"
        style={buildFloatStyle(floatState)}
        onClick={handleCupClick}
        role="button"
        tabIndex={0}
        aria-label={`查看${meta.label}心情`}
      >
        <div className="tea-cup-wrap">
          <div className="tea-steam-line" />
          <div className="tea-steam-line" />
          <div className="tea-steam-line" />
          <span style={{ color: meta.color }}>{meta.emoji}</span>
        </div>
      </div>
      <span className="tea-label">{meta.desc}</span>

      {open && (
        <div className="modal-overlay" onClick={handleOverlayClick}>
          <div className="modal-card glass-card">
            <span
              className="modal-tea-type"
              style={{ background: meta.bgColor, color: meta.color }}
            >
              {meta.emoji} {meta.label} · {meta.desc}
            </span>
            <div className="modal-mood">{tea.mood}</div>
            <div className="modal-time">{formatTime(tea.createdAt)}</div>
            <button className="modal-huigan-btn" onClick={handleHuigan}>
              🍵 回甘
            </button>
            <div className="modal-huigan-count">
              已收到 {tea.huigan} 口回甘
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmotionTea;
