import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getCountdown, formatDate } from '../utils/dateHelpers';

interface Member {
  id: string;
  name: string;
  role: string;
  city: string;
  isAdmin: boolean;
}

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

interface BorrowRequest {
  id: string;
  deviceId: string;
  deviceName: string;
  borrowerId: string;
  borrowerName: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'returned';
  createdAt: string;
}

interface Notification {
  id: string;
  userId: string;
  type: 'borrow_due' | 'request_approved' | 'request_rejected';
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface DashboardData {
  events: Event[];
  borrows: BorrowRequest[];
  notifications: Notification[];
}

interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  totalSeconds: number;
}

interface Props {
  currentUser: Member | null;
  onRefresh: () => void;
}

const MONTH_NAMES = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
];

const Dashboard = ({ currentUser, onRefresh }: Props) => {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    events: [],
    borrows: [],
    notifications: [],
  });
  const [countdowns, setCountdowns] = useState<Record<string, CountdownState>>({});
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventDetail, setShowEventDetail] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await axios.get(`/api/dashboard/${currentUser.id}`);
      setDashboardData(res.data);
      initCountdowns(res.data.borrows);
    } catch (err) {
      console.error('获取仪表盘数据失败:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const initCountdowns = (borrows: BorrowRequest[]) => {
    const initial: Record<string, CountdownState> = {};
    borrows.forEach((b) => {
      initial[b.id] = getCountdown(b.endDate);
    });
    setCountdowns(initial);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdowns((prev) => {
        const updated: Record<string, CountdownState> = {};
        dashboardData.borrows.forEach((b) => {
          updated[b.id] = getCountdown(b.endDate);
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [dashboardData.borrows]);

  const getUpcomingEvents = () => {
    const now = new Date();
    return dashboardData.events
      .filter((e) => new Date(e.date) >= now || new Date(e.date).toDateString() === now.toDateString())
      .slice(0, 6);
  };

  const getPastEvents = () => {
    const now = new Date();
    return dashboardData.events.filter(
      (e) => new Date(e.date) < now && new Date(e.date).toDateString() !== now.toDateString()
    ).length;
  };

  const getDueSoonCount = () => {
    return dashboardData.borrows.filter((b) => {
      const cd = countdowns[b.id];
      return cd && !cd.isExpired && cd.totalSeconds < 24 * 3600;
    }).length;
  };

  const handleReturnBorrow = async (id: string) => {
    try {
      await axios.put(`/api/borrow-requests/${id}/return`);
      alert('设备已归还');
      fetchDashboardData();
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || '操作失败');
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await axios.put(`/api/notifications/${id}/read`);
      onRefresh();
      fetchDashboardData();
    } catch (err) {
      console.error('标记已读失败:', err);
    }
  };

  const getCountdownClass = (cd: CountdownState) => {
    if (cd.isExpired || cd.totalSeconds < 24 * 3600) return 'danger';
    if (cd.totalSeconds < 3 * 24 * 3600) return 'warning';
    return 'normal';
  };

  const formatEventDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return {
      month: MONTH_NAMES[d.getMonth()],
      day: d.getDate(),
    };
  };

  const upcomingEvents = getUpcomingEvents();
  const stats = {
    totalEvents: dashboardData.events.length,
    upcomingEvents: upcomingEvents.length,
    activeBorrows: dashboardData.borrows.length,
    dueSoon: getDueSoonCount(),
  };

  const renderEventDetailModal = () => {
    if (!showEventDetail || !selectedEvent) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowEventDetail(false)}>
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
            <button className="modal-close" onClick={() => setShowEventDetail(false)}>
              ✕
            </button>
          </div>
          <div className="modal-header" style={{ paddingTop: 12 }}>
            <div>
              <h2 className="modal-title">{selectedEvent.name}</h2>
              <p className="modal-subtitle">
                {formatDate(new Date(selectedEvent.date))} {selectedEvent.time}
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
            </div>

            <div className="modal-section">
              <h3 className="modal-section-title">参与成员 ({selectedEvent.participantIds.length})</h3>
              <p style={{ fontSize: 14, color: '#666' }}>
                你是其中之一，加油准备！
              </p>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setShowEventDetail(false)}>
              关闭
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            欢迎回来，{currentUser?.name || '用户'} 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: 15 }}>
            这是你的今日概览
          </p>
        </div>
      </div>

      {dashboardData.notifications.filter((n) => !n.isRead).length > 0 && (
        <div
          className="card"
          style={{
            marginBottom: 28,
            borderLeft: '4px solid #F44336',
            background: '#FFEBEE',
            color: '#B71C1C',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3
                style={{
                  marginBottom: 12,
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#B71C1C',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span className="nav-badge" style={{ background: '#F44336', color: 'white' }}>
                  {dashboardData.notifications.filter((n) => !n.isRead).length}
                </span>
                待处理通知
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {dashboardData.notifications
                  .filter((n) => !n.isRead)
                  .map((n) => (
                    <div
                      key={n.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        background: 'rgba(255,255,255,0.7)',
                        borderRadius: 8,
                        fontSize: 14,
                      }}
                    >
                      <span>⚠️ {n.message}</span>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{
                          borderColor: '#F44336',
                          color: '#F44336',
                          fontSize: 12,
                          padding: '4px 10px',
                        }}
                        onClick={() => handleMarkNotificationRead(n.id)}
                      >
                        已读
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{stats.totalEvents}</div>
          <div className="stat-label">参与演出总数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.upcomingEvents}</div>
          <div className="stat-label">即将到来</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.activeBorrows}</div>
          <div className="stat-label">借用中设备</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: stats.dueSoon > 0 ? '#F44336' : undefined }}>
            {stats.dueSoon}
          </div>
          <div className="stat-label">24小时内到期</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="events-column">
          <div className="section-header">
            <h2 className="section-title">我的演出排期</h2>
          </div>

          {upcomingEvents.length > 0 ? (
            <div className="dashboard-events-list">
              {upcomingEvents.map((event, idx) => {
                const dateInfo = formatEventDate(event.date);
                return (
                  <div
                    key={event.id}
                    className={`dashboard-event-card ${event.type}`}
                    style={{ animationDelay: `${idx * 0.05}s` }}
                    onClick={() => {
                      setSelectedEvent(event);
                      setShowEventDetail(true);
                    }}
                  >
                    <div className="event-date-badge">
                      <div className="event-date-month">{dateInfo.month}</div>
                      <div className="event-date-day">{dateInfo.day}</div>
                    </div>
                    <div className="event-main-info">
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 6,
                        }}
                      >
                        <h3 className="event-title">{event.name}</h3>
                        <span
                          className={`pill ${event.type}`}
                          style={{ fontSize: 11, padding: '3px 10px' }}
                        >
                          {event.type === 'rehearsal' ? '🎶 排练' : '🎤 演出'}
                        </span>
                      </div>
                      <div className="event-meta">
                        <span className="event-meta-item">📍 {event.city}</span>
                        <span className="event-meta-item">🏟️ {event.venue}</span>
                        <span className="event-meta-item">🕐 {event.time}</span>
                        <span className="event-meta-item">
                          👥 {event.participantIds.length}人
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
              <div className="empty-state">
                <div className="empty-state-icon">📅</div>
                <div className="empty-state-text">暂无即将到来的演出安排</div>
              </div>
            </div>
          )}

          {getPastEvents() > 0 && (
            <div style={{ marginTop: 12, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
              还有 {getPastEvents()} 场历史演出 ·
              <span
                style={{ color: 'var(--accent)', cursor: 'pointer', marginLeft: 4 }}
                onClick={() => (window.location.hash = '#/calendar')}
              >
                查看全部
              </span>
            </div>
          )}
        </div>

        <div className="borrows-column">
          <div className="section-header">
            <h2 className="section-title">我的设备借用</h2>
          </div>

          <div className="borrows-card">
            {dashboardData.borrows.length > 0 ? (
              <div className="borrows-list">
                {dashboardData.borrows.map((borrow) => {
                  const cd = countdowns[borrow.id] || {
                    days: 0,
                    hours: 0,
                    minutes: 0,
                    seconds: 0,
                    isExpired: false,
                    totalSeconds: 0,
                  };
                  const cdClass = getCountdownClass(cd);

                  return (
                    <div key={borrow.id} className={`borrow-item ${cdClass}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <h4 className="borrow-device-name">🎸 {borrow.deviceName}</h4>
                        {cd.isExpired ? (
                          <span className="pill rejected" style={{ fontSize: 11, padding: '3px 10px' }}>
                            已过期
                          </span>
                        ) : cd.totalSeconds < 24 * 3600 ? (
                          <span className="pill borrowed" style={{ fontSize: 11, padding: '3px 10px' }}>
                            即将到期
                          </span>
                        ) : null}
                      </div>

                      <div className="borrow-countdown">
                        <div style={{ textAlign: 'center' }}>
                          <span className="countdown-unit">
                            {String(cd.days).padStart(2, '0')}
                          </span>
                          <span className="countdown-label">天</span>
                        </div>
                        <span style={{ fontWeight: 700, opacity: 0.5 }}>:</span>
                        <div style={{ textAlign: 'center' }}>
                          <span className="countdown-unit">
                            {String(cd.hours).padStart(2, '0')}
                          </span>
                          <span className="countdown-label">时</span>
                        </div>
                        <span style={{ fontWeight: 700, opacity: 0.5 }}>:</span>
                        <div style={{ textAlign: 'center' }}>
                          <span className="countdown-unit">
                            {String(cd.minutes).padStart(2, '0')}
                          </span>
                          <span className="countdown-label">分</span>
                        </div>
                        <span style={{ fontWeight: 700, opacity: 0.5 }}>:</span>
                        <div style={{ textAlign: 'center' }}>
                          <span className="countdown-unit">
                            {String(cd.seconds).padStart(2, '0')}
                          </span>
                          <span className="countdown-label">秒</span>
                        </div>
                      </div>

                      <div className="borrow-dates">
                        📆 {borrow.startDate} ~ {borrow.endDate}
                      </div>

                      <div style={{ marginTop: 12 }}>
                        <button
                          className="btn btn-success btn-sm"
                          style={{ width: '100%' }}
                          onClick={() => handleReturnBorrow(borrow.id)}
                        >
                          ✓ 确认归还
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📦</div>
                <div className="empty-state-text">当前没有借用设备</div>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ marginTop: 16 }}
                  onClick={() => (window.location.hash = '#/devices')}
                >
                  去借设备
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {renderEventDetailModal()}
    </div>
  );
};

export default Dashboard;
