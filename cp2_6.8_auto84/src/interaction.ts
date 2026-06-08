import * as THREE from 'three';
import { Fragment, checkSnap, snapFragment, moveFragment } from './fragments';

export type InteractionMode = 'none' | 'drag' | 'rotate' | 'camera-orbit';

export class InteractionSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private domElement: HTMLElement;
  private fragments: Fragment[] = [];
  private raycaster: THREE.Raycaster;
  private mouseNDC: THREE.Vector2;
  private selectedFragment: Fragment | null = null;
  private mode: InteractionMode = 'none';

  private dragPlane: THREE.Plane = new THREE.Plane();
  private dragOffset: THREE.Vector3 = new THREE.Vector3();
  private lastMouse: { x: number; y: number } = { x: 0, y: 0 };
  private rotateStart: { x: number; y: number } | null = null;

  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private cameraSpherical: THREE.Spherical = new THREE.Spherical(8, Math.PI / 3, 0);
  private cameraMinRadius = 4;
  private cameraMaxRadius = 18;

  private onSnapCallback: ((fragment: Fragment) => void) | null = null;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, domElement: HTMLElement) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.domElement = domElement;
    this.raycaster = new THREE.Raycaster();
    this.mouseNDC = new THREE.Vector2();
  }

  setFragments(fragments: Fragment[]): void {
    this.fragments = fragments;
  }

  onSnap(callback: (fragment: Fragment) => void): void {
    this.onSnapCallback = callback;
  }

  updateCameraFromSpherical(): void {
    const pos = new THREE.Vector3().setFromSpherical(this.cameraSpherical).add(this.cameraTarget);
    this.camera.position.copy(pos);
    this.camera.lookAt(this.cameraTarget);
  }

  init(): void {
    this.updateCameraFromSpherical();

    this.domElement.addEventListener('mousedown', this.handleMouseDown);
    this.domElement.addEventListener('mousemove', this.handleMouseMove);
    this.domElement.addEventListener('mouseup', this.handleMouseUp);
    this.domElement.addEventListener('mouseleave', this.handleMouseUp);
    this.domElement.addEventListener('wheel', this.handleWheel, { passive: false });
    this.domElement.addEventListener('contextmenu', this.handleContextMenu);

    this.domElement.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.domElement.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.domElement.addEventListener('touchend', this.handleTouchEnd);
  }

  dispose(): void {
    this.domElement.removeEventListener('mousedown', this.handleMouseDown);
    this.domElement.removeEventListener('mousemove', this.handleMouseMove);
    this.domElement.removeEventListener('mouseup', this.handleMouseUp);
    this.domElement.removeEventListener('mouseleave', this.handleMouseUp);
    this.domElement.removeEventListener('wheel', this.handleWheel);
    this.domElement.removeEventListener('contextmenu', this.handleContextMenu);

    this.domElement.removeEventListener('touchstart', this.handleTouchStart);
    this.domElement.removeEventListener('touchmove', this.handleTouchMove);
    this.domElement.removeEventListener('touchend', this.handleTouchEnd);
  }

  private handleContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private updateMouseNDC(clientX: number, clientY: number): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private getMeshes(): THREE.Object3D[] {
    return this.fragments.filter(f => !f.isLocked).map(f => f.mesh);
  }

  private pickFragment(): Fragment | null {
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    const meshes = this.getMeshes();
    const intersects = this.raycaster.intersectObjects(meshes, false);
    if (intersects.length > 0) {
      const mesh = intersects[0].object;
      return this.fragments.find(f => f.mesh === mesh) || null;
    }
    return null;
  }

  private handleMouseDown = (e: MouseEvent): void => {
    this.lastMouse = { x: e.clientX, y: e.clientY };
    this.updateMouseNDC(e.clientX, e.clientY);

    if (e.button === 0) {
      const picked = this.pickFragment();
      if (picked) {
        this.selectedFragment = picked;
        this.mode = 'drag';

        const normal = new THREE.Vector3();
        this.camera.getWorldDirection(normal);
        this.dragPlane.setFromNormalAndCoplanarPoint(normal, picked.mesh.position);

        const ray = new THREE.Raycaster();
        ray.setFromCamera(this.mouseNDC, this.camera);
        const hit = new THREE.Vector3();
        ray.ray.intersectPlane(this.dragPlane, hit);
        if (hit) {
          this.dragOffset.copy(picked.mesh.position).sub(hit);
        }
        this.domElement.style.cursor = 'grabbing';
      } else {
        this.mode = 'camera-orbit';
      }
    } else if (e.button === 2) {
      this.rotateStart = { x: e.clientX, y: e.clientY };
      const picked = this.pickFragment();
      if (picked) {
        this.selectedFragment = picked;
        this.mode = 'rotate';
      } else {
        this.mode = 'camera-orbit';
      }
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    this.updateMouseNDC(e.clientX, e.clientY);

    if (this.mode === 'drag' && this.selectedFragment) {
      const ray = new THREE.Raycaster();
      ray.setFromCamera(this.mouseNDC, this.camera);
      const hit = new THREE.Vector3();
      ray.ray.intersectPlane(this.dragPlane, hit);
      if (hit) {
        const newPos = hit.add(this.dragOffset);
        moveFragment(this.selectedFragment, newPos);
      }
    } else if (this.mode === 'rotate' && this.selectedFragment && this.rotateStart) {
      const dx = (e.clientX - this.rotateStart.x) * 0.01;
      const dy = (e.clientY - this.rotateStart.y) * 0.01;
      this.selectedFragment.mesh.rotation.y += dx;
      this.selectedFragment.mesh.rotation.x += dy;
      this.rotateStart = { x: e.clientX, y: e.clientY };
    } else if (this.mode === 'camera-orbit') {
      const dx = (e.clientX - this.lastMouse.x) * 0.005;
      const dy = (e.clientY - this.lastMouse.y) * 0.005;
      this.cameraSpherical.theta -= dx;
      this.cameraSpherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraSpherical.phi - dy));
      this.updateCameraFromSpherical();
      this.lastMouse = { x: e.clientX, y: e.clientY };
    } else {
      const picked = this.pickFragment();
      this.domElement.style.cursor = picked ? 'grab' : 'default';
    }
  };

  private handleMouseUp = (): void => {
    if (this.mode === 'drag' && this.selectedFragment) {
      if (checkSnap(this.selectedFragment)) {
        snapFragment(this.selectedFragment);
        if (this.onSnapCallback) {
          this.onSnapCallback(this.selectedFragment);
        }
      }
    }
    this.selectedFragment = null;
    this.rotateStart = null;
    this.mode = 'none';
    this.domElement.style.cursor = 'default';
  };

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const delta = e.deltaY * 0.005;
    this.cameraSpherical.radius = Math.max(
      this.cameraMinRadius,
      Math.min(this.cameraMaxRadius, this.cameraSpherical.radius + delta)
    );
    this.updateCameraFromSpherical();
  };

  private handleTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      this.lastMouse = { x: t.clientX, y: t.clientY };
      this.updateMouseNDC(t.clientX, t.clientY);
      const picked = this.pickFragment();
      if (picked) {
        this.selectedFragment = picked;
        this.mode = 'drag';
        const normal = new THREE.Vector3();
        this.camera.getWorldDirection(normal);
        this.dragPlane.setFromNormalAndCoplanarPoint(normal, picked.mesh.position);
        const ray = new THREE.Raycaster();
        ray.setFromCamera(this.mouseNDC, this.camera);
        const hit = new THREE.Vector3();
        ray.ray.intersectPlane(this.dragPlane, hit);
        if (hit) {
          this.dragOffset.copy(picked.mesh.position).sub(hit);
        }
      } else {
        this.mode = 'camera-orbit';
      }
    } else if (e.touches.length === 2) {
      this.mode = 'none';
      this.selectedFragment = null;
    }
  };

  private handleTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      this.updateMouseNDC(t.clientX, t.clientY);
      if (this.mode === 'drag' && this.selectedFragment) {
        const ray = new THREE.Raycaster();
        ray.setFromCamera(this.mouseNDC, this.camera);
        const hit = new THREE.Vector3();
        ray.ray.intersectPlane(this.dragPlane, hit);
        if (hit) {
          const newPos = hit.add(this.dragOffset);
          moveFragment(this.selectedFragment, newPos);
        }
      } else if (this.mode === 'camera-orbit') {
        const dx = (t.clientX - this.lastMouse.x) * 0.005;
        const dy = (t.clientY - this.lastMouse.y) * 0.005;
        this.cameraSpherical.theta -= dx;
        this.cameraSpherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraSpherical.phi - dy));
        this.updateCameraFromSpherical();
        this.lastMouse = { x: t.clientX, y: t.clientY };
      }
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      if (this.lastTouchPinchDist) {
        const delta = (this.lastTouchPinchDist - dist) * 0.02;
        this.cameraSpherical.radius = Math.max(
          this.cameraMinRadius,
          Math.min(this.cameraMaxRadius, this.cameraSpherical.radius + delta)
        );
        this.updateCameraFromSpherical();
      }
      this.lastTouchPinchDist = dist;
      if (this.selectedFragment && this.mode === 'drag') {
        this.updateMouseNDC(midX, midY);
        const ray = new THREE.Raycaster();
        ray.setFromCamera(this.mouseNDC, this.camera);
        const hit = new THREE.Vector3();
        ray.ray.intersectPlane(this.dragPlane, hit);
        if (hit) {
          const newPos = hit.add(this.dragOffset);
          moveFragment(this.selectedFragment, newPos);
        }
      }
    }
  };

  private lastTouchPinchDist: number | null = null;

  private handleTouchEnd = (): void => {
    if (this.mode === 'drag' && this.selectedFragment) {
      if (checkSnap(this.selectedFragment)) {
        snapFragment(this.selectedFragment);
        if (this.onSnapCallback) {
          this.onSnapCallback(this.selectedFragment);
        }
      }
    }
    this.selectedFragment = null;
    this.mode = 'none';
    this.lastTouchPinchDist = null;
  };
}

