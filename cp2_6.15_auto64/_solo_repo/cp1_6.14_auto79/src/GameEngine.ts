import {
  GameState,
  LevelData,
  LightSource,
  Platform,
  Reflector,
  Prism,
  Receiver,
  RaySegment,
  Vec2,
  Particle
} from './types';
import { eventBus } from './EventBus';
import { levelManager } from './LevelManager';

const MAX_BOUNCES = 20;
const MAX_RAY_LENGTH = 3000;
const EPSILON = 0.001;
const REFLECTOR_HALF_LENGTH = 50;
const MOVE_SPEED_PX_PER_S = 50;
const MAX_MOVE_DISTANCE = 150;
const RECEIVER_ACTIVATE_TIME = 2;
const DEFLECT_ANGLE = (30 * Math.PI) / 180;
const BLOCKED_FLASH_DURATION = 0.5;
const STEP_ANGLE_THRESHOLD = (5 * Math.PI) / 180;
const MAX_FRAME_TIME = 25;
const MAX_RAY_COMPUTE_TIME = 1;

interface ColoredSegment {
  start: Vec2;
  end: Vec2;
  startColor: { r: number; g: number; b: number };
  endColor: { r: number; g: number; b: number };
  startAlpha: number;
  endAlpha: number;
  intensity: number;
  blocked?: boolean;
}

interface LetterParticle {
  position: Vec2;
  targetPosition: Vec2;
  velocity: Vec2;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  phase: 'expand' | 'gather';
}

export class GameEngine {
  private state: GameState;
  private running: boolean = false;
  private lastTime: number = 0;
  private rafId: number = 0;
  private lastAngleForStep: Map<string, number> = new Map();
  private onChangeCallback?: (state: GameState) => void;

  private fps: number = 0;
  private frameCount: number = 0;
  private fpsAccum: number = 0;
  private rayComputeTime: number = 0;
  private frameTime: number = 0;

  private cachedAngleMap: Map<string, number> = new Map();
  private cachedPlatformPositions: Map<string, Vec2> = new Map();
  private isDirty: boolean = true;

  private letterParticles: LetterParticle[] = [];

  constructor() {
    this.state = this.createInitialState();
    this.setupEventListeners();
  }

  private createInitialState(): GameState {
    const level = levelManager.loadLevel(levelManager.getCurrentLevelId());
    if (!level) return this.createEmptyState();
    return this.levelToState(level);
  }

  private createEmptyState(): GameState {
    return {
      levelId: 'level-1',
      levelName: '初遇光径',
      lightSources: [],
      raySegments: [],
      composedRaySegments: [],
      platforms: [],
      reflectors: [],
      prisms: [],
      receivers: [],
      portal: {
        id: '',
        position: { x: 0, y: 0 },
        radius: 30,
        targetLevelId: '',
        active: false,
        requiredReceivers: []
      },
      particles: [],
      stepCount: 0,
      levelComplete: false,
      completeAnimationTime: 0,
      blockedFlashTime: 0
    };
  }

  private levelToState(level: LevelData): GameState {
    const state: GameState = {
      levelId: level.id,
      levelName: level.name,
      lightSources: level.lightSources.map((s) => ({
        id: s.id,
        position: { x: s.position.x, y: s.position.y },
        angle: s.angle,
        dragging: false
      })),
      raySegments: [],
      composedRaySegments: [],
      platforms: level.platforms.map((p) => ({
        id: p.id,
        position: { x: p.position.x, y: p.position.y },
        angle: p.angle,
        length: p.length,
        width: p.width,
        color: p.color,
        movable: p.movable ?? false,
        moveDirection: p.moveDirection ? { x: p.moveDirection.x, y: p.moveDirection.y } : undefined,
        moveDistance: p.moveDistance ?? MAX_MOVE_DISTANCE,
        currentOffset: 0,
        linkedReceiverId: p.linkedReceiverId,
        isMoving: false
      })),
      reflectors: level.reflectors.map((r) => ({
        id: r.id,
        position: { x: r.position.x, y: r.position.y },
        rotation: r.rotation,
        efficiency: r.efficiency,
        type: r.type
      })),
      prisms: level.prisms.map((p) => ({
        id: p.id,
        position: { x: p.position.x, y: p.position.y },
        rotation: p.rotation,
        sideLength: p.sideLength,
        refractiveIndex: p.refractiveIndex || 1.5
      })),
      receivers: level.receivers.map((r) => ({
        id: r.id,
        position: { x: r.position.x, y: r.position.y },
        radius: r.radius,
        color: r.color,
        activated: false,
        activationProgress: 0,
        requiredDuration: r.requiredDuration || RECEIVER_ACTIVATE_TIME,
        linkedPlatformId: r.linkedPlatformId
      })),
      portal: {
        id: level.portal.id,
        position: { x: level.portal.position.x, y: level.portal.position.y },
        radius: level.portal.radius,
        targetLevelId: level.portal.targetLevelId,
        active: false,
        requiredReceivers: [...level.portal.requiredReceivers]
      },
      particles: [],
      stepCount: 0,
      levelComplete: false,
      completeAnimationTime: 0,
      blockedFlashTime: 0
    };

    this.resolveColorLinkages(state);
    return state;
  }

