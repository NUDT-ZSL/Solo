import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

interface StarItem {
  id: string;
  name: string;
  constellation: string;
  magnitude: number;
  observationMethod: string;
}

interface StarRecord {
  id: string;
  date: string;
  location: { name: string; latitude: number; longitude: number };
  weather: string;
  photos: string[];
  stars: StarItem[];
}

const WEATHER_COLORS: Record<string, string> = {
  '晴朗': '#e3f2fd',
  '多云': '#cfd8dc',
  '有云': '#b0bec5',
  '有月光': '#fff3e0',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日`;
}

const StarrySkyModal: React.FC<{ onClose: () => void; starName: string }> = ({ onClose, starName }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let rafId: number;
    let startTime = Date.now();

    const stars: { x: number; y: number; r: number; alpha: number; speed: number; phase: number }[] = [];
    for (let i = 0; i < 150; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.8 + 0.4,
        alpha: Math.random() * 0.6 + 0.3,
        speed: 0.02 + Math.random() * 0.04,
        phase: Math.random() * Math.PI * 2,
      });
    }

    function draw() {
      const elapsed = (Date.now() - startTime) / 1000;
      const grad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.7
      );
      grad.addColorStop(0, '#0a1628');
      grad.addColorStop(1, '#020812');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      stars.forEach((s) => {
        const twinkle = 0.5 + 0.5 * Math.sin(elapsed * s.speed * 10 + s.phase);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha * twinkle})`;
        ctx.fill();
        if (twinkle > 0.8) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha * twinkle * 0.15})`;
          ctx.fill();
        }
      });

      if (elapsed >= 3) {
        setVisible(false);
        setTimeout(onClose, 300);
        return;
      }
      rafId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(rafId);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.85)',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.3s ease'
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
        <canvas ref={canvasRef} width={600} height={400} style={{
          borderRadius: '16px',
          boxShadow: '0 0 60px rgba(124,77,255,0.4)'
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white', fontSize: '22px', fontWeight: 300,
          letterSpacing: '8px', textShadow: '0 0 20px rgba(255,255,255,0.6)',
          pointerEvents: 'none'
        }}>
          ✦ {starName} ✦
        </div>
        <div style={{
          position: 'absolute', bottom: '-36px', left: 0, right: 0,
          textAlign: 'center', color: '#90caf9', fontSize: '13px'
        }}>
          3秒后自动关闭...
        </div>
      </div>
    </div>
  );
};

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<StarRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStar, setActiveStar] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/stars/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: StarRecord) => {
        setRecord(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <div style={{ padding: '40px', color: '#90caf9' }}>加载中...</div>;
  }

  if (!record) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <div style={{ color: '#ef5350', fontSize: '18px', marginBottom: '20px' }}>
          未找到该观测记录
        </div>
        <Link to="/" style={{ color: '#90caf9', textDecoration: 'none' }}>
          ← 返回首页
        </Link>
      </div>
    );
  }

  const weatherColor = WEATHER_COLORS[record.weather] || '#e3f2fd';

  return (
    <div style={{ minHeight: '100vh', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '900px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={() => navigate('/')} style={{
          background: '#1b2838', color: '#90caf9', border: 'none', borderRadius: '8px',
          padding: '10px 20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px'
        }} onMouseEnter={(e) => (e.currentTarget.style.background = '#2a3f54')}
           onMouseLeave={(e) => (e.currentTarget.style.background = '#1b2838')}>
          ← 返回星图
        </button>
        <div style={{ flex: 1 }} />
        <div style={{
          padding: '8px 16px', borderRadius: '20px', fontSize: '13px', color: '#2a3f54',
          background: weatherColor, fontWeight: 600
        }}>
          {record.weather}
        </div>
      </div>

      <div style={{
        width: '350px', borderRadius: '16px', background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
        padding: '24px', boxShadow: '0 20px 60px rgba(124,77,255,0.25)', marginBottom: '32px',
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: '-30px', right: '-30px', width: '100px', height: '100px',
          borderRadius: '50%', background: 'rgba(255,255,255,0.3)', filter: 'blur(20px)'
        }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#4a148c', marginBottom: '6px' }}>
            {formatDate(record.date)}
          </div>
          <div style={{ fontSize: '14px', color: '#6a1b9a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📍 {record.location.name}
          </div>
          {record.location.latitude && record.location.longitude && (
            <div style={{ fontSize: '11px', color: '#7e57c2', marginBottom: '16px', fontFamily: 'monospace' }}>
              {record.location.latitude.toFixed(4)}°N, {record.location.longitude.toFixed(4)}°E
            </div>
          )}

          {record.photos && record.photos.length > 0 ? (
            <div style={{
              display: 'flex', gap: '10px', overflowX: 'auto', padding: '8px 0',
              scrollbarWidth: 'thin'
            }}>
              {record.photos.map((photo, idx) => (
                <img key={idx} src={photo} alt={`观测照片 ${idx + 1}`} style={{
                  width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px',
                  flexShrink: 0, border: '2px solid rgba(255,255,255,0.5)'
                }} />
              ))}
            </div>
          ) : (
            <div style={{
              height: '120px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#7e57c2', fontSize: '13px', marginBottom: '8px'
            }}>
              暂无观测照片
            </div>
          )}
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: '900px' }}>
        <div style={{
          background: '#1b2838', borderRadius: '16px', padding: '24px',
          border: '0.5px solid #2a3f54'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ color: '#90caf9', fontSize: '18px', fontWeight: 600 }}>
              ✨ 本次观测星星 ({record.stars.length}颗)
            </h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2a3f54' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', color: '#90caf9', fontWeight: 600 }}>名称</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', color: '#90caf9', fontWeight: 600 }}>星座</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', color: '#90caf9', fontWeight: 600 }}>星等</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', color: '#90caf9', fontWeight: 600 }}>观测方式</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', color: '#90caf9', fontWeight: 600, width: '60px' }}>查看</th>
                </tr>
              </thead>
              <tbody>
                {record.stars.map((star, idx) => (
                  <tr key={star.id} style={{
                    borderBottom: idx < record.stars.length - 1 ? '0.5px solid rgba(42,63,84,0.5)' : 'none',
                    transition: 'background 0.2s'
                  }} onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                     onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '14px 16px', color: '#e0e0e0', fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '8px', height: '8px', borderRadius: '50%', background: '#ffd54f',
                          boxShadow: '0 0 8px rgba(255,213,79,0.6)'
                        }} />
                        {star.name}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#b388ff' }}>{star.constellation}</td>
                    <td style={{ padding: '14px 16px', color: '#ffd54f', fontFamily: 'monospace' }}>
                      {star.magnitude.toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        display: 'inline-block', padding: '4px 10px', borderRadius: '12px',
                        fontSize: '12px', background: 'rgba(21,101,192,0.2)', color: '#90caf9'
                      }}>
                        {star.observationMethod}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <button onClick={() => setActiveStar(star.name)} style={{
                        background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer',
                        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), color 0.3s ease',
                        color: '#78909c', lineHeight: 1, padding: '4px 8px',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        transformOrigin: 'center center',
                      }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'rotate(15deg) scale(1.1)';
                          e.currentTarget.style.color = '#7c4dff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'rotate(0deg) scale(1)';
                          e.currentTarget.style.color = '#78909c';
                        }}
                        title="查看星空模拟">
                        👁
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {record.stars.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: '#90caf9' }}>
                本次活动暂无观测星星记录
              </div>
            )}
          </div>
        </div>
      </div>

      {activeStar && (
        <StarrySkyModal starName={activeStar} onClose={() => setActiveStar(null)} />
      )}
    </div>
  );
}
