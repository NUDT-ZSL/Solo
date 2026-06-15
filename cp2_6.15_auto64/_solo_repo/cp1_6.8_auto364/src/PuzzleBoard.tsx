import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  FragmentData,
  LevelConfig,
  Particle,
  PulseLine,
  isFragmentCorrect,
  createGoldParticles,
  createPulseLine,
  createCompletionParticles,
} from './utils/puzzleLogic';

interface PuzzleBoardProps {
  level: LevelConfig;
  fragments: FragmentData[];
  onFragmentRotate: (id: number) => void;
  onFragmentLock: (id: number) => void;
  energy: number;
  hintIndex: number | null;
  onComplete: () => void;
}

class AudioEngine {
  private ctx: AudioContext | null = null;

  private ensureCtx() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  playRotate() {
    try {
      const ctx = this.ensureCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(380, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch (_) {}
  }

  playLock() {
    try {
      const ctx = this.ensureCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (_) {}
  }

  playComplete() {
    try {
      const ctx = this.ensureCtx();
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + i * 0.15 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.6);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.6);
      });
    } catch (_) {}
  }
}

const audio = new AudioEngine();

const PuzzleBoard: React.FC<PuzzleBoardProps> = ({
  level,
  fragments,
  onFragmentRotate,
  onFragmentLock,
  energy,
  hintIndex,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const pulseLinesRef = useRef<PulseLine[]>([]);
  const dragRef = useRef<{
    id: number;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const hoverRef = useRef<number | null>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const completeRef = useRef(false);
  const completionTimerRef = useRef<number>(0);

  const getGridOrigin = useCallback(() => {
    const gs = level.gridSize;
    const fs = level.fragmentSize;
    const totalW = gs * fs;
    const totalH = gs * fs;
    return {
      x: (size.w - totalW) / 2,
      y: (size.h - totalH) / 2,
    };
  }, [level.gridSize, level.fragmentSize, size]);

  const getFragmentScreenPos = useCallback(
    (frag: FragmentData) => {
      const origin = getGridOrigin();
      return {
        x: origin.x + frag.gridX * level.fragmentSize,
        y: origin.y + frag.gridY * level.fragmentSize,
      };
    },
    [getGridOrigin, level.fragmentSize]
  );

  const hitTest = useCallback(
    (mx: number, my: number): number | null => {
      const fs = level.fragmentSize;
      for (let i = fragments.length - 1; i >= 0; i--) {
        const frag = fragments[i];
        if (frag.isLocked) continue;
        const pos = getFragmentScreenPos(frag);
        if (mx >= pos.x && mx <= pos.x + fs && my >= pos.y && my <= pos.y + fs) {
          return i;
        }
      }
      return null;
    },
    [fragments, level.fragmentSize, getFragmentScreenPos]
  );

  useEffect(() => {
    const handleResize = () => {
      const el = canvasRef.current?.parentElement;
      if (el) {
        setSize({ w: el.clientWidth, h: el.clientHeight });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawPaperTexture = (ctx: CanvasRenderingContext2D) => {
      const grad = ctx.createLinearGradient(0, 0, size.w, size.h);
      grad.addColorStop(0, '#f5e6c8');
      grad.addColorStop(0.5, '#e8d5a8');
      grad.addColorStop(1, '#dcc89a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size.w, size.h);

      ctx.globalAlpha = 0.03;
      for (let i = 0; i < 600; i++) {
        const x = Math.random() * size.w;
        const y = Math.random() * size.h;
        ctx.fillStyle = Math.random() > 0.5 ? '#8b7355' : '#a08060';
        ctx.fillRect(x, y, 1 + Math.random() * 2, 1);
      }
      ctx.globalAlpha = 1;
    };

    const drawFragment = (
      ctx: CanvasRenderingContext2D,
      frag: FragmentData,
      time: number
    ) => {
      const pos = getFragmentScreenPos(frag);
      const fs = level.fragmentSize;
      const isHover = hoverRef.current === frag.id;
      const isHint = hintIndex === frag.id;
      const scale = isHover ? 1.04 : 1;
      const correct = isFragmentCorrect(frag);

      ctx.save();

      const cx = pos.x + fs / 2;
      const cy = pos.y + fs / 2;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((frag.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);

      const pulseAlpha = 0.08 + 0.04 * Math.sin(time * 2 + frag.pulsePhase);
      ctx.shadowColor = frag.glowColor;
      ctx.shadowBlur = frag.isLocked ? 15 : (isHover ? 20 : 8 + 4 * Math.sin(time * 3 + frag.pulsePhase));

      ctx.fillStyle = frag.isLocked
        ? 'rgba(60, 45, 25, 0.85)'
        : 'rgba(50, 38, 20, 0.75)';
      ctx.strokeStyle = frag.isLocked
        ? 'rgba(200, 164, 78, 0.9)'
        : correct
          ? 'rgba(200, 164, 78, 0.6)'
          : 'rgba(160, 128, 60, 0.4)';
      ctx.lineWidth = frag.isLocked ? 2 : 1.5;

      const r = 6;
      const fx = pos.x + 3;
      const fy = pos.y + 3;
      const fw = fs - 6;
      const fh = fs - 6;
      ctx.beginPath();
      ctx.moveTo(fx + r, fy);
      ctx.lineTo(fx + fw - r, fy);
      ctx.quadraticCurveTo(fx + fw, fy, fx + fw, fy + r);
      ctx.lineTo(fx + fw, fy + fh - r);
      ctx.quadraticCurveTo(fx + fw, fy + fh, fx + fw - r, fy + fh);
      ctx.lineTo(fx + r, fy + fh);
      ctx.quadraticCurveTo(fx, fy + fh, fx, fy + fh - r);
      ctx.lineTo(fx, fy + r);
      ctx.quadraticCurveTo(fx, fy, fx + r, fy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;

      ctx.globalAlpha = pulseAlpha;
      ctx.fillStyle = frag.glowColor;
      ctx.fill();
      ctx.globalAlpha = 1;

      for (const path of frag.runePaths) {
        if (path.points.length < 2) continue;
        ctx.beginPath();
        const p0 = path.points[0];
        ctx.moveTo(pos.x + p0[0] * fs, pos.y + p0[1] * fs);
        for (let i = 1; i < path.points.length; i++) {
          const p = path.points[i];
          ctx.lineTo(pos.x + p[0] * fs, pos.y + p[1] * fs);
        }
        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = frag.isLocked ? 1 : 0.7;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      const edgeLen = fs * 0.12;
      ctx.strokeStyle = 'rgba(200,164,78,0.5)';
      ctx.lineWidth = 2;
      const edges = frag.edges;
      if (edges[0]) {
        ctx.beginPath();
        ctx.moveTo(cx - edgeLen, pos.y + 3);
        ctx.lineTo(cx + edgeLen, pos.y + 3);
        ctx.stroke();
      }
      if (edges[1]) {
        ctx.beginPath();
        ctx.moveTo(pos.x + fs - 3, cy - edgeLen);
        ctx.lineTo(pos.x + fs - 3, cy + edgeLen);
        ctx.stroke();
      }
      if (edges[2]) {
        ctx.beginPath();
        ctx.moveTo(cx - edgeLen, pos.y + fs - 3);
        ctx.lineTo(cx + edgeLen, pos.y + fs - 3);
        ctx.stroke();
      }
      if (edges[3]) {
        ctx.beginPath();
        ctx.moveTo(pos.x + 3, cy - edgeLen);
        ctx.lineTo(pos.x + 3, cy + edgeLen);
        ctx.stroke();
      }

      ctx.restore();

      if (isHint && !frag.isLocked) {
        const hintAlpha = 0.3 + 0.2 * Math.sin(time * 4);
        ctx.strokeStyle = `rgba(255, 215, 0, ${hintAlpha})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(pos.x + 2, pos.y + 2, fs - 4, fs - 4);
        ctx.setLineDash([]);
      }

      if (!frag.isLocked) {
        const pCount = 3;
        for (let i = 0; i < pCount; i++) {
          const t = (time * 0.5 + i / pCount + frag.pulsePhase) % 1;
          const px = pos.x + 10 + Math.sin(t * Math.PI * 2 + frag.id) * (fs - 20);
          const py = pos.y + 10 + Math.cos(t * Math.PI * 3 + frag.id * 2) * (fs - 20);
          const alpha = Math.sin(t * Math.PI) * 0.5;
          ctx.beginPath();
          ctx.arc(px, py, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(230, 195, 106, ${alpha})`;
          ctx.fill();
        }
      }

      ctx.restore();
    };

    const drawPulseLines = (ctx: CanvasRenderingContext2D, dt: number) => {
      const lines = pulseLinesRef.current;
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        line.life -= dt / line.maxLife;
        if (line.life <= 0) {
          pulseLinesRef.current.splice(i, 1);
          continue;
        }
        const alpha = line.life;
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.strokeStyle = `rgba(255, 215, 0, ${alpha * 0.8})`;
        ctx.lineWidth = 3 * alpha;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 10 * alpha;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    };

    const drawParticles = (ctx: CanvasRenderingContext2D, dt: number) => {
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.life -= dt / p.maxLife;
        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }
        p.alpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
    };

    const drawCompletionEffect = (ctx: CanvasRenderingContext2D, time: number) => {
      if (!completeRef.current) return;
      const elapsed = time - completionTimerRef.current;
      if (elapsed > 3) return;

      const alpha = elapsed < 0.5 ? elapsed / 0.5 : elapsed > 2.5 ? (3 - elapsed) / 0.5 : 1;
      const grad = ctx.createRadialGradient(size.w / 2, size.h / 2, 0, size.w / 2, size.h / 2, size.w * 0.6);
      grad.addColorStop(0, `rgba(255, 215, 0, ${alpha * 0.3})`);
      grad.addColorStop(0.5, `rgba(255, 180, 0, ${alpha * 0.1})`);
      grad.addColorStop(1, `rgba(255, 215, 0, 0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size.w, size.h);

      const chars = ['道', '德', '仁', '义', '礼', '智', '信', '天', '地', '人'];
      ctx.font = '28px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < chars.length; i++) {
        const angle = (Math.PI * 2 * i) / chars.length + elapsed * 0.5;
        const radius = 80 + elapsed * 60;
        const tx = size.w / 2 + Math.cos(angle) * radius;
        const ty = size.h / 2 + Math.sin(angle) * radius;
        const charAlpha = Math.max(0, alpha - 0.3) * (1 - elapsed / 3);
        ctx.fillStyle = `rgba(255, 215, 0, ${charAlpha})`;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 8;
        ctx.fillText(chars[i], tx, ty);
        ctx.shadowBlur = 0;
      }
    };

    const drawEnergyFlow = (ctx: CanvasRenderingContext2D, time: number) => {
      const origin = getGridOrigin();
      const gs = level.gridSize;
      const fs = level.fragmentSize;
      const totalW = gs * fs;
      const totalH = gs * fs;

      ctx.strokeStyle = 'rgba(200, 164, 78, 0.08)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx <= gs; gx++) {
        const x = origin.x + gx * fs;
        ctx.beginPath();
        ctx.moveTo(x, origin.y);
        ctx.lineTo(x, origin.y + totalH);
        ctx.stroke();
      }
      for (let gy = 0; gy <= gs; gy++) {
        const y = origin.y + gy * fs;
        ctx.beginPath();
        ctx.moveTo(origin.x, y);
        ctx.lineTo(origin.x + totalW, y);
        ctx.stroke();
      }
    };

    let lastTime = performance.now();

    const animate = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      timeRef.current += dt;

      ctx.clearRect(0, 0, size.w, size.h);
      drawPaperTexture(ctx);
      drawEnergyFlow(ctx, timeRef.current);

      const sorted = [...fragments].sort((a, b) => {
        if (a.isLocked && !b.isLocked) return -1;
        if (!a.isLocked && b.isLocked) return 1;
        return 0;
      });

      for (const frag of sorted) {
        drawFragment(ctx, frag, timeRef.current);
      }

      drawPulseLines(ctx, dt);
      drawParticles(ctx, dt);
      drawCompletionEffect(ctx, timeRef.current);

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [fragments, level, size, hintIndex, getFragmentScreenPos, getGridOrigin]);

  useEffect(() => {
    const allLocked = fragments.every(f => f.isLocked);
    if (allLocked && fragments.length > 0 && !completeRef.current) {
      completeRef.current = true;
      completionTimerRef.current = timeRef.current;
      audio.playComplete();
      particlesRef.current = createCompletionParticles(size.w, size.h);
      onComplete();
      const timer = setTimeout(() => {
        completeRef.current = false;
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [fragments, size.w, size.h, onComplete]);

  useEffect(() => {
    completeRef.current = false;
  }, [level.id]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const idx = hitTest(mx, my);
      if (idx !== null && !fragments[idx].isLocked) {
        const frag = fragments[idx];
        const pos = getFragmentScreenPos(frag);
        dragRef.current = {
          id: frag.id,
          offsetX: mx - pos.x,
          offsetY: my - pos.y,
          startX: mx,
          startY: my,
          moved: false,
        };
      }
    },
    [fragments, hitTest, getFragmentScreenPos]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      if (dragRef.current) {
        const dx = mx - dragRef.current.startX;
        const dy = my - dragRef.current.startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          dragRef.current.moved = true;
        }
      } else {
        const idx = hitTest(mx, my);
        hoverRef.current = idx !== null ? fragments[idx]?.id ?? null : null;
      }
    },
    [fragments, hitTest]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!dragRef.current) return;
      const wasDrag = dragRef.current.moved;
      const fragId = dragRef.current.id;
      dragRef.current = null;

      if (!wasDrag) {
        const frag = fragments.find(f => f.id === fragId);
        if (frag && !frag.isLocked) {
          if (energy >= level.energyCost) {
            onFragmentRotate(fragId);
            audio.playRotate();

            setTimeout(() => {
              const updatedFrag = fragments.find(f => f.id === fragId);
              if (updatedFrag && isFragmentCorrect(updatedFrag)) {
                onFragmentLock(fragId);
                audio.playLock();

                const pos = getFragmentScreenPos(updatedFrag);
                const fs = level.fragmentSize;
                const cx = pos.x + fs / 2;
                const cy = pos.y + fs / 2;
                particlesRef.current.push(...createGoldParticles(cx, cy, 20));

                const origin = getGridOrigin();
                const gs = level.gridSize;
                const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
                for (const [dx, dy] of dirs) {
                  const nx = updatedFrag.gridX + dx;
                  const ny = updatedFrag.gridY + dy;
                  if (nx >= 0 && nx < gs && ny >= 0 && ny < gs) {
                    const neighbor = fragments.find(f => f.gridX === nx && f.gridY === ny);
                    if (neighbor && neighbor.isLocked) {
                      const nPos = getFragmentScreenPos(neighbor);
                      pulseLinesRef.current.push(
                        createPulseLine(cx, cy, nPos.x + fs / 2, nPos.y + fs / 2)
                      );
                    }
                  }
                }
              }
            }, 50);
          }
        }
      }
    },
    [fragments, energy, level, onFragmentRotate, onFragmentLock, getFragmentScreenPos, getGridOrigin]
  );

  const handleMouseLeave = useCallback(() => {
    hoverRef.current = null;
    dragRef.current = null;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={size.w}
      height={size.h}
      style={{ display: 'block', width: '100%', height: '100%', cursor: 'pointer' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    />
  );
};

export default PuzzleBoard;
