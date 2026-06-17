import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from './store';
import { createBeatAnalyzer, updateBeat, checkHitAccuracy, getBeatPulse } from './节拍分析器';
import type { Diamond } from './轨道系统';
import { generateDiamond, checkCollision, resetDiamondIdCounter } from './轨道系统';

const TRACK_COUNT = 3;
const TRACK_WIDTH = 120;
const DIAMOND_SIZE = 40;
const PLAYER_Y_RATIO = 0.67;
const JUMP_DURATION = 0.4;
const JUMP_HEIGHT = 200;
const TRACK_TRANSITION_DURATION = 0.15;
const BPM = 120;
const PERFECT_SCORE = 25;
const NORMAL_SCORE = 10;
const HIT_PENALTY = -15;
const PERFECT_ENERGY = 10;
const NORMAL_ENERGY = 5;
const HIT_ENERGY_PENALTY = -10;
const POWER_UP_DURATION = 10;
const FLASH_DURATION = 0.3;
const MAX_CONSECUTIVE_HITS = 3;
const PARTICLE_COUNT = 150;

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

let particleIdCounter = 0;
let diamondIdCounter = 0;

const App = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef({
    lastTime: 0,
    beatAnalyzer: createBeatAnalyzer(BPM),
    diamonds: [] as Diamond[],
    particles: [] as Particle[],
    playerTrack: 1,
    playerTargetTrack: 1,
    trackTransitionProgress: 1,
    isJumping: false,
    jumpProgress: 0,
    jumpHeight: 0,
    playerRotation: 0,
    isFlashing: false,
    flashTimer: 0,
    flashPhase: 0,
    score: 0,
    energy: 0,
    perfectHits: 0,
    consecutiveHits: 0,
    gameStatus: 'countdown' as 'countdown' | 'playing' | 'gameover',
    countdown: 3,
    isPowerUp: false,
    powerUpTimer: 0,
    isScreenFlash: false,
    screenFlashTimer: 0,
    scoreAnimation: false,
    scoreAnimationTimer: 0,
    lastSpawnBeat: -1,
    gameStartTime: 0,
    canvasWidth: 0,
    canvasHeight: 0,
    playerY: 0,
    processedDiamonds: new Set<number>(),
  });

  const {
    game,
    resetGame,
  } = useGameStore();

  const getPlayerX = useCallback(() => {
    const state = gameStateRef.current;
    const centerX = state.canvasWidth / 2;
    const totalWidth = TRACK_COUNT * TRACK_WIDTH;
    const startX = centerX - totalWidth / 2;
    
    const currentTrackX = startX + state.playerTrack * TRACK_WIDTH + TRACK_WIDTH / 2;
    const targetTrackX = startX + state.playerTargetTrack * TRACK_WIDTH + TRACK_WIDTH / 2;
    
    const t = state.trackTransitionProgress;
    const easeOut = 1 - Math.pow(1 - t, 3);
    
    return currentTrackX + (targetTrackX - currentTrackX) * easeOut;
  }, []);

  const spawnDiamond = useCallback(() => {
    const state = gameStateRef.current;
    const randomTrack = Math.floor(Math.random() * TRACK_COUNT);
    
    let color = '#00FFFF';
    if (state.isPowerUp) {
      const beatPulse = getBeatPulse(state.beatAnalyzer);
      color = beatPulse > 0.5 ? '#FFD700' : '#8A2BE2';
    }
    
    const diamond = {
      id: ++diamondIdCounter,
      track: randomTrack,
      y: -DIAMOND_SIZE,
      size: DIAMOND_SIZE,
      color,
      glowColor: color,
      opacity: 0.8,
      passed: false,
      hit: false,
    };
    
    state.diamonds.push(diamond);
    
    if (state.diamonds.length > 50) {
      state.diamonds = state.diamonds.slice(-50);
    }
  }, []);

  const createParticles = useCallback((x: number, y: number, count: number, color: string) => {
    const state = gameStateRef.current;
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 50;
      const particle: Particle = {
        id: ++particleIdCounter,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 3,
        color,
        life: 0.5,
        maxLife: 0.5,
      };
      state.particles.push(particle);
    }
  }, []);

  const triggerPowerUp = useCallback(() => {
    const state = gameStateRef.current;
    
    state.isPowerUp = true;
    state.powerUpTimer = POWER_UP_DURATION;
    state.isScreenFlash = true;
    state.screenFlashTimer = 0.1;
    state.energy = 0;
    
    const centerX = state.canvasWidth / 2;
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const track = Math.floor(Math.random() * TRACK_COUNT);
      const y = Math.random() * state.playerY;
      const x = centerX - (TRACK_COUNT * TRACK_WIDTH) / 2 + track * TRACK_WIDTH + TRACK_WIDTH / 2;
      
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 50;
      
      const particle: Particle = {
        id: ++particleIdCounter,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 3,
        color: '#FFD700',
        life: 0.5,
        maxLife: 0.5,
      };
      state.particles.push(particle);
    }
    
    state.diamonds = [];
  }, []);

  const handleHit = useCallback((diamond: Diamond, result: 'perfect' | 'normal' | 'miss') => {
    const state = gameStateRef.current;
    
    if (state.processedDiamonds.has(diamond.id)) {
      return;
    }
    state.processedDiamonds.add(diamond.id);
    
    const hitTime = performance.now();
    const accuracy = checkHitAccuracy(state.beatAnalyzer, hitTime);
    
    if (result === 'perfect' || accuracy.isPerfect) {
      state.score += PERFECT_SCORE * (state.isPowerUp ? 2 : 1);
      state.energy = Math.min(100, state.energy + PERFECT_ENERGY);
      state.perfectHits++;
      state.consecutiveHits = 0;
      state.scoreAnimation = true;
      state.scoreAnimationTimer = 0.3;
    } else if (result === 'normal') {
      state.score += NORMAL_SCORE * (state.isPowerUp ? 2 : 1);
      state.energy = Math.min(100, state.energy + NORMAL_ENERGY);
      state.consecutiveHits = 0;
      state.scoreAnimation = true;
      state.scoreAnimationTimer = 0.3;
    } else if (result === 'miss') {
      state.score = Math.max(0, state.score + HIT_PENALTY);
      state.energy = Math.max(0, state.energy + HIT_ENERGY_PENALTY);
      state.consecutiveHits++;
      state.isFlashing = true;
      state.flashTimer = FLASH_DURATION;
      state.flashPhase = 0;
      
      if (state.consecutiveHits >= MAX_CONSECUTIVE_HITS) {
        state.gameStatus = 'gameover';
      }
    }
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const state = gameStateRef.current;
    
    if (state.gameStatus !== 'playing') {
      return;
    }
    
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        if (state.playerTargetTrack > 0) {
          state.playerTrack = state.playerTargetTrack;
          state.playerTargetTrack = state.playerTargetTrack - 1;
          state.trackTransitionProgress = 0;
        }
        break;
      case 'ArrowRight':
      case 'KeyD':
        if (state.playerTargetTrack < TRACK_COUNT - 1) {
          state.playerTrack = state.playerTargetTrack;
          state.playerTargetTrack = state.playerTargetTrack + 1;
          state.trackTransitionProgress = 0;
        }
        break;
      case 'Space':
        if (!state.isJumping) {
          state.isJumping = true;
          state.jumpProgress = 0;
        }
        e.preventDefault();
        break;
      case 'KeyE':
        if (state.energy >= 100 && !state.isPowerUp) {
          triggerPowerUp();
        }
        break;
    }
  }, [triggerPowerUp]);

  const updateGame = useCallback((deltaTime: number) => {
    const state = gameStateRef.current;
    
    const currentTime = performance.now();
    state.beatAnalyzer = updateBeat(state.beatAnalyzer, currentTime);
    
    if (state.beatAnalyzer.isBeat) {
      spawnDiamond();
    }
    
    const speed = 150;
    state.diamonds = state.diamonds.filter(diamond => {
      diamond.y += speed * deltaTime;
      
      if (!diamond.passed && diamond.y >= state.playerY) {
        diamond.passed = true;
        
        const result = checkCollision(
          diamond,
          state.playerTargetTrack,
          state.playerY,
          state.isJumping,
          state.jumpHeight
        );
        
        if (result !== 'none') {
          handleHit(diamond, result);
        }
      }
      
      return diamond.y < state.playerY + 100;
    });
    
    state.particles = state.particles.filter(particle => {
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      particle.life -= deltaTime;
      return particle.life > 0;
    });
    
    if (state.trackTransitionProgress < 1) {
      state.trackTransitionProgress = Math.min(1, state.trackTransitionProgress + deltaTime / TRACK_TRANSITION_DURATION);
      if (state.trackTransitionProgress >= 1) {
        state.playerTrack = state.playerTargetTrack;
      }
    }
    
    if (state.isJumping) {
      state.jumpProgress += deltaTime / JUMP_DURATION;
      
      if (state.jumpProgress <= 0.5) {
        state.jumpHeight = JUMP_HEIGHT * (state.jumpProgress * 2);
      } else {
        state.jumpHeight = JUMP_HEIGHT * (1 - (state.jumpProgress - 0.5) * 2);
      }
      
      state.playerRotation = Math.PI / 2 * Math.min(1, state.jumpProgress);
      
      if (state.jumpProgress >= 1) {
        state.isJumping = false;
        state.jumpProgress = 0;
        state.jumpHeight = 0;
        state.playerRotation = 0;
      }
    }
    
    if (state.isFlashing) {
      state.flashTimer -= deltaTime;
      state.flashPhase += deltaTime * 20;
      if (state.flashTimer <= 0) {
        state.isFlashing = false;
        state.flashPhase = 0;
      }
    }
    
    if (state.isPowerUp) {
      state.powerUpTimer -= deltaTime;
      if (state.powerUpTimer <= 0) {
        state.isPowerUp = false;
      }
    }
    
    if (state.isScreenFlash) {
      state.screenFlashTimer -= deltaTime;
      if (state.screenFlashTimer <= 0) {
        state.isScreenFlash = false;
      }
    }
    
    if (state.scoreAnimation) {
      state.scoreAnimationTimer -= deltaTime;
      if (state.scoreAnimationTimer <= 0) {
        state.scoreAnimation = false;
      }
    }
  }, [spawnDiamond, handleHit]);

  const drawDiamond = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color: string,
    opacity: number
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.globalAlpha = opacity;
    
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    
    ctx.fillStyle = color;
    ctx.fillRect(-size / 2, -size / 2, size, size);
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(-size / 2, -size / 2, size, size);
    
    ctx.restore();
  }, []);

  const drawPlayer = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const state = gameStateRef.current;
    
    ctx.save();
    ctx.translate(x, y - state.jumpHeight);
    ctx.rotate(state.playerRotation);
    
    if (state.isFlashing) {
      ctx.globalAlpha = Math.sin(state.flashPhase) > 0 ? 1 : 0.3;
    }
    
    const outerRadius = 15;
    const innerRadius = 10;
    
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 10;
    
    ctx.beginPath();
    ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 5;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    
    ctx.restore();
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const state = gameStateRef.current;
    
    ctx.clearRect(0, 0, state.canvasWidth, state.canvasHeight);
    
    const centerX = state.canvasWidth / 2;
    const totalWidth = TRACK_COUNT * TRACK_WIDTH;
    const startX = centerX - totalWidth / 2;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    
    for (let i = 0; i <= TRACK_COUNT; i++) {
      const x = startX + i * TRACK_WIDTH;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, state.canvasHeight);
      ctx.stroke();
    }
    
    for (const diamond of state.diamonds) {
      const x = startX + diamond.track * TRACK_WIDTH + TRACK_WIDTH / 2;
      
      let color = diamond.color;
      if (state.isPowerUp) {
        const beatPulse = getBeatPulse(state.beatAnalyzer);
        color = beatPulse > 0.3 ? '#FFD700' : '#8A2BE2';
      }
      
      drawDiamond(ctx, x, diamond.y, diamond.size, color, diamond.opacity);
    }
    
    for (const particle of state.particles) {
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
    }
    
    const playerX = getPlayerX();
    drawPlayer(ctx, playerX, state.playerY);
    
    if (state.isScreenFlash) {
      ctx.fillStyle = `rgba(255, 255, 255, ${state.screenFlashTimer / 0.1 * 0.8})`;
      ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);
    }
  }, [getPlayerX, drawDiamond, drawPlayer]);

  const gameLoop = useCallback((timestamp: number) => {
    const state = gameStateRef.current;
    
    if (state.lastTime === 0) {
      state.lastTime = timestamp;
    }
    
    const deltaTime = Math.min((timestamp - state.lastTime) / 1000, 0.05);
    state.lastTime = timestamp;
    
    if (state.gameStatus === 'countdown') {
      state.countdown -= deltaTime;
      if (state.countdown <= 0) {
        state.gameStatus = 'playing';
        state.gameStartTime = timestamp;
        state.beatAnalyzer = createBeatAnalyzer(BPM);
        state.beatAnalyzer.lastBeatTime = timestamp;
      }
    } else if (state.gameStatus === 'playing') {
      updateGame(deltaTime);
    }
    
    render();
    
    requestAnimationFrame(gameLoop);
  }, [updateGame, render]);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const state = gameStateRef.current;
    state.canvasWidth = window.innerWidth;
    state.canvasHeight = window.innerHeight;
    state.playerY = state.canvasHeight * PLAYER_Y_RATIO;
    
    canvas.width = state.canvasWidth;
    canvas.height = state.canvasHeight;
  }, []);

  const handleRestart = useCallback(() => {
    const state = gameStateRef.current;
    
    resetDiamondIdCounter();
    diamondIdCounter = 0;
    particleIdCounter = 0;
    
    state.diamonds = [];
    state.particles = [];
    state.playerTrack = 1;
    state.playerTargetTrack = 1;
    state.trackTransitionProgress = 1;
    state.isJumping = false;
    state.jumpProgress = 0;
    state.jumpHeight = 0;
    state.playerRotation = 0;
    state.isFlashing = false;
    state.flashTimer = 0;
    state.score = 0;
    state.energy = 0;
    state.perfectHits = 0;
    state.consecutiveHits = 0;
    state.gameStatus = 'countdown';
    state.countdown = 3;
    state.isPowerUp = false;
    state.powerUpTimer = 0;
    state.isScreenFlash = false;
    state.screenFlashTimer = 0;
    state.scoreAnimation = false;
    state.scoreAnimationTimer = 0;
    state.processedDiamonds = new Set();
    state.beatAnalyzer = createBeatAnalyzer(BPM);
    
    resetGame();
  }, [resetGame]);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    
    window.addEventListener('keydown', handleKeyDown);
    
    const animationId = requestAnimationFrame(gameLoop);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(animationId);
    };
  }, [handleResize, handleKeyDown, gameLoop]);

  const state = gameStateRef.current;
  const scoreScale = state.scoreAnimation ? 1.2 : 1;

  return (
    <div className="game-container">
      <canvas ref={canvasRef} className="game-canvas" />
      
      <div className="energy-bar-container">
        <div
          className="energy-bar"
          style={{ width: `${state.energy}%` }}
        />
      </div>
      
      <div
        className={`score-display ${state.scoreAnimation ? 'animate' : ''}`}
        style={{ transform: `scale(${scoreScale})` }}
      >
        得分: {Math.floor(state.score)}
      </div>
      
      {state.isPowerUp && (
        <div className="power-up-text">
          ⚡ 能量爆发! 双倍得分 {Math.ceil(state.powerUpTimer)}s ⚡
        </div>
      )}
      
      {state.gameStatus === 'countdown' && (
        <div className="countdown" key={Math.ceil(state.countdown)}>
          {Math.ceil(state.countdown)}
        </div>
      )}
      
      {state.gameStatus === 'gameover' && (
        <div className="game-over-overlay">
          <div className="game-over-panel">
            <div className="game-over-title">游戏结束</div>
            <div className="game-over-score">最终得分: {Math.floor(state.score)}</div>
            <div className="game-over-perfect">完美命中: {state.perfectHits} 次</div>
            <button
              className="restart-button"
              onClick={handleRestart}
            >
              重新开始
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
