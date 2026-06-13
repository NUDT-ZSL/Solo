import * as THREE from 'three';
import { ParticleText, type AnimationMode } from './particleText';
import { ControlsPanel, type ControlValues } from './controls';

const PRESET_COLORS: Record<string, string> = {
  cyan: '#22d3ee',
  magenta: '#e879f9',
  gold: '#fcd34d',
  lime: '#a3e635',
};

function pickRandomColor(): { preset: 'cyan' | 'magenta' | 'gold' | 'lime'; hex: string } {
  const keys = ['cyan', 'magenta', 'gold', 'lime'] as const;
  const key = keys[Math.floor(Math.random() * keys.length)];
  return { preset: key, hex: PRESET_COLORS[key] };
}

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private canvasContainer: HTMLElement;
  private clock: THREE.Clock;

  private particleText: ParticleText;
  private controlsPanel: ControlsPanel;
  private gridHelper: THREE.GridHelper | null = null;

  private mouseX: number = 0;
  private mouseY: number = 0;
  private targetCameraX: number = 0;
  private targetCameraY: number = 0;

  private initialColor: { preset: 'cyan' | 'magenta' | 'gold' | 'lime'; hex: string };

  constructor() {
    this.canvasContainer = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0f1a);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.set(0, 0, 18);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.canvasContainer.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    this.initialColor = pickRandomColor();

    this.particleText = new ParticleText(
      this.scene,
      {
        text: 'HELLO',
        particlesPerLetter: [600, 800],
        color: this.initialColor.hex,
        size: 2,
        maxParticles: 10000,
        zOffsetRange: [0, 3],
      },
      {
        onParticleCountChange: (count) => {
          this.controlsPanel.updateParticleCount(count);
        },
        onFpsUpdate: (fps) => {
          this.controlsPanel.updateFps(fps);
        },
      }
    );

    const initialValues: ControlValues = {
      colorPreset: this.initialColor.preset,
      customColor: '#ffffff',
      particleSize: 2,
      speedMultiplier: 1,
      animationMode: 'spiral',
      showGrid: false,
    };

    this.controlsPanel = new ControlsPanel(
      document.getElementById('app')!,
      initialValues,
      {
        onColorChange: (color: string) => this.particleText.setColor(color),
        onSizeChange: (size: number) => this.particleText.setSize(size),
        onSpeedChange: (multiplier: number) => this.particleText.setSpeedMultiplier(multiplier),
        onAnimationChange: (mode: AnimationMode) => this.particleText.setAnimation(mode),
        onGridToggle: (show: boolean) => this.toggleGrid(show),
      }
    );

    this.setupInput();
    this.setupEventListeners();
    this.animate();
  }

  private setupInput(): void {
    const input = document.getElementById('text-input') as HTMLInputElement;
    const wrapper = document.getElementById('input-wrapper');

    if (input) {
      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const value = target.value.toUpperCase();
        this.particleText.setText(value);
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          input.blur();
        }
      });
    }

    if (input && wrapper) {
      input.addEventListener('focus', () => {
        wrapper.classList.add('focused');
      });
      input.addEventListener('blur', () => {
        wrapper.classList.remove('focused');
      });
    }
  }

  private toggleGrid(show: boolean): void {
    if (show && !this.gridHelper) {
      this.gridHelper = new THREE.GridHelper(40, 40, 0x334155, 0x1e293b);
      this.gridHelper.position.y = -6;
      this.scene.add(this.gridHelper);
    } else if (!show && this.gridHelper) {
      this.scene.remove(this.gridHelper);
      this.gridHelper.geometry.dispose();
      (this.gridHelper.material as THREE.Material).dispose();
      this.gridHelper = null;
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('touchmove', this.handleTouchMove, { passive: true });
  }

  private handleResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private handleMouseMove = (e: MouseEvent): void => {
    this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    this.targetCameraX = this.mouseX * 2;
    this.targetCameraY = -this.mouseY * 1.5;
  };

  private handleTouchMove = (e: TouchEvent): void => {
    if (e.touches.length > 0) {
      const t = e.touches[0];
      this.mouseX = (t.clientX / window.innerWidth) * 2 - 1;
      this.mouseY = (t.clientY / window.innerHeight) * 2 - 1;
      this.targetCameraX = this.mouseX * 2;
      this.targetCameraY = -this.mouseY * 1.5;
    }
  };

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();

    this.camera.position.x += (this.targetCameraX - this.camera.position.x) * 0.04;
    this.camera.position.y += (this.targetCameraY - this.camera.position.y) * 0.04;
    this.camera.lookAt(0, 0, 0);

    this.particleText.update(delta);
    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('touchmove', this.handleTouchMove);
    this.particleText.dispose();
    this.toggleGrid(false);
    this.renderer.dispose();
  }
}

function boot(): void {
  const app = new App();
  (window as unknown as { __app?: App }).__app = app;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
