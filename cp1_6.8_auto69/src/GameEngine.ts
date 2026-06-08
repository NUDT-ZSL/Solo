import {
  Vec2, TrackSegment, VehicleState, PlayerInput, Particle,
  GameUIState, GamePhase, GameResult, ResultEntry, RankingEntry,
  ItemType, TRACK_POINTS, TRACK_WIDTH, TOTAL_LAPS, CAR_LEN, CAR_WID,
} from './types';
import { createVehicles, updateVehicle, findClosestSegment, hitVehicle } from './VehicleController';
import { HazardManager } from './HazardManager';

function catmullRom(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

export function generateTrack(): TrackSegment[] {
  const controlCount = 14;
  const baseRadius = 1800;
  const controlPoints: Vec2[] = [];

  for (let i = 0; i < controlCount; i++) {
    const angle = (i / controlCount) * Math.PI * 2;
    const r = baseRadius + (Math.sin(angle * 3) * 400 + Math.cos(angle * 2) * 300 + Math.sin(angle * 5) * 200);
    controlPoints.push({
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
    });
  }

  const segments: TrackSegment[] = [];
  const stepsPerSegment = Math.ceil(TRACK_POINTS / controlCount);

  for (let i = 0; i < controlCount; i++) {
    const p0 = controlPoints[(i - 1 + controlCount) % controlCount];
    const p1 = controlPoints[i];
    const p2 = controlPoints[(i + 1) % controlCount];
    const p3 = controlPoints[(i + 2) % controlCount];

    for (let j = 0; j < stepsPerSegment; j++) {
      const t = j / stepsPerSegment;
      const center = catmullRom(p0, p1, p2, p3, t);

      const t2 = (j + 1) / stepsPerSegment;
      const next = catmullRom(p0, p1, p2, p3, t2);
      const angle = Math.atan2(next.y - center.y, next.x - center.x);

      const nx = -Math.sin(angle);
      const ny = Math.cos(angle);
      const widthVar = TRACK_WIDTH * (0.9 + 0.2 * Math.sin(i * 1.7 + j * 0.1));

      segments.push({
        center,
        left: { x: center.x + nx * widthVar * 0.5, y: center.y + ny * widthVar * 0.5 },
        right: { x: center.x - nx * widthVar * 0.5, y: center.y - ny * widthVar * 0.5 },
        angle,
        width: widthVar,
      });
    }
  }

  return segments;
}

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  track: TrackSegment[];
  vehicles: VehicleState[];
  hazardMgr: HazardManager;
  particles: Particle[];
  input: PlayerInput;
  phase: GamePhase;
  countdown: number;
  elapsed: number;
  camera: Vec2;
  cameraAngle: number;
  onStateUpdate: (state: GameUIState) => void;
  lastTime: number = 0;
  animId: number = 0;
  lavaPhase: number = 0;

  constructor(canvas: HTMLCanvasElement, onStateUpdate: (state: GameUIState) => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onStateUpdate = onStateUpdate;
    this.track = generateTrack();
    this.vehicles = createVehicles(this.track);
    this.hazardMgr = new HazardManager();
    this.particles = [];
    this.input = { up: false, down: false, left: false, right: false, drift: false, useItem: false };
    this.phase = 'countdown';
    this.countdown = 3;
    this.elapsed = 0;
    this.camera = { x: 0, y: 0 };
    this.cameraAngle = 0;
    this.setupInput();
  }

  setupInput() {
    const keyMap: Record<string, keyof PlayerInput> = {
      'KeyW': 'up', 'ArrowUp': 'up',
      'KeyS': 'down', 'ArrowDown': 'down',
      'KeyA': 'left', 'ArrowLeft': 'left',
      'KeyD': 'right', 'ArrowRight': 'right',
      'ShiftLeft': 'drift', 'ShiftRight': 'drift',
      'Space': 'useItem',
    };

    window.addEventListener('keydown', (e) => {
      const key = keyMap[e.code];
      if (key) {
        this.input[key] = true;
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = keyMap[e.code];
      if (key) {
        this.input[key] = false;
        e.preventDefault();
      }
    });
  }

  start() {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    cancelAnimationFrame(this.animId);
  }

  restart() {
    this.track = generateTrack();
    this.vehicles = createVehicles(this.track);
    this.hazardMgr = new HazardManager();
    this.particles = [];
    this.phase = 'countdown';
    this.countdown = 3;
    this.elapsed = 0;
    this.lavaPhase = 0;
  }

  loop = (now: number) => {
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.update(dt);
    this.render();

    this.emitState();

    this.animId = requestAnimationFrame(this.loop);
  };

  update(dt: number) {
    this.lavaPhase += dt * 2;

    if (this.phase === 'countdown') {
      this.countdown -= dt;
      if (this.countdown <= 0) {
        this.phase = 'racing';
        this.countdown = 0;
        this.elapsed = 0;
        for (const v of this.vehicles) {
          v.lapStartTime = 0;
        }
      }
      return;
    }

    if (this.phase === 'finished') return;

    this.elapsed += dt;

    for (const v of this.vehicles) {
      const vInput = v.isPlayer ? { ...this.input } : { up: false, down: false, left: false, right: false, drift: false, useItem: false };
      const newParticles = updateVehicle(v, vInput, this.track, dt, this.elapsed, this.vehicles);
      this.particles.push(...newParticles);

      const itemResult = this.hazardMgr.collectItem(v.x, v.y, v.item);
      if (itemResult.collected) {
        v.item = itemResult.type;
        v.itemsCollected++;
      }

      if (this.hazardMgr.checkHazardCollision(v.x, v.y, CAR_LEN * 0.5, v.shieldActive)) {
        hitVehicle(v);
      }
    }

    for (let i = 0; i < this.vehicles.length; i++) {
      for (let j = i + 1; j < this.vehicles.length; j++) {
        const a = this.vehicles[i];
        const b = this.vehicles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = CAR_LEN * 0.8;
        if (dist < minDist && dist > 0.1) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minDist - dist;
          a.x += nx * overlap * 0.5;
          a.y += ny * overlap * 0.5;
          b.x -= nx * overlap * 0.5;
          b.y -= ny * overlap * 0.5;

          if (!a.shieldActive) hitVehicle(a);
          if (!b.shieldActive) hitVehicle(b);
        }
      }
    }

    const hazardParticles = this.hazardMgr.update(this.track, dt);
    this.particles.push(...hazardParticles);

    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.kind === 'fire' || p.kind === 'spark') {
        p.size *= 0.98;
      }
    }
    this.particles = this.particles.filter(p => p.life > 0);

    const player = this.vehicles[0];
    this.camera.x += (player.x - this.camera.x) * 0.08;
    this.camera.y += (player.y - this.camera.y) * 0.08;
    const targetAngle = player.angle;
    let angleDiff = targetAngle - this.cameraAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    this.cameraAngle += angleDiff * 0.04;

    const allFinished = this.vehicles.every(v => v.finished);
    const playerFinished = player.finished;
    if (playerFinished || allFinished) {
      this.phase = 'finished';
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1a0a00';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-this.cameraAngle - Math.PI / 2);
    ctx.translate(-this.camera.x, -this.camera.y);

    this.renderTrack(ctx);
    this.renderItems(ctx);
    this.renderHazards(ctx);
    this.renderParticles(ctx);
    this.renderVehicles(ctx);

    ctx.restore();

    this.renderNitroEffect(ctx, w, h);
    this.renderCountdown(ctx, w, h);
  }

  renderTrack(ctx: CanvasRenderingContext2D) {
    const track = this.track;
    const camX = this.camera.x;
    const camY = this.camera.y;
    const viewDist = 1200;

    for (let i = 0; i < track.length; i++) {
      const seg = track[i];
      const dx = seg.center.x - camX;
      const dy = seg.center.y - camY;
      if (dx * dx + dy * dy > viewDist * viewDist) continue;

      const nextIdx = (i + 1) % track.length;
      const next = track[nextIdx];

      ctx.beginPath();
      ctx.moveTo(seg.left.x, seg.left.y);
      ctx.lineTo(next.left.x, next.left.y);
      ctx.lineTo(next.right.x, next.right.y);
      ctx.lineTo(seg.right.x, seg.right.y);
      ctx.closePath();
      ctx.fillStyle = '#2a2018';
      ctx.fill();

      const lavaGlow = 0.4 + 0.2 * Math.sin(this.lavaPhase + i * 0.05);
      const glowSize = 8 + 4 * Math.sin(this.lavaPhase + i * 0.08);

      ctx.strokeStyle = `rgba(255, 80, 0, ${lavaGlow})`;
      ctx.lineWidth = glowSize;
      ctx.beginPath();
      ctx.moveTo(seg.left.x, seg.left.y);
      ctx.lineTo(next.left.x, next.left.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(seg.right.x, seg.right.y);
      ctx.lineTo(next.right.x, next.right.y);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 160, 0, ${lavaGlow * 0.5})`;
      ctx.lineWidth = glowSize * 2.5;
      ctx.beginPath();
      ctx.moveTo(seg.left.x, seg.left.y);
      ctx.lineTo(next.left.x, next.left.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(seg.right.x, seg.right.y);
      ctx.lineTo(next.right.x, next.right.y);
      ctx.stroke();
    }

    const cpInterval = Math.floor(track.length / 10);
    const startLine = track[0];
    ctx.save();
    ctx.translate(startLine.center.x, startLine.center.y);
    ctx.rotate(startLine.angle + Math.PI / 2);
    const hw = startLine.width * 0.5;
    const checkSize = 10;
    for (let r = 0; r < 2; r++) {
      for (let c = -3; c <= 3; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#000000';
        ctx.fillRect(c * checkSize - checkSize * 0.5, r * checkSize - 8, checkSize, checkSize);
      }
    }
    ctx.restore();
  }

  renderItems(ctx: CanvasRenderingContext2D) {
    for (const item of this.hazardMgr.items) {
      if (item.collected) continue;
      const dx = item.x - this.camera.x;
      const dy = item.y - this.camera.y;
      if (dx * dx + dy * dy > 1200 * 1200) continue;

      const bob = Math.sin(this.elapsed * 4 + item.x * 0.01) * 3;

      ctx.save();
      ctx.translate(item.x, item.y + bob);

      ctx.beginPath();
      ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
      const itemColor = item.type === 'nitro' ? '#00aaff' : '#00ff88';
      ctx.fillStyle = itemColor + '44';
      ctx.fill();
      ctx.strokeStyle = itemColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = itemColor;
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.type === 'nitro' ? 'N' : 'S', 0, 0);

      ctx.restore();
    }
  }

  renderHazards(ctx: CanvasRenderingContext2D) {
    for (const h of this.hazardMgr.hazards) {
      const dx = h.x - this.camera.x;
      const dy = h.y - this.camera.y;
      if (dx * dx + dy * dy > 1200 * 1200) continue;

      if (h.type === 'rock') {
        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.rotate(h.rotation);

        const alpha = Math.min(1, h.life / 2);
        ctx.fillStyle = `rgba(80, 60, 40, ${alpha})`;
        ctx.beginPath();
        const points = 7;
        for (let i = 0; i < points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const r = h.radius * (0.8 + 0.2 * Math.sin(i * 2.5));
          if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
          else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 100, 0, ${alpha * 0.6})`;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.restore();
      } else if (h.type === 'crack') {
        const alpha = Math.min(1, h.life / 2);
        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.rotate(h.rotation);

        ctx.strokeStyle = `rgba(255, 60, 0, ${alpha * 0.8})`;
        ctx.lineWidth = 3;
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + 0.3;
          const len = h.radius * (0.5 + Math.random() * 0.5);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
          ctx.stroke();
        }

        ctx.fillStyle = `rgba(255, 120, 0, ${alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(0, 0, h.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }
  }

  renderParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const dx = p.x - this.camera.x;
      const dy = p.y - this.camera.y;
      if (dx * dx + dy * dy > 1200 * 1200) continue;

      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  renderVehicles(ctx: CanvasRenderingContext2D) {
    const sorted = [...this.vehicles].sort((a, b) => {
      const da = (a.x - this.camera.x) ** 2 + (a.y - this.camera.y) ** 2;
      const db = (b.x - this.camera.x) ** 2 + (b.y - this.camera.y) ** 2;
      return db - da;
    });

    for (const v of sorted) {
      if (v.speed > 10 && v.trail.length > 1) {
        ctx.strokeStyle = v.trailColor;
        ctx.lineWidth = CAR_WID * 0.6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        let started = false;
        for (const tp of v.trail) {
          if (!started) {
            ctx.moveTo(tp.x, tp.y);
            started = true;
          } else {
            ctx.lineTo(tp.x, tp.y);
          }
        }
        ctx.globalAlpha = 0.3;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.save();
      ctx.translate(v.x, v.y);
      ctx.rotate(v.angle);

      if (v.isHit) {
        const flash = Math.sin(this.elapsed * 30) > 0;
        if (flash) {
          ctx.fillStyle = '#ff0000';
          ctx.fillRect(-CAR_LEN * 0.5, -CAR_WID * 0.5, CAR_LEN, CAR_WID);
        }
      }

      ctx.fillStyle = v.color;
      ctx.fillRect(-CAR_LEN * 0.5, -CAR_WID * 0.5, CAR_LEN, CAR_WID);

      ctx.fillStyle = '#00000088';
      ctx.fillRect(-CAR_LEN * 0.1, -CAR_WID * 0.45, CAR_LEN * 0.35, CAR_WID * 0.9);

      ctx.fillStyle = v.color + 'cc';
      ctx.fillRect(-CAR_LEN * 0.5, -CAR_WID * 0.5, CAR_LEN * 0.2, CAR_WID);

      if (v.shieldActive) {
        const pulse = 0.6 + 0.3 * Math.sin(this.elapsed * 6);
        ctx.strokeStyle = `rgba(0, 255, 136, ${pulse})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, CAR_LEN * 0.7, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `rgba(0, 255, 136, ${pulse * 0.15})`;
        ctx.beginPath();
        ctx.arc(0, 0, CAR_LEN * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }

      if (v.isPlayer) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-CAR_LEN * 0.3, -CAR_WID * 0.55, 3, 3);
        ctx.fillRect(-CAR_LEN * 0.3, CAR_WID * 0.55 - 3, 3, 3);
      }

      ctx.restore();
    }
  }

  renderNitroEffect(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const player = this.vehicles[0];
    if (!player.nitroActive) return;

    const intensity = 0.3 + 0.15 * Math.sin(this.elapsed * 12);
    const gradient = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, `rgba(0, 150, 255, ${intensity})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = `rgba(0, 200, 255, ${intensity * 0.8})`;
    ctx.lineWidth = 30;
    ctx.strokeRect(0, 0, w, h);
  }

  renderCountdown(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (this.phase !== 'countdown') return;
    const num = Math.ceil(this.countdown);
    const progress = this.countdown - Math.floor(this.countdown);
    const scale = 1 + progress * 0.5;
    const alpha = progress;

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ff6600';
    ctx.font = 'bold 120px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(num > 0 ? String(num) : 'GO!', 0, 0);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  getRankings(): RankingEntry[] {
    return [...this.vehicles]
      .sort((a, b) => {
        if (a.finished && b.finished) return a.finishTime - b.finishTime;
        if (a.finished) return -1;
        if (b.finished) return 1;
        return b.trackProgress - a.trackProgress;
      })
      .map((v, i) => ({
        id: v.id,
        name: v.name,
        lap: v.lap,
        progress: v.trackProgress,
        finished: v.finished,
        finishTime: v.finishTime,
        color: v.color,
      }));
  }

  getPlayerRank(): number {
    const rankings = this.getRankings();
    return rankings.findIndex(r => r.id === 0) + 1;
  }

  emitState() {
    const player = this.vehicles[0];
    const rankings = this.getRankings();
    const playerRank = this.getPlayerRank();

    let result: GameResult | null = null;
    if (this.phase === 'finished') {
      const sorted = [...this.vehicles].sort((a, b) => {
        if (a.finished && b.finished) return a.finishTime - b.finishTime;
        if (a.finished) return -1;
        if (b.finished) return 1;
        return b.trackProgress - a.trackProgress;
      });
      result = {
        rankings: sorted.map((v, i) => ({
          name: v.name,
          color: v.color,
          totalTime: v.finished ? v.finishTime : this.elapsed,
          fastestLap: v.lapTimes.length > 0 ? Math.min(...v.lapTimes) : 0,
          itemsCollected: v.itemsCollected,
          rank: i + 1,
        })),
        playerRank,
        fastestLap: player.lapTimes.length > 0 ? Math.min(...player.lapTimes) : 0,
        itemsCollected: player.itemsCollected,
        totalTime: player.finished ? player.finishTime : this.elapsed,
      };
    }

    this.onStateUpdate({
      phase: this.phase,
      countdown: this.countdown,
      speed: player.speed,
      maxSpeed: player.maxSpeed,
      item: player.item,
      shieldActive: player.shieldActive,
      nitroActive: player.nitroActive,
      cooldown: player.cooldown,
      lap: player.lap,
      totalLaps: TOTAL_LAPS,
      rank: playerRank,
      rankings,
      elapsed: this.elapsed,
      result,
      track: this.track,
      vehicles: this.vehicles,
    });
  }
}
