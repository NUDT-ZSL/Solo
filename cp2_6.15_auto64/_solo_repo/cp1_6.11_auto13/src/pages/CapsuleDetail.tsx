import { useState, useEffect, useMemo, useRef } from 'react';
import type { Capsule } from '../types';
import { MUSIC_STYLE_GRADIENTS, MUSIC_STYLE_LABELS } from '../types';
import ParticleAnimation from '../components/ParticleAnimation';

interface Props {
  id: string;
  onBack: () => void;
  onDeleted: () => void;
}

function formatCountdown(target: number): { days: number; hours: number; minutes: number; seconds: number; isUnlocked: boolean; total: number } {
  const now = Date.now();
  const diff = target - now;
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isUnlocked: true, total: 0 };
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds, isUnlocked: false, total: diff };
}

export default function CapsuleDetail({ id, onBack, onDeleted }: Props) {
  const [capsule, setCapsule] = useState<Capsule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [, setTick] = useState(0);
  const [revealStage, setRevealStage] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const revealStarted = useRef(false);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/capsules/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('胶囊不存在');
        return res.json();
      })
      .then(data => {
        if (mounted) {
          setCapsule(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err.message || '加载失败');
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, [id]);

  const countdown = useMemo(() => {
    if (!capsule) return { days: 0, hours: 0, minutes: 0, seconds: 0, isUnlocked: false, total: 0 };
    return formatCountdown(capsule.unlockAt);
  }, [capsule, revealStage]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (capsule && countdown.isUnlocked && !revealStarted.current) {
      revealStarted.current = true;
      setRevealStage(1);
      setTimeout(() => setRevealStage(2), 1200);
      setTimeout(() => setRevealStage(3), 2200);
      setTimeout(() => setRevealStage(4), 3000);
    }
  }, [capsule, countdown.isUnlocked]);

  useEffect(() => {
    if (audioRef.current && revealStage >= 4) {
      audioRef.current.volume = volume;
      audioRef.current.play().catch(() => {});
    }
  }, [revealStage, volume]);

  const handleDelete = async () => {
    if (!capsule) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/capsules/${capsule.id}`, { method: 'DELETE' });
      if (res.ok) {
        onDeleted();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || '删除失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  if (loading) return <div className="loading">加载中...</div>;
  if (error) return <div className="error-page">{error}<button className="nav-btn" onClick={onBack} style={{ marginTop: 16 }}>返回</button></div>;
  if (!capsule) return null;

  const gradient = MUSIC_STYLE_GRADIENTS[capsule.musicStyle];
  const isUnlocked = countdown.isUnlocked;
  const canDelete = !isUnlocked;

  return (
    <div className="capsule-detail">
      <ParticleAnimation style={capsule.musicStyle} active={isUnlocked} />

      {!isUnlocked ? (
        <div className="locked-view">
          <div
            className="locked-envelope"
            style={{
              background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`
            }}
          >
            <svg viewBox="0 0 100 70" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '80%', height: '80%' }}>
              <rect x="2" y="10" width="96" height="58" rx="4" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" fill="rgba(255,255,255,0.1)" />
              <path d="M2 12 L50 42 L98 12" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" fill="none" />
              <rect x="38" y="28" width="24" height="18" rx="2" fill="rgba(255,215,0,0.9)" />
              <text x="50" y="39" textAnchor="middle" fontSize="10" fill="#5D4037" fontWeight="bold">🔒</text>
            </svg>
          </div>

          <h2 className="detail-title">{capsule.title}</h2>
          <div className="detail-subtitle">
            <span className="music-badge" style={{ background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)` }}>
              {MUSIC_STYLE_LABELS[capsule.musicStyle]}
            </span>
            <span>锁定中 · 等待解锁</span>
          </div>

          <div className="big-countdown">
            <div className="big-cd-item"><span className="big-cd-num">{countdown.days}</span><span className="big-cd-label">天</span></div>
            <div className="big-cd-sep">:</div>
            <div className="big-cd-item"><span className="big-cd-num">{String(countdown.hours).padStart(2, '0')}</span><span className="big-cd-label">时</span></div>
            <div className="big-cd-sep">:</div>
            <div className="big-cd-item"><span className="big-cd-num">{String(countdown.minutes).padStart(2, '0')}</span><span className="big-cd-label">分</span></div>
            <div className="big-cd-sep">:</div>
            <div className="big-cd-item"><span className="big-cd-num">{String(countdown.seconds).padStart(2, '0')}</span><span className="big-cd-label">秒</span></div>
          </div>

          {canDelete && (
            <button className="delete-btn" onClick={() => setShowConfirm(true)}>
              🗑️ 删除此胶囊
            </button>
          )}
        </div>
      ) : (
        <div className="unlocked-view">
          <div className={`envelope-open ${revealStage >= 1 ? 'animating' : ''}`}>
            <div
              className="flap-left"
              style={{ background: `linear-gradient(90deg, ${gradient.to} 0%, ${gradient.from} 100%)` }}
            />
            <div
              className="flap-right"
              style={{ background: `linear-gradient(270deg, ${gradient.to} 0%, ${gradient.from} 100%)` }}
            />
            <div
              className="flap-top"
              style={{ background: `linear-gradient(180deg, ${gradient.from} 0%, ${gradient.to} 100%)` }}
            />
          </div>

          {revealStage >= 2 && (
            <div className="reveal-content">
              <h2 className="detail-title reveal-text">{capsule.title}</h2>
              <div className="detail-subtitle reveal-text">
                <span className="music-badge" style={{ background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)` }}>
                  {MUSIC_STYLE_LABELS[capsule.musicStyle]}
                </span>
                <span>已解锁</span>
              </div>

              {revealStage >= 3 && (
                <div className="text-content reveal-text">
                  {capsule.content.split('\n').map((line, i) => (
                    <p key={i} style={{ animationDelay: `${i * 0.1}s` }}>{line}</p>
                  ))}
                </div>
              )}

              {revealStage >= 4 && capsule.images.length > 0 && (
                <div className="image-gallery">
                  {capsule.images.map((img, i) => (
                    <div key={i} className="gallery-item" style={{ animationDelay: `${i * 0.5}s` }}>
                      <img src={img} alt={`${capsule.title}-${i}`} />
                    </div>
                  ))}
                </div>
              )}

              {revealStage >= 4 && (
                <div className="music-control">
                  <span className="music-icon">🎵</span>
                  <div className="volume-slider">
                    <span>🔈</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={e => setVolume(Number(e.target.value))}
                    />
                    <span>🔊</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <audio
            ref={audioRef}
            loop
            src={`data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU`}
          />
        </div>
      )}

      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>确认删除</h3>
            <p>确定要删除时间胶囊「{capsule.title}」吗？此操作不可撤销。</p>
            <div className="modal-actions">
              <button className="nav-btn" onClick={() => setShowConfirm(false)} disabled={deleting}>取消</button>
              <button className="delete-btn" onClick={handleDelete} disabled={deleting}>
                {deleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
