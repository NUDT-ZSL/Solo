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
const MOVE_SPEED = 50;
const PRISM_REFRACTIVE_INDEX = 1.5;
const PRISM_DEFLECT_ANGLE = Math.PI / 6;

interface PerfStats {
  rayComputeTime: number;
  frameTime: number;
  fps: number;
}

interface RaySegmentWithColor extends RaySegment {
  color: { r: number; g: number; b: number };
  alpha: number;
}

interface RayCollision {
  point: Vec2;
  distance: number;
  normal: Vec2;
  type: 'platform' | 'mirror' | 'prism' | 'receiver' | 'portal' | 'bounds';
  objId?: string;
}

export class GameEngine {
  private state: GameState;
  private running: boolean = false;
  private lastTime: number = 0;
  private rafId: number = 0;
  private lastAngleRecord: Map<string, number> = new Map();
  private dragStartAngle: Map<string, number> = new Map();
  private onChangeCallback?: (state: GameState) => void;
  private perfStats: PerfStats = { rayComputeTime: 0, frameTime: 0, fps: 0 };
  private frameCount: number = 0;
  private fpsTimer: number = 0;
  private composedRaySegments: RaySegmentWithColor[] = [];
  private dirty: boolean = true;
  private lastLightSourceAngles: Map<string, number> = new Map();

  constructor() {
    this.state = this.createInitialState();
    this.setupEventListeners();
  }

  private createInitialState(): GameState {
    const level = levelManager.loadLevel(levelManager.getCurrentLevelId());
    if (!level) {
      return this.createEmptyState();
    }
    return this.levelToState(level);
  }

  private createEmptyState(): GameState {
    return {
      levelId: 'level-1',
      levelName: '初遇光径',
      lightSources: [],
      raySegments: [],
      platforms: [],
      reflectors: [],
      prisms: [],
      receivers: [],
      portal: { id: '', position: { x: 0, y: 0 }, radius: 30, targetLevelId: '', active: false, requiredReceivers: [] },
      particles: [],
      stepCount: 0,
      levelComplete: false,
      completeAnimationTime: 0,
      blockedFlashTime: 0
    };
  }

