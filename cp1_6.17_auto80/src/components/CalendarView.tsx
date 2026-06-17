import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getFirstDayOfMonth, getDaysInMonth, isSameDay, formatDate } from '../utils/dateHelpers';

interface EventItem {
  id: string;
  name: string;
  city: string;
  venue: string;
  date: string;
  time: string;
  type: 'rehearsal' | 'performance';
  participants: string[];
  deviceIds: string[];
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

const CalendarView: React.FC = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [fadeIn, setFadeIn] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '', city: '', venue: '', date: '', time: '20:00', type: 'performance' as 'rehearsal' | 'performance',
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = getFirstDayOfMonth(year, month);
  const daysInMonth = getDaysInMonth(year, month);

  const fetchEvents = useCallback(async () => {
    const res = await axios.get('/api/events');
    setEvents(res.data);
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const changeMonth = (delta: number) => {
    setFadeIn(false);
    setTimeout(() => {
      setCurrentDate(new Date(year, month + delta, 1));
      setFadeIn(true);
    }, 150);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    await axios.post('/api/events', { ...formData, participants: [], deviceIds: [] });
    setShowForm(false);
    setFormData({ name: '', city: '', venue: '', date: '', time: '20:00', type: 'performance' });
    fetchEvents();
  };

  const getEventsForDay = (day: number) => {
    return events.filter(ev => isSameDay(ev.date, year, month, day));
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => changeMonth(-1)} style={navBtnStyle}>&lt;</button>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>{year}年{month + 1}月</h2>
          <button onClick={() => changeMonth(1)} style={navBtnStyle}>&gt;</button>
        </div>
        <button onClick={() => setShowForm(true)} style={addBtnStyle}>+ 新建事件</button>
      </div>

      <div className={`calendar-grid ${fadeIn ? '' : 'fade-out'}`} style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 1,
      }}>
        {WEEKDAYS.map(w => (
          <div key={w} style={{ textAlign: 'center', padding: '8px 0', color: '#999', fontSize: 13, fontWeight: 600 }}>{w}</div>
        ))}
        {cells.map((day, i) => {
          const dayEvents = day ? getEventsForDay(day) : [];
          const isToday = day && isSameDay(new Date().toISOString().split('T')[0], year, month, day);
          return (
            <div key={i} className="calendar-cell" style={{
              minHeight: 90,
              padding: 4,
              background: day ? '#252525' : 'transparent',
              borderRadius: day ? 6 : 0,
              position: 'relative',
              animationDelay: `${i * 0.02}s`,
            }}>
              {day && (
                <div style={{
                  fontSize: 13,
                  fontWeight: isToday ? 700 : 400,
                  color: isToday ? '#7C4DFF' : '#AAA',
                  marginBottom: 2,
                  width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%',
                  background: isToday ? 'rgba(124,77,255,0.15)' : 'transparent',
                }}>
                  {day}
                </div>
              )}
              {dayEvents.slice(0, 2).map((ev, evIdx) => (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEvent(ev)}
                  className="event-card"
                  style={{
                    fontSize: 11,
                    padding: '3px 6px',
                    marginBottom: 2,
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: ev.type === 'rehearsal' ? 'rgba(66,165,245,0.15)' : 'rgba(102,187,106,0.15)',
                    color: ev.type === 'rehearsal' ? '#42A5F5' : '#66BB6A',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    position: 'relative',
                    paddingLeft: 14,
                    animation: 'fadeInUp 0.4s ease-out backwards',
                    animationDelay: `${(i * 0.02) + (evIdx * 0.05)}s`,
                  }}
                >
                  <span style={{
                    position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)',
                    width: 5, height: 5, borderRadius: '50%',
                    background: ev.type === 'rehearsal' ? '#42A5F5' : '#66BB6A',
                  }} />
                  {ev.name}
                </div>
              ))}
              {dayEvents.length > 2 && (
                <div style={{ fontSize: 10, color: '#777', textAlign: 'center' }}>+{dayEvents.length - 2}更多</div>
              )}
            </div>
          );
        })}
      </div>

      {selectedEvent && (
        <div style={modalOverlay} onClick={() => setSelectedEvent(null)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>{selectedEvent.name}</h3>
              <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', color: '#999', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <span style={{
                padding: '2px 10px', borderRadius: 12, fontSize: 12,
                background: selectedEvent.type === 'rehearsal' ? 'rgba(66,165,245,0.15)' : 'rgba(102,187,106,0.15)',
                color: selectedEvent.type === 'rehearsal' ? '#42A5F5' : '#66BB6A',
              }}>
                {selectedEvent.type === 'rehearsal' ? '排练' : '正式演出'}
              </span>
            </div>
            <div style={{ fontSize: 14, color: '#CCC', lineHeight: 2 }}>
              <div>📍 {selectedEvent.city} · {selectedEvent.venue}</div>
              <div>📅 {formatDate(selectedEvent.date)} {selectedEvent.time}</div>
              <div style={{ marginTop: 8 }}>
                <strong style={{ color: '#FFF' }}>参与者：</strong>
                {selectedEvent.participants.length > 0 ? selectedEvent.participants.join('、') : '暂无'}
              </div>
              <div>
                <strong style={{ color: '#FFF' }}>关联设备：</strong>
                {selectedEvent.deviceIds.length > 0 ? `${selectedEvent.deviceIds.length} 件` : '暂无'}
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div style={modalOverlay} onClick={() => setShowForm(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>新建演出事件</h3>
            <form onSubmit={handleCreateEvent}>
              {[
                { label: '演出名称', key: 'name', type: 'text' },
                { label: '城市', key: 'city', type: 'text' },
                { label: '场地', key: 'venue', type: 'text' },
                { label: '日期', key: 'date', type: 'date' },
                { label: '时间', key: 'time', type: 'time' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 13, color: '#AAA', marginBottom: 4 }}>{f.label}</label>
                  <input
                    type={f.type}
                    value={(formData as any)[f.key]}
                    onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                    required
                    style={inputStyle}
                  />
                </div>
              ))}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#AAA', marginBottom: 4 }}>类型</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                  style={inputStyle}
                >
                  <option value="rehearsal">排练</option>
                  <option value="performance">正式演出</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)} style={cancelBtnStyle}>取消</button>
                <button type="submit" style={submitBtnStyle}>创建</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const navBtnStyle: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 8, border: '1px solid #444',
  background: '#2C2C2C', color: '#FFF', fontSize: 16, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'background 0.2s',
};

