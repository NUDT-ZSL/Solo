import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OceanScene } from './oceanScene';
import { Creatures } from './creatures';

export interface ObservationLog {
  id: number;
  timestamp: Date;
  x: number;
  z: number;
  temperature: number;
  salinity: number;
}

interface Ripple {
  group: THREE.Group;
  startTime: number;
  position: THREE.Vector3;
}

export class InteractionManager {
  public controls: OrbitControls;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private oceanScene: OceanScene;
  private creatures: Creatures;

  private initialCameraPos: THREE.Vector3;
  private initialTarget: THREE.Vector3;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private ripples: Ripple[] = [];
  private ripplePool: Ripple[] = [];
  private readonly MAX_RIPPLES = 8;
  private readonly RIPPLE_DURATION = 4;

  public logs: ObservationLog[] = [];
  private readonly MAX_LOGS = 50;
  private logIdCounter = 0;

  private currentObservation: {
    x: number;
    z: number;
    temperature: number;
    salinity: number;
  } | null = null;

  private onLogUpdate?: (logs: ObservationLog[]) => void;
  private onObservationShow?: (data: {
    x: number;
    z: number;
    temperature: number;
    salinity: number;
  }) => void;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    oceanScene: OceanScene,
    creatures: Creatures
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.oceanScene = oceanScene;
    this.creatures = creatures;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.initialCameraPos = new THREE.Vector3(80, 60, 80);
    this.initialTarget = new THREE.Vector3(0, 5, 0);

    camera.position.copy(this.initialCameraPos);

