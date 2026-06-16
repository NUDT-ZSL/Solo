import React, { useEffect, useRef } from 'react';
import type { CombatState, SpellDefinition } from '../combat';
import { ELEMENT_COLORS } from '../gameLogic';
import type { ElementType } from '../gameLogic';

interface ArenaProps {
  combat: CombatState;
  castingSpell?: {
    spell: SpellDefinition;
    casterIndex: 0 | 1;
    targetIndex: 0 | 1;
    isCountered: boolean;
    phase: 'icons' | 'beam' | 'explosion' | 'shake' | 'hit' | 'victory';
    progress: number;
  } | null;
  onAnimationComplete?: () => void;
}

interface FloatParticle {
  x: number;
  y: number;
  size: number;
  baseY: number;
  phase: number;
  speed: number;
}

interface BeamParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const ARENA_WIDTH = 700;
const ARENA_HEIGHT = 400;
const PLATFORM_CX = ARENA_WIDTH / 2;
const PLATFORM_CY = ARENA_HEIGHT - 100;
const PLATFORM_RX = 200;
const PLATFORM_RY = 80;

function getCharacterPosition(index: 0 | 1) {
  const x = index === 0 ? PLATFORM_CX - 130 : PLATFORM_CX + 130;
  const y = PLATFORM_CY - 30;
  return { x, y };
}

