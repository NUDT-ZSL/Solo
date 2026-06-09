import type { GameState, Particle, TrailPoint, Obstacle, ScoreZone, Car } from './types';

const CAR_SPEED = 100;
const TRAIL_LIFETIME = 2000;
const PARTICLE_MAX = 2000;
const OBS_SPAWN_START = 3000;
const OBS_COLORS = ['#FF5555', '#55FF55', '#5555FF'];
const MAX_LIVES = 3;
const SCORE_ZONE_RADIUS = 40;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(c1: string, c2: string, t: number): string {
  const r1 = parseInt(c1.slice(1, 3), 16);
  const g1 = parseInt(c1.slice(3, 5), 16);
  const b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16);
  const g2 = parseInt(c2.slice(3, 5), 16);
  const b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const b = Math.round(lerp(b1, b2, t));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function initGame(width: number, height: number): GameState {
  const trackMargin = 120;
  const trackX1 = trackMargin;
  const trackX2 = width - trackMargin;
  const car: Car = {
    x: width / 2,
    y: height - 100,
    angle: -Math.PI / 2,
    speed: 0,
    targetSpeed: CAR_SPEED,
    trailIndex: 0,
    lives: MAX_LIVES,
    isBlinking: false,
    blinkTime: 0,
    combo: 0,
  };
  const audio = {
    ctx: null as AudioContext | null,
    engineOsc: null as OscillatorNode | null,
    engineGain: null as GainNode | null,
  };
  const state: GameState = {
    status: 'start',
    canvasWidth: width,
    canvasHeight: height,
    trackX1,
    trackX2,
    car,
    trail: [],
    particles: [],
    obstacles: [],
    scoreZones: [],
    score: 0,
    elapsedTime: 0,
    bgColorStart: [10, 10, 26],
    bgColorEnd: [255, 0, 255],
    obstacleSpawnTimer: 0,
    obstacleSpawnInterval: OBS_SPAWN_START,
    mousePos: { x: 0, y: 0 },
    isDrawing: false,
    obstacleIdCounter: 0,
    zoneIdCounter: 0,
    audio,
  };
  spawnInitialZones(state);
  return state;
}

function spawnInitialZones(state: GameState): void {
  const count = 3;
  const midX = (state.trackX1 + state.trackX2) / 2;
  const trackWidth = state.trackX2 - state.trackX1;
  for (let i = 0; i < count; i++) {
    const zone: ScoreZone = {
      id: state.zoneIdCounter++,
      x: midX + (Math.random() - 0.5) * trackWidth * 0.6,
      y: 200 + i * ((state.canvasHeight - 300) / count),
      radius: SCORE_ZONE_RADIUS,
      activated: false,
      activationTime: 0,
      pulse: 0,
    };
    state.scoreZones.push(zone);
  }
}

function spawnObstacle(state: GameState, side: 'left' | 'right'): void {
  const difficultyFactor = clamp(state.elapsedTime / 60000, 0, 1);
  const baseSpeed = 30 + difficultyFactor * 30;
  const size = 20;
  const y = Math.random() * (state.canvasHeight - 200) + 100;
  const obs: Obstacle = {
    id: state.obstacleIdCounter++,
    x: side === 'left' ? state.trackX1 - size : state.trackX2,
    y,
    size,
    color: OBS_COLORS[Math.floor(Math.random() * OBS_COLORS.length)],
    speed: baseSpeed + Math.random() * 15,
    direction: side === 'left' ? 1 : -1,
    hit: false,
    hitTime: 0,
    pulse: 0,
  };
  state.obstacles.push(obs);
}

function addParticle(state: GameState, p: Particle): void {
  if (state.particles.length >= PARTICLE_MAX) {
    state.particles.shift();
  }
  state.particles.push(p);
}

