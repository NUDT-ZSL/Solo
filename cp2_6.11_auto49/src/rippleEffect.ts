import * as THREE from 'three';

interface Ripple {
  id: number;
  rings: THREE.Mesh[];
  startTime: number;
  duration: number;
  center: THREE.Vector3;
  color: THREE.Color;
  maxRadius: number;
}

export class RippleEffect {
  private scene: THREE.Scene;
  private ripples: Ripple[] = [];
  private rippleIdCounter: number = 0;
  private readonly RING_COUNT = 30;
  private readonly MAX_RADIUS = 200;
  private readonly DURATION = 1500;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  trigger(position: THREE.Vector3, baseColor: THREE.Color): void {
    const rings: THREE.Mesh[] = [];
    const complementaryColor = new THREE.Color(
      1 - baseColor.r,
      1 - baseColor.g,
      1 - baseColor.b
    );

    for (let i = 0; i < this.RING_COUNT; i++) {
      const innerRadius = (i / this.RING_COUNT) * 10;
      const outerRadius = innerRadius + 2;

      const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: complementaryColor,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false
      });

      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(position.x, 0.5, position.z);
      ring.renderOrder = 10;

      this.scene.add(ring);
      rings.push(ring);
    }

    const ripple: Ripple = {
      id: this.rippleIdCounter++,
      rings,
      startTime: performance.now(),
      duration: this.DURATION,
      center: position.clone(),
      color: complementaryColor,
      maxRadius: this.MAX_RADIUS
    };

    this.ripples.push(ripple);
  }

  update(): RippleImpact[] {
    const impacts: RippleImpact[] = [];
    const now = performance.now();
    const activeRipples: Ripple[] = [];

    for (const ripple of this.ripples) {
      const elapsed = now - ripple.startTime;
      const progress = elapsed / ripple.duration;

      if (progress >= 1) {
        this.cleanupRipple(ripple);
        continue;
      }

      activeRipples.push(ripple);

      const currentRadius = progress * ripple.maxRadius;
      const fadeStart = 0.3;
      let opacity: number;

      if (progress < fadeStart) {
        opacity = (progress / fadeStart) * 0.4;
      } else {
        opacity = ((1 - progress) / (1 - fadeStart)) * 0.4;
      }

      for (let i = 0; i < ripple.rings.length; i++) {
        const ring = ripple.rings[i];
        const ringPhase = (i / ripple.rings.length);
        const ringRadius = currentRadius * (0.5 + ringPhase * 0.5);

        const scale = ringRadius / Math.max(10 * (i / ripple.rings.length + 0.1), 0.1);
        ring.scale.setScalar(Math.max(scale, 0.01));

        const material = ring.material as THREE.MeshBasicMaterial;
        const ringOpacity = opacity * (1 - ringPhase * 0.5);
        material.opacity = Math.max(0, Math.min(ringOpacity, 1));
      }

      const leadingEdge = currentRadius;
      const trailingEdge = Math.max(0, currentRadius - 30);

      impacts.push({
        center: ripple.center,
        innerRadius: trailingEdge,
        outerRadius: leadingEdge,
        color: ripple.color,
        progress
      });
    }

    this.ripples = activeRipples;
    return impacts;
  }

  private cleanupRipple(ripple: Ripple): void {
    for (const ring of ripple.rings) {
      this.scene.remove(ring);
      ring.geometry.dispose();
      const material = ring.material as THREE.Material;
      material.dispose();
    }
  }

  destroy(): void {
    for (const ripple of this.ripples) {
      this.cleanupRipple(ripple);
    }
    this.ripples = [];
  }
}

export interface RippleImpact {
  center: THREE.Vector3;
  innerRadius: number;
  outerRadius: number;
  color: THREE.Color;
  progress: number;
}
