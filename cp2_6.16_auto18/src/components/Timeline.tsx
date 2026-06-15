import { Droplets, Leaf, Scissors, RefreshCw, Check } from 'lucide-react';
import type { Reminder } from '../types';
import { EVENT_NAMES, EVENT_COLORS } from '../types';
import { api } from '../utils/api';

interface TimelineProps {
  reminders: Reminder[];
  onUpdate: () => void;
}

const eventIcons = {
  water: Droplets,
  fertilize: Leaf,
  prune: Scissors,
  repot: RefreshCw,
};

export default function Timeline({ reminders, onUpdate }: TimelineProps) {
  const handleComplete = async (id: string) => {
    await api.reminders.complete(id);
    onUpdate();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return '今天';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return '明天';
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    }
  };

  if (reminders.length === 0) {
    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
        }}
      >
        <Leaf size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
        <p>暂无养护提醒</p>
        <p style={{ fontSize: '14px', marginTop: '8px' }}>添加植物后系统会自动生成养护建议</p>
      </div>
    );
  }

  return (
    <div className="timeline">
      {reminders.map((reminder) => {
        const Icon = eventIcons[reminder.type];
        return (
          <div
            key={reminder.id}
            className={`timeline-item ${reminder.completed ? 'completed' : ''}`}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: reminder.completed
                    ? 'var(--color-text-secondary)'
                    : EVENT_COLORS[reminder.type],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={16} color="#ffffff" />
              </div>
              <div
                className="timeline-content"
                style={{ flex: 1, minWidth: 0 }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>
                    {formatDate(reminder.date)}
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      backgroundColor: reminder.completed
                        ? 'var(--color-text-secondary)'
                        : EVENT_COLORS[reminder.type],
                      color: '#ffffff',
                    }}
                  >
                    {EVENT_NAMES[reminder.type]}
                  </span>
                </div>
                <p style={{ fontSize: '14px' }}>{reminder.description}</p>
                {!reminder.completed && (
                  <button
                    className="ripple-button"
                    onClick={() => handleComplete(reminder.id)}
                    style={{
                      marginTop: '8px',
                      padding: '6px 16px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--color-secondary)',
                      color: 'var(--color-primary)',
                      fontSize: '12px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'opacity var(--transition-fast)',
                    }}
                  >
                    <Check size={14} />
                    标记完成
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
