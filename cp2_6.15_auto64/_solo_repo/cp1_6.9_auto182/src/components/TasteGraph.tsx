import React, { useRef, useEffect, useState, useMemo } from 'react';

interface Particle {
  x: number;
  y: number;
  color: string;
  radius: number;
  isGold?: boolean;
}

interface Props {
  particles: Particle[];
  size?: number;
  thumbnail?: boolean;
}

const TasteGraph: React.FC<Props> = ({ particles, size = 300, thumbnail = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const phaseRef = useRef<'enter' | 'idle'>('enter');
  const startTimeRef = useRef<number>(0);
  const startPositionsRef = useRef<{ x: number; y: number }[]>([]);
  const particleKey = useMemo(() => particles.map((p) => `${p.x},${p.y},${p.color}`).join('|'), [particles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const logicalSize = size;
    canvas.width = logicalSize * dpr;
    canvas.height = logicalSize * dpr;
    canvas.style.width = `${logicalSize}px`;
    canvas.style.height = `${logicalSize}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const scale = logicalSize / 300;
    const center = logicalSize / 2;

    const hasGold = particles.some((p) => p.isGold);

    if (startPositionsRef.current.length !== particles.length) {
      startPositionsRef.current = particles.map(() => {
        const angle = Math.random() * Math.PI * 2;
        const dist = logicalSize * 0.7;
        return {
          x: center + Math.cos(angle) * dist,
          y: center + Math.sin(angle) * dist,
        };
      });
    }

    phaseRef.current = thumbnail ? 'idle' : 'enter';
    startTimeRef.current = performance.now();

    const enterDuration = thumbnail ? 0 : 1500;

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const draw = (now: number) => {
      ctx.clearRect(0, 0, logicalSize, logicalSize);

      if (!thumbnail) {
        const bgGrad = ctx.createRadialGradient(center, center, 0, center, center, center);
        bgGrad.addColorStop(0, 'rgba(255,235,214,0.6)');
        bgGrad.addColorStop(1, 'rgba(255,248,240,0.1)');
        ctx.fillStyle = bgGrad;
        ctx.beginPath();
        ctx.arc(center, center, center - 2, 0, Math.PI * 2);
        ctx.fill();
      }

      let enterProgress = 1;
      if (phaseRef.current === 'enter') {
        const elapsed = now - startTimeRef.current;
        enterProgress = Math.min(1, elapsed / enterDuration);
        if (enterProgress >= 1) {
          phaseRef.current = 'idle';
        }
        enterProgress = easeOutCubic(enterProgress);
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const targetX = (p.x / 300) * logicalSize;
        const targetY = (p.y / 300) * logicalSize;
        const r = p.radius * scale;

        let drawX: number;
        let drawY: number;

        if (phaseRef.current === 'enter' && enterProgress < 1) {
          const sp = startPositionsRef.current[i];
          drawX = sp.x + (targetX - sp.x) * enterProgress;
          drawY = sp.y + (targetY - sp.y) * enterProgress;
        } else {
          drawX = targetX;
          drawY = targetY;
        }

        if (p.isGold) {
          const goldCycle = (now / 500) % 1;
          const blinkOpacity = 0.5 + 0.5 * (0.5 + 0.5 * Math.sin(goldCycle * Math.PI * 2));
          ctx.save();
          ctx.shadowColor = '#FFD700';
          ctx.shadowBlur = 12 * scale;
          ctx.globalAlpha = blinkOpacity;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(drawX, drawY, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(drawX, drawY, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (!thumbnail) {
        ctx.strokeStyle = 'rgba(255,140,66,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(center, center, center - 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (thumbnail) {
        ctx.fillStyle = 'rgba(255,248,240,0.95)';
        ctx.fillRect(0, 0, logicalSize, logicalSize);

        const tm = Math.min(enterDuration > 0 ? 1 : 1, 1);
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          const targetX = (p.x / 300) * logicalSize;
          const targetY = (p.y / 300) * logicalSize;
          const r = Math.max(1.2, p.radius * scale * 0.8);

          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(targetX, targetY, r, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.strokeStyle = 'rgba(255,140,66,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(center, center, center - 2, 0, Math.PI * 2);
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [particleKey, size, thumbnail]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        borderRadius: thumbnail ? 6 : '50%',
        backgroundColor: thumbnail ? '#FFF8F0' : '#FFFFFF',
        ...(thumbnail ? {} : { boxShadow: '0 12px 40px rgba(255,140,66,0.18), inset 0 0 30px rgba(255,235,214,0.5)' }),
      }}
    />
  );
};

export default TasteGraph;
