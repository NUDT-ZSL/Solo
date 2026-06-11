import { useMemo } from 'react';
import type { Capsule } from '../types';
import { MUSIC_STYLE_GRADIENTS, MUSIC_STYLE_LABELS } from '../types';

interface Props {
  capsule: Capsule;
  onClick: () => void;
}

function formatCountdown(target: number): { days: number; hours: number; minutes: number; seconds: number; isUnlocked: boolean } {
  const now = Date.now();
  const diff = target - now;
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isUnlocked: true };
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds, isUnlocked: false };
}

export default function CapsuleCard({ capsule, onClick }: Props) {
  const gradient = MUSIC_STYLE_GRADIENTS[capsule.musicStyle];
  const countdown = useMemo(() => formatCountdown(capsule.unlockAt), [capsule.unlockAt]);

  return (
    <div className="capsule-card" onClick={onClick}>
      <div
        className="envelope-cover"
        style={{
          background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`
        }}
      >
        <div className="envelope-icon">
          <svg viewBox="0 0 100 70" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="10" width="96" height="58" rx="4" stroke="rgba(255,255,255,0.8)" strokeWidth="2" fill="rgba(255,255,255,0.15)" />
            <path d="M2 12 L50 42 L98 12" stroke="rgba(255,255,255,0.8)" strokeWidth="2" fill="none" />
            <rect x="38" y="28" width="24" height="18" rx="2" fill="rgba(255,215,0,0.8)" />
          </svg>
          {!countdown.isUnlocked && <div className="lock-badge">🔒</div>}
          {countdown.isUnlocked && <div className="unlock-badge">✨</div>}
        </div>
        <div className="music-tag">{MUSIC_STYLE_LABELS[capsule.musicStyle]}</div>
      </div>
      <div className="card-content">
        <h3 className="card-title">{capsule.title}</h3>
        {countdown.isUnlocked ? (
          <div className="countdown unlocked">已解锁 · 可查看</div>
        ) : (
          <div className="countdown">
            <div className="countdown-grid">
              <div className="cd-unit"><span className="cd-num">{countdown.days}</span><span className="cd-label">天</span></div>
              <div className="cd-sep">:</div>
              <div className="cd-unit"><span className="cd-num">{String(countdown.hours).padStart(2, '0')}</span><span className="cd-label">时</span></div>
              <div className="cd-sep">:</div>
              <div className="cd-unit"><span className="cd-num">{String(countdown.minutes).padStart(2, '0')}</span><span className="cd-label">分</span></div>
              <div className="cd-sep">:</div>
              <div className="cd-unit"><span className="cd-num">{String(countdown.seconds).padStart(2, '0')}</span><span className="cd-label">秒</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
