import React, { useRef, useEffect, useCallback } from 'react';
import { SpellType } from '../game/SpellMatcher';
import { PlayerId } from '../game/GameCore';

interface SpellEffect {
  id: number;
  type: SpellType;
  target: PlayerId;
  startTime: number;
  duration: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

interface SpellEffectLayerProps {
  effects: SpellEffect[];
  onEffectComplete?: (id: number) => void;
}

const MAX_PARTICLES = 200;
const EFFECT_DURATION = 1000;

const SpellEffectLayer: React.FC<SpellEffectLayerProps> = ({ effects, onEffectComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const activeEffectsRef = useRef<Map<number, SpellEffect>>(new Map());
  const animationFrameRef = useRef<number | null>(null);
  const lightningFlashRef = useRef<{ active: boolean; endTime: number } | null>(null);

  const addParticles = useCallback((particles: Particle[]) => {
    const current = particlesRef.current;
    if (current.length + particles.length > MAX_PARTICLES) {
      const toRemove = current.length + particles.length - MAX_PARTICLES;
      particlesRef.current = current.slice(toRemove).concat(particles);
    } else {
      particlesRef.current = current.concat(particles);
    }
  }, []);

  const generateFireballParticles = useCallback((centerX: number, centerY: number): Particle[] => {
    const particles: Particle[] = [];
    const count = 50;
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 2 + Math.random() * 4;
      const size = 3 + Math.random() * 5;
      
      particles.push({
        x: centerX + (Math.random() - 0.5) * 30,
        y: centerY + (Math.random() - 0.5) * 30,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size,
        color: Math.random() > 0.5 ? '#FF4500' : '#FFA500',
        life: 800 + Math.random() * 200,
        maxLife: 1000
      });
    }
    
    return particles;
  }, []);

  const generateIceSpikeParticles = useCallback((centerX: number, centerY: number): Particle[] => {
    const particles: Particle[] = [];
    const count = 40;
    
    for (let i = 0; i < count; i++) {
      const angle = Math.PI / 4 + (Math.random() - 0.5) * Math.PI / 2;
      const speed = 3 + Math.random() * 4;
      const size = 2 + Math.random() * 4;
      
      particles.push({
        x: centerX + (Math.random() - 0.5) * 40,
        y: centerY - 50 - Math.random() * 30,
        vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
        vy: Math.abs(Math.sin(angle) * speed),
        size,
        color: '#00BFFF',
        life: 600 + Math.random() * 300,
        maxLife: 900
      });
    }
    
    return particles;
  }, []);

  const generateThunderEffect = useCallback((targetX: number, targetY: number) => {
    lightningFlashRef.current = {
      active: true,
      endTime: Date.now() + 30
    };
  }, []);

  const generateShieldParticles = useCallback((centerX: number, centerY: number): Particle[] => {
    const particles: Particle[] = [];
    const count = 30;
    const radius = 60;
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const size = 3 + Math.random() * 3;
      
      particles.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: Math.cos(angle) * 0.5,
        vy: Math.sin(angle) * 0.5,
        size,
        color: '#87CEEB',
        life: 1000,
        maxLife: 1000
      });
    }
    
