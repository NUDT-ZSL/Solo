import * as THREE from 'three';
import gsap from 'gsap';
import { createStarSystem, type PlanetData } from './starSystem';
import { createOrbitParticles } from './orbitParticles';
import { createUIController } from './uiController';

const MIN_CAMERA_DISTANCE = 3;
const MAX_CAMERA_DISTANCE = 50;
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(20, 15, 25);
const LOOK_AT_CENTER = new THREE.Vector3(0, 0, 0);
const FPS_SAMPLE_WINDOW = 500;

interface HoverAnimState {
  time: number;
  running: boolean;
}

class StarDanceApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  private starSystem: ReturnType<typeof createStarSystem>;
  private orbitParticles: ReturnType<typeof createOrbitParticles>;
  private uiController: ReturnType<typeof createUIController>;

  private speedMultiplier = 1;
  private selectedPlanet: PlanetData | null = null;
  private hoveredPlanet: PlanetData | null = null;
  private hoverAnim: HoverAnimState = { time: 0, running: false };

  private isDragging = false;
  private isRightDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private cameraTheta = Math.atan2(DEFAULT_CAMERA_POSITION.x, DEFAULT_CAMERA_POSITION.z);
  private cameraPhi = Math.acos(DEFAULT_CAMERA_POSITION.y / DEFAULT_CAMERA_POSITION.length());
  private cameraDistance = DEFAULT_CAMERA_POSITION.length();
  private panOffset = new THREE.Vector3();

  private keys: Record<string, boolean> = {};

  private fpsCounter: HTMLDivElement;
  private performanceWarning: HTMLDivElement;
  private frameCountWindow = 0;
  private lastWindowStart = 0;
  private smoothedFps = 60;
  private lowFpsCount = 0;
  private performanceReduced = false;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private flashMeshes: THREE.Mesh[] = [];

  private cameraAnimating = false;

  constructor() {
    const container = document.getElementById('app');
    if (!container) throw new Error('Container #app not found');

    this.fpsCounter = document.getElementById('fps-counter') as HTMLDivElement;
    this.performanceWarning = document.getElementById('performance-warning') as HTMLDivElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.copy(DEFAULT_CAMERA_POSITION);
    this.camera.lookAt(LOOK_AT_CENTER);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false;
    container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.lastWindowStart = performance.now();

    this.starSystem = createStarSystem();
    this.scene.add(this.starSystem.group);

    this.orbitParticles = createOrbitParticles(this.starSystem.planets);
    this.scene.add(this.orbitParticles.group);

    this.uiController = createUIController(this.starSystem.planets, {
      onPlanetSelect: this.handlePlanetSelect.bind(this),
      onSpeedChange: this.handleSpeedChange.bind(this),
      onTrailsToggle: this.handleTrailsToggle.bind(this),
      onResetView: this.handleResetView.bind(this)
    });

    const ambientLight = new THREE.AmbientLight(0x404050, 0.4);
    this.scene.add(ambientLight);

    this.setupEventListeners();
    this.animate = this.animate.bind(this);
    this.animate();
  }

  private setupEventListeners(): void {
    const dom = this.renderer.domElement;

    dom.addEventListener('mousedown', this.onMouseDown.bind(this));
    dom.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    dom.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    dom.addEventListener('contextmenu', (e) => e.preventDefault());

    dom.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
    dom.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: true });
    window.addEventListener('touchend', this.onTouchEnd.bind(this));

    dom.addEventListener('click', this.onClick.bind(this));

    window.addEventListener('keydown', (e) => { this.keys[e.key.toLowerCase()] = true; });
    window.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      this.isDragging = true;
    } else if (e.button === 2) {
      this.isRightDragging = true;
    }
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private onMouseMove(e: MouseEvent): void {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    if (this.isDragging) {
      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;
      this.cameraTheta -= deltaX * 0.005;
      this.cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraPhi - deltaY * 0.005));
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.updateCameraPositionImmediate();
    } else if (this.isRightDragging) {
      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;
      const right = new THREE.Vector3();
      const up = new THREE.Vector3();
      this.camera.getWorldDirection(right);
      right.cross(this.camera.up).normalize();
      up.copy(this.camera.up);
      this.panOffset.add(right.multiplyScalar(-deltaX * 0.02));
      this.panOffset.add(up.multiplyScalar(deltaY * 0.02));
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.updateCameraPositionImmediate();
    } else {
      this.checkHover();
    }
  }

  private onMouseUp(): void {
    this.isDragging = false;
    this.isRightDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    this.cameraDistance = Math.max(
      MIN_CAMERA_DISTANCE,
      Math.min(MAX_CAMERA_DISTANCE, this.cameraDistance * zoomFactor)
    );
    this.updateCameraPositionImmediate();
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (this.isDragging && e.touches.length === 1) {
      const deltaX = e.touches[0].clientX - this.lastMouseX;
      const deltaY = e.touches[0].clientY - this.lastMouseY;
      this.cameraTheta -= deltaX * 0.005;
      this.cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraPhi - deltaY * 0.005));
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
      this.updateCameraPositionImmediate();
    }
  }

  private onTouchEnd(): void {
    this.isDragging = false;
  }

  private onClick(e: MouseEvent): void {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.starSystem.planets.map(p => p.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);
    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh;
      const idx = hit.userData.planetIndex;
      if (typeof idx === 'number') {
        this.handlePlanetSelect(idx);
        this.createFlashEffect(this.starSystem.planets[idx]);
      }
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private computeCameraPosition(): THREE.Vector3 {
    const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    const y = this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    const target = LOOK_AT_CENTER.clone().add(this.panOffset);
    return new THREE.Vector3(x, y, z).add(target);
  }

  private getLookAtTarget(): THREE.Vector3 {
    if (this.selectedPlanet) {
      const wp = new THREE.Vector3();
      this.selectedPlanet.mesh.getWorldPosition(wp);
      return wp;
    }
    return LOOK_AT_CENTER.clone().add(this.panOffset);
  }

  private updateCameraPositionImmediate(): void {
    if (this.cameraAnimating) return;
    const newPos = this.computeCameraPosition();
    this.camera.position.copy(newPos);
    this.camera.lookAt(this.getLookAtTarget());
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.starSystem.planets.map(p => p.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh;
      const idx = hit.userData.planetIndex;
      if (typeof idx === 'number') {
        const planet = this.starSystem.planets[idx];
        if (this.hoveredPlanet !== planet) {
          this.clearHover();
          this.hoveredPlanet = planet;
          this.hoverAnim = { time: 0, running: !planet.selected };
          document.body.style.cursor = 'pointer';
        }
      }
    } else if (this.hoveredPlanet) {
      this.clearHover();
    }
  }

  private clearHover(): void {
    if (this.hoveredPlanet && !this.hoveredPlanet.selected) {
      const mat = this.hoveredPlanet.highlightRing.material as THREE.MeshBasicMaterial;
      gsap.killTweensOf(mat);
      gsap.to(mat, { opacity: 0, duration: 0.25 });
      gsap.killTweensOf(this.hoveredPlanet.highlightRing.scale);
      gsap.to(this.hoveredPlanet.highlightRing.scale, {
        x: 1, y: 1, z: 1, duration: 0.25
      });
    }
    this.hoveredPlanet = null;
    this.hoverAnim.running = false;
    this.hoverAnim.time = 0;
    document.body.style.cursor = 'default';
  }

  private updateHoverRing(delta: number): void {
    if (!this.hoveredPlanet || this.hoveredPlanet.selected) return;

    this.hoverAnim.time += delta;
    const cyclePeriod = 2;
    const t = (this.hoverAnim.time % cyclePeriod) / cyclePeriod;

    const baseSize = (this.hoveredPlanet.highlightRing.userData as { baseSize: number }).baseSize;
    const innerFactor = 1.0 + t * 0.8;
    const outerFactor = 1.05 + t * 2.0;
    const ringMat = this.hoveredPlanet.highlightRing.material as THREE.MeshBasicMaterial;

    const opacity = Math.sin(t * Math.PI) * 0.7;
    ringMat.opacity = opacity;

    const newScale = 1 + t * 1.5;
    this.hoveredPlanet.highlightRing.scale.set(newScale, newScale, newScale);

    void innerFactor; void outerFactor; void baseSize;
  }

  private animateHighlightRing(planet: PlanetData, selected: boolean): void {
    gsap.killTweensOf((planet.highlightRing.material as THREE.MeshBasicMaterial));
    gsap.killTweensOf(planet.highlightRing.scale);

    if (selected) {
      const mat = planet.highlightRing.material as THREE.MeshBasicMaterial;
      gsap.to(mat, { opacity: 0.5, duration: 0.3, repeat: -1, yoyo: true });
      gsap.to(planet.highlightRing.scale, {
        x: 2, y: 2, z: 2, duration: 2, repeat: -1, ease: 'power1.out', yoyo: true
      });
    } else {
      const mat = planet.highlightRing.material as THREE.MeshBasicMaterial;
      gsap.to(mat, { opacity: 0, duration: 0.3 });
      gsap.to(planet.highlightRing.scale, { x: 1, y: 1, z: 1, duration: 0.3 });
    }
  }

  private createFlashEffect(planet: PlanetData): void {
    const geometry = new THREE.SphereGeometry(planet.radius * 1.5, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    });
    const flash = new THREE.Mesh(geometry, material);
    planet.mesh.getWorldPosition(flash.position);
    this.scene.add(flash);
    this.flashMeshes.push(flash);

    gsap.to(material, {
      opacity: 0,
      duration: 0.4,
      onComplete: () => {
        this.scene.remove(flash);
        geometry.dispose();
        material.dispose();
        const idx = this.flashMeshes.indexOf(flash);
        if (idx >= 0) this.flashMeshes.splice(idx, 1);
      }
    });

    gsap.to(flash.scale, {
      x: 2.5,
      y: 2.5,
      z: 2.5,
      duration: 0.4,
      ease: 'power2.out'
    });
  }

  private handlePlanetSelect(index: number): void {
    this.starSystem.planets.forEach((p, i) => {
      if (p.selected) {
        p.selected = false;
        this.animateHighlightRing(p, false);
      }
      if (i === index) {
        p.selected = true;
        this.selectedPlanet = p;
        this.animateHighlightRing(p, true);
      }
    });

    if (index < 0) {
      this.selectedPlanet = null;
      this.uiController.updatePlanetDropdown();
      return;
    }

    const planet = this.starSystem.planets[index];
    const worldPos = new THREE.Vector3();
    planet.mesh.getWorldPosition(worldPos);

    const direction = worldPos.clone().sub(this.camera.position).normalize();
    const targetPos = worldPos.clone().sub(direction.multiplyScalar(planet.radius * 8));
    targetPos.y += planet.radius * 3;

    this.cameraAnimating = true;
    gsap.killTweensOf(this.camera.position);
    gsap.to(this.camera.position, {
      x: targetPos.x,
      y: targetPos.y,
      z: targetPos.z,
      duration: 0.8,
      ease: 'power2.inOut',
      onUpdate: () => {
        const wp = new THREE.Vector3();
        planet.mesh.getWorldPosition(wp);
        this.camera.lookAt(wp);
      },
      onComplete: () => {
        this.cameraAnimating = false;
        const toCenter = new THREE.Vector3().subVectors(targetPos, worldPos);
        this.cameraDistance = toCenter.length();
        this.cameraTheta = Math.atan2(toCenter.x, toCenter.z);
        this.cameraPhi = Math.acos(THREE.MathUtils.clamp(toCenter.y / this.cameraDistance, -1, 1));
        this.panOffset.copy(worldPos);
      }
    });

    this.uiController.updatePlanetDropdown();
  }

  private handleSpeedChange(speed: number): void {
    this.speedMultiplier = speed;
  }

  private handleTrailsToggle(visible: boolean): void {
    this.orbitParticles.setVisible(visible);
  }

  private handleResetView(): void {
    this.starSystem.planets.forEach(p => {
      if (p.selected) {
        p.selected = false;
        this.animateHighlightRing(p, false);
      }
    });
    this.selectedPlanet = null;
    this.clearHover();

    this.cameraAnimating = true;
    gsap.killTweensOf(this.camera.position);
    gsap.to(this.camera.position, {
      x: DEFAULT_CAMERA_POSITION.x,
      y: DEFAULT_CAMERA_POSITION.y,
      z: DEFAULT_CAMERA_POSITION.z,
      duration: 1,
      ease: 'power2.inOut',
      onUpdate: () => {
        this.camera.lookAt(LOOK_AT_CENTER);
      },
      onComplete: () => {
        this.cameraAnimating = false;
      }
    });

    this.cameraTheta = Math.atan2(DEFAULT_CAMERA_POSITION.x, DEFAULT_CAMERA_POSITION.z);
    this.cameraPhi = Math.acos(DEFAULT_CAMERA_POSITION.y / DEFAULT_CAMERA_POSITION.length());
    this.cameraDistance = DEFAULT_CAMERA_POSITION.length();
    this.panOffset.set(0, 0, 0);

    this.uiController.updatePlanetDropdown();
  }

  private handleKeyboardMovement(delta: number): void {
    const moveSpeed = 15 * delta;
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, this.camera.up).normalize();

    let moved = false;
    if (this.keys['w']) { this.panOffset.add(forward.multiplyScalar(moveSpeed)); moved = true; }
    if (this.keys['s']) { this.panOffset.add(forward.multiplyScalar(-moveSpeed)); moved = true; }
    if (this.keys['a']) { this.panOffset.add(right.multiplyScalar(-moveSpeed)); moved = true; }
    if (this.keys['d']) { this.panOffset.add(right.multiplyScalar(moveSpeed)); moved = true; }

    if (moved && !this.cameraAnimating) {
      this.updateCameraPositionImmediate();
    }
  }

  private updateFPS(now: number): void {
    this.frameCountWindow++;
    const elapsed = now - this.lastWindowStart;

    if (elapsed >= FPS_SAMPLE_WINDOW) {
      const instFps = (this.frameCountWindow * 1000) / elapsed;
      this.smoothedFps = this.smoothedFps * 0.6 + instFps * 0.4;
      const displayFps = Math.round(this.smoothedFps);
      this.fpsCounter.textContent = `FPS: ${displayFps}`;

      if (this.smoothedFps < 40) {
        this.lowFpsCount++;
        if (this.lowFpsCount >= 3 && !this.performanceReduced) {
          this.orbitParticles.setParticleCount(50);
          this.performanceWarning.style.display = 'block';
          this.performanceReduced = true;
        }
      } else {
        this.lowFpsCount = Math.max(0, this.lowFpsCount - 1);
      }

      this.frameCountWindow = 0;
      this.lastWindowStart = now;
    }
  }

  private animate(): void {
    requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    const now = performance.now();

    this.starSystem.update(delta, this.speedMultiplier);
    this.orbitParticles.update(this.starSystem.planets);
    this.handleKeyboardMovement(delta);
    this.updateHoverRing(delta);

    if (!this.cameraAnimating) {
      this.camera.lookAt(this.getLookAtTarget());
    }

    this.renderer.render(this.scene, this.camera);
    this.updateFPS(now);
  }
}

new StarDanceApp();
