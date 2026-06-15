
import { useState, useRef, useEffect } from 'react';
import type { Gradient } from '../data/demoGradients';

interface GradientCardProps {
  gradient: Gradient;
  index: number;
  onLike: (id: string) => void;
  onClick: (id: string) => void;
}

interface ParticleData {
  id: number;
  tx: number;
  ty: number;
  size: number;
  color: string;
}

const PARTICLE_COLORS = ['#ef4444', '#f87171', '#fca5a5', '#fb7185', '#f472b6'];

export default function GradientCard({ gradient, index, onLike, onClick }: GradientCardProps) {
  const [particles, setParticles] = useState<ParticleData[]>([]);
  const [isHeartAnimating, setIsHeartAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const particleIdRef = useRef(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;
            setTimeout(() => {
              setIsVisible(true);
            }, index * 50);
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px 50px 0px' }
    );

    const el = cardRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
      observer.disconnect();
    };
  }, [index]);

  const gradientValue = `linear-gradient(${gradient.angle}deg, ${gradient.color1} 0%, ${gradient.color2} 100%)`;

  const createParticles = (): ParticleData[] => {
    const count = 14;
    const result: ParticleData[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const distance = 22 + Math.random() * 20;
      result.push({
        id: particleIdRef.current++,
        tx: Math.cos(angle) * distance,
        ty: Math.sin(angle) * distance,
        size: 5 + Math.random() * 4,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      });
    }
    return result;
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onLike(gradient.id);

    if (!gradient.liked) {
      setParticles(createParticles());
      setIsHeartAnimating(true);

      setTimeout(() => {
        setParticles([]);
        setIsHeartAnimating(false);
      }, 500);
    }
  };

  return (
    <div
      ref={cardRef}
      className={`gradient-card ${isVisible ? 'is-visible' : ''}`}
      onClick={() => onClick(gradient.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={
        {
          width: '320px',
          borderRadius: '16px',
          backgroundColor: '#ffffff',
          boxShadow: isHovered
            ? '0 8px 24px rgba(0, 0, 0, 0.1)'
            : '0 2px 12px rgba(0, 0, 0, 0.06)',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'box-shadow 0.3s ease',
          transform: isHovered && isVisible ? 'translateY(-4px)' : undefined,
          animationDelay: `${index * 50}ms`,
          position: 'relative',
        } as React.CSSProperties
      }
    >
      <div
        style={{
          width: '100%',
          height: '400px',
          background: gradientValue,
        }}
      />

      <div style={{ padding: '16px' }}>
        <div
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
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '13px', color: '#9ca3af' }}>
            {gradient.comments.length} 条评论
          </span>

          <div className="like-btn-wrapper">
            <button
              onClick={handleLikeClick}
              className={`heart-btn ${isHeartAnimating ? 'heart-anim' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: 'none',
                background: 'none',
                fontSize: '14px',
                fontWeight: 500,
                color: gradient.liked ? '#ef4444' : '#9ca3af',
                padding: '4px 8px',
                borderRadius: '8px',
              }}
            >
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

            <div className="particle-container">
              {particles.map((p) => (
                <span
                  key={p.id}
                  className="particle"
                  style={
                    {
                      width: `${p.size}px`,
                      height: `${p.size}px`,
                      backgroundColor: p.color,
                      '--tx': `${p.tx}px`,
                      '--ty': `${p.ty}px`,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