const Arena: React.FC<ArenaProps> = ({ combat, castingSpell, onAnimationComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const floatParticlesRef = useRef<FloatParticle[]>([]);
  const beamParticlesRef = useRef<BeamParticle[]>([]);
  const startTsRef = useRef<number>(0);
  const phaseStartedRef = useRef<{ [key: string]: number }>({});
  const shakeOffsetRef = useRef<number>(0);
  const hitFlashRef = useRef<{ target: 0 | 1 | null; until: number }>({ target: null, until: 0 });

  const castingSpellRef = useRef(castingSpell);
  castingSpellRef.current = castingSpell;

  const combatRef = useRef(combat);
  combatRef.current = combat;

  useEffect(() => {
    const arr: FloatParticle[] = [];
    for (let i = 0; i < 20; i++) {
      const x = 80 + Math.random() * (ARENA_WIDTH - 160);
      const y = PLATFORM_CY - 30 - Math.random() * 200;
      arr.push({
        x,
        y,
        baseY: y,
        size: 3 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.8,
      });
    }
    floatParticlesRef.current = arr;
  }, []);

  useEffect(() => {
    if (castingSpell && castingSpell.phase === 'icons') {
      startTsRef.current = performance.now();
      phaseStartedRef.current = { icons: performance.now() };
    }
  }, [castingSpell]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (ts: number) => {
      ctx.clearRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

      const t = ts / 1000;

      for (const p of floatParticlesRef.current) {
        p.y = p.baseY + Math.sin(t * p.speed + p.phase) * 10;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(0, 212, 255, 0.5)';
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      const shake = shakeOffsetRef.current;

      ctx.save();
      ctx.translate(shake, 0);

      ctx.beginPath();
      ctx.ellipse(PLATFORM_CX, PLATFORM_CY, PLATFORM_RX, PLATFORM_RY, 0, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(PLATFORM_CX, PLATFORM_CY, 20, PLATFORM_CX, PLATFORM_CY, PLATFORM_RX);
      grad.addColorStop(0, '#4a4a7e');
      grad.addColorStop(1, '#3a3a5e');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = '#6c63ff';
      ctx.shadowColor = '#6c63ff';
      ctx.shadowBlur = 20;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.restore();

      const current = castingSpellRef.current;
      const phaseElapsed = (ts - (phaseStartedRef.current[current?.phase ?? ''] ?? ts)) / 1000;

      if (current) {
        if (current.phase === 'icons' && !phaseStartedRef.current.icons) {
          phaseStartedRef.current.icons = ts;
        }
        if (current.phase === 'beam' && !phaseStartedRef.current.beam) {
          phaseStartedRef.current.beam = ts;
        }
        if (current.phase === 'explosion' && !phaseStartedRef.current.explosion) {
          phaseStartedRef.current.explosion = ts;
          const pos = getCharacterPosition(current.targetIndex);
          beamParticlesRef.current = [];
          for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 * i) / 20 + Math.random() * 0.3;
            const speed = 60 + Math.random() * 100;
            beamParticlesRef.current.push({
              x: pos.x,
              y: pos.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 0.6,
              maxLife: 0.6,
              color: current.spell.color,
              size: 3 + Math.random() * 4,
            });
          }
          shakeOffsetRef.current = 5;
          hitFlashRef.current = current.isCountered
            ? { target: current.targetIndex, until: ts + 300 }
            : { target: null, until: 0 };
        }
      }

      for (let i = 0; i < 2; i++) {
        const idx = i as 0 | 1;
        drawCharacter(ctx, idx, combatRef.current, ts, hitFlashRef.current);
      }

      if (current) {
        const caster = getCharacterPosition(current.casterIndex);
        const target = getCharacterPosition(current.targetIndex);

        if (current.phase === 'icons') {
          const iconsElapsed = (ts - (phaseStartedRef.current.icons ?? ts)) / 1000;
          const elements = current.spell.elements as ElementType[];
          elements.forEach((e, i) => {
            const p = Math.max(0, Math.min(1, (iconsElapsed - i * 0.1) / 0.8));
            const scale = 0.5 + p * 1.5;
            const alpha = 1 - p;
            if (p <= 0 || alpha <= 0) return;
            ctx.save();
            ctx.translate(caster.x + (i - (elements.length - 1) / 2) * 40, caster.y - 80);
            ctx.beginPath();
            ctx.fillStyle = ELEMENT_COLORS[e] + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            ctx.shadowColor = ELEMENT_COLORS[e];
            ctx.shadowBlur = 20;
            ctx.arc(0, 0, 15 * scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          });
        }

        if (current.phase === 'beam') {
          const beamElapsed = (ts - (phaseStartedRef.current.beam ?? ts)) / 1000;
          const p = Math.max(0, Math.min(1, beamElapsed / 0.3));
          const startX = caster.x;
          const startY = caster.y - 30;
          const endX = target.x;
          const endY = target.y - 30;
          const bx = startX + (endX - startX) * p;
          const by = startY + (endY - startY) * p;
          const angle = Math.atan2(endY - startY, endX - startX);

          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(angle);
          const len = 60;
          const beamGrad = ctx.createLinearGradient(-len / 2, 0, len / 2, 0);
          beamGrad.addColorStop(0, 'transparent');
          beamGrad.addColorStop(0.5, current.spell.color);
          beamGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = beamGrad;
          ctx.shadowColor = current.spell.color;
          ctx.shadowBlur = 20;
          ctx.fillRect(-len / 2, -5, len, 10);
          ctx.restore();
        }

        if (current.phase === 'explosion') {
          const dt = 1 / 60;
          for (const p of beamParticlesRef.current) {
            if (p.life <= 0) continue;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 30 * dt;
            p.life -= dt;
            const a = Math.max(0, p.life / p.maxLife);
            ctx.save();
            ctx.globalAlpha = a;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }

        if (current.phase === 'victory' && combatRef.current.winner !== null) {
          if (!phaseStartedRef.current.victory) {
            phaseStartedRef.current.victory = ts;
          }
          const vElapsed = (ts - phaseStartedRef.current.victory) / 1000;
          const p = Math.max(0, Math.min(1, vElapsed / 1.2));
          const winner = getCharacterPosition(combatRef.current.winner as 0 | 1);
          const radius = p * 80;
          const alpha = 0.8 * (1 - p);
          ctx.save();
          ctx.translate(winner.x, winner.y - 20);
          ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
          ctx.lineWidth = 4;
          ctx.shadowColor = '#ffd700';
          ctx.shadowBlur = 30;
          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      const shakeDecay = 1 / 60 / 0.2;
      shakeOffsetRef.current *= 1 - shakeDecay;
      if (Math.abs(shakeOffsetRef.current) < 0.05) shakeOffsetRef.current = 0;

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  useEffect(() => {
    if (!castingSpell) return;
    const timers: number[] = [];
    if (castingSpell.phase === 'icons') {
      timers.push(
        window.setTimeout(() => {
          onAnimationComplete?.();
        }, 800),
      );
    } else if (castingSpell.phase === 'beam') {
      timers.push(
        window.setTimeout(() => {
          onAnimationComplete?.();
        }, 300),
      );
    } else if (castingSpell.phase === 'explosion') {
      timers.push(
        window.setTimeout(() => {
          onAnimationComplete?.();
        }, 600),
      );
    } else if (castingSpell.phase === 'victory') {
      timers.push(
        window.setTimeout(() => {
          onAnimationComplete?.();
        }, 1200),
      );
    }
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [castingSpell, onAnimationComplete]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <canvas
        ref={canvasRef}
        width={ARENA_WIDTH}
        height={ARENA_HEIGHT}
        style={{ maxWidth: '100%', display: 'block' }}
      />
    </div>
  );
};

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  idx: 0 | 1,
  combat: CombatState,
  ts: number,
  hitFlash: { target: 0 | 1 | null; until: number },
) {
  const pos = getCharacterPosition(idx);
  const char = combat.characters[idx];
  let rotation = 0;
  if (combat.winner === idx) {
    const phase = combat.currentPlayerIndex === idx ? 1 : 1;
    const elapsed = ts / 1000;
    rotation = (elapsed * Math.PI * 2) % (Math.PI * 2);
    void phase;
  }
  const isHit = hitFlash.target === idx && ts < hitFlash.until;
  const flashOn = isHit ? Math.floor((hitFlash.until - ts) / 100) % 2 === 0 : false;

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(rotation);

  ctx.save();
  ctx.beginPath();
  const haloGrad = ctx.createRadialGradient(0, -50, 5, 0, -50, 30);
  haloGrad.addColorStop(0, char.haloColor + 'aa');
  haloGrad.addColorStop(1, char.haloColor + '00');
  ctx.fillStyle = haloGrad;
  ctx.arc(0, -50, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  const bodyGrad = ctx.createRadialGradient(-8, -8, 5, 0, 0, 40);
  bodyGrad.addColorStop(0, lighten(char.bodyColor, 40));
  bodyGrad.addColorStop(1, char.bodyColor);
  ctx.fillStyle = bodyGrad;
  ctx.shadowColor = char.bodyColor;
  ctx.shadowBlur = 15;
  ctx.arc(0, 0, 35, 0, Math.PI * 2);
  ctx.fill();

  if (flashOn) {
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 5;
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 20;
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();

  ctx.save();
  ctx.fillStyle = '#e0e0ff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(char.name, pos.x, pos.y + 60);
  if (combat.currentPlayerIndex === idx && combat.winner === null) {
    const bounce = Math.sin(ts / 200) * 3;
    ctx.fillStyle = '#ffaa00';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('⬆ 当前回合', pos.x, pos.y + 78 + bounce);
  }
  ctx.restore();
}

function lighten(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const r = Math.min(255, parseInt(h.slice(0, 2), 16) + amount);
  const g = Math.min(255, parseInt(h.slice(2, 4), 16) + amount);
  const b = Math.min(255, parseInt(h.slice(4, 6), 16) + amount);
  return `rgb(${r},${g},${b})`;
}

export default Arena;
