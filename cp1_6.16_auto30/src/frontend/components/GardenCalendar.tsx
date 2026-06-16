import React, { useState, useMemo, useCallback } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO,
  isBefore,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { isDatePast, getEventTypeLabel, EVENT_TYPE_LABELS } from '../../business/calendarLogic';
import type { GardenEvent, EventType } from '../../../types';

interface GardenCalendarProps {
  events: GardenEvent[];
  onDateClick: (date: string) => void;
  highlightedDate?: string | null;
}

const EVENT_COLORS: Record<EventType, string> = {
  sowing: '#4CAF50',
  watering: '#2196F3',
  fertilizing: '#9C27B0',
  harvesting: '#FF9800',
  germination: '#8BC34A',
  thinning: '#00BCD4',
};

const GardenCalendar: React.FC<GardenCalendarProps> = ({
  events,
  onDateClick,
  highlightedDate,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [slideDirection, setSlideDirection] = useState<'up' | 'down'>('up');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = useMemo(
    () => eachDayOfInterval({ start: calendarStart, end: calendarEnd }),
    [calendarStart.getTime(), calendarEnd.getTime()]
  );

  const eventsByDate = useMemo(() => {
    const map: Record<string, GardenEvent[]> = {};
    for (const event of events) {
      const key = event.date;
      if (!map[key]) map[key] = [];
      map[key].push(event);
    }
    return map;
  }, [events]);

  const handlePrevMonth = useCallback(() => {
    setSlideDirection('down');
    setCurrentMonth(prev => subMonths(prev, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setSlideDirection('up');
    setCurrentMonth(prev => addMonths(prev, 1));
  }, []);

  const today = new Date();

  return (
    <div style={styles.calendarContainer}>
      <div style={styles.calendarHeader}>
        <button onClick={handlePrevMonth} style={styles.navButton}>
          ◀
        </button>
        <h3 style={styles.monthTitle}>
          {format(currentMonth, 'yyyy年M月', { locale: zhCN })}
        </h3>
        <button onClick={handleNextMonth} style={styles.navButton}>
          ▶
        </button>
      </div>

      <div style={styles.weekDayRow}>
        {['一', '二', '三', '四', '五', '六', '日'].map(d => (
          <div key={d} style={styles.weekDayCell}>
            {d}
          </div>
        ))}
      </div>

      <div
        style={{
          ...styles.calendarGrid,
          animation: slideDirection === 'up'
            ? 'slideUp 0.35s ease-out'
            : 'slideDown 0.35s ease-out',
        }}
        key={currentMonth.getTime()}
      >
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDate[dateStr] || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isDateTodayFlag = isToday(day);
          const isPast = isBefore(day, new Date(format(today, 'yyyy-MM-dd')));
          const isHighlighted = highlightedDate === dateStr;

          return (
            <div
              key={dateStr}
              style={{
                ...styles.dayCell,
                ...(!isCurrentMonth ? styles.dayCellOtherMonth : {}),
                ...(isDateTodayFlag ? styles.dayCellToday : {}),
                ...(isHighlighted ? styles.dayCellHighlighted : {}),
              }}
              className="calendar-day-cell"
              onClick={() => onDateClick(dateStr)}
            >
              <span
                style={{
                  ...styles.dayNumber,
                  ...(isPast ? styles.dayNumberPast : {}),
                  ...(isDateTodayFlag ? styles.dayNumberToday : {}),
                }}
              >
                {format(day, 'd')}
              </span>
              <div style={styles.eventDots}>
                {dayEvents.slice(0, 3).map((event, i) => (
                  <div
                    key={i}
                    style={{
                      ...styles.eventDot,
                      backgroundColor: EVENT_COLORS[event.type],
                      ...(isPast && !event.completed ? styles.eventDotPast : {}),
                    }}
                    title={`${getEventTypeLabel(event.type)}${event.note ? ': ' + event.note : ''}`}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <span style={styles.moreDots}>+{dayEvents.length - 3}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={styles.legend}>
        {Object.entries(EVENT_COLORS).map(([type, color]) => (
          <div key={type} style={styles.legendItem}>
            <div style={{ ...styles.legendDot, backgroundColor: color }} />
            <span style={styles.legendText}>{(EVENT_TYPE_LABELS as Record<string, string>)[type]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  calendarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  navButton: {
    backgroundColor: 'transparent',
    border: '1px solid #E0D8CF',
    borderRadius: '6px',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#4A7C59',
    transition: 'background-color 0.2s',
  },
  monthTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#3E2723',
    margin: 0,
  },
  weekDayRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '2px',
    marginBottom: '4px',
  },
  weekDayCell: {
    textAlign: 'center' as const,
    fontSize: '12px',
    fontWeight: 600,
    color: '#8D7B68',
    padding: '4px 0',
  },
  calendarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '2px',
  },
  dayCell: {
    minHeight: '64px',
    padding: '4px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
  },
  dayCellOtherMonth: {
    opacity: 0.3,
  },
  dayCellToday: {
    backgroundColor: '#E8F5E9',
  },
  dayCellHighlighted: {
    backgroundColor: '#FFF9C4',
    animation: 'highlightFlash 0.3s ease-out 2',
  },
  dayNumber: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#3E2723',
    marginBottom: '2px',
  },
  dayNumberPast: {
    color: '#9E9E9E',
    textDecoration: 'line-through',
  },
  dayNumberToday: {
    color: '#4A7C59',
    fontWeight: 700,
  },
  eventDots: {
    display: 'flex',
    gap: '2px',
    flexWrap: 'wrap' as const,
  },
  eventDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
  },
  eventDotPast: {
    opacity: 0.4,
  },
  moreDots: {
    fontSize: '9px',
    color: '#8D7B68',
  },
  legend: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '12px',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #F0EBE3',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  legendText: {
    fontSize: '11px',
    color: '#6D4C41',
  },
};

export default GardenCalendar;