function addTrailParticles(state: GameState, x: number, y: number, color: string, _size: number): void {
  const count = 10 + Math.floor(Math.random() * 6);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * 2;
    addParticle(state, {
      x: x + Math.cos(angle) * r,
      y: y + Math.sin(angle) * r,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10,
      size: 3 + Math.random() * 2,
      color,
      alpha: 1,
      life: 1500,
      maxLife: 1500,
    });
  }
}

function addCarParticles(state: GameState): void {
  const car = state.car;
  const count = 5 + Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i++) {
    const angle = car.angle + Math.PI + (Math.random() - 0.5) * 1.2;
    const r = 10 + Math.random() * 8;
    addParticle(state, {
      x: car.x + Math.cos(angle) * r,
      y: car.y + Math.sin(angle) * r,
      vx: Math.cos(angle) * 20 + (Math.random() - 0.5) * 10,
      vy: Math.sin(angle) * 20 + (Math.random() - 0.5) * 10,
      size: 3 + Math.random() * 2,
      color: '#00FFFF',
      alpha: 1,
      life: 600,
      maxLife: 600,
    });
  }
}

function addHitParticles(state: GameState, x: number, y: number, color: string): void {
  const count = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const angle = Math.PI + (Math.random() - 0.5) * Math.PI;
    const speed = 50 + Math.random() * 80;
    addParticle(state, {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 3 + Math.random() * 2,
      color,
      alpha: 1,
      life: 300,
      maxLife: 300,
    });
  }
}

function addScoreBurstParticles(state: GameState, x: number, y: number, radius: number): void {
  const count = 24;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const colors = ['#00FFFF', '#FF00FF', '#FFFF00', '#FF00FF', '#00FFFF'];
    const color = colors[i % colors.length];
    addParticle(state, {
      x: x + Math.cos(angle) * radius * 0.5,
      y: y + Math.sin(angle) * radius * 0.5,
      vx: Math.cos(angle) * 200,
      vy: Math.sin(angle) * 200,
      size: 4,
      color,
      alpha: 1,
      life: 300,
      maxLife: 300,
    });
  }
}

function playEngineSound(state: GameState): void {
  if (!state.audio.ctx) {
    try {
      state.audio.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      return;
    }
  }
  const ctx = state.audio.ctx;
  if (!ctx) return;
  if (state.audio.engineOsc) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 120;
  gain.gain.value = 0.1;
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  state.audio.engineOsc = osc;
  state.audio.engineGain = gain;
}

function stopEngineSound(state: GameState): void {
  if (state.audio.engineOsc) {
    try { state.audio.engineOsc.stop(); } catch (e) {}
    state.audio.engineOsc = null;
  }
  state.audio.engineGain = null;
}

function playScoreSound(state: GameState): void {
  if (!state.audio.ctx) return;
  const ctx = state.audio.ctx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}

function playHitSound(state: GameState): void {
  if (!state.audio.ctx) return;
  const ctx = state.audio.ctx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.1);
}

export function handleInput(state: GameState, event: string, payload: any): void {
  switch (event) {
    case 'mousedown': {
      if (state.status === 'start') {
        state.status = 'playing';
        playEngineSound(state);
      }
      if (state.status === 'playing') {
        state.isDrawing = true;
        state.mousePos = { x: payload.x, y: payload.y };
        if (state.trail.length === 0) {
          state.trail.push({
            x: state.car.x,
            y: state.car.y,
            time: state.elapsedTime,
            width: 2,
            color: '#00FFFF',
          });
        }
      }
      break;
    }
    case 'mousemove': {
      state.mousePos = { x: payload.x, y: payload.y };
      for (const obs of state.obstacles) {
        const d = dist(payload.x, payload.y, obs.x + obs.size / 2, obs.y + obs.size / 2);
        obs.pulse = d < obs.size ? 0.2 : Math.max(0, obs.pulse - 0.02);
      }
      for (const zone of state.scoreZones) {
        const d = dist(payload.x, payload.y, zone.x, zone.y);
        zone.pulse = d < zone.radius ? 0.2 : Math.max(0, zone.pulse - 0.02);
      }
      break;
    }
    case 'mouseup': {
      state.isDrawing = false;
      break;
    }
    case 'mouseleave': {
      state.isDrawing = false;
      break;
    }
    case 'keydown': {
      if (payload.key === ' ' || payload.key === 'Space') {
        if (state.status === 'playing') {
          state.status = 'paused';
          if (state.audio.engineGain) state.audio.engineGain.gain.value = 0;
        } else if (state.status === 'paused') {
          state.status = 'playing';
          if (state.audio.engineGain) state.audio.engineGain.gain.value = 0.1;
        }
      }
      if (payload.key === 'r' || payload.key === 'R') {
        resetGame(state);
      }
      break;
    }
  }
}

