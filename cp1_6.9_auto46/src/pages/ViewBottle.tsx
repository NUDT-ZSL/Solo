import { useEffect, useRef, useState, useCallback } from 'react';
import { Bottle, COLOR_MAP } from '../types';

interface ViewBottleProps {
  id: string;
  onNavigate: (route: { name: 'home' } | { name: 'bottle'; id: string }) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function getCountdown(target: number): string {
  const diff = Math.max(0, target - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  const secs = Math.floor((diff / 1000) % 60);
  const parts = [];
  if (days > 0) parts.push(`${days}天`);
  if (hours > 0 || days > 0) parts.push(`${hours}时`);
  if (mins > 0 || hours > 0 || days > 0) parts.push(`${mins}分`);
  parts.push(`${secs}秒`);
  return parts.join(' ');
}

const ViewBottle: React.FC<ViewBottleProps> = ({ id, onNavigate }) => {
  const [bottle, setBottle] = useState<Bottle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlockPhase, setUnlockPhase] = useState<
    'locked' | 'opening' | 'glow' | 'typing' | 'done'
  >('locked');
  const [typedText, setTypedText] = useState('');
  const [countdown, setCountdown] = useState('');
  const [inputId, setInputId] = useState(id || '');

  const particlesCanvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const particleAnimRef = useRef<number>(0);
  const typingRef = useRef<number>(0);

  const fetchBottle = useCallback(async (bottleId: string) => {
    if (!bottleId.trim()) {
      setLoading(false);
      setError(null);
      setBottle(null);
      return;
    }
    setLoading(true);
    setError(null);
    setBottle(null);
    setUnlockPhase('locked');
    setTypedText('');
    try {
      const res = await fetch(`/api/bottle/${bottleId.trim().toUpperCase()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '漂流瓶不存在');
      }
      setBottle(data);
      if (data.isUnlocked) {
        startUnlockSequence();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchBottle(id);
    } else {
      setLoading(false);
    }
  }, [id, fetchBottle]);

  useEffect(() => {
    if (!bottle || bottle.isUnlocked) return;
    const target = new Date(bottle.unlockDate).getTime();
    const tick = () => {
      setCountdown(getCountdown(target));
      if (Date.now() >= target) {
        fetchBottle(bottle.id);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [bottle, fetchBottle]);

  const startUnlockSequence = useCallback(() => {
    setUnlockPhase('opening');

    setTimeout(() => {
      setUnlockPhase('glow');
      spawnParticles();

      setTimeout(() => {
        setUnlockPhase('typing');
      }, 2000);
    }, 1500);
  }, []);

  useEffect(() => {
    if (unlockPhase !== 'typing' || !bottle?.message) return;

    const fullText = bottle.message;
    let i = 0;
    const speed = Math.max(20, Math.min(60, 3000 / fullText.length));

    const type = () => {
      if (i <= fullText.length) {
        setTypedText(fullText.slice(0, i));
        i++;
        typingRef.current = window.setTimeout(type, speed);
      } else {
        setUnlockPhase('done');
      }
    };
    type();

    return () => {
      clearTimeout(typingRef.current);
    };
  }, [unlockPhase, bottle]);

  const spawnParticles = useCallback(() => {
    const canvas = particlesCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const count = 120;
    const palette = [
      '#FFD700',
      '#FFA500',
      '#FFEC8B',
      '#FFFACD',
      '#F0E68C',
      '#FFE4B5',
    ];

    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = Math.random() * 6 + 3;
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 0,
        maxLife: Math.random() * 120 + 80,
        size: Math.random() * 5 + 2,
        color: palette[Math.floor(Math.random() * palette.length)],
        alpha: 1,
      });
    }
    particlesRef.current = particles;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      for (const p of particlesRef.current) {
        if (p.life >= p.maxLife) continue;
        alive = true;
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.vx *= 0.99;
        p.alpha = 1 - p.life / p.maxLife;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 15;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }

      if (alive) {
        particleAnimRef.current = requestAnimationFrame(animate);
      }
    };

    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    animate();

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(particleAnimRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(typingRef.current);
      cancelAnimationFrame(particleAnimRef.current);
    };
  }, []);

  const handleSearch = () => {
    if (!inputId.trim()) return;
    onNavigate({ name: 'bottle', id: inputId.trim().toUpperCase() });
  };

  const renderBottle3D = () => {
    if (!bottle) return null;
    const colorHex = COLOR_MAP[bottle.color].hex;
    const bodyBg = bottle.color === 'gold'
      ? `linear-gradient(135deg, ${colorHex}88, #fceabb88, ${colorHex}66)`
      : `linear-gradient(180deg, ${colorHex}66, ${colorHex}33)`;
    const capBg = bottle.color === 'gold'
      ? `linear-gradient(180deg, #8B6914, ${colorHex})`
      : `linear-gradient(180deg, #333, ${colorHex})`;

    return (
      <div className="bottle-stage">
        <div className="bottle-3d">
          <div className="bottle-glow" />
          <div className="bottle-paper" />
          <div className="bottle-neck" style={{ background: bodyBg }} />
          <div
            className={`bottle-cap ${
              unlockPhase === 'opening' ||
              unlockPhase === 'glow' ||
              unlockPhase === 'typing' ||
              unlockPhase === 'done'
                ? 'opened'
                : ''
            }`}
            style={{ background: capBg }}
          />
          <div className="bottle-body" style={{ background: bodyBg }} />
          {(unlockPhase === 'glow' || unlockPhase === 'typing') && (
            <div className="bottle-glow active" />
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="view-container">
        <div className="back-btn">
          <a
            href="#/"
            className="back-link"
            onClick={(e) => {
              e.preventDefault();
              onNavigate({ name: 'home' });
            }}
          >
            ← 返回首页
          </a>
        </div>
        <div className="loading-spinner" />
        <p style={{ color: '#8892B0', marginTop: '1rem' }}>正在探测漂流瓶...</p>
      </div>
    );
  }

  if (!bottle && !id) {
    return (
      <div className="app-container">
        <div className="back-btn">
          <a
            href="#/"
            className="back-link"
            onClick={(e) => {
              e.preventDefault();
              onNavigate({ name: 'home' });
            }}
          >
            ← 返回首页
          </a>
        </div>
        <div className="id-input-section">
          <div className="empty-icon">🍾</div>
          <h2 style={{ marginBottom: '1rem', color: '#E6F1FF' }}>
            输入瓶身编号寻找漂流瓶
          </h2>
          <p style={{ color: '#8892B0', marginBottom: '1rem' }}>
            在大海中搜寻属于你的时光胶囊
          </p>
          <div className="id-input-row">
            <input
              type="text"
              className="form-input"
              placeholder="8 位编号"
              value={inputId}
              maxLength={8}
              onChange={(e) => setInputId(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
            />
            <button
              type="button"
              className="btn"
              onClick={handleSearch}
              disabled={!inputId.trim()}
            >
              🔍 搜索
            </button>
          </div>
        </div>
        {error && (
          <div className="error-message" style={{ maxWidth: 500, margin: '2rem auto' }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  if (error && !bottle) {
    return (
      <div className="app-container">
        <div className="back-btn">
          <a
            href="#/"
            className="back-link"
            onClick={(e) => {
              e.preventDefault();
              onNavigate({ name: 'home' });
            }}
          >
            ← 返回首页
          </a>
        </div>
        <div className="id-input-section">
          <div className="empty-icon">🌫️</div>
          <h2 style={{ marginBottom: '1rem', color: '#ff6b6b' }}>
            未找到漂流瓶
          </h2>
          <p style={{ color: '#8892B0', marginBottom: '1rem' }}>
            {error}
          </p>
          <div className="id-input-row">
            <input
              type="text"
              className="form-input"
              placeholder="重新输入 8 位编号"
              value={inputId}
              maxLength={8}
              onChange={(e) => setInputId(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
            />
            <button
              type="button"
              className="btn"
              onClick={handleSearch}
              disabled={!inputId.trim()}
            >
              🔍 再试一次
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="view-ocean" />
      <canvas
        ref={particlesCanvasRef}
        className="particles-canvas"
      />
      <div className="view-container">
        <div className="back-btn">
          <a
            href="#/"
            className="back-link"
            onClick={(e) => {
              e.preventDefault();
              onNavigate({ name: 'home' });
            }}
          >
            ← 返回首页
          </a>
        </div>

        {bottle && (
          <>
            <div
              style={{
                textAlign: 'center',
                marginBottom: '1rem',
                position: 'relative',
                zIndex: 2,
              }}
            >
              <div
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  letterSpacing: '0.3em',
                  background: 'linear-gradient(135deg, #0A192F, #112240)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: '0 2px 10px rgba(255,255,255,0.3)',
                  padding: '0.5rem 1rem',
                }}
              >
                🍾 {bottle.id}
              </div>
              <div
                style={{
                  fontSize: '0.9rem',
                  color: 'rgba(10, 25, 47, 0.7)',
                  marginTop: '0.3rem',
                }}
              >
                {COLOR_MAP[bottle.color].name} · 封装于{' '}
                {formatDate(bottle.createdAt)}
              </div>
            </div>

            {renderBottle3D()}

            {!bottle.isUnlocked ? (
              <div className="lock-info" style={{ background: 'rgba(10, 25, 47, 0.7)', borderColor: 'rgba(244, 164, 96, 0.5)', position: 'relative', zIndex: 2 }}>
                <div className="lock-info-title">🔒 漂流瓶尚未开启</div>
                <div className="lock-info-date">
                  开启日期：{formatDate(bottle.unlockDate)}
                </div>
                <div className="countdown">
                  ⏳ 距离开启还有：{countdown}
                </div>
              </div>
            ) : (
              (unlockPhase === 'typing' || unlockPhase === 'done') && (
                <div className="message-container" style={{ position: 'relative', zIndex: 2 }}>
                  <div
                    style={{
                      textAlign: 'center',
                      marginBottom: '1.5rem',
                      color: '#F4A460',
                      fontSize: '1rem',
                      letterSpacing: '0.1em',
                    }}
                  >
                    ✨ 时光讯息已解封 ✨
                  </div>
                  <div className="message-text">
                    {typedText}
                    {unlockPhase === 'typing' && (
                      <span className="typing-cursor" />
                    )}
                  </div>
                  <div className="message-meta">
                    <span>🍾 瓶身编号：{bottle.id}</span>
                    <span>🎨 {COLOR_MAP[bottle.color].name}</span>
                  </div>
                  <div className="message-meta" style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px dashed rgba(136, 146, 176, 0.2)' }}>
                    <span>📅 封装：{formatDate(bottle.createdAt)}</span>
                    <span>🔓 解锁：{formatDate(bottle.unlockDate)}</span>
                  </div>
                </div>
              )
            )}
          </>
        )}
      </div>
    </>
  );
};

export default ViewBottle;
