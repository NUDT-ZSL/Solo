import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

interface MyStall {
  id: string;
  eventId: string;
  number: string;
  price: number;
  status: string;
  event: {
    id: string;
    name: string;
    dateTime: string;
    location: string;
  };
}

const MyStallsPage = () => {
  const navigate = useNavigate();
  const [stalls, setStalls] = useState<MyStall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    const user = JSON.parse(userStr);

    const load = async () => {
      try {
        const res = await fetch(`/api/users/${user.id}/stalls`);
        const data = await res.json();
        setStalls(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="empty-state">
        <div className="empty-icon">⏳</div>
        <div className="empty-text">加载中...</div>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <h1 className="page-title">🏷️ 我的摊位</h1>

      {stalls.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🛒</div>
          <div className="empty-text">暂无预订摊位</div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/')}>
            去预订摊位
          </button>
        </div>
      ) : (
        stalls.map((stall) => (
          <div
            key={stall.id}
            className="my-stall-card"
            onClick={() => navigate(`/events/${stall.eventId}`)}
            style={{ cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1565c0', marginBottom: 8 }}>
                  {stall.event?.name || '未知活动'}
                </div>
                <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
                  📅 {dayjs(stall.event?.dateTime).format('YYYY-MM-DD HH:mm')}
                </div>
                <div style={{ fontSize: 14, color: '#666' }}>📍 {stall.event?.location}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: '#42a5f5',
                    marginBottom: 4,
                  }}
                >
                  {stall.number}
                </div>
                <div style={{ fontSize: 14, color: '#ef5350', fontWeight: 600 }}>¥{stall.price}</div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default MyStallsPage;
