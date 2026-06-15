import React, { useState, useMemo, useEffect } from 'react';
import { Todo } from '../types';

interface CalendarProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  todosMap: Record<string, Todo[]>;
  onMonthChange?: (startDate: string, endDate: string) => void;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTH_NAMES = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'
];

const formatDate = (year: number, month: number, day: number): string => {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const getMonthDays = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstDayOfWeek = firstDay.getDay();
  const totalDays = lastDay.getDate();
  
  const days: Array<{ day: number; date: string; inMonth: boolean }> = [];
  
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    days.push({
      day,
      date: formatDate(prevYear, prevMonth, day),
      inMonth: false,
    });
  }
  
  for (let day = 1; day <= totalDays; day++) {
    days.push({
      day,
      date: formatDate(year, month, day),
      inMonth: true,
    });
  }
  
  const remainingDays = 42 - days.length;
  for (let day = 1; day <= remainingDays; day++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    days.push({
      day,
      date: formatDate(nextYear, nextMonth, day),
      inMonth: false,
    });
  }
  
  return days;
};

const getWeekDays = (baseDate: Date) => {
  const base = new Date(baseDate);
  const dayOfWeek = base.getDay();
  const monday = new Date(base);
  monday.setDate(base.getDate() - dayOfWeek);
  
  const days: Array<{ day: number; date: string; weekday: string }> = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push({
      day: d.getDate(),
      date: formatDate(d.getFullYear(), d.getMonth(), d.getDate()),
      weekday: WEEKDAYS[i],
    });
  }
  return days;
};