  private resolveColorLinkages(state: GameState): void {
    for (const platform of state.platforms) {
      if (!platform.movable || platform.linkedReceiverId) continue;

      for (const receiver of state.receivers) {
        if (receiver.linkedPlatformId) continue;
        if (receiver.color.toLowerCase() === platform.color.toLowerCase()) {
          platform.linkedReceiverId = receiver.id;
          receiver.linkedPlatformId = platform.id;
          break;
        }
      }
    }
  }

  private setupEventListeners(): void {
    eventBus.on('levelChange', ({ levelId }) => {
      this.loadLevel(levelId);
    });

    eventBus.on('gameReset', () => {
      this.resetLevel();
    });

    eventBus.on('sourceDragStart', ({ sourceId }) => {
      const source = this.state.lightSources.find((s) => s.id === sourceId);
      if (source) {
        source.dragging = true;
        this.lastAngleForStep.set(sourceId, source.angle);
      }
    });

    eventBus.on('sourceDragMove', ({ sourceId, angle }) => {
      const source = this.state.lightSources.find((s) => s.id === sourceId);
      if (!source) return;

      const rounded = Math.round(angle * 100) / 100;
      source.angle = rounded;

      const lastAngle = this.lastAngleForStep.get(sourceId);
      if (lastAngle !== undefined) {
        const delta = Math.abs(rounded - lastAngle);
        if (delta >= STEP_ANGLE_THRESHOLD) {
          this.state.stepCount++;
          this.lastAngleForStep.set(sourceId, rounded);
          eventBus.emit('stepUpdate', { count: this.state.stepCount });
        }
      }
      this.isDirty = true;
    });

    eventBus.on('sourceDragEnd', ({ sourceId }) => {
      const source = this.state.lightSources.find((s) => s.id === sourceId);
      if (source) source.dragging = false;
    });
  }

  public loadLevel(levelId: string): void {
    const level = levelManager.loadLevel(levelId);
    if (level) {
      this.state = this.levelToState(level);
      this.letterParticles = [];
      this.isDirty = true;
      this.cachedAngleMap.clear();
      this.cachedPlatformPositions.clear();
    }
  }

