import * as THREE from 'three';
import { createStarMap, StarMapResult } from './starMap';
import { createPlanets, PlanetTrajectoryResult } from './planetTrajectory';
import { createHistoricalNotes, HistoricalNoteResult, HistoricalNote } from './historicalNotes';

const MIN_DISTANCE = 10;
const MAX_DISTANCE = 200;
const DEFAULT_DISTANCE = 60;

interface AppState {
  isRotating: boolean;
  rotationSpeed: number;
  planetSpeedMultiplier: number;
  constellationsVisible: boolean;
  focusedPlanetIndex: number | null;
}

class StarMapApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private starMap!: StarMapResult;
  private planets!: PlanetTrajectoryResult;
  private notes!: HistoricalNoteResult;

  private earth!: THREE.Mesh;
  private ambientLight!: THREE.AmbientLight;
  private dirLight!: THREE.DirectionalLight;

  private state: AppState;
  private clock: THREE.Clock;
  private time: number = 0;

  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private cameraTheta: number = Math.PI * 0.3;
  private cameraPhi: number = Math.PI * 0.35;
  private cameraDistance: number = DEFAULT_DISTANCE;
  private targetCameraTheta: number = Math.PI * 0.3;
  private targetCameraPhi: number = Math.PI * 0.35;
  private targetCameraDistance: number = DEFAULT_DISTANCE;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredSprite: THREE.Sprite | null = null;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) || document.body;
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.state = {
      isRotating: true,
      rotationSpeed: 0.08,
      planetSpeedMultiplier: 1.0,
      constellationsVisible: true,
      focusedPlanetIndex: null
    };

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });

    this.init();
  }

  private init(): void {
    this.setupRenderer();
    this.setupBackground();
    this.setupLights();
    this.setupEarth();
    this.setupSceneObjects();
    this.setupEventListeners();
    this.setupUIControls();
    this.updateCameraPosition();
    this.animate();
  }

  private setupRenderer(): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000008, 1);
    this.container.appendChild(this.renderer.domElement);
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#000010');
    gradient.addColorStop(0.4, '#050525');
    gradient.addColorStop(0.7, '#0a0a2e');
    gradient.addColorStop(1, '#02020a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const bgTex = new THREE.CanvasTexture(canvas);
    this.scene.background = bgTex;
  }

  private setupLights(): void {
    this.ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.dirLight.position.set(60, 40, 60);
    this.scene.add(this.dirLight);
  }

  private setupEarth(): void {
    const earthCanvas = document.createElement('canvas');
    earthCanvas.width = 512;
    earthCanvas.height = 256;
    const ctx = earthCanvas.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#1a3a5c');
    grad.addColorStop(0.3, '#1e4d73');
    grad.addColorStop(0.5, '#256089');
    grad.addColorStop(0.7, '#1e4d73');
    grad.addColorStop(1, '#1a3a5c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    ctx.fillStyle = 'rgba(40, 90, 60, 0.7)';
    const continents = [
      [60, 70, 80, 50], [150, 60, 60, 80], [280, 80, 70, 60],
      [350, 140, 60, 50], [100, 150, 70, 50], [220, 160, 100, 60],
      [180, 30, 30, 25], [420, 100, 40, 30]
    ];
    continents.forEach(([x, y, w, h]) => {
      ctx.beginPath();
      ctx.ellipse(x, y, w, h, Math.random() * 0.3, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 256;
      const r = 15 + Math.random() * 35;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.5, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    const earthTex = new THREE.CanvasTexture(earthCanvas);
    const geom = new THREE.SphereGeometry(4, 48, 48);
    const mat = new THREE.MeshStandardMaterial({
      map: earthTex,
      roughness: 0.75,
      metalness: 0.1
    });
    this.earth = new THREE.Mesh(geom, mat);
    this.scene.add(this.earth);
  }

  private setupSceneObjects(): void {
    this.starMap = createStarMap(this.scene);
    this.planets = createPlanets(this.scene);
    this.notes = createHistoricalNotes(this.scene);
    this.populateHistoryList();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onResize());

    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mouseup', () => this.onMouseUp());
    canvas.addEventListener('mouseleave', () => this.onMouseUp());
    canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    canvas.addEventListener('click', (e) => this.onClick(e));

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.lastMouseX = e.touches[0].clientX;
        this.lastMouseY = e.touches[0].clientY;
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this.isDragging) {
        const dx = e.touches[0].clientX - this.lastMouseX;
        const dy = e.touches[0].clientY - this.lastMouseY;
        this.targetCameraTheta -= dx * 0.005;
        this.targetCameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.targetCameraPhi - dy * 0.005));
        this.lastMouseX = e.touches[0].clientX;
        this.lastMouseY = e.touches[0].clientY;
      }
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isDragging) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.targetCameraTheta -= dx * 0.005;
      this.targetCameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.targetCameraPhi - dy * 0.005));
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.state.focusedPlanetIndex = null;
    }

    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.checkHover();
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY * 0.05;
    this.targetCameraDistance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, this.targetCameraDistance + delta));
  }

  private onClick(e: MouseEvent): void {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(this.notes.sprites);
    if (intersects.length > 0) {
      const sprite = intersects[0].object as THREE.Sprite;
      const noteId = (sprite as any).userData.noteId;
      const note = this.notes.notes.find((n) => n.id === noteId);
      if (note) {
        this.showNoteInfo(note);
        this.animateSpriteClick(sprite);
      }
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === '1') this.focusPlanet(0);
    else if (e.key === '2') this.focusPlanet(1);
    else if (e.key === '3') this.focusPlanet(2);
    else if (e.key === '0') this.resetCamera();
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.notes.sprites);

    if (this.hoveredSprite) {
      const base = (this.hoveredSprite as any).userData.basePosition as THREE.Vector3;
      if (base) {
        this.hoveredSprite.position.copy(base);
      }
      (this.hoveredSprite.material as THREE.SpriteMaterial).opacity = 1;
      document.body.style.cursor = 'default';
      this.hoveredSprite = null;
    }

    if (intersects.length > 0 && !this.isDragging) {
      const sprite = intersects[0].object as THREE.Sprite;
      this.hoveredSprite = sprite;
      sprite.position.y += 0.8;
      document.body.style.cursor = 'pointer';
    }
  }

  private animateSpriteClick(sprite: THREE.Sprite): void {
    const originalScale = sprite.scale.clone();
    const startTime = performance.now();
    const duration = 200;

    const anim = () => {
      const t = (performance.now() - startTime) / duration;
      if (t < 1) {
        const pulse = t < 0.5 ? t * 2 : 2 - t * 2;
        const s = 1 + pulse * 0.15;
        sprite.scale.set(originalScale.x * s, originalScale.y * s, originalScale.z * s);
        requestAnimationFrame(anim);
      } else {
        sprite.scale.copy(originalScale);
      }
    };
    anim();
  }

  private showNoteInfo(note: HistoricalNote): void {
    const panel = document.getElementById('info-panel');
    const title = document.getElementById('info-title');
    const year = document.getElementById('info-year');
    const desc = document.getElementById('info-description');

    if (panel && title && year && desc) {
      title.textContent = note.title;
      year.textContent = note.year;
      desc.textContent = note.description;
      panel.classList.add('visible');
    }
  }

  private hideNoteInfo(): void {
    const panel = document.getElementById('info-panel');
    if (panel) panel.classList.remove('visible');
  }

  private populateHistoryList(): void {
    const list = document.getElementById('history-list');
    if (!list) return;

    this.notes.notes.forEach((note) => {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = note.title;
      btn.style.display = 'block';
      btn.style.width = '100%';
      btn.style.textAlign = 'left';
      btn.style.margin = '4px 0';

      btn.addEventListener('click', (ev) => {
        this.createRipple(btn, ev);
        this.focusNote(note);
        this.showNoteInfo(note);
      });

      list.appendChild(btn);
    });
  }

  private createRipple(el: HTMLElement, ev: MouseEvent): void {
    const rect = el.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (ev.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (ev.clientY - rect.top - size / 2) + 'px';
    el.appendChild(ripple);
    setTimeout(() => ripple.remove(), 400);
  }

  private focusNote(note: HistoricalNote): void {
    const phi = (90 - note.position.lat) * (Math.PI / 180);
    const theta = (note.position.lon + 180) * (Math.PI / 180);
    this.targetCameraTheta = -theta;
    this.targetCameraPhi = phi;
    this.targetCameraDistance = note.position.radius + 10;
    this.state.focusedPlanetIndex = null;
  }

  private focusPlanet(index: number): void {
    if (index >= 0 && index < this.planets.planets.length) {
      this.state.focusedPlanetIndex = index;
    }
  }

  private resetCamera(): void {
    this.state.focusedPlanetIndex = null;
    this.targetCameraTheta = Math.PI * 0.3;
    this.targetCameraPhi = Math.PI * 0.35;
    this.targetCameraDistance = DEFAULT_DISTANCE;
  }

  private setupUIControls(): void {
    const toggleRotation = document.getElementById('toggle-rotation') as HTMLInputElement;
    if (toggleRotation) {
      toggleRotation.addEventListener('change', () => {
        this.state.isRotating = toggleRotation.checked;
      });
    }

    const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    const speedValue = document.getElementById('speed-value');
    if (speedSlider && speedValue) {
      speedSlider.addEventListener('input', () => {
        this.state.planetSpeedMultiplier = parseFloat(speedSlider.value);
        speedValue.textContent = this.state.planetSpeedMultiplier.toFixed(1) + 'x';
        speedValue.style.transform = 'scale(1.15)';
        speedValue.style.color = '#fff0a0';
        setTimeout(() => {
          speedValue.style.transform = 'scale(1)';
          speedValue.style.color = '#C9A93E';
        }, 150);
      });
    }

    const toggleConstellations = document.getElementById('toggle-constellations') as HTMLInputElement;
    if (toggleConstellations) {
      toggleConstellations.addEventListener('change', () => {
        this.state.constellationsVisible = toggleConstellations.checked;
        this.starMap.constellationLines.forEach((line) => {
          line.visible = this.state.constellationsVisible;
        });
      });
    }

    const closeBtn = document.querySelector('#info-panel .close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideNoteInfo());
    }

    const hamburger = document.getElementById('hamburger');
    const controlPanel = document.getElementById('control-panel');
    if (hamburger && controlPanel) {
      hamburger.addEventListener('click', () => {
        controlPanel.classList.toggle('open');
      });
    }
  }

  private updateCameraPosition(): void {
    this.cameraTheta += (this.targetCameraTheta - this.cameraTheta) * 0.08;
    this.cameraPhi += (this.targetCameraPhi - this.cameraPhi) * 0.08;
    this.cameraDistance += (this.targetCameraDistance - this.cameraDistance) * 0.08;

    const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    const y = this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private updateFocusedCamera(): void {
    if (this.state.focusedPlanetIndex === null) return;

    const planet = this.planets.planets[this.state.focusedPlanetIndex];
    if (!planet) return;

    const p = planet.mesh.position;
    const offset = new THREE.Vector3(8, 6, 10);
    const targetPos = new THREE.Vector3(p.x + offset.x, p.y + offset.y, p.z + offset.z);

    this.camera.position.lerp(targetPos, 0.05);
    this.camera.lookAt(p);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);
    this.time += delta;

    this.earth.rotation.y += delta * 0.1;

    if (this.state.isRotating && this.state.focusedPlanetIndex === null) {
      this.targetCameraTheta += delta * this.state.rotationSpeed;
    }

    this.starMap.update(delta, this.time);
    this.planets.update(delta, this.state.planetSpeedMultiplier);

    this.notes.sprites.forEach((sprite) => {
      if (sprite !== this.hoveredSprite) {
        const base = (sprite as any).userData.basePosition as THREE.Vector3;
        if (base) {
          const wobble = Math.sin(this.time * 1.5 + base.x) * 0.15;
          sprite.position.y = base.y + wobble;
        }
      }
    });

    if (this.state.focusedPlanetIndex !== null) {
      this.updateFocusedCamera();
    } else {
      this.updateCameraPosition();
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new StarMapApp('app');
});
