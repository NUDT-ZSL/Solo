import * as THREE from 'three';
import type { SpectrumData } from './AudioManager';

interface SphereData {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  baseRadius: number;
  baseColor: THREE.Color;
  pulsePhase: number;
  pulsePeriod: number;
  pulseAmplitude: number;
  hovered: boolean;
  hoveredRing: THREE.Mesh | null;
  ringDots: THREE.Mesh[];
}

interface Particle {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  baseSize: number;
  colorStart: THREE.Color;
  colorEnd: THREE.Color;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  cp1: THREE.Vector3;
  cp2: THREE.Vector3;
}

interface LightTrail {
  points: THREE.Vector3[];
  line: THREE.Line;
  material: THREE.LineBasicMaterial;
  velocity: THREE.Vector3;
  phases: number[];
}

const SPHERE_COLORS = [0x00FF88, 0x00D4FF, 0xFF6B9D, 0xB388FF];
const SPACE_RADIUS = 30;
const MAX_PARTICLES = 1500;

export class SceneManager {
  private scene: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private container: HTMLElement;

  private spheres: SphereData[] = [];
  private particles: Particle[] = [];
  private lightTrails: LightTrail[] = [];
  private nextParticleTime: number = 0;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredSphere: SphereData | null = null;

  private cameraTheta: number = 0;
  private cameraPhi: number = 0;
  private cameraDistance: number = 45;
  private targetCameraDistance: number = 45;
  private cameraDistanceTransition: number = 0.8;
  private cameraDistanceElapsed: number = 0.8;
  private startCameraDistance: number = 45;
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  private clock: THREE.Clock;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initEventListeners();

