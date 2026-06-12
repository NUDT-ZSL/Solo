import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { PlanetSummary } from './ApiClient';

export interface CelestialBody {
  id: string;
  data: PlanetSummary;
  group: THREE.Group;
  mesh: THREE.Mesh;
  originalScale: number;
  orbitLine: THREE.Line;
  rings?: THREE.Mesh;
  glowLight?: THREE.PointLight;
  angle: number;
  orbitSpeed: number;
  rotationSpeed: number;
}

interface CameraAnimation {
  active: boolean;
  startTime: number;
  duration: number;
  startPosition: THREE.Vector3;
  endPosition: THREE.Vector3;
  startTarget: THREE.Vector3;
  endTarget: THREE.Vector3;
}

const MIN_BODY_RADIUS = 0.5;
const MAX_BODY_RADIUS = 5;
const MIN_ORBIT_RADIUS = 2;
const MAX_ORBIT_RADIUS = 25;
const ROTATION_SPEED = 0.005;
const MIN_ORBIT_SPEED = 0.005;
const MAX_ORBIT_SPEED = 0.02;

export class SceneManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private bodies: Map<string, CelestialBody> = new Map();
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredBody: CelestialBody | null = null;
  private selectedBody: CelestialBody | null = null;
  private cameraAnimation: CameraAnimation | null = null;
  private animationFrameId: number = 0;
  private stars: THREE.Points | null = null;
  private clock: THREE.Clock;

  public onBodyClick?: (bodyId: string) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 15, 30);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 50;
    this.controls.enablePan = true;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.setupLights();
    this.createStarfield();
    this.setupEventListeners();
    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    this.scene.add(ambientLight);

    const sunLight = new THREE.PointLight(0xffffff, 2, 100, 1);
    sunLight.position.set(0, 0, 0);
    this.scene.add(sunLight);

    const sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xffdd44 })
    );
    sunMesh.position.set(0, 0, 0);
    this.scene.add(sunMesh);

    const sunGlow = new THREE.PointLight(0xffaa44, 1, 20);
    sunGlow.position.set(0, 0, 0);
    this.scene.add(sunGlow);
  }

  private createStarfield(): void {
    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 5000;
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 80 + Math.random() * 20;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      sizes[i] = 0.1 + Math.random() * 0.4;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
    });

    this.stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(this.stars);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.handleResize);
    this.renderer.domElement.addEventListener('mousemove', this.handleMouseMove);
    this.renderer.domElement.addEventListener('click', this.handleClick);
  }

  private handleResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private handleMouseMove = (event: MouseEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  };

  private handleClick = (event: MouseEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = Array.from(this.bodies.values()).map(b => b.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      for (const body of this.bodies.values()) {
        if (body.mesh === clickedMesh) {
          this.selectBody(body);
          if (this.onBodyClick) {
            this.onBodyClick(body.id);
          }
          break;
        }
      }
    }
  };

  private selectBody(body: CelestialBody): void {
    if (this.selectedBody && this.selectedBody.id !== body.id) {
      this.deselectBody(this.selectedBody);
    }

    this.selectedBody = body;
    this.applyHoverEffect(body);

    this.animateCameraTo(body);
  }

  private deselectBody(body: CelestialBody): void {
    this.removeHoverEffect(body);
  }

  public clearSelection(): void {
    if (this.selectedBody) {
      this.deselectBody(this.selectedBody);
      this.selectedBody = null;
    }
  }

  private applyHoverEffect(body: CelestialBody): void {
    body.mesh.scale.setScalar(body.originalScale * 1.1);

    if (!body.glowLight) {
      const glowLight = new THREE.PointLight(0xffffff, 1, 5);
      glowLight.position.set(0, body.originalScale * 2, 0);
      body.group.add(glowLight);
      body.glowLight = glowLight;
    }
    body.glowLight.intensity = 1;
  }

  private removeHoverEffect(body: CelestialBody): void {
    body.mesh.scale.setScalar(body.originalScale);

    if (body.glowLight) {
      body.glowLight.intensity = 0;
    }
  }

  private animateCameraTo(body: CelestialBody): void {
    const bodyWorldPos = new THREE.Vector3();
    body.group.getWorldPosition(bodyWorldPos);

    const direction = new THREE.Vector3();
    direction.subVectors(this.camera.position, this.controls.target).normalize();

    const distance = body.originalScale * 6 + 3;
    const offset = direction.multiplyScalar(distance);
    const targetPos = new THREE.Vector3().copy(bodyWorldPos).add(offset);
    targetPos.y += body.originalScale * 2;

    this.cameraAnimation = {
      active: true,
      startTime: this.clock.getElapsedTime(),
      duration: 0.8,
      startPosition: this.camera.position.clone(),
      endPosition: targetPos,
      startTarget: this.controls.target.clone(),
      endTarget: bodyWorldPos,
    };
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private updateCameraAnimation(): void {
    if (!this.cameraAnimation || !this.cameraAnimation.active) return;

    const elapsed = this.clock.getElapsedTime() - this.cameraAnimation.startTime;
    let t = elapsed / this.cameraAnimation.duration;

    if (t >= 1) {
      t = 1;
      this.cameraAnimation.active = false;
      this.camera.position.copy(this.cameraAnimation.endPosition);
      this.controls.target.copy(this.cameraAnimation.endTarget);
      this.cameraAnimation = null;
      return;
    }

    const easedT = this.easeInOutCubic(t);

    const startPos = this.cameraAnimation.startPosition;
    const endPos = this.cameraAnimation.endPosition;
    const midHeight = Math.max(startPos.y, endPos.y) + 5;
    const midPos = new THREE.Vector3(
      (startPos.x + endPos.x) / 2,
      midHeight,
      (startPos.z + endPos.z) / 2
    );

    const p0 = startPos;
    const p1 = midPos;
    const p2 = endPos;
    const oneMinusT = 1 - easedT;

    this.camera.position.x = oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * easedT * p1.x + easedT * easedT * p2.x;
    this.camera.position.y = oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * easedT * p1.y + easedT * easedT * p2.y;
    this.camera.position.z = oneMinusT * oneMinusT * p0.z + 2 * oneMinusT * easedT * p1.z + easedT * easedT * p2.z;

    this.controls.target.lerpVectors(
      this.cameraAnimation.startTarget,
      this.cameraAnimation.endTarget,
      easedT
    );
  }

  public addPlanet(data: PlanetSummary): void {
    const { id, color, radius, orbitRadius, orbitSpeed, hasRings } = data;

    const radiusNorm = this.normalizeRadius(radius);
    const orbitNorm = this.normalizeOrbitRadius(orbitRadius);
    const speedNorm = this.normalizeOrbitSpeed(orbitRadius);

    const group = new THREE.Group();

    const geometry = new THREE.SphereGeometry(radiusNorm, 64, 64);
    const material = this.createPlanetMaterial(color, radiusNorm);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.bodyId = id;
    group.add(mesh);

    const orbitLine = this.createOrbitLine(orbitNorm);
    this.scene.add(orbitLine);

    if (hasRings) {
      const ringGeometry = new THREE.RingGeometry(radiusNorm * 1.3, radiusNorm * 1.8, 64);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xc8a96e,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      });
      const rings = new THREE.Mesh(ringGeometry, ringMaterial);
      rings.rotation.x = Math.PI / 2.5;
      group.add(rings);

      const body: CelestialBody = {
        id,
        data,
        group,
        mesh,
        originalScale: radiusNorm,
        orbitLine,
        rings,
        angle: Math.random() * Math.PI * 2,
        orbitSpeed: speedNorm,
        rotationSpeed: ROTATION_SPEED,
      };
      this.bodies.set(id, body);
    } else {
      const body: CelestialBody = {
        id,
        data,
        group,
        mesh,
        originalScale: radiusNorm,
        orbitLine,
        angle: Math.random() * Math.PI * 2,
        orbitSpeed: speedNorm,
        rotationSpeed: ROTATION_SPEED,
      };
      this.bodies.set(id, body);
    }

    const angle = Math.random() * Math.PI * 2;
    const body = this.bodies.get(id)!;
    body.angle = angle;
    body.group.position.x = Math.cos(angle) * orbitNorm;
    body.group.position.z = Math.sin(angle) * orbitNorm;

    this.scene.add(group);
  }

  private createPlanetMaterial(color: string, radius: number): THREE.MeshStandardMaterial {
    const c = new THREE.Color(color);

    const canvas = document.createElement('canvas');
    const size = 256;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    const baseR = Math.floor(c.r * 255);
    const baseG = Math.floor(c.g * 255);
    const baseB = Math.floor(c.b * 255);

    for (let i = 0; i < size * size; i++) {
      const idx = i * 4;
      const noise = (Math.random() - 0.5) * 40;
      data[idx] = Math.max(0, Math.min(255, baseR + noise));
      data[idx + 1] = Math.max(0, Math.min(255, baseG + noise));
      data[idx + 2] = Math.max(0, Math.min(255, baseB + noise));
      data[idx + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.7,
      metalness: 0.1,
    });
  }

  private createOrbitLine(radius: number): THREE.Line {
    const points: THREE.Vector3[] = [];
    const segments = 128;

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x555555,
      transparent: true,
      opacity: 0.4,
    });

    return new THREE.Line(geometry, material);
  }

  private normalizeRadius(radius: number): number {
    const logRadius = Math.log(radius + 1);
    const logMin = Math.log(10 + 1);
    const logMax = Math.log(70000 + 1);
    const t = (logRadius - logMin) / (logMax - logMin);
    return MIN_BODY_RADIUS + t * (MAX_BODY_RADIUS - MIN_BODY_RADIUS);
  }

  private normalizeOrbitRadius(orbitRadius: number): number {
    const logOrbit = Math.log(orbitRadius + 1);
    const logMin = Math.log(50 + 1);
    const logMax = Math.log(5000 + 1);
    const t = (logOrbit - logMin) / (logMax - logMin);
    return MIN_ORBIT_RADIUS + t * (MAX_ORBIT_RADIUS - MIN_ORBIT_RADIUS);
  }

  private normalizeOrbitSpeed(orbitRadius: number): number {
    const t = (this.normalizeOrbitRadius(orbitRadius) - MIN_ORBIT_RADIUS) / (MAX_ORBIT_RADIUS - MIN_ORBIT_RADIUS);
    return MAX_ORBIT_SPEED - t * (MAX_ORBIT_SPEED - MIN_ORBIT_SPEED);
  }

  public removePlanet(id: string): void {
    const body = this.bodies.get(id);
    if (body) {
      this.scene.remove(body.group);
      this.scene.remove(body.orbitLine);
      body.mesh.geometry.dispose();
      (body.mesh.material as THREE.Material).dispose();
      body.orbitLine.geometry.dispose();
      (body.orbitLine.material as THREE.Material).dispose();
      if (body.rings) {
        body.rings.geometry.dispose();
        (body.rings.material as THREE.Material).dispose();
      }
      this.bodies.delete(id);
    }
  }

  public clearAll(): void {
    for (const id of this.bodies.keys()) {
      this.removePlanet(id);
    }
  }

  private updateHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = Array.from(this.bodies.values()).map(b => b.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    let newHovered: CelestialBody | null = null;

    if (intersects.length > 0) {
      const hoveredMesh = intersects[0].object as THREE.Mesh;
      for (const body of this.bodies.values()) {
        if (body.mesh === hoveredMesh) {
          newHovered = body;
          break;
        }
      }
    }

    if (newHovered !== this.hoveredBody) {
      if (this.hoveredBody && this.hoveredBody !== this.selectedBody) {
        this.removeHoverEffect(this.hoveredBody);
      }
      if (newHovered && newHovered !== this.selectedBody) {
        this.applyHoverEffect(newHovered);
      }
      this.hoveredBody = newHovered;
      this.renderer.domElement.style.cursor = newHovered ? 'pointer' : 'default';
    }
  }

  private updateLOD(): void {
    const cameraPos = this.camera.position;

    for (const body of this.bodies.values()) {
      const distance = cameraPos.distanceTo(body.group.position);
      const maxDist = 50;
      const minDist = 5;

      let opacity = 1;
      if (distance > minDist) {
        opacity = Math.max(0.1, 1 - (distance - minDist) / (maxDist - minDist));
      }

      const material = body.mesh.material as THREE.MeshStandardMaterial;
      if (material.transparent !== true || material.opacity !== opacity) {
        material.transparent = true;
        material.opacity = opacity;
      }

      body.mesh.visible = opacity > 0.05;
    }
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();

    for (const body of this.bodies.values()) {
      body.angle += body.orbitSpeed * delta * 60;
      const orbitRadius = body.group.position.length();

      const orbitNorm = this.getOrbitRadiusFromBody(body);
      body.group.position.x = Math.cos(body.angle) * orbitNorm;
      body.group.position.z = Math.sin(body.angle) * orbitNorm;

      body.mesh.rotation.y += body.rotationSpeed * delta * 60;
    }

    if (this.stars) {
      this.stars.rotation.y += 0.0001 * delta * 60;
    }

    this.updateHover();
    this.updateCameraAnimation();
    this.updateLOD();

    if (!this.cameraAnimation?.active) {
      this.controls.update();
    }

    this.renderer.render(this.scene, this.camera);
  };

  private getOrbitRadiusFromBody(body: CelestialBody): number {
    const orbitRadius = this.normalizeOrbitRadius(body.data.orbitRadius);
    return orbitRadius;
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('mousemove', this.handleMouseMove);
    this.renderer.domElement.removeEventListener('click', this.handleClick);

    this.clearAll();

    if (this.stars) {
      this.stars.geometry.dispose();
      (this.stars.material as THREE.Material).dispose();
    }

    this.controls.dispose();
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
