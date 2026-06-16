import React, { useRef, useEffect, useCallback } from 'react';
import type { GameSnapshot, Note, Particle, TrackId } from '@/types';
import { CONFIG, TRACK_COLORS, TOTEM_COLORS } from '@/types';
import { particleSystem } from '@/utils/ParticleSystem';
import { gameEngine } from '@/GameEngine';

const TRACKS: TrackId[] = ['Q', 'W', 'E'];

interface GameBoardProps {
  gameState: GameSnapshot;
  onRender: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({ gameState, onRender }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);

  const getTotemPosition = useCallback((index: number) => {
    const centerX = CONFIG.CANVAS_SIZE / 2;
    const centerY = CONFIG.CANVAS_SIZE / 2 + 20;
    const totalWidth = CONFIG.TOTEM_COUNT * CONFIG.TOTEM_WIDTH + (CONFIG.TOTEM_COUNT - 1) * CONFIG.TOTEM_SPACING;
    const startX = centerX - totalWidth / 2 + CONFIG.TOTEM_WIDTH / 2;
    return {
      x: startX + index * (CONFIG.TOTEM_WIDTH + CONFIG.TOTEM_SPACING),
      y: centerY,
    };
  }, []);

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D) => {
    const gradient = ctx.createRadialGradient(
      CONFIG.CANVAS_SIZE / 2,
      CONFIG.CANVAS_SIZE / 2,
      0,
      CONFIG.CANVAS_SIZE / 2,
      CONFIG.CANVAS_SIZE / 2,
      CONFIG.CANVAS_SIZE / 2
    );
    gradient.addColorStop(0, '#2d1b0e');
    gradient.addColorStop(1, '#1a0a00');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CONFIG.CANVAS_SIZE, CONFIG.CANVAS_SIZE);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
    for (let i = 0; i < 50; i++) {
      const x = (i * 137) % CONFIG.CANVAS_SIZE;
      const y = (i * 89) % CONFIG.CANVAS_SIZE;
      const size = 2 + (i % 3);
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  const drawTotem = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    colorIndex: number,
    track: TrackId,
    flameIntensity: number
  ) => {
    const totemColor = TOTEM_COLORS[colorIndex % TOTEM_COLORS.length];
    const w = CONFIG.TOTEM_WIDTH;
    const h = CONFIG.TOTEM_HEIGHT;
    const topY = y - h / 2;

    ctx.fillStyle = '#1a0a00';
    ctx.fillRect(x - w / 2 + 4, topY + 4, w, h);

    const totemGradient = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    totemGradient.addColorStop(0, totemColor);
    totemGradient.addColorStop(0.5, shadeColor(totemColor, 20));
    totemGradient.addColorStop(1, shadeColor(totemColor, -20));
    ctx.fillStyle = totemGradient;
    ctx.fillRect(x - w / 2, topY, w, h);

    ctx.strokeStyle = '#c0a060';
    ctx.lineWidth = 2;

    const segmentHeight = h / 5;
    for (let i = 0; i < 5; i++) {
      const segY = topY + i * segmentHeight;

      if (i % 2 === 0) {
        ctx.beginPath();
        for (let j = 0; j <= 3; j++) {
          const wx = x - w / 2 + (j * w) / 3;
          const wy = segY + segmentHeight / 2 + Math.sin(j * Math.PI) * 8;
          if (j === 0) ctx.moveTo(wx, wy);
          else ctx.lineTo(wx, wy);
        }
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(x - w / 2 + 5, segY + segmentHeight - 5);
        ctx.lineTo(x, segY + 5);
        ctx.lineTo(x + w / 2 - 5, segY + segmentHeight - 5);
        ctx.closePath();
        ctx.stroke();
      }
    }

    const topCenterY = topY;
    ctx.fillStyle = '#2a1a0a';
    ctx.beginPath();
    ctx.arc(x, topCenterY, 18, 0, Math.PI * 2);
    ctx.fill();

    if (flameIntensity > 0) {
      ctx.fillStyle = '#ff6600';
      ctx.globalAlpha = Math.min(0.3 + flameIntensity * 0.2, 0.7);
      ctx.beginPath();
      ctx.arc(x, topCenterY, 22 + flameIntensity * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = TRACK_COLORS[track];
    ctx.beginPath();
    ctx.arc(x, topCenterY, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#c0a060';
    ctx.font = "bold 16px 'ZCOOL KuaiLe', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(track, x, topCenterY);
  }, []);

  const drawOrbit = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.strokeStyle = 'rgba(58, 42, 26, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(x, y, CONFIG.ORBIT_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }, []);

  const drawNote = useCallback((ctx: CanvasRenderingContext2D, note: Note) => {
    if (note.hit || note.missed) return;

    const trackIndex = TRACKS.indexOf(note.track);
    const totemPos = getTotemPosition(trackIndex);
    const centerY = totemPos.y - CONFIG.TOTEM_HEIGHT / 2;

    const distance = (1 - note.angle / Math.PI) * CONFIG.ORBIT_RADIUS;
    const nx = totemPos.x + Math.cos(note.angle) * distance;
    const ny = centerY + Math.sin(note.angle) * distance;

    const distToCenter = Math.abs(note.angle - Math.PI);
    const nearCenter = distToCenter < 0.2;

    const glowColor = TRACK_COLORS[note.track];
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = nearCenter ? 15 : 8;

    ctx.fillStyle = nearCenter ? '#ffffff' : glowColor;
    ctx.beginPath();
    ctx.arc(nx, ny, CONFIG.NOTE_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(nx - 3, ny - 3, 4, 0, Math.PI * 2);
    ctx.fill();
  }, [getTotemPosition]);

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D, particles: Particle[]) => {
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, []);

  const drawVictoryEffect = useCallback((ctx: CanvasRenderingContext2D, progress: number) => {
    if (progress <= 0) return;

    const centerX = CONFIG.CANVAS_SIZE / 2;
    const centerY = CONFIG.CANVAS_SIZE / 2;

    const totemAlpha = Math.min(progress * 2, 0.8);
    if (progress < 0.5) {
      ctx.save();
      ctx.globalAlpha = totemAlpha;
      ctx.translate(centerX, centerY);
      ctx.scale(1 + (1 - progress * 2) * 0.3, 1 + (1 - progress * 2) * 0.3);

      ctx.fillStyle = '#ffd700';
      ctx.strokeStyle = '#ffaa00';
      ctx.lineWidth = 4;

      const w = 120;
      const h = 180;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 10);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#8b6914';
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        const sy = -h / 2 + 30 + i * 30;
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 15, sy);
        ctx.lineTo(w / 2 - 15, sy);
        ctx.stroke();
      }

      ctx.fillStyle = '#8b6914';
      ctx.beginPath();
      ctx.arc(0, -h / 2 + 15, 15, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    if (progress > 0.5 && progress < 0.8) {
      const flashAlpha = Math.sin((progress - 0.5) / 0.3 * Math.PI);
      ctx.fillStyle = `rgba(255, 221, 0, ${flashAlpha * 0.5})`;
      ctx.fillRect(0, 0, CONFIG.CANVAS_SIZE, CONFIG.CANVAS_SIZE);
    }

    if (progress > 0.3) {
      ctx.fillStyle = '#ffd700';
      ctx.font = "bold 48px 'ZCOOL KuaiLe', sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 20;
      ctx.fillText('神明悦纳！', centerX, centerY - 80);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#e0c080';
      ctx.font = "24px 'Noto Sans SC', sans-serif";
      ctx.fillText('天降甘霖，部落昌盛', centerX, centerY - 30);
      ctx.fillText('按任意键再次祭祀', centerX, centerY + 20);
    }
  }, []);

  const drawDefeatEffect = useCallback((ctx: CanvasRenderingContext2D) => {
    const centerX = CONFIG.CANVAS_SIZE / 2;
    const centerY = CONFIG.CANVAS_SIZE / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_SIZE, CONFIG.CANVAS_SIZE);

    ctx.font = "bold 48px 'ZCOOL KuaiLe', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeText('神明不悦...', centerX, centerY - 30);

    ctx.fillStyle = '#ff4444';
    ctx.fillText('神明不悦...', centerX, centerY - 30);

    ctx.fillStyle = '#bb9944';
    ctx.font = "24px 'Noto Sans SC', sans-serif";
    ctx.fillText('点击任意键重新祭祀', centerX, centerY + 30);
  }, []);

  const drawIdleEffect = useCallback((ctx: CanvasRenderingContext2D) => {
    const centerX = CONFIG.CANVAS_SIZE / 2;
    const centerY = CONFIG.CANVAS_SIZE / 2;

    ctx.fillStyle = 'rgba(224, 192, 128, 0.9)';
    ctx.font = "bold 36px 'ZCOOL KuaiLe', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('图腾节拍', centerX, centerY - 60);

    ctx.fillStyle = '#c0a060';
    ctx.font = "20px 'Noto Sans SC', sans-serif";
    ctx.fillText('按 Q / W / E 键开始祭祀', centerX, centerY);

    ctx.fillStyle = '#8b7355';
    ctx.font = "16px 'Noto Sans SC', sans-serif";
    ctx.fillText('当音符到达图腾柱中心时按下对应按键', centerX, centerY + 40);
    ctx.fillText('完美命中可累积祭品，取悦神明求得降雨', centerX, centerY + 65);
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawBackground(ctx);

    for (let i = 0; i < TRACKS.length; i++) {
      const pos = getTotemPosition(i);
      const centerY = pos.y - CONFIG.TOTEM_HEIGHT / 2;
      drawOrbit(ctx, pos.x, centerY);
    }

    for (let i = 0; i < TRACKS.length; i++) {
      const pos = getTotemPosition(i);
      const flameEffect = gameState.flameEffects.find(f => f.track === TRACKS[i]);
      drawTotem(ctx, pos.x, pos.y, i, TRACKS[i], flameEffect?.intensity || 0);
    }

    for (const note of gameState.notes) {
      drawNote(ctx, note);
    }

    const particles = particleSystem.getParticles();
    drawParticles(ctx, particles);

    for (const effect of gameState.hitEffects) {
      const trackIndex = TRACKS.indexOf(effect.track);
      const pos = getTotemPosition(trackIndex);
      const centerY = pos.y - CONFIG.TOTEM_HEIGHT / 2;
      const progress = effect.time / effect.duration;

      if (effect.type !== 'miss') {
        ctx.strokeStyle = effect.type === 'perfect' ? '#ffdd00' : '#ffaa00';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 1 - progress;
        ctx.beginPath();
        ctx.arc(pos.x, centerY, 20 + progress * 30, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    if (gameState.gameState === 'idle') {
      drawIdleEffect(ctx);
    }

    if (gameState.gameState === 'transition' && gameState.transitionProgress < 1) {
      const alpha = Math.abs(gameState.transitionProgress - 0.5) * 2;
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - alpha})`;
      ctx.fillRect(0, 0, CONFIG.CANVAS_SIZE, CONFIG.CANVAS_SIZE);
    }

    if (gameState.gameState === 'victory') {
      drawVictoryEffect(ctx, gameState.victoryProgress);
    }

    if (gameState.gameState === 'defeat') {
      drawDefeatEffect(ctx);
    }

    onRender();
  }, [gameState, drawBackground, drawTotem, drawOrbit, drawNote, drawParticles, drawVictoryEffect, drawDefeatEffect, drawIdleEffect, getTotemPosition, onRender]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      if (!container) return;

      const width = window.innerWidth;
      let scale = 1;

      if (width < 700) {
        scale = (width * 0.9) / CONFIG.CANVAS_SIZE;
      }

      scaleRef.current = scale;

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.transform = `scale(${scale})`;
        canvas.style.transformOrigin = 'center center';
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        width={CONFIG.CANVAS_SIZE}
        height={CONFIG.CANVAS_SIZE}
        style={{
          display: 'block',
          imageRendering: 'crisp-edges',
        }}
      />
    </div>
  );
};

function shadeColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}
