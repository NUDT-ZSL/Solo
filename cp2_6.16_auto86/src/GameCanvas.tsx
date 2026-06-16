import { useRef, useEffect, useCallback } from 'react';
import type { GameState, Bubble, Boss, TrackingSpike, Star, Player } from './types';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  STAR_COUNT,
  STAR_MIN_SIZE,
  STAR_MAX_SIZE,
  STAR_MIN_SPEED,
  STAR_MAX_SPEED,
  BOSS_COLOR,
  BOSS_GLOW_COLOR,
  BOSS_SPIKE_LENGTH,
  SPIKE_COLOR,
  PLAYER_COLOR,
  SCORE_PER_SECOND,
} from './constants';

interface GameCanvasProps {
  gameState: GameState;
  player: Player;
  onBubbleClick: (bubbleId: string) => boolean;
  onUpdatePhysics: (
    deltaTime: number,
    gameState: GameState,
    callbacks: {
      onHitSpike: () => void;
      onNextLevel: () => void;
      onDamageBoss: () => void;
      onDefeatBoss: () => void;
    }
  ) => {
    updatedBubbles: Bubble[][];
    updatedBoss: Boss | null;
    updatedSpikes: TrackingSpike[];
  };
  onUpdateBubbles: (bubbles: Bubble[][]) => void;
  onUpdateBoss: (boss: Boss | null) => void;
  onUpdateSpikes: (spikes: TrackingSpike[]) => void;
  onAddScore: (points: number) => void;
  onHitSpike: () => void;
  onNextLevel: () => void;
  onDamageBoss: () => void;
  onDefeatBoss: () => void;
}

function initializeStars(): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.random() * GAME_WIDTH,
      y: Math.random() * GAME_HEIGHT,
      size: STAR_MIN_SIZE + Math.random() * (STAR_MAX_SIZE - STAR_MIN_SIZE),
      speed: STAR_MIN_SPEED + Math.random() * (STAR_MAX_SPEED - STAR_MIN_SPEED),
      alpha: 0.3 + Math.random() * 0.7,
    });
  }
  return stars;
}

