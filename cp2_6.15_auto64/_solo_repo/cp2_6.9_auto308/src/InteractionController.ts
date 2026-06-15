import * as THREE from 'three';
import { CrystalGenerator, CrystalMesh } from './CrystalGenerator';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class InteractionController {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private crystalGenerator: CrystalGenerator;
  private crystals: CrystalMesh[];

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private isDragging: boolean = false;
  private previousMouse: THREE.Vector2 = new THREE.Vector2();
  private cameraDistance: number = 12;
  private cameraTheta: number = 0;
  private cameraPhi: number = Math.PI / 3;
  private targetCameraTheta: number = 0;
  private targetCameraPhi: number = Math.PI / 3;
  private targetCameraDistance: number = 12;
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  private initialTheta: number = 0;
  private initialPhi: number = Math.PI / 3;
  private initialDistance: number = 12;

  private clusterGroup: THREE.Group;

  private particles: Particle[] = [];
  private maxParticles: number = 200;

  private rotationSpeed: number = 1;

  onCrystalClick?: (crystal: CrystalMesh) => void;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    crystalGenerator: CrystalGenerator,
    crystals: CrystalMesh[]
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.crystalGenerator = crystalGenerator;
    this.crystals = crystals;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.clusterGroup = new THREE.Group();
    crystals.forEach(c => this.clusterGroup.add(c));
    this.scene.add(this.clusterGroup);

    this.initialTheta = this.cameraTheta;
    this.initialPhi = this.cameraPhi;
    this.initialDistance = this.cameraDistance;

    this.setupEventListeners();
    this.updateCameraPosition();
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointerleave', this.onPointerUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.isDragging = true;
    this.previousMouse.set(e.clientX, e.clientY);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.previousMouse.x;
    const deltaY = e.clientY - this.previousMouse.y;

    this.targetCameraTheta -= deltaX * 0.005;
    this.targetCameraPhi -= deltaY * 0.005;
    this.targetCameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.targetCameraPhi));

    this.previousMouse.set(e.clientX, e.clientY);
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (this.isDragging) {
      const deltaX = Math.abs(e.clientX - this.previousMouse.x);
      const deltaY = Math.abs(e.clientY - this.previousMouse.y);

      if (deltaX < 3 && deltaY < 3) {
        this.handleClick(e);
      }
    }

    this.isDragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const delta = e.deltaY * 0.001;
    this.targetCameraDistance += delta * 2;
    this.targetCameraDistance = Math.max(6, Math.min(36, this.targetCameraDistance));
  };

  private handleClick(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.crystals.filter(c => c.visible);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const crystal = intersects[0].object as CrystalMesh;
      this.explodeCrystal(crystal, intersects[0].point);
    }
  }

  private explodeCrystal(crystal: CrystalMesh, hitPoint: THREE.Vector3): void {
    const worldPos = new THREE.Vector3();
    crystal.getWorldPosition(worldPos);
    const colorHex = crystal.userData.colorHex;
    const faceCount = crystal.userData.faceCount;

    this.createParticleRing(hitPoint, colorHex);

    this.crystalGenerator.createFragments(crystal, () => {
      const newPos = this.crystalGenerator.getPeripheryPosition();
      const newCrystal = this.crystalGenerator.createCrystal(newPos, colorHex, faceCount);
      this.clusterGroup.add(newCrystal);

      const index = this.crystals.indexOf(crystal);
      if (index !== -1) {
        this.crystals[index] = newCrystal;
      }
    });

    const idx = this.crystals.indexOf(crystal);
    if (idx !== -1) {
      this.clusterGroup.remove(crystal);
      this.crystalGenerator.removeCrystal(crystal);
    }

    if (this.onCrystalClick) {
      this.onCrystalClick(crystal);
    }
  }

  private createParticleRing(position: THREE.Vector3, colorHex: string): void {
    const particleCount = 60;
    const maxRadius = 4;
    const duration = 0.8;

    for (let i = 0; i < particleCount; i++) {
      if (this.particles.length >= this.maxParticles) {
        const oldest = this.particles.shift();
        if (oldest) {
          this.scene.remove(oldest.mesh);
          oldest.mesh.geometry.dispose();
          (oldest.mesh.material as THREE.Material).dispose();
        }
      }

      const angle = (i / particleCount) * Math.PI * 2;
      const size = 0.03 + Math.random() * 0.04;

      const geometry = new THREE.SphereGeometry(size, 6, 6);
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(colorHex),
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);

      const velocity = new THREE.Vector3(
        Math.cos(angle) * (maxRadius / duration),
        (Math.random() - 0.5) * 2,
        Math.sin(angle) * (maxRadius / duration)
      );

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity,
        life: 0,
        maxLife: duration
      });
    }
  }

  setRotationSpeed(speed: number): void {
    this.rotationSpeed = speed;
  }

  resetCamera(animate: boolean = true): void {
    if (animate) {
      const startTheta = this.cameraTheta;
      const startPhi = this.cameraPhi;
      const startDistance = this.cameraDistance;
      const startTime = performance.now() / 1000;
      const duration = 1;

      const animateReset = () => {
        const elapsed = performance.now() / 1000 - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);

        this.cameraTheta = startTheta + (this.initialTheta - startTheta) * easeProgress;
        this.cameraPhi = startPhi + (this.initialPhi - startPhi) * easeProgress;
        this.cameraDistance = startDistance + (this.initialDistance - startDistance) * easeProgress;
        this.targetCameraTheta = this.cameraTheta;
        this.targetCameraPhi = this.cameraPhi;
        this.targetCameraDistance = this.cameraDistance;

        this.updateCameraPosition();

        if (progress < 1) {
          requestAnimationFrame(animateReset);
        }
      };

      animateReset();
    } else {
      this.cameraTheta = this.initialTheta;
      this.cameraPhi = this.initialPhi;
      this.cameraDistance = this.initialDistance;
      this.targetCameraTheta = this.cameraTheta;
      this.targetCameraPhi = this.cameraPhi;
      this.targetCameraDistance = this.cameraDistance;
      this.updateCameraPosition();
    }
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    const y = this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  update(t: number, dt: number): void {
    this.clusterGroup.rotation.z += (dt / 45) * Math.PI * 2 * this.rotationSpeed;

    this.cameraTheta += (this.targetCameraTheta - this.cameraTheta) * 0.1;
    this.cameraPhi += (this.targetCameraPhi - this.cameraPhi) * 0.1;
    this.cameraDistance += (this.targetCameraDistance - this.cameraDistance) * 0.1;

    this.updateCameraPosition();

    this.crystals.forEach(crystal => {
      this.crystalGenerator.updateCrystalSway(crystal, t);
    });

    this.updateParticles(dt);
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;

      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }

      const progress = p.life / p.maxLife;
      const easeProgress = 1 - Math.pow(1 - progress, 2);

      p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - easeProgress;
    }
  }

  setCrystals(crystals: CrystalMesh[]): void {
    this.crystals.forEach(c => this.clusterGroup.remove(c));
    this.crystals = crystals;
    crystals.forEach(c => this.clusterGroup.add(c));
  }

  dispose(): void {
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('pointerleave', this.onPointerUp);
    canvas.removeEventListener('wheel', this.onWheel);
  }
}
