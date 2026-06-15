import * as THREE from 'three';
import { StageManager, LightBeam } from './stage';

export interface Keyframe {
  id: number;
  lightId: number;
  time: number;
  color: string;
  rotation: number;
  brightness: number;
  duration: number;
  element: HTMLElement | null;
}

export class TimelineManager {
  stage: StageManager;
  trackElement: HTMLElement;
  scanlineElement: HTMLElement;
  keyframes: Keyframe[] = [];

  isPlaying: boolean = false;
  currentTime: number = 0;
  private lastFrameTime: number = 0;
  private nextKeyframeId: number = 0;
  private triggeredFrames: Set<number> = new Set();

  private readonly TIMELINE_DURATION: number = 10000;

  constructor(
    stage: StageManager,
    trackElement: HTMLElement,
    scanlineElement: HTMLElement
  ) {
    this.stage = stage;
    this.trackElement = trackElement;
    this.scanlineElement = scanlineElement;
  }

  addKeyframe(
    lightId: number,
    time: number,
    color: string,
    rotation: number,
    brightness: number,
    duration: number
  ): Keyframe {
    const keyframe: Keyframe = {
      id: this.nextKeyframeId++,
      lightId,
      time,
      color,
      rotation,
      brightness,
      duration,
      element: null
    };

    this.keyframes.push(keyframe);
    this.keyframes.sort((a, b) => a.time - b.time);
    this.renderKeyframes();

    return keyframe;
  }

  removeKeyframe(id: number): void {
    const idx = this.keyframes.findIndex(k => k.id === id);
    if (idx >= 0) {
      if (this.keyframes[idx].element) {
        this.keyframes[idx].element!.remove();
      }
      this.keyframes.splice(idx, 1);
      this.triggeredFrames.delete(id);
    }
  }

  updateKeyframe(
    id: number,
    updates: Partial<Pick<Keyframe, 'time' | 'color' | 'rotation' | 'brightness' | 'duration'>>
  ): void {
    const kf = this.keyframes.find(k => k.id === id);
    if (!kf) return;

    if (updates.time !== undefined) kf.time = updates.time;
    if (updates.color !== undefined) kf.color = updates.color;
    if (updates.rotation !== undefined) kf.rotation = updates.rotation;
    if (updates.brightness !== undefined) kf.brightness = updates.brightness;
    if (updates.duration !== undefined) kf.duration = updates.duration;

    this.keyframes.sort((a, b) => a.time - b.time);
    this.renderKeyframes();
  }

  getKeyframe(id: number): Keyframe | undefined {
    return this.keyframes.find(k => k.id === id);
  }

  getKeyframesForLight(lightId: number): Keyframe[] {
    return this.keyframes.filter(k => k.lightId === lightId);
  }

  private renderKeyframes(): void {
    const existing = this.trackElement.querySelectorAll('.keyframe');
    existing.forEach(el => el.remove());

    const trackWidth = this.trackElement.clientWidth;

    for (const kf of this.keyframes) {
      const el = document.createElement('div');
      el.className = 'keyframe';
      el.style.background = kf.color;
      el.style.boxShadow = `0 0 8px ${kf.color}`;
      el.style.left = `${(kf.time / this.TIMELINE_DURATION) * 100}%`;
      el.dataset.id = String(kf.id);

      this.trackElement.appendChild(el);
      kf.element = el;
    }
  }

  play(): void {
    this.isPlaying = true;
    this.lastFrameTime = performance.now();
  }

  pause(): void {
    this.isPlaying = false;
  }

  toggle(): boolean {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
    return this.isPlaying;
  }

  reset(): void {
    this.currentTime = 0;
    this.triggeredFrames.clear();
    this.updateScanline();
  }

  private updateScanline(): void {
    const trackWidth = this.trackElement.clientWidth;
    const percent = Math.min(100, (this.currentTime / this.TIMELINE_DURATION) * 100);
    this.scanlineElement.style.left = `${percent}%`;
  }

  getActiveLightId(): number | null {
    const lights = Array.from(this.stage.lights.values());
    if (lights.length === 0) return null;
    return lights[lights.length - 1].id;
  }

  getTimelineDuration(): number {
    return this.TIMELINE_DURATION;
  }

  getTimeAtPosition(clientX: number): number {
    const rect = this.trackElement.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const time = (x / rect.width) * this.TIMELINE_DURATION;
    return Math.round(time / 50) * 50;
  }

  update(): void {
    if (!this.isPlaying) return;

    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.currentTime += delta;

    if (this.currentTime >= this.TIMELINE_DURATION) {
      this.currentTime = this.currentTime % this.TIMELINE_DURATION;
      this.triggeredFrames.clear();
    }

    this.updateScanline();
    this.checkKeyframes();
  }

  private checkKeyframes(): void {
    for (const kf of this.keyframes) {
      if (this.triggeredFrames.has(kf.id)) continue;

      if (this.currentTime >= kf.time) {
        this.triggerKeyframe(kf);
        this.triggeredFrames.add(kf.id);
      }
    }
  }

  private triggerKeyframe(kf: Keyframe): void {
    const light = this.stage.lights.get(kf.lightId);
    if (!light) return;

    const targetColor = new THREE.Color(kf.color);
    const targetRotation = (kf.rotation * Math.PI) / 180;
    const targetOpacity = kf.brightness / 100;

    this.stage.animateLight(
      kf.lightId,
      targetColor,
      targetRotation,
      targetOpacity,
      kf.duration
    );
  }

  findKeyframeAtPosition(clientX: number, clientY: number): Keyframe | null {
    for (const kf of this.keyframes) {
      if (!kf.element) continue;
      const rect = kf.element.getBoundingClientRect();
      if (
        clientX >= rect.left - 5 &&
        clientX <= rect.right + 5 &&
        clientY >= rect.top - 10 &&
        clientY <= rect.bottom + 10
      ) {
        return kf;
      }
    }
    return null;
  }
}