function resetGame(state: GameState): void {
  stopEngineSound(state);
  const width = state.canvasWidth;
  const height = state.canvasHeight;
  const trackMargin = 120;
  state.trackX1 = trackMargin;
  state.trackX2 = width - trackMargin;
  state.car = {
    x: width / 2,
    y: height - 100,
    angle: -Math.PI / 2,
    speed: 0,
    targetSpeed: CAR_SPEED,
    trailIndex: 0,
    lives: MAX_LIVES,
    isBlinking: false,
    blinkTime: 0,
    combo: 0,
  };
  state.trail = [];
  state.particles = [];
  state.obstacles = [];
  state.scoreZones = [];
  state.score = 0;
  state.elapsedTime = 0;
  state.obstacleSpawnTimer = 0;
  state.obstacleSpawnInterval = OBS_SPAWN_START;
  state.isDrawing = false;
  state.status = 'start';
  spawnInitialZones(state);
}

export function updateGame(state: GameState, dt: number): void {
  if (state.status !== 'playing') return;

  state.elapsedTime += dt;
  const diffFactor = clamp(state.elapsedTime / 90000, 0, 1);
  state.obstacleSpawnInterval = OBS_SPAWN_START - diffFactor * 1500;

  // Generate trail from drawing
  if (state.isDrawing) {
    const car = state.car;
    const mx = state.mousePos.x;
    const my = state.mousePos.y;
    const clampedX = clamp(mx, state.trackX1, state.trackX2);
    const clampedY = clamp(my, 50, state.canvasHeight - 50);
    const trailT = state.trail.length === 0 ? 0 : clamp(state.trail.length / 200, 0, 1);
    const color = lerpColor('#00FFFF', '#FF00FF', trailT);
    const width = lerp(2, 5, trailT);
    const lastPoint = state.trail[state.trail.length - 1];
    if (!lastPoint || dist(clampedX, clampedY, lastPoint.x, lastPoint.y) > 3) {
      state.trail.push({
        x: clampedX,
        y: clampedY,
        time: state.elapsedTime,
        width,
        color,
      });
      addTrailParticles(state, clampedX, clampedY, color, width);
    }
    void car;
  }

  // Clean expired trail
  state.trail = state.trail.filter(p => state.elapsedTime - p.time < TRAIL_LIFETIME);

  // Update car position along trail
  updateCarAlongTrail(state, dt);

  // Add car particles
  if (state.car.speed > 10) {
    addCarParticles(state);
  }

  // Update obstacles
  state.obstacleSpawnTimer += dt;
  if (state.obstacleSpawnTimer >= state.obstacleSpawnInterval) {
    state.obstacleSpawnTimer = 0;
    spawnObstacle(state, 'left');
    spawnObstacle(state, 'right');
  }
  updateObstacles(state, dt);

  // Update score zones
  updateScoreZones(state, dt);

  // Update particles
  updateParticles(state, dt);

  // Check collisions
  checkCollisions(state);

  // Update car blinking
  if (state.car.isBlinking) {
    state.car.blinkTime -= dt;
    if (state.car.blinkTime <= 0) {
      state.car.isBlinking = false;
    }
  }

  // Game over conditions
  if (state.car.lives <= 0 || (state.car.speed <= 0.5 && state.trail.length === 0 && state.elapsedTime > 2000)) {
    state.status = 'gameover';
    stopEngineSound(state);
  }
}

