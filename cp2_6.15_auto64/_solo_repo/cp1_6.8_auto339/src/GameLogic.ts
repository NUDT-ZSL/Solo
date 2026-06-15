import { Vec2, LevelDef, levels as levelDefs } from './levels';

export interface GravityLine {
  points: Vec2[];
  energyCost: number;
  age: number;
}

export interface AsteroidState {
  id: string;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  textureSeed: number;
  alive: boolean;
  trail: Vec2[];
}

export interface StarGateState {
  id: string;
  pos: Vec2;
  radius: number;
  hitsRequired: number;
  currentHits: number;
  unlocked: boolean;
  color: string;
  pulsePhase: number;
}

export interface StarFragmentState {
  id: string;
  pos: Vec2;
  radius: number;
  collected: boolean;
  pulsePhase: number;
}

export interface Particle {
  pos: Vec2;
  vel: Vec2;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export type GamePhase = 'idle' | 'drawing' | 'simulating' | 'won' | 'lost';

export interface GameState {
  levelIndex: number;
  phase: GamePhase;
  playerPlanet: Vec2;
  asteroids: AsteroidState[];
  starGates: StarGateState[];
  starFragments: StarFragmentState[];
  gravityLines: GravityLine[];
  currentDrawing: Vec2[] | null;
  energy: number;
  maxEnergy: number;
  energyRegenRate: number;
  particles: Particle[];
  interferenceZones: LevelDef['interferenceZones'];
  blackHoles: LevelDef['blackHoles'];
  nebulae: LevelDef['nebulae'];
  gravityConstraint: LevelDef['gravityConstraint'];
  time: number;
  gateHitEffects: { pos: Vec2; age: number; color: string }[];
  collectEffects: { pos: Vec2; age: number }[];
}

const GRAVITY_LINE_INFLUENCE_RADIUS = 80;
const GRAVITY_LINE_FORCE = 200;
const BLACK_HOLE_CAPTURE_RADIUS_FACTOR = 0.6;
const MAX_TRAIL_LENGTH = 30;
const PARTICLE_SPAWN_RATE = 3;
const GATE_HIT_EFFECT_DURATION = 1.0;
const COLLECT_EFFECT_DURATION = 0.8;

function vec2Add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function vec2Sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function vec2Scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

function vec2Len(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

function vec2Normalize(v: Vec2): Vec2 {
  const len = vec2Len(v);
  if (len < 1e-8) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function vec2Dist(a: Vec2, b: Vec2): number {
  return vec2Len(vec2Sub(a, b));
}

function vec2Dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function closestPointOnSegment(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  const ab = vec2Sub(b, a);
  const ap = vec2Sub(p, a);
  const abLen2 = vec2Dot(ab, ab);
  if (abLen2 < 1e-8) return { ...a };
  const t = Math.max(0, Math.min(1, vec2Dot(ap, ab) / abLen2));
  return vec2Add(a, vec2Scale(ab, t));
}

function computeGravityLineLength(points: Vec2[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += vec2Dist(points[i - 1], points[i]);
  }
  return len;
}

function computeCurvature(points: Vec2[]): number {
  if (points.length < 3) return 0;
  let totalAngle = 0;
  let count = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const a = vec2Sub(points[i - 1], points[i]);
    const b = vec2Sub(points[i + 1], points[i]);
    const la = vec2Len(a);
    const lb = vec2Len(b);
    if (la < 1e-8 || lb < 1e-8) continue;
    const cosAngle = vec2Dot(a, b) / (la * lb);
    totalAngle += Math.acos(Math.max(-1, Math.min(1, cosAngle)));
    count++;
  }
  return count > 0 ? totalAngle / count : 0;
}

function resamplePoints(points: Vec2[], spacing: number): Vec2[] {
  if (points.length < 2) return [...points];
  const result: Vec2[] = [points[0]];
  let accDist = 0;
  for (let i = 1; i < points.length; i++) {
    const d = vec2Dist(points[i - 1], points[i]);
    accDist += d;
    if (accDist >= spacing) {
      result.push({ ...points[i] });
      accDist = 0;
    }
  }
  if (result.length < 2 && points.length >= 2) {
    result.push({ ...points[points.length - 1] });
  }
  return result;
}

export function createInitialState(levelIndex: number): GameState {
  const def = levelDefs[levelIndex];
  return {
    levelIndex,
    phase: 'idle',
    playerPlanet: { ...def.playerPlanet },
    asteroids: def.asteroids.map((a) => ({
      id: a.id,
      pos: { ...a.pos },
      vel: { ...a.vel },
      radius: a.radius,
      textureSeed: a.textureSeed,
      alive: true,
      trail: [],
    })),
    starGates: def.starGates.map((g) => ({
      id: g.id,
      pos: { ...g.pos },
      radius: g.radius,
      hitsRequired: g.hitCount,
      currentHits: 0,
      unlocked: false,
      color: g.color,
      pulsePhase: 0,
    })),
    starFragments: def.starFragments.map((f) => ({
      id: f.id,
      pos: { ...f.pos },
      radius: f.radius,
      collected: false,
      pulsePhase: Math.random() * Math.PI * 2,
    })),
    gravityLines: [],
    currentDrawing: null,
    energy: def.maxEnergy,
    maxEnergy: def.maxEnergy,
    energyRegenRate: def.energyRegenRate,
    particles: [],
    interferenceZones: def.interferenceZones,
    blackHoles: def.blackHoles,
    nebulae: def.nebulae,
    gravityConstraint: { ...def.gravityConstraint },
    time: 0,
    gateHitEffects: [],
    collectEffects: [],
  };
}

export function startDrawing(state: GameState, pos: Vec2): GameState {
  if (state.phase !== 'idle' && state.phase !== 'simulating') return state;
  if (state.energy < state.gravityConstraint.energyCost) return state;
  return {
    ...state,
    phase: 'drawing',
    currentDrawing: [pos],
  };
}

export function continueDrawing(state: GameState, pos: Vec2): GameState {
  if (state.phase !== 'drawing' || !state.currentDrawing) return state;
  const last = state.currentDrawing[state.currentDrawing.length - 1];
  if (vec2Dist(last, pos) < 5) return state;
  const newPoints = [...state.currentDrawing, pos];
  const len = computeGravityLineLength(newPoints);
  if (len > state.gravityConstraint.maxLength) return state;
  const resampled = resamplePoints(newPoints, 8);
  const curvature = computeCurvature(resampled);
  if (curvature > state.gravityConstraint.maxCurvature + 0.3) return state;
  return {
    ...state,
    currentDrawing: resampled,
  };
}

export function finishDrawing(state: GameState): GameState {
  if (state.phase !== 'drawing' || !state.currentDrawing) return state;
  if (state.currentDrawing.length < 3) {
    return { ...state, phase: 'simulating', currentDrawing: null };
  }
  const resampled = resamplePoints(state.currentDrawing, 8);
  const curvature = computeCurvature(resampled);
  if (curvature > state.gravityConstraint.maxCurvature) {
    return { ...state, phase: 'simulating', currentDrawing: null };
  }
  const newLine: GravityLine = {
    points: resampled,
    energyCost: state.gravityConstraint.energyCost,
    age: 0,
  };
  return {
    ...state,
    phase: 'simulating',
    currentDrawing: null,
    gravityLines: [...state.gravityLines, newLine],
    energy: state.energy - state.gravityConstraint.energyCost,
  };
}

export function cancelDrawing(state: GameState): GameState {
  if (state.phase !== 'drawing') return state;
  return { ...state, phase: 'simulating', currentDrawing: null };
}

function applyGravityLines(asteroid: AsteroidState, lines: GravityLine[]): Vec2 {
  let forceX = 0;
  let forceY = 0;
  for (const line of lines) {
    for (let i = 0; i < line.points.length - 1; i++) {
      const closest = closestPointOnSegment(asteroid.pos, line.points[i], line.points[i + 1]);
      const dist = vec2Dist(asteroid.pos, closest);
      if (dist < GRAVITY_LINE_INFLUENCE_RADIUS && dist > 1) {
        const dir = vec2Normalize(vec2Sub(closest, asteroid.pos));
        const strength = GRAVITY_LINE_FORCE * (1 - dist / GRAVITY_LINE_INFLUENCE_RADIUS);
        forceX += dir.x * strength;
        forceY += dir.y * strength;
      }
    }
  }
  return { x: forceX, y: forceY };
}

function applyInterferenceZones(pos: Vec2, vel: Vec2, zones: LevelDef['interferenceZones']): Vec2 {
  let offsetX = 0;
  let offsetY = 0;
  for (const zone of zones) {
    const dist = vec2Dist(pos, zone.pos);
    if (dist < zone.radius) {
      const factor = (1 - dist / zone.radius) * zone.strength;
      offsetX += zone.direction.x * factor;
      offsetY += zone.direction.y * factor;
    }
  }
  return { x: vel.x + offsetX, y: vel.y + offsetY };
}

function applyBlackHoles(pos: Vec2, bh: LevelDef['blackHoles'][0]): Vec2 {
  const diff = vec2Sub(bh.pos, pos);
  const dist = vec2Len(diff);
  if (dist < bh.pullRadius && dist > 1) {
    const dir = vec2Normalize(diff);
    const strength = bh.pullStrength * (1 - dist / bh.pullRadius);
    return vec2Scale(dir, strength);
  }
  return { x: 0, y: 0 };
}

function spawnParticles(particles: Particle[], pos: Vec2, color: string, count: number, speed: number): Particle[] {
  const newParticles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = speed * (0.5 + Math.random() * 0.5);
    newParticles.push({
      pos: { x: pos.x + (Math.random() - 0.5) * 6, y: pos.y + (Math.random() - 0.5) * 6 },
      vel: { x: Math.cos(angle) * spd, y: Math.sin(angle) * spd },
      life: 1,
      maxLife: 0.4 + Math.random() * 0.6,
      color,
      size: 1.5 + Math.random() * 2,
    });
  }
  return [...particles, ...newParticles];
}

export function update(state: GameState, dt: number): GameState {
  if (state.phase === 'won' || state.phase === 'lost') {
    return updateParticles(state, dt);
  }

  const newTime = state.time + dt;

  let newEnergy = state.energy + state.energyRegenRate * dt;
  newEnergy = Math.min(newEnergy, state.maxEnergy);

  let newAsteroids = state.asteroids.map((a) => ({ ...a, trail: [...a.trail] }));
  let newStarGates = state.starGates.map((g) => ({ ...g }));
  let newStarFragments = state.starFragments.map((f) => ({ ...f }));
  let newParticles = [...state.particles];
  let newGateHitEffects = [...state.gateHitEffects];
  let newCollectEffects = [...state.collectEffects];
  let newGravityLines = state.gravityLines.map((l) => ({ ...l, points: [...l.points] }));

  for (const line of newGravityLines) {
    line.age += dt;
  }

  for (const asteroid of newAsteroids) {
    if (!asteroid.alive) continue;

    const gravityForce = applyGravityLines(asteroid, newGravityLines);
    let newVel = vec2Add(asteroid.vel, vec2Scale(gravityForce, dt));

    newVel = applyInterferenceZones(asteroid.pos, newVel, state.interferenceZones);

    for (const bh of state.blackHoles) {
      const bhForce = applyBlackHoles(asteroid.pos, bh);
      newVel = vec2Add(newVel, vec2Scale(bhForce, dt));
    }

    asteroid.vel = newVel;
    asteroid.pos = vec2Add(asteroid.pos, vec2Scale(asteroid.vel, dt));

    asteroid.trail.push({ ...asteroid.pos });
    if (asteroid.trail.length > MAX_TRAIL_LENGTH) {
      asteroid.trail.shift();
    }

    if (Math.random() < 0.3) {
      newParticles = spawnParticles(newParticles, asteroid.pos, '#aaaacc', 1, 15);
    }

    for (const bh of state.blackHoles) {
      const dist = vec2Dist(asteroid.pos, bh.pos);
      if (dist < bh.radius * BLACK_HOLE_CAPTURE_RADIUS_FACTOR + asteroid.radius) {
        asteroid.alive = false;
        newParticles = spawnParticles(newParticles, asteroid.pos, '#ff4400', 15, 60);
        break;
      }
    }

    if (!asteroid.alive) continue;

    for (const gate of newStarGates) {
      if (gate.unlocked) continue;
      const dist = vec2Dist(asteroid.pos, gate.pos);
      if (dist < gate.radius + asteroid.radius) {
        gate.currentHits++;
        newParticles = spawnParticles(newParticles, gate.pos, gate.color, 20, 80);
        newGateHitEffects.push({ pos: { ...gate.pos }, age: 0, color: gate.color });

        const bounceDir = vec2Normalize(vec2Sub(asteroid.pos, gate.pos));
        asteroid.vel = vec2Scale(bounceDir, vec2Len(asteroid.vel) * 0.6);

        if (gate.currentHits >= gate.hitsRequired) {
          gate.unlocked = true;
          newParticles = spawnParticles(newParticles, gate.pos, gate.color, 40, 120);
        }
      }
    }

    for (const fragment of newStarFragments) {
      if (fragment.collected) continue;
      const dist = vec2Dist(asteroid.pos, fragment.pos);
      if (dist < fragment.radius + asteroid.radius + 5) {
        fragment.collected = true;
        newCollectEffects.push({ pos: { ...fragment.pos }, age: 0 });
        newParticles = spawnParticles(newParticles, fragment.pos, '#ffdd44', 25, 70);
      }
    }

    if (asteroid.pos.x < -100 || asteroid.pos.x > 2020 ||
        asteroid.pos.y < -100 || asteroid.pos.y > 1180) {
      asteroid.alive = false;
    }
  }

  newParticles = updateParticleList(newParticles, dt);
  newGateHitEffects = newGateHitEffects
    .map((e) => ({ ...e, age: e.age + dt }))
    .filter((e) => e.age < GATE_HIT_EFFECT_DURATION);
  newCollectEffects = newCollectEffects
    .map((e) => ({ ...e, age: e.age + dt }))
    .filter((e) => e.age < COLLECT_EFFECT_DURATION);

  for (const gate of newStarGates) {
    gate.pulsePhase += dt * 2;
  }
  for (const fragment of newStarFragments) {
    fragment.pulsePhase += dt * 3;
  }

  const allGatesUnlocked = newStarGates.every((g) => g.unlocked);
  const allFragmentsCollected = newStarFragments.every((f) => f.collected);
  const allAsteroidsGone = newAsteroids.every((a) => !a.alive);

  let newPhase: GamePhase = state.phase;
  if (allGatesUnlocked && allFragmentsCollected) {
    newPhase = 'won';
  } else if (allAsteroidsGone && !allGatesUnlocked) {
    newPhase = 'lost';
  }

  return {
    ...state,
    phase: newPhase,
    asteroids: newAsteroids,
    starGates: newStarGates,
    starFragments: newStarFragments,
    gravityLines: newGravityLines,
    energy: newEnergy,
    particles: newParticles,
    gateHitEffects: newGateHitEffects,
    collectEffects: newCollectEffects,
    time: newTime,
  };
}

function updateParticleList(particles: Particle[], dt: number): Particle[] {
  return particles
    .map((p) => ({
      ...p,
      pos: vec2Add(p.pos, vec2Scale(p.vel, dt)),
      vel: vec2Scale(p.vel, 0.98),
      life: p.life - dt / p.maxLife,
    }))
    .filter((p) => p.life > 0);
}

function updateParticles(state: GameState, dt: number): GameState {
  return {
    ...state,
    particles: updateParticleList(state.particles, dt),
    gateHitEffects: state.gateHitEffects
      .map((e) => ({ ...e, age: e.age + dt }))
      .filter((e) => e.age < GATE_HIT_EFFECT_DURATION),
    collectEffects: state.collectEffects
      .map((e) => ({ ...e, age: e.age + dt }))
      .filter((e) => e.age < COLLECT_EFFECT_DURATION),
    time: state.time + dt,
  };
}

export function canDraw(state: GameState): boolean {
  return state.energy >= state.gravityConstraint.energyCost &&
    (state.phase === 'idle' || state.phase === 'simulating');
}

export function getLevelDef(index: number): LevelDef {
  return levelDefs[index];
}

export function getTotalLevels(): number {
  return levelDefs.length;
}
