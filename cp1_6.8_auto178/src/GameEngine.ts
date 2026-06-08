import {
  Level, Mirror, Core, LightSource, LightSegment, Particle, LightWave,
  Vec2, LightColor, GameState, COLOR_MAP, COLOR_GLOW,
} from './types';
import { MirrorSystem } from './MirrorSystem';
import { LightRenderer } from './LightRenderer';

export const LEVELS: Level[] = [
  {
    id: 1,
    name: '初光',
    lightSource: { position: { x: 100, y: 400 }, direction: 0, color: 'white' },
    mirrors: [
      {
        id: 'm1', center: { x: 500, y: 400 }, length: 140, thickness: 16,
        angle: 0, targetAngle: 0, angularVelocity: 0,
        isAutoRotating: false, autoRotateSpeed: 0,
        isDragging: false, isHighlighted: false, glowIntensity: 0, vertices: [],
      },
    ],
    cores: [
      {
        id: 'c1', position: { x: 500, y: 160 }, radius: 22,
        requiredColor: 'white', isActivated: false, activationTime: 0, pulsePhase: 0,
      },
    ],
    walls: [],
    par: 1,
    hintMirrorId: 'm1',
  },
  {
    id: 2,
    name: '双镜折射',
    lightSource: { position: { x: 100, y: 600 }, direction: -Math.PI / 4, color: 'white' },
    mirrors: [
      {
        id: 'm1', center: { x: 350, y: 350 }, length: 140, thickness: 16,
        angle: Math.PI / 6, targetAngle: Math.PI / 6, angularVelocity: 0,
        isAutoRotating: false, autoRotateSpeed: 0,
        isDragging: false, isHighlighted: false, glowIntensity: 0, vertices: [],
      },
      {
        id: 'm2', center: { x: 750, y: 350 }, length: 140, thickness: 16,
        angle: 0, targetAngle: 0, angularVelocity: 0,
        isAutoRotating: false, autoRotateSpeed: 0,
        isDragging: false, isHighlighted: false, glowIntensity: 0, vertices: [],
      },
    ],
    cores: [
      {
        id: 'c1', position: { x: 1000, y: 350 }, radius: 22,
        requiredColor: 'white', isActivated: false, activationTime: 0, pulsePhase: 1,
      },
    ],
    walls: [],
    par: 2,
    hintMirrorId: 'm2',
  },
  {
    id: 3,
    name: '虹光初现',
    lightSource: { position: { x: 100, y: 400 }, direction: 0, color: 'white' },
    mirrors: [
      {
        id: 'm1', center: { x: 350, y: 400 }, length: 130, thickness: 16,
        angle: Math.PI / 4, targetAngle: Math.PI / 4, angularVelocity: 0,
        isAutoRotating: false, autoRotateSpeed: 0,
        isDragging: false, isHighlighted: false, glowIntensity: 0, vertices: [],
      },
      {
        id: 'm2', center: { x: 350, y: 150 }, length: 130, thickness: 16,
        angle: 0, targetAngle: 0, angularVelocity: 0,
        colorFilter: 'red',
        isAutoRotating: false, autoRotateSpeed: 0,
        isDragging: false, isHighlighted: false, glowIntensity: 0, vertices: [],
      },
    ],
    cores: [
      {
        id: 'c1', position: { x: 700, y: 150 }, radius: 22,
        requiredColor: 'red', isActivated: false, activationTime: 0, pulsePhase: 2,
      },
    ],
    walls: [],
    par: 2,
    hintMirrorId: 'm2',
  },
  {
    id: 4,
    name: '旋涡之镜',
    lightSource: { position: { x: 100, y: 300 }, direction: 0, color: 'white' },
    mirrors: [
      {
        id: 'm1', center: { x: 400, y: 300 }, length: 140, thickness: 16,
        angle: Math.PI / 6, targetAngle: Math.PI / 6, angularVelocity: 0,
        isAutoRotating: false, autoRotateSpeed: 0,
        isDragging: false, isHighlighted: false, glowIntensity: 0, vertices: [],
      },
      {
        id: 'm2', center: { x: 700, y: 300 }, length: 150, thickness: 16,
        angle: 0, targetAngle: 0, angularVelocity: 0,
        isAutoRotating: true, autoRotateSpeed: 0.25,
        isDragging: false, isHighlighted: false, glowIntensity: 0, vertices: [],
      },
      {
        id: 'm3', center: { x: 700, y: 100 }, length: 130, thickness: 16,
        angle: 0, targetAngle: 0, angularVelocity: 0,
        isAutoRotating: false, autoRotateSpeed: 0,
        isDragging: false, isHighlighted: false, glowIntensity: 0, vertices: [],
      },
    ],
    cores: [
      {
        id: 'c1', position: { x: 1000, y: 100 }, radius: 22,
        requiredColor: 'white', isActivated: false, activationTime: 0, pulsePhase: 3,
      },
    ],
    walls: [],
    par: 2,
    hintMirrorId: 'm3',
  },
  {
    id: 5,
    name: '终极折射',
    lightSource: { position: { x: 100, y: 550 }, direction: -Math.PI / 6, color: 'white' },
    mirrors: [
      {
        id: 'm1', center: { x: 300, y: 380 }, length: 140, thickness: 16,
        angle: 0, targetAngle: 0, angularVelocity: 0,
        colorFilter: 'blue',
        isAutoRotating: false, autoRotateSpeed: 0,
        isDragging: false, isHighlighted: false, glowIntensity: 0, vertices: [],
      },
      {
        id: 'm2', center: { x: 550, y: 200 }, length: 130, thickness: 16,
        angle: 0, targetAngle: 0, angularVelocity: 0,
        isAutoRotating: false, autoRotateSpeed: 0,
        isDragging: false, isHighlighted: false, glowIntensity: 0, vertices: [],
      },
      {
        id: 'm3', center: { x: 850, y: 350 }, length: 140, thickness: 16,
        angle: 0, targetAngle: 0, angularVelocity: 0,
        isAutoRotating: true, autoRotateSpeed: 0.18,
        isDragging: false, isHighlighted: false, glowIntensity: 0, vertices: [],
      },
      {
        id: 'm4', center: { x: 950, y: 550 }, length: 130, thickness: 16,
        angle: 0, targetAngle: 0, angularVelocity: 0,
        colorFilter: 'green',
        isAutoRotating: false, autoRotateSpeed: 0,
        isDragging: false, isHighlighted: false, glowIntensity: 0, vertices: [],
      },
    ],
    cores: [
      {
        id: 'c1', position: { x: 1080, y: 550 }, radius: 22,
        requiredColor: 'blue', isActivated: false, activationTime: 0, pulsePhase: 4,
      },
    ],
    walls: [],
    par: 3,
    hintMirrorId: 'm1',
  },
];

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mirrorSystem: MirrorSystem;
  private renderer: LightRenderer;
  private animFrameId: number = 0;
  private lastTime: number = 0;
  private state: GameState;
  private onStateChange: (() => void) | null = null;
  private currentLevel: Level | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.mirrorSystem = new MirrorSystem();
    this.renderer = new LightRenderer(this.ctx);
    this.state = {
      currentLevelIndex: 0,
      steps: 0,
      isLevelComplete: false,
      isGameComplete: false,
      isShowingHint: false,
      lightSegments: [],
      particles: [],
      lightWaves: [],
      time: 0,
      levelCompleteTime: 0,
      score: [],
    };
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.gameLoop = this.gameLoop.bind(this);
  }

  start(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('touchstart', this.handleTouchStart);
    this.canvas.addEventListener('touchmove', this.handleTouchMove);
    this.canvas.addEventListener('touchend', this.handleTouchEnd);
    this.resize();
    this.loadLevel(0);
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  stop(): void {
    cancelAnimationFrame(this.animFrameId);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.renderer.resize(window.innerWidth, window.innerHeight);
  }

  setOnStateChange(cb: () => void): void {
    this.onStateChange = cb;
  }

  getState(): GameState {
    return this.state;
  }

  getCurrentLevel(): Level | null {
    return this.currentLevel;
  }

  reset(): void {
    this.loadLevel(this.state.currentLevelIndex);
  }

  nextLevel(): void {
    if (this.state.currentLevelIndex < LEVELS.length - 1) {
      this.loadLevel(this.state.currentLevelIndex + 1);
    }
  }

  toggleHint(): void {
    this.state.isShowingHint = !this.state.isShowingHint;
    if (this.state.isShowingHint && this.currentLevel) {
      this.mirrorSystem.setHighlight(this.currentLevel.hintMirrorId);
    } else {
      this.mirrorSystem.clearHighlights();
    }
    this.notifyStateChange();
  }

  private loadLevel(index: number): void {
    const level = LEVELS[index];
    if (!level) return;
    this.currentLevel = JSON.parse(JSON.stringify(level));
    this.state.currentLevelIndex = index;
    this.state.steps = 0;
    this.state.isLevelComplete = false;
    this.state.isShowingHint = false;
    this.state.lightSegments = [];
    this.state.particles = [];
    this.state.lightWaves = [];
    this.state.levelCompleteTime = 0;
    this.mirrorSystem.loadMirrors(this.currentLevel.mirrors);
    this.mirrorSystem.clearHighlights();
    this.notifyStateChange();
  }

  private gameLoop(timestamp: number): void {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;
    this.state.time += dt;

    this.mirrorSystem.update(dt);
    this.traceLight();
    this.updateParticles(dt);
    this.updateLightWaves(dt);
    this.checkLevelComplete();

    this.renderer.render(
      this.mirrorSystem.getMirrors(),
      this.currentLevel!.cores,
      this.currentLevel!.lightSource,
      this.state.lightSegments,
      this.state.particles,
      this.state.lightWaves,
      this.state.time,
    );

    this.animFrameId = requestAnimationFrame(this.gameLoop);
  }

  private traceLight(): void {
    if (!this.currentLevel) return;
    const source = this.currentLevel.lightSource;
    const mirrors = this.mirrorSystem.getMirrors();
    const cores = this.currentLevel.cores;

    const segments: LightSegment[] = [];
    let origin: Vec2 = { ...source.position };
    let dirAngle = source.angle !== undefined ? source.angle : source.direction;
    let direction: Vec2 = { x: Math.cos(dirAngle), y: Math.sin(dirAngle) };
    let color: LightColor = source.color;
    let intensity = 1.0;
    const maxBounces = 30;
    const maxDist = 2000;

    for (let bounce = 0; bounce < maxBounces; bounce++) {
      let nearestT = maxDist;
      let hitMirror: Mirror | null = null;
      let hitCore: Core | null = null;

      for (const mirror of mirrors) {
        const { start, end } = this.mirrorSystem.getMirrorEndpoints(mirror);
        const result = this.raySegmentIntersection(origin, direction, start, end);
        if (result && result.t > 0.5 && result.t < nearestT) {
          nearestT = result.t;
          hitMirror = mirror;
          hitCore = null;
        }
      }

      for (const core of cores) {
        if (core.isActivated) continue;
        const t = this.rayCircleIntersection(origin, direction, core.position, core.radius);
        if (t !== null && t > 0.5 && t < nearestT) {
          if (color === core.requiredColor || core.requiredColor === 'white' || color === 'white') {
            nearestT = t;
            hitCore = core;
            hitMirror = null;
          }
        }
      }

      const endPoint: Vec2 = {
        x: origin.x + direction.x * nearestT,
        y: origin.y + direction.y * nearestT,
      };

      segments.push({ start: { ...origin }, end: endPoint, color, intensity });

      if (hitCore) {
        if (!hitCore.isActivated) {
          hitCore.isActivated = true;
          hitCore.activationTime = this.state.time;
          this.spawnActivationEffects(hitCore, color);
        }
        break;
      }

      if (hitMirror) {
        const normal = this.mirrorSystem.getMirrorNormal(hitMirror);
        const dot = direction.x * normal.x + direction.y * normal.y;
        if (dot > 0) {
          normal.x = -normal.x;
          normal.y = -normal.y;
        }
        direction = {
          x: direction.x - 2 * (direction.x * normal.x + direction.y * normal.y) * normal.x,
          y: direction.y - 2 * (direction.x * normal.x + direction.y * normal.y) * normal.y,
        };
        const len = Math.hypot(direction.x, direction.y);
        direction.x /= len;
        direction.y /= len;
        origin = { ...endPoint };
        if (hitMirror.colorFilter) {
          color = hitMirror.colorFilter;
        }
        intensity *= 0.92;
        if (intensity < 0.05) break;
      } else {
        break;
      }
    }

    this.state.lightSegments = segments;
  }

  private raySegmentIntersection(
    rayOrigin: Vec2, rayDir: Vec2,
    segStart: Vec2, segEnd: Vec2
  ): { t: number; s: number } | null {
    const dx = segEnd.x - segStart.x;
    const dy = segEnd.y - segStart.y;
    const denom = rayDir.x * dy - rayDir.y * dx;
    if (Math.abs(denom) < 1e-10) return null;
    const t = ((segStart.x - rayOrigin.x) * dy - (segStart.y - rayOrigin.y) * dx) / denom;
    const s = ((segStart.x - rayOrigin.x) * rayDir.y - (segStart.y - rayOrigin.y) * rayDir.x) / denom;
    if (t > 0 && s >= 0 && s <= 1) {
      return { t, s };
    }
    return null;
  }

  private rayCircleIntersection(
    rayOrigin: Vec2, rayDir: Vec2,
    center: Vec2, radius: number
  ): number | null {
    const oc = { x: rayOrigin.x - center.x, y: rayOrigin.y - center.y };
    const a = rayDir.x * rayDir.x + rayDir.y * rayDir.y;
    const b = 2 * (oc.x * rayDir.x + oc.y * rayDir.y);
    const c = oc.x * oc.x + oc.y * oc.y - radius * radius;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    const sqrtDisc = Math.sqrt(disc);
    const t1 = (-b - sqrtDisc) / (2 * a);
    const t2 = (-b + sqrtDisc) / (2 * a);
    if (t1 > 0) return t1;
    if (t2 > 0) return t2;
    return null;
  }

  private spawnActivationEffects(core: Core, lightColor: LightColor): void {
    const colorStr = COLOR_MAP[lightColor];
    for (let i = 0; i < 3; i++) {
      this.state.lightWaves.push({
        center: { ...core.position },
        radius: core.radius,
        maxRadius: 150 + i * 60,
        alpha: 0.8 - i * 0.2,
        color: colorStr,
      });
    }
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 100;
      this.state.particles.push({
        position: { ...core.position },
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        alpha: 0.9,
        size: 1.5 + Math.random() * 2.5,
        color: colorStr,
        life: 0,
        maxLife: 1.0 + Math.random() * 0.8,
        isConverging: false,
      });
    }
  }

  private updateParticles(dt: number): void {
    const alive: Particle[] = [];
    for (const p of this.state.particles) {
      p.life += dt;
      if (p.life >= p.maxLife) continue;
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.velocity.x *= 0.97;
      p.velocity.y *= 0.97;
      const progress = p.life / p.maxLife;
      p.alpha = 1.0 - progress;
      p.size *= (1 - dt * 0.5);
      if (p.size < 0.1) p.size = 0.1;
      alive.push(p);
    }
    this.state.particles = alive;
  }

  private updateLightWaves(dt: number): void {
    const alive: LightWave[] = [];
    for (const w of this.state.lightWaves) {
      w.radius += 120 * dt;
      w.alpha -= dt * 0.7;
      if (w.alpha > 0 && w.radius < w.maxRadius) {
        alive.push(w);
      }
    }
    this.state.lightWaves = alive;
  }

  private checkLevelComplete(): void {
    if (!this.currentLevel || this.state.isLevelComplete) return;
    const allActivated = this.currentLevel.cores.every(c => c.isActivated);
    if (allActivated) {
      this.state.isLevelComplete = true;
      this.state.levelCompleteTime = this.state.time;
      this.state.score[this.state.currentLevelIndex] = this.state.steps;
      this.notifyStateChange();
    }
  }

  private handleMouseDown(e: MouseEvent): void {
    if (this.state.isLevelComplete) return;
    const rect = this.canvas.getBoundingClientRect();
    const gamePos = this.renderer.screenToGame(e.clientX - rect.left, e.clientY - rect.top);
    this.mirrorSystem.handleMouseDown(gamePos);
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const gamePos = this.renderer.screenToGame(e.clientX - rect.left, e.clientY - rect.top);
    this.mirrorSystem.handleMouseMove(gamePos);
  }

  private handleMouseUp(_e: MouseEvent): void {
    const rotated = this.mirrorSystem.handleMouseUp();
    if (rotated && !this.state.isLevelComplete) {
      this.state.steps++;
      if (this.state.isShowingHint) {
        this.state.isShowingHint = false;
        this.mirrorSystem.clearHighlights();
      }
      this.notifyStateChange();
    }
  }

  private handleTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (this.state.isLevelComplete) return;
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const gamePos = this.renderer.screenToGame(touch.clientX - rect.left, touch.clientY - rect.top);
    this.mirrorSystem.handleMouseDown(gamePos);
  };

  private handleTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const gamePos = this.renderer.screenToGame(touch.clientX - rect.left, touch.clientY - rect.top);
    this.mirrorSystem.handleMouseMove(gamePos);
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    e.preventDefault();
    const rotated = this.mirrorSystem.handleMouseUp();
    if (rotated && !this.state.isLevelComplete) {
      this.state.steps++;
      if (this.state.isShowingHint) {
        this.state.isShowingHint = false;
        this.mirrorSystem.clearHighlights();
      }
      this.notifyStateChange();
    }
  };

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange();
    }
  }
}
