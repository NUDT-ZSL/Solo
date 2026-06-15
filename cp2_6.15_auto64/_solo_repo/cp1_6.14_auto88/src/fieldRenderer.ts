import * as THREE from 'three';
import { GravityEngine, GravitySource, Particle } from './gravityEngine';

export type SourceDoubleClickCallback = (x: number, y: number) => void;
export type SourceChangeCallback = () => void;

export class FieldRenderer {
  private container: HTMLElement;
  private engine: GravityEngine;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;

  private width = 0;
  private height = 0;

  private zoom = 1;
  private minZoom = 0.5;
  private maxZoom = 2.0;

  private isDragging = false;
  private isPanning = false;
  private dragSourceId: string | null = null;
  private lastMouseScreenX = 0;
  private lastMouseScreenY = 0;

  private hoveredSourceId: string | null = null;

  private sourceGroup: THREE.Group;
  private trailGroup: THREE.Group;
  private particleGroup: THREE.Group;

  private sourceMeshMap: Map<string, THREE.Group> = new Map();
  private trailMeshMap: Map<string, THREE.Line> = new Map();
  private particleMeshMap: Map<string, THREE.Mesh> = new Map();

  private onSourceDoubleClick: SourceDoubleClickCallback | null = null;
  private onSourceChange: SourceChangeCallback | null = null;

  constructor(container: HTMLElement, engine: GravityEngine) {
    this.container = container;
    this.engine = engine;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a14);

