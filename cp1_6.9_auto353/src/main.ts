import * as THREE from 'three';
import { createScene, updateStars, SceneSetup } from './scene';
import { createInstrumentManager, InstrumentManager, InstrumentType } from './instruments';
import { createParticleSystem, ParticleSystem } from './particles';

class App {
  private sceneSetup: SceneSetup;
  private instrumentManager: InstrumentManager;
  private particleSystem: ParticleSystem;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private clock: THREE.Clock;
  private running: boolean = true;

  private isDragging: boolean = false;
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };
  private cameraAngle: { theta: number; phi: number } = { theta: 0, phi: Math.PI / 4 };
  private cameraDistance: number = 135;
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 10, 0);
  private autoRotateSpeed: number = 0.08;
  private autoRotate: boolean = true;
  private userInteractedTime: number = 0;

  private fpsElement: HTMLElement | null = null;
  private frameCount: number = 0;
  private fpsTime: number = 0;

  constructor() {
    this.sceneSetup = createScene('canvas-container');
    this.instrumentManager = createInstrumentManager();
    this.particleSystem = createParticleSystem();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.setupScene();
    this.setupEvents();
    this.setupInstrumentCallbacks();
    this.animate();
  }

  private setupScene(): void {
    this.instrumentManager.addToScene(this.sceneSetup.scene);
    this.particleSystem.addToScene(this.sceneSetup.scene);

    const polar = Math.acos(
      this.sceneSetup.camera.position.y /
        this.sceneSetup.camera.position.distanceTo(new THREE.Vector3(0, 0, 0))
    );
    const azi = Math.atan2(
      this.sceneSetup.camera.position.z,
      this.sceneSetup.camera.position.x
    );
    this.cameraAngle = { theta: azi, phi: polar };

    this.fpsElement = document.getElementById('fps');
  }

  private setupEvents(): void {
    const dom = this.sceneSetup.renderer.domElement;
    const container = this.sceneSetup.container;

    window.addEventListener('keydown', (e) => {
      const inst = this.instrumentManager.getInstrumentByKey(e.key);
      if (inst) {
        inst.trigger();
      }
    });

    dom.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.previousMouse = { x: e.clientX, y: e.clientY };
      this.autoRotate = false;
      this.userInteractedTime = performance.now();

      const rect = container.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      this.mouse.x = nx * 2 - 1;
      this.mouse.y = -(ny * 2 - 1);

      this.checkInstrumentClick();
      dom.setPointerCapture(e.pointerId);
    });

    dom.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.previousMouse.x;
      const dy = e.clientY - this.previousMouse.y;
      this.previousMouse = { x: e.clientX, y: e.clientY };

      this.cameraAngle.theta -= dx * 0.005;
      this.cameraAngle.phi = Math.max(0.15, Math.min(Math.PI / 2 - 0.05, this.cameraAngle.phi - dy * 0.005));
    });

    dom.addEventListener('pointerup', (e) => {
      this.isDragging = false;
      try { dom.releasePointerCapture(e.pointerId); } catch {}
    });

    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY * 0.1;
      this.cameraDistance = Math.max(60, Math.min(280, this.cameraDistance + delta));
      this.autoRotate = false;
      this.userInteractedTime = performance.now();
    }, { passive: false });

    dom.addEventListener('pointercancel', () => {
      this.isDragging = false;
    });
  }

  private checkInstrumentClick(): void {
    this.raycaster.setFromCamera(this.mouse, this.sceneSetup.camera);
    const meshes = this.instrumentManager.getAllMeshes();
    const intersects = this.raycaster.intersectObjects(meshes, true);
    for (const hit of intersects) {
      const inst = this.instrumentManager.getInstrumentByObject(hit.object);
      if (inst) {
        inst.trigger();
        break;
      }
    }
  }

  private setupInstrumentCallbacks(): void {
    for (const [type, inst] of this.instrumentManager.instruments) {
      inst.onTrigger((triggeredType, position) => {
        const time = performance.now() / 1000;
        this.particleSystem.trigger(triggeredType, position, time);
      });
    }
  }

  private updateCamera(): void {
    const now = performance.now();
    if (!this.isDragging && !this.autoRotate && now - this.userInteractedTime > 4000) {
      this.autoRotate = true;
    }
    if (this.autoRotate) {
      this.cameraAngle.theta += this.autoRotateSpeed * 0.001 * 16;
    }

    const { theta, phi } = this.cameraAngle;
    const r = this.cameraDistance;
    const y = r * Math.cos(phi);
    const xz = r * Math.sin(phi);
    const x = xz * Math.cos(theta);
    const z = xz * Math.sin(theta);

    const targetPos = new THREE.Vector3(
      this.cameraTarget.x + x,
      this.cameraTarget.y + y,
      this.cameraTarget.z + z
    );

    this.sceneSetup.camera.position.lerp(targetPos, 0.12);
    this.sceneSetup.camera.lookAt(this.cameraTarget);
  }

  private updateFPS(dt: number): void {
    this.frameCount++;
    this.fpsTime += dt;
    if (this.fpsTime >= 0.5) {
      const fps = Math.round(this.frameCount / this.fpsTime);
      if (this.fpsElement) {
        const particles = this.particleSystem.getParticleCount();
        this.fpsElement.textContent = `FPS: ${fps} | 粒子: ${particles}`;
      }
      this.frameCount = 0;
      this.fpsTime = 0;
    }
  }

  private animate = (): void => {
    if (!this.running) return;
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const time = performance.now() / 1000;

    this.updateCamera();
    this.instrumentManager.update(dt, time);
    this.particleSystem.update(dt, time);
    updateStars(this.sceneSetup.scene, time);
    this.updateFPS(dt);

    this.sceneSetup.renderer.render(this.sceneSetup.scene, this.sceneSetup.camera);
  };

  destroy(): void {
    this.running = false;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    new App();
  } catch (e) {
    console.error('Failed to initialize:', e);
  }
});