    this.createSpheres();
    this.createLightTrails();
  }

  private initScene(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, 'rgba(80, 70, 50, 0.25)');
    gradient.addColorStop(0.5, 'rgba(60, 50, 40, 0.12)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 800; i++) {
      ctx.fillStyle = `rgba(${100 + Math.random() * 80}, ${90 + Math.random() * 60}, ${60 + Math.random() * 40}, ${0.05 + Math.random() * 0.15})`;
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = Math.random() * 3 + 0.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const groundTexture = new THREE.CanvasTexture(canvas);
    groundTexture.needsUpdate = true;

    const groundGeo = new THREE.CircleGeometry(SPACE_RADIUS, 64);
    const groundMat = new THREE.MeshBasicMaterial({
      map: groundTexture,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -SPACE_RADIUS * 0.9;
    this.scene.add(ground);

    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 2;
    bgCanvas.height = 256;
    const bgCtx = bgCanvas.getContext('2d')!;
    const bgGradient = bgCtx.createLinearGradient(0, 0, 0, 256);
    bgGradient.addColorStop(0, '#001F3F');
    bgGradient.addColorStop(1, '#003366');
    bgCtx.fillStyle = bgGradient;
    bgCtx.fillRect(0, 0, 2, 256);
    const bgTexture = new THREE.CanvasTexture(bgCanvas);
    bgTexture.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = bgTexture;

    const ambient = new THREE.AmbientLight(0x4488ff, 0.3);
    this.scene.add(ambient);
  }

  private initCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.updateCameraPosition();
  }

  private initRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setClearColor(0x001F3F, 1);
    this.container.appendChild(this.renderer.domElement);
  }

  private initEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.cameraTheta -= dx * 0.005;
        this.cameraTheta = Math.max(-Math.PI, Math.min(Math.PI, this.cameraTheta));
        this.cameraPhi -= dy * 0.005;
        this.cameraPhi = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.cameraPhi));
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1.08 : 1 / 1.08;
      this.targetCameraDistance = Math.max(5, Math.min(100, this.targetCameraDistance * delta));
      this.startCameraDistance = this.cameraDistance;
      this.cameraDistanceElapsed = 0;
    }, { passive: false });

    window.addEventListener('resize', () => this.onResize());
  }

  private onResize(): void {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.cos(this.cameraPhi) * Math.sin(this.cameraTheta);
    const y = this.cameraDistance * Math.sin(this.cameraPhi);
    const z = this.cameraDistance * Math.cos(this.cameraPhi) * Math.cos(this.cameraTheta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private createSpheres(): void {
    const sphereCount = 80;
    const geo = new THREE.SphereGeometry(1, 32, 32);

    for (let i = 0; i < sphereCount; i++) {
      const radius = 1.5 + Math.random() * 1.5;
      const color = SPHERE_COLORS[Math.floor(Math.random() * SPHERE_COLORS.length)];
      const opacity = 0.6 + Math.random() * 0.3;

      const mat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: opacity,
        depthWrite: false
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.scale.setScalar(radius);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = SPACE_RADIUS * 0.95 * Math.pow(Math.random(), 1 / 3);
      mesh.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );

      this.scene.add(mesh);

      this.spheres.push({
        mesh,
        material: mat,
        baseRadius: radius,
        baseColor: new THREE.Color(color),
        pulsePhase: Math.random() * Math.PI * 2,
        pulsePeriod: 1.5 + Math.random() * 1.5,
        pulseAmplitude: 0.3,
        hovered: false,
        hoveredRing: null,
        ringDots: []
      });
    }
  }

  private createLightTrails(): void {
    const trailCount = 30;
    for (let i = 0; i < trailCount; i++) {
      const points: THREE.Vector3[] = [];
      const phases: number[] = [];
      const startPos = new THREE.Vector3(
        (Math.random() - 0.5) * SPACE_RADIUS * 1.8,
        (Math.random() - 0.5) * SPACE_RADIUS * 1.8,
        (Math.random() - 0.5) * SPACE_RADIUS * 1.8
      );

      for (let j = 0; j < 5; j++) {
        points.push(startPos.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        )));
        phases.push(Math.random() * Math.PI * 2);
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0xA0E0FF,
        transparent: true,
        opacity: 0.2,
        linewidth: 1
      });
      const line = new THREE.Line(geometry, material);
      this.scene.add(line);

      this.lightTrails.push({
        points,
        line,
        material,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3
        ),
        phases
      });
    }
  }

  private updateHover(): void {
    if (this.isDragging) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const sphereMeshes = this.spheres.map(s => s.mesh);
    const intersects = this.raycaster.intersectObjects(sphereMeshes);

    if (this.hoveredSphere) {
      this.hoveredSphere.hovered = false;
      if (this.hoveredSphere.hoveredRing) {
        this.scene.remove(this.hoveredSphere.hoveredRing);
        this.hoveredSphere.hoveredRing.geometry.dispose();
        (this.hoveredSphere.hoveredRing.material as THREE.Material).dispose();
        this.hoveredSphere.hoveredRing = null;
      }
      this.hoveredSphere.ringDots.forEach(dot => {
        this.scene.remove(dot);
        dot.geometry.dispose();
        (dot.material as THREE.Material).dispose();
      });
      this.hoveredSphere.ringDots = [];
      this.hoveredSphere = null;
    }

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const sphere = this.spheres.find(s => s.mesh === hit);
      if (sphere) {
        sphere.hovered = true;
        this.hoveredSphere = sphere;

        const ringGeo = new THREE.RingGeometry(sphere.baseRadius + 1.9, sphere.baseRadius + 2.1, 64);
        const ringMat = new THREE.MeshBasicMaterial({
          color: sphere.baseColor,
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(sphere.mesh.position);
        this.scene.add(ring);
        sphere.hoveredRing = ring;

        for (let i = 0; i < 6; i++) {
          const dotGeo = new THREE.SphereGeometry(0.1, 8, 8);
          const dotMat = new THREE.MeshBasicMaterial({
            color: sphere.baseColor,
            transparent: true,
            opacity: 0.9,
            depthWrite: false
          });
          const dot = new THREE.Mesh(dotGeo, dotMat);
          sphere.ringDots.push(dot);
          this.scene.add(dot);
        }
      }
    }
  }

  private updateSpheres(_dt: number, elapsed: number, spectrum: SpectrumData): void {
    const pulseAmp = 0.2 + spectrum.low * 0.4;
    const brightness = 0.3 + spectrum.mid * 0.7;
    const whiteShift = spectrum.high * 0.4;

    const white = new THREE.Color(0xffffff);
    const tempColor = new THREE.Color();

    for (const sphere of this.spheres) {
      const pulse = Math.sin(elapsed * (2 * Math.PI / sphere.pulsePeriod) + sphere.pulsePhase) * 0.5 + 0.5;
      let scale = sphere.baseRadius + pulse * pulseAmp;
      let intensity = brightness;

      if (sphere.hovered) {
        scale *= 1.5;
        intensity *= 2;
      }

      sphere.mesh.scale.setScalar(scale);

      tempColor.copy(sphere.baseColor).lerp(white, whiteShift);
      tempColor.multiplyScalar(Math.min(1.5, intensity));
      sphere.material.color.copy(tempColor);

      if (sphere.hoveredRing && sphere.ringDots.length > 0) {
        sphere.hoveredRing.position.copy(sphere.mesh.position);
        sphere.hoveredRing.lookAt(this.camera.position);

        const ringAngle = elapsed * Math.PI;
        const ringRadius = sphere.baseRadius + 2;
        for (let i = 0; i < sphere.ringDots.length; i++) {
          const angle = ringAngle + (i / sphere.ringDots.length) * Math.PI * 2;
          const localPos = new THREE.Vector3(
            Math.cos(angle) * ringRadius,
            Math.sin(angle) * ringRadius,
            0
          );
          localPos.applyQuaternion(sphere.hoveredRing.quaternion);
          sphere.ringDots[i].position.copy(sphere.mesh.position).add(localPos);
          sphere.ringDots[i].scale.setScalar(intensity);
        }
      }
    }
  }

  private spawnParticleStream(): void {
    if (this.particles.length >= MAX_PARTICLES - 30) return;

    const validPairs: [SphereData, SphereData][] = [];
    for (let i = 0; i < this.spheres.length; i++) {
      for (let j = i + 1; j < this.spheres.length; j++) {
        const dist = this.spheres[i].mesh.position.distanceTo(this.spheres[j].mesh.position);
        if (dist <= 12) {
          validPairs.push([this.spheres[i], this.spheres[j]]);
        }
      }
    }

    if (validPairs.length === 0) return;

    const pair = validPairs[Math.floor(Math.random() * validPairs.length)];
    const [start, end] = pair;

    const startPos = start.mesh.position.clone();
    const endPos = end.mesh.position.clone();
    const midDir = new THREE.Vector3().subVectors(endPos, startPos);
    const distance = midDir.length();
    midDir.normalize();

    const perp1 = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).cross(midDir).normalize();
    const perp2 = new THREE.Vector3().crossVectors(midDir, perp1).normalize();

    const controlOffset = (Math.random() - 0.5) * distance * 0.6;
    const cp1 = startPos.clone().add(midDir.clone().multiplyScalar(distance * 0.33))
      .add(perp1.multiplyScalar(controlOffset))
      .add(perp2.clone().multiplyScalar((Math.random() - 0.5) * distance * 0.3));
    const cp2 = startPos.clone().add(midDir.clone().multiplyScalar(distance * 0.66))
      .add(perp1.multiplyScalar(-controlOffset * 0.5))
      .add(perp2.clone().multiplyScalar((Math.random() - 0.5) * distance * 0.3));

    const speed = 8;
    const totalTime = distance / speed;
    const particleCount = 30;

    for (let i = 0; i < particleCount; i++) {
      const geo = new THREE.SphereGeometry(1, 6, 6);
      const size = 0.1 + Math.random() * 0.2;
      const mat = new THREE.MeshBasicMaterial({
        color: start.baseColor,
        transparent: true,
        opacity: 0.9,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.scale.setScalar(size);
      this.scene.add(mesh);

      const startTime = (i / particleCount) * totalTime * 0.3;

      this.particles.push({
        mesh,
        life: -startTime,
        maxLife: totalTime,
        baseSize: size,
        colorStart: start.baseColor.clone(),
        colorEnd: end.baseColor.clone(),
        startPos: startPos.clone(),
        endPos: endPos.clone(),
        cp1: cp1.clone(),
        cp2: cp2.clone()
      });
    }
  }

  private updateParticles(dt: number): void {
    const toRemove: number[] = [];
    const tempColor = new THREE.Color();
    const tempPos = new THREE.Vector3();

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life += dt;

      if (p.life < 0) {
        continue;
      }

      const t = Math.min(1, p.life / p.maxLife);

      this.bezierPointInPlace(t, p.startPos, p.cp1, p.cp2, p.endPos, tempPos);
      p.mesh.position.copy(tempPos);

      const sizeScale = 1 - t * 0.5;
      p.mesh.scale.setScalar(p.baseSize * sizeScale);

      const opacity = 0.9 - t * 0.7;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = opacity;

      tempColor.copy(p.colorStart).lerp(p.colorEnd, t);
      (p.mesh.material as THREE.MeshBasicMaterial).color.copy(tempColor);

      if (t >= 1) {
        toRemove.push(i);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      const p = this.particles[idx];
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
      this.particles.splice(idx, 1);
    }

    if (this.particles.length > MAX_PARTICLES) {
      const excess = this.particles.length - MAX_PARTICLES;
      for (let i = 0; i < excess && this.particles.length > MAX_PARTICLES * 0.9; i++) {
        const p = this.particles[0];
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.shift();
      }
    }
  }

  private bezierPointInPlace(t: number, p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, out: THREE.Vector3): void {
    const mt = 1 - t;
    out.x = mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x;
    out.y = mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y;
    out.z = mt * mt * mt * p0.z + 3 * mt * mt * t * p1.z + 3 * mt * t * t * p2.z + t * t * t * p3.z;
  }

  private updateLightTrails(dt: number, elapsed: number): void {
    const particleCount = this.particles.length;
    const maxTrails = particleCount > MAX_PARTICLES * 0.8 ? 15 : 30;

    for (let i = 0; i < Math.min(this.lightTrails.length, maxTrails); i++) {
      const trail = this.lightTrails[i];
      trail.line.visible = true;

      for (let j = 0; j < trail.points.length; j++) {
        trail.points[j].x += trail.velocity.x * dt;
        trail.points[j].y += trail.velocity.y * dt + Math.sin(elapsed * 2 + trail.phases[j]) * 0.5 * dt;
        trail.points[j].z += trail.velocity.z * dt;

        if (Math.abs(trail.points[j].x) > SPACE_RADIUS) trail.velocity.x *= -1;
        if (Math.abs(trail.points[j].y) > SPACE_RADIUS) trail.velocity.y *= -1;
        if (Math.abs(trail.points[j].z) > SPACE_RADIUS) trail.velocity.z *= -1;
      }

      const positions = trail.line.geometry.attributes.position.array as Float32Array;
      for (let j = 0; j < trail.points.length; j++) {
        positions[j * 3] = trail.points[j].x;
        positions[j * 3 + 1] = trail.points[j].y;
        positions[j * 3 + 2] = trail.points[j].z;
      }
      trail.line.geometry.attributes.position.needsUpdate = true;
    }

    for (let i = maxTrails; i < this.lightTrails.length; i++) {
      this.lightTrails[i].line.visible = false;
    }
  }

  public update(spectrum: SpectrumData): void {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();

    if (this.cameraDistanceElapsed < this.cameraDistanceTransition) {
      this.cameraDistanceElapsed += dt;
      const t = Math.min(1, this.cameraDistanceElapsed / this.cameraDistanceTransition);
      const easeT = 1 - Math.pow(1 - t, 3);
      this.cameraDistance = this.startCameraDistance + (this.targetCameraDistance - this.startCameraDistance) * easeT;
    }

    this.updateCameraPosition();
    this.updateHover();
    this.updateSpheres(dt, elapsed, spectrum);
    this.updateLightTrails(dt, elapsed);

    if (elapsed >= this.nextParticleTime) {
      this.spawnParticleStream();
      this.nextParticleTime = elapsed + 2 + Math.random() * 2;
    }

    this.updateParticles(dt);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.renderer.dispose();
  }
}
