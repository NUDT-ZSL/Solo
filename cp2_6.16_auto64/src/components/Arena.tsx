import React, { useCallback, useEffect, useRef } from 'react';
import type { CombatState, SpellDefinition } from '../combat';
import { ELEMENT_COLORS } from '../gameLogic';
import type { ElementType } from '../gameLogic';

type AnimPhase = 'icons' | 'beam' | 'explosion' | 'victory';

interface ArenaProps {
  combat: CombatState;
  castingSpell?: {
    spell: SpellDefinition;
    casterIndex: 0 | 1;
    targetIndex: 0 | 1;
    isCountered: boolean;
    phase: AnimPhase;
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

interface ExplosionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const ARENA_W = 700;
const ARENA_H = 400;
const PLAT_CX = ARENA_W / 2;
const PLAT_CY = ARENA_H - 100;
const PLAT_RX = 200;
const PLAT_RY = 80;
const MAX_FLOAT_PARTICLES = 20;
const MAX_EXPLOSION_PARTICLES = 20;
const TARGET_FPS = 60;
const FRAME_DURATION = 1000 / TARGET_FPS;

function charPos(index: 0 | 1) {
  return {
    x: index === 0 ? PLAT_CX - 130 : PLAT_CX + 130,
    y: PLAT_CY - 30,
  };
}

const Arena: React.FC<ArenaProps> = ({ combat, castingSpell, onAnimationComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const mountedRef = useRef(true);
  const lastTsRef = useRef(0);
  const floatRef = useRef<FloatParticle[]>([]);
  const explodeRef = useRef<ExplosionParticle[]>([]);
  const shakeRef = useRef(0);
  const hitFlashRef = useRef<{ target: 0 | 1 | null; until: number }>({ target: null, until: 0 });
  const phaseTsRef = useRef<Record<string, number>>({});

  const combatRef = useRef(combat);
  combatRef.current = combat;
  const spellRef = useRef(castingSpell);
  spellRef.current = castingSpell;

  useEffect(() => {
    mountedRef.current = true;
    const arr: FloatParticle[] = [];
    for (let i = 0; i < MAX_FLOAT_PARTICLES; i++) {
      arr.push({
        x: 80 + Math.random() * (ARENA_W - 160),
        y: PLAT_CY - 30 - Math.random() * 200,
        baseY: 0,
        size: 3 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.8,
      });
      arr[i].baseY = arr[i].y;
    }
    floatRef.current = arr;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (castingSpell) {
      phaseTsRef.current[castingSpell.phase] = performance.now();
    }
  }, [castingSpell]);

  const onCompleteRef = useRef(onAnimationComplete);
  onCompleteRef.current = onAnimationComplete;

  useEffect(() => {
    const timers: number[] = [];
    if (!castingSpell) return;
    const dur: Record<AnimPhase, number> = { icons: 800, beam: 300, explosion: 600, victory: 1200 };
    const t = window.setTimeout(() => {
      if (mountedRef.current) onCompleteRef.current?.();
    }, dur[castingSpell.phase]);
    timers.push(t);
    return () => timers.forEach(clearTimeout);
  }, [castingSpell]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (ts: number) => {
      if (!mountedRef.current) return;

      const rawDt = lastTsRef.current ? (ts - lastTsRef.current) / 1000 : FRAME_DURATION / 1000;
      const dt = Math.min(rawDt, 0.05);
      lastTsRef.current = ts;

      ctx.clearRect(0, 0, ARENA_W, ARENA_H);
      const t = ts / 1000;

      for (const p of floatRef.current) {
        p.y = p.baseY + Math.sin(t * p.speed + p.phase) * 10;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(0, 212, 255, 0.5)';
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      const shake = shakeRef.current;
      ctx.save();
      ctx.translate(shake, 0);

      ctx.beginPath();
      ctx.ellipse(PLAT_CX, PLAT_CY, PLAT_RX, PLAT_RY, 0, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(PLAT_CX, PLAT_CY, 20, PLAT_CX, PLAT_CY, PLAT_RX);
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

      const cur = spellRef.current;

      if (cur && cur.phase === 'explosion' && !phaseTsRef.current._exploded) {
        phaseTsRef.current._exploded = 1;
        const pos = charPos(cur.targetIndex);
        explodeRef.current = [];
        const count = Math.min(MAX_EXPLOSION_PARTICLES, 20);
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
          const speed = 60 + Math.random() * 100;
          explodeRef.current.push({
            x: pos.x,
            y: pos.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.6,
            maxLife: 0.6,
            color: cur.spell.color,
            size: 3 + Math.random() * 4,
          });
        }
        shakeRef.current = 5;
        hitFlashRef.current = cur.isCountered
          ? { target: cur.targetIndex, until: ts + 300 }
          : { target: null, until: 0 };
      }

      for (let i = 0; i < 2; i++) {
        drawChar(ctx, i as 0 | 1, combatRef.current, ts, hitFlashRef.current);
      }

      if (cur) {
        const caster = charPos(cur.casterIndex);
        const target = charPos(cur.targetIndex);

        if (cur.phase === 'icons') {
          const elapsed = (ts - (phaseTsRef.current.icons ?? ts)) / 1000;
          const elems = cur.spell.elements as ElementType[];
          elems.forEach((e, i) => {
            const p = Math.max(0, Math.min(1, (elapsed - i * 0.1) / 0.8));
            const scale = 0.5 + p * 1.5;
            const alpha = 1 - p;
            if (alpha <= 0) return;
            ctx.save();
            ctx.translate(caster.x + (i - (elems.length - 1) / 2) * 40, caster.y - 80);
            ctx.beginPath();
            const hex = Math.floor(alpha * 255).toString(16).padStart(2, '0');
            ctx.fillStyle = ELEMENT_COLORS[e] + hex;
            ctx.shadowColor = ELEMENT_COLORS[e];
            ctx.shadowBlur = 20;
            ctx.arc(0, 0, 15 * scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          });
        }

        if (cur.phase === 'beam') {
          const elapsed = (ts - (phaseTsRef.current.beam ?? ts)) / 1000;
          const p = Math.max(0, Math.min(1, elapsed / 0.3));
          const sx = caster.x, sy = caster.y - 30;
          const ex = target.x, ey = target.y - 30;
          const bx = sx + (ex - sx) * p;
          const by = sy + (ey - sy) * p;
          const angle = Math.atan2(ey - sy, ex - sx);
          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(angle);
          const len = 60;
          const bg = ctx.createLinearGradient(-len / 2, 0, len / 2, 0);
          bg.addColorStop(0, 'transparent');
          bg.addColorStop(0.5, cur.spell.color);
          bg.addColorStop(1, 'transparent');
          ctx.fillStyle = bg;
          ctx.shadowColor = cur.spell.color;
          ctx.shadowBlur = 20;
          ctx.fillRect(-len / 2, -5, len, 10);
          ctx.restore();
        }

        if (cur.phase === 'explosion') {
          for (const p of explodeRef.current) {
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

        if (cur.phase === 'victory' && combatRef.current.winner !== null) {
          const vStart = phaseTsRef.current.victory ?? ts;
          if (!phaseTsRef.current.victory) phaseTsRef.current.victory = ts;
          const vE = (ts - vStart) / 1000;
          const p = Math.max(0, Math.min(1, vE / 1.2));
          const w = charPos(combatRef.current.winner as 0 | 1);
          const r = p * 80;
          const alpha = 0.8 * (1 - p);
          ctx.save();
          ctx.translate(w.x, w.y - 20);
          ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
          ctx.lineWidth = 4;
          ctx.shadowColor = '#ffd700';
          ctx.shadowBlur = 30;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      shakeRef.current *= Math.max(0, 1 - dt / 0.2);
      if (Math.abs(shakeRef.current) < 0.05) shakeRef.current = 0;

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <canvas
        ref={canvasRef}
        width={ARENA_W}
        height={ARENA_H}
        style={{ maxWidth: '100%', display: 'block' }}
      />
    </div>
  );
};

function drawChar(
  ctx: CanvasRenderingContext2D,
  idx: 0 | 1,
  combat: CombatState,
  ts: number,
  hitFlash: { target: 0 | 1 | null; until: number },
) {
  const pos = charPos(idx);
  const char = combat.characters[idx];
  let rot = 0;
  if (combat.winner === idx) {
    rot = (ts / 1000 * Math.PI * 2) % (Math.PI * 2);
  }
  const isHit = hitFlash.target === idx && ts < hitFlash.until;
  const flashOn = isHit ? Math.floor((hitFlash.until - ts) / 100) % 2 === 0 : false;

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(rot);

  ctx.save();
  ctx.beginPath();
  const hg = ctx.createRadialGradient(0, -50, 5, 0, -50, 30);
  hg.addColorStop(0, char.haloColor + 'aa');
  hg.addColorStop(1, char.haloColor + '00');
  ctx.fillStyle = hg;
  ctx.arc(0, -50, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  const bg = ctx.createRadialGradient(-8, -8, 5, 0, 0, 40);
  bg.addColorStop(0, lighten(char.bodyColor, 40));
  bg.addColorStop(1, char.bodyColor);
  ctx.fillStyle = bg;
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

function lighten(hex: string, amt: number): string {
  const h = hex.replace('#', '');
  const r = Math.min(255, parseInt(h.slice(0, 2), 16) + amt);
  const g = Math.min(255, parseInt(h.slice(2, 4), 16) + amt);
  const b = Math.min(255, parseInt(h.slice(4, 6), 16) + amt);
  return `rgb(${r},${g},${b})`;
}

export default Arena;
