import { useState, useMemo, useRef, useEffect } from 'react';
import dayjs from 'dayjs';
import type { Schedule, Member } from '../types';

interface CalendarViewProps {
  schedules: Schedule[];
  members: Member[];
  startDate: string;
  endDate: string;
  onAddSchedule: (schedule: Partial<Schedule>) => void;
  onUpdateSchedule: (scheduleId: string, updates: Partial<Schedule>) => void;
  onDeleteSchedule: (scheduleId: string) => void;
  readOnly: boolean;
  currentMemberId: string | null;
}

function CalendarView({
  schedules,
  members,
  startDate,
  endDate,
  onAddSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  readOnly,
  currentMemberId
}: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const [currentDate, setCurrentDate] = useState(dayjs(startDate));
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(startDate);
  const [isDragging, setIsDragging] = useState(false);
  const [dragScheduleId, setDragScheduleId] = useState<string | null>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const [formData, setFormData] = useState({
    time: '09:00',
    location: '',
    activity: '',
    budget: 0,
    expenseType: 'split'
  });

  const daysList = useMemo(() => {
    const days: string[] = [];
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    let current = start;
    while (current.isBefore(end) || current.isSame(end, 'day')) {
      days.push(current.format('YYYY-MM-DD'));
      current = current.add(1, 'day');
    }
    return days;
  }, [startDate, endDate]);

  const visibleDays = useMemo(() => {
    if (viewMode === 'day') {
      return [currentDate.format('YYYY-MM-DD')];
    }
    return daysList;
  }, [viewMode, currentDate, daysList]);

  const getSchedulesByDate = (date: string) => {
    return schedules.filter(s => s.date === date).sort((a, b) => a.time.localeCompare(b.time));
  };

  const getMemberById = (memberId: string) => {
    return members.find(m => m.id === memberId);
  };

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  const handlePrev = () => {
    if (isAnimating) return;
    setSlideDirection('right');
    setIsAnimating(true);
    setTimeout(() => {
      if (viewMode === 'day') {
        setCurrentDate(d => d.subtract(1, 'day'));
      } else {
        setCurrentDate(d => d.subtract(7, 'day'));
      }
      setSlideDirection(null);
      setIsAnimating(false);
    }, 150);
  };

  const handleNext = () => {
    if (isAnimating) return;
    setSlideDirection('left');
    setIsAnimating(true);
    setTimeout(() => {
      if (viewMode === 'day') {
        setCurrentDate(d => d.add(1, 'day'));
      } else {
        setCurrentDate(d => d.add(7, 'day'));
      }
      setSlideDirection(null);
      setIsAnimating(false);
    }, 150);
  };

  const handleDragStart = (e: React.DragEvent, scheduleId: string) => {
    if (readOnly) return;
    setIsDragging(true);
    setDragScheduleId(scheduleId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', scheduleId);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragScheduleId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, date: string) => {
    e.preventDefault();
    if (readOnly || !dragScheduleId) return;

    const schedule = schedules.find(s => s.id === dragScheduleId);
    if (schedule && schedule.date !== date) {
      onUpdateSchedule(dragScheduleId, { date });
    }

    setIsDragging(false);
    setDragScheduleId(null);
  };

  const handleAddClick = (date: string) => {
    if (readOnly) return;
    setSelectedDate(date);
    setFormData({
      time: '09:00',
      location: '',
      activity: '',
      budget: 0,
      expenseType: 'split'
    });
    setShowAddModal(true);
  };

  const handleEditClick = (schedule: Schedule) => {
    if (readOnly) return;
    setEditingSchedule(schedule);
    setSelectedDate(schedule.date);
    setFormData({
      time: schedule.time,
      location: schedule.location,
      activity: schedule.activity,
      budget: schedule.budget,
      expenseType: schedule.expense_type
    });
    setShowAddModal(true);
  };

  const handleSave = () => {
    if (!formData.activity || !formData.location || !formData.time) return;

    if (editingSchedule) {
      onUpdateSchedule(editingSchedule.id, {
        date: selectedDate,
        time: formData.time,
        location: formData.location,
        activity: formData.activity,
        budget: Number(formData.budget),
        expenseType: formData.expenseType
      });
    } else {
      onAddSchedule({
        date: selectedDate,
        time: formData.time,
        location: formData.location,
        activity: formData.activity,
        budget: Number(formData.budget),
        expense_type: formData.expenseType
      });
    }

    setShowAddModal(false);
    setEditingSchedule(null);
  };

  const handleDelete = () => {
    if (editingSchedule) {
      onDeleteSchedule(editingSchedule.id);
      setShowAddModal(false);
      setEditingSchedule(null);
    }
  };

  const isToday = (date: string) => {
    return dayjs(date).isSame(dayjs(), 'day');
  };

  const canGoPrev = () => {
    if (viewMode === 'day') {
      return currentDate.isAfter(dayjs(startDate), 'day') || currentDate.isSame(dayjs(startDate), 'day');
    }
    return true;
  };

  const canGoNext = () => {
    if (viewMode === 'day') {
      return currentDate.isBefore(dayjs(endDate), 'day') || currentDate.isSame(dayjs(endDate), 'day');
    }
    return true;
  };

  return (
    <div className="card calendar-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn-ghost"
            onClick={handlePrev}
            disabled={!canGoPrev()}
            style={{ padding: '6px 10px', fontSize: '18px' }}
          >
            ‹
          </button>
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>
            {viewMode === 'day'
              ? currentDate.format('YYYY年MM月DD日 dddd')
              : `${dayjs(startDate).format('MM/DD')} - ${dayjs(endDate).format('MM/DD')}`
            }
          </h2>
          <button
            className="btn-ghost"
            onClick={handleNext}
            disabled={!canGoNext()}
            style={{ padding: '6px 10px', fontSize: '18px' }}
          >
            ›
          </button>
        </div>
        <div style={{ display: 'flex', background: 'var(--background)', borderRadius: '8px', padding: '4px' }}>
          <button
            onClick={() => setViewMode('day')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              background: viewMode === 'day' ? 'white' : 'transparent',
              color: viewMode === 'day' ? 'var(--primary)' : 'var(--text-secondary)',
              boxShadow: viewMode === 'day' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            日
          </button>
          <button
            onClick={() => setViewMode('week')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              background: viewMode === 'week' ? 'white' : 'transparent',
              color: viewMode === 'week' ? 'var(--primary)' : 'var(--text-secondary)',
              boxShadow: viewMode === 'week' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            周
          </button>
        </div>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        position: 'relative',
        transform: slideDirection === 'left' ? 'translateX(-10px)' : slideDirection === 'right' ? 'translateX(10px)' : 'translateX(0)',
        opacity: isAnimating ? 0.6 : 1,
        transition: 'transform 0.3s ease, opacity 0.3s ease'
      }}>
        <div style={{ display: viewMode === 'week' ? 'grid' : 'block', gridTemplateColumns: `repeat(${visibleDays.length}, 1fr)`, gap: '12px', height: '100%' }}>
          {visibleDays.map((date) => {
            const daySchedules = getSchedulesByDate(date);
            const dayTotal = daySchedules.reduce((sum, s) => sum + s.budget, 0);

            return (
              <div
                key={date}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, date)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '100%',
                  background: isToday(date) ? 'rgba(46, 134, 193, 0.04)' : 'transparent',
                  borderRadius: '8px',
                  padding: '8px',
                  border: isToday(date) ? '1px solid var(--primary)' : '1px solid transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid var(--border)'
                }}>
                  <div>
                    <p style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      fontWeight: 500
                    }}>
                      {dayjs(date).format('ddd')}
                    </p>
                    <p style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: isToday(date) ? 'var(--primary)' : 'var(--text-primary)'
                    }}>
                      {dayjs(date).format('DD')}
                    </p>
                  </div>
                  {dayTotal > 0 && (
                    <p style={{
                      fontSize: '12px',
                      color: 'var(--secondary)',
                      fontWeight: 600
                    }}>
                      ¥{dayTotal}
                    </p>
                  )}
                  {!readOnly && (
                    <button
                      onClick={() => handleAddClick(date)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        background: 'var(--primary)',
                        color: 'white',
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1
                      }}
                    >
                      +
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  {daySchedules.map((schedule, idx) => {
                    const member = getMemberById(schedule.member_id);
                    const isDraggingThis = dragScheduleId === schedule.id;

                    return (
                      <div
                        key={schedule.id}
                        draggable={!readOnly}
                        onDragStart={(e) => handleDragStart(e, schedule.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => handleEditClick(schedule)}
                        style={{
                          background: 'white',
                          borderRadius: '8px',
                          padding: '10px',
                          boxShadow: isDraggingThis ? '0 4px 16px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.08)',
                          cursor: readOnly ? 'default' : 'pointer',
                          transform: isDraggingThis ? 'scale(1.02) rotate(2deg)' : 'scale(1)',
                          transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                          borderLeft: `3px solid ${member?.avatar_color || 'var(--primary)'}`,
                          animation: `fadeIn 0.3s ease ${idx * 0.05}s both`,
                          opacity: isDragging && !isDraggingThis ? 0.5 : 1
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <p style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            lineHeight: 1.3
                          }}>
                            {schedule.activity}
                          </p>
                          {member && (
                            <div
                              title={member.name}
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: member.avatar_color,
                                color: 'white',
                                fontSize: '10px',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                            >
                              {getInitials(member.name)}
                            </div>
                          )}
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          🕐 {schedule.time} · 📍 {schedule.location}
                        </p>
                        {schedule.budget > 0 && (
                          <p style={{
                            fontSize: '12px',
                            color: 'var(--secondary)',
                            fontWeight: 600
                          }}>
                            ¥{schedule.budget}
                            {schedule.expense_type === 'personal' && (
                              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginLeft: '4px' }}>
                                (个人)
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease'
        }} onClick={() => { setShowAddModal(false); setEditingSchedule(null); }}>
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '420px',
              margin: '20px',
              animation: 'fadeIn 0.3s ease'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '20px', marginBottom: '20px' }}>
              {editingSchedule ? '编辑行程' : '添加行程'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>日期</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{ width: '100%' }}
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>时间</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    style={{ width: '100%' }}
                    disabled={readOnly}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>活动名称</label>
                <input
                  type="text"
                  placeholder="例如：参观故宫"
                  value={formData.activity}
                  onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
                  style={{ width: '100%' }}
                  disabled={readOnly}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>地点</label>
                <input
                  type="text"
                  placeholder="例如：北京市东城区"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  style={{ width: '100%' }}
                  disabled={readOnly}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>预算金额</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
                    style={{ width: '100%' }}
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>类型</label>
                  <select
                    value={formData.expenseType}
                    onChange={(e) => setFormData({ ...formData, expenseType: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      outline: 'none',
                      background: 'white'
                    }}
                    disabled={readOnly}
                  >
                    <option value="split">均摊</option>
                    <option value="personal">个人</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              {editingSchedule && !readOnly && (
                <button
                  onClick={handleDelete}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    background: 'var(--danger)',
                    color: 'white',
                    fontWeight: 500
                  }}
                >
                  删除
                </button>
              )}
              <div style={{ flex: 1 }} />
              <button
                className="btn-ghost"
                onClick={() => { setShowAddModal(false); setEditingSchedule(null); }}
              >
                取消
              </button>
              {!readOnly && (
                <button className="btn-primary" onClick={handleSave}>
                  保存
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarView;
