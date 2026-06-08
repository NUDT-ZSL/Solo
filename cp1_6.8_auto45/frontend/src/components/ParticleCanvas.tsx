import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { Particle } from '../types';
import { createParticles, updateParticles, drawParticles } from '../particles';

interface ParticleCanvasProps {
  active: boolean;
  x: number;
  y: number;
  onDone?: () => void;
}

export default function ParticleCanvas({ active, x, y, onDone }: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (active) {
      particlesRef.current = createParticles(x, y, 50);
    }
  }, [active, x, y]);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current = updateParticles(particlesRef.current);
      drawParticles(ctx, particlesRef.current);
      if (particlesRef.current.length > 0) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        onDone?.();
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, onDone]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      width={window.innerWidth}
      height={window.innerHeight}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
}
