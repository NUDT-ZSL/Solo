import React, { useEffect, useRef, useState, useCallback } from 'react';
import { playUnlockSound } from './AudioManager';

interface Capsule3DProps {
  isUnlocked: boolean;
  unlockTime: number;
  onUnlock?: () => void;
  onClick?: () => void;
  interactive?: boolean;
  size?: 'small' | 'large';
}

const Capsule3D: React.FC<Capsule3DProps> = ({
  isUnlocked,
  onUnlock,
  onClick,
  interactive = true,
  size = 'small',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textureUrlRef = useRef<string>('');
  const [hover, setHover] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [isOpened, setIsOpened] = useState(false);
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    opacity: number;
  }>>([]);
  const particleIdRef = useRef(0);

  const capsuleWidth = size === 'large' ? 160 : 100;
  const capsuleHeight = size === 'large' ? 220 : 140;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = 256;
    const h = 256;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const baseGradient = ctx.createLinearGradient(0, 0, w, h);
    baseGradient.addColorStop(0, '#6B7280');
    baseGradient.addColorStop(0.3, '#9CA3AF');
    baseGradient.addColorStop(0.5, '#D1D5DB');
    baseGradient.addColorStop(0.7, '#9CA3AF');
    baseGradient.addColorStop(1, '#4B5563');
    ctx.fillStyle = baseGradient;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 80; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const radius = 10 + Math.random() * 35;
      const rustColors = [
        `rgba(139, 69, 19, ${0.2 + Math.random() * 0.3})`,
        `rgba(160, 82, 45, ${0.2 + Math.random() * 0.3})`,
        `rgba(205, 133, 63, ${0.2 + Math.random() * 0.25})`,
        `rgba(255, 140, 0, ${0.15 + Math.random() * 0.2})`,
        `rgba(178, 34, 34, ${0.15 + Math.random() * 0.2})`,
      ];
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, rustColors[Math.floor(Math.random() * rustColors.length)]);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 40; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const streakW = 1 + Math.random() * 2;
      const streakH = 8 + Math.random() * 20;
      ctx.fillStyle = `rgba(139, 90, 43, ${0.15 + Math.random() * 0.2})`;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.random() * Math.PI);
      ctx.fillRect(-streakW / 2, -streakH / 2, streakW, streakH);
      ctx.restore();
    }

    for (let y = 0; y < h; y += 4) {
      const shine = Math.sin(y * 0.05) * 0.08;
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, shine)})`;
      ctx.fillRect(0, y, w, 2);
    }

    textureUrlRef.current = canvas.toDataURL();
  }, []);

  const triggerParticles = useCallback(() => {
    const count = 35 + Math.floor(Math.random() * 15);
    const newParticles = [];
    const colors = ['#FBBF24', '#F59E0B', '#D97706', '#FEF3C7', '#FDE68A'];
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 60 + Math.random() * 100;
      newParticles.push({
        id: particleIdRef.current++,
        x: 50,
        y: 50,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        size: 2 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 1,
      });
    }
    setParticles(newParticles);

    let elapsed = 0;
    const duration = 600;
    const interval = 16;

    const animate = () => {
      elapsed += interval;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      setParticles(prev => prev.map(p => ({
        ...p,
        x: 50 + (p.vx * ease * 0.8),
        y: 50 + (p.vy * ease * 0.8) + progress * progress * 30,
        opacity: 1 - ease,
      })).filter(p => p.opacity > 0.05));

      if (progress < 1) {
        setTimeout(animate, interval);
      }
    };

    animate();
  }, []);

  const handleClick = () => {
    if (!interactive) {
      onClick?.();
      return;
    }

    if (isUnlocked && !isOpening && !isOpened) {
      setIsOpening(true);
      playUnlockSound();
      triggerParticles();
      
      setTimeout(() => {
        setIsOpening(false);
        setIsOpened(true);
        onUnlock?.();
      }, 800);
    } else if (!isUnlocked) {
      onClick?.();
    } else {
      onClick?.();
    }
  };

  const capsuleRotY = hover && !isOpening ? 15 : 0;
  const leftRot = isOpening || isOpened ? -60 : 0;
  const rightRot = isOpening || isOpened ? 60 : 0;

  const baseStyle: React.CSSProperties = {
    width: capsuleWidth,
    height: capsuleHeight,
    position: 'relative',
    transformStyle: 'preserve-3d',
    transition: `transform ${isOpening ? '0.8s' : '0.3s'} cubic-bezier(0.4, 0, 0.2, 1)`,
    cursor: interactive ? (isUnlocked && !isOpened ? 'pointer' : onClick ? 'pointer' : 'default') : 'default',
  };

  const halfStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    width: '50%',
    height: '100%',
    transformStyle: 'preserve-3d',
    transition: `transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)`,
  };

  const bodyHeight = capsuleHeight * 0.7;
  const capHeight = capsuleHeight * 0.18;
  const sealHeight = capsuleHeight * 0.06;
  const halfWidth = capsuleWidth / 2;

  return (
    <div
      style={baseStyle}
      className="capsule-3d"
      onMouseEnter={() => interactive && setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={handleClick}
    >
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div
        style={{
          ...halfStyle,
          left: 0,
          transformOrigin: 'left center',
          transform: `perspective(600px) rotateY(${capsuleRotY}deg) rotateY(${leftRot}deg)`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: capHeight,
            left: '0%',
            width: '100%',
            height: bodyHeight,
            background: `url(${textureUrlRef.current})`,
            backgroundSize: '200% 100%',
            backgroundPosition: 'left center',
            borderRadius: 0,
            borderRight: 'none',
            boxShadow: isOpened 
              ? 'inset -8px 0 16px rgba(0,0,0,0.4)' 
              : 'inset -3px 0 6px rgba(0,0,0,0.2)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '0%',
            width: '100%',
            height: capHeight,
            background: `linear-gradient(135deg, rgba(245,158,11,0.95) 0%, rgba(217,119,6,0.95) 50%, rgba(180,83,9,0.95) 100%)`,
            borderRadius: `${halfWidth}px ${halfWidth}px 0 0`,
            boxShadow: `
              inset 2px 2px 4px rgba(255,255,255,0.4),
              inset -2px -2px 4px rgba(0,0,0,0.3),
              0 2px 4px rgba(0,0,0,0.3)
            `,
            filter: 'brightness(0.6)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: capHeight - sealHeight / 2,
            left: '0%',
            width: '100%',
            height: sealHeight,
            background: 'linear-gradient(180deg, rgba(251,191,36,0.9) 0%, rgba(245,158,11,0.9) 50%, rgba(217,119,6,0.9) 100%)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)',
            zIndex: 2,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: capHeight + bodyHeight - sealHeight / 2,
            left: '0%',
            width: '100%',
            height: sealHeight,
            background: 'linear-gradient(180deg, rgba(251,191,36,0.9) 0%, rgba(245,158,11,0.9) 50%, rgba(217,119,6,0.9) 100%)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)',
            zIndex: 2,
          }}
        />
      </div>

      <div
        style={{
          ...halfStyle,
          right: 0,
          transformOrigin: 'right center',
          transform: `perspective(600px) rotateY(${capsuleRotY}deg) rotateY(${rightRot}deg)`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: capHeight,
            right: '0%',
            width: '100%',
            height: bodyHeight,
            background: `url(${textureUrlRef.current})`,
            backgroundSize: '200% 100%',
            backgroundPosition: 'right center',
            borderRadius: 0,
            borderLeft: 'none',
            boxShadow: isOpened
              ? 'inset 8px 0 16px rgba(0,0,0,0.4)'
              : 'inset 3px 0 6px rgba(0,0,0,0.2)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: '0%',
            width: '100%',
            height: capHeight,
            background: `linear-gradient(225deg, rgba(245,158,11,0.95) 0%, rgba(217,119,6,0.95) 50%, rgba(180,83,9,0.95) 100%)`,
            borderRadius: `0 ${halfWidth}px ${halfWidth}px 0`,
            boxShadow: `
              inset -2px 2px 4px rgba(255,255,255,0.4),
              inset 2px -2px 4px rgba(0,0,0,0.3),
              0 2px 4px rgba(0,0,0,0.3)
            `,
            filter: 'brightness(0.6)',
            borderRadius: `0 ${halfWidth}px 0 0`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: capHeight - sealHeight / 2,
            right: '0%',
            width: '100%',
            height: sealHeight,
            background: 'linear-gradient(180deg, rgba(251,191,36,0.9) 0%, rgba(245,158,11,0.9) 50%, rgba(217,119,6,0.9) 100%)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)',
            zIndex: 2,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: capHeight + bodyHeight - sealHeight / 2,
            right: '0%',
            width: '100%',
            height: sealHeight,
            background: 'linear-gradient(180deg, rgba(251,191,36,0.9) 0%, rgba(245,158,11,0.9) 50%, rgba(217,119,6,0.9) 100%)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)',
            zIndex: 2,
          }}
        />
      </div>

      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: '50%',
            opacity: p.opacity,
            pointerEvents: 'none',
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
          }}
        />
      ))}
    </div>
  );
};

export default Capsule3D;