  public resetLevel(): void {
    const level = levelManager.resetLevel(this.state.levelId);
    if (level) {
      this.state = this.levelToState(level);
      this.letterParticles = [];
      this.isDirty = true;
      this.cachedAngleMap.clear();
      this.cachedPlatformPositions.clear();
      eventBus.emit('stepUpdate', { count: 0 });
    }
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  public stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  public setStateChangeCallback(cb: (state: GameState) => void): void {
    this.onChangeCallback = cb;
  }

  public getState(): GameState {
    return this.state;
  }

  private loop = (): void => {
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    const frameStart = now;
    this.update(dt);
    this.frameTime = performance.now() - frameStart;

    this.frameCount++;
    this.fpsAccum += dt;
    if (this.fpsAccum >= 0.5) {
      this.fps = Math.round(this.frameCount / this.fpsAccum);
      this.frameCount = 0;
      this.fpsAccum = 0;
    }

    this.state.perfStats = {
      fps: this.fps,
      frameTime: this.frameTime,
      rayComputeTime: this.rayComputeTime
    };

    this.state.letterParticles = this.letterParticles.map(p => ({
      position: p.position,
      targetPosition: p.targetPosition,
      velocity: p.velocity,
      color: p.color,
      size: p.size,
      life: p.life,
      maxLife: p.maxLife,
      phase: p.phase
    }));

    if (this.onChangeCallback) {
      this.onChangeCallback(this.state);
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    if (this.state.levelComplete) {
      this.state.completeAnimationTime += dt;
      this.updateRegularParticles(dt);
      this.updateLetterParticles(dt);
      return;
    }

    this.checkDirtyFlag();
    this.updateReceiversAndPlatforms(dt);
    this.computeRays();
    this.checkPortalActivation();
    this.updateBlockedFlash(dt);
    this.updateRegularParticles(dt);
  }

  private checkDirtyFlag(): void {
    for (const source of this.state.lightSources) {
      const cached = this.cachedAngleMap.get(source.id);
      if (cached === undefined || Math.abs(cached - source.angle) > 0.0001) {
        this.isDirty = true;
        this.cachedAngleMap.set(source.id, source.angle);
      }
    }
    for (const platform of this.state.platforms) {
      const cached = this.cachedPlatformPositions.get(platform.id);
      if (!cached || cached.x !== platform.position.x || cached.y !== platform.position.y) {
        this.isDirty = true;
        this.cachedPlatformPositions.set(platform.id, { x: platform.position.x, y: platform.position.y });
      }
    }
  }

  private updateReceiversAndPlatforms(dt: number): void {
    const receiverHitMap = new Map<string, boolean>();

    for (const receiver of this.state.receivers) {
      receiverHitMap.set(receiver.id, false);
    }

    for (const rayList of this.state.raySegments) {
      for (const segment of rayList) {
        for (const receiver of this.state.receivers) {
          if (receiverHitMap.get(receiver.id)) continue;
          if (this.segmentHitsCircle(segment.start, segment.end, receiver.position, receiver.radius + 2)) {
            receiverHitMap.set(receiver.id, true);
          }
        }
      }
    }

    for (const receiver of this.state.receivers) {
      const isHit = receiverHitMap.get(receiver.id) ?? false;

      if (isHit && !receiver.activated) {
        receiver.activationProgress = Math.min(
          receiver.requiredDuration,
          receiver.activationProgress + dt
        );
        if (receiver.activationProgress >= receiver.requiredDuration) {
          receiver.activated = true;
          eventBus.emit('receiverActivated', { receiverId: receiver.id });
          this.spawnParticlesAt(receiver.position, receiver.color, 25);

          if (receiver.linkedPlatformId) {
            const platform = this.state.platforms.find(p => p.id === receiver.linkedPlatformId);
            if (platform) {
              platform.isMoving = true;
            }
          }
        }
      } else if (!isHit && !receiver.activated) {
        receiver.activationProgress = Math.max(0, receiver.activationProgress - dt * 0.5);
      }
    }

    for (const platform of this.state.platforms) {
      if (!platform.movable || !platform.moveDirection || !platform.isMoving) continue;

      const maxDist = platform.moveDistance ?? MAX_MOVE_DISTANCE;
      const remaining = maxDist - (platform.currentOffset ?? 0);
      if (remaining <= 0) {
        platform.isMoving = false;
        continue;
      }

      const deltaMove = Math.min(MOVE_SPEED_PX_PER_S * dt, remaining);
      platform.position.x += platform.moveDirection.x * deltaMove;
      platform.position.y += platform.moveDirection.y * deltaMove;
      platform.currentOffset = (platform.currentOffset ?? 0) + deltaMove;

      eventBus.emit('platformMove', { platformId: platform.id, offset: platform.currentOffset });

      if (platform.currentOffset >= maxDist) {
        platform.isMoving = false;
      }

      this.isDirty = true;
    }
  }

  private computeRays(): void {
    if (!this.isDirty && this.state.raySegments.length > 0) return;

    const t0 = performance.now();

    this.state.raySegments = [];
    const allColored: ColoredSegment[] = [];

    for (const source of this.state.lightSources) {
      const segments: RaySegment[] = [];
      const startColor = { r: 255, g: 235, b: 59 };
      const endColor = { r: 255, g: 152, b: 0 };

      this.traceRay(
        source.position,
        { x: Math.cos(source.angle), y: Math.sin(source.angle) },
        1.0,
        segments,
        0,
        null,
        startColor,
        endColor,
        0.8,
        0.2,
        allColored
      );
      this.state.raySegments.push(segments);
    }

    this.composeRays(allColored);

    const elapsed = performance.now() - t0;
    if (elapsed > MAX_RAY_COMPUTE_TIME) {
      console.warn(`Ray compute time: ${elapsed.toFixed(2)}ms (exceeds ${MAX_RAY_COMPUTE_TIME}ms limit)`);
    }
    this.rayComputeTime = elapsed;
    this.isDirty = false;
  }

  private composeRays(segments: ColoredSegment[]): void {
    if (segments.length === 0) {
      this.state.composedRaySegments = [];
      return;
    }

    this.state.composedRaySegments = segments.map(seg => ({
      start: seg.start,
      end: seg.end,
      intensity: seg.intensity,
      blocked: seg.blocked,
      startColor: seg.startColor,
      endColor: seg.endColor,
      startAlpha: seg.startAlpha,
      endAlpha: seg.endAlpha
    } as any));
  }

  private traceRay(
    origin: Vec2,
    dir: Vec2,
    intensity: number,
    outSegments: RaySegment[],
    bounce: number,
    ignoreObj: string | null,
    startColor: { r: number; g: number; b: number },
    endColor: { r: number; g: number; b: number },
    startAlpha: number,
    endAlpha: number,
    outColored: ColoredSegment[]
  ): void {
    if (bounce >= MAX_BOUNCES || intensity < 0.05) return;

    const collision = this.findClosestCollision(origin, dir, ignoreObj);
    const segStart = { x: origin.x, y: origin.y };

    if (!collision) {
      const farEnd = {
        x: origin.x + dir.x * MAX_RAY_LENGTH,
        y: origin.y + dir.y * MAX_RAY_LENGTH
      };
      outSegments.push({ start: segStart, end: farEnd, intensity });
      outColored.push({
        start: segStart, end: farEnd,
        startColor, endColor, startAlpha, endAlpha, intensity
      });
      return;
    }

    outSegments.push({
      start: segStart,
      end: { ...collision.point },
      intensity,
      blocked: collision.type === 'platform'
    });
    outColored.push({
      start: segStart,
      end: { ...collision.point },
      startColor, endColor,
      startAlpha, endAlpha,
      intensity,
      blocked: collision.type === 'platform'
    });

    if (collision.type === 'platform') {
      const p = this.state.platforms.find(pl => pl.id === collision.objId);
      if (p?.isMoving || p?.movable) {
        this.state.blockedFlashTime = BLOCKED_FLASH_DURATION;
        this.state.blockedPosition = { x: collision.point.x, y: collision.point.y };
      }
      return;
    }

    if (collision.type === 'receiver' || collision.type === 'portal' || collision.type === 'bounds') {
      return;
    }

    if (collision.type === 'mirror') {
      const reflector = this.state.reflectors.find(r => r.id === collision.objId);
      const eff = reflector?.efficiency ?? 0.95;
      const reflected = this.reflect(dir, collision.normal);

      this.traceRay(
        collision.point, reflected, intensity * eff,
        outSegments, bounce + 1, collision.objId ?? null,
        { r: Math.round(startColor.r * 0.98), g: Math.round(startColor.g * 0.97), b: Math.round(startColor.b * 0.96) },
        { r: Math.round(endColor.r * 0.97), g: Math.round(endColor.g * 0.96), b: Math.round(endColor.b * 0.95) },
        startAlpha * eff,
        endAlpha * eff,
        outColored
      );
      return;
    }

    if (collision.type === 'prism') {
      const straightDir = { x: dir.x, y: dir.y };
      const cos = Math.cos(DEFLECT_ANGLE);
      const sin = Math.sin(DEFLECT_ANGLE);
      const deflectedDir = {
        x: dir.x * cos - dir.y * sin,
        y: dir.x * sin + dir.y * cos
      };

      this.traceRay(
        collision.point, straightDir, intensity * 0.7,
        outSegments, bounce + 1, collision.objId ?? null,
        { r: startColor.r, g: Math.round(startColor.g * 0.92), b: Math.round(startColor.b * 0.85) },
        { r: endColor.r, g: Math.round(endColor.g * 0.9), b: Math.round(endColor.b * 0.8) },
        startAlpha * 0.7,
        endAlpha * 0.7,
        outColored
      );

      this.traceRay(
        collision.point, deflectedDir, intensity * 0.5,
        outSegments, bounce + 1, collision.objId ?? null,
        { r: Math.round(startColor.r * 0.88), g: Math.round(startColor.g * 0.95), b: Math.round(startColor.b * 0.95) },
        { r: Math.round(endColor.r * 0.85), g: Math.round(endColor.g * 0.92), b: Math.round(endColor.b * 0.95) },
        startAlpha * 0.5,
        endAlpha * 0.5,
        outColored
      );
      return;
    }
  }

  private findClosestCollision(
    origin: Vec2, dir: Vec2, ignoreObj: string | null
  ): any | null {
    let best: any = null;

    const consider = (hit: any) => {
      if (!hit || hit.distance <= EPSILON) return;
      if (!best || hit.distance < best.distance) best = hit;
    };

    for (const platform of this.state.platforms) {
      if (platform.id === ignoreObj) continue;
      consider(this.hitPlatform(origin, dir, platform));
    }
    for (const reflector of this.state.reflectors) {
      if (reflector.id === ignoreObj || reflector.type !== 'mirror') continue;
      consider(this.hitMirror(origin, dir, reflector));
    }
    for (const prism of this.state.prisms) {
      if (prism.id === ignoreObj) continue;
      consider(this.hitPrism(origin, dir, prism));
    }
    for (const receiver of this.state.receivers) {
      const hit = this.hitCircle(origin, dir, receiver.position, receiver.radius);
      if (hit) consider({ ...hit, type: 'receiver', objId: receiver.id });
    }
    if (this.state.portal.active) {
      const hit = this.hitCircle(origin, dir, this.state.portal.position, this.state.portal.radius);
      if (hit) consider({ ...hit, type: 'portal', objId: this.state.portal.id });
    }

    return best;
  }

  private hitPlatform(origin: Vec2, dir: Vec2, p: Platform): any | null {
    const cos = Math.cos(p.angle);
    const sin = Math.sin(p.angle);
    const hl = p.length / 2;
    const hw = p.width / 2;
    const local = [
      { x: -hl, y: -hw }, { x: hl, y: -hw }, { x: hl, y: hw }, { x: -hl, y: hw }
    ];
    const world = local.map(c => ({
      x: p.position.x + c.x * cos - c.y * sin,
      y: p.position.y + c.x * sin + c.y * cos
    }));

    let bestT = Infinity;
    let bestPoint: Vec2 | null = null;
    let bestNormal: Vec2 = { x: 0, y: 0 };

    for (let i = 0; i < 4; i++) {
      const a = world[i];
      const b = world[(i + 1) % 4];
      const result = this.raySegment(origin, dir, a, b);
      if (result && result.t > EPSILON && result.t < bestT) {
        bestT = result.t;
        bestPoint = result.point;
        const ex = b.x - a.x, ey = b.y - a.y;
        const el = Math.hypot(ex, ey) || 1;
        bestNormal = { x: -ey / el, y: ex / el };
        if (bestNormal.x * dir.x + bestNormal.y * dir.y > 0) {
          bestNormal = { x: -bestNormal.x, y: -bestNormal.y };
        }
      }
    }

    if (bestPoint && isFinite(bestT)) {
      return { point: bestPoint, distance: bestT, normal: bestNormal, type: 'platform', objId: p.id };
    }
    return null;
  }

  private hitMirror(origin: Vec2, dir: Vec2, r: Reflector): any | null {
    const cos = Math.cos(r.rotation);
    const sin = Math.sin(r.rotation);
    const a = { x: r.position.x - REFLECTOR_HALF_LENGTH * cos, y: r.position.y - REFLECTOR_HALF_LENGTH * sin };
    const b = { x: r.position.x + REFLECTOR_HALF_LENGTH * cos, y: r.position.y + REFLECTOR_HALF_LENGTH * sin };
    const result = this.raySegment(origin, dir, a, b);
    if (!result || result.t <= EPSILON) return null;
    let normal = { x: -sin, y: cos };
    if (normal.x * dir.x + normal.y * dir.y > 0) normal = { x: -normal.x, y: -normal.y };
    return { point: result.point, distance: result.t, normal, type: 'mirror', objId: r.id };
  }

  private hitPrism(origin: Vec2, dir: Vec2, prism: Prism): any | null {
    const s = prism.sideLength;
    const h = (s * Math.sqrt(3)) / 2;
    const cos = Math.cos(prism.rotation);
    const sin = Math.sin(prism.rotation);
    const local = [
      { x: 0, y: -2 * h / 3 },
      { x: -s / 2, y: h / 3 },
      { x: s / 2, y: h / 3 }
    ];
    const world = local.map(c => ({
      x: prism.position.x + c.x * cos - c.y * sin,
      y: prism.position.y + c.x * sin + c.y * cos
    }));

    let bestT = Infinity;
    let bestPoint: Vec2 | null = null;

    for (let i = 0; i < 3; i++) {
      const result = this.raySegment(origin, dir, world[i], world[(i + 1) % 3]);
      if (result && result.t > EPSILON && result.t < bestT) {
        bestT = result.t;
        bestPoint = result.point;
      }
    }

    if (bestPoint && isFinite(bestT)) {
      return {
        point: bestPoint,
        distance: bestT,
        normal: { x: 0, y: -1 },
        type: 'prism',
        objId: prism.id
      };
    }
    return null;
  }

  private hitCircle(origin: Vec2, dir: Vec2, center: Vec2, radius: number): any | null {
    const ox = origin.x - center.x;
    const oy = origin.y - center.y;
    const a = dir.x * dir.x + dir.y * dir.y;
    const b = 2 * (ox * dir.x + oy * dir.y);
    const c = ox * ox + oy * oy - radius * radius;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    const sq = Math.sqrt(disc);
    const t1 = (-b - sq) / (2 * a);
    const t2 = (-b + sq) / (2 * a);
    const t = t1 > EPSILON ? t1 : t2 > EPSILON ? t2 : -1;
    if (t <= 0) return null;
    const point = { x: origin.x + dir.x * t, y: origin.y + dir.y * t };
    const normal = { x: (point.x - center.x) / radius, y: (point.y - center.y) / radius };
    return { point, distance: t, normal, type: 'bounds' };
  }

  private raySegment(origin: Vec2, dir: Vec2, a: Vec2, b: Vec2): { t: number; point: Vec2 } | null {
    const v1x = origin.x - a.x;
    const v1y = origin.y - a.y;
    const v2x = b.x - a.x;
    const v2y = b.y - a.y;
    const v3x = -dir.y;
    const v3y = dir.x;
    const dot = v2x * v3x + v2y * v3y;
    if (Math.abs(dot) < EPSILON) return null;
    const t = (v2x * v1y - v2y * v1x) / dot;
    const u = (v1x * v3x + v1y * v3y) / dot;
    if (t >= 0 && u >= 0 && u <= 1) {
      return { t, point: { x: origin.x + dir.x * t, y: origin.y + dir.y * t } };
    }
    return null;
  }

  private reflect(v: Vec2, n: Vec2): Vec2 {
    const d = v.x * n.x + v.y * n.y;
    return { x: v.x - 2 * d * n.x, y: v.y - 2 * d * n.y };
  }

  private segmentHitsCircle(a: Vec2, b: Vec2, center: Vec2, radius: number): boolean {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < EPSILON) return false;
    let t = ((center.x - a.x) * dx + (center.y - a.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = a.x + t * dx;
    const py = a.y + t * dy;
    return (px - center.x) ** 2 + (py - center.y) ** 2 <= radius * radius;
  }

  private updateBlockedFlash(dt: number): void {
    if (this.state.blockedFlashTime > 0) {
      this.state.blockedFlashTime = Math.max(0, this.state.blockedFlashTime - dt);
    }
  }

  private checkPortalActivation(): void {
    const portal = this.state.portal;
    if (portal.active) {
      if (this.isPortalHit()) this.completeLevel();
      return;
    }
    const allActive = portal.requiredReceivers.every(rid => {
      const r = this.state.receivers.find(rec => rec.id === rid);
      return r?.activated;
    });
    if (allActive) {
      portal.active = true;
      this.spawnParticlesAt(portal.position, '#e040fb', 30);
    }
  }

  private isPortalHit(): boolean {
    for (const list of this.state.raySegments) {
      for (const seg of list) {
        if (this.segmentHitsCircle(seg.start, seg.end, this.state.portal.position, this.state.portal.radius)) {
          return true;
        }
      }
    }
    return false;
  }

  private completeLevel(): void {
    if (this.state.levelComplete) return;
    this.state.levelComplete = true;
    this.state.completeAnimationTime = 0;
    levelManager.completeLevel(this.state.levelId);
    eventBus.emit('levelComplete', { levelId: this.state.levelId, steps: this.state.stepCount });

    for (const source of this.state.lightSources) {
      this.spawnParticlesAt(source.position, '#ffeb3b', 50);
    }
    this.spawnLetterParticles();
  }

  private spawnParticlesAt(pos: Vec2, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 100;
      this.state.particles.push({
        id: `p-${Date.now()}-${i}-${Math.random()}`,
        position: { x: pos.x, y: pos.y },
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        life: 1 + Math.random() * 0.8,
        maxLife: 1.8,
        color,
        size: 2 + Math.random() * 4
      });
    }
  }

  private spawnLetterParticles(): void {
    const text = 'Level Complete';
    const canvasW = 1000;
    const canvasH = 600;
    const charW = 42;
    const totalW = text.length * charW;
    const startX = canvasW / 2 - totalW / 2 + charW / 2;
    const centerY = canvasH / 2;

    const targets: Vec2[] = [];
    for (let i = 0; i < text.length; i++) {
      targets.push({ x: startX + i * charW, y: centerY });
    }

    const colors = ['#ffeb3b', '#ffc107', '#ff9800', '#fff176'];
    this.letterParticles = [];

    for (const source of this.state.lightSources) {
      for (const t of targets) {
        for (let i = 0; i < 10; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 100 + Math.random() * 150;
          this.letterParticles.push({
            position: { x: source.position.x, y: source.position.y },
            targetPosition: { x: t.x + (Math.random() - 0.5) * 18, y: t.y + (Math.random() - 0.5) * 18 },
            velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
            color: colors[Math.floor(Math.random() * colors.length)],
            size: 3 + Math.random() * 5,
            life: 3,
            maxLife: 3,
            phase: 'expand'
          });
        }
      }
    }
  }

  private updateLetterParticles(dt: number): void {
    const t = this.state.completeAnimationTime;
    const gatherAt = 1.0;

    this.letterParticles = this.letterParticles.filter(p => {
      p.life -= dt;
      if (p.life <= 0) return false;

      if (t < gatherAt) {
        p.position.x += p.velocity.x * dt;
        p.position.y += p.velocity.y * dt;
        p.velocity.x *= 0.95;
        p.velocity.y *= 0.95;
      } else {
        p.phase = 'gather';
        const progress = Math.min(1, (t - gatherAt) / 1.5);
        const eased = progress * progress * (3 - 2 * progress);
        p.position.x += (p.targetPosition.x - p.position.x) * eased * 0.2;
        p.position.y += (p.targetPosition.y - p.position.y) * eased * 0.2;
      }
      return true;
    });
  }

  private updateRegularParticles(dt: number): void {
    this.state.particles = this.state.particles.filter(p => {
      p.life -= dt;
      if (p.life <= 0) return false;
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.velocity.x *= 0.97;
      p.velocity.y *= 0.97;
      return true;
    });
  }
}

export const gameEngine = new GameEngine();
