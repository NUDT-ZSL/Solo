import React, { useState, useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO, setHours, setMinutes } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppContext } from '../context/AppContext';
import EventCard from '../components/EventCard';
import { BandEvent } from '../types';

const emptyEvent: Partial<BandEvent> = {
  title: '',
  datetime: new Date().toISOString().slice(0, 16),
  location: '',
  type: 'rehearsal',
  notes: '',
};

const CalendarPage: React.FC = () => {
  const { events, addEvent, updateEvent, deleteEvent } = useAppContext();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<BandEvent | null>(null);
  const [formData, setFormData] = useState<Partial<BandEvent>>(emptyEvent);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const today = new Date();

  const prevWeek = () => setWeekStart(addDays(weekStart, -7));
  const nextWeek = () => setWeekStart(addDays(weekStart, 7));
  const todayWeek = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const eventsByDay = useMemo(() => {
    const map: Record<string, BandEvent[]> = {};
    for (const d of weekDays) {
      map[format(d, 'yyyy-MM-dd')] = [];
    }
    for (const ev of events) {
      const key = format(parseISO(ev.datetime), 'yyyy-MM-dd');
      if (map[key]) map[key].push(ev);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
    }
    return map;
  }, [events, weekDays]);

  const openCreate = (date?: Date) => {
    setEditingEvent(null);
    if (date) {
      const d = setMinutes(setHours(date, 18), 0);
      setFormData({ ...emptyEvent, datetime: format(d, "yyyy-MM-dd'T'HH:mm") });
    } else {
      setFormData(emptyEvent);
    }
    setShowModal(true);
  };

  const openEdit = (event: BandEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      datetime: format(new Date(event.datetime), "yyyy-MM-dd'T'HH:mm"),
      location: event.location,
      type: event.type,
      notes: event.notes,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || formData.title.length > 40) {
      alert('标题必填，且不能超过40字');
      return;
    }
    if (formData.notes && formData.notes.length > 200) {
      alert('备注不能超过200字');
      return;
    }
    try {
      if (editingEvent) {
        await updateEvent(editingEvent._id, formData);
      } else {
        await addEvent(formData);
      }
      setShowModal(false);
    } catch (err) {
      alert('保存失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除此事件？')) return;
    try {
      await deleteEvent(id);
    } catch (err) {
      alert('删除失败');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">排练日历</h2>
        <div className="header-actions">
          <button className="btn" onClick={prevWeek}>← 上周</button>
          <button className="btn" onClick={todayWeek}>今天</button>
          <button className="btn" onClick={nextWeek}>下周 →</button>
          <button className="btn btn-primary" onClick={() => openCreate()}>+ 新建事件</button>
        </div>
      </div>

      <div className="week-range-label">
        {format(weekDays[0], 'yyyy年M月d日', { locale: zhCN })} — {format(weekDays[6], 'M月d日', { locale: zhCN })}
      </div>

      <div className="calendar-grid desktop-view">
        {weekDays.map((day, idx) => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const isToday = isSameDay(day, today);
          return (
            <div
              key={dayKey}
              className={`calendar-col ${isToday ? 'col-today' : ''}`}
              style={{ borderRight: idx < 6 ? '1px solid #2d2b55' : 'none' }}
              onClick={() => openCreate(day)}
            >
              {isToday && <div className="today-bar"></div>}
              <div className="col-header">
                <div className="col-weekday">{format(day, 'EEE', { locale: zhCN })}</div>
                <div className={`col-date ${isToday ? 'today-date' : ''}`}>{format(day, 'd')}</div>
              </div>
              <div className="col-events" onClick={(e) => e.stopPropagation()}>
                {eventsByDay[dayKey].map(ev => (
                  <EventCard key={ev._id} event={ev} onEdit={openEdit} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="calendar-list mobile-view">
        {weekDays.map((day) => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const isToday = isSameDay(day, today);
          return (
            <div key={dayKey} className="mobile-day-section">
              <div className="mobile-day-header">
                <span className={`${isToday ? 'today-date' : ''}`}>
                  {format(day, 'EEE M月d日', { locale: zhCN })}
                </span>
                {isToday && <span className="today-tag">今天</span>}
                <button className="btn-xs" onClick={() => openCreate(day)}>+</button>
              </div>
              <div className="mobile-day-events">
                {eventsByDay[dayKey].length === 0 && <div className="empty-day">无安排</div>}
                {eventsByDay[dayKey].map(ev => (
                  <EventCard key={ev._id} event={ev} onEdit={openEdit} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingEvent ? '编辑事件' : '新建事件'}</h3>
            <form onSubmit={handleSubmit} className="form">
              <label>
                标题 <span className="required">*</span>
                <input
                  type="text"
                  maxLength={40}
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="输入事件标题（最多40字）"
                  required
                />
              </label>
              <label>
                日期时间 <span className="required">*</span>
                <input
                  type="datetime-local"
                  value={formData.datetime || ''}
                  onChange={(e) => setFormData({ ...formData, datetime: e.target.value })}
                  required
                />
              </label>
              <label>
                类型
                <select
                  value={formData.type || 'rehearsal'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'rehearsal' | 'gig' })}
                >
                  <option value="rehearsal">排练</option>
                  <option value="gig">演出</option>
                </select>
              </label>
              <label>
                地点
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="选填"
                />
              </label>
              <label>
                备注
                <textarea
                  maxLength={200}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="选填，最多200字"
                  rows={3}
                />
              </label>
              <div className="form-actions">
                <button type="button" className="btn" onClick={() => setShowModal(false)}>取消</button>
                <button type="submit" className="btn btn-primary">{editingEvent ? '保存' : '创建'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