    return particles;
  }, []);

  const generateHealParticles = useCallback((centerX: number, centerY: number): Particle[] => {
    const particles: Particle[] = [];
    const count = 35;
    
    for (let i = 0; i < count; i++) {
      const size = 2 + Math.random() * 4;
      
      particles.push({
        x: centerX + (Math.random() - 0.5) * 60,
        y: centerY + 30 + Math.random() * 20,
        vx: (Math.random() - 0.5) * 1,
        vy: -(1 + Math.random() * 2),
        size,
        color: '#2ECC71',
        life: 800 + Math.random() * 300,
        maxLife: 1100
      });
    }
    
    return particles;
  }, []);

  const generateHasteParticles = useCallback((centerX: number, centerY: number): Particle[] => {
    const particles: Particle[] = [];
    const count = 30;
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 3;
      const size = 2 + Math.random() * 3;
      
      particles.push({
        x: centerX + (Math.random() - 0.5) * 20,
        y: centerY + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        color: '#FFD700',
        life: 500 + Math.random() * 300,
        maxLife: 800
      });
    }
    
    return particles;
  }, []);

  const drawLightning = useCallback((ctx: CanvasRenderingContext2D, startX: number, startY: number, endX: number, endY: number) => {
    ctx.save();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 20;
    
    const segments: { x: number; y: number }[] = [{ x: startX, y: startY }];
    let currentX = startX;
    let currentY = startY;
    const steps = 8;
    
    for (let i = 0; i < steps; i++) {
      const progress = (i + 1) / steps;
      const targetX = startX + (endX - startX) * progress;
      const targetY = startY + (endY - startY) * progress;
      const offset = (1 - progress) * 40 * (Math.random() - 0.5);
      
      currentX = targetX + offset;
      currentY = targetY;
      
      segments.push({ x: currentX, y: currentY });
    }
    
    ctx.beginPath();
    ctx.moveTo(segments[0].x, segments[0].y);
    
    for (let i = 1; i < segments.length; i++) {
      ctx.lineTo(segments[i].x, segments[i].y);
    }
    
    ctx.stroke();
    ctx.restore();
  }, []);

  const drawHexagon = useCallback((ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number) => {
    ctx.save();
    ctx.fillStyle = 'rgba(135, 206, 235, 0.4)';
    ctx.strokeStyle = 'rgba(135, 206, 235, 0.8)';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#87CEEB';
    ctx.shadowBlur = 15;
    
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = Date.now();
    
    const animate = () => {
      const now = Date.now();
      const delta = now - lastTime;
      lastTime = now;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const particles = particlesRef.current;
      const updatedParticles: Particle[] = [];
      
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.life -= delta;
        
        if (p.life > 0) {
          const alpha = p.life / p.maxLife;
          
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          
          updatedParticles.push(p);
        }
      }
      
      particlesRef.current = updatedParticles;
      
      activeEffectsRef.current.forEach((effect, id) => {
        const elapsed = now - effect.startTime;
        const progress = elapsed / effect.duration;
        
        if (progress >= 1) {
          activeEffectsRef.current.delete(id);
          if (onEffectComplete) {
            onEffectComplete(id);
          }
          return;
        }
        
        const targetX = effect.target === 'player1' 
          ? canvas.width * 0.25 
          : canvas.width * 0.75;
        const targetY = canvas.height * 0.35;
        
        switch (effect.type) {
          case 'fireball':
            if (elapsed < 100) {
              addParticles(generateFireballParticles(targetX, targetY));
            }
            break;
            
          case 'iceSpike':
            if (elapsed < 200) {
              addParticles(generateIceSpikeParticles(targetX, targetY));
            }
            break;
            
          case 'thunder':
            if (elapsed < 50 && lightningFlashRef.current?.active) {
              const flashAlpha = 1 - progress;
              ctx.save();
              ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.3})`;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.restore();
              
              drawLightning(ctx, targetX, 0, targetX, targetY);
            }
            if (lightningFlashRef.current && now > lightningFlashRef.current.endTime) {
              lightningFlashRef.current.active = false;
            }
            break;
            
          case 'shield':
            const shieldAlpha = Math.sin(progress * Math.PI) * 0.6 + 0.4;
            ctx.save();
            ctx.globalAlpha = shieldAlpha;
            drawHexagon(ctx, targetX, targetY, 70);
            ctx.restore();
            if (elapsed < 300) {
              addParticles(generateShieldParticles(targetX, targetY));
            }
            break;
            
          case 'heal':
            if (elapsed < 400) {
              addParticles(generateHealParticles(targetX, targetY));
            }
            break;
            
          case 'haste':
            if (elapsed < 300) {
              addParticles(generateHasteParticles(targetX, targetY));
            }
            break;
        }
      });
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [onEffectComplete, addParticles, generateFireballParticles, generateIceSpikeParticles, generateShieldParticles, generateHealParticles, generateHasteParticles, drawLightning, drawHexagon]);

  useEffect(() => {
    const now = Date.now();
    
    for (const effect of effects) {
      if (!activeEffectsRef.current.has(effect.id)) {
        activeEffectsRef.current.set(effect.id, {
          ...effect,
          startTime: now,
          duration: EFFECT_DURATION
        });
        
        if (effect.type === 'thunder') {
          generateThunderEffect(0, 0);
        }
      }
    }
  }, [effects, generateThunderEffect]);

  return (
    <canvas
      ref={canvasRef}
      className="spell-effect-layer"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 100
      }}
    />
  );
};

export default SpellEffectLayer;
export type { SpellEffect };
