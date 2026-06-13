
import { useState, useRef, useEffect } from 'react';
import type { Gradient } from '../data/demoGradients';

interface GradientCardProps {
  gradient: Gradient;
  index: number;
  onLike: (id: string) => void;
  onClick: (id: string) => void;
}

interface Particle {
  id: number;
  tx: number;
  ty: number;
  size: number;
}

export default function GradientCard({ gradient, index, onLike, onClick }: GradientCardProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleIdRef = useRef(0);
  const [visible, setVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, index * 50);
    return () => clearTimeout(timer);
  }, [index]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
          }
        });
      },
      { threshold: 0.1 }
    );
    if (cardRef.current) {
      observer.observe(cardRef.current);
    }
    return () => observer.disconnect();
  }, []);

  const gradientValue = `linear-gradient(${gradient.angle}deg, ${gradient.color1} 0%, ${gradient.color2} 100%)`;

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLike(gradient.id);

    if (!gradient.liked) {
      setIsAnimating(true);
      const newParticles: Particle[] = [];
      const particleCount = 8;
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const distance = 25 + Math.random() * 15;
        newParticles.push({
          id: particleIdRef.current++,
          tx: Math.cos(angle) * distance,
          ty: Math.sin(angle) * distance,
          size: 4 + Math.random() * 4,
        });
      }
      setParticles(newParticles);

      setTimeout(() => {
        setIsAnimating(false);
        setParticles([]);
      }, 500);
    }
  };

  return (
    <div
      ref={cardRef}
      className="gradient-card"
      onClick={() => onClick(gradient.id)}
      style={{
        width: '320px',
        borderRadius: '16px',
        backgroundColor: '#ffffff',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
        overflow: 'hidden',
        cursor: 'pointer',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease, box-shadow 0.3s ease',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.1)';
        e.currentTarget.style.transform = visible ? 'translateY(-4px)' : 'translateY(30px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.06)';
        e.currentTarget.style.transform = visible ? 'translateY(0)' : 'translateY(30px)';
      }}
    >
      <div
        className="gradient-preview"
        style={{
          width: '100%',
          height: '400px',
          background: gradientValue,
        }}
      />

      <div
        className="card-info"
        style={{
          padding: '16px',
        }}
      >
        <div
          className="gradient-name"
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#1f2937',
            marginBottom: '10px',
          }}
        >
          {gradient.name}
        </div>

        <div
          className="gradient-value"
          style={{
            fontSize: '12px',
            color: '#4b5563',
            backgroundColor: '#f3f4f6',
            padding: '8px 12px',
            borderRadius: '8px',
            fontFamily: 'monospace',
            wordBreak: 'break-all',
            lineHeight: 1.5,
            marginBottom: '12px',
          }}
        >
          linear-gradient({gradient.angle}deg, {gradient.color1} 0%, {gradient.color2} 100%)
        </div>

        <div
          className="tags"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            marginBottom: '12px',
          }}
        >
          {gradient.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: '12px',
                color: '#6b7280',
                backgroundColor: '#f3f4f6',
                padding: '4px 8px',
                borderRadius: '6px',
              }}
            >
              #{tag}
            </span>
          ))}
        </div>

        <div
          className="card-footer"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: '13px',
              color: '#9ca3af',
            }}
          >
            {gradient.comments.length} 条评论
          </span>

          <button
            className="like-btn"
            onClick={handleLikeClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: 'none',
              background: 'none',
              fontSize: '14px',
              fontWeight: 500,
              color: gradient.liked ? '#ef4444' : '#9ca3af',
              position: 'relative',
              padding: '4px 8px',
              borderRadius: '8px',
              animation: isAnimating ? 'heart-pop 0.5s ease' : 'none',
            }}
          >
            {particles.map((particle) => (
              <span
                key={particle.id}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: `${particle.size}px`,
                  height: `${particle.size}px`,
                  borderRadius: '50%',
                  backgroundColor: '#ef4444',
                  '--tx': `${particle.tx}px`,
                  '--ty': `${particle.ty}px`,
                  animation: 'particle-burst 0.5s ease-out forwards',
                  pointerEvents: 'none',
                } as React.CSSProperties}
              />
            ))}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={gradient.liked ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
            {gradient.likes}
          </button>
        </div>
      </div>
    </div>
  );
}
