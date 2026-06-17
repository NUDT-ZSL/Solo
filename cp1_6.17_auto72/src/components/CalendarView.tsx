import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  getMonthFirstDayWeekday,
  getMonthDaysCount,
  getPreviousMonth,
  getNextMonth,
  getMonthName,
  getWeekdayNames,
  formatDate,
  isSameDay,
  formatDateTime,
} from '../utils/dateHelpers';

interface Event {
  id: string;
  name: string;
  city: string;
  venue: string;
  date: string;
  time: string;
  type: 'rehearsal' | 'performance';
  participantIds: string[];
  deviceIds: string[];
  createdAt: string;
}

interface Member {
  id: string;
  name: string;
  role: string;
  city: string;
  isAdmin: boolean;
}

interface Device {
  id: string;
  name: string;
  ownerName: string;
  status: string;
}

interface Props {
  currentUser: Member | null;
}

const CalendarView = ({ currentUser }: Props) => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  const [formData, setFormData] = useState({
    name: '',
    city: '',
    venue: '',
    date: formatDate(new Date()),
    time: '14:00',
    type: 'rehearsal' as 'rehearsal' | 'performance',
    participantIds: [] as string[],
    deviceIds: [] as string[],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [eventsRes, membersRes, devicesRes] = await Promise.all([
        axios.get('/api/events'),
        axios.get('/api/members'),
        axios.get('/api/devices'),
      ]);
      setEvents(eventsRes.data);
      setMembers(membersRes.data);
      setDevices(devicesRes.data.devices || devicesRes.data);
    } catch (err) {
      console.error('获取数据失败:', err);
    }
  };

  const goToPrevMonth = () => {
    const prev = getPreviousMonth(year, month);
    setYear(prev.year);
    setMonth(prev.month);
    setAnimationKey((k) => k + 1);
  };

  const goToNextMonth = () => {
    const next = getNextMonth(year, month);
    setYear(next.year);
    setMonth(next.month);
    setAnimationKey((k) => k + 1);
  };

  const goToToday = () => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setAnimationKey((k) => k + 1);
  };

  const calendarDays = useMemo(() => {
    const firstDay = getMonthFirstDayWeekday(year, month);
    const daysInMonth = getMonthDaysCount(year, month);
    const prevMonth = getPreviousMonth(year, month);
    const daysInPrevMonth = getMonthDaysCount(prevMonth.year, prevMonth.month);

    const days: { day: number; date: Date; isCurrentMonth: boolean }[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const date = new Date(prevMonth.year, prevMonth.month, dayNum);
      days.push({ day: dayNum, date, isCurrentMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      days.push({ day: d, date, isCurrentMonth: true });
    }

    while (days.length % 7 !== 0 || days.length < 42) {
      const nextMonthInfo = getNextMonth(year, month);
      const remaining = days.length - (firstDay + daysInMonth);
      const dayNum = remaining + 1;
      const date = new Date(nextMonthInfo.year, nextMonthInfo.month, dayNum);
      days.push({ day: dayNum, date, isCurrentMonth: false });
      if (days.length >= 42) break;
    }

    return days;
  }, [year, month]);

  const getEventsForDate = (date: Date): Event[] => {
    return events.filter((e) => isSameDay(new Date(e.date), date));
  };

  const getParticipantNames = (ids: string[]): string[] => {
    return ids
      .map((id) => members.find((m) => m.id === id)?.name)
      .filter(Boolean) as string[];
  };

  const getDeviceNames = (ids: string[]): string[] => {
    return ids
      .map((id) => devices.find((d) => d.id === id)?.name)
      .filter(Boolean) as string[];
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.isAdmin) {
      alert('仅管理员可创建事件');
      return;
    }
    try {
      await axios.post('/api/events', formData);
      await fetchData();
      setShowCreateModal(false);
      setFormData({
        name: '',
        city: '',
        venue: '',
        date: formatDate(new Date()),
        time: '14:00',
        type: 'rehearsal',
        participantIds: [],
        deviceIds: [],
      });
    } catch (err: any) {
      alert(err.response?.data?.error || '创建失败');
    }
  };

  const toggleParticipant = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      participantIds: prev.participantIds.includes(id)
        ? prev.participantIds.filter((p) => p !== id)
        : [...prev.participantIds, id],
    }));
  };

  const toggleDevice = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      deviceIds: prev.deviceIds.includes(id)
        ? prev.deviceIds.filter((d) => d !== id)
        : [...prev.deviceIds, id],
    }));
  };

  const renderEventModal = () => {
    if (!selectedEvent) return null;
    const participants = getParticipantNames(selectedEvent.participantIds);
    const deviceNames = getDeviceNames(selectedEvent.deviceIds);

    return (
      <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div style={{ position: 'absolute', top: 16, left: 24 }}>
              <span
                className={`event-type-tag ${selectedEvent.type}`}
                style={{ position: 'relative', top: 0, left: 0 }}
              >
                {selectedEvent.type === 'rehearsal' ? '🎶 排练' : '🎤 演出'}
              </span>
            </div>
            <button className="modal-close" onClick={() => setSelectedEvent(null)}>
              ✕
            </button>
          </div>
          <div className="modal-header" style={{ paddingTop: 12 }}>
            <div>
              <h2 className="modal-title">{selectedEvent.name}</h2>
              <p className="modal-subtitle">
                {formatDateTime(selectedEvent.date, selectedEvent.time)}
              </p>
            </div>
          </div>
          <div className="modal-body">
            <div className="modal-section">
              <div className="modal-info-row">
                <span className="modal-info-icon">📍</span>
                <span>
                  {selectedEvent.city} · {selectedEvent.venue}
                </span>
              </div>
              <div className="modal-info-row">
                <span className="modal-info-icon">🗓️</span>
                <span>{selectedEvent.date} {selectedEvent.time}</span>
              </div>
            </div>

            <div className="modal-section">
              <h3 className="modal-section-title">参与成员</h3>
              <div className="participants-list">
                {participants.length > 0 ? (
                  participants.map((name, idx) => (
                    <span key={idx} className="pill">
                      {name}
                    </span>
                  ))
                ) : (
                  <span style={{ color: '#999', fontSize: 13 }}>暂无参与者</span>
                )}
              </div>
            </div>

            <div className="modal-section">
              <h3 className="modal-section-title">关联设备</h3>
              <div className="devices-list">
                {deviceNames.length > 0 ? (
                  deviceNames.map((name, idx) => (
                    <span key={idx} className="pill rehearsal">
                      {name}
                    </span>
                  ))
                ) : (
                  <span style={{ color: '#999', fontSize: 13 }}>暂无关联设备</span>
                )}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button
              className="btn btn-secondary"
              onClick={() => setSelectedEvent(null)}
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCreateModal = () => {
    if (!showCreateModal) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title" style={{ marginTop: 20 }}>创建新事件</h2>
            <button className="modal-close" onClick={() => setShowCreateModal(false)}>
              ✕
            </button>
          </div>
          <form onSubmit={handleCreateEvent}>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">事件名称 *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：夏季音乐节"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">城市 *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="例如：北京"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">时间 *</label>
                  <input
                    type="time"
                    className="form-input"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">场地 *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  placeholder="例如：工人体育场"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">日期 *</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">类型 *</label>
                <select
                  className="form-select"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as 'rehearsal' | 'performance',
                    })
                  }
                >
                  <option value="rehearsal">🎶 排练</option>
                  <option value="performance">🎤 正式演出</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">参与成员</label>
                <div className="checkbox-group">
                  {members.map((m) => (
                    <label key={m.id} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={formData.participantIds.includes(m.id)}
                        onChange={() => toggleParticipant(m.id)}
                      />
                      {m.name} ({m.role})
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">关联设备</label>
                <div className="checkbox-group">
                  {devices.map((d) => (
                    <label key={d.id} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={formData.deviceIds.includes(d.id)}
                        onChange={() => toggleDevice(d.id)}
                        disabled={d.status !== 'idle'}
                      />
                      {d.name}
                      {d.status !== 'idle' && (
                        <span
                          style={{
                            fontSize: 11,
                            color: '#999',
                          }}
                        >
                          {' '}
                          ({d.status === 'borrowed' ? '已借' : d.status === 'repairing' ? '维修' : '空闲'})
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowCreateModal(false)}
              >
                取消
              </button>
              <button type="submit" className="btn btn-primary">
                创建事件
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="calendar-container">
      <div className="page-header">
        <h1 className="page-title">演出排期日历</h1>
        {currentUser?.isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            ＋ 新建事件
          </button>
        )}
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-dot rehearsal" />
          <span>排练</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot performance" />
          <span>正式演出</span>
        </div>
      </div>

      <div className="calendar-header">
        <h2 className="calendar-title">
          {year}年 {getMonthName(month)}
        </h2>
        <div className="calendar-nav-group">
          <button className="btn btn-outline btn-sm" onClick={goToToday}>
            今天
          </button>
          <button className="calendar-nav-btn" onClick={goToPrevMonth} aria-label="上个月">
            ‹
          </button>
          <button className="calendar-nav-btn" onClick={goToNextMonth} aria-label="下个月">
            ›
          </button>
        </div>
      </div>

      <div key={animationKey} className="calendar-grid fade-in">
        <div className="calendar-weekdays">
          {getWeekdayNames().map((name, idx) => (
            <div
              key={idx}
              className="weekday-cell"
              style={{
                color: idx === 0 || idx === 6 ? '#FF7043' : undefined,
              }}
            >
              周{name}
            </div>
          ))}
        </div>

        <div className="calendar-days">
          {calendarDays.map((dayInfo, idx) => {
            const dayEvents = getEventsForDate(dayInfo.date);
            const isToday = isSameDay(dayInfo.date, today);
            const dayOfWeek = idx % 7;

            return (
              <div
                key={idx}
                className={`day-cell ${dayInfo.isCurrentMonth ? '' : 'other-month'} ${
                  isToday ? 'today' : ''
                }`}
                style={{
                  background:
                    !dayInfo.isCurrentMonth && (dayOfWeek === 0 || dayOfWeek === 6)
                      ? 'rgba(0,0,0,0.25)'
                      : undefined,
                }}
              >
                <div
                  className="day-number"
                  style={{
                    color:
                      isToday || !dayInfo.isCurrentMonth
                        ? undefined
                        : dayOfWeek === 0 || dayOfWeek === 6
                        ? '#FF7043'
                        : undefined,
                  }}
                >
                  {dayInfo.day}
                </div>
                <div className="event-cards-container">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className={`event-card ${event.type}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(event);
                      }}
                      title={event.name}
                    >
                      <div className="event-card-name">{event.name}</div>
                      <div className="event-card-time">{event.time}</div>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--text-secondary)',
                        textAlign: 'center',
                        padding: '2px 0',
                      }}
                    >
                      +{dayEvents.length - 3} 更多
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {renderEventModal()}
      {renderCreateModal()}
    </div>
  );
};

export default CalendarView;
