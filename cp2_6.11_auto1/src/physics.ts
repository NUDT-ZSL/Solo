export interface Vec2 {
  x: number;
  y: number;
}

export interface Ball {
  pos: Vec2;
  vel: Vec2;
  radius: number;
  color: string;
  active: boolean;
  goldenTimer: number;
  particleBurstTimer: number;
}

export interface Planet {
  pos: Vec2;
  radius: number;
  color: string;
  mass: number;
  pulseTimer: number;
  pulseActive: boolean;
}

export interface BlackHole {
  pos: Vec2;
  radius: number;
  mass: number;
}

export interface StarOrbit {
  cx: number;
  cy: number;
  radius: number;
  color: string;
  rotationAngle: number;
  rotationSpeed: number;
  boostActive: boolean;
  boostTimer: number;
  thickness: number;
}

export interface StarParticle {
  x: number;
  y: number;
  size: number;
  alpha: number;
  targetAlpha: number;
  flickerTimer: number;
}

export interface FlashEffect {
  color: string;
  alpha: number;
  timer: number;
  duration: number;
}

export interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface GameState {
  ball: Ball;
  planets: Planet[];
  blackHole: BlackHole;
  starOrbits: StarOrbit[];
  starParticles: StarParticle[];
  score: number;
  launchesLeft: number;
  gameOver: boolean;
  isLaunching: boolean;
  launchPos: Vec2;
  purpleFlash: FlashEffect;
  goldFlash: FlashEffect;
  silverFlash: FlashEffect;
  burstParticles: BurstParticle[];
  lastScore50: boolean;
  lastScore100: boolean;
}

const G = 800;
const FRICTION = 0.998;
const MIN_SPEED = 0.3;
const BOOST_DURATION = 1.0;

export function createGameState(): GameState {
  const launchPos = { x: 100, y: 300 };

  return {
    ball: {
      pos: { ...launchPos },
      vel: { x: 0, y: 0 },
      radius: 8,
      color: '#00FFFF',
      active: false,
      goldenTimer: 0,
      particleBurstTimer: 0,
    },
    planets: [
      { pos: { x: 350, y: 200 }, radius: 30, color: '#FFD93D', mass: 500, pulseTimer: 0, pulseActive: false },
      { pos: { x: 550, y: 400 }, radius: 30, color: '#FF8C42', mass: 500, pulseTimer: 0, pulseActive: false },
    ],
    blackHole: {
      pos: { x: 650, y: 250 },
      radius: 25,
      mass: 1200,
    },
    starOrbits: [
      { cx: 350, cy: 200, radius: 80, color: '#FF6B9D', rotationAngle: 0, rotationSpeed: 1.2, boostActive: false, boostTimer: 0, thickness: 3 },
      { cx: 550, cy: 400, radius: 100, color: '#6BCB77', rotationAngle: Math.PI / 3, rotationSpeed: -0.8, boostActive: false, boostTimer: 0, thickness: 3 },
      { cx: 650, cy: 250, radius: 120, color: '#4D96FF', rotationAngle: Math.PI, rotationSpeed: 0.5, boostActive: false, boostTimer: 0, thickness: 3 },
    ],
    starParticles: [],
    score: 0,
    launchesLeft: 3,
    gameOver: false,
    isLaunching: false,
    launchPos,
    purpleFlash: { color: '#9B30FF', alpha: 0, timer: 0, duration: 0.5 },
    goldFlash: { color: '#FFD700', alpha: 0, timer: 0, duration: 0.8 },
    silverFlash: { color: '#C0C0C0', alpha: 0, timer: 0, duration: 0.8 },
    burstParticles: [],
    lastScore50: false,
    lastScore100: false,
  };
}

export function initStarParticles(state: GameState): void {
  state.starParticles = [];
  for (let i = 0; i < 25; i++) {
    state.starParticles.push({
      x: Math.random() * 800,
      y: Math.random() * 600,
      size: 2 + Math.random() * 2,
      alpha: 0.2 + Math.random() * 0.6,
      targetAlpha: 0.2 + Math.random() * 0.6,
      flickerTimer: Math.random() * 0.5,
    });
  }
}