export class ParticleBurst {
  private scene: THREE.Scene;
  private particles: THREE.Points | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.PointsMaterial | null = null;
  private velocities: Float32Array | null = null;
  private startTime: number = 0;
  private duration: number = 500;
  private active: boolean = false;
  private maxParticles: number = 200;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  trigger(position: THREE.Vector3, color: number = 0xF7C948): void {
    this.clear();

    const count = Math.min(150, this.maxParticles);
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const baseColor = new THREE.Color(color);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = position.x;
      positions[i3 + 1] = position.y;
      positions[i3 + 2] = position.z;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 2 + Math.random() * 4;
      velocities[i3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i3 + 1] = Math.cos(phi) * speed;
      velocities[i3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;

      const tint = baseColor.clone().offsetHSL((Math.random() - 0.5) * 0.1, 0, (Math.random() - 0.5) * 0.15);
      colors[i3] = tint.r;
      colors[i3 + 1] = tint.g;
      colors[i3 + 2] = tint.b;

      sizes[i] = 0.05 + Math.random() * 0.12;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    this.particles = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.particles);
    this.velocities = velocities;
    this.startTime = performance.now();
    this.active = true;
  }

  update(): void {
    if (!this.active || !this.particles || !this.geometry || !this.material || !this.velocities) return;

    const elapsed = performance.now() - this.startTime;
    const t = Math.min(elapsed / this.duration, 1);

    const positions = this.geometry.attributes.position.array as Float32Array;
    const count = positions.length / 3;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] += this.velocities[i3] * 0.016;
      positions[i3 + 1] += this.velocities[i3 + 1] * 0.016 - 0.02;
      positions[i3 + 2] += this.velocities[i3 + 2] * 0.016;
      this.velocities[i3 + 1] -= 0.15;
    }
    this.geometry.attributes.position.needsUpdate = true;

    this.material.opacity = 1 - t;

    if (t >= 1) {
      this.clear();
    }
  }

  private clear(): void {
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles.geometry?.dispose();
      if (this.particles.material instanceof THREE.Material) {
        this.particles.material.dispose();
      }
      this.particles = null;
    }
    this.geometry = null;
    this.material = null;
    this.velocities = null;
    this.active = false;
  }
}
