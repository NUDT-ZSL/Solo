import { useState, useRef, useCallback } from 'react';
import { Inspiration, TAG_STYLES } from './types';

interface Props {
  inspiration: Inspiration;
  index: number;
  isNew: boolean;
  isHot: boolean;
  onVote: (id: string) => void;
  onDelete: (id: string) => void;
}

interface Particle {
  id: number;
  tx: number;
  ty: number;
}

export default function InspirationCard({
  inspiration,
  index,
  isNew,
  isHot,
  onVote,
  onDelete,
}: Props) {
  const [voted, setVoted] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const particleIdRef = useRef(0);

  const handleVote = useCallback(() => {
    if (voted) return;
    setVoted(true);
    onVote(inspiration.id);

    const count = 4 + Math.floor(Math.random() * 3);
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const distance = 40 + Math.random() * 20;
      newParticles.push({
        id: particleIdRef.current++,
        tx: Math.cos(angle) * distance,
        ty: Math.sin(angle) * distance,
      });
    }
    setParticles(newParticles);

    setTimeout(() => {
      setParticles([]);
    }, 700);
  }, [voted, inspiration.id, onVote]);

  const handleDelete = useCallback(() => {
    setIsDeleting(true);
    setTimeout(() => {
      onDelete(inspiration.id);
    }, 500);
  }, [inspiration.id, onDelete]);

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    background: 'rgba(255, 255, 255, 0.92)',
    backdropFilter: 'blur(8px)',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: isHot
      ? '0 8px 28px rgba(245, 193, 74, 0.22), 0 4px 15px rgba(0,0,0,0.08)'
      : '0 4px 15px rgba(0,0,0,0.08)',
    transition: 'all 0.35s ease-out, opacity 0.4s ease-out',
    animation: isNew
      ? 'pop-in 0.45s ease-out forwards'
      : `stagger-in 0.4s ease-out ${Math.min(index, 15) * 0.03}s both`,
    opacity: isDeleting ? 0 : 1,
    transform: isDeleting ? 'scale(0.4) rotate(20deg)' : 'scale(1)',
    overflow: 'visible',
  };

  if (isHot && !isDeleting) {
    cardStyle.animation = `${cardStyle.animation || ''}, shine 2.5s ease-in-out infinite`;
  }

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      <button
        onClick={handleDelete}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          border: 'none',
          background: 'rgba(0,0,0,0.1)',
          color: '#666',
          fontSize: '16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: showDelete ? 1 : 0,
          transition: 'all 0.3s ease-out',
          transform: showDelete ? 'scale(1)' : 'scale(0.6)',
          zIndex: 10,
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLButtonElement).style.background = 'rgba(220, 53, 69, 0.75)';
          (e.target as HTMLButtonElement).style.color = '#fff';
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLButtonElement).style.background = 'rgba(0,0,0,0.1)';
          (e.target as HTMLButtonElement).style.color = '#666';
        }}
      >
        ×
      </button>

      <h3
        style={{
          fontSize: '17px',
          fontWeight: 600,
          color: '#1a1a1a',
          marginBottom: '10px',
          lineHeight: 1.4,
          paddingRight: '28px',
        }}
      >
        {inspiration.title}
      </h3>

      <p
        style={{
          fontSize: '14px',
          color: '#555',
          lineHeight: 1.6,
          marginBottom: '14px',
          minHeight: '44px',
          wordBreak: 'break-word',
        }}
      >
        {inspiration.description}
      </p>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          marginBottom: '18px',
        }}
      >
        {inspiration.tags.map((tag) => (
          <span
            key={tag}
            style={{
              display: 'inline-block',
              padding: '3px 10px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 500,
              background: TAG_STYLES[tag].background,
              color: TAG_STYLES[tag].color,
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      <div style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end' }}>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            right: '20px',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          {particles.map((p) => (
            <span
              key={p.id}
              style={{
                position: 'absolute',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, #fff3c4 0%, var(--glow-gold) 60%, transparent 100%)',
                left: 0,
                top: 0,
                ['--tx' as any]: `${p.tx}px`,
                ['--ty' as any]: `${p.ty}px`,
                animation: 'particle-burst 0.7s ease-out forwards',
              }}
            />
          ))}
        </div>

        <button
          onClick={handleVote}
          disabled={voted}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px 8px 16px',
            borderRadius: '24px',
            border: 'none',
            cursor: voted ? 'default' : 'pointer',
            background: voted
              ? 'linear-gradient(135deg, var(--glow-gold) 0%, var(--glow-gold-light) 100%)'
              : 'rgba(180, 180, 180, 0.25)',
            color: voted ? '#7a5a10' : '#888',
            fontWeight: 600,
            fontSize: '13px',
            boxShadow: voted
              ? '0 0 0 0 rgba(245, 193, 74, 0.4), 0 3px 10px rgba(245, 193, 74, 0.35)'
              : 'none',
            transition: 'all 0.3s ease-out',
            animation: voted ? 'pulse-glow 2s ease-out infinite' : 'none',
          }}
          onMouseEnter={(e) => {
            if (voted) return;
            (e.currentTarget as HTMLButtonElement).style.background =
              'rgba(180, 180, 180, 0.4)';
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              '0 0 20px rgba(180, 180, 180, 0.5)';
          }}
          onMouseLeave={(e) => {
            if (voted) return;
            (e.currentTarget as HTMLButtonElement).style.background =
              'rgba(180, 180, 180, 0.25)';
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
          }}
        >
          <span
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: voted
                ? 'radial-gradient(circle, #fffbeb 0%, #ffd966 50%, #e8a81f 100%)'
                : 'radial-gradient(circle, #fff 0%, #bbb 100%)',
              boxShadow: voted ? '0 0 8px rgba(245, 193, 74, 0.8)' : 'none',
              transition: 'all 0.3s ease-out',
            }}
          />
          <span>{inspiration.votes}</span>
        </button>
      </div>
    </div>
  );
}
