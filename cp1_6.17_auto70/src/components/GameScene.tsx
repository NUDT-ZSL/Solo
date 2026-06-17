import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store';
import {
  createTracks, updateDiamonds, spawnDiamond, checkCollision, createParticles, updateParticles, getTrackX,
  Diamond, Particle, Track
} from '../轨道系统';
import { createBeatAnalyzer, BeatAnalyzer } from '../节拍分析器';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_Y_RATIO = 2 / 3;
const JUMP_HEIGHT = 200;
const POWER_UP_COLORS = ['#FFD700', '#8A2BE2'];

function GameScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const gameStartTimeRef = useRef<number>(0);
  const lastSpawnYRef = useRef<number>(0);
  const diamondsRef = useRef<Diamond[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const tracksRef = useRef<Track[]>([]);
  const beatAnalyzerRef = useRef<BeatAnalyzer | null>(null);
  const lastBeatRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  const {
    phase,
    player,
    speedMultiplier,
    screenFlash,
    isPowerUpActive,
    diamondColorIndex,
    updateCountdown,
    updatePlayer,
    updatePowerUp,
    updateDiamondColor,
    addScore,
    addEnergy,
    deductEnergy,
    registerHit,
    activatePowerUp,
    triggerScreenFlash,
  } = useGameStore();

  const startAudio = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      
      const playBeat = () => {
        try {
          if (ctx.state === 'suspended') {
            ctx.resume();
          }
          
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 60;
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.1);
        } catch (e) {
          // Ignore audio errors
        }
      };

      const interval = setInterval(playBeat, 500);
      (window as any).beatInterval = interval;
    } catch (e) {
      console.log('Audio not available');
    }
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const { moveLeft, moveRight, jump } = useGameStore.getState();
    const currentTime = performance.now();

    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
      moveLeft();
    } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
      moveRight();
    } else if (e.key === ' ') {
      e.preventDefault();
      jump(currentTime);
    } else if (e.key === 'e' || e.key === 'E') {
      activatePowerUp(currentTime);
    }
  }, [activatePowerUp]);

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0A0A2E');
    gradient.addColorStop(1, '#1A1A3E');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const tracks = tracksRef.current;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    for (let i = 1; i < tracks.length; i++) {
      const x = tracks[i].x;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  }, []);

  const drawDiamond = useCallback((
    ctx: CanvasRenderingContext2D,
    diamond: Diamond,
    x: number,
    y: number,
    powerUpActive: boolean,
    colorIndex: number
  ) => {
    const size = diamond.size;
    const halfSize = size / 2;

    let color = diamond.color;
    let glowColor = diamond.glowColor;

    if (powerUpActive) {
      color = POWER_UP_COLORS[colorIndex];
      glowColor = POWER_UP_COLORS[colorIndex];
    }

    ctx.save();
    ctx.translate(x, y);

    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(0, -halfSize);
    ctx.lineTo(halfSize, 0);
    ctx.lineTo(0, halfSize);
    ctx.lineTo(-halfSize, 0);
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.globalAlpha = diamond.opacity;
    ctx.fill();

    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }, []);

  const drawPlayer = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    rotation: number,
    isFlashing: boolean,
    flashTime: number
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    let alpha = 1;
    if (isFlashing) {
      const flashCycle = Math.floor(flashTime / 50) % 2;
      alpha = flashCycle === 0 ? 0.3 : 1;
    }

    ctx.globalAlpha = alpha;

    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    ctx.restore();
  }, []);

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D, particles: Particle[]) => {
    particles.forEach((particle) => {
      const alpha = particle.life / particle.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }, []);

  const drawScreenFlash = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, flashProgress: number) => {
    ctx.save();
    ctx.globalAlpha = 1 - flashProgress;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }, []);

  const gameLoop = useCallback((currentTime: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = useGameStore.getState();
    const deltaTime = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1);
    lastTimeRef.current = currentTime;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    drawBackground(ctx, width, height);

    if (state.phase === 'countdown') {
      updateCountdown(currentTime);
    } else if (state.phase === 'playing') {
      if (gameStartTimeRef.current === 0) {
        gameStartTimeRef.current = currentTime;
        lastSpawnYRef.current = height * PLAYER_Y_RATIO;
        beatAnalyzerRef.current = createBeatAnalyzer(120);
        beatAnalyzerRef.current.start(currentTime);
        startAudio();
        
        for (let i = 0; i < 8; i++) {
          const result = spawnDiamond(
            diamondsRef.current,
            height,
            lastSpawnYRef.current,
            i % 2 === 0
          );
          diamondsRef.current = result.diamonds;
          lastSpawnYRef.current = result.newLastSpawnY;
        }
      }

      if (beatAnalyzerRef.current) {
        const beatState = beatAnalyzerRef.current.update(currentTime);
        if (beatState.isBeat && beatState.currentBeat > lastBeatRef.current) {
          lastBeatRef.current = beatState.currentBeat;
          const result = spawnDiamond(
            diamondsRef.current,
            height,
            lastSpawnYRef.current,
            true
          );
          diamondsRef.current = result.diamonds;
          lastSpawnYRef.current = result.newLastSpawnY;
        }
      }

      const randomSpawn = Math.random() < 0.02;
      if (randomSpawn) {
        const result = spawnDiamond(
          diamondsRef.current,
          height,
          lastSpawnYRef.current,
          false
        );
        if (result.diamonds !== diamondsRef.current) {
          diamondsRef.current = result.diamonds;
          lastSpawnYRef.current = result.newLastSpawnY;
        }
      }

      diamondsRef.current = updateDiamonds(diamondsRef.current, deltaTime, state.speedMultiplier);

      const playerY = height * PLAYER_Y_RATIO - player.jumpProgress * JUMP_HEIGHT;
      const playerTrackIndex = Math.round(player.track);
      const collisionResult = checkCollision(
        diamondsRef.current,
        playerTrackIndex,
        playerY,
        30,
        player.isJumping,
        player.jumpProgress
      );

      diamondsRef.current = collisionResult.diamonds;

      if (collisionResult.hitType) {
        if (collisionResult.hitType === 'perfect') {
          addScore(25, currentTime);
          addEnergy(10);
          registerHit('perfect', currentTime);
        } else if (collisionResult.hitType === 'normal') {
          addScore(10, currentTime);
          addEnergy(5);
          registerHit('normal', currentTime);
        } else if (collisionResult.hitType === 'miss') {
          addScore(-15, currentTime);
          deductEnergy(10);
          registerHit('miss', currentTime);
        }
      }

      if (state.isPowerUpActive && state.screenFlash && particlesRef.current.length === 0) {
        particlesRef.current = createParticles(tracksRef.current, 150);
        diamondsRef.current = [];
      }

      particlesRef.current = updateParticles(particlesRef.current, deltaTime);

      updatePlayer(currentTime, deltaTime);
      updatePowerUp(currentTime);
      updateDiamondColor(currentTime);

      const tracks = tracksRef.current;
      diamondsRef.current.forEach((diamond) => {
        if (!diamond.hit) {
          const x = getTrackX(tracks, diamond.track);
          drawDiamond(ctx, diamond, x, diamond.y, state.isPowerUpActive, state.diamondColorIndex);
        }
      });

      drawParticles(ctx, particlesRef.current);

      const playerX = getTrackX(tracks, player.track);
      const actualPlayerY = height * PLAYER_Y_RATIO - player.jumpProgress * JUMP_HEIGHT;
      const flashTime = player.isFlashing ? currentTime - player.flashStartTime : 0;
      drawPlayer(ctx, playerX, actualPlayerY, player.rotation, player.isFlashing, flashTime);

      if (state.screenFlash) {
        const flashProgress = (currentTime - state.screenFlashStartTime) / 100;
        if (flashProgress < 1) {
          drawScreenFlash(ctx, width, height, flashProgress);
        }
      }
    }

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [
    drawBackground, drawDiamond, drawPlayer, drawParticles, drawScreenFlash,
    updateCountdown, updatePlayer, updatePowerUp, updateDiamondColor,
    addScore, addEnergy, deductEnergy, registerHit, startAudio, player
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      tracksRef.current = createTracks(canvas.width, canvas.height);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    window.addEventListener('keydown', handleKeyDown);

    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('keydown', handleKeyDown);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if ((window as any).beatInterval) {
        clearInterval((window as any).beatInterval);
        (window as any).beatInterval = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [handleKeyDown, gameLoop]);

  useEffect(() => {
    if (phase === 'countdown') {
      diamondsRef.current = [];
      particlesRef.current = [];
      gameStartTimeRef.current = 0;
      lastSpawnYRef.current = 0;
      lastBeatRef.current = 0;
      beatAnalyzerRef.current = null;
      if ((window as any).beatInterval) {
        clearInterval((window as any).beatInterval);
        (window as any).beatInterval = null;
      }
    }
  }, [phase]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }}
    />
  );
}

export default GameScene;
