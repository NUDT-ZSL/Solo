import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import { SolarSystem, PlanetData } from './solarSystem';

export class InteractionManager {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private solarSystem: SolarSystem;
  private controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private doubleClickTimer: ReturnType<typeof setTimeout> | null = null;
  private lastClickTime = 0;
  private isFlyingTo = false;

  private infoPanel: HTMLElement;
  private planetNameEl: HTMLElement;
  private planetNameENEl: HTMLElement;
  private planetRadiusEl: HTMLElement;
  private planetPeriodEl: HTMLElement;
  private planetMoonsEl: HTMLElement;
  private planetDescEl: HTMLElement;

  private readonly defaultCameraPos = new THREE.Vector3(0, 60, 120);
  private readonly defaultTarget = new THREE.Vector3(0, 0, 0);

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    solarSystem: SolarSystem,
    domElement: HTMLElement
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.solarSystem = solarSystem;

    this.controls = new OrbitControls(camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 250;
    this.controls.enablePan = true;
    this.controls.target.copy(this.defaultTarget);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.infoPanel = document.getElementById('info-panel')!;
    this.planetNameEl = document.getElementById('planet-name')!;
    this.planetNameENEl = document.getElementById('planet-name-en')!;
    this.planetRadiusEl = document.getElementById('planet-radius')!;
    this.planetPeriodEl = document.getElementById('planet-period')!;
    this.planetMoonsEl = document.getElementById('planet-moons')!;
    this.planetDescEl = document.getElementById('planet-desc')!;

    this.setupEventListeners(domElement);
  }

  private setupEventListeners(domElement: HTMLElement): void {
    domElement.addEventListener('click', this.onClick.bind(this));
    domElement.addEventListener('dblclick', this.onDoubleClick.bind(this));

    const closeBtn = document.getElementById('info-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideInfoPanel());
    }

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onClick(event: MouseEvent): void {
    this.updateMouse(event);
  }

  private onDoubleClick(event: MouseEvent): void {
    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const clickableMeshes = this.solarSystem.getPlanetMeshes();
    const intersects = this.raycaster.intersectObjects(clickableMeshes, false);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const data = this.solarSystem.getPlanetDataByMesh(hitMesh);

      if (data) {
        this.flyToPlanet(hitMesh, data);
      } else if (hitMesh.name === 'Sun') {
        this.flyToSun();
      }
    }
  }

  private updateMouse(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private flyToPlanet(mesh: THREE.Mesh, data: PlanetData): void {
    if (this.isFlyingTo) return;
    this.isFlyingTo = true;

    const worldPos = this.solarSystem.getWorldPositionOfPlanetMesh(mesh);
    const distance = Math.max(data.radius * 5, 8);
    const cameraTarget = new THREE.Vector3(
      worldPos.x + distance * 0.5,
      worldPos.y + distance * 0.4,
      worldPos.z + distance * 0.5
    );

    gsap.to(this.camera.position, {
      x: cameraTarget.x,
      y: cameraTarget.y,
      z: cameraTarget.z,
      duration: 0.8,
      ease: 'power2.out',
      onUpdate: () => {
        this.controls.target.lerp(worldPos, 0.1);
        this.controls.update();
      },
      onComplete: () => {
        this.controls.target.copy(worldPos);
        this.controls.update();
        this.isFlyingTo = false;
        this.showInfoPanel(data);
      },
    });

    gsap.to(this.controls.target, {
      x: worldPos.x,
      y: worldPos.y,
      z: worldPos.z,
      duration: 0.8,
      ease: 'power2.out',
    });
  }

  private flyToSun(): void {
    if (this.isFlyingTo) return;
    this.isFlyingTo = true;

    const cameraTarget = new THREE.Vector3(20, 15, 20);

    gsap.to(this.camera.position, {
      x: cameraTarget.x,
      y: cameraTarget.y,
      z: cameraTarget.z,
      duration: 0.8,
      ease: 'power2.out',
      onUpdate: () => {
        this.controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.1);
        this.controls.update();
      },
      onComplete: () => {
        this.controls.target.set(0, 0, 0);
        this.controls.update();
        this.isFlyingTo = false;
      },
    });

    gsap.to(this.controls.target, {
      x: 0,
      y: 0,
      z: 0,
      duration: 0.8,
      ease: 'power2.out',
    });
  }