function vecLen(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

function vecNorm(v: Vec2): Vec2 {
  const len = vecLen(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function vecDist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function applyGravity(ball: Ball, body: { pos: Vec2; mass: number }, dt: number): void {
  const dx = body.pos.x - ball.pos.x;
  const dy = body.pos.y - ball.pos.y;
  const distSq = dx * dx + dy * dy;
  const dist = Math.sqrt(distSq);
  if (dist < 5) return;

  const forceMag = (G * body.mass) / distSq;
  const cappedForce = Math.min(forceMag, 500);
  const nx = dx / dist;
  const ny = dy / dist;

  ball.vel.x += nx * cappedForce * dt;
  ball.vel.y += ny * cappedForce * dt;
}

function checkPlanetCollision(ball: Ball, planet: Planet, state: GameState): boolean {
  const dist = vecDist(ball.pos, planet.pos);
  if (dist < ball.radius + planet.radius) {
    const dx = ball.pos.x - planet.pos.x;
    const dy = ball.pos.y - planet.pos.y;
    const nx = dx / dist;
    const ny = dy / dist;

    const dot = ball.vel.x * nx + ball.vel.y * ny;
    ball.vel.x -= 2 * dot * nx;
    ball.vel.y -= 2 * dot * ny;

    const m1 = 1;
    const m2 = planet.mass;
    const momentumFactor = (2 * m2) / (m1 + m2);
    ball.vel.x = ball.vel.x - momentumFactor * dot * nx;
    ball.vel.y = ball.vel.y - momentumFactor * dot * ny;

    const overlap = ball.radius + planet.radius - dist + 1;
    ball.pos.x += nx * overlap;
    ball.pos.y += ny * overlap;

    state.score += 10;
    planet.pulseActive = true;
    planet.pulseTimer = 0.3;
    ball.goldenTimer = 0.2;
    ball.particleBurstTimer = 0.2;

    spawnBurstParticles(state, ball.pos.x, ball.pos.y, planet.color);

    if (state.score > 50 && !state.lastScore50) {
      state.goldFlash.alpha = 0.6;
      state.goldFlash.timer = state.goldFlash.duration;
      state.lastScore50 = true;
    }
    if (state.score > 100 && !state.lastScore100) {
      state.silverFlash.alpha = 0.6;
      state.silverFlash.timer = state.silverFlash.duration;
      state.lastScore100 = true;
    }

    return true;
  }
  return false;
}

function checkBlackHoleCollision(ball: Ball, hole: BlackHole, state: GameState): boolean {
  const dist = vecDist(ball.pos, hole.pos);
  if (dist < hole.radius) {
    state.score -= 20;
    if (state.score < 0) state.score = 0;
    ball.pos = { ...state.launchPos };
    ball.vel = { x: 0, y: 0 };
    ball.active = false;
    state.launchesLeft--;
    if (state.launchesLeft <= 0) {
      state.gameOver = true;
    }
    return true;
  }
  return false;
}

function checkStarOrbitBoost(ball: Ball, orbit: StarOrbit, state: GameState): boolean {
  const dx = ball.pos.x - orbit.cx;
  const dy = ball.pos.y - orbit.cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const ringDist = Math.abs(dist - orbit.radius);

  if (ringDist < ball.radius + orbit.thickness && !orbit.boostActive) {
    orbit.boostActive = true;
    orbit.boostTimer = BOOST_DURATION;
    const speed = vecLen(ball.vel);
    if (speed > 0) {
      ball.vel.x *= 2;
      ball.vel.y *= 2;
    }
    state.purpleFlash.alpha = 0.5;
    state.purpleFlash.timer = state.purpleFlash.duration;
    return true;
  }
  return false;
}

function spawnBurstParticles(state: GameState, x: number, y: number, color: string): void {
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12;
    const speed = 80 + Math.random() * 60;
    state.burstParticles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.2,
      maxLife: 0.2,
      color,
      size: 3,
    });
  }
}

function updateBurstParticles(state: GameState, dt: number): void {
  for (let i = state.burstParticles.length - 1; i >= 0; i--) {
    const p = state.burstParticles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) {
      state.burstParticles.splice(i, 1);
    }
  }
}

