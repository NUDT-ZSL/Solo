import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Droplets, Leaf, Scissors, RefreshCw } from 'lucide-react';
import type { CareEvent } from '../types';
import { EVENT_NAMES, EVENT_COLORS } from '../types';
import { api } from '../utils/api';

interface CareCalendarProps {
  plantId: string;
  events: CareEvent[];
  onUpdate: () => void;
}

const eventIcons = {
  water: Droplets,
  fertilize: Leaf,
  prune: Scissors,
  repot: RefreshCw,
};

export default function CareCalendar({ plantId, events, onUpdate }: CareCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CareEvent | null>(null);
  const [eventType, setEventType] = useState<'water' | 'fertilize' | 'prune' | 'repot'>('water');
  const [eventNote, setEventNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { year, month, daysInMonth, firstDayOfMonth } = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const dim = new Date(y, m + 1, 0).getDate();
    const fdom = new Date(y, m, 1).getDay();
    return { year: y, month: m, daysInMonth: dim, firstDayOfMonth: fdom };
  }, [currentDate]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CareEvent[]> = {};
    for (const event of events) {
      if (!map[event.date]) {
        map[event.date] = [];
      }
      map[event.date].push(event);
    }
    return map;
  }, [events]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setShowModal(true);
    setEditingEvent(null);
    setEventNote('');
    setEventType('water');
  };

  const handleEventClick = (event: CareEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEvent(event);
    setSelectedDate(event.date);
    setEventType(event.type);
    setEventNote(event.note || '');
    setShowModal(true);
  };

  const handleSaveEvent = async () => {
    if (!selectedDate) return;

    setIsSubmitting(true);
    try {
      if (editingEvent) {
        await api.events.update(editingEvent.id, {
          type: eventType,
          date: selectedDate,
          note: eventNote,
        });
      } else {
        await api.events.create(plantId, {
          type: eventType,
          date: selectedDate,
          note: eventNote,
        });
      }
      setShowModal(false);
      onUpdate();
    } catch (error) {
      console.error('Save event error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!editingEvent) return;

    setIsSubmitting(true);
    try {
      await api.events.delete(editingEvent.id);
      setShowModal(false);
      onUpdate();
    } catch (error) {
      console.error('Delete event error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <button
          className="ripple-button"
          onClick={prevMonth}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color var(--transition-fast)',
          }}
        >
          <ChevronLeft size={20} />
        </button>
        <h3 style={{ fontSize: '18px', fontWeight: 600 }}>
          {year}年 {monthNames[month]}
        </h3>
        <button
          className="ripple-button"
          onClick={nextMonth}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color var(--transition-fast)',
          }}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
        }}
      >
        {weekDays.map((day) => (
          <div
            key={day}
            style={{
              textAlign: 'center',
              padding: '8px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
            }}
          >
            {day}
          </div>
        ))}
        {days.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} />;
          }

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayEvents = eventsByDate[dateStr] || [];
          const isToday = dateStr === new Date().toISOString().split('T')[0];

          return (
            <div
              key={day}
              onClick={() => handleDateClick(day)}
              style={{
                minHeight: '60px',
                padding: '4px',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: isToday ? 'rgba(165, 214, 167, 0.2)' : 'transparent',
                transition: 'background-color var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(109, 76, 65, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isToday ? 'rgba(165, 214, 167, 0.2)' : 'transparent';
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: isToday ? 700 : 400,
                  color: isToday ? 'var(--color-primary)' : 'inherit',
                  marginBottom: '4px',
                }}
              >
                {day}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                {dayEvents.slice(0, 2).map((event) => {
                  const Icon = eventIcons[event.type];
                  return (
                    <div
                      key={event.id}
                      className={`care-tag care-tag-${event.type}`}
                      onClick={(e) => handleEventClick(event, e)}
                      style={{
                        fontSize: '10px',
                        height: '20px',
                        padding: '0 6px',
                        borderRadius: '10px',
                        gap: '2px',
                      }}
                    >
                      <Icon size={12} />
                      {EVENT_NAMES[event.type]}
                    </div>
                  );
                })}
                {dayEvents.length > 2 && (
                  <div
                    style={{
                      fontSize: '10px',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    +{dayEvents.length - 2}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              width: '90%',
              maxWidth: '400px',
              animation: 'fadeIn 0.3s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>
                {editingEvent ? '编辑养护事件' : '添加养护事件'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color var(--transition-fast)',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '8px',
                }}
              >
                日期
              </label>
              <input
                type="date"
                value={selectedDate || ''}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  fontSize: '14px',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '8px',
                }}
              >
                事件类型
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px',
                }}
              >
                {(Object.keys(EVENT_NAMES) as Array<keyof typeof EVENT_NAMES>).map((type) => {
                  const Icon = eventIcons[type as keyof typeof eventIcons];
                  return (
                    <button
                      key={type}
                      type="button"
                      className="ripple-button"
                      onClick={() => setEventType(type as any)}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: '2px solid',
                        borderColor:
                          eventType === type
                            ? EVENT_COLORS[type]
                            : 'var(--color-border)',
                        backgroundColor:
                          eventType === type
                            ? `${EVENT_COLORS[type]}15`
                            : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '14px',
                        fontWeight: 500,
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <Icon size={16} style={{ color: EVENT_COLORS[type] }} />
                      {EVENT_NAMES[type]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '8px',
                }}
              >
                备注
              </label>
              <textarea
                value={eventNote}
                onChange={(e) => setEventNote(e.target.value)}
                placeholder="添加备注..."
                className="record-input"
                style={{ height: '80px' }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                gap: '12px',
              }}
            >
              {editingEvent && (
                <button
                  className="ripple-button"
                  onClick={handleDeleteEvent}
                  disabled={isSubmitting}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '8px',
                    backgroundColor: '#ef5350',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 500,
                    transition: 'opacity var(--transition-fast)',
                  }}
                >
                  删除
                </button>
              )}
              <button
                className="ripple-button"
                onClick={handleSaveEvent}
                disabled={isSubmitting || !selectedDate}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-primary)',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'opacity var(--transition-fast)',
                  opacity: isSubmitting || !selectedDate ? 0.6 : 1,
                }}
              >
                {isSubmitting ? '保存中...' : editingEvent ? '保存修改' : '添加事件'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
