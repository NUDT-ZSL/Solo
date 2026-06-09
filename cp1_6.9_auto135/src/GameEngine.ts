import type {
  GameConfig,
  GameState,
  GamePhase,
  Player,
  Vector2,
  IceFloe,
  Vortex,
  Probe,
  Particle,
  ReplayFrame,
  ScoreAnimationState,
  VictoryAnimationState,
  LaunchSnapshot,
  AimParams,
} from './types';

export class GameEngine {
  public config: GameConfig;
  public state: GameState;
  private audioCallback: {
    onCollision: () => void;
    onVortexEnter: () => void;
    onVortexExit: () => void;
    onScore: () => void;
    onVictory: () => void;
    onLaunch: (power: number) => void;
  } | null = null;

  constructor(config: GameConfig) {
    this.config = config;
    this.state = this.createInitialState();
  }

  public setAudioCallback(cb: {
    onCollision: () => void;
    onVortexEnter: () => void;
    onVortexExit: () => void;
    onScore: () => void;
    onVictory: () => void;
    onLaunch: (power: number) => void;
  }): void {
    this.audioCallback = cb;
  }

  private createInitialState(): GameState {
    return {
      phase: 'WAITING' as GamePhase,
      currentPlayer: 1 as Player,
      scores: { p1: 0, p2: 0 },
      round: 1,
      probes: [],
      currentProbe: null,
      iceFloes: [],
      vortices: [],
      particles: [],
      trailParticlePool: [],
      collisionParticlePool: [],
      scoreAnimation: null,
      victoryAnimation: null,
      aimParams: {
        isAiming: false,
        startPos: null,
        currentPos: null,
        power: 0,
        angle: 0,
      },
      replayFrames: [],
      isReplaying: false,
      replayFrameIndex: 0,
      replaySpeed: 2,
      lastLaunchSnapshot: null,
      canUndo: false,
      lastReplayFrames: [],
    };
  }

  public initNewGame(): void {
    this.state = this.createInitialState();
    this.generateTerrain();
    this.spawnNewProbe();
  }

  private generateTerrain(): void {
    const { boardRadius, boardCenter, vortexRadius, probeRadius } = this.config;
    const safeRadius = boardRadius - 40;

    const floeCount = this.randInt(this.config.iceFloeCount[0], this.config.iceFloeCount[1]);
    this.state.iceFloes = [];
    const minDistFloe = 60;
    for (let i = 0; i < floeCount; i++) {
      let tries = 0;
      while (tries < 50) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * (safeRadius - 120);
        const pos = {
          x: boardCenter.x + Math.cos(angle) * dist,
          y: boardCenter.y + Math.sin(angle) * dist,
        };
        const distToCenter = Math.hypot(pos.x - boardCenter.x, pos.y - boardCenter.y);
        if (distToCenter < 180) {
          tries++;
          continue;
        }
        const tooClose = this.state.iceFloes.some(
          (f) => Math.hypot(f.position.x - pos.x, f.position.y - pos.y) < minDistFloe
        );
        if (tooClose) {
          tries++;
          continue;
        }
        const size = this.randFloat(20, 40);
        const rotation = Math.random() * Math.PI * 2;
        const vertices: Vector2[] = [];
        for (let v = 0; v < 6; v++) {
          const va = (v * Math.PI) / 3 + rotation;
          const jitter = this.randFloat(0.85, 1.15);
          vertices.push({
            x: Math.cos(va) * size * jitter,
            y: Math.sin(va) * size * jitter,
          });
        }
        this.state.iceFloes.push({
          id: `floe-${i}-${Date.now()}`,
          position: pos,
          size,
          rotation,
          vertices,
          colorStart: '#8EE4F0',
          colorEnd: '#A8D8EA',
        });
        break;
      }
    }