function updateCarAlongTrail(state: GameState, dt: number): void {
  const car = state.car;
  const dtSec = dt / 1000;

  if (state.trail.length === 0) {
    car.targetSpeed = 0;
    car.speed = lerp(car.speed, 0, 0.05);
    return;
  }

  let targetIdx = 0;
  const target = state.trail[targetIdx];
  const dx = target.x - car.x;
  const dy = target.y - car.y;
  const d = Math.sqrt(dx * dx + dy * dy);

  if (d < 1) {
    state.trail.splice(targetIdx, 1);
    if (state.trail.length === 0) {
      car.targetSpeed = 0;
      car.speed = lerp(car.speed, 0, 0.05);
      return;
    }
  }

  car.targetSpeed = CAR_SPEED;
  car.speed = lerp(car.speed, car.targetSpeed, 0.08);

  const nextTarget = state.trail[0];
  const ndx = nextTarget.x - car.x;
  const ndy = nextTarget.y - car.y;
  const nd = Math.sqrt(ndx * ndx + ndy * ndy);
  if (nd < 0.1) {
    state.trail.splice(0, 1);
    return;
  }

  const nx = ndx / nd;
  const ny = ndy / nd;
  const targetAngle = Math.atan2(ny, nx);
  let angleDiff = targetAngle - car.angle;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  car.angle += angleDiff * 0.25;

  car.x += nx * car.speed * dtSec;
  car.y += ny * car.speed * dtSec;
  car.x = clamp(car.x, state.trackX1 + 5, state.trackX2 - 5);
  car.y = clamp(car.y, 10, state.canvasHeight - 10);
}

function updateObstacles(state: GameState, dt: number): void {
  const dtSec = dt / 1000;
  const midX = (state.trackX1 + state.trackX2) / 2;
  state.obstacles = state.obstacles.filter(obs => {
    obs.x += obs.direction * obs.speed * dtSec;
    if (obs.hit) {
      obs.hitTime -= dt;
      if (obs.hitTime <= 0) return false;
    }
    // Remove if passed the opposite edge
    if (obs.direction === 1 && obs.x > state.trackX2 + obs.size) return false;
    if (obs.direction === -1 && obs.x < state.trackX1 - obs.size * 2) return false;
    // Bounce if reaches middle with some randomness
    if (obs.direction === 1 && obs.x > midX - 10 && Math.random() < 0.005) {
      obs.direction = -1;
    }
    if (obs.direction === -1 && obs.x < midX + 10 && Math.random() < 0.005) {
      obs.direction = 1;
    }
    return true;
  });
  void midX;
}

function updateScoreZones(state: GameState, dt: number): void {
  // Remove old zones that are off screen or expired
  state.scoreZones = state.scoreZones.filter(z => {
    if (z.activated) {
      z.activationTime -= dt;
      return z.activationTime > 0;
    }
    return true;
  });
  // Spawn new zones
  if (state.scoreZones.filter(z => !z.activated).length < 3) {
    const midX = (state.trackX1 + state.trackX2) / 2;
    const trackWidth = state.trackX2 - state.trackX1;
    const existingY = state.scoreZones.map(z => z.y);
    let y = 0;
    let attempts = 0;
    do {
      y = 150 + Math.random() * (state.canvasHeight - 300);
      attempts++;
    } while (existingY.some(ey => Math.abs(ey - y) < 120) && attempts < 10);
    const zone: ScoreZone = {
      id: state.zoneIdCounter++,
      x: midX + (Math.random() - 0.5) * trackWidth * 0.6,
      y,
      radius: SCORE_ZONE_RADIUS,
      activated: false,
      activationTime: 0,
      pulse: 0,
    };
    state.scoreZones.push(zone);
  }
}

