import * as THREE from 'three';

export interface GravitySource {
  position: THREE.Vector3;
  strength: number;
  isRepel?: boolean;
  repelRadius?: number;
  mesh?: THREE.Mesh;
  halo?: THREE.Mesh;
  isTemporary?: boolean;
}

export class GravityManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private rendererDom: HTMLElement;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private gravitySources: GravitySource[] = [];
  private repelSource: GravitySource | null = null;
  private baseStrength: number = 1;
  private maxSources: number = 8;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, rendererDom: HTMLElement) {
    this.scene = scene;
    this.camera = camera;
    this.rendererDom = rendererDom;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.bindEvents();
  }

  private bindEvents(): void {
    this.rendererDom.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.rendererDom.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.rendererDom.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.rendererDom.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onMouseDown(e: MouseEvent): void {
    this.updateMouse(e);

    if (e.button === 0) {
      if (this.gravitySources.length < this.maxSources) {
        this.createGravitySource();
      }
    } else if (e.button === 2) {
      this.createRepelSource();
    }
  }

  private onMouseMove(e: MouseEvent): void {
    this.updateMouse(e);
    if (this.repelSource) {
      const intersectPoint = this.getIntersectPoint();
      if (intersectPoint) {
        this.repelSource.position.copy(intersectPoint);
        if (this.repelSource.mesh) {
          this.repelSource.mesh.position.copy(intersectPoint);
        }
        if (this.repelSource.halo) {
          this.repelSource.halo.position.copy(intersectPoint);
        }
      }
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 2 && this.repelSource) {
      this.removeRepelSource();
    }
  }

  private updateMouse(e: MouseEvent): void {
    const rect = this.rendererDom.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private getIntersectPoint(): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const dir = new THREE.Vector3();
    this.raycaster.ray.direction.normalize();
    dir.copy(this.raycaster.ray.direction);
    const distance = 300;
    return new THREE.Vector3()
      .copy(this.raycaster.ray.origin)
      .add(dir.multiplyScalar(distance));
  }

  private createGravitySource(): void {
    const point = this.getIntersectPoint();
    if (!point) return;

    const sphereGeo = new THREE.SphereGeometry(30, 32, 32);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x4A9EFF,
      transparent: true,
      opacity: 0.4
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.position.copy(point);

    const haloGeo = new THREE.RingGeometry(30, 45, 64);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x4A9EFF,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.copy(point);
    halo.lookAt(this.camera.position);

    this.scene.add(sphere);
    this.scene.add(halo);

    const source: GravitySource = {
      position: point.clone(),
      strength: this.baseStrength,
      mesh: sphere,
      halo: halo
    };

    this.gravitySources.push(source);
  }

  private createRepelSource(): void {
    const point = this.getIntersectPoint();
    if (!point) return;

    const sphereGeo = new THREE.SphereGeometry(30, 32, 32);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0xFF6B35,
      transparent: true,
      opacity: 0.3
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.position.copy(point);

    const haloGeo = new THREE.RingGeometry(70, 100, 64);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xFF6B35,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.copy(point);
    halo.lookAt(this.camera.position);

    this.scene.add(sphere);
    this.scene.add(halo);

    this.repelSource = {
      position: point.clone(),
      strength: Math.abs(this.baseStrength),
      isRepel: true,
      repelRadius: 100,
      mesh: sphere,
      halo: halo,
      isTemporary: true
    };
  }

  private removeRepelSource(): void {
    if (!this.repelSource) return;

    if (this.repelSource.mesh) {
      this.scene.remove(this.repelSource.mesh);
      this.repelSource.mesh.geometry.dispose();
      (this.repelSource.mesh.material as THREE.Material).dispose();
    }
    if (this.repelSource.halo) {
      this.scene.remove(this.repelSource.halo);
      this.repelSource.halo.geometry.dispose();
      (this.repelSource.halo.material as THREE.Material).dispose();
    }

    this.repelSource = null;
  }

  public setStrength(value: number): void {
    this.baseStrength = value;
    for (const src of this.gravitySources) {
      src.strength = value;
    }
  }

  public getStrength(): number {
    return this.baseStrength;
  }

  public clearAllSources(): void {
    for (const src of this.gravitySources) {
      if (src.mesh) {
        this.scene.remove(src.mesh);
        src.mesh.geometry.dispose();
        (src.mesh.material as THREE.Material).dispose();
      }
      if (src.halo) {
        this.scene.remove(src.halo);
        src.halo.geometry.dispose();
        (src.halo.material as THREE.Material).dispose();
      }
    }
    this.gravitySources = [];
    this.removeRepelSource();
  }

  public getGravitySources(): GravitySource[] {
    const result = [...this.gravitySources];
    if (this.repelSource) {
      result.push(this.repelSource);
    }
    return result;
  }

  public update(): void {
    for (const src of this.gravitySources) {
      if (src.halo) {
        src.halo.lookAt(this.camera.position);
        const scale = 1 + Math.sin(Date.now() * 0.002) * 0.05;
        src.halo.scale.set(scale, scale, scale);
      }
      if (src.mesh) {
        const pulse = 1 + Math.sin(Date.now() * 0.003) * 0.08;
        src.mesh.scale.set(pulse, pulse, pulse);
      }
    }
    if (this.repelSource && this.repelSource.halo) {
      this.repelSource.halo.lookAt(this.camera.position);
    }
  }

  public dispose(): void {
    this.clearAllSources();
    this.rendererDom.removeEventListener('mousedown', this.onMouseDown.bind(this));
    this.rendererDom.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.rendererDom.removeEventListener('mouseup', this.onMouseUp.bind(this));
  }
}
