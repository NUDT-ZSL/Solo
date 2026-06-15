import * as THREE from 'three';
import { Part, usePartsStore } from '../store/partsStore';
import { audioController, computeSceneCenter } from './PartsEngine';

type EasingFn = (t: number) => number;
const easeOutCubic: EasingFn = (t) => 1 - Math.pow(1 - t, 3);
const easeInCubic: EasingFn = (t) => t * t * t;
const easeOutBack: EasingFn = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeOutQuart: EasingFn = (t) => 1 - Math.pow(1 - t, 4);

interface Tween {
  id: number;
  duration: number;
  elapsed: number;
  easing: EasingFn;
  update: (progress: number) => void;
  onComplete?: () => void;
}

export class AnimationController {
  private tweens: Map<number, Tween> = new Map();
  private tweenIdCounter = 0;
  private lastTime: number = performance.now();
  private running: boolean = false;
  private rafId: number | null = null;

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop() {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private loop = () => {
    if (!this.running) return;
    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.update(delta);
    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(delta: number) {
    const completed: number[] = [];
    this.tweens.forEach((tween, id) => {
      tween.elapsed += delta;
      const rawProgress = Math.min(tween.elapsed / tween.duration, 1);
      const easedProgress = tween.easing(rawProgress);
      tween.update(easedProgress);
      if (rawProgress >= 1) {
        completed.push(id);
        if (tween.onComplete) tween.onComplete();
      }
    });
    completed.forEach(id => this.tweens.delete(id));
  }

  addTween(
    duration: number,
    update: (progress: number) => void,
    easing: EasingFn = easeOutCubic,
    onComplete?: () => void
  ): number {
    const id = this.tweenIdCounter++;
    this.tweens.set(id, {
      id,
      duration,
      elapsed: 0,
      easing,
      update,
      onComplete,
    });
    if (!this.running) this.start();
    return id;
  }

  cancelTween(id: number) {
    this.tweens.delete(id);
  }

  animatePartTransform(
    partId: string,
    targetPos: THREE.Vector3,
    targetRot: THREE.Euler,
    targetScale?: THREE.Vector3,
    duration: number = 0.2,
    easing: EasingFn = easeOutCubic
  ): Promise<void> {
    const state = usePartsStore.getState();
    const part = state.parts.find(p => p.id === partId);
    if (!part) return Promise.resolve();

    const startPos = part.position.clone();
    const startRot = part.rotation.clone();
    const startScale = part.scale.clone();
    const endScale = targetScale || part.scale.clone();

    return new Promise((resolve) => {
      this.addTween(
        duration,
        (progress) => {
          const newPos = new THREE.Vector3().lerpVectors(startPos, targetPos, progress);
          const newRot = new THREE.Euler(
            startRot.x + (targetRot.x - startRot.x) * progress,
            startRot.y + (targetRot.y - startRot.y) * progress,
            startRot.z + (targetRot.z - startRot.z) * progress
          );
          const newScale = new THREE.Vector3().lerpVectors(startScale, endScale, progress);
          usePartsStore.getState().updatePart(partId, {
            position: newPos,
            rotation: newRot,
            scale: newScale,
          });
        },
        easing,
        resolve
      );
    });
  }

  animatePartBump(
    partId: string,
    duration: number = 0.2
  ): Promise<void> {
    const state = usePartsStore.getState();
    const part = state.parts.find(p => p.id === partId);
    if (!part) return Promise.resolve();

    const originalScale = part.scale.clone();
    const bumpScale = originalScale.clone().multiplyScalar(1.08);

    return new Promise((resolve) => {
      const halfDuration = duration / 2;
      this.addTween(
        halfDuration,
        (progress) => {
          const scale = new THREE.Vector3().lerpVectors(originalScale, bumpScale, progress);
          usePartsStore.getState().updatePart(partId, { scale });
        },
        easeOutCubic,
        () => {
          this.addTween(
            halfDuration,
            (progress) => {
              const scale = new THREE.Vector3().lerpVectors(bumpScale, originalScale, progress);
              usePartsStore.getState().updatePart(partId, { scale });
            },
            easeInCubic,
            resolve
          );
        }
      );
    });
  }

  async animateConnection(
    tenonId: string,
    mortiseId: string,
    tenonTargetPos: THREE.Vector3,
    tenonTargetRot: THREE.Euler
  ): Promise<void> {
    const store = usePartsStore.getState();
    store.setIsAnimating(true);

    const tenon = store.parts.find(p => p.id === tenonId);
    const mortise = store.parts.find(p => p.id === mortiseId);

    if (!tenon || !mortise) {
      store.setIsAnimating(false);
      return;
    }

    const snapDuration = 0.2;
    const tenonPromise = this.animatePartTransform(
      tenonId,
      tenonTargetPos,
      tenonTargetRot,
      undefined,
      snapDuration,
      easeOutBack
    );
    const bumpPromise = this.animatePartBump(mortiseId, 0.2);

    await Promise.all([tenonPromise, bumpPromise]);
    audioController.playWoodClack(0.25);
    store.setIsAnimating(false);
  }

  async animateDisassemblePart(
    partId: string,
    delay: number = 0
  ): Promise<void> {
    const store = usePartsStore.getState();
    const part = store.parts.find(p => p.id === partId);
    if (!part) return;

    await new Promise(resolve => setTimeout(resolve, delay * 1000));

    const allParts = usePartsStore.getState().parts;
    const center = computeSceneCenter(allParts);
    const direction = part.position.clone().sub(center);
    if (direction.length() < 0.1) {
      direction.set(
        (Math.random() - 0.5) * 2,
        0.2,
        (Math.random() - 0.5) * 2
      );
    }
    direction.normalize();

    const throwDistance = 2.5 + Math.random() * 1.5;
    const targetPos = part.position.clone().add(direction.multiplyScalar(throwDistance));
    targetPos.y = Math.max(targetPos.y + 0.5 + Math.random(), part.dimensions.height / 2);

    const targetRot = new THREE.Euler(
      part.rotation.x + (Math.random() - 0.5) * 0.8,
      part.rotation.y + (Math.random() - 0.5) * 1.5,
      part.rotation.z + (Math.random() - 0.5) * 0.4
    );

    audioController.playDisassembleSound(delay, 0.18);
    usePartsStore.getState().disassemblePart(partId);

    await this.animatePartTransform(
      partId,
      targetPos,
      targetRot,
      undefined,
      0.6,
      easeOutQuart
    );
  }

  async animateDisassembleChain(
    startPartId: string,
    interval: number = 0.3
  ): Promise<void> {
    const store = usePartsStore.getState();
    const order = store.getDisassemblyOrder(startPartId);

    if (order.length === 0) return;
    if (order.length === 1 && store.parts.find(p => p.id === order[0])?.connectedTo.length === 0) return;

    store.setIsAnimating(true);

    const promises: Promise<void>[] = [];
    for (let i = 0; i < order.length; i++) {
      const partId = order[i];
      const part = store.parts.find(p => p.id === partId);
      if (!part) continue;
      
      const hasConnections = part.connectedTo.length > 0;
      if (!hasConnections && i === 0) continue;
      
      const promise = this.animateDisassemblePart(partId, i * interval);
      promises.push(promise);
    }

    await Promise.all(promises);
    store.setIsAnimating(false);
  }

  async animateDisassembleAll(): Promise<void> {
    const store = usePartsStore.getState();
    const connectedParts = store.parts
      .filter(p => p.connectedTo.length > 0)
      .sort((a, b) => a.connectionOrder - b.connectionOrder);

    if (connectedParts.length === 0) return;

    store.setIsAnimating(true);

    const promises = connectedParts.map((part, index) => {
      return this.animateDisassemblePart(part.id, index * 0.3);
    });

    await Promise.all(promises);
    store.setIsAnimating(false);
  }

  animateCameraReset(): Promise<void> {
    const store = usePartsStore.getState();
    const defaultPos = new THREE.Vector3(8, 8, 8);
    const defaultTarget = new THREE.Vector3(0, 0, 0);
    const startPos = store.cameraPosition.clone();
    const startTarget = store.cameraTarget.clone();

    return new Promise((resolve) => {
      this.addTween(
        0.8,
        (progress) => {
          const newPos = new THREE.Vector3().lerpVectors(startPos, defaultPos, progress);
          const newTarget = new THREE.Vector3().lerpVectors(startTarget, defaultTarget, progress);
          usePartsStore.getState().setCameraPosition(newPos);
          usePartsStore.getState().setCameraTarget(newTarget);
        },
        easeOutQuart,
        resolve
      );
    });
  }

  async animateResetAll(): Promise<void> {
    const store = usePartsStore.getState();
    const allParts = [...store.parts];

    const promises = allParts.map((part, index) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const targetPos = part.position.clone().multiplyScalar(0.01);
          this.animatePartTransform(
            part.id,
            targetPos,
            part.rotation,
            new THREE.Vector3(0.01, 0.01, 0.01),
            0.4,
            easeInCubic,
          ).then(() => {
            usePartsStore.getState().removePart(part.id);
            resolve();
          });
        }, index * 30);
      });
    });

    await Promise.all(promises);
    usePartsStore.getState().resetAll();
  }
}

export const animationController = new AnimationController();