function updateParticles(state: GameState, dt: number): void {
  const dtSec = dt / 1000;
  state.particles = state.particles.filter(p => {
    p.x += p.vx * dtSec;
    p.y += p.vy * dtSec;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life -= dt;
    p.alpha = Math.max(0, p.life / p.maxLife);
    return p.life > 0;
  });
}

function checkCollisions(state: GameState): void {
  const car = state.car;
  const carR = 8;

  // Check obstacles
  for (const obs of state.obstacles) {
    if (obs.hit) continue;
    const cx = obs.x + obs.size / 2;
    const cy = obs.y + obs.size / 2;
    const dx = Math.abs(car.x - cx);
    const dy = Math.abs(car.y - cy);
    if (dx < obs.size / 2 + carR && dy < obs.size / 2 + carR) {
      // Collision
      obs.hit = true;
      obs.hitTime = 200;
      addHitParticles(state, cx, cy, obs.color);
      if (!car.isBlinking) {
        car.lives--;
        car.isBlinking = true;
        car.blinkTime = 500;
        car.combo = 0;
        playHitSound(state);
      }
    }
  }

  // Check score zones
  for (const zone of state.scoreZones) {
    if (zone.activated) continue;
    const d = dist(car.x, car.y, zone.x, zone.y);
    if (d < zone.radius - 5) {
      zone.activated = true;
      zone.activationTime = 300;
      addScoreBurstParticles(state, zone.x, zone.y, 80);
      car.combo++;
      let points = 10;
      if (car.combo > 0 && car.combo % 3 === 0) {
        points += 20;
      }
      state.score += points;
      playScoreSound(state);
    }
  }
}

export function drawGame(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { canvasWidth: W, canvasHeight: H } = state;

  // Background gradient based on elapsed time
  const t = clamp(state.elapsedTime / 120000, 0, 1);
  const bgR = Math.round(lerp(state.bgColorStart[0], state.bgColorEnd[0] * 0.1, t));
  const bgG = Math.round(lerp(state.bgColorStart[1], state.bgColorEnd[1] * 0.05, t));
  const bgB = Math.round(lerp(state.bgColorStart[2], state.bgColorEnd[2] * 0.2, t));
  ctx.fillStyle = `rgb(${bgR},${bgG},${bgB})`;
  ctx.fillRect(0, 0, W, H);

  // Draw track
  const trackGrad = ctx.createLinearGradient(state.trackX1, 0, state.trackX2, 0);
  const tr = Math.round(lerp(26, 80, t));
  const tg = Math.round(lerp(26, 10, t));
  const tb = Math.round(lerp(58, 100, t));
  trackGrad.addColorStop(0, `rgb(${Math.round(tr * 0.6)},${Math.round(tg * 0.6)},${Math.round(tb * 0.6)})`);
  trackGrad.addColorStop(0.5, `rgb(${tr},${tg},${tb})`);
  trackGrad.addColorStop(1, `rgb(${Math.round(tr * 0.6)},${Math.round(tg * 0.6)},${Math.round(tb * 0.6)})`);
  ctx.fillStyle = trackGrad;
  ctx.fillRect(state.trackX1, 0, state.trackX2 - state.trackX1, H);

  // Draw track edges
  drawTrackEdge(ctx, state.trackX1, H, state.elapsedTime);
  drawTrackEdge(ctx, state.trackX2, H, state.elapsedTime);

  // Draw score zones
  for (const zone of state.scoreZones) {
    drawScoreZone(ctx, zone, state.elapsedTime);
  }

  // Draw trail (glowing path)
  drawTrail(ctx, state.trail, state.elapsedTime);

  // Draw particles
  drawParticles(ctx, state.particles);

  // Draw obstacles
  for (const obs of state.obstacles) {
    drawObstacle(ctx, obs, state.elapsedTime);
  }

  // Draw car
  drawCar(ctx, state.car, state.elapsedTime);

  // Draw HUD
  drawHUD(ctx, state);

  // Draw overlays
  if (state.status === 'start') {
    drawStartOverlay(ctx, W, H);
  } else if (state.status === 'paused') {
    drawPausedOverlay(ctx, W, H);
  } else if (state.status === 'gameover') {
    drawGameOverOverlay(ctx, W, H, state.score);
  }
}

