import { useState, useMemo } from 'react';
import Calendar from 'react-calendar';
import { useNavigate } from 'react-router-dom';
import type { EventItem } from '../api/events';

interface Props {
  events: EventItem[];
  onRefresh: () => void;
}

type DateValue = Date | [Date, Date] | null;

function getProgressColor(current: number, max: number): string {
  const ratio = max > 0 ? current / max : 0;
  if (ratio < 0.5) return '#2ECC71';
  if (ratio <= 0.8) return '#F39C12';
  return '#E74C3C';
}

export default function EventsCalendar({ events }: Props) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const navigate = useNavigate();

  const selectedDateStr = useMemo(() => {
    if (!selectedDate || Array.isArray(selectedDate)) return '';
    return selectedDate.toISOString().split('T')[0];
  }, [selectedDate]);

  const dayEvents = useMemo(() => {
    if (!selectedDateStr) return [];
    return events.filter((e) => e.date === selectedDateStr);
  }, [events, selectedDateStr]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, number>();
    events.forEach((e) => {
      map.set(e.date, (map.get(e.date) || 0) + 1);
    });
    return map;
  }, [events]);

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;
    const dateStr = date.toISOString().split('T')[0];
    const count = eventsByDate.get(dateStr);
    if (!count) return null;
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 2 }}>
        {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
          <span key={i} className="event-dot" />
        ))}
      </div>
    );
  };

  const handleDateChange = (value: Date | [Date, Date] | null) => {
    setSelectedDate(value as Date);
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '32px',
    flexWrap: 'wrap',
  };

  const calendarPanelStyle: React.CSSProperties = {
    flex: '1 1 400px',
    background: '#fff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  };

  const eventPanelStyle: React.CSSProperties = {
    flex: '1 1 400px',
    minHeight: '300px',
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '16px',
    color: '#2C3E50',
  };

  return (
    <div style={containerStyle}>
      <div style={calendarPanelStyle}>
        <h2 style={sectionTitle}>📅 活动日历</h2>
        <Calendar
          onChange={handleDateChange}
          value={selectedDate}
          tileContent={tileContent}
          locale="zh-CN"
        />
      </div>
      <div style={eventPanelStyle}>
        <h2 style={sectionTitle}>
          {selectedDateStr ? `${selectedDateStr} 的活动` : '请选择日期'}
        </h2>
        {dayEvents.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#95A5A6',
              fontSize: '15px',
            }}
          >
            当天暂无活动安排
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {dayEvents.map((ev) => {
              const ratio = ev.maxParticipants > 0
                ? ev.participants.length / ev.maxParticipants
                : 0;
              const barColor = getProgressColor(ev.participants.length, ev.maxParticipants);
              return (
                <div
                  key={ev.id}
                  onClick={() => navigate(`/event/${ev.id}`)}
                  style={{
                    background: '#F9F9F9',
                    borderRadius: '12px',
                    padding: '20px',
                    cursor: 'pointer',
                    boxShadow: '2px 2px 2px #E0E0E0',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-6px)';
                    e.currentTarget.style.boxShadow = '6px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '2px 2px 2px #E0E0E0';
                  }}
                >
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                    {ev.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '12px' }}>
                    {ev.description.length > 60
                      ? ev.description.slice(0, 60) + '...'
                      : ev.description}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        flex: 1,
                        height: '8px',
                        background: '#ECF0F1',
                        borderRadius: '4px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${ratio * 100}%`,
                          background: barColor,
                          borderRadius: '4px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: barColor }}>
                      {ev.participants.length}/{ev.maxParticipants}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
