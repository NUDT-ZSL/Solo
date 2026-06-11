import { useState, useEffect } from 'react';
import { Capsule, MUSIC_STYLES } from '../types';

interface CapsuleCardProps {
  capsule: Capsule;
  onClick: () => void;
  onDelete: () => void;
}

const CapsuleCard = ({ capsule, onClick, onDelete }: CapsuleCardProps) => {
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

      if (days > 0) {
        setTimeLeft(`${days}天 ${hours}时 ${minutes}分 ${seconds}秒`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}时 ${minutes}分 ${seconds}秒`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}分 ${seconds}秒`);
      } else {
        setTimeLeft(`${seconds}秒`);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [capsule.unlockDate]);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('确定要删除这个胶囊吗？删除后无法恢复。')) {
      onDelete();
    }
  };

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '24px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)';
      }}
    >
      {!capsule.isUnlocked && (
        <button
          onClick={handleDelete}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(239, 83, 80, 0.8)',
            border: 'none',
            color: 'white',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            transition: 'opacity 0.2s, transform 0.2s',
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.8';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseOut={(e) => (e.currentTarget.style.opacity = '0')}
          title="删除胶囊"
        >
          ✕
        </button>
      )}

      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '160px',
          borderRadius: '12px',
          background: style.gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          overflow: 'hidden',
        }}
      >
        <svg
          width="80"
          height="60"
          viewBox="0 0 80 60"
          fill="none"
          style={{
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
          }}
        >
          <rect x="5" y="15" width="70" height="40" rx="3" fill="rgba(255,255,255,0.95)" />
          <path
            d="M5 15 L40 42 L75 15"
            stroke="rgba(255,255,255,0.95)"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M5 15 L40 38 L75 15"
            fill="rgba(0,0,0,0.08)"
          />
          {!capsule.isUnlocked && (
            <circle cx="40" cy="42" r="5" fill="#B71C1C" />
          )}
        </svg>

        {capsule.isUnlocked && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'rgba(76, 175, 80, 0.9)',
              color: 'white',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '500',
            }}
          >
            已解锁
          </div>
        )}
      </div>

      <h3
        style={{
          fontSize: '18px',
          fontWeight: '600',
          marginBottom: '8px',
          color: '#FFFFFF',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {capsule.title}
      </h3>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        <span
          style={{
            background: style.gradient,
            padding: '3px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            color: '#1A1A2E',
          }}
        >
          {style.name}
        </span>
      </div>

      <div
        style={{
          background: 'rgba(0, 0, 0, 0.3)',
          padding: '10px 14px',
          borderRadius: '8px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.6)',
            marginBottom: '4px',
          }}
        >
          {capsule.isUnlocked ? '解锁状态' : '距离解锁还有'}
        </div>
        <div
          style={{
            fontSize: '14px',
            fontWeight: '600',
            color: capsule.isUnlocked ? '#81C784' : '#64B5F6',
            fontFamily: 'monospace',
          }}
        >
          {timeLeft}
        </div>
      </div>
    </div>
  );
};

export default CapsuleCard;
