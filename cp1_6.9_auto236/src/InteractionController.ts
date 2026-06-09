import * as THREE from 'three';
import { PrismArray } from './PrizmArray';
import { ParticleSystem } from './ParticleSystem';

export interface CameraState {
  yaw: number;
  pitch: number;
  distance: number;
  target: THREE.Vector3;
}

interface VelocityState {
  yaw: number;
  pitch: number;
  distance: number;
}

export class InteractionController {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private prismArray: PrismArray;
  private particleSystem: ParticleSystem;
  private pulseRing: HTMLDivElement | null = null;

  private state: CameraState = {
    yaw: 0.3,
    pitch: 0.15,
    distance: 18,
    target: new THREE.Vector3(0, 0, 0)
  };

  private defaultState: CameraState = {
    yaw: 0.3,
    pitch: 0.15,
    distance: 18,
    target: new THREE.Vector3(0, 0, 0)
  };

  private velocity: VelocityState = {
    yaw: 0,
    pitch: 0,
    distance: 0
  };

  private readonly dampDuration = 0.6;
  private readonly minDistance = 2;
  private readonly maxDistance = 25;
  private readonly minPitch = -Math.PI / 6;
  private readonly maxPitch = Math.PI / 6;

  private isDragging = false;
  private lastX = 0;
  private lastY = 0;
  private lastInteractionTime = 0;

  private onPulseCallback: (() => void) | null = null;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    prismArray: PrismArray,
    particleSystem: ParticleSystem
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.prismArray = prismArray;
    this.particleSystem = particleSystem;

    this.createPulseRing();
    this.bindEvents();
    this.applyCameraState();
  }

  private createPulseRing(): void {
    this.pulseRing = document.createElement('div');
    this.pulseRing.className = 'pulse-ring';
    this.domElement.appendChild(this.pulseRing);
  }

  private bindEvents(): void {
    const el = this.domElement;

    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointerleave', this.onPointerUp);
    el.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKeyDown);
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    this.isDragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.velocity = { yaw: 0, pitch: 0, distance: 0 };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.isDragging) return;

    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;

    const width = this.domElement.clientWidth || window.innerWidth;
    const height = this.domElement.clientHeight || window.innerHeight;

    const deltaYaw = (dx / width) * Math.PI * 2 * 0.5;
    const deltaPitch = (dy / height) * Math.PI * 0.5;

    this.velocity.yaw = deltaYaw / Math.max(0.001, (performance.now() - this.lastInteractionTime) / 1000);
    this.velocity.pitch = deltaPitch / Math.max(0.001, (performance.now() - this.lastInteractionTime) / 1000);

    this.state.yaw += deltaYaw;
    this.state.pitch += deltaPitch;

    this.state.pitch = Math.max(
      this.minPitch,
      Math.min(this.maxPitch, this.state.pitch)
    );

    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.lastInteractionTime = performance.now();
  };

  private onPointerUp = (e: PointerEvent): void => {
    this.isDragging = false;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();

    const delta = -e.deltaY * 0.01;
    const oldDistance = this.state.distance;
    this.state.distance *= 1 + delta * 0.15;
    this.state.distance = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.state.distance)
    );

    const actualDelta = this.state.distance - oldDistance;
    this.velocity.distance = actualDelta / 0.016;
    this.lastInteractionTime = performance.now();
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Space') {
      e.preventDefault();
      this.triggerPulse();
    }
  };

  public triggerPulse(): void {
    this.prismArray.triggerPulse();
    this.particleSystem.triggerPulse();
    this.animatePulseRing();

    if (this.onPulseCallback) {
      this.onPulseCallback();
    }
  }

  private animatePulseRing(): void {
    if (!this.pulseRing) return;

    const ring = this.pulseRing;
    const maxRadius = Math.max(window.innerWidth, window.innerHeight) * 1.2;
    const startTime = performance.now();
    const duration = 1200;

    const animate = (): void => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      const currentRadius = eased * maxRadius;
      const opacity = 1 - progress;
      const hue = (progress * 360) % 360;

      ring.style.width = `${currentRadius * 2}px`;
      ring.style.height = `${currentRadius * 2}px`;
      ring.style.transform = `translate(-50%, -50%)`;
      ring.style.border = `4px solid hsla(${hue}, 100%, 70%, ${opacity * 0.7})`;
      ring.style.boxShadow = `0 0 60px hsla(${hue}, 100%, 70%, ${opacity * 0.5})`;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        ring.style.width = '0px';
        ring.style.height = '0px';
        ring.style.border = 'none';
        ring.style.boxShadow = 'none';
      }
    };

    requestAnimationFrame(animate);
  }

  public setOnPulseCallback(callback: () => void): void {
    this.onPulseCallback = callback;
  }

  public resetView(): void {
    this.state = {
      yaw: this.defaultState.yaw,
      pitch: this.defaultState.pitch,
      distance: this.defaultState.distance,
      target: this.defaultState.target.clone()
    };
    this.velocity = { yaw: 0, pitch: 0, distance: 0 };
  }

  public update(deltaTime: number): void {
    const dampFactor = deltaTime / this.dampDuration;

    if (!this.isDragging) {
      if (Math.abs(this.velocity.yaw) > 0.0001) {
        this.state.yaw += this.velocity.yaw * dampFactor * 0.1;
        this.velocity.yaw *= 0.96;
      } else {
        this.velocity.yaw = 0;
      }

      if (Math.abs(this.velocity.pitch) > 0.0001) {
        this.state.pitch += this.velocity.pitch * dampFactor * 0.1;
        this.velocity.pitch *= 0.96;
      } else {
        this.velocity.pitch = 0;
      }

      if (Math.abs(this.velocity.distance) > 0.001) {
        this.state.distance += this.velocity.distance * dampFactor * 0.1;
        this.velocity.distance *= 0.96;
      } else {
        this.velocity.distance = 0;
      }
    }

    this.state.pitch = Math.max(
      this.minPitch,
      Math.min(this.maxPitch, this.state.pitch)
    );
    this.state.distance = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.state.distance)
    );

    this.applyCameraState();
  }

  private applyCameraState(): void {
    const { yaw, pitch, distance, target } = this.state;

    const cosPitch = Math.cos(pitch);
    const x = target.x + distance * Math.sin(yaw) * cosPitch;
    const y = target.y + distance * Math.sin(pitch);
    const z = target.z + distance * Math.cos(yaw) * cosPitch;

    this.camera.position.set(x, y, z);
    this.camera.lookAt(target);
  }

  public dispose(): void {
    const el = this.domElement;

    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('pointerleave', this.onPointerUp);
    el.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKeyDown);

    if (this.pulseRing && this.pulseRing.parentNode) {
      this.pulseRing.parentNode.removeChild(this.pulseRing);
    }
  }
}