  private levelToState(level: LevelData): GameState {
    return {
      levelId: level.id,
      levelName: level.name,
      lightSources: level.lightSources.map((s) => ({ ...s, position: { ...s.position } })),
      raySegments: [],
      platforms: level.platforms.map((p) => ({
        ...p,
        position: { ...p.position },
        currentOffset: p.currentOffset ?? 0,
        moveDirection: p.moveDirection ? { ...p.moveDirection } : undefined
      })),
      reflectors: level.reflectors.map((r) => ({ ...r, position: { ...r.position } })),
      prisms: level.prisms.map((p) => ({ ...p, position: { ...p.position } })),
      receivers: level.receivers.map((r) => ({ ...r, position: { ...r.position } })),
      portal: { ...level.portal, position: { ...level.portal.position } },
      particles: [],
      stepCount: 0,
      levelComplete: false,
      completeAnimationTime: 0,
      blockedFlashTime: 0
    };
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
        this.dragStartAngle.set(sourceId, source.angle);
        this.lastAngleRecord.set(sourceId, source.angle);
      }
    });

    eventBus.on('sourceDragMove', ({ sourceId, angle }) => {
      const source = this.state.lightSources.find((s) => s.id === sourceId);
      if (source) {
        const rounded = Math.round(angle * 100) / 100;
        source.angle = rounded;

        const lastAngle = this.lastAngleRecord.get(sourceId);
        if (lastAngle !== undefined) {
          const delta = Math.abs(angle - lastAngle);
          if (delta > (5 * Math.PI) / 180) {
            this.state.stepCount++;
            this.lastAngleRecord.set(sourceId, angle);
            eventBus.emit('stepUpdate', { count: this.state.stepCount });
          }
        }
      }
    });

    eventBus.on('sourceDragEnd', ({ sourceId }) => {
      const source = this.state.lightSources.find((s) => s.id === sourceId);
      if (source) {
        source.dragging = false;
      }
      this.dragStartAngle.delete(sourceId);
    });
  }

  public loadLevel(levelId: string): void {
    const level = levelManager.loadLevel(levelId);
    if (level) {
      this.state = this.levelToState(level);
    }
  }

  public resetLevel(): void {
    const level = levelManager.resetLevel(this.state.levelId);
    if (level) {
      this.state = this.levelToState(level);
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
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
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

    const frameTime = performance.now() - frameStart;
    this.perfStats.frameTime = frameTime;
    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 0.5) {
      this.perfStats.fps = Math.round(this.frameCount / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    this.state.perfStats = {
      fps: this.perfStats.fps,
      frameTime: this.perfStats.frameTime,
      rayComputeTime: this.perfStats.rayComputeTime
    };

    if (this.onChangeCallback) {
      this.onChangeCallback(this.state);
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    if (this.state.levelComplete) {
      this.state.completeAnimationTime += dt;
      this.updateParticles(dt);
      this.updateLetterParticles(dt);
      return;
    }

    this.checkDirty();
    this.updateMovingPlatforms(dt);
    this.computeAllRays();
    this.updateReceivers(dt);
    this.checkPortalActivation();
    this.updateBlockedFlash(dt);
    this.updateParticles(dt);
  }

  private checkDirty(): void {
    let changed = false;
    for (const source of this.state.lightSources) {
      const lastAngle = this.lastLightSourceAngles.get(source.id);
      if (lastAngle === undefined || Math.abs(lastAngle - source.angle) > 0.001) {
        changed = true;
        this.lastLightSourceAngles.set(source.id, source.angle);
      }
    }
    if (this.state.platforms.some(p => p.isMoving)) {
      changed = true;
    }
    this.dirty = this.dirty || changed;
  }

  private updateMovingPlatforms(dt: number): void {
    for (const platform of this.state.platforms) {
      if (!platform.movable || !platform.moveDirection || !platform.linkedReceiverId) continue;

      const receiver = this.state.receivers.find((r) => r.id === platform.linkedReceiverId);
      const shouldMove = receiver?.activated || false;
      const maxDist = platform.moveDistance || 150;

      if (shouldMove) {
        const targetOffset = maxDist;
        const dir = platform.moveDirection;
        const delta = MOVE_SPEED * dt;
        const remaining = targetOffset - (platform.currentOffset || 0);

        if (remaining > EPSILON) {
          const actualDelta = Math.min(delta, remaining);
          platform.position.x += dir.x * actualDelta;
          platform.position.y += dir.y * actualDelta;
          platform.currentOffset = (platform.currentOffset || 0) + actualDelta;
          platform.isMoving = true;
        } else {
          platform.isMoving = false;
        }
      }
    }
  }

  private updateBlockedFlash(dt: number): void {
    if (this.state.blockedFlashTime > 0) {
      this.state.blockedFlashTime = Math.max(0, this.state.blockedFlashTime - dt);
    }
  }

  private computeAllRays(): void {
    if (!this.dirty && this.state.raySegments.length > 0) {
      return;
    }

    const startTime = performance.now();

    this.state.raySegments = [];
    this.composedRaySegments = [];

    const allSegments: RaySegmentWithColor[] = [];

    for (const source of this.state.lightSources) {
      const segments: RaySegment[] = [];
      const sourceColor = { r: 255, g: 235, b: 59 };

      this.traceRay(
        source.position,
        { x: Math.cos(source.angle), y: Math.sin(source.angle) },
        1.0,
        segments,
        0,
        null,
        sourceColor,
        0.8,
        allSegments
      );
      this.state.raySegments.push(segments);
    }

    this.composedRaySegments = this.composeRays(allSegments);
    this.state.composedRaySegments = this.composedRaySegments.map(s => ({
      start: s.start,
      end: s.end,
      intensity: s.intensity,
      blocked: s.blocked
    }));

    this.dirty = false;
    this.perfStats.rayComputeTime = performance.now() - startTime;
  }

  private composeRays(segments: RaySegmentWithColor[]): RaySegmentWithColor[] {
    if (segments.length === 0) return [];

    const grid: Map<string, { r: number; g: number; b: number; alpha: number }> = new Map();
    const CELL_SIZE = 4;

    for (const seg of segments) {
      const steps = Math.ceil(Math.hypot(seg.end.x - seg.start.x, seg.end.y - seg.start.y) / CELL_SIZE);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = Math.floor((seg.start.x + (seg.end.x - seg.start.x) * t) / CELL_SIZE);
        const y = Math.floor((seg.start.y + (seg.end.y - seg.start.y) * t) / CELL_SIZE);
        const key = `${x},${y}`;

        const existing = grid.get(key);
        if (existing) {
          existing.r = Math.max(existing.r, seg.color.r);
          existing.g = Math.max(existing.g, seg.color.g);
          existing.b = Math.max(existing.b, seg.color.b);
          existing.alpha = Math.min(1, existing.alpha + seg.alpha);
        } else {
          grid.set(key, {
            r: seg.color.r,
            g: seg.color.g,
            b: seg.color.b,
            alpha: seg.alpha
          });
        }
      }
    }

    return segments.map(seg => {
      const midX = (seg.start.x + seg.end.x) / 2;
      const midY = (seg.start.y + seg.end.y) / 2;
      const key = `${Math.floor(midX / CELL_SIZE)},${Math.floor(midY / CELL_SIZE)}`;
      const composed = grid.get(key);
      if (composed) {
        return {
          ...seg,
          color: { r: composed.r, g: composed.g, b: composed.b },
          alpha: composed.alpha
        };
      }
      return seg;
    });
  }

  private traceRay(
    origin: Vec2,
    dir: Vec2,
    intensity: number,
    outSegments: RaySegment[],
    bounceCount: number,
    ignoreObjId: string | null,
    inColor: { r: number; g: number; b: number },
    inAlpha: number,
    outColoredSegments: RaySegmentWithColor[]
  ): void {
    if (bounceCount >= MAX_BOUNCES || intensity < 0.05) return;

    const collision = this.findClosestCollision(origin, dir, ignoreObjId);

    const endColor = {
      r: Math.max(100, Math.min(255, inColor.r * (0.3 + 0.7 * intensity))),
      g: Math.max(50, Math.min(255, inColor.g * (0.2 + 0.8 * intensity))),
      b: Math.max(0, Math.min(255, inColor.b * intensity))
    };
    const endAlpha = Math.max(0.2, inAlpha * intensity);

    if (!collision) {
      const endPoint: Vec2 = {
        x: origin.x + dir.x * MAX_RAY_LENGTH,
        y: origin.y + dir.y * MAX_RAY_LENGTH
      };
      outSegments.push({ start: { ...origin }, end: endPoint, intensity });
      outColoredSegments.push({
        start: { ...origin },
        end: endPoint,
        intensity,
        color: endColor,
        alpha: endAlpha
      });
      return;
    }

    outSegments.push({
      start: { ...origin },
      end: { ...collision.point },
      intensity,
      blocked: collision.type === 'platform'
    });
    outColoredSegments.push({
      start: { ...origin },
      end: { ...collision.point },
      intensity,
      blocked: collision.type === 'platform',
      color: endColor,
      alpha: endAlpha
    });

    if (collision.type === 'platform') {
      if (this.isPlatformMovableBlocking(collision.objId)) {
        this.state.blockedFlashTime = 0.5;
        this.state.blockedPosition = { ...collision.point };
      }
      return;
    }

    if (collision.type === 'receiver') {
      return;
    }

    if (collision.type === 'portal') {
      return;
    }

    if (collision.type === 'mirror') {
      const reflector = this.state.reflectors.find((r) => r.id === collision.objId);
      const efficiency = reflector?.efficiency ?? 0.95;
      const reflected = this.reflectVector(dir, collision.normal);

      const newColor = {
        r: Math.min(255, inColor.r * 0.95),
        g: Math.min(255, inColor.g * 0.98),
        b: Math.min(255, inColor.b + 10)
      };

      this.traceRay(
        collision.point,
        reflected,
        intensity * efficiency,
        outSegments,
        bounceCount + 1,
        collision.objId ?? null,
        newColor,
        inAlpha * efficiency,
        outColoredSegments
      );
      return;
    }

    if (collision.type === 'prism') {
      const prism = this.state.prisms.find((p) => p.id === collision.objId);
      if (!prism) return;

      const n1 = 1.0;
      const n2 = prism.refractiveIndex || PRISM_REFRACTIVE_INDEX;

      const transmittedDir = this.refractVector(dir, collision.normal, n1, n2);
      const deflectedDir = this.rotateVector(dir, PRISM_DEFLECT_ANGLE);

      const transmittedColor = {
        r: Math.min(255, inColor.r),
        g: Math.min(255, Math.floor(inColor.g * 0.9)),
        b: Math.min(255, Math.floor(inColor.b * 0.7))
      };

      const deflectedColor = {
        r: Math.min(255, Math.floor(inColor.r * 0.7)),
        g: Math.min(255, Math.floor(inColor.g * 0.9)),
        b: Math.min(255, inColor.b)
      };

      this.traceRay(
        collision.point,
        transmittedDir,
        intensity * 0.7,
        outSegments,
        bounceCount + 1,
        collision.objId ?? null,
        transmittedColor,
        inAlpha * 0.7,
        outColoredSegments
      );

      this.traceRay(
        collision.point,
        deflectedDir,
        intensity * 0.5,
        outSegments,
        bounceCount + 1,
        collision.objId ?? null,
        deflectedColor,
        inAlpha * 0.5,
        outColoredSegments
      );
      return;
    }

    if (collision.type === 'bounds') {
      return;
    }
  }

  private refractVector(v: Vec2, n: Vec2, n1: number, n2: number): Vec2 {
    const nr = n1 / n2;
    const dot = v.x * n.x + v.y * n.y;
    const k = 1 - nr * nr * (1 - dot * dot);

    if (k < 0) {
      return this.reflectVector(v, n);
    }

    const sqrtK = Math.sqrt(k);
    return {
      x: nr * v.x - (nr * dot + sqrtK) * n.x,
      y: nr * v.y - (nr * dot + sqrtK) * n.y
    };
  }

  private rotateVector(v: Vec2, angle: number): Vec2 {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: v.x * cos - v.y * sin,
      y: v.x * sin + v.y * cos
    };
  }

  private isPlatformMovableBlocking(platformId?: string): boolean {
    if (!platformId) return false;
    const p = this.state.platforms.find((pl) => pl.id === platformId);
    return p?.isMoving === true || (p?.movable ?? false);
  }

  private findClosestCollision(origin: Vec2, dir: Vec2, ignoreObjId: string | null): RayCollision | null {
    let closest: RayCollision | null = null;

    for (const platform of this.state.platforms) {
      if (platform.id === ignoreObjId) continue;
      const hit = this.raycastPlatform(origin, dir, platform);
      if (hit && hit.distance > EPSILON && (!closest || hit.distance < closest.distance)) {
        closest = hit;
      }
    }

    for (const reflector of this.state.reflectors) {
      if (reflector.id === ignoreObjId) continue;
      if (reflector.type !== 'mirror') continue;
      const hit = this.raycastMirror(origin, dir, reflector);
      if (hit && hit.distance > EPSILON && (!closest || hit.distance < closest.distance)) {
        closest = hit;
      }
    }

    for (const prism of this.state.prisms) {
      if (prism.id === ignoreObjId) continue;
      const hit = this.raycastPrism(origin, dir, prism);
      if (hit && hit.distance > EPSILON && (!closest || hit.distance < closest.distance)) {
        closest = hit;
      }
    }

    for (const receiver of this.state.receivers) {
      const hit = this.raycastCircle(origin, dir, receiver.position, receiver.radius);
      if (hit && hit.distance > EPSILON && (!closest || hit.distance < closest.distance)) {
        closest = { ...hit, type: 'receiver', objId: receiver.id };
      }
    }

    const portal = this.state.portal;
    if (portal.active) {
      const hit = this.raycastCircle(origin, dir, portal.position, portal.radius);
      if (hit && hit.distance > EPSILON && (!closest || hit.distance < closest.distance)) {
        closest = { ...hit, type: 'portal', objId: portal.id };
      }
    }

    return closest;
  }

  private raycastPlatform(origin: Vec2, dir: Vec2, platform: Platform): RayCollision | null {
    const cosA = Math.cos(platform.angle);
    const sinA = Math.sin(platform.angle);
    const hl = platform.length / 2;
    const hw = platform.width / 2;

    const corners: Vec2[] = [
      { x: -hl, y: -hw },
      { x: hl, y: -hw },
      { x: hl, y: hw },
      { x: -hl, y: hw }
    ].map((c) => ({
      x: platform.position.x + c.x * cosA - c.y * sinA,
      y: platform.position.y + c.x * sinA + c.y * cosA
    }));

    let closestT = Infinity;
    let closestNormal: Vec2 = { x: 0, y: 0 };
    let hitPoint: Vec2 | null = null;

    for (let i = 0; i < 4; i++) {
      const a = corners[i];
      const b = corners[(i + 1) % 4];
      const result = this.raySegmentIntersect(origin, dir, a, b);
      if (result && result.t > EPSILON && result.t < closestT) {
        closestT = result.t;
        hitPoint = result.point;
        const edge = { x: b.x - a.x, y: b.y - a.y };
        const len = Math.hypot(edge.x, edge.y) || 1;
        closestNormal = { x: -edge.y / len, y: edge.x / len };
        if (closestNormal.x * dir.x + closestNormal.y * dir.y > 0) {
          closestNormal = { x: -closestNormal.x, y: -closestNormal.y };
        }
      }
    }

    if (hitPoint && isFinite(closestT)) {
      return { point: hitPoint, distance: closestT, normal: closestNormal, type: 'platform', objId: platform.id };
    }
    return null;
  }

  private raycastMirror(origin: Vec2, dir: Vec2, reflector: Reflector): RayCollision | null {
    const cosA = Math.cos(reflector.rotation);
    const sinA = Math.sin(reflector.rotation);

    const p1: Vec2 = {
      x: reflector.position.x - REFLECTOR_HALF_LENGTH * cosA,
      y: reflector.position.y - REFLECTOR_HALF_LENGTH * sinA
    };
    const p2: Vec2 = {
      x: reflector.position.x + REFLECTOR_HALF_LENGTH * cosA,
      y: reflector.position.y + REFLECTOR_HALF_LENGTH * sinA
    };

    const result = this.raySegmentIntersect(origin, dir, p1, p2);
    if (!result || result.t <= EPSILON) return null;

    const normal: Vec2 = { x: -sinA, y: cosA };
    if (normal.x * dir.x + normal.y * dir.y > 0) {
      normal.x = -normal.x;
      normal.y = -normal.y;
    }

    return { point: result.point, distance: result.t, normal, type: 'mirror', objId: reflector.id };
  }

  private raycastPrism(origin: Vec2, dir: Vec2, prism: Prism): RayCollision | null {
    const s = prism.sideLength;
    const h = (s * Math.sqrt(3)) / 2;
    const cosA = Math.cos(prism.rotation);
    const sinA = Math.sin(prism.rotation);

    const localCorners: Vec2[] = [
      { x: 0, y: -2 * h / 3 },
      { x: -s / 2, y: h / 3 },
      { x: s / 2, y: h / 3 }
    ];

    const corners = localCorners.map((c) => ({
      x: prism.position.x + c.x * cosA - c.y * sinA,
      y: prism.position.y + c.x * sinA + c.y * cosA
    }));

    let closestT = Infinity;
    let hitPoint: Vec2 | null = null;

    for (let i = 0; i < 3; i++) {
      const a = corners[i];
      const b = corners[(i + 1) % 3];
      const result = this.raySegmentIntersect(origin, dir, a, b);
      if (result && result.t > EPSILON && result.t < closestT) {
        closestT = result.t;
        hitPoint = result.point;
      }
    }

    if (hitPoint && isFinite(closestT)) {
      return {
        point: hitPoint,
        distance: closestT,
        normal: { x: 0, y: -1 },
        type: 'prism',
        objId: prism.id
      };
    }
    return null;
  }

  private raycastCircle(origin: Vec2, dir: Vec2, center: Vec2, radius: number): RayCollision | null {
    const oc: Vec2 = { x: origin.x - center.x, y: origin.y - center.y };
    const a = dir.x * dir.x + dir.y * dir.y;
    const b = 2 * (oc.x * dir.x + oc.y * dir.y);
    const c = oc.x * oc.x + oc.y * oc.y - radius * radius;

    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;

    const sq = Math.sqrt(discriminant);
    const t1 = (-b - sq) / (2 * a);
    const t2 = (-b + sq) / (2 * a);

    const t = t1 > EPSILON ? t1 : t2 > EPSILON ? t2 : -1;
    if (t <= 0) return null;

    const point: Vec2 = { x: origin.x + dir.x * t, y: origin.y + dir.y * t };
    const normal: Vec2 = { x: (point.x - center.x) / radius, y: (point.y - center.y) / radius };

    return { point, distance: t, normal, type: 'bounds' };
  }

  private raySegmentIntersect(
    origin: Vec2,
    dir: Vec2,
    a: Vec2,
    b: Vec2
  ): { t: number; point: Vec2 } | null {
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
      return {
        t,
        point: { x: origin.x + dir.x * t, y: origin.y + dir.y * t }
      };
    }
    return null;
  }

  private reflectVector(v: Vec2, n: Vec2): Vec2 {
    const dot = v.x * n.x + v.y * n.y;
    return {
      x: v.x - 2 * dot * n.x,
      y: v.y - 2 * dot * n.y
    };
  }

  private updateReceivers(dt: number): void {
    for (const receiver of this.state.receivers) {
      const isHit = this.isReceiverHitByAnyRay(receiver);

      if (isHit) {
        if (!receiver.activated) {
          receiver.activationProgress = Math.min(
            receiver.requiredDuration,
            receiver.activationProgress + dt
          );
          if (receiver.activationProgress >= receiver.requiredDuration) {
            receiver.activated = true;
            eventBus.emit('receiverActivated', { receiverId: receiver.id });
            this.spawnActivationParticles(receiver.position, receiver.color);
          }
        }
      } else {
        if (!receiver.activated) {
          receiver.activationProgress = Math.max(0, receiver.activationProgress - dt * 0.5);
        }
      }
    }
  }

  private isReceiverHitByAnyRay(receiver: Receiver): boolean {
    for (const rayList of this.state.raySegments) {
      for (const segment of rayList) {
        if (this.segmentHitsCircle(segment.start, segment.end, receiver.position, receiver.radius)) {
          return true;
        }
      }
    }
    return false;
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
    const dist2 = (px - center.x) * (px - center.x) + (py - center.y) * (py - center.y);

    return dist2 <= radius * radius;
  }

  private checkPortalActivation(): void {
    const portal = this.state.portal;
    if (portal.active) {
      if (this.isPortalHitByRay()) {
        this.completeLevel();
      }
      return;
    }

    const allActive = portal.requiredReceivers.every((rid) => {
      const r = this.state.receivers.find((recv) => recv.id === rid);
      return r?.activated;
    });

    if (allActive) {
      portal.active = true;
      this.spawnActivationParticles(portal.position, '#e040fb');
    }
  }

  private isPortalHitByRay(): boolean {
    for (const rayList of this.state.raySegments) {
      for (const segment of rayList) {
        if (this.segmentHitsCircle(segment.start, segment.end, this.state.portal.position, this.state.portal.radius)) {
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
    this.spawnCompletionParticles();
    this.spawnLetterParticles();
  }

  private spawnActivationParticles(pos: Vec2, color: string): void {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 60;
      this.state.particles.push({
        id: `p-${Date.now()}-${i}-${Math.random()}`,
        position: { ...pos },
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        life: 1 + Math.random() * 0.5,
        maxLife: 1.5,
        color,
        size: 2 + Math.random() * 3
      });
    }
  }

  private spawnCompletionParticles(): void {
    for (const source of this.state.lightSources) {
      for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 100;
        this.state.particles.push({
          id: `comp-${Date.now()}-${i}-${Math.random()}`,
          position: { ...source.position },
          velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
          life: 2 + Math.random() * 1,
          maxLife: 3,
          color: Math.random() > 0.5 ? '#ffeb3b' : '#ff9800',
          size: 3 + Math.random() * 4
        });
      }
    }
  }

  private updateParticles(dt: number): void {
    this.state.particles = this.state.particles.filter((p) => {
      p.life -= dt;
      if (p.life <= 0) return false;
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.velocity.x *= 0.98;
      p.velocity.y *= 0.98;
      return true;
    });
  }

  private spawnLetterParticles(): void {
    const text = 'Level Complete';
    const canvasWidth = 1000;
    const canvasHeight = 600;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const fontSize = 64;
    const charWidth = 42;
    const totalWidth = text.length * charWidth;
    const startX = centerX - totalWidth / 2 + charWidth / 2;

    const letterTargets: Array<{ char: string; x: number; y: number }> = [];
    for (let i = 0; i < text.length; i++) {
      letterTargets.push({
        char: text[i],
        x: startX + i * charWidth,
        y: centerY
      });
    }

    const colors = ['#ffeb3b', '#ffc107', '#ff9800', '#ffeb3b'];
    this.state.letterParticles = [];

    for (const source of this.state.lightSources) {
      for (const target of letterTargets) {
        for (let i = 0; i < 8; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 80 + Math.random() * 120;
          this.state.letterParticles.push({
            position: { ...source.position },
            targetPosition: { x: target.x + (Math.random() - 0.5) * 20, y: target.y + (Math.random() - 0.5) * 20 },
            velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
            color: colors[Math.floor(Math.random() * colors.length)],
            size: 3 + Math.random() * 4,
            life: 3,
            maxLife: 3,
            phase: 'expand'
          });
        }
      }
    }
  }

  private updateLetterParticles(dt: number): void {
    if (!this.state.letterParticles) return;

    const t = this.state.completeAnimationTime;
    const gatherStartTime = 1.0;

    this.state.letterParticles = this.state.letterParticles.filter(p => {
      p.life -= dt;
      if (p.life <= 0) return false;

      if (t < gatherStartTime) {
        p.position.x += p.velocity.x * dt;
        p.position.y += p.velocity.y * dt;
        p.velocity.x *= 0.96;
        p.velocity.y *= 0.96;
      } else {
        p.phase = 'gather';
        const gatherProgress = Math.min(1, (t - gatherStartTime) / 1.5);
        const ease = gatherProgress * gatherProgress * (3 - 2 * gatherProgress);

        p.position.x += (p.targetPosition.x - p.position.x) * ease * 0.15;
        p.position.y += (p.targetPosition.y - p.position.y) * ease * 0.15;
      }

      return true;
    });
  }
}

export const gameEngine = new GameEngine();