  private showInfoPanel(data: PlanetData): void {
    this.planetNameEl.textContent = data.nameCN;
    this.planetNameEl.style.color = `#${data.color.toString(16).padStart(6, '0')}`;
    this.planetNameENEl.textContent = data.name;
    this.planetRadiusEl.textContent = data.realRadius;
    this.planetPeriodEl.textContent = `${data.orbitPeriodYears} 地球年`;
    this.planetMoonsEl.textContent = `${data.moonCount}`;
    this.planetDescEl.textContent = data.description;

    this.infoPanel.classList.add('visible');
  }

  private hideInfoPanel(): void {
    this.infoPanel.classList.remove('visible');
  }

  resetView(): void {
    if (this.isFlyingTo) return;
    this.isFlyingTo = true;
    this.hideInfoPanel();

    gsap.to(this.camera.position, {
      x: this.defaultCameraPos.x,
      y: this.defaultCameraPos.y,
      z: this.defaultCameraPos.z,
      duration: 1.0,
      ease: 'power2.inOut',
      onUpdate: () => {
        this.controls.update();
      },
      onComplete: () => {
        this.controls.target.copy(this.defaultTarget);
        this.controls.update();
        this.isFlyingTo = false;
      },
    });

    gsap.to(this.controls.target, {
      x: this.defaultTarget.x,
      y: this.defaultTarget.y,
      z: this.defaultTarget.z,
      duration: 1.0,
      ease: 'power2.inOut',
    });
  }

  update(): void {
    this.controls.update();
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  dispose(): void {
    this.controls.dispose();
  }
}

export class ControlPanel {
  private isPlaying = true;
  private speedMultiplier = 1;
  private readonly speedOptions = [0.5, 1, 2, 5];

  private playPauseBtn: HTMLButtonElement;
  private playPauseText: HTMLElement;
  private playPauseIcon: SVGElement;
  private speedSlider: HTMLInputElement;
  private speedValue: HTMLElement;
  private resetBtn: HTMLButtonElement;
  private interactionManager: InteractionManager | null = null;

  constructor() {
    this.playPauseBtn = document.getElementById('btn-play-pause') as HTMLButtonElement;
    this.playPauseText = document.getElementById('play-pause-text')!;
    this.playPauseIcon = document.getElementById('play-pause-icon') as unknown as SVGElement;
    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.speedValue = document.getElementById('speed-value')!;
    this.resetBtn = document.getElementById('btn-reset') as HTMLButtonElement;

    this.setupEvents();
  }

  setInteractionManager(manager: InteractionManager): void {
    this.interactionManager = manager;
  }

  private setupEvents(): void {
    this.playPauseBtn.addEventListener('click', () => {
      this.isPlaying = !this.isPlaying;
      this.updatePlayPauseUI();
      this.animateButton(this.playPauseBtn);
    });

    this.speedSlider.addEventListener('input', () => {
      const idx = parseInt(this.speedSlider.value, 10);
      this.speedMultiplier = this.speedOptions[idx];
      this.speedValue.textContent = `${this.speedMultiplier}x`;
    });

    this.resetBtn.addEventListener('click', () => {
      if (this.interactionManager) {
        this.interactionManager.resetView();
      }
      this.animateButton(this.resetBtn);
    });
  }

  private updatePlayPauseUI(): void {
    if (this.isPlaying) {
      this.playPauseText.textContent = '暂停';
      this.playPauseIcon.innerHTML = '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>';
      this.playPauseBtn.classList.remove('active');
    } else {
      this.playPauseText.textContent = '播放';
      this.playPauseIcon.innerHTML = '<polygon points="6,4 20,12 6,20"/>';
      this.playPauseBtn.classList.add('active');
    }
  }

  private animateButton(btn: HTMLButtonElement): void {
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => {
      btn.style.transform = 'scale(1.0)';
    }, 150);
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getSpeedMultiplier(): number {
    return this.speedMultiplier;
  }
}
