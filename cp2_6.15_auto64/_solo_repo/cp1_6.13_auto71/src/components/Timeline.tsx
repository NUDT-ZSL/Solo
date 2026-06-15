import React, { memo, useMemo } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { CareRecord } from '../types';
import { EVENT_COLORS, EVENT_LABELS } from '../types';
import { EVENT_ICONS } from './icons';

interface TimelineProps {
  events: CareRecord[];
  newestId?: string;
}

const Timeline: React.FC<TimelineProps> = memo(function Timeline({ events, newestId }) {
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [events]);

  if (sortedEvents.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 200,
        color: '#9ca3af',
        fontSize: 14,
      }}>
        暂无养护记录
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative',
      paddingLeft: 32,
      paddingRight: 16,
      overflowY: 'auto',
      maxHeight: 'calc(100vh - 300px)',
      scrollBehavior: 'smooth',
      WebkitOverflowScrolling: 'touch',
    }}>
      <div style={{
        position: 'absolute',
        left: 16,
        top: 8,
        bottom: 8,
        width: 2,
        background: '#e5e7eb',
      }} />

      {sortedEvents.map((event, index) => {
        const color = EVENT_COLORS[event.type];
        const IconComponent = EVENT_ICONS[event.type];
        const isNew = event._id === newestId;

        return (
          <div
            key={event._id}
            style={{
              position: 'relative',
              marginBottom: 24,
              animation: isNew ? 'fadeInDown 0.4s ease-out' : 'none',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: -32,
                top: 2,
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: color,
                boxShadow: `0 0 0 4px ${color}20`,
              }}
            />

            <div
              style={{
                background: '#ffffff',
                borderRadius: 12,
                padding: 16,
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                border: '1px solid #f3f4f6',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: `${color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {IconComponent && <IconComponent size={16} color={color} />}
                </div>
                <span style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#1f2937',
                }}>
                  {EVENT_LABELS[event.type]}
                </span>
                <span style={{
                  fontSize: 12,
                  color: '#9ca3af',
                  marginLeft: 'auto',
                }}>
                  {format(new Date(event.date), 'yyyy年MM月dd日', { locale: zhCN })}
                </span>
              </div>

              <div style={{
                fontSize: 13,
                color: '#6b7280',
                lineHeight: 1.6,
              }}>
                {event.note || '无备注'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default Timeline;
