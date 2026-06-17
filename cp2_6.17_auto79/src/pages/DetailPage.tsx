import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';

interface Star {
  name: string;
  constellation: string;
  magnitude: number;
  observationMethod: string;
  photos: string[];
}

interface Activity {
  id: string;
  date: string;
  location: { lat: number; lng: number; name: string };
  weather: string;
  stars: Star[];
  photos: string[];
}

const keyframesStyle = `
@keyframes twinkle {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1.0; }
}
`;

const DetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [starDots, setStarDots] = useState<React.CSSProperties[]>([]);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await fetch(`/api/stars/${id}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        const data: Activity = await res.json();
        setActivity(data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, [id]);

  useEffect(() => {
    if (!showAnimation) return;
    const count = Math.floor(Math.random() * 51) + 150;
    const dots: React.CSSProperties[] = [];
    for (let i = 0; i < count; i++) {
      const size = Math.random() * 2 + 1;
      dots.push({
        position: 'absolute',
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: 'white',
        animation: `twinkle ${(Math.random() * 1.5 + 0.5).toFixed(2)}s ease-in-out ${(Math.random() * 2).toFixed(2)}s infinite`,
      });
    }
    setStarDots(dots);
    const timer = setTimeout(() => setShowAnimation(false), 3000);
    return () => clearTimeout(timer);
  }, [showAnimation]);

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}年${m}月${day}日`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0d1b2a' }}>
        <span style={{ color: '#fff', fontSize: '18px' }}>加载中...</span>
      </div>
    );
  }

  if (notFound || !activity) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0d1b2a' }}>
        <span style={{ color: '#fff', fontSize: '18px' }}>未找到该观测记录</span>
      </div>
    );
  }

  const allPhotos = [...(activity.photos || []), ...activity.stars.flatMap(s => s.photos || [])];

  return (
    <>
      <style>{keyframesStyle}</style>
      <div style={{ minHeight: '100vh', background: '#0d1b2a', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 16px' }}>
        <div style={{
          width: '350px',
          height: 'auto',
          borderRadius: '16px',
          background: 'linear-gradient(#f3e5f5, #e1bee7)',
          padding: '24px',
        }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: '#1565c0',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              marginBottom: '16px',
            }}
          >
            返回首页
          </button>

          <div style={{ color: '#1b2838', marginBottom: '16px' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>
              {formatDate(activity.date)}
            </div>
            <div style={{ fontSize: '14px', marginBottom: '2px' }}>
              {activity.location.name || `${activity.location.lat}, ${activity.location.lng}`}
            </div>
            <div style={{ fontSize: '14px' }}>
              {activity.weather}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ color: '#1b2838', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>照片</div>
            {allPhotos.length > 0 ? (
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
                {allPhotos.map((photo, i) => (
                  <img
                    key={i}
                    src={photo}
                    alt={`photo-${i}`}
                    style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }}
                  />
                ))}
              </div>
            ) : (
              <div style={{ color: '#1b2838', fontSize: '13px' }}>暂无照片</div>
            )}
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', color: '#1b2838' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ce93d8' }}>
                <th style={{ textAlign: 'left', fontWeight: 'bold', padding: '6px 4px' }}>名称</th>
                <th style={{ textAlign: 'left', fontWeight: 'bold', padding: '6px 4px' }}>星座</th>
                <th style={{ textAlign: 'left', fontWeight: 'bold', padding: '6px 4px' }}>星等</th>
                <th style={{ textAlign: 'left', fontWeight: 'bold', padding: '6px 4px' }}>观测方式</th>
                <th style={{ textAlign: 'left', fontWeight: 'bold', padding: '6px 4px' }}></th>
              </tr>
            </thead>
            <tbody>
              {activity.stars.map((star, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e1bee7' }}>
                  <td style={{ padding: '6px 4px' }}>{star.name}</td>
                  <td style={{ padding: '6px 4px' }}>{star.constellation}</td>
                  <td style={{ padding: '6px 4px' }}>{star.magnitude}</td>
                  <td style={{ padding: '6px 4px' }}>{star.observationMethod}</td>
                  <td style={{ padding: '6px 4px' }}>
                    <Eye
                      size={18}
                      color="#7c4dff"
                      style={{ cursor: 'pointer', transition: 'transform 0.3s ease, color 0.3s ease' }}
                      onMouseEnter={e => {
                        (e.currentTarget as SVGElement).style.transform = 'rotate(15deg)';
                        (e.currentTarget as SVGElement).style.color = '#7c4dff';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as SVGElement).style.transform = 'rotate(0deg)';
                        (e.currentTarget as SVGElement).style.color = '#7c4dff';
                      }}
                      onClick={() => setShowAnimation(true)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAnimation && (
        <div
          onClick={() => setShowAnimation(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 1000,
            background: '#0a0e2a',
          }}
        >
          {starDots.map((style, i) => (
            <div key={i} style={style} />
          ))}
        </div>
      )}
    </>
  );
};

export default DetailPage;
