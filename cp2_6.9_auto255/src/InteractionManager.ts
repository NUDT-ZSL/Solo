import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { ParticleSystem, MotionMode, ThemeType } from './ParticleSystem';

export class InteractionManager {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particleSystem: ParticleSystem;
  private controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private motionModes: MotionMode[] = ['spiral', 'wave', 'drift'];
  private currentModeIndex: number = 0;
  private onThemeChangeCallback: ((theme: ThemeType) => void) | null = null;
  private onResetCallback: (() => void) | null = null;
  private boundOnPointerDownCapture: (e: PointerEvent) => void;
  private boundOnClickCapture: (e: MouseEvent) => void;
  private boundOnKeyDown: (e: KeyboardEvent) => void;
  private boundOnResize: () => void;
  private pointerDownClientX: number = 0;
  private pointerDownClientY: number = 0;
  private isDragging: boolean = false;
  private readonly DRAG_THRESHOLD: number = 5;

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    particleSystem: ParticleSystem
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.particleSystem = particleSystem;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.boundOnPointerDownCapture = this.onPointerDownCapture.bind(this);
    this.boundOnClickCapture = this.onClickCapture.bind(this);
    this.boundOnKeyDown = this.onKeyDown.bind(this);
    this.boundOnResize = this.onResize.bind(this);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = false;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 500;
    this.controls.mouseButtons = {
      LEFT: null as unknown as THREE.MOUSE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', this.boundOnPointerDownCapture, true);
    canvas.addEventListener('click', this.boundOnClickCapture, true);
    window.addEventListener('keydown', this.boundOnKeyDown);
    window.addEventListener('resize', this.boundOnResize);

    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const theme = target.dataset.theme as ThemeType;
        if (theme) {
          this.setTheme(theme);
          themeButtons.forEach((b) => b.classList.remove('active'));
          target.classList.add('active');
          if (this.onThemeChangeCallback) {
            this.onThemeChangeCallback(theme);
          }
        }
      });
    });

    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.particleSystem.clearAllTrails();
        if (this.onResetCallback) {
          this.onResetCallback();
        }
      });
    }
  }

  private onPointerDownCapture(event: PointerEvent): void {
    if (event.button === 0) {
      this.pointerDownClientX = event.clientX;
      this.pointerDownClientY = event.clientY;
      this.isDragging = false;

      const onPointerMove = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - this.pointerDownClientX;
        const dy = moveEvent.clientY - this.pointerDownClientY;
        if (Math.sqrt(dx * dx + dy * dy) > this.DRAG_THRESHOLD) {
          this.isDragging = true;
        }
      };

      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);

      event.stopPropagation();
    }
  }

  private onClickCapture(event: MouseEvent): void {
    if (event.button !== 0) return;
    if (this.isDragging) return;

    event.stopPropagation();
    event.preventDefault();

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);

    const spawnDistance = 100;
    const spawnPoint = new THREE.Vector3()
      .copy(this.camera.position)
      .add(cameraDirection.multiplyScalar(spawnDistance));

    const rayDirection = this.raycaster.ray.direction.clone();
    const offset = rayDirection.multiplyScalar(spawnDistance * 0.5);
    spawnPoint.add(offset);

    spawnPoint.x += (Math.random() - 0.5) * 10;
    spawnPoint.y += (Math.random() - 0.5) * 10;
    spawnPoint.z += (Math.random() - 0.5) * 10;

    this.particleSystem.spawnStarCore(spawnPoint);
  }

  private onKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();

    if (key === 'w') {
      this.currentModeIndex = (this.currentModeIndex + 1) % this.motionModes.length;
      const newMode = this.motionModes[this.currentModeIndex];
      this.particleSystem.setMotionMode(newMode);
    } else if (key === 's') {
      this.particleSystem.clearAllTrails();
      if (this.onResetCallback) {
        this.onResetCallback();
      }
    }
  }

  private onResize(): void {
    this.particleSystem.onResize();
  }

  private setTheme(theme: ThemeType): void {
    this.particleSystem.setTheme(theme);
  }

  public setOnThemeChangeCallback(callback: (theme: ThemeType) => void): void {
    this.onThemeChangeCallback = callback;
  }

  public setOnResetCallback(callback: () => void): void {
    this.onResetCallback = callback;
  }

  public update(): void {
    this.controls.update();
  }

  public dispose(): void {
    this.controls.dispose();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.boundOnPointerDownCapture, true);
    canvas.removeEventListener('click', this.boundOnClickCapture, true);
    window.removeEventListener('keydown', this.boundOnKeyDown);
    window.removeEventListener('resize', this.boundOnResize);
  }
}
