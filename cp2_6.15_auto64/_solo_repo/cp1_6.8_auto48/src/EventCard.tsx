import React, { useEffect, useRef, useState } from 'react';
import { TimelineEvent, getPriorityColor, getPriorityGlow, Priority } from './TimelineEngine';

interface EventCardProps {
  event: TimelineEvent | null;
  x: number;
  y: number;
  visible: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
}

const PRIORITY_LABELS: Record<Priority, string> = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
};

const EventCard: React.FC<EventCardProps> = ({ event, x, y, visible, onClose, onDelete }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [animState, setAnimState] = useState<'closed' | 'opening' | 'open' | 'closing'>('closed');

  useEffect(() => {
    if (visible && event) {
      setAnimState('opening');
      const t = setTimeout(() => setAnimState('open'), 350);
      return () => clearTimeout(t);
    } else if (!visible && (animState === 'open' || animState === 'opening')) {
      setAnimState('closing');
      const t = setTimeout(() => setAnimState('closed'), 300);
      return () => clearTimeout(t);
    }
  }, [visible, event]);

  if (animState === 'closed' || !event) return null;

  const isOpening = animState === 'opening';
  const isOpen = animState === 'open';
  const isClosing = animState === 'closing';

  const scale = isOpen ? 1 : isOpening ? 0.85 : 0.7;
  const opacity = isOpen ? 1 : isOpening ? 0.7 : 0;
  const blur = isOpen ? 0 : isOpening ? 2 : 6;

  const color = getPriorityColor(event.priority);
  const glow = getPriorityGlow(event.priority);

  const cardX = Math.min(Math.max(x + 30, 16), window.innerWidth - 360);
  const cardY = Math.min(Math.max(y - 40, 16), window.innerHeight - 280);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 100,
        pointerEvents: isOpen ? 'auto' : 'none',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={cardRef}
        style={{
          position: 'absolute',
          left: cardX,
          top: cardY,
          width: 320,
          maxWidth: 'calc(100vw - 32px)',
          background: 'rgba(20, 18, 35, 0.75)',
          backdropFilter: `blur(${20 - blur}px) saturate(1.4)`,
          WebkitBackdropFilter: `blur(${20 - blur}px) saturate(1.4)`,
          borderRadius: 16,
          border: `1px solid rgba(108, 92, 231, ${0.25 + (isOpen ? 0.15 : 0)})`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 40px ${glow.replace('0.6', '0.15')}`,
          padding: '24px',
          transform: `scale(${scale})`,
          opacity,
          transition: isClosing
            ? 'transform 0.3s cubic-bezier(0.4,0,1,1), opacity 0.3s ease'
            : 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease',
          pointerEvents: 'auto',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: `linear-gradient(90deg, ${color}, ${color}88, transparent)`,
            borderRadius: '16px 16px 0 0',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3
            style={{
              color: '#e8e6f0',
              fontSize: 18,
              fontWeight: 600,
              margin: 0,
              lineHeight: 1.3,
              paddingRight: 8,
            }}
          >
            {event.title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              width: 28,
              height: 28,
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              flexShrink: 0,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,59,92,0.2)';
              e.currentTarget.style.color = '#ff3b5c';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: color,
              boxShadow: `0 0 8px ${glow}`,
            }}
          />
          <span style={{ color, fontSize: 12, fontWeight: 500, letterSpacing: 0.5 }}>
            {PRIORITY_LABELS[event.priority]}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>•</span>
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>{event.date}</span>
        </div>

        <p
          style={{
            color: 'rgba(232,230,240,0.7)',
            fontSize: 14,
            lineHeight: 1.7,
            margin: '0 0 20px 0',
          }}
        >
          {event.description || '暂无描述'}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => {
              onDelete(event.id);
              onClose();
            }}
            style={{
              background: 'rgba(255,59,92,0.12)',
              border: '1px solid rgba(255,59,92,0.25)',
              color: '#ff3b5c',
              padding: '6px 16px',
              borderRadius: 8,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,59,92,0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,59,92,0.12)';
            }}
          >
            删除事项
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
