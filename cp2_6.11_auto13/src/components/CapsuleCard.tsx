import { useState, useEffect } from 'react';
import { Capsule, MUSIC_STYLES } from '../types';
import { useCapsuleContext } from '../context/CapsuleContext';

interface CapsuleCardProps {
  capsule: Capsule;
  onClick: () => void;
}

const CapsuleCard = ({ capsule, onClick }: CapsuleCardProps) => {
  const { handleDelete: deleteCapsule } = useCapsuleContext();
  const [timeLeft, setTimeLeft] = useState('');
  const style = MUSIC_STYLES[capsule.musicStyle];

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const unlock = new Date(capsule.unlockDate).getTime();
      const diff = unlock - now;

      if (diff <= 0) {
        setTimeLeft('已解锁');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) setTimeLeft(`${days}天 ${hours}时 ${minutes}分 ${seconds}秒`);
      else if (hours > 0) setTimeLeft(`${hours}时 ${minutes}分 ${seconds}秒`);
      else if (minutes > 0) setTimeLeft(`${minutes}分 ${seconds}秒`);
      else setTimeLeft(`${seconds}秒`);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [capsule.unlockDate]);

  const onDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!capsule.isUnlocked && window.confirm('确定要删除这个胶囊吗？删除后无法恢复。')) {
      deleteCapsule(capsule.id);
    }
  };

  return (
    <div className="glass-card" onClick={onClick}>
      {!capsule.isUnlocked && (
        <button onClick={onDeleteClick} className="btn-icon-danger" title="删除胶囊">
          ✕
        </button>
      )}

      <div className="envelope-cover" style={{ background: style.gradient }}>
        <svg width="80" height="60" viewBox="0 0 80 60" fill="none" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>
          <rect x="5" y="15" width="70" height="40" rx="3" fill="rgba(255,255,255,0.95)" />
          <path d="M5 15 L40 42 L75 15" stroke="rgba(255,255,255,0.95)" strokeWidth="2" fill="none" />
          <path d="M5 15 L40 38 L75 15" fill="rgba(0,0,0,0.08)" />
          {!capsule.isUnlocked && <circle cx="40" cy="42" r="5" fill="#B71C1C" />}
        </svg>
        {capsule.isUnlocked && <div className="unlocked-badge">已解锁</div>}
      </div>

      <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: 8, color: '#FFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {capsule.title}
      </h3>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ background: style.gradient, padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, color: '#1A1A2E' }}>
          {style.name}
        </span>
      </div>

      <div className="countdown-box">
        <div className="countdown-label">{capsule.isUnlocked ? '解锁状态' : '距离解锁还有'}</div>
        <div className={`countdown-time ${capsule.isUnlocked ? 'countdown-time-unlocked' : 'countdown-time-locked'}`}>
          {timeLeft}
        </div>
      </div>
    </div>
  );
};

export default CapsuleCard;
