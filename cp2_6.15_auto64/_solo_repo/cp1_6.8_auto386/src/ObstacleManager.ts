import type { BeatInfo } from './Player';

export const LANE_COLORS = ['#ff4466', '#4488ff', '#44ff88', '#aa66ff'];
const LANE_GLOWS = ['#ff446680', '#4488ff80', '#44ff8880', '#aa66ff80'];

export interface BeatFragment {
  x: number;
  lane: number;
  color: string;
  glow: string;
  collected: boolean;
  sparklePhase: number;
  size: number;
}

export interface NoiseObstacle {
  x: number;
  lane: number;
  w: number;
  h: number;
  flowPhase: number;
  hit: boolean;
}

export interface CollisionResult {
  collectedFragments: BeatFragment[];
  hitObstacles: NoiseObstacle[];
}

export class ObstacleManager {
  fragments: BeatFragment[] = [];
  obstacles: NoiseObstacle[] = [];
  speed = 300;
  difficulty = 1;
  laneCount = 4;
  laneH = 0;
  cW = 0;
  cH = 0;
  fSize = 18;
  timeAlive = 0;
  lastBeatIdx = -1;

  resize(w: number, h: number) {
    this.cW = w;
    this.cH = h;
    this.laneH = h / this.laneCount;
    this.fSize = Math.max(14, Math.min(22, h / 30));
  }

  reset() {
    this.fragments = [];
    this.obstacles = [];
    this.difficulty = 1;
    this.timeAlive = 0;
    this.lastBeatIdx = -1;
  }

  update(dt: number, beatInfo: BeatInfo) {
    this.timeAlive += dt;
    this.difficulty = 1 + this.timeAlive * 0.033;
    this.speed = 300 + this.difficulty * 40;

    if (beatInfo.currentBeat !== this.lastBeatIdx) {
      this.lastBeatIdx = beatInfo.currentBeat;
      this.spawnOnBeat();
    }

    for (const f of this.fragments) {
      f.x -= this.speed * dt;
      f.sparklePhase += dt * 4;
    }
    for (const o of this.obstacles) {
      o.x -= this.speed * dt;
      o.flowPhase += dt * 3;
    }

    this.fragments = this.fragments.filter(f => f.x > -60 && !f.collected);
    this.obstacles = this.obstacles.filter(o => o.x > -80 && !o.hit);
  }

  spawnOnBeat() {
    const lane = Math.floor(Math.random() * this.laneCount);

    if (Math.random() < 0.65) {
      this.fragments.push({
        x: this.cW + 40,
        lane,
        color: LANE_COLORS[lane],
        glow: LANE_GLOWS[lane],
        collected: false,
        sparklePhase: Math.random() * Math.PI * 2,
        size: this.fSize,
      });
    }

    const oChance = Math.min(0.2 + this.difficulty * 0.05, 0.6);
    if (Math.random() < oChance) {
      const oLane = Math.floor(Math.random() * this.laneCount);
      const tooClose = this.fragments.some(
        f => !f.collected && f.lane === oLane && Math.abs(f.x - (this.cW + 40)) < 80
      );
      if (!tooClose) {
        this.obstacles.push({
          x: this.cW + 40,
          lane: oLane,
          w: 35 + Math.random() * 15,
          h: this.laneH * 0.55,
          flowPhase: Math.random() * Math.PI * 2,
          hit: false,
        });
      }
    }
  }

  checkCollisions(px: number, py: number, pr: number, pLane: number): CollisionResult {
    const result: CollisionResult = { collectedFragments: [], hitObstacles: [] };
    const cDist = pr + this.fSize;
    const hDist = pr + 15;

    for (const f of this.fragments) {
      if (f.collected) continue;
      const fy = this.laneH * f.lane + this.laneH / 2;
      const dx = f.x - px;
      const dy = fy - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < cDist && f.lane === pLane) {
        f.collected = true;
        result.collectedFragments.push(f);
      }
    }

    for (const o of this.obstacles) {
      if (o.hit) continue;
      if (o.lane !== pLane) continue;
      const dx = Math.abs(o.x - px);
      if (dx < hDist) {
        o.hit = true;
        result.hitObstacles.push(o);
      }
    }

    return result;
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const f of this.fragments) {
      if (f.collected) continue;
      const fy = this.laneH * f.lane + this.laneH / 2;
      const sparkle = 0.7 + 0.3 * Math.sin(f.sparklePhase);
      const s = f.size * sparkle;

      ctx.save();
      ctx.translate(f.x, fy);
      ctx.rotate(f.sparklePhase * 0.5);

      ctx.shadowColor = f.glow;
      ctx.shadowBlur = 15;

      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.7, 0);
      ctx.lineTo(0, s);
      ctx.lineTo(-s * 0.7, 0);
      ctx.closePath();

      ctx.fillStyle = f.color;
      ctx.fill();

      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.3);
      ctx.lineTo(s * 0.9, 0);
      ctx.lineTo(0, s * 1.3);
      ctx.lineTo(-s * 0.9, 0);
      ctx.closePath();
      ctx.fillStyle = f.glow;
      ctx.fill();

      ctx.restore();
    }

    for (const o of this.obstacles) {
      if (o.hit) continue;
      const oy = this.laneH * o.lane + this.laneH / 2;
      const flow = Math.sin(o.flowPhase) * 5;

      ctx.save();
      ctx.translate(o.x, oy + flow);

      ctx.beginPath();
      const hw = o.w / 2;
      const hh = o.h / 2;
      ctx.moveTo(-hw, -hh * 0.6);
      ctx.bezierCurveTo(-hw * 0.5, -hh, hw * 0.5, -hh, hw, -hh * 0.6);
      ctx.bezierCurveTo(hw * 1.1, 0, hw * 0.8, hh * 0.5, hw * 0.3, hh);
      ctx.bezierCurveTo(0, hh * 0.8, -hw * 0.3, hh, -hw * 0.5, hh * 0.5);
      ctx.bezierCurveTo(-hw * 0.9, 0, -hw * 1.1, -hh * 0.3, -hw, -hh * 0.6);
      ctx.closePath();

      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, hw);
      grad.addColorStop(0, '#1a1a2e');
      grad.addColorStop(0.7, '#0d0d1a');
      grad.addColorStop(1, '#050510');
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = '#2a2a4a';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();
    }
  }
}
