import * as THREE from 'three';
import { KaleidoscopeCore } from './kaleidoscopeCore';
import { InteractionManager } from './interaction';
import { UIManager } from './ui';

class KaleidoscopeApp {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private kaleidoscope!: KaleidoscopeCore;
  private interaction!: InteractionManager;
  private ui!: UIManager;
  private clock: THREE.Clock;
  private elapsedTime: number = 0;
  private animationFrameId: number = 0;
  private isRunning: boolean = false;

  private ambientParticles: THREE.Points | null = null;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050010, 0.025);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    this.init();
  }

  private init(): void {
    this.kaleidoscope = new KaleidoscopeCore(2000);
    this.scene.add(this.kaleidoscope.mesh);

    this.createAmbientParticles();

    this.interaction = new InteractionManager(
      this.renderer.domElement,
      this.camera,
      this.kaleidoscope
    );

    const uiContainer = document.getElementById('control-panel');
    if (uiContainer) {
      this.ui = new UIManager({
        container: uiContainer,
        kaleidoscope: this.kaleidoscope,
        initialSymmetry: 6
      });
    }

    window.addEventListener('resize', this.onResize);

    this.isRunning = true;
    this.animate();
  }

  private createAmbientParticles(): void {
    const count = 800;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const r = 8 + Math.random() * 25;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const hue = 0.65 + Math.random() * 0.25;
      const color = new THREE.Color().setHSL(hue, 0.7, 0.5 + Math.random() * 0.3);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.ambientParticles = new THREE.Points(geo, mat);
    this.scene.add(this.ambientParticles);
  }

  private onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private animate = (): void => {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getDelta();
    this.elapsedTime += deltaTime;

    this.kaleidoscope.update(deltaTime, this.elapsedTime);
    this.interaction.update(deltaTime);

    if (this.ambientParticles) {
      this.ambientParticles.rotation.y = this.elapsedTime * 0.02;
      this.ambientParticles.rotation.x = this.elapsedTime * 0.01;
      const positions = this.ambientParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 2] += Math.sin(this.elapsedTime + i * 0.001) * 0.005;
      }
      this.ambientParticles.geometry.attributes.position.needsUpdate = true;
    }

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    this.isRunning = false;
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onResize);

    this.interaction?.dispose();
    this.ui?.dispose();
    this.kaleidoscope?.dispose();

    if (this.ambientParticles) {
      this.ambientParticles.geometry.dispose();
      (this.ambientParticles.material as THREE.Material).dispose();
      this.scene.remove(this.ambientParticles);
    }

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

let app: KaleidoscopeApp | null = null;

function bootstrap(): void {
  try {
    app = new KaleidoscopeApp('canvas-container');
  } catch (err) {
    console.error('Failed to initialize kaleidoscope:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

window.addEventListener('beforeunload', () => {
  app?.dispose();
});

export { KaleidoscopeApp };
