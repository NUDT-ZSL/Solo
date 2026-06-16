import React, { useState, useMemo, useEffect } from 'react';
import type { Attendee, SelectedTime, TimezoneTableRow, User } from '@/types';
import { TIMEZONE_OPTIONS, getTimezoneAbbr, minuteToTimeString, parseTimezoneOffset } from '@/utils/timezone';
import dayjs from 'dayjs';
import CalendarExport from './CalendarExport';
import type { Event } from '@/types';

interface EventFormProps {
  selectedTime: SelectedTime | null;
  users: User[];
  onCreated: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const DURATION_OPTIONS = [
  { value: 15, label: '15分钟' },
  { value: 30, label: '30分钟' },
  { value: 60, label: '1小时' },
  { value: 120, label: '2小时' }
];

const DAYS = ['周一', '周二', '周三', '周四', '周五'];

const EventForm: React.FC<EventFormProps> = ({ selectedTime, users, onCreated, showToast }) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState(30);
  const [attendeeEmails, setAttendeeEmails] = useState('');
  const [createdEvent, setCreatedEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (selectedTime) {
      setStartTime(minuteToTimeString(selectedTime.startMinute));
      const today = dayjs();
      const targetDate = today.add((selectedTime.day - today.day() + 1 + 7) % 7, 'day');
      setDate(targetDate.format('YYYY-MM-DD'));
    }
  }, [selectedTime]);

  const attendees = useMemo<Attendee[]>(() => {
    if (!attendeeEmails.trim()) return [];
    return attendeeEmails
      .split(/[,，\s]+/)
      .filter(e => e.trim())
      .map(email => {
        const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        return {
          name: user?.name || email.split('@')[0],
          email: email.trim(),
          timezone: user?.timezone || 'UTC+8'
        };
      });
  }, [attendeeEmails, users]);

  const timezoneTable = useMemo<TimezoneTableRow[]>(() => {
    if (attendees.length === 0 || !startTime) return [];
    const rows: TimezoneTableRow[] = [];
    const [startH, startM] = startTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const totalSteps = Math.ceil(duration / 30);

    for (let i = 0; i <= totalSteps; i++) {
      const currentMinutes = startMinutes + i * 30;
      const normalized = ((currentMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
      const utcTime = minuteToTimeString(normalized);
      const localTimes: Record<string, string> = {};

      for (const attendee of attendees) {
        const tzOffset = parseTimezoneOffset(attendee.timezone);
        const adjusted = normalized + tzOffset * 60;
        const adjNormalized = ((adjusted % (24 * 60)) + 24 * 60) % (24 * 60);
        localTimes[attendee.timezone] = minuteToTimeString(adjNormalized);
      }
      rows.push({ utcTime, localTimes });
    }
    return rows;
  }, [startTime, duration, attendees]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || attendees.length === 0) {
      showToast('请填写标题和至少一个参会者邮箱', 'error');
      return;
    }

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date, startTime, duration, attendees })
      });
      const data = await res.json();
      if (data.success) {
        setCreatedEvent(data.event);
        showToast('事件创建成功！', 'success');
        setTitle('');
        setAttendeeEmails('');
        onCreated();
      } else {
        showToast(data.error || '创建失败', 'error');
      }
    } catch (err) {
      showToast('创建事件失败', 'error');
    }
  };

  return (
    <div className="event-form-wrapper" style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 20px 0', color: '#1f2937' }}>
        创建会议事件
      </h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
            会议标题
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="输入会议标题"
            style={{
              width: '100%',
              height: '40px',
              padding: '0 12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box'
            }}
            onFocus={e => ((e.target as HTMLElement).style.borderColor = '#3b82f6')}
            onBlur={e => ((e.target as HTMLElement).style.borderColor = '#d1d5db')}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 140px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              日期
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{
                width: '100%',
                height: '40px',
                padding: '0 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              开始时间
            </label>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              step="1800"
              style={{
                width: '100%',
                height: '40px',
                padding: '0 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              持续时长
            </label>
            <select
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              style={{
                width: '100%',
                height: '40px',
                padding: '0 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                background: '#fff'
              }}
            >
              {DURATION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedTime && (
          <div style={{ padding: '8px 12px', background: '#dbeafe', borderRadius: '8px', fontSize: '13px', color: '#1e40af' }}>
            已选择：{DAYS[selectedTime.day]} {minuteToTimeString(selectedTime.startMinute)}
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
            参会者邮箱（多个用逗号分隔）
          </label>
          <textarea
            value={attendeeEmails}
            onChange={e => setAttendeeEmails(e.target.value)}
            placeholder="example1@mail.com, example2@mail.com"
            rows={2}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              fontFamily: 'inherit',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
          {attendees.length > 0 && (
            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {attendees.map((a, i) => (
                <span key={i} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  background: '#f3f4f6',
                  borderRadius: '999px',
                  fontSize: '12px',
                  color: '#374151'
                }}>
                  {a.name}
                  <span style={{ color: '#9ca3af' }}>({getTimezoneAbbr(a.timezone)})</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {attendees.length > 0 && timezoneTable.length > 0 && (
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
              时区对比表预览
            </label>
            <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: attendees.length * 100 + 80 }}>
                <thead style={{ position: 'sticky', top: 0, background: '#fff' }}>
                  <tr>
                    <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', color: '#374151', fontWeight: 600, background: '#f9fafb' }}>
                      UTC
                    </th>
                    {attendees.map((a, i) => (
                      <th key={i} style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', color: '#374151', fontWeight: 600, background: '#f9fafb' }}>
                        {a.name}<br />
                        <span style={{ fontWeight: 400, color: '#6b7280' }}>{getTimezoneAbbr(a.timezone)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timezoneTable.map((row, ri) => (
                    <tr key={ri} style={{ background: ri % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6', color: '#374151', fontWeight: 500 }}>
                        {row.utcTime}
                      </td>
                      {attendees.map((a, ai) => (
                        <td key={ai} style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>
                          {row.localTimes[a.timezone]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <button
          type="submit"
          style={{
            height: '44px',
            borderRadius: '8px',
            background: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s ease-out'
          }}
          onMouseEnter={e => ((e.target as HTMLElement).style.background = '#2563eb')}
          onMouseLeave={e => ((e.target as HTMLElement).style.background = '#3b82f6')}
        >
          创建事件
        </button>
      </form>

      {createdEvent && (
        <div style={{ marginTop: '20px', padding: '16px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#166534', marginBottom: '12px' }}>
            ✓ 事件已创建：{createdEvent.title}
          </div>
          <CalendarExport event={createdEvent} />
        </div>
      )}
    </div>
  );
};

export default EventForm;
