import { useEffect, useRef } from 'react';
import { EventEntry } from '../types';

interface TimelineProps {
  events: EventEntry[];
}

const EVENT_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  feed: { icon: '🍖', label: '喂食', color: '#FF6B6B' },
  play: { icon: '🎾', label: '玩耍', color: '#FFD93D' },
  train: { icon: '💪', label: '训练', color: '#6BCB77' },
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatChange(key: string, value: number | undefined): string {
  if (value === undefined) return '';
  const sign = value > 0 ? '+' : '';
  const labels: Record<string, string> = { health: '健康', happiness: '快乐', hunger: '饥饿' };
  return `${labels[key] || key}${sign}${value}`;
}

export default function Timeline({ events }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [events.length]);

  if (events.length === 0) {
    return (
      <div className="timeline-panel">
        <h3 className="timeline-title">📋 成长记录</h3>
        <div className="timeline-empty">
          <p>还没有互动记录</p>
          <p className="timeline-empty-hint">开始喂食、玩耍或训练吧！</p>
        </div>
      </div>
    );
  }

  return (
    <div className="timeline-panel">
      <h3 className="timeline-title">📋 成长记录</h3>
      <div className="timeline-list" ref={containerRef}>
        {events.map((event, index) => {
          const config = EVENT_CONFIG[event.type];
          const changes = Object.entries(event.valueChange)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => formatChange(k, v))
            .join('  ');

          return (
            <div
              key={event.id}
              className="timeline-item"
              style={{
                animationDelay: index < 3 ? '0s' : undefined,
                '--item-color': config.color,
              } as React.CSSProperties}
            >
              <div className="timeline-dot" style={{ background: config.color }} />
              <div className="timeline-connector" />
              <div className="timeline-card">
                <div className="timeline-card-header">
                  <span className="timeline-event-icon">{config.icon}</span>
                  <span className="timeline-event-label">{config.label}</span>
                  <span className="timeline-event-time">{formatTime(event.timestamp)}</span>
                </div>
                <div className="timeline-card-change">{changes}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
