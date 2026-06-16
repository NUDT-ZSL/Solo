import React, { useMemo } from 'react';
import type { EcoEvent } from '@/ecosystem/types';

interface LogPanelProps {
  events: EcoEvent[];
}

const TYPE_COLORS: Record<EcoEvent['type'], string> = {
  alert: '#FF6B6B',
  prosperity: '#FFD700',
  warning: '#FFA500',
  info: '#4A90D9',
};

const LogPanel: React.FC<LogPanelProps> = ({ events }) => {
  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => b.timestamp - a.timestamp),
    [events]
  );

  const formatTime = (timestamp: number): string => {
    const d = new Date(timestamp);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  return (
    <div
      style={{
        background: 'rgba(11, 61, 58, 0.8)',
        borderRadius: '8px',
        maxHeight: '200px',
        overflowY: 'auto',
        padding: '8px 0',
      }}
    >
      {sortedEvents.map((event) => (
        <div
          key={event.id}
          style={{
            display: 'flex',
            alignItems: 'stretch',
            padding: '4px 12px',
          }}
        >
          <div
            style={{
              width: '3px',
              borderRadius: '2px',
              background: '#4A90D9',
              marginRight: '10px',
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  flexShrink: 0,
                }}
              >
                {formatTime(event.timestamp)}
              </span>
              <span
                style={{
                  color: TYPE_COLORS[event.type],
                  fontSize: '12px',
                  lineHeight: '1.4',
                }}
              >
                {event.message}
              </span>
            </div>
          </div>
        </div>
      ))}
      {sortedEvents.length === 0 && (
        <div
          style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: '12px',
            textAlign: 'center',
            padding: '16px',
          }}
        >
          暂无事件记录
        </div>
      )}
    </div>
  );
};

export default LogPanel;