const addBtnStyle: React.CSSProperties = {
  padding: '8px 20px', borderRadius: 8, border: 'none',
  background: 'linear-gradient(135deg, #7C4DFF, #651FFF)', color: '#FFF',
  fontSize: 14, fontWeight: 600, cursor: 'pointer',
  transition: 'transform 0.2s',
};

const modalOverlay: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, animation: 'fadeInUp 0.3s ease-out',
};

const modalContent: React.CSSProperties = {
  background: '#FFFFFF', borderRadius: 16, width: 400, padding: 24, color: '#1E1E1E',
  maxHeight: '80vh', overflowY: 'auto',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 6,
  border: '1px solid #DDD', fontSize: 14, outline: 'none',
  background: '#F9F9F9', color: '#1E1E1E',
  transition: 'border-color 0.2s, transform 0.2s',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 20px', borderRadius: 8, border: '1px solid #DDD',
  background: '#FFF', color: '#1E1E1E', fontSize: 14, cursor: 'pointer',
};

const submitBtnStyle: React.CSSProperties = {
  padding: '8px 20px', borderRadius: 8, border: 'none',
  background: 'linear-gradient(135deg, #7C4DFF, #651FFF)', color: '#FFF',
  fontSize: 14, fontWeight: 600, cursor: 'pointer',
};

const CalendarViewWithStyles: React.FC = () => (
  <>
    <CalendarView />
    <style>{`
      .event-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 2px 8px #E0E0E0;
      }
      .calendar-grid {
        opacity: 1;
        transition: opacity 0.3s ease-in-out;
      }
      .calendar-grid.fade-out {
        opacity: 0;
      }
      .calendar-cell {
        animation: fadeInUp 0.4s ease-out backwards;
      }
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `}</style>
  </>
);

export default CalendarViewWithStyles;