    this.controls = new OrbitControls(camera, renderer.domElement);
    this.setupControls();
    this.bindEvents();
  }

  private setupControls(): void {
    this.controls.target.copy(this.initialTarget);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.screenSpacePanning = false;

    this.controls.minDistance = 20;
    this.controls.maxDistance = 200;

    this.controls.minPolarAngle = Math.PI / 2 - (60 * Math.PI) / 180;
    this.controls.maxPolarAngle = Math.PI / 2 + (30 * Math.PI) / 180;

    this.controls.enablePan = true;
    this.controls.panSpeed = 0.8;
    this.controls.rotateSpeed = 0.8;
    this.controls.zoomSpeed = 0.9;

    this.controls.update();
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));
  }

  private onDoubleClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersectTarget = new THREE.Vector3();
    let hitPoint: THREE.Vector3 | null = null;

    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 8);
    if (this.raycaster.ray.intersectPlane(groundPlane, intersectTarget)) {
      const half = 200;
      if (
        Math.abs(intersectTarget.x) < half &&
        Math.abs(intersectTarget.z) < half
      ) {
        hitPoint = intersectTarget.clone();
      }
    }

    if (!hitPoint) {
      const direction = this.raycaster.ray.direction.clone().multiplyScalar(80);
      hitPoint = this.raycaster.ray.origin.clone().add(direction);
      hitPoint.y = Math.max(-5, Math.min(40, hitPoint.y));
    }

    const terrainY = this.oceanScene.getTerrainHeight(hitPoint.x, hitPoint.z);
    const displayY = Math.max(terrainY + 0.1, hitPoint.y);

    this.createRipple(hitPoint.x, displayY, hitPoint.z);
    this.showObservationCard(hitPoint.x, hitPoint.z);
  }

  private createRipple(x: number, y: number, z: number): void {
    let ripple: Ripple;

    if (this.ripplePool.length > 0) {
      ripple = this.ripplePool.pop()!;
      ripple.group.visible = true;
      ripple.group.position.set(x, y, z);
      ripple.startTime = performance.now() / 1000;
      ripple.position.set(x, y, z);
    } else {
      const group = new THREE.Group();
      const baseRadius = 0.5;
      const colors = [0xffffff, 0xa8d5e2, 0x4a90d9];

      for (let i = 0; i < 3; i++) {
        const geo = new THREE.RingGeometry(
          baseRadius * (1 + i * 0.15),
          baseRadius * (1 + i * 0.15) + 0.08,
          64
        );
        const mat = new THREE.MeshBasicMaterial({
          color: colors[i],
          transparent: true,
          opacity: 0.7 - i * 0.15,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        });
        const ring = new THREE.Mesh(geo, mat);
        ring.rotation.x = -Math.PI / 2;
        ring.userData.ringIndex = i;
        group.add(ring);
      }

      group.position.set(x, y, z);
      this.scene.add(group);

      ripple = {
        group,
        startTime: performance.now() / 1000,
        position: new THREE.Vector3(x, y, z)
      };
    }

    this.ripples.push(ripple);

    while (this.ripples.length > this.MAX_RIPPLES) {
      const old = this.ripples.shift()!;
      old.group.visible = false;
      this.ripplePool.push(old);
    }
  }

  private showObservationCard(x: number, z: number): void {
    const temperature = 20 + Math.random() * 8;
    const salinity = 32 + Math.random() * 3;

    this.currentObservation = {
      x: Math.round(x * 100) / 100,
      z: Math.round(z * 100) / 100,
      temperature: Math.round(temperature * 100) / 100,
      salinity: Math.round(salinity * 100) / 100
    };

    if (this.onObservationShow) {
      this.onObservationShow(this.currentObservation);
    }
  }

  public recordObservation(): boolean {
    if (!this.currentObservation) return false;

    if (this.logs.length >= this.MAX_LOGS) {
      this.logs.pop();
    }

    const log: ObservationLog = {
      id: ++this.logIdCounter,
      timestamp: new Date(),
      x: this.currentObservation.x,
      z: this.currentObservation.z,
      temperature: this.currentObservation.temperature,
      salinity: this.currentObservation.salinity
    };

    this.logs.unshift(log);
    this.notifyLogUpdate();

    return true;
  }

  public deleteLog(id: number): boolean {
    const index = this.logs.findIndex((l) => l.id === id);
    if (index === -1) return false;

    this.logs.splice(index, 1);
    this.notifyLogUpdate();
    return true;
  }

  private notifyLogUpdate(): void {
    if (this.onLogUpdate) {
      this.onLogUpdate([...this.logs]);
    }
  }

  public setLogUpdateCallback(cb: (logs: ObservationLog[]) => void): void {
    this.onLogUpdate = cb;
    cb([...this.logs]);
  }

  public setObservationShowCallback(
    cb: (data: { x: number; z: number; temperature: number; salinity: number }) => void
  ): void {
    this.onObservationShow = cb;
  }

  public resetCamera(): void {
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const endPos = this.initialCameraPos.clone();
    const endTarget = this.initialTarget.clone();
    const duration = 800;
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const easeT = t * t * (3 - 2 * t);

      this.camera.position.lerpVectors(startPos, endPos, easeT);
      this.controls.target.lerpVectors(startTarget, endTarget, easeT);
      this.controls.update();

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  public update(delta: number, elapsed: number): void {
    this.controls.update();
    this.updateRipples(elapsed);
  }

  private updateRipples(elapsed: number): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      const age = elapsed - ripple.startTime;
      const progress = age / this.RIPPLE_DURATION;

      if (progress >= 1) {
        ripple.group.visible = false;
        this.ripplePool.push(this.ripples.splice(i, 1)[0]);
        continue;
      }

      const easeProgress = progress;
      const maxScale = 15;

      ripple.group.children.forEach((child, idx) => {
        const ring = child as THREE.Mesh;
        const delay = idx * 0.1;
        const ringProgress = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)));
        const scale = 1 + ringProgress * maxScale;
        ring.scale.setScalar(scale);

        const mat = ring.material as THREE.MeshBasicMaterial;
        mat.opacity = (0.7 - idx * 0.15) * (1 - ringProgress);
      });
    }
  }

  public dispose(): void {
    this.controls.dispose();
    this.ripples.forEach((r) => {
      r.group.children.forEach((child) => {
        const mesh = child as THREE.Mesh;
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      this.scene.remove(r.group);
    });
    this.ripplePool.forEach((r) => {
      r.group.children.forEach((child) => {
        const mesh = child as THREE.Mesh;
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      this.scene.remove(r.group);
    });
  }
}
