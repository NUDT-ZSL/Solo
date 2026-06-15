import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const MAX_OBJECTS = 50;
const OBSTACLE_COLORS = ['#ff4444', '#ff8800', '#ffcc00'];

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
}

interface Ship {
  x: number;
  y: number;
  size: number;
  speed: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  active: boolean;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  speed: number;
  pulsePhase: number;
  active: boolean;
}

interface Target {
  x: number;
  y: number;
  baseRadius: number;
  speed: number;
  breathePhase: number;
  active: boolean;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  active: boolean;
}

interface ShipDebris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
  size: number;
}

const Game: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [lifeFlash, setLifeFlash] = useState(false);
  const [rhythmPulse, setRhythmPulse] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  const gameStateRef = useRef({
    ship: { x: 100, y: CANVAS_HEIGHT / 2, size: 20, speed: 5 } as Ship,
    obstacles: [] as Obstacle[],
    targets: [] as Target[],
    bullets: [] as Bullet[],
    particles: [] as Particle[],
    shipDebris: [] as ShipDebris[],
    stars: [] as Star[],
    keys: {} as Record<string, boolean>,
    lastObstacleTime: 0,
    lastTargetTime: 0,
    obstacleInterval: 2000,
    obstacleSpeed: 4,
    score: 0,
    lives: 3,
    gameOver: false,
    audioContext: null as AudioContext | null,
    canShoot: true,
    lastShotTime: 0,
    shipInvincible: false,
    invincibleEndTime: 0,
  });

  const initStars = useCallback(() => {
    const state = gameStateRef.current;
    state.stars = [];
    for (let i = 0; i < 100; i++) {
      state.stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: Math.random() * 2 + 0.5,
        brightness: Math.random(),
        twinkleSpeed: Math.random() * 0.05 + 0.01,
      });
    }
  }, []);

  const playHitSound = useCallback(() => {
    const state = gameStateRef.current;
    try {
      if (!state.audioContext) {
        state.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = state.audioContext;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = 440;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.log('Audio not supported');
    }
  }, []);

  const playExplosionSound = useCallback(() => {
    const state = gameStateRef.current;
    try {
      if (!state.audioContext) {
        state.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = state.audioContext;
      const bufferSize = ctx.sampleRate * 0.3;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
      }
      const source = ctx.createBufferSource();
      const gainNode = ctx.createGain();
      source.buffer = buffer;
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start();
    } catch (e) {
      console.log('Audio not supported');
    }
  }, []);

  const createExplosion = useCallback((x: number, y: number, color: string, count: number, life: number) => {
    const state = gameStateRef.current;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 2 + Math.random() * 3;
      const inactive = state.particles.find(p => !p.active);
      if (inactive) {
        inactive.x = x;
        inactive.y = y;
        inactive.vx = Math.cos(angle) * speed;
        inactive.vy = Math.sin(angle) * speed;
        inactive.life = life;
        inactive.maxLife = life;
        inactive.color = color;
        inactive.size = 3 + Math.random() * 2;
        inactive.active = true;
      } else if (state.particles.length < MAX_OBJECTS) {
        state.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life,
          maxLife: life,
          color,
          size: 3 + Math.random() * 2,
          active: true,
        });
      }
    }
  }, []);

  const createShipExplosion = useCallback((x: number, y: number) => {
    const state = gameStateRef.current;
    state.shipDebris = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      const speed = 3 + Math.random() * 2;
      state.shipDebris.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        life: 1000,
        size: 10,
      });
    }
  }, []);

  const spawnObstacle = useCallback(() => {
    const state = gameStateRef.current;
    const totalObjects = state.obstacles.filter(o => o.active).length +
                         state.targets.filter(t => t.active).length +
                         state.bullets.filter(b => b.active).length;
    if (totalObjects >= MAX_OBJECTS) return;

    let obstacle = state.obstacles.find(o => !o.active);
    if (!obstacle) {
      obstacle = {
        x: 0, y: 0, width: 0, height: 0, color: '',
        speed: 0, pulsePhase: 0, active: false,
      };
      state.obstacles.push(obstacle);
    }

    obstacle.x = CANVAS_WIDTH + 50;
    obstacle.y = Math.random() * (CANVAS_HEIGHT - 100) + 50;
    obstacle.width = 30 + Math.random() * 30;
    obstacle.height = 20 + Math.random() * 20;
    obstacle.color = OBSTACLE_COLORS[Math.floor(Math.random() * OBSTACLE_COLORS.length)];
    obstacle.speed = state.obstacleSpeed;
    obstacle.pulsePhase = 0;
    obstacle.active = true;

    setRhythmPulse(true);
    setTimeout(() => setRhythmPulse(false), 200);
  }, []);

  const spawnTarget = useCallback(() => {
    const state = gameStateRef.current;
    const totalObjects = state.obstacles.filter(o => o.active).length +
                         state.targets.filter(t => t.active).length +
                         state.bullets.filter(b => b.active).length;
    if (totalObjects >= MAX_OBJECTS) return;

    let target = state.targets.find(t => !t.active);
    if (!target) {
      target = {
        x: 0, y: 0, baseRadius: 15, speed: 0,
        breathePhase: 0, active: false,
      };
      state.targets.push(target);
    }

    target.x = CANVAS_WIDTH + 30;
    target.y = Math.random() * (CANVAS_HEIGHT - 100) + 50;
    target.speed = state.obstacleSpeed * 0.8;
    target.breathePhase = 0;
    target.active = true;
  }, []);

  const fireBullet = useCallback(() => {
    const state = gameStateRef.current;
    const now = Date.now();
    if (now - state.lastShotTime < 150) return;
    state.lastShotTime = now;

    const totalObjects = state.obstacles.filter(o => o.active).length +
                         state.targets.filter(t => t.active).length +
                         state.bullets.filter(b => b.active).length;
    if (totalObjects >= MAX_OBJECTS) return;

    let bullet = state.bullets.find(b => !b.active);
    if (!bullet) {
      bullet = {
        x: 0, y: 0, vx: 6, vy: 0, radius: 4, active: false,
      };
      state.bullets.push(bullet);
    }

    bullet.x = state.ship.x + state.ship.size;
    bullet.y = state.ship.y;
    bullet.vx = 6;
    bullet.vy = 0;
    bullet.active = true;
  }, []);

  const handleLifeLoss = useCallback(() => {
    setLifeFlash(true);
    setTimeout(() => setLifeFlash(false), 500);
    setLives(prev => {
      const newLives = prev - 1;
      gameStateRef.current.lives = newLives;
      if (newLives <= 0) {
        gameStateRef.current.gameOver = true;
        setGameOver(true);
        setFinalScore(gameStateRef.current.score);
        playExplosionSound();
        createShipExplosion(gameStateRef.current.ship.x, gameStateRef.current.ship.y);
      } else {
        gameStateRef.current.shipInvincible = true;
        gameStateRef.current.invincibleEndTime = Date.now() + 1500;
      }
      return newLives;
    });
  }, [playExplosionSound, createShipExplosion]);

  const checkCollisions = useCallback(() => {
    const state = gameStateRef.current;
    const { ship, obstacles, targets, bullets } = state;

    for (const target of targets) {
      if (!target.active) continue;
      const currentRadius = target.baseRadius + Math.sin(target.breathePhase) * 3;
      for (const bullet of bullets) {
        if (!bullet.active) continue;
        const dx = bullet.x - target.x;
        const dy = bullet.y - target.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < currentRadius + bullet.radius) {
          target.active = false;
          bullet.active = false;
          createExplosion(target.x, target.y, '#ffd700', 8, 400);
          playHitSound();
          state.score += 10;
          setScore(state.score);

          const scoreLevel = Math.floor(state.score / 100);
          state.obstacleInterval = Math.max(800, 2000 - scoreLevel * 100);
          state.obstacleSpeed = 4 + scoreLevel * 0.5;
          break;
        }
      }
    }

    if (!state.shipInvincible) {
      for (const obstacle of obstacles) {
        if (!obstacle.active) continue;
        const shipLeft = ship.x - ship.size / 2;
        const shipRight = ship.x + ship.size / 2;
        const shipTop = ship.y - ship.size / 2;
        const shipBottom = ship.y + ship.size / 2;

        const obsLeft = obstacle.x;
        const obsRight = obstacle.x + obstacle.width;
        const obsTop = obstacle.y;
        const obsBottom = obstacle.y + obstacle.height;

        if (shipRight > obsLeft && shipLeft < obsRight &&
            shipBottom > obsTop && shipTop < obsBottom) {
          handleLifeLoss();
          break;
        }
      }
    }

    if (state.shipInvincible && Date.now() > state.invincibleEndTime) {
      state.shipInvincible = false;
    }
  }, [createExplosion, playHitSound, handleLifeLoss]);

  const update = useCallback((deltaTime: number) => {
    const state = gameStateRef.current;
    if (state.gameOver) {
      state.shipDebris.forEach((debris) => {
        debris.x += debris.vx;
        debris.y += debris.vy;
        debris.vy += 0.1;
        debris.rotation += debris.rotationSpeed;
        debris.life -= deltaTime;
      });
      state.shipDebris = state.shipDebris.filter(d => d.life > 0);

      state.particles.forEach(p => {
        if (!p.active) return;
        p.x += p.vx;
        p.y += p.vy;
        p.life -= deltaTime;
        if (p.life <= 0) p.active = false;
      });
      return;
    }

    const now = Date.now();

    if (now - state.lastObstacleTime > state.obstacleInterval) {
      spawnObstacle();
      state.lastObstacleTime = now;
    }
    if (now - state.lastTargetTime > 2500) {
      spawnTarget();
      state.lastTargetTime = now;
    }

    if (state.keys['ArrowUp'] || state.keys['KeyW']) {
      state.ship.y = Math.max(state.ship.size, state.ship.y - state.ship.speed);
    }
    if (state.keys['ArrowDown'] || state.keys['KeyS']) {
      state.ship.y = Math.min(CANVAS_HEIGHT - state.ship.size, state.ship.y + state.ship.speed);
    }
    if (state.keys['ArrowLeft'] || state.keys['KeyA']) {
      state.ship.x = Math.max(state.ship.size, state.ship.x - state.ship.speed);
    }
    if (state.keys['ArrowRight'] || state.keys['KeyD']) {
      state.ship.x = Math.min(CANVAS_WIDTH - state.ship.size, state.ship.x + state.ship.speed);
    }
    if (state.keys['Space']) {
      fireBullet();
    }

    const tailColors = ['#ff6b35', '#ffaa00', '#ff4500'];
    for (let i = 0; i < 2; i++) {
      const inactive = state.particles.find(p => !p.active);
      if (inactive) {
        inactive.x = state.ship.x - state.ship.size;
        inactive.y = state.ship.y + (Math.random() - 0.5) * 8;
        inactive.vx = -2 - Math.random() * 2;
        inactive.vy = (Math.random() - 0.5) * 2;
        inactive.life = 300;
        inactive.maxLife = 300;
        inactive.color = tailColors[Math.floor(Math.random() * tailColors.length)];
        inactive.size = 3 + Math.random() * 2;
        inactive.active = true;
      } else if (state.particles.length < MAX_OBJECTS) {
        state.particles.push({
          x: state.ship.x - state.ship.size,
          y: state.ship.y + (Math.random() - 0.5) * 8,
          vx: -2 - Math.random() * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 300,
          maxLife: 300,
          color: tailColors[Math.floor(Math.random() * tailColors.length)],
          size: 3 + Math.random() * 2,
          active: true,
        });
      }
    }

    state.obstacles.forEach(obs => {
      if (!obs.active) return;
      obs.x -= obs.speed;
      obs.pulsePhase += deltaTime * 0.01;
      if (obs.x + obs.width < -50) obs.active = false;
    });

    state.targets.forEach(tgt => {
      if (!tgt.active) return;
      tgt.x -= tgt.speed;
      tgt.breathePhase += deltaTime * 0.012;
      if (tgt.x < -50) tgt.active = false;
    });

    state.bullets.forEach(b => {
      if (!b.active) return;
      b.x += b.vx;
      b.y += b.vy;
      if (b.x > CANVAS_WIDTH + 20) b.active = false;
    });

    state.particles.forEach(p => {
      if (!p.active) return;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= deltaTime;
      if (p.life <= 0) p.active = false;
    });

    state.stars.forEach(star => {
      star.brightness += star.twinkleSpeed;
      if (star.brightness > 1 || star.brightness < 0.3) {
        star.twinkleSpeed = -star.twinkleSpeed;
      }
    });

    checkCollisions();
  }, [spawnObstacle, spawnTarget, fireBullet, checkCollisions]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const state = gameStateRef.current;

    ctx.fillStyle = '#0a0a2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, 'rgba(59, 32, 102, 0.3)');
    gradient.addColorStop(1, 'rgba(26, 26, 78, 0.3)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    state.stars.forEach(star => {
      ctx.globalAlpha = star.brightness;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    state.obstacles.forEach(obs => {
      if (!obs.active) return;
      const pulseScale = 1 + Math.sin(obs.pulsePhase) * 0.1;
      const w = obs.width * pulseScale;
      const h = obs.height * pulseScale;
      const x = obs.x - (w - obs.width) / 2;
      const y = obs.y - (h - obs.height) / 2;

      ctx.fillStyle = obs.color;
      ctx.shadowColor = obs.color;
      ctx.shadowBlur = 10;
      ctx.fillRect(x, y, w, h);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
    });

    state.targets.forEach(tgt => {
      if (!tgt.active) return;
      const currentRadius = tgt.baseRadius + Math.sin(tgt.breathePhase) * 3;

      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(tgt.x, tgt.y, currentRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#fffacd';
      ctx.beginPath();
      ctx.arc(tgt.x - currentRadius * 0.3, tgt.y - currentRadius * 0.3, currentRadius * 0.3, 0, Math.PI * 2);
      ctx.fill();
    });

    state.bullets.forEach(b => {
      if (!b.active) return;
      ctx.fillStyle = '#00ff66';
      ctx.shadowColor = '#00ff66';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    state.particles.forEach(p => {
      if (!p.active) return;
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    if (!state.gameOver) {
      const { ship } = state;
      if (state.shipInvincible) {
        ctx.globalAlpha = Math.sin(Date.now() * 0.02) * 0.3 + 0.7;
      }
      ctx.save();
      ctx.translate(ship.x, ship.y);

      ctx.fillStyle = '#4fc3f7';
      ctx.shadowColor = '#4fc3f7';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(ship.size, 0);
      ctx.lineTo(-ship.size * 0.8, -ship.size * 0.7);
      ctx.lineTo(-ship.size * 0.5, 0);
      ctx.lineTo(-ship.size * 0.8, ship.size * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#81d4fa';
      ctx.beginPath();
      ctx.moveTo(ship.size * 0.6, 0);
      ctx.lineTo(-ship.size * 0.3, -ship.size * 0.35);
      ctx.lineTo(-ship.size * 0.1, 0);
      ctx.lineTo(-ship.size * 0.3, ship.size * 0.35);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
      ctx.globalAlpha = 1;
    }

    state.shipDebris.forEach(debris => {
      const alpha = Math.min(1, debris.life / 500);
      ctx.save();
      ctx.translate(debris.x, debris.y);
      ctx.rotate(debris.rotation);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#4fc3f7';
      ctx.shadowColor = '#4fc3f7';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(debris.size, 0);
      ctx.lineTo(-debris.size * 0.5, -debris.size * 0.5);
      ctx.lineTo(-debris.size * 0.5, debris.size * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }, []);

  useEffect(() => {
    initStars();
    const state = gameStateRef.current;
    state.lastObstacleTime = Date.now();
    state.lastTargetTime = Date.now();

    let lastFrameTime = performance.now();
    let animationId: number;

    const gameLoop = (currentTime: number) => {
      const deltaTime = currentTime - lastFrameTime;
      lastFrameTime = currentTime;

      update(deltaTime);
      render();

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);

    const handleKeyDown = (e: KeyboardEvent) => {
      state.keys[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      state.keys[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [initStars, update, render]);

  const resetGame = () => {
    const state = gameStateRef.current;
    state.ship = { x: 100, y: CANVAS_HEIGHT / 2, size: 20, speed: 5 };
    state.obstacles.forEach(o => o.active = false);
    state.targets.forEach(t => t.active = false);
    state.bullets.forEach(b => b.active = false);
    state.particles.forEach(p => p.active = false);
    state.shipDebris = [];
    state.score = 0;
    state.lives = 3;
    state.gameOver = false;
    state.obstacleInterval = 2000;
    state.obstacleSpeed = 4;
    state.shipInvincible = false;
    state.lastObstacleTime = Date.now();
    state.lastTargetTime = Date.now();
    setScore(0);
    setLives(3);
    setGameOver(false);
    setPlayerName('');
    setSubmitSuccess(false);
  };

  const submitScore = async () => {
    if (!playerName.trim()) return;
    setSubmitting(true);
    try {
      await axios.post('/api/score', {
        name: playerName.trim(),
        score: finalScore,
      });
      setSubmitSuccess(true);
      setTimeout(() => {
        navigate('/leaderboard');
      }, 800);
    } catch (err) {
      console.error('Submit failed:', err);
      alert('提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a2e 0%, #1a1a4e 100%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    boxSizing: 'border-box',
  };

  const wrapperStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: CANVAS_WIDTH,
    maxWidth: '100%',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#ffd700',
    textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
    margin: 0,
  };

  const leaderboardBtnStyle: React.CSSProperties = {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #3b2066 0%, #1a1a4e 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
  };

  const gameContainerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
  };

  const hudTopStyle: React.CSSProperties = {
    position: 'absolute',
    top: '10px',
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0 20px',
    zIndex: 10,
    pointerEvents: 'none',
  };

  const scoreBoxStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  };

  const scoreLabelStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#aaa',
    textShadow: '0 0 10px rgba(0,0,0,0.8)',
  };

  const scoreValueStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#fff',
    textShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
  };

  const livesBoxStyle: React.CSSProperties = {
    display: 'flex',
    gap: '5px',
  };

  const canvasStyle: React.CSSProperties = {
    display: 'block',
    borderRadius: '8px',
    boxShadow: '0 0 40px rgba(59, 32, 102, 0.6)',
    border: '2px solid #3b2066',
    maxWidth: '100%',
    height: 'auto',
  };

  const rhythmBarContainerStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '15px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '220px',
    height: '10px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  };

  const rhythmBarStyle: React.CSSProperties = {
    height: '8px',
    borderRadius: '4px',
    transition: 'width 0.2s ease',
    boxShadow: '0 0 15px rgba(0, 255, 136, 0.6)',
  };

  const gameOverOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 10, 46, 0.85)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: '8px',
    zIndex: 20,
  };

  const gameOverPanelStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #3b2066 0%, #1a1a4e 100%)',
    padding: '40px 50px',
    borderRadius: '16px',
    textAlign: 'center',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
    border: '2px solid rgba(255, 215, 0, 0.3)',
  };

  const gameOverTitleStyle: React.CSSProperties = {
    fontSize: '36px',
    color: '#ff4757',
    margin: '0 0 20px 0',
    textShadow: '0 0 20px rgba(255, 71, 87, 0.5)',
  };

  const finalScoreTextStyle: React.CSSProperties = {
    fontSize: '18px',
    color: '#aaa',
    margin: '0 0 5px 0',
  };

  const finalScoreValueStyle: React.CSSProperties = {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#ffd700',
    margin: '0 0 30px 0',
    textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
  };

  const submitSectionStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginBottom: '20px',
  };

  const nameInputStyle: React.CSSProperties = {
    padding: '12px 16px',
    fontSize: '16px',
    borderRadius: '8px',
    border: '2px solid #6a5acd',
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    outline: 'none',
    textAlign: 'center',
    transition: 'border-color 0.2s',
  };

  const submitBtnStyle: React.CSSProperties = {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #3b2066 0%, #1a1a4e 100%)',
    color: '#ffd700',
    border: '2px solid #ffd700',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    transition: 'all 0.2s ease',
  };

  const successTextStyle: React.CSSProperties = {
    color: '#00ff66',
    fontSize: '18px',
    marginBottom: '20px',
  };

  const restartBtnStyle: React.CSSProperties = {
    padding: '14px 32px',
    background: 'linear-gradient(135deg, #2c5282 0%, #1a365d 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: 'bold',
    transition: 'all 0.2s ease',
    width: '100%',
  };

  const controlsPanelStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(59, 32, 102, 0.6) 0%, rgba(26, 26, 78, 0.6) 100%)',
    padding: '15px 30px',
    borderRadius: '10px',
    textAlign: 'center',
    border: '1px solid rgba(255, 215, 0, 0.2)',
  };

  const controlTextStyle: React.CSSProperties = {
    color: '#ddd',
    margin: '5px 0',
    fontSize: '14px',
  };

  const controlHintStyle: React.CSSProperties = {
    color: '#ffd700',
    margin: '8px 0 0 0',
    fontSize: '13px',
  };

  const mediaStyle = `
    @media (max-width: 768px) {
      .game-wrapper {
        width: 100%;
      }
      .game-header {
        width: 100% !important;
        flex-direction: column;
        gap: 10px;
      }
      .controls-panel {
        width: 100%;
        box-sizing: border-box;
      }
    }
  `;

  return (
    <div style={containerStyle}>
      <style>{mediaStyle}</style>
      <div style={wrapperStyle} className="game-wrapper">
        <div style={headerStyle} className="game-header">
          <h1 style={titleStyle}>节奏空间</h1>
          <button
            onClick={() => navigate('/leaderboard')}
            style={leaderboardBtnStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #4a3caf 0%, #6a5acd 100%)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #3b2066 0%, #1a1a4e 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            🏆 排行榜
          </button>
        </div>

        <div style={gameContainerStyle}>
          <div style={hudTopStyle}>
            <div style={scoreBoxStyle}>
              <span style={scoreLabelStyle}>得分</span>
              <span style={scoreValueStyle}>{score}</span>
            </div>
            <div style={livesBoxStyle}>
              {[...Array(3)].map((_, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: '24px',
                    opacity: i < lives ? 1 : 0.2,
                    transform: lifeFlash && i === lives ? 'scale(0.7)' : 'scale(1)',
                    transition: 'all 0.5s ease',
                    color: lifeFlash && i === lives ? '#ff0000' : '#ff4757',
                    textShadow: lifeFlash && i === lives ? '0 0 10px #ff0000' : 'none',
                  }}
                >
                  ❤
                </span>
              ))}
            </div>
          </div>

          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={canvasStyle}
          />

          <div style={rhythmBarContainerStyle}>
            <div
              style={{
                ...rhythmBarStyle,
                width: rhythmPulse ? '220px' : '200px',
                background: `linear-gradient(90deg, #00ff88 ${50 + Math.sin(Date.now() * 0.005) * 50}%, #4488ff 100%)`,
              }}
            />
          </div>

          {gameOver && (
            <div style={gameOverOverlayStyle}>
              <div style={gameOverPanelStyle}>
                <h2 style={gameOverTitleStyle}>游戏结束</h2>
                <p style={finalScoreTextStyle}>最终得分</p>
                <p style={finalScoreValueStyle}>{finalScore}</p>

                {!submitSuccess ? (
                  <div style={submitSectionStyle}>
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value.slice(0, 8))}
                      placeholder="输入昵称 (最多8字符)"
                      style={nameInputStyle}
                      maxLength={8}
                      onFocus={(e) => { e.target.style.borderColor = '#ffd700'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#6a5acd'; }}
                    />
                    <button
                      onClick={submitScore}
                      disabled={submitting || !playerName.trim()}
                      style={{
                        ...submitBtnStyle,
                        opacity: submitting || !playerName.trim() ? 0.5 : 1,
                        cursor: submitting || !playerName.trim() ? 'not-allowed' : 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        if (!submitting && playerName.trim()) {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #4a3caf 0%, #6a5acd 100%)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #3b2066 0%, #1a1a4e 100%)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      {submitting ? '提交中...' : '提交分数'}
                    </button>
                  </div>
                ) : (
                  <p style={successTextStyle}>✓ 提交成功！即将跳转到排行榜...</p>
                )}

                <button
                  onClick={resetGame}
                  style={restartBtnStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #4a90d9 0%, #6ab0ff 100%)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #2c5282 0%, #1a365d 100%)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  🔄 重新开始
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={controlsPanelStyle} className="controls-panel">
          <p style={controlTextStyle}>⬆⬇⬅➡ 方向键移动飞船</p>
          <p style={controlTextStyle}>⎵ 空格键发射子弹</p>
          <p style={controlHintStyle}>避开红橙黄障碍物，射击金色目标得分！</p>
        </div>
      </div>
    </div>
  );
};

export default Game;
