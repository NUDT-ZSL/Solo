import {
  Vec2, VehicleState, TrackSegment, PlayerInput, AIStyle, ItemType,
  TrailPoint, Particle, CAR_LEN, CAR_WID
} from './types';

function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function normalize(v: Vec2): Vec2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len < 0.001) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function angleDiff(a: number, b: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

const VEHICLE_CONFIGS = [
  { color: '#00e5ff', trail: '#00e5ff88', name: '玩家', maxSpeed: 420, accel: 320, handling: 3.8 },
  { color: '#ff1744', trail: '#ff174488', name: '烈焰', maxSpeed: 440, accel: 300, handling: 3.4, style: 'aggressive' as AIStyle },
  { color: '#ffea00', trail: '#ffea0088', name: '闪电', maxSpeed: 430, accel: 340, handling: 3.2, style: 'balanced' as AIStyle },
  { color: '#76ff03', trail: '#76ff0388', name: '守护', maxSpeed: 400, accel: 310, handling: 4.0, style: 'defensive' as AIStyle },
  { color: '#d500f9', trail: '#d500f988', name: '暗影', maxSpeed: 450, accel: 290, handling: 3.0, style: 'aggressive' as AIStyle },
];

export function createVehicles(track: TrackSegment[]): VehicleState[] {
  const vehicles: VehicleState[] = [];
  const startIdx = 0;
  const startSeg = track[startIdx];
  const perpAngle = startSeg.angle + Math.PI / 2;

  for (let i = 0; i < VEHICLE_CONFIGS.length; i++) {
    const cfg = VEHICLE_CONFIGS[i];
    const offset = (i - 2) * 35;
    const x = startSeg.center.x + Math.cos(perpAngle) * offset;
    const y = startSeg.center.y + Math.sin(perpAngle) * offset;

    vehicles.push({
      id: i,
      x, y,
      vx: 0, vy: 0,
      angle: startSeg.angle,
      speed: 0,
      maxSpeed: cfg.maxSpeed,
      accel: cfg.accel,
      handling: cfg.handling,
      isPlayer: i === 0,
      isDrifting: false,
      driftFactor: 0,
      item: null,
      shieldActive: false,
      shieldTimer: 0,
      nitroActive: false,
      nitroTimer: 0,
      cooldown: 0,
      color: cfg.color,
      trailColor: cfg.trail,
      trail: [],
      lap: 0,
      checkpointIdx: 0,
      lapTimes: [],
      lapStartTime: 0,
      isHit: false,
      hitTimer: 0,
      aiStyle: (cfg as any).style || 'balanced',
      name: cfg.name,
      finished: false,
      finishTime: 0,
      itemsCollected: 0,
      trackProgress: 0,
      steerAngle: 0,
    });
  }
  return vehicles;
}

export function updateVehicle(
  v: VehicleState,
  input: PlayerInput,
  track: TrackSegment[],
  dt: number,
  elapsed: number,
  allVehicles: VehicleState[]
): Particle[] {
  const particles: Particle[] = [];

  if (v.finished) return particles;

  if (v.isHit) {
    v.hitTimer -= dt;
    if (v.hitTimer <= 0) {
      v.isHit = false;
      v.hitTimer = 0;
    }
    v.speed *= 0.97;
  }

  if (v.shieldActive) {
    v.shieldTimer -= dt;
    if (v.shieldTimer <= 0) {
      v.shieldActive = false;
      v.shieldTimer = 0;
    }
  }

  if (v.nitroActive) {
    v.nitroTimer -= dt;
    if (v.nitroTimer <= 0) {
      v.nitroActive = false;
      v.nitroTimer = 0;
    }
  }

  if (v.cooldown > 0) {
    v.cooldown -= dt;
    if (v.cooldown < 0) v.cooldown = 0;
  }

  if (v.isPlayer) {
    updatePlayerInput(v, input, dt, particles);
  } else {
    updateAI(v, track, dt, elapsed, allVehicles, particles);
  }

  applyPhysics(v, dt, track, particles);
  updateTrackProgress(v, track, elapsed);

  if (v.speed > 20 && v.isDrifting) {
    for (let i = 0; i < 2; i++) {
      particles.push({
        x: v.x - Math.cos(v.angle) * CAR_LEN * 0.4 + (Math.random() - 0.5) * 10,
        y: v.y - Math.sin(v.angle) * CAR_LEN * 0.4 + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 30,
        vy: (Math.random() - 0.5) * 30,
        life: 0.6,
        maxLife: 0.6,
        color: '#999999',
        size: 4 + Math.random() * 4,
        kind: 'smoke',
      });
    }
  }

  if (v.nitroActive) {
    for (let i = 0; i < 3; i++) {
      particles.push({
        x: v.x - Math.cos(v.angle) * CAR_LEN * 0.5,
        y: v.y - Math.sin(v.angle) * CAR_LEN * 0.5,
        vx: -Math.cos(v.angle) * (100 + Math.random() * 60) + (Math.random() - 0.5) * 40,
        vy: -Math.sin(v.angle) * (100 + Math.random() * 60) + (Math.random() - 0.5) * 40,
        life: 0.4,
        maxLife: 0.4,
        color: Math.random() > 0.5 ? '#ff6600' : '#ffaa00',
        size: 3 + Math.random() * 5,
        kind: 'nitro',
      });
    }
  }

  if (v.speed > 5) {
    v.trail.push({ x: v.x, y: v.y, alpha: 1 });
    if (v.trail.length > 60) v.trail.shift();
    for (const tp of v.trail) {
      tp.alpha -= dt * 2;
    }
    v.trail = v.trail.filter(tp => tp.alpha > 0);
  }

  return particles;
}

function updatePlayerInput(v: VehicleState, input: PlayerInput, dt: number, particles: Particle[]) {
  if (input.up) {
    const boost = v.nitroActive ? 1.5 : 1;
    v.speed += v.accel * boost * dt;
  } else if (input.down) {
    v.speed -= v.accel * 1.2 * dt;
  } else {
    v.speed *= 0.98;
  }

  const maxSpd = v.nitroActive ? v.maxSpeed * 1.4 : v.maxSpeed;
  v.speed = Math.max(-maxSpd * 0.3, Math.min(maxSpd, v.speed));

  let turnRate = v.handling;
  v.isDrifting = input.drift && Math.abs(v.speed) > 50;
  if (v.isDrifting) {
    turnRate *= 1.6;
    v.driftFactor = Math.min(1, v.driftFactor + dt * 4);
  } else {
    v.driftFactor = Math.max(0, v.driftFactor - dt * 6);
  }

  const speedFactor = Math.min(1, Math.abs(v.speed) / 100);
  if (input.left) {
    v.steerAngle = -1;
    v.angle -= turnRate * speedFactor * dt;
  } else if (input.right) {
    v.steerAngle = 1;
    v.angle += turnRate * speedFactor * dt;
  } else {
    v.steerAngle = 0;
  }

  if (input.useItem && v.item && v.cooldown <= 0) {
    useItem(v, particles);
  }
}

function updateAI(
  v: VehicleState,
  track: TrackSegment[],
  dt: number,
  elapsed: number,
  allVehicles: VehicleState[],
  particles: Particle[]
) {
  const segIdx = findClosestSegment(v, track);
  const lookAhead = 12;
  const targetIdx = (segIdx + lookAhead) % track.length;
  const target = track[targetIdx].center;

  const dx = target.x - v.x;
  const dy = target.y - v.y;
  const targetAngle = Math.atan2(dy, dx);
  const diff = angleDiff(v.angle, targetAngle);

  const turnSpeed = v.handling * 0.9;
  if (Math.abs(diff) > 0.05) {
    v.angle += Math.sign(diff) * Math.min(Math.abs(diff), turnSpeed * dt);
    v.steerAngle = Math.sign(diff);
  } else {
    v.steerAngle = 0;
  }

  const curvature = Math.abs(diff);
  const targetSpeed = curvature > 0.8 ? v.maxSpeed * 0.5 : curvature > 0.4 ? v.maxSpeed * 0.75 : v.maxSpeed;
  if (v.speed < targetSpeed) {
    v.speed += v.accel * dt;
  } else {
    v.speed -= v.accel * 0.5 * dt;
  }

  const player = allVehicles[0];
  const playerDist = dist({ x: v.x, y: v.y }, { x: player.x, y: player.y });

  if (v.aiStyle === 'aggressive' && playerDist < 200) {
    const pushAngle = Math.atan2(player.y - v.y, player.x - v.x);
    v.angle += angleDiff(v.angle, pushAngle) * 0.02;
    if (v.speed < v.maxSpeed * 0.9) v.speed += v.accel * 0.3 * dt;
  }

  if (v.aiStyle === 'defensive') {
    if (v.item === 'shield' && playerDist < 250 && !v.shieldActive && v.cooldown <= 0) {
      useItem(v, particles);
    }
    if (v.item === 'nitro' && curvature < 0.3 && v.cooldown <= 0) {
      useItem(v, particles);
    }
  }

  if (v.aiStyle === 'aggressive' && v.item === 'nitro' && curvature < 0.3 && v.cooldown <= 0) {
    useItem(v, particles);
  }

  if (v.aiStyle === 'balanced' && v.item && Math.random() < 0.005 && v.cooldown <= 0) {
    useItem(v, particles);
  }

  v.isDrifting = curvature > 0.6 && v.speed > 100;
  if (v.isDrifting) {
    v.driftFactor = Math.min(1, v.driftFactor + dt * 4);
  } else {
    v.driftFactor = Math.max(0, v.driftFactor - dt * 6);
  }

  v.speed = Math.max(0, Math.min(v.nitroActive ? v.maxSpeed * 1.4 : v.maxSpeed, v.speed));
}

function applyPhysics(v: VehicleState, dt: number, track: TrackSegment[], particles: Particle[]) {
  const segIdx = findClosestSegment(v, track);
  const seg = track[segIdx];
  const dx = v.x - seg.center.x;
  const dy = v.y - seg.center.y;
  const perpDist = Math.abs(dx * Math.sin(seg.angle) - dy * Math.cos(seg.angle));

  if (perpDist > seg.width * 0.45) {
    v.speed *= 0.96;
    if (Math.random() < 0.3) {
      particles.push({
        x: v.x + (Math.random() - 0.5) * 10,
        y: v.y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 40,
        vy: (Math.random() - 0.5) * 40,
        life: 0.5,
        maxLife: 0.5,
        color: '#ff4400',
        size: 3 + Math.random() * 4,
        kind: 'fire',
      });
    }
  }

  const driftSlip = v.driftFactor * 0.3;
  const moveAngle = v.angle;

  v.vx = Math.cos(moveAngle) * v.speed * (1 - driftSlip) + v.vx * driftSlip;
  v.vy = Math.sin(moveAngle) * v.speed * (1 - driftSlip) + v.vy * driftSlip;

  v.x += v.vx * dt;
  v.y += v.vy * dt;

  const friction = v.isDrifting ? 0.995 : 0.998;
  v.vx *= friction;
  v.vy *= friction;
}

function useItem(v: VehicleState, particles: Particle[]) {
  if (!v.item) return;
  if (v.item === 'nitro') {
    v.nitroActive = true;
    v.nitroTimer = 2.0;
    v.speed = Math.min(v.speed + 200, v.maxSpeed * 1.4);
  } else if (v.item === 'shield') {
    v.shieldActive = true;
    v.shieldTimer = 3.0;
  }
  v.item = null;
  v.cooldown = 5.0;
}

export function findClosestSegment(v: VehicleState, track: TrackSegment[]): number {
  let minDist = Infinity;
  let minIdx = 0;
  const step = Math.max(1, Math.floor(track.length / 50));
  for (let i = 0; i < track.length; i += step) {
    const dx = v.x - track[i].center.x;
    const dy = v.y - track[i].center.y;
    const d = dx * dx + dy * dy;
    if (d < minDist) {
      minDist = d;
      minIdx = i;
    }
  }

  const range = step + 2;
  const start = (minIdx - range + track.length) % track.length;
  minDist = Infinity;
  let bestIdx = minIdx;
  for (let j = 0; j <= range * 2; j++) {
    const i = (start + j) % track.length;
    const dx = v.x - track[i].center.x;
    const dy = v.y - track[i].center.y;
    const d = dx * dx + dy * dy;
    if (d < minDist) {
      minDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function updateTrackProgress(v: VehicleState, track: TrackSegment[], elapsed: number) {
  const segIdx = findClosestSegment(v, track);
  const totalSegs = track.length;
  const checkpointsCount = 10;
  const cpInterval = Math.floor(totalSegs / checkpointsCount);

  const currentCp = Math.floor(segIdx / cpInterval) % checkpointsCount;
  const nextCp = (v.checkpointIdx + 1) % checkpointsCount;

  if (currentCp === nextCp) {
    if (v.checkpointIdx === checkpointsCount - 1 && currentCp === 0) {
      v.lap++;
      const lapTime = elapsed - v.lapStartTime;
      v.lapTimes.push(lapTime);
      v.lapStartTime = elapsed;
      if (v.lap >= 3) {
        v.finished = true;
        v.finishTime = elapsed;
      }
    }
    v.checkpointIdx = currentCp;
  }

  v.trackProgress = v.lap * totalSegs + segIdx;
}

export function hitVehicle(v: VehicleState) {
  if (v.shieldActive) return;
  v.isHit = true;
  v.hitTimer = 0.5;
  v.speed *= 0.6;
}
