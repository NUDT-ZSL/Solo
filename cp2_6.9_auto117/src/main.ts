import './style.css';
import { AudioManager } from './audio.js';
import {
  Renderer,
  Lens,
  Switch,
  BeamSegment,
  Vec2,
  RenderState,
  createInitialLenses,
  createInitialSwitches
} from './renderer.js';

const CANVAS_W = 900;
const CANVAS_H = 600;
const LIGHT_SOURCE: Vec2 = { x: 60, y: 60 };
const MIN_FOCAL = 50;
const MAX_FOCAL = 150;
const MIN_DEFLECTION = 5;
const MAX_DEFLECTION = 25;
const BEAM_DELAY = 100;
const SWITCH_HIT_DURATION = 1000;
const FPS_TARGET = 30;
const FRAME_INTERVAL = 1000 / FPS_TARGET;

class GameApp {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private audioManager: AudioManager;
  private lenses: Lens[];
  private switches: Switch[];
  private currentBeamSegments: BeamSegment[] = [];
  private pendingBeamSegments: BeamSegment[] = [];
  private lastBeamUpdateTime: number = 0;
  private draggingLens: Lens | null = null;
  private dragOffset: Vec2 = { x: 0, y: 0 };
  private isRecording: boolean = false;
  private lastFrameTime: number = 0;

  private victoryRingActive: boolean = false;
  private victoryRingStartTime: number = 0;
  private victoryShown: boolean = false;

  private statusText: HTMLElement;
  private recordBtn: HTMLElement;
  private recordIcon: HTMLElement;
  private recordText: HTMLElement;
  private resetBtn: HTMLElement;
  private frequencyBar: HTMLElement;
  private frequencyValue: HTMLElement;

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('找不到Canvas元素');
    this.canvas = canvas;

    this.renderer = new Renderer(canvas);
    this.audioManager = new AudioManager();
    this.lenses = createInitialLenses();
    this.switches = createInitialSwitches();

    this.statusText = document.getElementById('status-text')!;
    this.recordBtn = document.getElementById('record-btn')!;
    this.recordIcon = document.getElementById('record-icon')!;
    this.recordText = document.getElementById('record-text')!;
    this.resetBtn = document.getElementById('reset-btn')!;
    this.frequencyBar = document.getElementById('frequency-bar')!;
    this.frequencyValue = document.getElementById('frequency-value')!;

