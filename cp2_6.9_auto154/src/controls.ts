import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { ColorTheme } from './nebula';

export interface ControlCallbacks {
  onThemeChange: (theme: ColorTheme) => void;
  onSizeChange: (size: number) => void;
  onSpeedChange: (speed: number) => void;
  onParticleCountChange: (delta: number) => number;
}

const INITIAL_CAMERA_POSITION = new THREE.Vector3(0, 50, 150);
const INITIAL_TARGET = new THREE.Vector3(0, 0, 0);
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5.0;

export class InteractionControls {
  private orbitControls: OrbitControls;
  private camera: THREE.PerspectiveCamera;
  private callbacks: ControlCallbacks;

  private sizeSlider: HTMLInputElement;
  private speedSlider: HTMLInputElement;
  private sizeValue: HTMLElement;
  private speedValue: HTMLElement;
  private themeButtons: NodeListOf<HTMLButtonElement>;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    callbacks: ControlCallbacks
  ) {
    this.camera = camera;
    this.callbacks = callbacks;

    this.orbitControls = new OrbitControls(camera, domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.1;
    this.orbitControls.minDistance = INITIAL_CAMERA_POSITION.length() * MIN_ZOOM;
    this.orbitControls.maxDistance = INITIAL_CAMERA_POSITION.length() * MAX_ZOOM;
    this.orbitControls.target.copy(INITIAL_TARGET);
    this.orbitControls.enablePan = false;

    this.sizeSlider = document.getElementById('particle-size') as HTMLInputElement;
    this.speedSlider = document.getElementById('rotation-speed') as HTMLInputElement;
    this.sizeValue = document.getElementById('size-value') as HTMLElement;
    this.speedValue = document.getElementById('speed-value') as HTMLElement;
    this.themeButtons = document.querySelectorAll('.theme-btn');

    this.setupUIControls();
    this.setupKeyboardControls();
  }

  private setupUIControls(): void {
    this.sizeSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.sizeValue.textContent = value.toFixed(2);
      this.callbacks.onSizeChange(value);
    });

    this.speedSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.speedValue.textContent = value.toFixed(4);
      this.callbacks.onSpeedChange(value);
    });

    this.themeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme as ColorTheme;
        this.setActiveThemeButton(theme);
        this.callbacks.onThemeChange(theme);
      });
    });
  }

  private setActiveThemeButton(theme: ColorTheme): void {
    this.themeButtons.forEach((btn) => {
      if (btn.dataset.theme === theme) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private setupKeyboardControls(): void {
    window.addEventListener('keydown', (e) => {
      switch (e.key.toLowerCase()) {
        case 'r':
          this.resetCamera();
          break;
        case '1':
          this.setActiveThemeButton('A');
          this.callbacks.onThemeChange('A');
          this.sizeSlider.value = '1.25';
          this.sizeValue.textContent = '1.25';
          this.speedSlider.value = '0.002';
          this.speedValue.textContent = '0.0020';
          break;
        case '2':
          this.setActiveThemeButton('B');
          this.callbacks.onThemeChange('B');
          break;
        case '+':
        case '=':
          this.callbacks.onParticleCountChange(1);
          break;
        case '-':
        case '_':
          this.callbacks.onParticleCountChange(-1);
          break;
      }
    });
  }

  public resetCamera(): void {
    this.camera.position.copy(INITIAL_CAMERA_POSITION);
    this.orbitControls.target.copy(INITIAL_TARGET);
    this.orbitControls.update();
  }

  public update(): void {
    this.orbitControls.update();
  }

  public dispose(): void {
    this.orbitControls.dispose();
  }
}
