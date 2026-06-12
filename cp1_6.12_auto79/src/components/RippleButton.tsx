import React, { useRef, useCallback } from 'react';
import { RippleState, RIPPLE_DURATION } from '../types';

interface RippleButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const RippleButton: React.FC<RippleButtonProps> = ({ onClick, children, style }) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const ripplesRef = useRef<RippleState[]>([]);
  const animFrameRef = useRef<number>(0);

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ripplesRef.current.push({
      x,
      y,
      startTime: performance.now(),
      duration: RIPPLE_DURATION,
    });

    if (!animFrameRef.current) {
      animateRipples();
    }

    onClick(e);
  }, [onClick]);

  const animateRipples = () => {
    if (!btnRef.current) return;
    const canvas = btnRef.current.querySelector('canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const now = performance.now();
    ripplesRef.current = ripplesRef.current.filter(r => now - r.startTime < r.duration);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const ripple of ripplesRef.current) {
      const elapsed = now - ripple.startTime;
      const t = elapsed / ripple.duration;
      const radius = t * Math.max(canvas.width, canvas.height) * 0.8;
      const alpha = 1 - t;

      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.4})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (ripplesRef.current.length > 0) {
      animFrameRef.current = requestAnimationFrame(animateRipples);
    } else {
      animFrameRef.current = 0;
    }
  };

  return (
    <button
      ref={btnRef}
      onClick={handleClick}
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
      <canvas
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
        width={200}
        height={40}
      />
    </button>
  );
};

export default RippleButton;