    const vortexCount = this.randInt(this.config.vortexCount[0], this.config.vortexCount[1]);
    this.state.vortices = [];
    for (let i = 0; i < vortexCount; i++) {
      let tries = 0;
      while (tries < 50) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 60 + Math.random() * (safeRadius - 140);
        const pos = {
          x: boardCenter.x + Math.cos(angle) * dist,
          y: boardCenter.y + Math.sin(angle) * dist,
        };
        const distToCenter = Math.hypot(pos.x - boardCenter.x, pos.y - boardCenter.y);
        if (distToCenter < 160) {
          tries++;
          continue;
        }
        const tooCloseV = this.state.vortices.some(
          (v) => Math.hypot(v.position.x - pos.x, v.position.y - pos.y) < vortexRadius * 3
        );
        const tooCloseF = this.state.iceFloes.some(
          (f) => Math.hypot(f.position.x - pos.x, f.position.y - pos.y) < vortexRadius + f.size
        );
        if (tooCloseV || tooCloseF) {
          tries++;
          continue;
        }
        this.state.vortices.push({
          id: `vortex-${i}-${Date.now()}`,
          position: pos,
          radius: vortexRadius,
          rotationSpeed: this.randFloat(0.01, 0.03) * (Math.random() > 0.5 ? 1 : -1),
          rotationAngle: Math.random() * Math.PI * 2,
          pullStrength: 0.3,
        });
        break;
      }
    }
  }

  private spawnNewProbe(): void {
    const { boardCenter, boardRadius, probeRadius } = this.config;
    const isPlayer1 = this.state.currentPlayer === (1 as Player);
    const spawnAngle = isPlayer1 ? Math.PI : 0;
    const spawnDist = boardRadius - 80;
    const position: Vector2 = {
      x: boardCenter.x + Math.cos(spawnAngle) * spawnDist,
      y: boardCenter.y + Math.sin(spawnAngle) * spawnDist,
    };
    const probe: Probe = {
      id: `probe-${Date.now()}-${Math.random()}`,
      player: this.state.currentPlayer,
      position: { ...position },
      velocity: { x: 0, y: 0 },
      initialPosition: { ...position },
      radius: probeRadius,
      isMoving: false,
      inVortex: false,
      currentVortexId: null,
    };
    this.state.currentProbe = probe;
    this.state.probes.push(probe);
    this.state.replayFrames = [];
    this.recordReplayFrame();
  }

  public setAimStart(pos: Vector2): void {
    if (this.state.phase !== ('WAITING' as GamePhase)) return;
    if (!this.state.currentProbe) return;
    const p = this.state.currentProbe;
    const dx = pos.x - p.position.x;
    const dy = pos.y - p.position.y;
    if (Math.hypot(dx, dy) > p.radius * 3) return;
    this.state.aimParams = {
      isAiming: true,
      startPos: { ...p.position },
      currentPos: { ...pos },
      power: 0,
      angle: 0,
    };
  }

  public setAimMove(pos: Vector2): void {
    if (!this.state.aimParams.isAiming || !this.state.aimParams.startPos) return;
    const sp = this.state.aimParams.startPos;
    const dx = sp.x - pos.x;
    const dy = sp.y - pos.y;
    const len = Math.hypot(dx, dy);
    const maxLen = this.config.maxAimLength;
    const clamped = Math.min(len, maxLen);
    const power = clamped / maxLen;
    const angle = Math.atan2(dy, dx);
    this.state.aimParams.currentPos = { ...pos };
    this.state.aimParams.power = power;
    this.state.aimParams.angle = angle;
  }

  public setAimEnd(): void {
    if (!this.state.aimParams.isAiming) return;
    const { power, angle } = this.state.aimParams;
    if (power > 0.02 && this.state.currentProbe) {
      this.launchProbe(power, angle);
    }
    this.state.aimParams = {
      isAiming: false,
      startPos: null,
      currentPos: null,
      power: 0,
      angle: 0,
    };
  }

  private launchProbe(power: number, angle: number): void {
    const probe = this.state.currentProbe;
    if (!probe) return;
    this.state.lastLaunchSnapshot = {
      player: this.state.currentPlayer,
      probePosition: { ...probe.initialPosition },
      scoreBefore: { ...this.state.scores },
    };
    this.state.canUndo = true;
    const speed = power * this.config.maxLaunchSpeed;
    probe.velocity = {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed,
    };
    probe.isMoving = true;
    this.state.phase = 'LAUNCHING' as GamePhase;
    if (this.audioCallback) {
      this.audioCallback.onLaunch(power);
    }
  }

  public undoLastLaunch(): boolean {
    if (!this.state.canUndo || !this.state.lastLaunchSnapshot) return false;
    if (this.state.phase === ('LAUNCHING' as GamePhase)) return false;
    if (this.state.phase === ('REPLAY' as GamePhase)) return false;
    const snap = this.state.lastLaunchSnapshot;
    if (snap.player !== this.state.currentPlayer) return false;
    const last = this.state.probes.pop();
    if (last) {
      this.state.scores = { ...snap.scoreBefore };
      this.state.currentProbe = null;
      this.state.victoryAnimation = null;
      this.state.scoreAnimation = null;
      this.state.phase = 'WAITING' as GamePhase;
      this.spawnNewProbe();
      this.state.canUndo = false;
      return true;
    }
    return false;
  }

  public startReplay(): boolean {
    if (this.state.lastReplayFrames.length < 2) return false;
    if (this.state.phase === ('LAUNCHING' as GamePhase)) return false;
    this.state.isReplaying = true;
    this.state.replayFrameIndex = 0;
    this.state.phase = 'REPLAY' as GamePhase;
    return true;
  }

  private recordReplayFrame(): void {
    const probe = this.state.currentProbe;
    if (!probe) return;
    const vortexAngles: Record<string, number> = {};
    this.state.vortices.forEach((v) => {
      vortexAngles[v.id] = v.rotationAngle;
    });
    const particlesSnapshot = this.state.particles
      .filter((p) => p.type === 'trail')
      .slice(0, 80)
      .map((p) => ({
        position: { ...p.position },
        opacity: p.opacity,
        size: p.size,
        color: p.color,
        life: p.life,
        maxLife: p.maxLife,
      }));
    this.state.replayFrames.push({
      probePosition: { ...probe.position },
      probeVelocity: { ...probe.velocity },
      isMoving: probe.isMoving,
      particlesSnapshot,
      vortexAngles,
    });
    if (this.state.replayFrames.length > 5000) {
      this.state.replayFrames.shift();
    }
  }

  public update(delta: number): void {
    if (this.state.isReplaying) {
      this.updateReplay(delta);
      return;
    }

    this.updateVortices(delta);
    this.updateParticles(delta);

    if (this.state.phase === ('LAUNCHING' as GamePhase)) {
      this.updatePhysics(delta);
      this.emitTrailParticles();
      this.recordReplayFrame();
      this.checkProbeStopped();
    }

    if (this.state.phase === ('SCORING' as GamePhase)) {
      this.updateScoreAnimation(delta);
    }

    if (this.state.phase === ('GAME_OVER' as GamePhase)) {
      this.updateVictoryAnimation(delta);
    }
  }

  private updateReplay(delta: number): void {
    const frames = this.state.lastReplayFrames;
    if (frames.length === 0) return;
    const steps = Math.max(1, Math.round(this.state.replaySpeed));
    for (let s = 0; s < steps; s++) {
      this.state.replayFrameIndex++;
      if (this.state.replayFrameIndex >= frames.length - 1) {
        this.state.replayFrameIndex = frames.length - 1;
        this.state.isReplaying = false;
        this.state.phase = this.state.victoryAnimation
          ? ('GAME_OVER' as GamePhase)
          : ('WAITING' as GamePhase);
        break;
      }
    }
    const frame = frames[this.state.replayFrameIndex];
    if (frame && this.state.currentProbe) {
      this.state.currentProbe.position = { ...frame.probePosition };
      this.state.currentProbe.velocity = { ...frame.probeVelocity };
      this.state.currentProbe.isMoving = frame.isMoving;
      this.state.vortices.forEach((v) => {
        if (frame.vortexAngles[v.id] !== undefined) {
          v.rotationAngle = frame.vortexAngles[v.id];
        }
      });
    }
    this.updateParticles(delta * this.state.replaySpeed);
  }

  private updateVortices(delta: number): void {
    const d = delta / (1 / 60);
    this.state.vortices.forEach((v) => {
      v.rotationAngle += v.rotationSpeed * d;
      if (v.rotationAngle > Math.PI * 2) v.rotationAngle -= Math.PI * 2;
      if (v.rotationAngle < 0) v.rotationAngle += Math.PI * 2;
    });
  }

  private updateParticles(delta: number): void {
    const alive: Particle[] = [];
    const maxParticles = this.state.isReplaying ? 150 : 200;
    for (let i = 0; i < this.state.particles.length; i++) {
      const p = this.state.particles[i];
      p.life -= delta;
      if (p.life <= 0) continue;
      p.position.x += p.velocity.x * (delta / (1 / 60));
      p.position.y += p.velocity.y * (delta / (1 / 60));
      p.opacity = (p.life / p.maxLife) * (p.type === 'trail' ? 0.8 : 1.0);
      if (p.type === 'collision' || p.type === 'vortex') {
        p.size = (p.life / p.maxLife) * p.maxSize;
      }
      alive.push(p);
      if (alive.length >= maxParticles) break;
    }
    this.state.particles = alive;
  }

  private emitTrailParticles(): void {
    const probe = this.state.currentProbe;
    if (!probe || !probe.isMoving) return;
    const count = 15;
    for (let i = 0; i < count; i++) {
      const speed = Math.hypot(probe.velocity.x, probe.velocity.y);
      const angle = speed > 0.001 ? Math.atan2(probe.velocity.y, probe.velocity.x) : 0;
      const perpAngle = angle + Math.PI / 2;
      const offset = this.randFloat(2, 4) * (Math.random() > 0.5 ? 1 : -1);
      const backDist = this.randFloat(0, probe.radius * 0.5);
      const pos = {
        x: probe.position.x + Math.cos(angle + Math.PI) * backDist + Math.cos(perpAngle) * offset,
        y: probe.position.y + Math.sin(angle + Math.PI) * backDist + Math.sin(perpAngle) * offset,
      };
      const color = probe.player === (1 as Player) ? '#B8F2FF' : '#E0C8FF';
      this.state.particles.push({
        position: pos,
        velocity: { x: this.randFloat(-0.05, 0.05), y: this.randFloat(-0.05, 0.05) },
        life: 0.8,
        maxLife: 0.8,
        size: this.randFloat(2, 4),
        maxSize: 4,
        color,
        opacity: 0.8,
        type: 'trail',
      });
    }
  }

  private emitCollisionParticles(point: Vector2): void {
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = this.randFloat(1, 3);
      this.state.particles.push({
        position: { ...point },
        velocity: { x: Math.cos(a) * sp, y: Math.sin(a) * sp },
        life: 0.3,
        maxLife: 0.3,
        size: 4,
        maxSize: 4,
        color: '#C8F5FF',
        opacity: 1,
        type: 'collision',
      });
    }
  }

  private updatePhysics(delta: number): void {
    const probe = this.state.currentProbe;
    if (!probe || !probe.isMoving) return;
    const d = delta / (1 / 60);

    let wasInVortex = probe.inVortex;
    probe.inVortex = false;
    let currentVortexId: string | null = null;

    for (const v of this.state.vortices) {
      const dx = v.position.x - probe.position.x;
      const dy = v.position.y - probe.position.y;
      const dist = Math.hypot(dx, dy);
      if (dist < v.radius) {
        probe.inVortex = true;
        currentVortexId = v.id;
        const factor = 1 - dist / v.radius;
        const ax = (dx / (dist || 1)) * v.pullStrength * factor * d;
        const ay = (dy / (dist || 1)) * v.pullStrength * factor * d;
        probe.velocity.x += ax;
        probe.velocity.y += ay;
        break;
      }
    }
    probe.currentVortexId = currentVortexId;

    if (!wasInVortex && probe.inVortex && this.audioCallback) {
      this.audioCallback.onVortexEnter();
    }
    if (wasInVortex && !probe.inVortex && this.audioCallback) {
      this.audioCallback.onVortexExit();
    }

    probe.position.x += probe.velocity.x * d;
    probe.position.y += probe.velocity.y * d;

    this.checkIceCollisions(probe);
    this.checkBoardBoundary(probe);

    probe.velocity.x *= 1 - this.config.frictionCoeff * d;
    probe.velocity.y *= 1 - this.config.frictionCoeff * d;

    const speed = Math.hypot(probe.velocity.x, probe.velocity.y);
    if (speed < this.config.minStopSpeed) {
      probe.velocity.x = 0;
      probe.velocity.y = 0;
      probe.isMoving = false;
      if (probe.inVortex && this.audioCallback) {
        this.audioCallback.onVortexExit();
      }
    }
  }

  private checkBoardBoundary(probe: Probe): void {
    const { boardCenter, boardRadius } = this.config;
    const dx = probe.position.x - boardCenter.x;
    const dy = probe.position.y - boardCenter.y;
    const dist = Math.hypot(dx, dy);
    if (dist + probe.radius > boardRadius) {
      const nx = dx / (dist || 1);
      const ny = dy / (dist || 1);
      const overlap = dist + probe.radius - boardRadius;
      probe.position.x -= nx * overlap;
      probe.position.y -= ny * overlap;
      const vn = probe.velocity.x * nx + probe.velocity.y * ny;
      if (vn > 0) {
        probe.velocity.x -= 2 * vn * nx * this.config.restitution;
        probe.velocity.y -= 2 * vn * ny * this.config.restitution;
      }
    }
  }

  private checkIceCollisions(probe: Probe): void {
    for (const floe of this.state.iceFloes) {
      const nearest = this.findNearestOnPolygon(probe.position, floe);
      const dx = probe.position.x - nearest.point.x;
      const dy = probe.position.y - nearest.point.y;
      const dist = Math.hypot(dx, dy);
      if (dist < probe.radius) {
        let nx = dist > 0.0001 ? dx / dist : 1;
        let ny = dist > 0.0001 ? dy / dist : 0;
        if (nearest.inside) {
          nx = -nx;
          ny = -ny;
        }
        const overlap = probe.radius - dist + 0.5;
        probe.position.x += nx * overlap;
        probe.position.y += ny * overlap;
        const vn = probe.velocity.x * nx + probe.velocity.y * ny;
        if (vn < 0) {
          probe.velocity.x -= (1 + this.config.restitution) * vn * nx;
          probe.velocity.y -= (1 + this.config.restitution) * vn * ny;
        }
        const collisionPoint = {
          x: nearest.point.x + nx * (probe.radius * 0.5),
          y: nearest.point.y + ny * (probe.radius * 0.5),
        };
        this.emitCollisionParticles(collisionPoint);
        if (this.audioCallback) {
          this.audioCallback.onCollision();
        }
      }
    }
  }

  private findNearestOnPolygon(
    point: Vector2,
    floe: IceFloe
  ): { point: Vector2; dist: number; inside: boolean } {
    let best = { x: floe.position.x, y: floe.position.y };
    let bestDist = Infinity;
    let inside = true;
    const n = floe.vertices.length;
    const testPoint = {
      x: point.x - floe.position.x,
      y: point.y - floe.position.y,
    };
    for (let i = 0; i < n; i++) {
      const a = floe.vertices[i];
      const b = floe.vertices[(i + 1) % n];
      const abx = b.x - a.x;
      const aby = b.y - a.y;
      const apx = testPoint.x - a.x;
      const apy = testPoint.y - a.y;
      const lenSq = abx * abx + aby * aby || 1;
      let t = (apx * abx + apy * aby) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const cx = a.x + abx * t;
      const cy = a.y + aby * t;
      const ddx = testPoint.x - cx;
      const ddy = testPoint.y - cy;
      const dist = Math.hypot(ddx, ddy);
      if (dist < bestDist) {
        bestDist = dist;
        best = { x: cx + floe.position.x, y: cy + floe.position.y };
      }
      const nxn = -aby;
      const nyn = abx;
      if (apx * nxn + apy * nyn > 0) {
        inside = false;
      }
    }
    return { point: best, dist: bestDist, inside };
  }

  private checkProbeStopped(): void {
    const probe = this.state.currentProbe;
    if (!probe || probe.isMoving) return;
    this.state.phase = 'SCORING' as GamePhase;
    const score = this.calculateScore(probe.position);
    if (this.state.currentPlayer === (1 as Player)) {
      this.state.scores.p1 += score;
    } else {
      this.state.scores.p2 += score;
    }
    if (score > 0 && this.audioCallback) {
      this.audioCallback.onScore();
    }
    this.state.scoreAnimation = {
      player: this.state.currentPlayer,
      score,
      elapsed: 0,
      duration: 1.5,
      pulsePhase: 0,
      position: { ...this.config.boardCenter },
      displayedScore: 0,
    };
    this.state.lastReplayFrames = [...this.state.replayFrames];
    this.state.canUndo = false;
  }

  private calculateScore(pos: Vector2): number {
    const dist = Math.hypot(pos.x - this.config.boardCenter.x, pos.y - this.config.boardCenter.y);
    for (const zone of this.config.scoreZones) {
      if (dist <= zone.radius) return zone.points;
    }
    return 0;
  }

  private updateScoreAnimation(delta: number): void {
    const anim = this.state.scoreAnimation;
    if (!anim) return;
    anim.elapsed += delta;
    anim.pulsePhase = (anim.elapsed / anim.duration) * Math.PI * 4;
    anim.displayedScore = Math.min(
      anim.score,
      Math.round((anim.elapsed / Math.min(anim.duration, 0.8)) * anim.score)
    );
    if (anim.elapsed >= anim.duration) {
      this.state.scoreAnimation = null;
      const p1 = this.state.scores.p1;
      const p2 = this.state.scores.p2;
      if (p1 >= this.config.winScore || p2 >= this.config.winScore) {
        this.state.phase = 'GAME_OVER' as GamePhase;
        this.state.victoryAnimation = {
          winner: p1 >= this.config.winScore ? (1 as Player) : (2 as Player),
          finalScore1: p1,
          finalScore2: p2,
          elapsed: 0,
          duration: 3,
          hueShift: 0,
          textProgress: 0,
          maskOpacity: 0,
        };
        if (this.audioCallback) {
          this.audioCallback.onVictory();
        }
      } else {
        this.state.currentPlayer = this.state.currentPlayer === (1 as Player) ? (2 as Player) : (1 as Player);
        if (this.state.currentPlayer === (1 as Player)) {
          this.state.round++;
        }
        this.state.phase = 'WAITING' as GamePhase;
        this.spawnNewProbe();
      }
    }
  }

  private updateVictoryAnimation(delta: number): void {
    const anim = this.state.victoryAnimation;
    if (!anim) return;
    anim.elapsed += delta;
    anim.hueShift = (anim.elapsed * 120) % 360;
    anim.maskOpacity = Math.min(0.6, anim.elapsed / 0.5 * 0.6);
    anim.textProgress = Math.min(1, Math.max(0, (anim.elapsed - 0.3) / 0.8));
  }

  private randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }
}
