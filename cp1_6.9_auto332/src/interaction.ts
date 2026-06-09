import * as THREE from 'three';
import { SceneManager } from './scene';
import { ParticleSystem } from './particles';

interface PulseEffect {
  origin: THREE.Vector3;
  radius: number;
  maxRadius: number;
  speed: number;
  life: number;
  maxLife: number;
  shell: THREE.Mesh;
  affectedParticles: Set<number>;
}

export class InteractionManager {
  sceneManager: SceneManager;
  particleSystem: ParticleSystem;
  domElement: HTMLCanvasElement;

  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  hoveredIndex: number = -1;

  isDragging: boolean = false;
  dragStartX: number = 0;
  dragStartY: number = 0;
  rotationVelocityX: number = 0;
  rotationVelocityY: number = 0;
  targetRotationX: number = 0;
  targetRotationY: number = 0;

  cameraDistance: number = 35;
  targetCameraDistance: number = 35;
  minDistance: number = 10;
  maxDistance: number = 50;

  pulses: PulseEffect[] = [];
  flashTimer: number = 0;
  isFlashing: boolean = false;

  onParticleClick?: (index: number) => void;

  constructor(
    sceneManager: SceneManager,
    particleSystem: ParticleSystem
  ) {
    this.sceneManager = sceneManager;
    this.particleSystem = particleSystem;
    this.domElement = sceneManager.renderer.domElement;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points.threshold = 0.8;
    this.mouse = new THREE.Vector2();

    this.bindEvents();
  }

  bindEvents(): void {
    const dom = this.domElement;

    dom.addEventListener('mousedown', (e) => this.onMouseDown(e));
    dom.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    dom.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    dom.addEventListener('click', (e) => this.onClick(e));

    dom.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    dom.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    dom.addEventListener('touchend', (e) => this.onTouchEnd(e));
  }

  private screenToNDC(clientX: number, clientY: number): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private pickParticle(): number {
    this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
    const intersects = this.raycaster.intersectObject(this.particleSystem.points, false);
    if (intersects.length > 0 && intersects[0].index !== undefined) {
      return intersects[0].index;
    }
    return -1;
  }

  onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.rotationVelocityX = 0;
    this.rotationVelocityY = 0;
  }

  onMouseMove(e: MouseEvent): void {
    this.screenToNDC(e.clientX, e.clientY);

    if (this.isDragging) {
      const deltaX = e.clientX - this.dragStartX;
      const deltaY = e.clientY - this.dragStartY;

      this.rotationVelocityY = deltaX * 0.005;
      this.rotationVelocityX = deltaY * 0.005;

      this.targetRotationY += this.rotationVelocityY;
      this.targetRotationX += this.rotationVelocityX;

      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;

      this.particleSystem.setHoverParticle(this.hoveredIndex, false);
      this.hoveredIndex = -1;
      this.domElement.style.cursor = 'grabbing';
    } else {
      const index = this.pickParticle();
      if (index !== this.hoveredIndex) {
        this.particleSystem.setHoverParticle(this.hoveredIndex, false);
        this.hoveredIndex = index;
        this.particleSystem.setHoverParticle(this.hoveredIndex, true);
      }
      this.domElement.style.cursor = index >= 0 ? 'pointer' : 'grab';
    }
  }

  onMouseUp(_e: MouseEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
    }
  }

  onWheel(e: WheelEvent): void {
    e.preventDefault();
    const scrollAmount = e.deltaY * 0.05;
    this.targetCameraDistance = THREE.MathUtils.clamp(
      this.targetCameraDistance + scrollAmount,
      this.minDistance,
      this.maxDistance
    );
  }

  onClick(e: MouseEvent): void {
    if (this.isDragging) return;
    this.screenToNDC(e.clientX, e.clientY);
    const index = this.pickParticle();
    if (index >= 0) {
      this.triggerPulse(index);
      this.triggerFlash();
      if (this.onParticleClick) this.onParticleClick(index);
    }
  }

  onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      e.preventDefault();
      const t = e.touches[0];
      this.isDragging = true;
      this.dragStartX = t.clientX;
      this.dragStartY = t.clientY;
      this.screenToNDC(t.clientX, t.clientY);
    }
  }

  onTouchMove(e: TouchEvent): void {
    if (e.touches.length === 1 && this.isDragging) {
      e.preventDefault();
      const t = e.touches[0];
      const deltaX = t.clientX - this.dragStartX;
      const deltaY = t.clientY - this.dragStartY;

      this.rotationVelocityY = deltaX * 0.005;
      this.rotationVelocityX = deltaY * 0.005;

      this.targetRotationY += this.rotationVelocityY;
      this.targetRotationX += this.rotationVelocityX;

      this.dragStartX = t.clientX;
      this.dragStartY = t.clientY;
    }
  }

  onTouchEnd(e: TouchEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
      if (e.changedTouches.length === 1 && Math.abs(this.rotationVelocityX) < 0.002 && Math.abs(this.rotationVelocityY) < 0.002) {
        const t = e.changedTouches[0];
        this.screenToNDC(t.clientX, t.clientY);
        const index = this.pickParticle();
        if (index >= 0) {
          this.triggerPulse(index);
          this.triggerFlash();
          if (this.onParticleClick) this.onParticleClick(index);
        }
      }
    }
  }

  triggerPulse(particleIndex: number): void {
    const origin = this.particleSystem.getParticleWorldPosition(particleIndex);

    const shellGeometry = new THREE.SphereGeometry(0.1, 32, 32);
    const shellMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      wireframe: false,
      depthWrite: false
    });
    const shell = new THREE.Mesh(shellGeometry, shellMaterial);
    shell.position.copy(origin);
    this.sceneManager.scene.add(shell);

    const pulse: PulseEffect = {
      origin,
      radius: 0.1,
      maxRadius: 30,
      speed: 20,
      life: 0,
      maxLife: 1.5,
      shell,
      affectedParticles: new Set()
    };

    this.pulses.push(pulse);
  }

  triggerFlash(): void {
    this.isFlashing = true;
    this.flashTimer = 0;
    this.sceneManager.setBackgroundFlash(true);
  }

  updatePulses(deltaTime: number): void {
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const pulse = this.pulses[i];
      pulse.life += deltaTime;
      pulse.radius += pulse.speed * deltaTime;

      const shellScale = pulse.radius / 0.1;
      pulse.shell.scale.setScalar(shellScale);

      const alpha = Math.max(0, 0.5 * (1 - pulse.life / pulse.maxLife));
      (pulse.shell.material as THREE.MeshBasicMaterial).opacity = alpha;

      this.updatePulseParticleEffects(pulse);

      if (pulse.life >= pulse.maxLife || pulse.radius >= pulse.maxRadius) {
        this.sceneManager.scene.remove(pulse.shell);
        pulse.shell.geometry.dispose();
        (pulse.shell.material as THREE.Material).dispose();
        this.pulses.splice(i, 1);
      }
    }
  }

  private updatePulseParticleEffects(pulse: PulseEffect): void {
    const threshold = 1.5;
    const particles = this.particleSystem.particles;

    for (let i = 0; i < particles.length; i++) {
      if (pulse.affectedParticles.has(i)) continue;

      const worldPos = this.particleSystem.getParticleWorldPosition(i);
      const dist = worldPos.distanceTo(pulse.origin);

      if (Math.abs(dist - pulse.radius) < threshold) {
        this.particleSystem.setPulseBrightness(i, 0.5);
        pulse.affectedParticles.add(i);
      }
    }
  }

  updateFlash(deltaTime: number): void {
    if (this.isFlashing) {
      this.flashTimer += deltaTime;
      if (this.flashTimer >= 0.3) {
        this.isFlashing = false;
        this.sceneManager.setBackgroundFlash(false);
      }
    }
  }

  updateCamera(deltaTime: number): void {
    this.cameraDistance = THREE.MathUtils.lerp(
      this.cameraDistance,
      this.targetCameraDistance,
      Math.min(1, deltaTime * 5)
    );

    this.sceneManager.camera.position.set(0, 0, this.cameraDistance);
    this.sceneManager.camera.lookAt(0, 0, 0);

    if (!this.isDragging) {
      this.rotationVelocityX *= 0.95;
      this.rotationVelocityY *= 0.95;
      this.targetRotationX += this.rotationVelocityX;
      this.targetRotationY += this.rotationVelocityY;
    }

    this.targetRotationX = THREE.MathUtils.clamp(this.targetRotationX, -Math.PI / 2, Math.PI / 2);

    const currentRotX = this.sceneManager.particleGroup.rotation.x;
    const currentRotY = this.sceneManager.particleGroup.rotation.y;

    this.sceneManager.particleGroup.rotation.x = THREE.MathUtils.lerp(
      currentRotX, this.targetRotationX, Math.min(1, deltaTime * 6)
    );
    this.sceneManager.particleGroup.rotation.y = THREE.MathUtils.lerp(
      currentRotY, this.targetRotationY, Math.min(1, deltaTime * 6)
    );
  }

  update(deltaTime: number): void {
    this.updateCamera(deltaTime);
    this.updatePulses(deltaTime);
    this.updateFlash(deltaTime);
  }
}