function drawTrackEdge(ctx: CanvasRenderingContext2D, x: number, H: number, time: number): void {
  ctx.save();
  ctx.strokeStyle = '#FFAA00';
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 3;
  ctx.shadowColor = '#FFAA00';
  ctx.shadowBlur = 10;
  ctx.setLineDash([12, 10]);
  ctx.lineDashOffset = -time / 30;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, H);
  ctx.stroke();
  ctx.restore();
}

function drawScoreZone(ctx: CanvasRenderingContext2D, zone: ScoreZone, time: number): void {
  ctx.save();
  const pulseScale = 1 + zone.pulse * 0.25;
  let radius = zone.radius * pulseScale;
  let alpha = zone.activated ? clamp(zone.activationTime / 300, 0, 1) : 0.4 + Math.sin(time / 300) * 0.15;

  if (zone.activated) {
    const t = 1 - zone.activationTime / 300;
    radius = lerp(zone.radius, 80, t);
    alpha = clamp(1 - t, 0, 1);
  }

  const gradient = ctx.createRadialGradient(zone.x, zone.y, 0, zone.x, zone.y, radius);
  gradient.addColorStop(0, `rgba(255,255,0,${alpha * 0.6})`);
  gradient.addColorStop(0.5, `rgba(255,0,255,${alpha * 0.4})`);
  gradient.addColorStop(1, `rgba(0,255,255,0)`);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(zone.x, zone.y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(0,255,255,${alpha})`;
  ctx.lineWidth = 2;
  ctx.shadowColor = '#00FFFF';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(zone.x, zone.y, radius * 0.85, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawTrail(ctx: CanvasRenderingContext2D, trail: TrailPoint[], time: number): void {
  if (trail.length < 2) return;
  ctx.save();
  for (let i = 1; i < trail.length; i++) {
    const p0 = trail[i - 1];
    const p1 = trail[i];
    const age = time - p1.time;
    const alpha = clamp(1 - age / 2000, 0, 1);
    if (alpha <= 0) continue;
    const width = p1.width * alpha;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = p1.color;
    ctx.lineWidth = width + 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = p1.color;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
    ctx.lineWidth = width;
    ctx.strokeStyle = '#FFFFFF';
    ctx.shadowBlur = 0;
    ctx.stroke();
  }
  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  ctx.save();
  for (const p of particles) {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawObstacle(ctx: CanvasRenderingContext2D, obs: Obstacle, time: number): void {
  ctx.save();
  const pulseScale = 1 + obs.pulse * 0.25;
  const size = obs.size * pulseScale;
  const x = obs.x + (obs.size - size) / 2;
  const y = obs.y + (obs.size - size) / 2;
  let alpha = 1;
  if (obs.hit) {
    alpha = clamp(obs.hitTime / 200, 0, 1);
  }
  ctx.globalAlpha = alpha;
  ctx.shadowColor = obs.color;
  ctx.shadowBlur = 15 + Math.sin(time / 100) * 5;
  ctx.strokeStyle = obs.color;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, size, size);
  ctx.fillStyle = obs.color + '33';
  ctx.fillRect(x, y, size, size);
  ctx.restore();
}

function drawCar(ctx: CanvasRenderingContext2D, car: Car, time: number): void {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);

  if (car.isBlinking) {
    const blink = Math.sin(time / 30) > 0 ? 1 : 0.3;
    ctx.globalAlpha = blink;
  }

  // Car body (triangle with glow)
  ctx.shadowColor = '#00FFFF';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#00FFFF';
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-8, -7);
  ctx.lineTo(-5, 0);
  ctx.lineTo(-8, 7);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.save();
  // Lives
  for (let i = 0; i < MAX_LIVES; i++) {
    const x = 30 + i * 35;
    const y = 30;
    const filled = i < state.car.lives;
    const color = filled ? '#00FF00' : '#555555';
    ctx.shadowColor = filled ? '#00FF00' : '#000000';
    ctx.shadowBlur = filled ? 15 : 0;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
    if (filled) {
      ctx.fillStyle = '#88FF88';
      ctx.beginPath();
      ctx.arc(x - 3, y - 3, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Score
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 4;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`分数: ${state.score}`, 30, 55);

  // Combo
  if (state.car.combo >= 2) {
    ctx.fillStyle = '#FFFF00';
    ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
    ctx.fillText(`连击 x${state.car.combo}`, 30, 95);
  }

  // Time indicator
  const t = clamp(state.elapsedTime / 120000, 0, 1);
  const timeColor = lerpColor('#00FFFF', '#FF00FF', t);
  ctx.strokeStyle = timeColor;
  ctx.lineWidth = 2;
  ctx.shadowColor = timeColor;
  ctx.shadowBlur = 8;
  ctx.strokeRect(30, 130, 150, 6);
  ctx.fillStyle = timeColor;
  ctx.fillRect(30, 130, 150 * t, 6);
  ctx.restore();
}

function drawStartOverlay(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(10, 10, 26, 0.85)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#00FFFF';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#00FFFF';
  ctx.font = 'bold 56px "Segoe UI", Arial, sans-serif';
  ctx.fillText('光轨赛车', W / 2, H / 2 - 80);
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '22px "Segoe UI", Arial, sans-serif';
  ctx.fillText('按住鼠标左键拖拽绘制光轨', W / 2, H / 2 - 10);
  ctx.fillText('赛车将沿光轨自动前进', W / 2, H / 2 + 25);
  ctx.fillText('躲避发光方块，收集得分区域', W / 2, H / 2 + 60);
  ctx.shadowColor = '#FF00FF';
  ctx.shadowBlur = 15;
  ctx.fillStyle = '#FF00FF';
  ctx.font = 'bold 26px "Segoe UI", Arial, sans-serif';
  ctx.fillText('点击任意位置开始游戏', W / 2, H / 2 + 120);
  ctx.fillStyle = '#AAAAAA';
  ctx.font = '16px "Segoe UI", Arial, sans-serif';
  ctx.shadowBlur = 0;
  ctx.fillText('空格键暂停 / R键重新开始', W / 2, H / 2 + 170);
  ctx.restore();
}

function drawPausedOverlay(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(10, 10, 26, 0.75)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#FFFF00';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#FFFF00';
  ctx.font = 'bold 52px "Segoe UI", Arial, sans-serif';
  ctx.fillText('暂停中', W / 2, H / 2 - 20);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#CCCCCC';
  ctx.font = '20px "Segoe UI", Arial, sans-serif';
  ctx.fillText('按空格键继续', W / 2, H / 2 + 40);
  ctx.restore();
}

function drawGameOverOverlay(ctx: CanvasRenderingContext2D, W: number, H: number, score: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(30, 30, 30, 0.7)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#FF5555';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#FF5555';
  ctx.font = 'bold 48px "Segoe UI", Arial, sans-serif';
  ctx.fillText('游戏结束', W / 2, H / 2 - 70);
  ctx.shadowColor = '#FFFFFF';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`最终得分: ${score}`, W / 2, H / 2);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#AAAAAA';
  ctx.font = '20px "Segoe UI", Arial, sans-serif';
  ctx.fillText('按 R 键重新开始', W / 2, H / 2 + 60);
  ctx.restore();
}