    this.bindEvents();
    this.updateBeamPath();
    this.currentBeamSegments = this.computeBeamPath();
    this.lastBeamUpdateTime = performance.now();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.onMouseUp());

    this.recordBtn.addEventListener('click', () => this.toggleRecording());
    this.resetBtn.addEventListener('click', () => this.resetGame());

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.toggleRecording();
      }
    });
  }

  private getCanvasCoords(e: MouseEvent): Vec2 {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  private onMouseDown(e: MouseEvent): void {
    const pos = this.getCanvasCoords(e);
    for (let i = this.lenses.length - 1; i >= 0; i--) {
      const lens = this.lenses[i];
      const dx = pos.x - lens.pos.x;
      const dy = pos.y - lens.pos.y;
      if (dx * dx + dy * dy <= lens.radius * lens.radius) {
        lens.isDragging = true;
        this.draggingLens = lens;
        this.dragOffset = { x: dx, y: dy };
        this.canvas.style.cursor = 'grabbing';
        break;
      }
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const pos = this.getCanvasCoords(e);
    if (this.draggingLens) {
      const newX = pos.x - this.dragOffset.x;
      const newY = pos.y - this.dragOffset.y;
      this.draggingLens.pos.x = Math.max(
        this.draggingLens.radius,
        Math.min(CANVAS_W - this.draggingLens.radius, newX)
      );
      this.draggingLens.pos.y = Math.max(
        this.draggingLens.radius,
        Math.min(CANVAS_H - this.draggingLens.radius, newY)
      );
    } else {
      let hovering = false;
      for (const lens of this.lenses) {
        const dx = pos.x - lens.pos.x;
        const dy = pos.y - lens.pos.y;
        if (dx * dx + dy * dy <= lens.radius * lens.radius) {
          hovering = true;
          break;
        }
      }
      this.canvas.style.cursor = hovering ? 'grab' : 'default';
    }
  }

  private onMouseUp(): void {
    if (this.draggingLens) {
      this.draggingLens.isDragging = false;
      this.draggingLens = null;
      this.canvas.style.cursor = 'default';
    }
  }

  private async toggleRecording(): Promise<void> {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      const success = await this.audioManager.startRecording();
      if (success) {
        this.isRecording = true;
        this.recordBtn.classList.add('recording');
        this.recordText.textContent = '停止';
        this.recordIcon.textContent = '■';
      }
    }
  }

  private stopRecording(): void {
    this.audioManager.stopRecording();
    this.isRecording = false;
    this.recordBtn.classList.remove('recording');
    this.recordText.textContent = '录音';
    this.recordIcon.textContent = '●';
    this.frequencyBar.classList.remove('active');
    this.frequencyBar.style.setProperty('--freq-height', '0%');
    this.frequencyValue.textContent = '-- Hz';
  }

  private resetGame(): void {
    this.lenses = createInitialLenses();
    this.switches = createInitialSwitches();
    this.victoryRingActive = false;
    this.victoryRingStartTime = 0;
    this.victoryShown = false;
    this.statusText.textContent = '调整透镜位置和声音频率，激活所有光敏开关';
    this.updateBeamPath();
    this.currentBeamSegments = this.computeBeamPath();
  }

  private freqToFocal(freq: number | null): number {
    if (freq === null) return (MIN_FOCAL + MAX_FOCAL) / 2;
    const minF = this.audioManager.getMinFreq();
    const maxF = this.audioManager.getMaxFreq();
    const t = (freq - minF) / (maxF - minF);
    return MIN_FOCAL + Math.max(0, Math.min(1, t)) * (MAX_FOCAL - MIN_FOCAL);
  }

  private focalToDeflection(focal: number): number {
    const t = (focal - MIN_FOCAL) / (MAX_FOCAL - MIN_FOCAL);
    return (MIN_DEFLECTION + (1 - t) * (MAX_DEFLECTION - MIN_DEFLECTION)) * (Math.PI / 180);
  }

  private lineCircleIntersect(
    p1: Vec2, p2: Vec2, center: Vec2, radius: number
  ): Vec2 | null {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const fx = p1.x - center.x;
    const fy = p1.y - center.y;
    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - radius * radius;
    let discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;
    discriminant = Math.sqrt(discriminant);
    const t1 = (-b - discriminant) / (2 * a);
    const t2 = (-b + discriminant) / (2 * a);
    let t = t1;
    if (t < 0.001 || t > 1) t = t2;
    if (t < 0.001 || t > 1) return null;
    return { x: p1.x + t * dx, y: p1.y + t * dy };
  }

  private lineRectIntersect(
    p1: Vec2, p2: Vec2, rect: { x: number; y: number; w: number; h: number }
  ): Vec2 | null {
    const edges: [Vec2, Vec2][] = [
      [{ x: rect.x, y: rect.y }, { x: rect.x + rect.w, y: rect.y }],
      [{ x: rect.x + rect.w, y: rect.y }, { x: rect.x + rect.w, y: rect.y + rect.h }],
      [{ x: rect.x + rect.w, y: rect.y + rect.h }, { x: rect.x, y: rect.y + rect.h }],
      [{ x: rect.x, y: rect.y + rect.h }, { x: rect.x, y: rect.y }]
    ];
    let nearest: Vec2 | null = null;
    let nearestDist = Infinity;
    for (const [e1, e2] of edges) {
      const pt = this.lineLineIntersect(p1, p2, e1, e2);
      if (pt) {
        const d = (pt.x - p1.x) ** 2 + (pt.y - p1.y) ** 2;
        if (d < nearestDist) {
          nearestDist = d;
          nearest = pt;
        }
      }
    }
    return nearest;
  }

  private lineLineIntersect(p1: Vec2, p2: Vec2, p3: Vec2, p4: Vec2): Vec2 | null {
    const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
    if (Math.abs(denom) < 0.0001) return null;
    const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
    const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;
    if (ua < 0 || ua > 1 || ub < 0 || ub > 1) return null;
    return { x: p1.x + ua * (p2.x - p1.x), y: p1.y + ua * (p2.y - p1.y) };
  }

  private segmentOverlapArea(
    segStart: Vec2, segEnd: Vec2, rect: { x: number; y: number; w: number; h: number }
  ): number {
    const halfThickness = 4;
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const dx = segEnd.x - segStart.x;
    const dy = segEnd.y - segStart.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.001) return 0;
    const nx = -dy / len;
    const ny = dx / len;
    const dist = Math.abs(nx * (cx - segStart.x) + ny * (cy - segStart.y));
    if (dist > halfThickness + Math.max(rect.w, rect.h) / 2) return 0;
    let tMin = Infinity, tMax = -Infinity;
    const corners = [
      { x: rect.x, y: rect.y },
      { x: rect.x + rect.w, y: rect.y },
      { x: rect.x + rect.w, y: rect.y + rect.h },
      { x: rect.x, y: rect.y + rect.h }
    ];
    const dirX = dx / len, dirY = dy / len;
    for (const corner of corners) {
      const t = (corner.x - segStart.x) * dirX + (corner.y - segStart.y) * dirY;
      tMin = Math.min(tMin, t);
      tMax = Math.max(tMax, t);
    }
    tMin = Math.max(0, tMin);
    tMax = Math.min(len, tMax);
    if (tMax <= tMin) return 0;
    const overlapLen = tMax - tMin;
    const effectiveW = Math.max(0, halfThickness * 2 - dist);
    const overlapArea = overlapLen * effectiveW;
    const rectArea = rect.w * rect.h;
    return Math.min(1, overlapArea / rectArea);
  }

  private computeBeamPath(): BeamSegment[] {
    const segments: BeamSegment[] = [];
    let currentPos: Vec2 = { ...LIGHT_SOURCE };
    let angle = Math.atan2(300 - LIGHT_SOURCE.y, 450 - LIGHT_SOURCE.x);
    let refracted = false;
    let hitLenses: Set<number> = new Set();

    for (let bounce = 0; bounce < 5; bounce++) {
      const farPoint: Vec2 = {
        x: currentPos.x + Math.cos(angle) * 2000,
        y: currentPos.y + Math.sin(angle) * 2000
      };

      let nearestIntersect: Vec2 | null = null;
      let nearestLens: Lens | null = null;
      let nearestDist = Infinity;
      let nearestSwitch: Switch | null = null;

      for (const lens of this.lenses) {
        if (hitLenses.has(lens.id)) continue;
        const hit = this.lineCircleIntersect(currentPos, farPoint, lens.pos, lens.radius);
        if (hit) {
          const d = (hit.x - currentPos.x) ** 2 + (hit.y - currentPos.y) ** 2;
          if (d > 1 && d < nearestDist) {
            nearestDist = d;
            nearestIntersect = hit;
            nearestLens = lens;
          }
        }
      }

      for (const sw of this.switches) {
        const rect = {
          x: sw.pos.x - sw.width / 2,
          y: sw.pos.y - sw.height / 2,
          w: sw.width,
          h: sw.height
        };
        const hit = this.lineRectIntersect(currentPos, farPoint, rect);
        if (hit) {
          const d = (hit.x - currentPos.x) ** 2 + (hit.y - currentPos.y) ** 2;
          if (d > 1 && d < nearestDist) {
            nearestDist = d;
            nearestIntersect = hit;
            nearestLens = null;
            nearestSwitch = sw;
          }
        }
      }

      let endPoint: Vec2;
      if (nearestIntersect) {
        endPoint = nearestIntersect;
      } else {
        const clampedFar: Vec2 = {
          x: Math.max(-50, Math.min(CANVAS_W + 50, farPoint.x)),
          y: Math.max(-50, Math.min(CANVAS_H + 50, farPoint.y))
        };
        if (clampedFar.x < 0 || clampedFar.x > CANVAS_W || clampedFar.y < 0 || clampedFar.y > CANVAS_H) {
          endPoint = this.clipToCanvas(currentPos, farPoint);
        } else {
          endPoint = clampedFar;
        }
      }

      segments.push({ start: { ...currentPos }, end: { ...endPoint }, refracted });

      if (nearestLens) {
        hitLenses.add(nearestLens.id);
        const deflection = this.focalToDeflection(nearestLens.focalLength);
        angle += deflection;
        currentPos = {
          x: endPoint.x + Math.cos(angle) * 2,
          y: endPoint.y + Math.sin(angle) * 2
        };
        refracted = true;
      } else if (nearestSwitch) {
        break;
      } else {
        break;
      }
    }

    return segments;
  }

  private clipToCanvas(p1: Vec2, p2: Vec2): Vec2 {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    let t = 1;
    if (dx !== 0) {
      if (p2.x < 0) t = Math.min(t, (0 - p1.x) / dx);
      if (p2.x > CANVAS_W) t = Math.min(t, (CANVAS_W - p1.x) / dx);
    }
    if (dy !== 0) {
      if (p2.y < 0) t = Math.min(t, (0 - p1.y) / dy);
      if (p2.y > CANVAS_H) t = Math.min(t, (CANVAS_H - p1.y) / dy);
    }
    return { x: p1.x + t * dx, y: p1.y + t * dy };
  }

  private updateBeamPath(): void {
    this.pendingBeamSegments = this.computeBeamPath();
  }

  private checkSwitchHits(currentTime: number): void {
    for (const sw of this.switches) {
      if (sw.activated) continue;

      const rect = {
        x: sw.pos.x - sw.width / 2,
        y: sw.pos.y - sw.height / 2,
        w: sw.width,
        h: sw.height
      };

      let isHit = false;
      for (const seg of this.currentBeamSegments) {
        const overlap = this.segmentOverlapArea(seg.start, seg.end, rect);
        if (overlap >= 0.5) {
          isHit = true;
          break;
        }
      }

      if (isHit) {
        if (sw.hitStartTime === 0) {
          sw.hitStartTime = currentTime;
          sw.flashing = true;
          sw.flashStartTime = currentTime;
        } else if (currentTime - sw.hitStartTime >= SWITCH_HIT_DURATION) {
          sw.activated = true;
          sw.flashing = false;
          sw.hitStartTime = 0;
          sw.scaleAnimStart = currentTime;
        }
      } else {
        if (sw.flashing) {
          sw.flashing = false;
        }
        sw.hitStartTime = 0;
      }
    }
  }

  private checkVictory(currentTime: number): void {
    const allActivated = this.switches.every(s => s.activated);
    if (allActivated && !this.victoryShown) {
      this.victoryShown = true;
      this.victoryRingActive = true;
      this.victoryRingStartTime = currentTime;
      this.statusText.textContent = '谜题完成！';
    }
    if (this.victoryRingActive && currentTime - this.victoryRingStartTime > 2000) {
      this.victoryRingActive = false;
    }
  }

  private updateFrequencyDisplay(freq: number | null): void {
    if (freq !== null) {
      this.frequencyBar.classList.add('active');
      const minF = this.audioManager.getMinFreq();
      const maxF = this.audioManager.getMaxFreq();
      const pct = Math.max(0, Math.min(100, ((freq - minF) / (maxF - minF)) * 100));
      this.frequencyBar.style.setProperty('--freq-height', `${pct}%`);
      this.frequencyValue.textContent = `${freq} Hz`;
    } else {
      this.frequencyBar.classList.remove('active');
      this.frequencyBar.style.setProperty('--freq-height', '0%');
      this.frequencyValue.textContent = '-- Hz';
    }
  }

  private updateLensesFromFrequency(freq: number | null): void {
    const focal = this.freqToFocal(freq);
    for (const lens of this.lenses) {
      lens.focalLength = focal;
    }
  }

  start(): void {
    this.lastFrameTime = performance.now();
    this.loop();
  }

  private loop = (): void => {
    requestAnimationFrame(this.loop);
    const now = performance.now();
    const elapsed = now - this.lastFrameTime;
    if (elapsed < FRAME_INTERVAL) return;
    this.lastFrameTime = now - (elapsed % FRAME_INTERVAL);

    const freq = this.isRecording ? this.audioManager.getFrequency() : null;
    this.updateFrequencyDisplay(freq);
    this.updateLensesFromFrequency(freq);

    if (now - this.lastBeamUpdateTime >= BEAM_DELAY) {
      this.updateBeamPath();
      this.currentBeamSegments = this.pendingBeamSegments;
      this.lastBeamUpdateTime = now;
    }

    this.checkSwitchHits(now);
    this.checkVictory(now);

    const renderState: RenderState = {
      lenses: this.lenses,
      switches: this.switches,
      beamSegments: this.currentBeamSegments,
      lightSource: LIGHT_SOURCE,
      victoryRingActive: this.victoryRingActive,
      victoryRingStartTime: this.victoryRingStartTime,
      currentTime: now,
      switchActivatedFlags: this.switches.map(s => s.activated),
      allSwitchesActivated: this.switches.every(s => s.activated)
    };

    this.renderer.render(renderState);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    const app = new GameApp();
    app.start();
  } catch (err) {
    console.error('应用初始化失败:', err);
  }
});
