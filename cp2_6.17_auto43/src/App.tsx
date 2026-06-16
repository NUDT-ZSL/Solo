import React, { useState, useEffect, useCallback } from 'react';
import TimeGrid from '@/modules/scheduler/TimeGrid';
import TimeRecommender from '@/modules/scheduler/TimeRecommender';
import EventForm from '@/modules/events/EventForm';
import CalendarExport from '@/modules/events/CalendarExport';
import { useToast } from '@/hooks/useToast';
import type { User, SelectedTime, Event, TimeSlot } from '@/types';
import { TIMEZONE_OPTIONS, DAYS, minuteToTimeString, getTimezoneAbbr } from '@/utils/timezone';
import dayjs from 'dayjs';

const PAGE_SIZE = 10;

const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { toasts, showToast } = useToast();

  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userTimezone, setUserTimezone] = useState('UTC+8');
  const [userAvailability, setUserAvailability] = useState<SelectedTime[]>([]);

  const [selectedEventTime, setSelectedEventTime] = useState<SelectedTime | null>(null);
  const [recommendKey, setRecommendKey] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, eventsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/events')
      ]);
      const usersData = await usersRes.json();
      const eventsData = await eventsRes.json();
      setUsers(usersData.users || []);
      setEvents(eventsData.events || []);
      setRecommendKey(k => k + 1);
    } catch (e) {
      console.error('获取数据失败', e);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelectAvailability = (time: SelectedTime) => {
    setUserAvailability(prev => {
      const exists = prev.findIndex(t => t.day === time.day && t.startMinute === time.startMinute);
      if (exists >= 0) {
        return prev.filter((_, i) => i !== exists);
      }
      return [...prev, time];
    });
  };

  const handleSaveUser = async () => {
    if (!userName.trim()) {
      showToast('请输入姓名', 'error');
      return;
    }
    if (userAvailability.length === 0) {
      showToast('请选择至少一个可用时间段', 'error');
      return;
    }

    const mergedSlots: TimeSlot[] = [];
    const sorted = [...userAvailability].sort((a, b) => a.day * 1440 + a.startMinute - (b.day * 1440 + b.startMinute));
    for (const t of sorted) {
      const last = mergedSlots[mergedSlots.length - 1];
      if (last && last.day === t.day && last.endMinute === t.startMinute) {
        last.endMinute = t.startMinute + 30;
      } else {
        mergedSlots.push({ day: t.day, startMinute: t.startMinute, endMinute: t.startMinute + 30 });
      }
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userName.trim(),
          email: userEmail.trim() || undefined,
          timezone: userTimezone,
          availability: mergedSlots
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('用户配置已保存', 'success');
        setUserName('');
        setUserEmail('');
        setUserAvailability([]);
        fetchData();
        setSidebarOpen(false);
      } else {
        showToast(data.error || '保存失败', 'error');
      }
    } catch (e) {
      showToast('保存失败', 'error');
    }
  };

  const handleSelectRecommendedTime = (time: SelectedTime) => {
    setSelectedEventTime(time);
    const element = document.getElementById('event-form-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
  const paginatedEvents = events.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="app-root" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{
        height: '60px',
        background: '#1e293b',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        gap: '16px'
      }}>
        <button
          className="hamburger-btn"
          onClick={() => setSidebarOpen(o => !o)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '4px 8px'
          }}
        >
          ☰
        </button>
        <div style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em' }}>
          ⏰ TimeSync - 跨时区会议协调
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={fetchData}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            background: 'transparent',
            color: '#ffffff',
            border: '1px solid #475569',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'background 0.2s ease-out'
          }}
          onMouseEnter={e => ((e.target as HTMLElement).style.background = '#334155')}
          onMouseLeave={e => ((e.target as HTMLElement).style.background = 'transparent')}
        >
          ↻ 刷新数据
        </button>
      </nav>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <aside
          className={`sidebar ${sidebarOpen ? 'open' : ''}`}
          style={{
            width: '320px',
            background: '#ffffff',
            borderRight: '1px solid #e5e7eb',
            padding: '20px',
            overflowY: 'auto',
            flexShrink: 0
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#1f2937' }}>
              用户配置
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  姓名
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder="请输入您的姓名"
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  邮箱（可选）
                </label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={e => setUserEmail(e.target.value)}
                  placeholder="name@example.com"
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  时区
                </label>
                <select
                  value={userTimezone}
                  onChange={e => setUserTimezone(e.target.value)}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    background: '#fff',
                    boxSizing: 'border-box'
                  }}
                >
                  {TIMEZONE_OPTIONS.map(tz => (
                    <option key={tz} value={tz}>{tz} ({getTimezoneAbbr(tz)})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                可用时间段（点击选择）
              </label>
              {userAvailability.length > 0 && (
                <button
                  onClick={() => setUserAvailability([])}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6b7280',
                    fontSize: '12px',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  清空
                </button>
              )}
            </div>
            <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px' }}>
              <TimeGrid
                users={[]}
                selectedTimes={userAvailability}
                onSelectTime={handleSelectAvailability}
                mode="selector"
              />
            </div>
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
              已选 {userAvailability.length} 个时段
            </div>
          </div>

          <button
            onClick={handleSaveUser}
            style={{
              width: '100%',
              height: '42px',
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
            保存配置
          </button>

          {users.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#374151' }}>
                已注册成员 ({users.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {users.map(user => (
                  <div key={user.id} style={{
                    padding: '10px 12px',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    fontSize: '13px'
                  }}>
                    <div style={{ fontWeight: 500, color: '#1f2937' }}>{user.name}</div>
                    <div style={{ color: '#6b7280', fontSize: '12px' }}>
                      {getTimezoneAbbr(user.timezone)} · {user.availability.length} 个时段
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        <main style={{
          flex: 1,
          padding: '24px',
          overflowY: 'auto',
          minWidth: 0
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1200px', margin: '0 auto' }}>
            <section>
              <TimeRecommender key={recommendKey} onSelect={handleSelectRecommendedTime} />
            </section>

            <section style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', color: '#1f2937' }}>
                团队时间重叠热力图
              </h3>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
                颜色越深表示同时空闲的人数越多。悬停可查看具体人数。
              </p>
              <div style={{ overflowX: 'auto' }}>
                <TimeGrid
                  users={users}
                  selectedTimes={selectedEventTime ? [selectedEventTime] : []}
                  onSelectTime={handleSelectRecommendedTime}
                  mode="heatmap"
                />
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '12px', color: '#6b7280', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '16px', height: '16px', background: '#e5e7eb', borderRadius: '3px' }}></div> 0人
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '16px', height: '16px', background: '#bbf7d0', borderRadius: '3px' }}></div> 1-2人
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '16px', height: '16px', background: '#86efac', borderRadius: '3px' }}></div> 3-4人
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '16px', height: '16px', background: '#22c55e', borderRadius: '3px' }}></div> 5人+
                </div>
              </div>
            </section>

            <section id="event-form-section">
              <EventForm
                selectedTime={selectedEventTime}
                users={users}
                onCreated={fetchData}
                showToast={showToast}
              />
            </section>

            <section>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', color: '#1f2937' }}>
                事件列表 ({events.length})
              </h3>
              {events.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: '12px' }}>
                  暂无创建的事件
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {paginatedEvents.map(event => (
                      <div
                        key={event.id}
                        style={{
                          width: '100%',
                          minHeight: '100px',
                          borderRadius: '8px',
                          background: '#f3f4f6',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          transition: 'box-shadow 0.2s ease-out'
                        }}
                        onClick={() => setExpandedEventId(id => id === event.id ? null : event.id)}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.boxShadow = 'none')}
                      >
                        <div style={{ display: 'flex', padding: '16px 20px', alignItems: 'center', gap: '20px' }}>
                          <div style={{ flexShrink: 0 }}>
                            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>{dayjs(event.date).format('YYYY年MM月DD日')}</div>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: '#1f2937' }}>{event.startTime}</div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>时长 {event.duration}分钟</div>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', marginBottom: '4px' }}>{event.title}</div>
                            <div style={{ fontSize: '13px', color: '#6b7280' }}>
                              {event.attendees.length} 位参会者 · {event.attendees.map(a => a.name).join(', ')}
                            </div>
                          </div>
                          <div style={{ fontSize: '20px', color: '#9ca3af', transform: expandedEventId === event.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                            ▾
                          </div>
                        </div>
                        {expandedEventId === event.id && (
                          <div style={{ padding: '0 20px 20px 20px', borderTop: '1px solid #e5e7eb', background: '#fff', cursor: 'default' }} onClick={e => e.stopPropagation()}>
                            {event.timezoneTable.length > 0 && (
                              <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>时区对比表</div>
                                <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: event.attendees.length * 100 + 80 }}>
                                    <thead>
                                      <tr>
                                        <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', color: '#374151', fontWeight: 600, background: '#f9fafb' }}>UTC</th>
                                        {event.attendees.map((a, i) => (
                                          <th key={i} style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', color: '#374151', fontWeight: 600, background: '#f9fafb' }}>
                                            {a.name} ({getTimezoneAbbr(a.timezone)})
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {event.timezoneTable.map((row, ri) => (
                                        <tr key={ri} style={{ background: ri % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6', color: '#374151', fontWeight: 500 }}>{row.utcTime}</td>
                                          {event.attendees.map((a, ai) => (
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
                            <CalendarExport event={event} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            border: '1px solid',
                            borderColor: currentPage === page ? '#3b82f6' : '#d1d5db',
                            background: currentPage === page ? '#3b82f6' : '#ffffff',
                            color: currentPage === page ? '#fff' : '#374151',
                            fontSize: '14px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        </main>
      </div>

      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast-item toast-${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