    const rect = container.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    this.camera = new THREE.OrthographicCamera(
      -this.width / 2,
      this.width / 2,
      this.height / 2,
      -this.height / 2,
      -100,
      1000
    );
    this.camera.position.z = 10;
    this.camera.zoom = this.zoom;
    this.camera.updateProjectionMatrix();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.width, this.height);
    container.appendChild(this.renderer.domElement);

    this.sourceGroup = new THREE.Group();
    this.trailGroup = new THREE.Group();
    this.particleGroup = new THREE.Group();
    this.scene.add(this.trailGroup);
    this.scene.add(this.sourceGroup);
    this.scene.add(this.particleGroup);

    this.createGrid();
    this.bindEvents();
  }

  private createGrid(): void {
    const gridSize = 4000;
    const gridDivisions = 50;
    const grid = new THREE.GridHelper(gridSize, gridDivisions, 0x1a1a2e, 0x151525);
    grid.rotation.x = Math.PI / 2;
    grid.position.z = -10;
    this.scene.add(grid);

    const axesGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-gridSize / 2, 0, -9),
      new THREE.Vector3(gridSize / 2, 0, -9),
      new THREE.Vector3(0, -gridSize / 2, -9),
      new THREE.Vector3(0, gridSize / 2, -9)
    ]);
    const axesMat = new THREE.LineBasicMaterial({ color: 0x222240, transparent: true, opacity: 0.5 });
    const axes = new THREE.LineSegments(axesGeom, axesMat);
    this.scene.add(axes);
  }

  private bindEvents(): void {
    const dom = this.renderer.domElement;
    dom.addEventListener('mousedown', this.onMouseDown.bind(this));
    dom.addEventListener('mousemove', this.onMouseMove.bind(this));
    dom.addEventListener('mouseup', this.onMouseUp.bind(this));
    dom.addEventListener('mouseleave', this.onMouseLeave.bind(this));
    dom.addEventListener('dblclick', this.onDoubleClick.bind(this));
    dom.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private updatePointer(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private screenToWorld(sx: number, sy: number): THREE.Vector3 {
    const nx = ((sx) / this.width) * 2 - 1;
    const ny = -((sy) / this.height) * 2 + 1;
    const v = new THREE.Vector3(nx, ny, 0.5).unproject(this.camera);
    return v;
  }

  private clientToWorld(e: MouseEvent): THREE.Vector3 {
    const rect = this.renderer.domElement.getBoundingClientRect();
    return this.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
  }

  private hitTestSource(e: MouseEvent): string | null {
    this.updatePointer(e);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const allMeshes: THREE.Object3D[] = [];
    this.sourceGroup.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) allMeshes.push(obj);
    });
    const intersects = this.raycaster.intersectObjects(allMeshes, false);
    if (intersects.length === 0) return null;
    let obj: THREE.Object3D | null = intersects[0].object;
    while (obj) {
      if (obj.userData && obj.userData.sourceId) return obj.userData.sourceId;
      obj = obj.parent;
    }
    return null;
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    this.lastMouseScreenX = e.clientX;
    this.lastMouseScreenY = e.clientY;

    const hit = this.hitTestSource(e);
    if (hit) {
      this.isDragging = true;
      this.dragSourceId = hit;
      this.renderer.domElement.style.cursor = 'grab';
    } else {
      this.isPanning = true;
      this.renderer.domElement.style.cursor = 'grabbing';
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isDragging && this.dragSourceId) {
      const world = this.clientToWorld(e);
      this.engine.updateSourcePosition(this.dragSourceId, world.x, world.y);
      this.updateSourceVisual(this.dragSourceId);
      if (this.onSourceChange) this.onSourceChange();
      this.renderer.domElement.style.cursor = 'grab';
    } else if (this.isPanning) {
      const dxScreen = e.clientX - this.lastMouseScreenX;
      const dyScreen = e.clientY - this.lastMouseScreenY;
      const dx = dxScreen / this.camera.zoom;
      const dy = -dyScreen / this.camera.zoom;
      this.camera.position.x -= dx;
      this.camera.position.y -= dy;
      this.camera.updateProjectionMatrix();
      this.lastMouseScreenX = e.clientX;
      this.lastMouseScreenY = e.clientY;
    } else {
      const hit = this.hitTestSource(e);
      if (hit !== this.hoveredSourceId) {
        if (this.hoveredSourceId) {
          this.setSourceHover(this.hoveredSourceId, false);
        }
        if (hit) {
          this.setSourceHover(hit, true);
        }
        this.hoveredSourceId = hit;
      }
      this.renderer.domElement.style.cursor = hit ? 'grab' : 'default';
    }
  }

  private onMouseUp(_e: MouseEvent): void {
    this.isDragging = false;
    this.dragSourceId = null;
    this.isPanning = false;
    this.renderer.domElement.style.cursor = this.hoveredSourceId ? 'grab' : 'default';
  }

  private onMouseLeave(): void {
    if (this.hoveredSourceId) {
      this.setSourceHover(this.hoveredSourceId, false);
      this.hoveredSourceId = null;
    }
    this.isDragging = false;
    this.dragSourceId = null;
    this.isPanning = false;
    this.renderer.domElement.style.cursor = 'default';
  }

  private onDoubleClick(e: MouseEvent): void {
    const hit = this.hitTestSource(e);
    if (!hit && this.onSourceDoubleClick) {
      const world = this.clientToWorld(e);
      this.onSourceDoubleClick(world.x, world.y);
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = this.renderer.domElement.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const before = this.screenToWorld(sx, sy);

    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.camera.zoom * factor));
    if (newZoom !== this.camera.zoom) {
      this.camera.zoom = newZoom;
      this.camera.updateProjectionMatrix();
      const after = this.screenToWorld(sx, sy);
      this.camera.position.x += before.x - after.x;
      this.camera.position.y += before.y - after.y;
      this.camera.updateProjectionMatrix();
    }
  }

  private onResize(): void {
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.camera.left = -this.width / 2;
    this.camera.right = this.width / 2;
    this.camera.top = this.height / 2;
    this.camera.bottom = -this.height / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  private setSourceHover(sourceId: string, hovered: boolean): void {
    const grp = this.sourceMeshMap.get(sourceId);
    if (!grp) return;
    const scale = hovered ? 1.2 : 1.0;
    grp.scale.set(scale, scale, 1);
    grp.traverse((obj) => {
      if (obj.userData && obj.userData.isLabel) {
        (obj as THREE.Sprite).visible = hovered;
      }
    });
  }

  public setOnSourceDoubleClick(cb: SourceDoubleClickCallback): void {
    this.onSourceDoubleClick = cb;
  }

  public setOnSourceChange(cb: SourceChangeCallback): void {
    this.onSourceChange = cb;
  }

  public resetView(): void {
    this.camera.zoom = 1;
    this.camera.position.x = 0;
    this.camera.position.y = 0;
    this.camera.position.z = 10;
    this.camera.updateProjectionMatrix();
  }

  public rebuildSources(): void {
    this.clearSources();
    const sources = this.engine.getSources();
    for (const s of sources) {
      this.createSourceVisual(s);
    }
  }

  public clearSources(): void {
    for (const grp of this.sourceMeshMap.values()) {
      this.sourceGroup.remove(grp);
      grp.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
        const sprite = obj as THREE.Sprite;
        if (sprite.isSprite) {
          const mat = sprite.material as THREE.SpriteMaterial;
          if (mat.map) mat.map.dispose();
          mat.dispose();
        }
      });
    }
    this.sourceMeshMap.clear();
  }

  private createSourceVisual(source: GravitySource): void {
    const grp = new THREE.Group();
    grp.userData.sourceId = source.id;
    grp.position.set(source.x, source.y, 0);

    const glowGeom = new THREE.CircleGeometry(source.radius * 1.4, 40);
    const glowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(source.color),
      transparent: true,
      opacity: 0.25,
      depthWrite: false
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    glow.userData.sourceId = source.id;
    grp.add(glow);

    const mainGeom = new THREE.CircleGeometry(source.radius, 40);
    const mainMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(source.color),
      transparent: true,
      opacity: 0.95
    });
    const main = new THREE.Mesh(mainGeom, mainMat);
    main.userData.sourceId = source.id;
    grp.add(main);

    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 256;
    labelCanvas.height = 64;
    const lctx = labelCanvas.getContext('2d')!;
    lctx.clearRect(0, 0, 256, 64);
    lctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    lctx.fillStyle = '#ffffff';
    lctx.textAlign = 'center';
    lctx.textBaseline = 'middle';
    lctx.fillText(`质量: ${source.mass.toFixed(1)}`, 128, 32);
    const texture = new THREE.CanvasTexture(labelCanvas);
    texture.needsUpdate = true;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.95,
      depthTest: false
    });
    const label = new THREE.Sprite(spriteMat);
    label.position.set(0, source.radius + 22, 5);
    label.scale.set(90, 24, 1);
    label.visible = false;
    label.userData.isLabel = true;
    label.userData.sourceId = source.id;
    grp.add(label);

    this.sourceGroup.add(grp);
    this.sourceMeshMap.set(source.id, grp);
  }

  private updateSourceVisual(sourceId: string): void {
    const source = this.engine.getSourceById(sourceId);
    const grp = this.sourceMeshMap.get(sourceId);
    if (!source || !grp) return;
    grp.position.set(source.x, source.y, 0);
  }

  public updateSources(): void {
    const sources = this.engine.getSources();
    const aliveIds = new Set(sources.map((s) => s.id));

    for (const [id, grp] of this.sourceMeshMap) {
      if (!aliveIds.has(id)) {
        this.sourceGroup.remove(grp);
        grp.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.geometry.dispose();
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => m.dispose());
            } else {
              mesh.material.dispose();
            }
          }
          const sprite = obj as THREE.Sprite;
          if (sprite.isSprite) {
            const mat = sprite.material as THREE.SpriteMaterial;
            if (mat.map) mat.map.dispose();
            mat.dispose();
          }
        });
        this.sourceMeshMap.delete(id);
      }
    }
    for (const s of sources) {
      if (!this.sourceMeshMap.has(s.id)) {
        this.createSourceVisual(s);
      } else {
        this.updateSourceVisual(s.id);
      }
    }
  }

  public updateParticles(): void {
    const particles = this.engine.getParticles();
    const aliveIds = new Set(particles.map((p) => p.id));

    for (const [id, mesh] of this.particleMeshMap) {
      if (!aliveIds.has(id)) {
        this.particleGroup.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        this.particleMeshMap.delete(id);
      }
    }
    for (const [id, line] of this.trailMeshMap) {
      if (!aliveIds.has(id)) {
        this.trailGroup.remove(line);
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
        this.trailMeshMap.delete(id);
      }
    }

    for (const p of particles) {
      if (!p.dead) {
        if (!this.particleMeshMap.has(p.id)) {
          this.createParticleVisual(p);
        } else {
          const mesh = this.particleMeshMap.get(p.id)!;
          mesh.position.set(p.x, p.y, 3);
        }
      } else {
        if (this.particleMeshMap.has(p.id)) {
          const mesh = this.particleMeshMap.get(p.id)!;
          this.particleGroup.remove(mesh);
          mesh.geometry.dispose();
          (mesh.material as THREE.Material).dispose();
          this.particleMeshMap.delete(p.id);
        }
      }
      this.updateTrailVisual(p);
    }
  }

  private createParticleVisual(p: Particle): void {
    const geom = new THREE.CircleGeometry(4, 20);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00d2ff });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(p.x, p.y, 3);
    this.particleGroup.add(mesh);
    this.particleMeshMap.set(p.id, mesh);
  }

  private updateTrailVisual(p: Particle): void {
    const trail = p.trail;
    let line = this.trailMeshMap.get(p.id);

    if (trail.length < 2) {
      if (line) {
        this.trailGroup.remove(line);
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
        this.trailMeshMap.delete(p.id);
      }
      return;
    }

    const positions: number[] = [];
    const colors: number[] = [];
    const colorStart = new THREE.Color('#00d2ff');
    const colorEnd = new THREE.Color('#ff6b6b');

    for (let i = 0; i < trail.length; i++) {
      const t = i / (trail.length - 1);
      const c = colorStart.clone().lerp(colorEnd, t);
      positions.push(trail[i].x, trail[i].y, 1);
      colors.push(c.r, c.g, c.b);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    if (!line) {
      const mat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false
      });
      line = new THREE.Line(geom, mat);
      this.trailGroup.add(line);
      this.trailMeshMap.set(p.id, line);
    } else {
      line.geometry.dispose();
      line.geometry = geom;
    }

    let totalAlpha = 0;
    for (const tp of trail) totalAlpha += Math.max(0, tp.alpha);
    const avgAlpha = Math.max(0, Math.min(1, totalAlpha / trail.length));
    (line.material as THREE.LineBasicMaterial).opacity = 0.25 + avgAlpha * 0.65;
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.renderer.dispose();
    window.removeEventListener('resize', this.onResize.bind(this));
  }
}
