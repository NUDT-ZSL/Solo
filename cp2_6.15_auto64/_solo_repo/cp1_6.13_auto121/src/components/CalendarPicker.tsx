import { useMemo, useState } from 'react';
import { TimeSlot } from '../services/api';

interface Props {
  slots: TimeSlot[];
  selectedDate: string | null;
  selectedSlotId: string | null;
  onSelectDate: (date: string) => void;
  onSelectSlot: (slot: TimeSlot) => void;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function CalendarPicker({
  slots,
  selectedDate,
  selectedSlotId,
  onSelectDate,
  onSelectSlot,
}: Props) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const slotsByDate = useMemo(() => {
    const map: Record<string, TimeSlot[]> = {};
    for (const s of slots) {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    }
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.start.localeCompare(b.start)));
    return map;
  }, [slots]);

  const bookedDates = useMemo(() => {
    const set = new Set<string>();
    for (const s of slots) {
      if (s.booked) set.add(s.date);
    }
    return set;
  }, [slots]);

  const hasFreeDates = useMemo(() => {
    const set = new Set<string>();
    for (const s of slots) {
      if (!s.booked) set.add(s.date);
    }
    return set;
  }, [slots]);

  const buildMonth = () => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const firstDay = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push(dateStr);
    }
    return cells;
  };

  const cells = buildMonth();
  const today = new Date().toISOString().slice(0, 10);

  const selectedSlots = selectedDate ? slotsByDate[selectedDate] || [] : [];

  const prevMonth = () => {
    const d = new Date(cursor);
    d.setMonth(d.getMonth() - 1);
    setCursor(d);
  };

  const nextMonth = () => {
    const d = new Date(cursor);
    d.setMonth(d.getMonth() + 1);
    setCursor(d);
  };

  return (
    <div>
      <div className="calendar">
        <div className="cal-header">
          <button className="cal-nav-btn" onClick={prevMonth} type="button">
            ‹
          </button>
          <div className="cal-month">
            {cursor.getFullYear()} 年 {cursor.getMonth() + 1} 月
          </div>
          <button className="cal-nav-btn" onClick={nextMonth} type="button">
            ›
          </button>
        </div>
        <div className="cal-weekdays">
          {WEEKDAYS.map((w) => (
            <div className="cal-weekday" key={w}>
              {w}
            </div>
          ))}
        </div>
        <div className="cal-grid">
          {cells.map((d, idx) => {
            if (!d) return <div className="cal-cell empty" key={idx} />;
            const dayNum = Number(d.slice(8));
            const isDisabled = !hasFreeDates.has(d);
            const isAllBooked = slotsByDate[d]?.length && slotsByDate[d].every((s) => s.booked);
            const showStrike = isAllBooked || d < today;
            const cell = (
              <div
                key={idx}
                className={[
                  'cal-cell',
                  selectedDate === d ? 'selected' : '',
                  showStrike ? 'disabled' : '',
                  slotsByDate[d]?.some((s) => !s.booked) ? 'has-slots' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => !showStrike && onSelectDate(d)}
              >
                {dayNum}
              </div>
            );
            return cell;
          })}
        </div>
      </div>

      <div className="slots-panel">
        <div className="slots-panel-title">
          {selectedDate ? `${selectedDate} · 30分钟时段` : '请先在上方选择一个日期'}
        </div>
        {selectedDate ? (
          selectedSlots.length ? (
            <div className="slots-list">
              {selectedSlots.map((s) => (
                <button
                  key={s.id}
                  className={`slot-btn ${selectedSlotId === s.id ? 'selected' : ''}`}
                  disabled={s.booked}
                  onClick={() => !s.booked && onSelectSlot(s)}
                  type="button"
                >
                  {s.start} - {s.end}
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              这一天暂无开放时段
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
