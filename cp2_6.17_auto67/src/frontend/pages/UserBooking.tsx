import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

interface EventItem {
  id: string;
  name: string;
  dateTime: string;
  location: string;
  totalStalls: number;
  pricePerStall: number;
  bookedStalls: number;
}

const UserBooking = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/events');
        const data = await res.json();
        setEvents(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <h1 className="page-title">🎪 跳蚤市场活动</h1>

      {loading ? (
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <div className="empty-text">加载中...</div>
        </div>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <div className="empty-text">暂无活动，敬请期待</div>
        </div>
      ) : (
        <div className="events-grid">
          {events.map((event) => {
            const percent = Math.round((event.bookedStalls / event.totalStalls) * 100);
            const remaining = event.totalStalls - event.bookedStalls;
            return (
              <div
                key={event.id}
                className="event-card"
                onClick={() => navigate(`/events/${event.id}`)}
              >
                <div className="event-card-header">
                  <div className="event-card-name">{event.name}</div>
                  <div className="event-card-date">
                    📅 {dayjs(event.dateTime).format('YYYY-MM-DD HH:mm')}
                  </div>
                  <div className="event-card-location">📍 {event.location}</div>
                </div>
                <div className="event-card-footer">
                  <div className="progress-row">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${percent}%` }}></div>
                    </div>
                    <span className="price-text">¥{event.pricePerStall}/个</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="remaining-text">剩余 {remaining} 个</span>
                    <span className="progress-text">已预订 {event.bookedStalls}/{event.totalStalls}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UserBooking;
