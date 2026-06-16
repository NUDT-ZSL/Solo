import * as THREE from 'three';
import type { TerrainGenerator } from './terrain';

export interface MarkerData {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  index: number;
}

export class MarkerManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private terrain: TerrainGenerator;
  private markers: MarkerData[] = [];
  private pathLine: THREE.LineSegments | null = null;
  private markerGroup: THREE.Group;
  private dragging: MarkerData | null = null;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private isDragging: boolean = false;
  private dragThreshold: number = 5;
  private downPos: { x: number; y: number } = { x: 0, y: 0 };
  private onMarkerCountChange: ((count: number) => void) | null = null;
  private crosshairEl: HTMLElement | null = null;
  private getCameraState: (() => { isRotating: boolean; isPanning: boolean }) | null = null;

  private readonly MARKER_COLOR = 0xFF4500;
  private readonly PATH_COLOR = 0x00FFFF;
  private readonly MARKER_RADIUS = 0.5;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    terrain: TerrainGenerator
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.terrain = terrain;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.markerGroup = new THREE.Group();
    this.scene.add(this.markerGroup);
    this.crosshairEl = document.getElementById('crosshair');
  }

  setCrosshairElement(el: HTMLElement): void {
    this.crosshairEl = el;
  }

  setCameraStateChecker(fn: () => { isRotating: boolean; isPanning: boolean }): void {
    this.getCameraState = fn;
  }

  setMarkerCountCallback(cb: (count: number) => void): void {
    this.onMarkerCountChange = cb;
  }

  getMarkerCount(): number {
    return this.markers.length;
  }

  getMarkers(): MarkerData[] {
    return [...this.markers];
  }

  clearMarkers(): void {
    this.markers.forEach(m => {
      this.markerGroup.remove(m.mesh);
      m.mesh.geometry.dispose();
      (m.mesh.material as THREE.Material).dispose();
    });
    this.markers = [];
    this.updatePath();
    if (this.onMarkerCountChange) this.onMarkerCountChange(0);
  }

  private createMarkerMesh(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(this.MARKER_RADIUS, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: this.MARKER_COLOR,
      emissive: this.MARKER_COLOR,
      emissiveIntensity: 0.4,
      roughness: 0.4,
      metalness: 0.3
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    return mesh;
  }

  addMarkerAt(position: THREE.Vector3): MarkerData {
    const mesh = this.createMarkerMesh();
    mesh.position.copy(position);
    mesh.position.y += this.MARKER_RADIUS + 0.1;

    const ringGeo = new THREE.RingGeometry(this.MARKER_RADIUS * 1.3, this.MARKER_RADIUS * 1.6, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: this.MARKER_COLOR,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    mesh.add(ring);

    this.markerGroup.add(mesh);

    const data: MarkerData = {
      mesh,
      position: mesh.position.clone(),
      index: this.markers.length
    };

    this.markers.push(data);
    this.updatePath();
    if (this.onMarkerCountChange) this.onMarkerCountChange(this.markers.length);

    mesh.scale.set(0, 0, 0);
    this.animateMarkerAppear(mesh);

    return data;
  }

  private animateMarkerAppear(mesh: THREE.Mesh): void {
    const startTime = performance.now();
    const duration = 250;
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const bounce = t < 0.6 ? (eased * 1.3) : (1 - (t - 0.6) / 0.4 * 0.3);
      mesh.scale.setScalar(bounce);
      if (t < 1) requestAnimationFrame(animate);
      else mesh.scale.setScalar(1);
    };
    animate();
  }

  private updatePath(): void {
    if (this.pathLine) {
      this.markerGroup.remove(this.pathLine);
      this.pathLine.geometry.dispose();
      (this.pathLine.material as THREE.Material).dispose();
      this.pathLine = null;
    }

    if (this.markers.length < 2) return;

    const points: THREE.Vector3[] = [];
    for (let i = 0; i < this.markers.length - 1; i++) {
      points.push(this.markers[i].mesh.position.clone());
      points.push(this.markers[i + 1].mesh.position.clone());
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: this.PATH_COLOR,
      linewidth: 2,
      transparent: true,
      opacity: 0.85
    });

    this.pathLine = new THREE.LineSegments(geometry, material);
    this.pathLine.computeLineDistances();
    this.markerGroup.add(this.pathLine);
  }

  attachInput(): void {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointerleave', this.onPointerUp);
  }

  detachInput(): void {
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('pointerleave', this.onPointerUp);
  }

  private updateMouseFromEvent(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    this.downPos = { x: e.clientX, y: e.clientY };
    this.isDragging = false;
    this.updateMouseFromEvent(e);

    const markerMeshes = this.markers.map(m => m.mesh);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(markerMeshes, false);

    if (hits.length > 0) {
      const hitMesh = hits[0].object as THREE.Mesh;
      this.dragging = this.markers.find(m => m.mesh === hitMesh) || null;
      (this.renderer.domElement as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (this.dragging) {
      const dx = e.clientX - this.downPos.x;
      const dy = e.clientY - this.downPos.y;
      if (!this.isDragging && Math.sqrt(dx * dx + dy * dy) > this.dragThreshold) {
        this.isDragging = true;
        if (this.crosshairEl) this.crosshairEl.style.display = 'block';
      }
      if (this.isDragging) {
        this.updateMouseFromEvent(e);
        const terrainMesh = this.terrain.getMesh();
        if (terrainMesh) {
          this.raycaster.setFromCamera(this.mouse, this.camera);
          const hits = this.raycaster.intersectObject(terrainMesh, false);
          if (hits.length > 0) {
            const point = hits[0].point.clone();
            point.y += this.MARKER_RADIUS + 0.1;
            this.dragging.mesh.position.copy(point);
            this.dragging.position.copy(point);
            this.updatePath();
          }
        }
      }
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (this.dragging) {
      if (this.crosshairEl) this.crosshairEl.style.display = 'none';
      this.dragging = null;
      this.isDragging = false;
      try { (this.renderer.domElement as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
      return;
    }

    if (e.button !== 0) return;

    const dx = e.clientX - this.downPos.x;
    const dy = e.clientY - this.downPos.y;
    if (Math.sqrt(dx * dx + dy * dy) > this.dragThreshold) return;

    if (this.getCameraState) {
      const state = this.getCameraState();
      if (state.isRotating || state.isPanning) return;
    }

    this.updateMouseFromEvent(e);
    const terrainMesh = this.terrain.getMesh();
    if (!terrainMesh) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObject(terrainMesh, false);
    if (hits.length > 0) {
      this.addMarkerAt(hits[0].point.clone());
    }
  };

  update(deltaTime: number): void {
    const time = performance.now() * 0.003;
    this.markers.forEach((m, i) => {
      const offset = i * 0.7;
      m.mesh.children.forEach(child => {
        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.RingGeometry) {
          const mat = child.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.3 + Math.sin(time + offset) * 0.25;
        }
      });
    });
  }

  dispose(): void {
    this.detachInput();
    this.clearMarkers();
    if (this.pathLine) {
      this.pathLine.geometry.dispose();
      (this.pathLine.material as THREE.Material).dispose();
    }
    this.scene.remove(this.markerGroup);
  }
}
