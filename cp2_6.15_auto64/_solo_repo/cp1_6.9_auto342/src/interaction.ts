import * as THREE from 'three';
import { BubbleSystem } from './bubbleSystem';
import { ConnectionSystem } from './connectionSystem';

interface Ripple {
  center: THREE.Vector3;
  color: THREE.Color;
  startTime: number;
  duration: number;
  rings: THREE.Mesh[];
  affectedBubbles: Set<number>;
  maxRadius: number;
}

const RIPPLE_RING_COUNT = 20;
const RIPPLE_MAX_RADIUS = 50;
const RIPPLE_DURATION = 0.6;
const FOCUS_DISTANCE = 20;

export class InteractionSystem {
  public group: THREE.Group = new THREE.Group();

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private bubbleSystem: BubbleSystem;
  private connectionSystem: ConnectionSystem;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private pointer: THREE.Vector2 = new THREE.Vector2();

  private ripples: Ripple[] = [];
  private currentTime: number = 0;
  private focusedBubbleId: number | null = null;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    bubbleSystem: BubbleSystem,
    connectionSystem: ConnectionSystem
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.bubbleSystem = bubbleSystem;
    this.connectionSystem = connectionSystem;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('click', (event) => {
      this.updatePointer(event);
      this.handleClick();
    });

    canvas.addEventListener('pointermove', (event) => {
      this.updatePointer(event);
    });
  }

  private updatePointer(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handleClick(): void {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObject(this.bubbleSystem.instancedMesh);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const bubbleId = hit.instanceId;

      if (bubbleId !== undefined) {
        this.bubbleSystem.triggerClick(bubbleId);

        const bubble = this.bubbleSystem.bubbles[bubbleId];
        this.createRipple(bubble.position.clone(), bubble.color.clone());
      }
    }
  }

  private createRipple(center: THREE.Vector3, color: THREE.Color): void {
    const rings: THREE.Mesh[] = [];

    for (let i = 0; i < RIPPLE_RING_COUNT; i++) {
      const ringGeo = new THREE.RingGeometry(0.95, 1.05, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });

      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(center);
      ring.userData = { ringIndex: i };

      this.group.add(ring);
      rings.push(ring);
    }

    this.ripples.push({
      center,
      color,
      startTime: this.currentTime,
      duration: RIPPLE_DURATION,
      rings,
      affectedBubbles: new Set<number>(),
      maxRadius: RIPPLE_MAX_RADIUS
    });
  }

  private updateRipples(): void {
    for (let r = this.ripples.length - 1; r >= 0; r--) {
      const ripple = this.ripples[r];
      const elapsed = this.currentTime - ripple.startTime;
      const progress = Math.min(elapsed / ripple.duration, 1);

      let anyVisible = false;

      for (let i = 0; i < ripple.rings.length; i++) {
        const ring = ripple.rings[i];
        const mat = ring.material as THREE.MeshBasicMaterial;

        const ringProgress = Math.max(0, (progress - i * 0.02) / (1 - i * 0.02));
        const ringRadius = ringProgress * ripple.maxRadius;

        if (ringRadius > 0 && ringProgress <= 1) {
          ring.scale.setScalar(ringRadius);
          ring.visible = true;

          const alphaMultiplier = Math.sin(ringProgress * Math.PI);
          const baseAlpha = (1 - i / RIPPLE_RING_COUNT) * 0.8;
          mat.opacity = baseAlpha * alphaMultiplier;
          mat.color.copy(ripple.color).lerp(new THREE.Color(0x000000), ringProgress * 0.5);

          this.orientRingToCamera(ring);

          anyVisible = true;

          const nearbyIds = this.bubbleSystem.findBubblesInRadius(
            ripple.center,
            ringRadius + 2
          );

          for (const bid of nearbyIds) {
            if (!ripple.affectedBubbles.has(bid)) {
              const bubble = this.bubbleSystem.bubbles[bid];
              const dist = bubble.position.distanceTo(ripple.center);
              if (Math.abs(dist - ringRadius) < 3) {
                ripple.affectedBubbles.add(bid);
                this.bubbleSystem.triggerFlash(bid);
              }
            }
          }
        } else {
          ring.visible = false;
        }
      }

      if (!anyVisible) {
        for (const ring of ripple.rings) {
          this.group.remove(ring);
          ring.geometry.dispose();
          (ring.material as THREE.Material).dispose();
        }
        this.ripples.splice(r, 1);
      }
    }
  }

  private orientRingToCamera(ring: THREE.Mesh): void {
    const toCamera = new THREE.Vector3().subVectors(
      this.camera.position,
      ring.position
    ).normalize();

    ring.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      toCamera
    );
  }

  private updateFocus(): void {
    const cameraPos = this.camera.position;
    const targetPos = new THREE.Vector3();
    this.camera.getWorldDirection(targetPos);
    targetPos.multiplyScalar(FOCUS_DISTANCE * 1.5).add(cameraPos);

    let closestBubbleId: number | null = null;
    let closestDist = FOCUS_DISTANCE;

    for (const b of this.bubbleSystem.bubbles) {
      const distToCam = b.position.distanceTo(cameraPos);
      const distToTarget = b.position.distanceTo(targetPos);

      const effectiveDist = distToCam * 0.4 + distToTarget * 0.6;

      if (effectiveDist < closestDist) {
        closestDist = effectiveDist;
        closestBubbleId = b.id;
      }
    }

    if (closestBubbleId !== this.focusedBubbleId) {
      this.focusedBubbleId = closestBubbleId;

      if (closestBubbleId === null) {
        this.connectionSystem.clearFocus();
      } else {
        this.connectionSystem.setFocusConnections(closestBubbleId);
      }
    }
  }

  public update(deltaTime: number, currentTime: number): void {
    this.currentTime = currentTime;
    this.updateRipples();
    this.updateFocus();
  }

  public dispose(): void {
    for (const ripple of this.ripples) {
      for (const ring of ripple.rings) {
        ring.geometry.dispose();
        (ring.material as THREE.Material).dispose();
      }
    }
    this.ripples = [];
  }
}
