import { useState } from 'react';
import type { DayItinerary } from './types';

interface SchedulePanelProps {
  itinerary: DayItinerary[];
  onReorder: (dayIndex: number, itemIndex: number, direction: 'up' | 'down') => void;
}

function getTypeName(type: string): string {
  switch (type) {
    case 'attraction': return '景点';
    case 'restaurant': return '餐厅';
    case 'hotel': return '住宿';
    default: return '';
  }
}

function SchedulePanel({ itinerary, onReorder }: SchedulePanelProps) {
  const [expandedDays, setExpandedDays] = useState<number[]>([0]);

  const toggleDay = (dayIndex: number) => {
    setExpandedDays(prev =>
      prev.includes(dayIndex)
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex]
    );
  };

  if (itinerary.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📍</div>
        <div className="empty-state-text">选择城市和天数，开始规划您的行程</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {itinerary.map((day, dayIndex) => (
        <div
          key={day.day}
          className={`day-card ${expandedDays.includes(dayIndex) ? 'expanded' : ''}`}
          onClick={() => toggleDay(dayIndex)}
        >
          <div className="day-card-header">
            <h3>第 {day.day} 天</h3>
            <span className="expand-icon">▼</span>
          </div>
          <div className="day-card-content">
            <div className="schedule-items">
              {day.schedule.map((item, itemIndex) => (
                <div
                  key={item.id}
                  className="schedule-item"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="item-time">{item.time}</span>
                  <span className={`item-type-icon ${item.type}`}></span>
                  <div className="item-info">
                    <div className="item-name">{item.name}</div>
                    <div className="item-duration">
                      {getTypeName(item.type)} · {item.duration}
                    </div>
                  </div>
                  <div className="item-actions">
                    <button
                      className="arrow-btn"
                      onClick={() => onReorder(dayIndex, itemIndex, 'up')}
                      disabled={itemIndex === 0}
                      title="上移"
                    >
                      ↑
                    </button>
                    <button
                      className="arrow-btn"
                      onClick={() => onReorder(dayIndex, itemIndex, 'down')}
                      disabled={itemIndex === day.schedule.length - 1}
                      title="下移"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default SchedulePanel;
