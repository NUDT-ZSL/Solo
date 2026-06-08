import React, { useRef, useEffect, useCallback } from 'react';
import {
  Note,
  NoteType,
  Particle,
  Ripple,
  PlayerState,
  createNote,
  circleCollision,
  spawnParticles,
  lerp,
  clamp,
  getScoreForType,
} from './utils';
import { AudioController } from './audioController';

interface GameCanvasProps {
  isPlaying: boolean;
  level: number;
  onScoreChange: (score: number) => void;
  onHealthChange: (health: number) => void;
  onTimeChange: (time: number) => void;
  onGameOver: () => void;
  audioController: AudioController;
}

const GRID_SPACING = 60;
const NOTE_SPAWN_INTERVAL_BASE = 800;
const LEVEL_DURATION = 60;
const PLAYER_SPEED = 6;
const PLAYER_LERP_FACTOR = 0.15;
const MAX_HEALTH = 100;
const DAMAGE_AMOUNT = 20;
const TRAIL_LENGTH = 12;

export default React.memo(function GameCanvas({
  isPlaying,
  level,
  onScoreChange,
  onHealthChange,
  onTimeChange,
  onGameOver,
  audioController,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const gameStateRef = useRef({
    notes: [] as Note[],
    particles: [] as Particle[],
    ripples: [] as Ripple[],
    player: {
      x: 0,
      y: 0,
      radius: 18,
      targetX: 0,
      targetY: 0,
      health: MAX_HEALTH,
      maxHealth: MAX_HEALTH,
      trail: [] as { x: number; y: number; alpha: number }[],
    } as PlayerState,
    score: 0,
    timeLeft: LEVEL_DURATION,
    lastSpawnTime: 0,
    lastTime: 0,
    beatIntensity: 0,
    mouseX: 0,
    mouseY: 0,
    keysDown: new Set<string>(),
    isRunning: false,
    startTimestamp: 0,
  });

  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, time: number, beatIntensity: number) => {
      const ripples = gameStateRef.current.ripples;

      ctx.strokeStyle = `rgba(100, 80, 220, ${0.12 + beatIntensity * 0.1})`;
      ctx.lineWidth = 1;

      for (let x = 0; x <= w; x += GRID_SPACING) {
        ctx.beginPath();
        for (let y = 0; y <= h; y += 4) {
          let offsetX = 0;
          for (const r of ripples) {
            const dx = x - r.x;
            const dy = y - r.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const ringDist = Math.abs(dist - r.radius);
            if (ringDist < 40) {
              offsetX += Math.sin(y * 0.02 + time * 2) * (1 - ringDist / 40) * r.alpha * 12;
            }
          }
          offsetX += Math.sin(y * 0.015 + time * 1.5) * beatIntensity * 3;
          if (y === 0) {
            ctx.moveTo(x + offsetX, y);
          } else {
            ctx.lineTo(x + offsetX, y);
          }
        }
        ctx.stroke();
      }

      for (let y = 0; y <= h; y += GRID_SPACING) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 4) {
          let offsetY = 0;
          for (const r of ripples) {
            const dx = x - r.x;
            const dy = y - r.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const ringDist = Math.abs(dist - r.radius);
            if (ringDist < 40) {
              offsetY += Math.sin(x * 0.02 + time * 2) * (1 - ringDist / 40) * r.alpha * 12;
            }
          }
          offsetY += Math.sin(x * 0.015 + time * 1.5) * beatIntensity * 3;
          if (x === 0) {
            ctx.moveTo(x, y + offsetY);
          } else {
            ctx.lineTo(x, y + offsetY);
          }
        }
        ctx.stroke();
      }
    },
    []
  );

  const drawNote = useCallback((ctx: CanvasRenderingContext2D, note: Note, time: number) => {
    const isObstacle = note.type === NoteType.Obstacle;
    const pulse = 1 + Math.sin(time * 6 + note.id) * 0.15;
    const r = note.radius * pulse;

    if (note.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(note.trail[0].x, note.trail[0].y);
      for (let i = 1; i < note.trail.length; i++) {
        ctx.lineTo(note.trail[i].x, note.trail[i].y);
      }
      ctx.lineTo(note.x, note.y);
      ctx.strokeStyle = note.glowColor;
      ctx.lineWidth = r * 0.6;
      ctx.stroke();
    }

    ctx.save();
    ctx.shadowColor = note.color;
    ctx.shadowBlur = isObstacle ? 20 + Math.sin(time * 10) * 10 : 15;

    if (isObstacle) {
      const flicker = 0.6 + Math.sin(time * 12) * 0.4;
      ctx.globalAlpha = flicker;
    }

    ctx.beginPath();
    ctx.arc(note.x, note.y, r, 0, Math.PI * 2);
    ctx.fillStyle = note.color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(note.x, note.y, r * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.6;
    ctx.fill();

    ctx.restore();
  }, []);

  const drawPlayer = useCallback((ctx: CanvasRenderingContext2D, player: PlayerState, time: number) => {
    if (player.trail.length > 1) {
      for (let i = 0; i < player.trail.length - 1; i++) {
        const alpha = player.trail[i].alpha * 0.4;
        ctx.beginPath();
        ctx.arc(player.trail[i].x, player.trail[i].y, player.radius * (0.3 + alpha * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 200, 255, ${alpha})`;
        ctx.fill();
      }
    }

    ctx.save();
    ctx.shadowColor = '#00ccff';
    ctx.shadowBlur = 20 + Math.sin(time * 4) * 5;

    const gradient = ctx.createRadialGradient(
      player.x, player.y, 0,
      player.x, player.y, player.radius
    );
    gradient.addColorStop(0, 'rgba(200, 240, 255, 0.95)');
    gradient.addColorStop(0.4, 'rgba(0, 200, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(0, 100, 255, 0.2)');

    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 200, 255, ${0.3 + Math.sin(time * 3) * 0.2})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }, []);

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D, particles: Particle[]) => {
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.restore();
    }
  }, []);

  const drawRipples = useCallback((ctx: CanvasRenderingContext2D, ripples: Ripple[]) => {
    for (const r of ripples) {
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(120, 80, 255, ${r.alpha * 0.3})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, []);

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#000011');
    gradient.addColorStop(0.5, '#050520');
    gradient.addColorStop(1, '#0a0a3a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }, []);

  const update = useCallback(
    (dt: number, time: number, w: number, h: number) => {
      const gs = gameStateRef.current;
      if (!gs.isRunning) return;

      gs.timeLeft -= dt;
      onTimeChange(Math.max(0, Math.ceil(gs.timeLeft)));

      if (gs.timeLeft <= 0) {
        gs.isRunning = false;
        onGameOver();
        return;
      }

      if (gs.player.health <= 0) {
        gs.isRunning = false;
        onGameOver();
        return;
      }

      const bpm = 120 + level * 8;
      const spawnInterval = Math.max(300, NOTE_SPAWN_INTERVAL_BASE - level * 60);

      if (time - gs.lastSpawnTime > spawnInterval / 1000) {
        gs.notes.push(createNote(w, h, bpm, time));
        gs.lastSpawnTime = time;
      }

      gs.beatIntensity = audioController.getBeatIntensity();

      const player = gs.player;
      let moveX = 0;
      let moveY = 0;
      const keys = gs.keysDown;
      if (keys.has('w') || keys.has('arrowup')) moveY -= 1;
      if (keys.has('s') || keys.has('arrowdown')) moveY += 1;
      if (keys.has('a') || keys.has('arrowleft')) moveX -= 1;
      if (keys.has('d') || keys.has('arrowright')) moveX += 1;

      if (moveX !== 0 || moveY !== 0) {
        const len = Math.sqrt(moveX * moveX + moveY * moveY);
        player.targetX = player.x + (moveX / len) * PLAYER_SPEED * 20;
        player.targetY = player.y + (moveY / len) * PLAYER_SPEED * 20;
      } else {
        player.targetX = gs.mouseX;
        player.targetY = gs.mouseY;
      }

      player.x = lerp(player.x, player.targetX, PLAYER_LERP_FACTOR);
      player.y = lerp(player.y, player.targetY, PLAYER_LERP_FACTOR);
      player.x = clamp(player.x, player.radius, w - player.radius);
      player.y = clamp(player.y, player.radius, h - player.radius);

      player.trail.unshift({ x: player.x, y: player.y, alpha: 1 });
      if (player.trail.length > TRAIL_LENGTH) player.trail.pop();
      for (const t of player.trail) t.alpha *= 0.88;

      for (const note of gs.notes) {
        note.x += note.vx;
        note.y += note.vy;

        note.trail.unshift({ x: note.x, y: note.y, alpha: 0.8 });
        if (note.trail.length > 8) note.trail.pop();
        for (const t of note.trail) t.alpha *= 0.85;

        if (
          note.x < -100 ||
          note.x > w + 100 ||
          note.y < -100 ||
          note.y > h + 100
        ) {
          note.alive = false;
        }

        if (note.alive && circleCollision(player.x, player.y, player.radius, note.x, note.y, note.radius)) {
          note.alive = false;

          if (note.type === NoteType.Obstacle) {
            player.health = Math.max(0, player.health - DAMAGE_AMOUNT);
            onHealthChange(player.health);
            audioController.playDamageSound();
            gs.particles.push(...spawnParticles(note.x, note.y, '#ff2244', 20));
            gs.ripples.push({
              x: note.x,
              y: note.y,
              radius: 0,
              maxRadius: 120,
              alpha: 1,
              speed: 150,
            });
          } else {
            const pts = getScoreForType(note.type);
            gs.score += pts;
            onScoreChange(gs.score);
            audioController.playCaptureSound(note.type);
            gs.particles.push(...spawnParticles(note.x, note.y, note.color, 30));
            gs.ripples.push({
              x: note.x,
              y: note.y,
              radius: 0,
              maxRadius: 100,
              alpha: 0.8,
              speed: 120,
            });
          }
        }
      }

      gs.notes = gs.notes.filter((n) => n.alive);

      for (const p of gs.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.life -= dt;
      }
      gs.particles = gs.particles.filter((p) => p.life > 0);

      for (const r of gs.ripples) {
        r.radius += r.speed * dt;
        r.alpha = Math.max(0, 1 - r.radius / r.maxRadius);
      }
      gs.ripples = gs.ripples.filter((r) => r.alpha > 0);
    },
    [level, audioController, onScoreChange, onHealthChange, onTimeChange, onGameOver]
  );

  const render = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, time: number) => {
      const gs = gameStateRef.current;

      drawBackground(ctx, w, h);
      drawGrid(ctx, w, h, time, gs.beatIntensity);
      drawRipples(ctx, gs.ripples);

      for (const note of gs.notes) {
        drawNote(ctx, note, time);
      }

      drawPlayer(ctx, gs.player, time);
      drawParticles(ctx, gs.particles);
    },
    [drawBackground, drawGrid, drawRipples, drawNote, drawPlayer, drawParticles]
  );

  const gameLoop = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const gs = gameStateRef.current;
      const dt = gs.lastTime === 0 ? 0.016 : Math.min((timestamp - gs.lastTime) / 1000, 0.05);
      gs.lastTime = timestamp;

      const time = (timestamp - gs.startTimestamp) / 1000;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const displayW = rect.width;
      const displayH = rect.height;

      if (canvas.width !== displayW * dpr || canvas.height !== displayH * dpr) {
        canvas.width = displayW * dpr;
        canvas.height = displayH * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      update(dt, time, displayW, displayH);
      render(ctx, displayW, displayH, time);

      animFrameRef.current = requestAnimationFrame(gameLoop);
    },
    [update, render]
  );

  useEffect(() => {
    const gs = gameStateRef.current;

    if (isPlaying) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();

      gs.notes = [];
      gs.particles = [];
      gs.ripples = [];
      gs.score = 0;
      gs.timeLeft = LEVEL_DURATION;
      gs.lastSpawnTime = 0;
      gs.lastTime = 0;
      gs.beatIntensity = 0;
      gs.player = {
        x: rect.width / 2,
        y: rect.height / 2,
        radius: 18,
        targetX: rect.width / 2,
        targetY: rect.height / 2,
        health: MAX_HEALTH,
        maxHealth: MAX_HEALTH,
        trail: [],
      };
      gs.mouseX = rect.width / 2;
      gs.mouseY = rect.height / 2;
      gs.isRunning = true;
      gs.startTimestamp = performance.now();

      onScoreChange(0);
      onHealthChange(MAX_HEALTH);
      onTimeChange(LEVEL_DURATION);

      animFrameRef.current = requestAnimationFrame(gameLoop);
    } else {
      gs.isRunning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, gameLoop, onScoreChange, onHealthChange, onTimeChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      gameStateRef.current.mouseX = e.clientX - rect.left;
      gameStateRef.current.mouseY = e.clientY - rect.top;
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      gameStateRef.current.mouseX = touch.clientX - rect.left;
      gameStateRef.current.mouseY = touch.clientY - rect.top;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      gameStateRef.current.keysDown.add(e.key.toLowerCase());
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      gameStateRef.current.keysDown.delete(e.key.toLowerCase());
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        cursor: 'none',
      }}
    />
  );
});