function updateStarParticles(state: GameState, dt: number): void {
  for (const p of state.starParticles) {
    p.flickerTimer -= dt;
    if (p.flickerTimer <= 0) {
      p.targetAlpha = 0.2 + Math.random() * 0.6;
      p.flickerTimer = 0.5;
    }
    const diff = p.targetAlpha - p.alpha;
    p.alpha += diff * dt * 4;
  }
}

function updateFlash(flash: FlashEffect, dt: number): void {
  if (flash.timer > 0) {
    flash.timer -= dt;
    flash.alpha = (flash.timer / flash.duration) * 0.6;
    if (flash.timer <= 0) {
      flash.alpha = 0;
      flash.timer = 0;
    }
  }
}

function updateStarOrbits(state: GameState, dt: number): void {
  for (const orbit of state.starOrbits) {
    orbit.rotationAngle += orbit.rotationSpeed * dt;
    if (orbit.boostActive) {
      orbit.boostTimer -= dt;
      if (orbit.boostTimer <= 0) {
        orbit.boostActive = false;
        orbit.boostTimer = 0;
      }
    }
  }
}

export function updatePhysics(state: GameState, dt: number): void {
  if (!state.ball.active) return;

  const ball = state.ball;

  for (const planet of state.planets) {
    applyGravity(ball, planet, dt);
  }
  applyGravity(ball, state.blackHole, dt);

  ball.pos.x += ball.vel.x * dt;
  ball.pos.y += ball.vel.y * dt;

  ball.vel.x *= FRICTION;
  ball.vel.y *= FRICTION;

  for (const planet of state.planets) {
    checkPlanetCollision(ball, planet, state);
  }

  checkBlackHoleCollision(ball, state.blackHole, state);

  for (const orbit of state.starOrbits) {
    checkStarOrbitBoost(ball, orbit, state);
  }

  if (ball.pos.x - ball.radius < 0) {
    ball.pos.x = ball.radius;
    ball.vel.x = Math.abs(ball.vel.x);
  }
  if (ball.pos.x + ball.radius > 800) {
    ball.pos.x = 800 - ball.radius;
    ball.vel.x = -Math.abs(ball.vel.x);
  }
  if (ball.pos.y - ball.radius < 0) {
    ball.pos.y = ball.radius;
    ball.vel.y = Math.abs(ball.vel.y);
  }
  if (ball.pos.y + ball.radius > 600) {
    ball.pos.y = 600 - ball.radius;
    ball.vel.y = -Math.abs(ball.vel.y);
  }

  const speed = vecLen(ball.vel);
  if (speed < MIN_SPEED) {
    ball.active = false;
    ball.vel = { x: 0, y: 0 };
    ball.pos = { ...state.launchPos };
    state.launchesLeft--;
    if (state.launchesLeft <= 0) {
      state.gameOver = true;
    }
  }

  if (ball.goldenTimer > 0) {
    ball.goldenTimer -= dt;
  }
  if (ball.particleBurstTimer > 0) {
    ball.particleBurstTimer -= dt;
  }

  for (const planet of state.planets) {
    if (planet.pulseActive) {
      planet.pulseTimer -= dt;
      if (planet.pulseTimer <= 0) {
        planet.pulseActive = false;
        planet.pulseTimer = 0;
      }
    }
  }

  updateStarOrbits(state, dt);
  updateStarParticles(state, dt);
  updateFlash(state.purpleFlash, dt);
  updateFlash(state.goldFlash, dt);
  updateFlash(state.silverFlash, dt);
  updateBurstParticles(state, dt);
}

export function launchBall(state: GameState, angle: number, power: number): void {
  if (state.ball.active || state.launchesLeft <= 0 || state.gameOver) return;

  const speed = power * 60;
  state.ball.vel = {
    x: Math.cos(angle) * speed,
    y: Math.sin(angle) * speed,
  };
  state.ball.pos = { ...state.launchPos };
  state.ball.active = true;
  state.ball.goldenTimer = 0;
  state.ball.particleBurstTimer = 0;
}

export function resetGame(state: GameState): void {
  const fresh = createGameState();
  Object.assign(state, fresh);
  initStarParticles(state);
}
