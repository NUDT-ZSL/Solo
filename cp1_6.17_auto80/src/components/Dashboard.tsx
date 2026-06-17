import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getCountdown, formatDate } from '../utils/dateHelpers';

interface EventItem {
  id: string;
  name: string;
  city: string;
  venue: string;
  date: string;
  time: string;
  type: 'rehearsal' | 'performance';
  participants: string[];
}

interface Device {
  id: string;
  name: string;
  owner: string;
  status: 'available' | 'borrowed' | 'maintenance';
}

interface BorrowRequest {
  id: string;
  deviceId: string;
  borrower: string;
  startDate: string;
  endDate: string;
  approved: boolean;
  returned: boolean;
}

const Dashboard: React.FC = () => {
  const [currentUser] = useState('小明');
  const [myEvents, setMyEvents] = useState<EventItem[]>([]);
  const [myBorrows, setMyBorrows] = useState<(BorrowRequest & { deviceName?: string })[]>([]);
  const [now, setNow] = useState(new Date());

  const fetchData = useCallback(async () => {
    const [eventsRes, borrowsRes, devicesRes] = await Promise.all([
      axios.get('/api/events'),
      axios.get(`/api/borrows/borrower/${currentUser}`),
      axios.get('/api/devices?page=1&limit=100'),
    ]);

    const allDevices: Device[] = devicesRes.data.data;
    const filtered = eventsRes.data.filter((e: EventItem) => e.participants.includes(currentUser));
    filtered.sort((a: EventItem, b: EventItem) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setMyEvents(filtered);

    const borrowsWithNames = borrowsRes.data.map((b: BorrowRequest) => {
      const dev = allDevices.find((d: Device) => d.id === b.deviceId);
      return { ...b, deviceName: dev?.name || '未知设备' };
    });
    setMyBorrows(borrowsWithNames);
  }, [currentUser]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeBorrows = myBorrows.filter(b => b.approved && !b.returned);

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>欢迎回来，{currentUser}</h2>
        <p style={{ fontSize: 14, color: '#888' }}>以下是你参与的演出和设备借用情况</p>
      </div>

      <div style={{ marginBottom: 40 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          🎵 我的演出
          <span style={{ fontSize: 13, color: '#7C4DFF', fontWeight: 400 }}>{myEvents.length} 场</span>
        </h3>
        {myEvents.length === 0 && <div style={{ color: '#666', fontSize: 14 }}>暂无参与的演出</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {myEvents.map((ev, i) => (
            <div key={ev.id} className="event-card" style={{
              padding: 20, borderRadius: 8, background: '#252525',
              borderLeft: `4px solid ${ev.type === 'rehearsal' ? '#42A5F5' : '#66BB6A'}`,
              animationDelay: `${i * 0.05}s`,
              cursor: 'default',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{
                  padding: '2px 10px', borderRadius: 12, fontSize: 12,
                  background: ev.type === 'rehearsal' ? 'rgba(66,165,245,0.15)' : 'rgba(102,187,106,0.15)',
                  color: ev.type === 'rehearsal' ? '#42A5F5' : '#66BB6A',
                }}>
                  {ev.type === 'rehearsal' ? '排练' : '正式演出'}
                </span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{ev.name}</div>
              <div style={{ fontSize: 13, color: '#AAA', lineHeight: 1.8 }}>
                <div>📍 {ev.city} · {ev.venue}</div>
                <div>📅 {formatDate(ev.date)} {ev.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          🎸 我的借用设备
          {activeBorrows.length > 0 && (
            <span style={{
              background: '#F44336', color: '#FFF', borderRadius: '50%',
              width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
            }}>{activeBorrows.length}</span>
          )}
        </h3>
        {activeBorrows.length === 0 && <div style={{ color: '#666', fontSize: 14 }}>暂无借用中的设备</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {activeBorrows.map((b, i) => {
            const countdown = getCountdown(b.endDate, '23:59:59', now);
            const isExpired = countdown === '已到期';
            return (
              <div key={b.id} className="borrow-card" style={{
                padding: 20, borderRadius: 8, background: '#252525',
                animationDelay: `${i * 0.05}s`,
              }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{b.deviceName}</div>
                <div style={{ fontSize: 13, color: '#AAA', marginBottom: 8 }}>
                  借用期: {formatDate(b.startDate)} ~ {formatDate(b.endDate)}
                </div>
                <div style={{
                  padding: '8px 12px', borderRadius: 8,
                  background: isExpired ? 'rgba(244,67,54,0.1)' : 'rgba(124,77,255,0.1)',
                  border: `1px solid ${isExpired ? 'rgba(244,67,54,0.3)' : 'rgba(124,77,255,0.3)'}`,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 12, color: '#999' }}>倒计时</span>
                  <span style={{
                    fontSize: 16, fontWeight: 700,
                    color: isExpired ? '#F44336' : '#7C4DFF',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {countdown}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const DashboardWithStyles: React.FC = () => (
  <>
    <Dashboard />
    <style>{`
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
      .event-card {
        animation: fadeInUp 0.4s ease-out backwards;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .event-card:hover {
        transform: translateY(-3px) !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
      }
      .borrow-card {
        animation: fadeInUp 0.4s ease-out backwards;
      }
      .countdown-text {
        font-variant-numeric: tabular-nums;
      }
    `}</style>
  </>
);

export default DashboardWithStyles;
