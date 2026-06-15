declare const THREE: any;

import { setupScene, createOrbitControls } from './SceneSetup';
import { BrickFactory } from './BrickFactory';
import { BrickManager } from './BrickManager';
import { UIManager } from './UIManager';
import { BrickType, MAX_BRICKS, WARNING_THRESHOLD } from './types';

class App {
  private scene: any;
  private camera: any;
  private renderer: any;
  private controls: any;
  private groundPlane: any;

  private brickFactory: BrickFactory;
  private brickManager: BrickManager;
  private uiManager: UIManager;

  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 60;
  private hintTimeout: number | null = null;

  constructor() {
    const container = document.getElementById('canvas-container');
    if (!container) {
      throw new Error('Canvas container not found');
    }

    const instances = setupScene(container);
    this.scene = instances.scene;
    this.camera = instances.camera;
    this.renderer = instances.renderer;

    this.controls = createOrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 1, 0);
    this.controls.update();

    this.groundPlane = this.createGroundPlane();
    this.scene.add(this.groundPlane);

    this.brickFactory = new BrickFactory();

    this.brickManager = new BrickManager(this.scene, this.brickFactory, {
      onBrickCountChange: (count, max, threshold) => {
        this.uiManager.updateBrickCount(count, max, threshold);
      },
      onUndoStackChange: (canUndo) => {
        this.uiManager.updateUndoButton(canUndo);
      },
      onBrickPlaced: (_mesh) => {
        this.uiManager.deselectBrick();
      },
      onBrickRemoved: (_id) => {
        this.uiManager.deselectBrick();
      },
      onCollision: (position) => {
        this.brickManager.animateBounce(position);
        this.showCollisionHint();
      },
      onAllCleared: () => {
        this.uiManager.deselectBrick();
      }
    });

    this.uiManager = new UIManager(
      this.brickFactory,
      this.brickManager,
      {
        onBrickSelected: (_type: BrickType | null) => {
        },
        onUndoRequested: () => {
          this.brickManager.undo();
        },
        onClearRequested: () => {
          this.brickManager.clearAll(true);
        },
        onDeleteBrick: (id: string) => {
          this.brickManager.removeBrick(id, true);
        }
      },
      this.camera,
      this.renderer.domElement,
      this.controls,
      this.scene,
      this.groundPlane
    );

    this.uiManager.init();

    this.hideHintAfterDelay();

    this.animate();
  }

  private createGroundPlane(): any {
    const geometry = new THREE.PlaneGeometry(40, 40);
    const material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0;
    plane.userData.isGroundPlane = true;
    return plane;
  }

  private hideHintAfterDelay(): void {
    this.hintTimeout = window.setTimeout(() => {
      const hint = document.getElementById('hint');
      if (hint) {
        hint.style.opacity = '0';
        setTimeout(() => {
          if (hint.parentNode) {
            hint.parentNode.removeChild(hint);
          }
        }, 300);
      }
    }, 8000);
  }

  private showCollisionHint(): void {
    let hint = document.getElementById('collision-hint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'collision-hint';
      hint.style.cssText = `
        position: absolute;
        top: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(231, 76, 60, 0.9);
        color: #fff;
        padding: 8px 20px;
        border-radius: 6px;
        font-size: 14px;
        z-index: 20;
        pointer-events: none;
        transition: opacity 0.3s ease;
      `;
      hint.textContent = '位置被占用，无法放置';
      document.getElementById('app')?.appendChild(hint);
    }
    hint.style.opacity = '1';
    clearTimeout((hint as any)._timer);
    (hint as any)._timer = setTimeout(() => {
      hint!.style.opacity = '0';
    }, 800);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    this.frameCount++;
    const now = performance.now();
    if (now - this.lastTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastTime = now;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  destroy(): void {
    if (this.hintTimeout !== null) {
      clearTimeout(this.hintTimeout);
    }
    this.uiManager.destroy();
    this.controls.dispose();
    this.renderer.dispose();
  }
}

declare global {
  interface Window {
    app?: App;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  if (!window.THREE) {
    console.error('Three.js not loaded from CDN');
    return;
  }

  if (window.THREE.OrbitControls === undefined) {
    console.log('OrbitControls not loaded yet, fetching from examples CDN...');
  }

  loadOrbitControls().then(() => {
    try {
      window.app = new App();
      console.log('3D 积木拼图沙盘已启动，积木上限', MAX_BRICKS, '，警告阈值', WARNING_THRESHOLD);
    } catch (e) {
      console.error('Failed to initialize app:', e);
    }
  });
});

function loadOrbitControls(): Promise<void> {
  return new Promise((resolve) => {
    if (window.THREE.OrbitControls) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
    script.onload = () => resolve();
    script.onerror = () => {
      console.warn('Failed to load OrbitControls from CDN, using fallback');
      resolve();
    };
    document.head.appendChild(script);
  });
}
