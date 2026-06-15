import * as THREE from 'three';
import { OceanScene } from './oceanScene';
import { Creatures } from './creatures';
import { InteractionManager } from './interaction';

class BluefinHorizonApp {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  
  public oceanScene: OceanScene;
  public creatures: Creatures;
  public interaction: InteractionManager;
  
  private clock: THREE.Clock;
  private animationId: number = 0;
  private isRunning: boolean = false;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x051D2D);
    
    const container = document.getElementById('canvas-container');
    if (!container) {
      throw new Error('Canvas container not found');
    }
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    
    container.appendChild(this.renderer.domElement);
    
    this.oceanScene = new OceanScene(this.scene);
    this.creatures = new Creatures(this.scene, this.oceanScene);
    this.interaction = new InteractionManager(this.camera, this.renderer, this.oceanScene, this.creatures);
    
    this.clock = new THREE.Clock();
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      this.handleResize();
    });
    
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stop();
      } else {
        this.start();
      }
    });
  }

  private handleResize(): void {
    const container = document.getElementById('canvas-container');
    if (!container) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.animate();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
    this.clock.stop();
  }

  private animate(): void {
    if (!this.isRunning) return;
    
    this.animationId = requestAnimationFrame(() => this.animate());
    
    const delta = Math.min(this.clock.getDelta(), 0.1);
    
    this.oceanScene.update(delta);
    this.creatures.update(delta, this.camera);
    this.interaction.update(delta);
    
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.stop();
    
    this.renderer.dispose();
    
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach(m => m.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
  }
}

let app: BluefinHorizonApp;

function initApp() {
  try {
    app = new BluefinHorizonApp();
    app.start();
    console.log('蓝鳍视界 - 海底生态观测系统已启动');
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

export { BluefinHorizonApp, app };
