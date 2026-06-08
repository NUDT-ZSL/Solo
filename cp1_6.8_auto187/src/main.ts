import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SceneSetup } from './SceneSetup';
import { SilhouetteSystem } from './SilhouetteSystem';
import { mountControlPanel } from './ControlPanel';

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

class App {
  private sceneSetup: SceneSetup;
  private silhouetteSystem: SilhouetteSystem;
  private controls: OrbitControls;
  private clock: THREE.Clock;
  private animationId: number = 0;
  private isResetting = false;
  private resetStartTime = 0;
  private resetDuration = 800;
  private resetStartPos = new THREE.Vector3();
  private resetStartTarget = new THREE.Vector3();
  private readonly initialCameraPos = new THREE.Vector3(0, 0, 8);
  private readonly initialTarget = new THREE.Vector3(0, 0, 0);

  constructor() {
    const container = document.getElementById('canvas-container')!;
    this.sceneSetup = new SceneSetup(container);
    this.clock = new THREE.Clock();

    this.controls = new OrbitControls(this.sceneSetup.camera, this.sceneSetup.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.8;
    this.controls.enablePan = false;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 24;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.8;
    this.controls.target.copy(this.initialTarget);

    this.silhouetteSystem = new SilhouetteSystem(
      this.sceneSetup.scene,
      this.sceneSetup.camera,
      this.sceneSetup.renderer.domElement
    );

    const controlPanelRoot = document.getElementById('control-panel-root')!;
    mountControlPanel(controlPanelRoot, {
      onRotationSpeedChange: (value: number) => {
        this.silhouetteSystem.setRotationSpeedMultiplier(value);
      },
      onParticleSpeedChange: (value: number) => {
        this.silhouetteSystem.setParticleSpreadMultiplier(value);
      },
      onResetView: () => {
        this.resetCameraView();
      },
    });

    this.fadeIn();
    this.animate();
  }

  private fadeIn(): void {
    const container = document.getElementById('canvas-container')!;
    container.style.opacity = '0';
    container.style.transition = 'opacity 1.2s ease-out';
    requestAnimationFrame(() => {
      container.style.opacity = '1';
    });

    const panel = document.getElementById('control-panel-root')!;
    panel.style.opacity = '0';
    panel.style.transform = 'translateY(20px)';
    panel.style.transition = 'opacity 0.8s ease-out 0.5s, transform 0.8s ease-out 0.5s';
    requestAnimationFrame(() => {
      panel.style.opacity = '1';
      panel.style.transform = 'translateY(0)';
    });
  }

  private resetCameraView(): void {
    if (this.isResetting) return;
    this.isResetting = true;
    this.resetStartTime = performance.now();
    this.resetStartPos.copy(this.sceneSetup.camera.position);
    this.resetStartTarget.copy(this.controls.target);
    this.silhouetteSystem.resetSilhouettes();
  }

  private updateResetAnimation(): void {
    if (!this.isResetting) return;

    const elapsed = performance.now() - this.resetStartTime;
    const rawProgress = Math.min(elapsed / this.resetDuration, 1.0);
    const t = easeInOutCubic(rawProgress);

    this.sceneSetup.camera.position.lerpVectors(this.resetStartPos, this.initialCameraPos, t);
    this.controls.target.lerpVectors(this.resetStartTarget, this.initialTarget, t);

    if (rawProgress >= 1.0) {
      this.isResetting = false;
    }
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    this.controls.update();
    this.updateResetAnimation();

    this.sceneSetup.updateBackgroundStars(elapsedTime);
    this.silhouetteSystem.update(elapsedTime, deltaTime);

    this.sceneSetup.renderer.render(this.sceneSetup.scene, this.sceneSetup.camera);
  };

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.controls.dispose();
    this.silhouetteSystem.dispose();
    this.sceneSetup.dispose();
  }
}

new App();