const Calendar: React.FC<CalendarProps> = ({ selectedDate, onDateSelect, todosMap, onMonthChange }) => {
  const today = useMemo(() => {
    const t = new Date();
    return formatDate(t.getFullYear(), t.getMonth(), t.getDate());
  }, []);

  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date(selectedDate);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const { year, month } = currentDate;
    const startDate = formatDate(year, month, 1);
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endDate = formatDate(year, month, lastDay);
    onMonthChange?.(startDate, endDate);
  }, [currentDate, onMonthChange]);

  const goToPrevMonth = () => {
    if (isAnimating) return;
    setSlideDirection('right');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentDate((prev) => {
        const newMonth = prev.month === 0 ? 11 : prev.month - 1;
        const newYear = prev.month === 0 ? prev.year - 1 : prev.year;
        return { year: newYear, month: newMonth };
      });
      setIsAnimating(false);
      setSlideDirection(null);
    }, 200);
  };

  const goToNextMonth = () => {
    if (isAnimating) return;
    setSlideDirection('left');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentDate((prev) => {
        const newMonth = prev.month === 11 ? 0 : prev.month + 1;
        const newYear = prev.month === 11 ? prev.year + 1 : prev.year;
        return { year: newYear, month: newMonth };
      });
      setIsAnimating(false);
      setSlideDirection(null);
    }, 200);
  };

  const monthDays = useMemo(() => {
    return getMonthDays(currentDate.year, currentDate.month);
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    return getWeekDays(base);
  }, [weekOffset]);

  const handleDateClick = (date: string) => {
    onDateSelect(date);
    const d = new Date(date);
    if (d.getFullYear() !== currentDate.year || d.getMonth() !== currentDate.month) {
      setCurrentDate({ year: d.getFullYear(), month: d.getMonth() });
    }
  };

  if (isMobile) {
    return (
      <div style={styles.mobileContainer}>
        <div style={styles.mobileHeader}>
          <button
            onClick={() => setWeekOffset((p) => p - 1)}
            style={styles.navButton}
          >
            ‹
          </button>
          <div style={styles.mobileTitle}>
            {weekDays[0].day}日 - {weekDays[6].day}日
          </div>
          <button
            onClick={() => setWeekOffset((p) => p + 1)}
            style={styles.navButton}
          >
            ›
          </button>
        </div>
        <div style={styles.weekContainer}>
          {weekDays.map(({ day, date, weekday }) => {
            const hasTodos = todosMap[date]?.length > 0;
            const isSelected = date === selectedDate;
            const isToday = date === today;
            
            return (
              <div
                key={date}
                onClick={() => handleDateClick(date)}
                style={{
                  ...styles.weekDay,
                  backgroundColor: isSelected ? 'var(--accent-blue-light)' : 'transparent',
                  borderColor: isToday ? 'var(--accent-purple)' : 'transparent',
                }}
              >
                <div style={{
                  ...styles.weekDayLabel,
                  color: !isSelected && !isToday ? 'var(--text-tertiary)' : 'var(--text-primary)',
                }}>
                  {weekday}
                </div>
                <div style={{
                  ...styles.weekDayNumber,
                  fontWeight: isSelected || isToday ? 600 : 400,
                  color: !isSelected && !isToday ? 'var(--text-secondary)' : 'var(--text-primary)',
                }}>
                  {day}
                </div>
                {hasTodos && <div style={styles.todoDotMobile} />}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={goToPrevMonth} style={styles.navButton}>
          ‹
        </button>
        <div style={styles.title}>
          {currentDate.year}年 {MONTH_NAMES[currentDate.month]}
        </div>
        <button onClick={goToNextMonth} style={styles.navButton}>
          ›
        </button>
      </div>

      <div style={styles.weekdays}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={styles.weekday}>{w}</div>
        ))}
      </div>

      <div
        style={{
          ...styles.grid,
          transform: isAnimating
            ? `translateX(${slideDirection === 'left' ? '-30px' : '30px'})`
            : 'translateX(0)',
          opacity: isAnimating ? 0.3 : 1,
          transition: 'all 0.2s ease',
        }}
      >
        {monthDays.map(({ day, date, inMonth }) => {
          const hasTodos = todosMap[date]?.length > 0;
          const isSelected = date === selectedDate;
          const isToday = date === today;

          return (
            <div
              key={date}
              onClick={() => handleDateClick(date)}
              style={{
                ...styles.day,
                opacity: inMonth ? 1 : 0.35,
                backgroundColor: isSelected ? 'var(--accent-blue-light)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--bg-tertiary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
                }
              }}
            >
              <span
                style={{
                  ...styles.dayNumber,
                  width: isToday ? 30 : 'auto',
                  height: isToday ? 30 : 'auto',
                  borderRadius: isToday ? '50%' : 0,
                  backgroundColor: isToday ? 'var(--accent-purple)' : 'transparent',
                  color: isToday ? '#fff' : inMonth ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: isSelected || isToday ? 600 : 400,
                }}
              >
                {day}
              </span>
              {hasTodos && <div style={styles.todoDot} />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-lg)',
    padding: 24,
    boxShadow: 'var(--shadow-md)',
    minWidth: 400,
  },
  mobileContainer: {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-md)',
    padding: 16,
    boxShadow: 'var(--shadow-md)',
    width: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  mobileHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  mobileTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 'var(--radius-sm)',
    fontSize: 22,
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color var(--transition-fast)',
  },
  weekdays: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    marginBottom: 8,
  },
  weekday: {
    textAlign: 'center',
    fontSize: 13,
    color: 'var(--text-tertiary)',
    fontWeight: 500,
    padding: '8px 0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 2,
  },
  weekContainer: {
    display: 'flex',
    overflowX: 'auto',
    gap: 8,
    paddingBottom: 4,
    scrollbarWidth: 'none',
  },
  weekDay: {
    flex: 1,
    minWidth: 44,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 4px',
    borderRadius: 'var(--radius-sm)',
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  weekDayLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  weekDayNumber: {
    fontSize: 16,
  },
  day: {
    aspectRatio: '1 / 1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast)',
    position: 'relative',
    padding: 4,
  },
  dayNumber: {
    fontSize: 14,
    padding: '4px 6px',
  },
  todoDot: {
    position: 'absolute',
    bottom: 6,
    width: 5,
    height: 5,
    borderRadius: '50%',
    backgroundColor: 'var(--accent-purple)',
  },
  todoDotMobile: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    backgroundColor: 'var(--accent-purple)',
    marginTop: 4,
  },
};

export default Calendar;
