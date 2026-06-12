import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Activity, Registration } from '../types';

const CalendarView: React.FC = () => {
  const { activities, fetchActivities, registerActivity, getRegistrations } = useApp();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedDateActivities, setSelectedDateActivities] = useState<Activity[]>([]);
  const [registrations, setRegistrations] = useState<Record<string, Registration[]>>({});
  const [registeredActivities, setRegisteredActivities] = useState<Set<string>>(new Set());
  const [volunteerName, setVolunteerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [pendingActivityId, setPendingActivityId] = useState<string | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [animationActivityId, setAnimationActivityId] = useState<string | null>(null);
  const successBtnRef = useRef<HTMLButtonElement>(null);
  const [successPosition, setSuccessPosition] = useState({ top: 0, left: 0 });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    fetchActivities(monthStr);
  }, [year, month, fetchActivities]);

  useEffect(() => {
    const loadRegistrations = async () => {
      const regMap: Record<string, Registration[]> = {};
      for (const activity of activities) {
        const regs = await getRegistrations(activity._id);
        regMap[activity._id] = regs;
      }
      setRegistrations(regMap);
    };
    loadRegistrations();
  }, [activities, getRegistrations]);

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const hasActivityOnDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return activities.some((a) => a.dateTime.startsWith(dateStr));
  };

  const getActivitiesForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return activities.filter((a) => a.dateTime.startsWith(dateStr));
  };

  const handleDateClick = (day: number) => {
    const dayActivities = getActivitiesForDate(day);
    if (dayActivities.length > 0) {
      setSelectedDateActivities(dayActivities);
      setSelectedActivity(dayActivities[0]);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleRegisterClick = (activityId: string) => {
    const storedName = localStorage.getItem('volunteerName');
    if (storedName) {
      setVolunteerName(storedName);
      doRegister(activityId, storedName);
    } else {
      setPendingActivityId(activityId);
      setShowNameInput(true);
    }
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (volunteerName.trim() && pendingActivityId) {
      localStorage.setItem('volunteerName', volunteerName.trim());
      doRegister(pendingActivityId, volunteerName.trim());
      setShowNameInput(false);
      setPendingActivityId(null);
    }
  };

  const doRegister = async (activityId: string, name: string) => {
    const result = await registerActivity(activityId, name);
    if (result) {
      setRegisteredActivities((prev) => new Set([...prev, activityId]));
      setAnimationActivityId(activityId);

      const button = document.querySelector(`[data-activity-id="${activityId}"] .register-btn`);
      if (button) {
        const rect = button.getBoundingClientRect();
        setSuccessPosition({
          top: rect.top + window.scrollY - 40,
          left: rect.left + rect.width / 2,
        });
      }
      setShowSuccessAnimation(true);
      setTimeout(() => {
        setShowSuccessAnimation(false);
        setAnimationActivityId(null);
      }, 800);

      const updatedRegs = await getRegistrations(activityId);
      setRegistrations((prev) => ({ ...prev, [activityId]: updatedRegs }));
    }
  };

  const formatDateTime = (dateTime: string) => {
    const d = new Date(dateTime);
    return d.toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days: (number | null)[] = [];

  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  return (
    <div className="calendar-page">
      <header className="calendar-header">
        <h1>志愿者活动报名</h1>
        <nav className="calendar-nav">
          <a href="/" className="nav-link active">
            活动日历
          </a>
          <a href="/admin" className="nav-link">
            管理后台
          </a>
        </nav>
      </header>

      <main className="calendar-main">
        <div className="calendar-container">
          <div className="calendar-month-header">
            <button className="month-nav-btn" onClick={handlePrevMonth}>
              ‹
            </button>
            <h2>
              {year}年{month + 1}月
            </h2>
            <button className="month-nav-btn" onClick={handleNextMonth}>
              ›
            </button>
          </div>

          <div className="calendar-weekdays">
            {weekDays.map((day) => (
              <div key={day} className="weekday-cell">
                {day}
              </div>
            ))}
          </div>

          <div className="calendar-grid">
            {days.map((day, index) => (
              <div
                key={index}
                className={`calendar-cell ${day ? '' : 'empty'} ${
                  day && hasActivityOnDate(day) ? 'has-activity' : ''
                }`}
                onClick={() => day && handleDateClick(day)}
              >
                {day && (
                  <>
                    <span className="day-number">{day}</span>
                    {hasActivityOnDate(day) && <span className="activity-dot"></span>}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {selectedActivity && (
          <div className="activity-detail-modal" onClick={() => setSelectedActivity(null)}>
            <div
              className="activity-detail-card"
              data-activity-id={selectedActivity._id}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="detail-close-btn"
                onClick={() => setSelectedActivity(null)}
                aria-label="关闭"
              >
                ×
              </button>
              <h3>{selectedActivity.name}</h3>
              <div className="detail-info">
                <div className="info-row">
                  <span className="info-icon">🕐</span>
                  <span>{formatDateTime(selectedActivity.dateTime)}</span>
                </div>
                <div className="info-row">
                  <span className="info-icon">📍</span>
                  <span>{selectedActivity.location}</span>
                </div>
                <div className="info-row">
                  <span className="info-icon">👥</span>
                  <span>
                    {registrations[selectedActivity._id]?.length || 0} /{' '}
                    {selectedActivity.maxParticipants} 人已报名
                  </span>
                </div>
              </div>
              {selectedActivity.description && (
                <p className="detail-description">{selectedActivity.description}</p>
              )}

              {registeredActivities.has(selectedActivity._id) ||
              (registrations[selectedActivity._id] || []).some(
                (r) => r.volunteerName === localStorage.getItem('volunteerName')
              ) ? (
                <button className="register-btn registered" disabled>
                  已报名
                </button>
              ) : (
                <button
                  className="register-btn"
                  onClick={() => handleRegisterClick(selectedActivity._id)}
                >
                  我要报名
                </button>
              )}
            </div>
          </div>
        )}

        {showNameInput && (
          <div className="name-input-modal" onClick={() => setShowNameInput(false)}>
            <div className="name-input-card" onClick={(e) => e.stopPropagation()}>
              <h3>请输入您的姓名</h3>
              <form onSubmit={handleNameSubmit}>
                <input
                  type="text"
                  value={volunteerName}
                  onChange={(e) => setVolunteerName(e.target.value)}
                  placeholder="您的姓名"
                  autoFocus
                />
                <div className="name-input-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setShowNameInput(false)}
                  >
                    取消
                  </button>
                  <button type="submit" className="btn-primary">
                    确认报名
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showSuccessAnimation && (
          <div
            className="success-animation"
            style={{ top: successPosition.top, left: successPosition.left }}
          >
            <svg
              className="success-check"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="12" cy="12" r="12" fill="#00b894" />
              <path
                d="M7 12.5L10.5 16L17 9"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </main>
    </div>
  );
};

export default CalendarView;
