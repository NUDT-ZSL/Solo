import * as THREE from 'three';
import { LightsaberForge } from './forge';

interface TrailEntry {
  mesh: THREE.Mesh;
  opacity: number;
  birthTime: number;
  offset: THREE.Vector3;
}

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  initialScale: number;
}

export class WieldSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private saber: LightsaberForge;
  private container: HTMLElement;

  private isDragging: boolean = false;
  private mouse2D: THREE.Vector2;
  private raycaster: THREE.Raycaster;
  private targetPoint: THREE.Vector3;
  private saberBasePos: THREE.Vector3;
  private saberSmoothFactor: number = 0.95;

  private trails: TrailEntry[] = [];
  private particles: Particle[] = [];
  private maxTrails: number = 5;
  private maxParticles: number = 150;
  private trailInterval: number = 0.1;
  private lastTrailTime: number = 0;

  private lastMousePos: { x: number; y: number; time: number } | null = null;
  private mouseSpeed: number = 0;

  private plane: THREE.Plane;
  private tmpVec: THREE.Vector3;
  private tmpVec2: THREE.Vector3;

  private gridLines: THREE.Line[] = [];
  private gridLineCount: number = 15;

  public onMouseSpeedChange?: (speed: number) => void;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    saber: LightsaberForge,
    container: HTMLElement
  ) {
    this.scene = scene;
    this.camera = camera;
    this.saber = saber;
    this.container = container;

    this.mouse2D = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.targetPoint = new THREE.Vector3();
    this.saberBasePos = new THREE.Vector3(0, -0.5, 0);
    this.tmpVec = new THREE.Vector3();
    this.tmpVec2 = new THREE.Vector3();

    this.plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    this.setupEventListeners();
    this.setupGridLines();
  }

  private setupEventListeners(): void {
    this.container.addEventListener('mousedown', this.onMouseDown);
    this.container.addEventListener('mousemove', this.onMouseMove);
    this.container.addEventListener('mouseup', this.onMouseUp);
    this.container.addEventListener('mouseleave', this.onMouseUp);
    this.container.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.container.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.container.addEventListener('touchend', this.onTouchEnd);
  }

  private onMouseDown = (e: MouseEvent): void => {
    this.isDragging = true;
    this.updateMousePosition(e.clientX, e.clientY);
    this.lastMousePos = { x: e.clientX, y: e.clientY, time: performance.now() };
  };

  private onMouseMove = (e: MouseEvent): void => {
    this.updateMousePosition(e.clientX, e.clientY);

    if (this.lastMousePos) {
      const dx = e.clientX - this.lastMousePos.x;
      const dy = e.clientY - this.lastMousePos.y;
      const dt = (performance.now() - this.lastMousePos.time) / 1000;
      if (dt > 0) {
        this.mouseSpeed = Math.sqrt(dx * dx + dy * dy) / dt;
      }
      this.lastMousePos = { x: e.clientX, y: e.clientY, time: performance.now() };
    }

    if (this.onMouseSpeedChange) {
      this.onMouseSpeedChange(this.mouseSpeed);
    }
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
    this.lastMousePos = null;
    this.mouseSpeed = 0;
    if (this.onMouseSpeedChange) {
      this.onMouseSpeedChange(0);
    }
  };

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    const touch = e.touches[0];
    this.isDragging = true;
    this.updateMousePosition(touch.clientX, touch.clientY);
    this.lastMousePos = { x: touch.clientX, y: touch.clientY, time: performance.now() };
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    const touch = e.touches[0];
    this.updateMousePosition(touch.clientX, touch.clientY);

    if (this.lastMousePos) {
      const dx = touch.clientX - this.lastMousePos.x;
      const dy = touch.clientY - this.lastMousePos.y;
      const dt = (performance.now() - this.lastMousePos.time) / 1000;
      if (dt > 0) {
        this.mouseSpeed = Math.sqrt(dx * dx + dy * dy) / dt;
      }
      this.lastMousePos = { x: touch.clientX, y: touch.clientY, time: performance.now() };
    }

    if (this.onMouseSpeedChange) {
      this.onMouseSpeedChange(this.mouseSpeed);
    }
  };

  private onTouchEnd = (): void => {
    this.isDragging = false;
    this.lastMousePos = null;
    this.mouseSpeed = 0;
    if (this.onMouseSpeedChange) {
      this.onMouseSpeedChange(0);
    }
  };

  private updateMousePosition(clientX: number, clientY: number): void {
    const rect = this.container.getBoundingClientRect();
    this.mouse2D.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse2D.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse2D, this.camera);
    this.raycaster.ray.intersectPlane(this.plane, this.targetPoint);
  }

  private setupGridLines(): void {
    const bladeColor = this.saber.getColor();
    const complementColor = new THREE.Color(
      1 - bladeColor.r,
      1 - bladeColor.g,
      1 - bladeColor.b
    );

    for (let i = 0; i < this.gridLineCount; i++) {
      const points: THREE.Vector3[] = [];
      const angle = (i / this.gridLineCount) * Math.PI * 2 + Math.random() * 0.5;
      const innerRadius = 2 + Math.random() * 3;
      const outerRadius = 15 + Math.random() * 10;
      const yOffset = (Math.random() - 0.5) * 8;

      points.push(
        new THREE.Vector3(
          Math.cos(angle) * innerRadius,
          yOffset,
          Math.sin(angle) * innerRadius
        )
      );
      points.push(
        new THREE.Vector3(
          Math.cos(angle) * outerRadius,
          yOffset + (Math.random() - 0.5) * 3,
          Math.sin(angle) * outerRadius
        )
      );

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: complementColor,
        transparent: true,
        opacity: 0,
      });
      const line = new THREE.Line(geometry, material);
      (line as any).baseOpacity = 0.1 + Math.random() * 0.2;
      (line as any).flickerSpeed = 0.5 + Math.random() * 2;
      (line as any).phase = Math.random() * Math.PI * 2;
      this.gridLines.push(line);
      this.scene.add(line);
    }
  }

  public updateGridColor(): void {
    const bladeColor = this.saber.getColor();
    const complementColor = new THREE.Color(
      1 - bladeColor.r,
      1 - bladeColor.g,
      1 - bladeColor.b
    );
    this.gridLines.forEach((line) => {
      (line.material as THREE.LineBasicMaterial).color.copy(complementColor);
    });
  }

  private createTrail(offset: THREE.Vector3): void {
    if (this.trails.length >= this.maxTrails) {
      const oldest = this.trails.shift()!;
      this.scene.remove(oldest.mesh);
      oldest.mesh.geometry.dispose();
      (oldest.mesh.material as THREE.Material).dispose();
    }

    const bladeLength = this.saber.getBladeLength();
    const geometry = new THREE.CylinderGeometry(0.1, 0.1, bladeLength + 0.4, 16, 1, true);
    geometry.translate(0, bladeLength / 2 + 0.55, 0);

    const color = this.saber.getColor();
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(this.saber.group.position);
    mesh.position.add(offset);
    mesh.quaternion.copy(this.saber.group.quaternion);

    this.scene.add(mesh);

    this.trails.push({
      mesh,
      opacity: 0.6,
      birthTime: performance.now(),
      offset: offset.clone(),
    });
  }

  private emitParticles(count: number): void {
    const bladeLength = this.saber.getBladeLength();
    const tipWorld = new THREE.Vector3(0, bladeLength + 0.65, 0);
    this.saber.group.localToWorld(tipWorld);

    const saberDir = new THREE.Vector3(0, 1, 0);
    saberDir.applyQuaternion(this.saber.group.quaternion);

    const color = this.saber.getColor();

    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      const spreadAngle = (Math.random() - 0.5) * (Math.PI / 6);
      const spreadAxis = new THREE.Vector3(
        Math.random() - 0.5,
        0,
        Math.random() - 0.5
      ).normalize();

      const velocity = saberDir.clone();
      velocity.applyAxisAngle(spreadAxis, spreadAngle);
      const speed = 3 + Math.random() * 3;
      velocity.multiplyScalar(speed);

      const geometry = new THREE.SphereGeometry(0.08, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(tipWorld);

      this.scene.add(mesh);

      this.particles.push({
        mesh,
        velocity,
        life: 0.5 + Math.random() * 0.7,
        maxLife: 0.5 + Math.random() * 0.7,
        initialScale: 0.08,
      });
    }
  }

  public update(deltaTime: number): void {
    if (this.isDragging) {
      const currentPos = this.saber.group.position.clone();
      const desiredPos = this.saberBasePos.clone();
      desiredPos.lerp(this.targetPoint, 1 - this.saberSmoothFactor);

      const direction = new THREE.Vector3().subVectors(
        this.targetPoint,
        this.saber.group.position
      );
      direction.normalize();

      const up = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(
        up,
        direction
      );

      this.saber.group.position.lerp(desiredPos, 1 - this.saberSmoothFactor);
      this.saber.group.quaternion.slerp(quaternion, 1 - this.saberSmoothFactor);
    }

    this.saber.updateTipPosition();

    const now = performance.now();
    if (this.isDragging && this.mouseSpeed > 500 && now - this.lastTrailTime > this.trailInterval * 1000) {
      const perpOffset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        0,
        (Math.random() - 0.5) * 0.3
      );
      this.createTrail(perpOffset);
      this.lastTrailTime = now;
    }

    for (let i = this.trails.length - 1; i >= 0; i--) {
      const trail = this.trails[i];
      const age = (now - trail.birthTime) / 1000;
      const alpha = Math.max(0, 0.6 - age * 2.5);
      (trail.mesh.material as THREE.MeshBasicMaterial).opacity = alpha;

      if (alpha < 0.05) {
        this.scene.remove(trail.mesh);
        trail.mesh.geometry.dispose();
        (trail.mesh.material as THREE.Material).dispose();
        this.trails.splice(i, 1);
      }
    }

    if (this.isDragging && this.mouseSpeed > 500) {
      const emitCount = this.mouseSpeed > 800 ? 15 : 5;
      this.emitParticles(emitCount);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }

      p.velocity.y -= 0.8 * deltaTime;
      p.mesh.position.addScaledVector(p.velocity, deltaTime);

      const lifeRatio = p.life / p.maxLife;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = lifeRatio;
      const scale = p.initialScale * (0.25 + 0.75 * lifeRatio);
      p.mesh.scale.setScalar(scale);
    }

    this.gridLines.forEach((line: any) => {
      const mat = line.material as THREE.LineBasicMaterial;
      const flicker = Math.sin(now * 0.001 * line.flickerSpeed + line.phase);
      mat.opacity = Math.max(0, line.baseOpacity * (0.5 + 0.5 * flicker));
    });

    const lightIntensity = 0.3 + Math.min(0.9, this.mouseSpeed / 2000);
    this.saber.bladeLight.intensity = this.saber['currentParams'].glowIntensity * lightIntensity;
  }

  public reset(): void {
    this.saber.group.position.set(0, 0, 0);
    this.saber.group.quaternion.identity();
    this.saber.group.rotation.set(-0.3, 0.5, 0);
    this.saber.updateTipPosition();

    for (let i = this.trails.length - 1; i >= 0; i--) {
      this.scene.remove(this.trails[i].mesh);
      this.trails[i].mesh.geometry.dispose();
      (this.trails[i].mesh.material as THREE.Material).dispose();
    }
    this.trails = [];

    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.scene.remove(this.particles[i].mesh);
      this.particles[i].mesh.geometry.dispose();
      (this.particles[i].mesh.material as THREE.Material).dispose();
    }
    this.particles = [];

    this.isDragging = false;
    this.mouseSpeed = 0;
  }

  public setGridLinesVisible(visible: boolean): void {
    this.gridLines.forEach((line) => {
      line.visible = visible;
    });
  }

  public dispose(): void {
    this.container.removeEventListener('mousedown', this.onMouseDown);
    this.container.removeEventListener('mousemove', this.onMouseMove);
    this.container.removeEventListener('mouseup', this.onMouseUp);
    this.container.removeEventListener('mouseleave', this.onMouseUp);
    this.container.removeEventListener('touchstart', this.onTouchStart);
    this.container.removeEventListener('touchmove', this.onTouchMove);
    this.container.removeEventListener('touchend', this.onTouchEnd);

    this.reset();

    this.gridLines.forEach((line) => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    });
    this.gridLines = [];
  }
}