function getBreathScale(phase: number): number {
  return 1 + 0.1 * Math.sin(phase * Math.PI * 2);
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  alpha: number
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBubble(
  ctx: CanvasRenderingContext2D,
  bubble: Bubble,
  cameraY: number
) {
  if (bubble.isBroken) {
    bubble.fragments.forEach((frag) => {
      const alpha = Math.max(0, frag.life / 1000);
      ctx.save();
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillStyle = frag.color;
      ctx.beginPath();
      ctx.arc(frag.x, frag.y - cameraY, frag.radius * (frag.life / 1000), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    return;
  }

  const scale = getBreathScale(bubble.breathPhase);
  const radius = bubble.radius * scale;
  const y = bubble.y - cameraY;

  const gradient = ctx.createRadialGradient(
    bubble.x - radius * 0.3,
    y - radius * 0.3,
    0,
    bubble.x,
    y,
    radius
  );
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.3, bubble.color);
  gradient.addColorStop(1, bubble.glowColor + '80');

  ctx.save();
  ctx.shadowColor = bubble.glowColor;
  ctx.shadowBlur = 20;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(bubble.x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.beginPath();
  ctx.arc(
    bubble.x - radius * 0.3,
    y - radius * 0.3,
    radius * 0.25,
    0,
    Math.PI * 2
  );
  ctx.fill();

  if (bubble.type === 'spike') {
    ctx.fillStyle = '#000000';
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const spikeLength = radius * 0.5;
      const baseX = bubble.x + Math.cos(angle) * radius * 0.7;
      const baseY = y + Math.sin(angle) * radius * 0.7;
      const tipX = bubble.x + Math.cos(angle) * (radius + spikeLength);
      const tipY = y + Math.sin(angle) * (radius + spikeLength);
      ctx.beginPath();
      ctx.moveTo(baseX - Math.sin(angle) * 4, baseY + Math.cos(angle) * 4);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(baseX + Math.sin(angle) * 4, baseY - Math.cos(angle) * 4);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawBoss(
  ctx: CanvasRenderingContext2D,
  boss: Boss,
  cameraY: number
) {
  const y = boss.y - cameraY;
  const rotation = boss.rotation * (Math.PI / 180);

  ctx.save();
  ctx.translate(boss.x, y);
  ctx.rotate(rotation);

  ctx.shadowColor = BOSS_GLOW_COLOR;
  ctx.shadowBlur = 30;

  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, boss.radius);
  gradient.addColorStop(0, BOSS_GLOW_COLOR);
  gradient.addColorStop(0.5, BOSS_COLOR);
  gradient.addColorStop(1, '#4a235a');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, boss.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#2c1340';

  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const baseX = Math.cos(angle) * boss.radius;
    const baseY = Math.sin(angle) * boss.radius;
    const tipX = Math.cos(angle) * (boss.radius + BOSS_SPIKE_LENGTH);
    const tipY = Math.sin(angle) * (boss.radius + BOSS_SPIKE_LENGTH);

    ctx.beginPath();
    ctx.moveTo(
      baseX - Math.sin(angle) * 6,
      baseY + Math.cos(angle) * 6
    );
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(
      baseX + Math.sin(angle) * 6,
      baseY - Math.cos(angle) * 6
    );
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();

  const healthPercent = boss.health / boss.maxHealth;
  const barWidth = 100;
  const barHeight = 8;
  const barX = boss.x - barWidth / 2;
  const barY = y - boss.radius - BOSS_SPIKE_LENGTH - 20;

  ctx.fillStyle = '#333333';
  ctx.fillRect(barX, barY, barWidth, barHeight);
  ctx.fillStyle = healthPercent > 0.3 ? '#e74c3c' : '#c0392b';
  ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barWidth, barHeight);
}

function drawTrackingSpike(
  ctx: CanvasRenderingContext2D,
  spike: TrackingSpike,
  cameraY: number
) {
  if (!spike.active) return;

  const y = spike.y - cameraY;
  const angle = Math.atan2(spike.vy, spike.vx);

  ctx.save();
  ctx.translate(spike.x, y);
  ctx.rotate(angle);

  ctx.shadowColor = SPIKE_COLOR;
  ctx.shadowBlur = 10;
  ctx.fillStyle = spike.isReflected ? '#f39c12' : SPIKE_COLOR;

  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-8, -5);
  ctx.lineTo(-8, 5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  cameraY: number
) {
  const y = player.y - cameraY;

  ctx.save();
  ctx.shadowColor = PLAYER_COLOR;
  ctx.shadowBlur = 15;

  const gradient = ctx.createRadialGradient(
    player.x,
    y,
    0,
    player.x,
    y,
    player.radius
  );
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.7, '#ecf0f1');
  gradient.addColorStop(1, '#bdc3c7');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(player.x, y, player.radius, 0, Math.PI * 2);
  ctx.fill();

  if (player.isStuck) {
    ctx.strokeStyle = '#2ecc71';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(player.x, y, player.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

export function GameCanvas({
  gameState,
  player,
  onBubbleClick,
  onUpdatePhysics,
  onUpdateBubbles,
  onUpdateBoss,
  onUpdateSpikes,
  onAddScore,
  onHitSpike,
  onNextLevel,
  onDamageBoss,
  onDefeatBoss,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>(initializeStars());
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const scoreTimerRef = useRef<number>(0);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (gameState.phase !== 'playing' && gameState.phase !== 'boss') return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY + gameState.cameraY;

      for (const layer of gameState.bubbles) {
        for (const bubble of layer) {
          if (bubble.isBroken) continue;
          const scale = getBreathScale(bubble.breathPhase);
          const effectiveRadius = bubble.radius * scale;
          const dx = x - bubble.x;
          const dy = y - bubble.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < effectiveRadius + 10) {
            onBubbleClick(bubble.id);
            return;
          }
        }
      }
    },
    [gameState, onBubbleClick]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }
      const deltaTime = Math.min(timestamp - lastTimeRef.current, 50);
      lastTimeRef.current = timestamp;

      if (gameState.phase === 'playing' || gameState.phase === 'boss') {
        scoreTimerRef.current += deltaTime;
        if (scoreTimerRef.current >= 1000) {
          scoreTimerRef.current -= 1000;
          onAddScore(SCORE_PER_SECOND);
        }

        const result = onUpdatePhysics(deltaTime, gameState, {
          onHitSpike,
          onNextLevel,
          onDamageBoss,
          onDefeatBoss,
        });
        onUpdateBubbles(result.updatedBubbles);
        onUpdateBoss(result.updatedBoss);
        onUpdateSpikes(result.updatedSpikes);
      }

      ctx.fillStyle = '#0a0a23';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      starsRef.current = starsRef.current.map((star) => {
        let newY = star.y + star.speed;
        if (newY > GAME_HEIGHT) {
          newY = 0;
          star.x = Math.random() * GAME_WIDTH;
        }
        drawStar(ctx, star.x, newY, star.size, star.alpha);
        return { ...star, y: newY };
      });

      if (gameState.phase !== 'menu') {
        const startLayer = Math.max(0, Math.floor(gameState.cameraY / 120) - 1);
        const endLayer = Math.min(
          gameState.bubbles.length,
          startLayer + 12
        );

        for (let i = startLayer; i < endLayer; i++) {
          if (gameState.bubbles[i]) {
            gameState.bubbles[i].forEach((bubble) => {
              drawBubble(ctx, bubble, gameState.cameraY);
            });
          }
        }

        if (gameState.boss && gameState.boss.active) {
          drawBoss(ctx, gameState.boss, gameState.cameraY);
        }

        gameState.trackingSpikes.forEach((spike) => {
          drawTrackingSpike(ctx, spike, gameState.cameraY);
        });

        drawPlayer(ctx, player, gameState.cameraY);
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    gameState,
    player,
    onUpdatePhysics,
    onUpdateBubbles,
    onUpdateBoss,
    onUpdateSpikes,
    onAddScore,
    onHitSpike,
    onNextLevel,
    onDamageBoss,
    onDefeatBoss,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={GAME_WIDTH}
      height={GAME_HEIGHT}
      onClick={handleCanvasClick}
      style={{
        display: 'block',
        margin: '0 auto',
        cursor: 'pointer',
        borderRadius: '8px',
      }}
    />
  );
}
