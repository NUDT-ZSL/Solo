import * as THREE from 'three';
import { GravityEngine, GravitySource, Particle, TrailPoint } from './gravityEngine';

interface ViewState {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

interface HoverState {
  sourceId: string | null;
}

export type SourceDoubleClickCallback = (x: number, y: number) => void;
export type SourceListChangeCallback = () => void;

export class FieldRenderer {
  private container: HTMLElement;
  private engine: GravityEngine;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  
  private view: ViewState = {
    zoom: 1,
    offsetX: 0,
    offsetY: 0
  };

  private sourceMeshes: Map<string, { mesh: THREE.Mesh; label: THREE.Sprite | null }> = new Map();
  private particleMeshes: Map<string, THREE.Mesh> = new Map();
  private trailLines: Map<string, THREE.Line> = new Map();
  
  private isDragging = false;
  private isPanning = false;
  private dragSourceId: string | null = null;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private mouseDownTime = 0;
  private mouseDownPos = { x: 0, y: 0 };

  private hoverState: HoverState = { sourceId: null };

  private onSourceDoubleClick: SourceDoubleClickCallback | null = null;
  private onSourceChanged: SourceListChangeCallback | null = null;

  private gridHelper: THREE.GridHelper | null = null;
  private backgroundPlane: THREE.Mesh | null = null;

  private width = 0;
  private height = 0;

  constructor(container: HTMLElement, engine: GravityEngine) {
    this.container = container;
    this.engine = engine;

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
      0.1,
      1000
    );
    this.camera.position.z = 100;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(0x0a0a14);

    container.appendChild(this.renderer.domElement);

    this.createBackground();
    this.createGrid();
    this.bindEvents();
    this.updateCamera();
  }

  private createBackground(): void {
    const geometry = new THREE.PlaneGeometry(5000, 5000);
    const material = new THREE.MeshBasicMaterial({ color: 0x0a0a14 });
    this.backgroundPlane = new THREE.Mesh(geometry, material);
    this.backgroundPlane.position.z = -10;
    this.scene.add(this.backgroundPlane);
  }

  private createGrid(): void {
    const gridSize = 2000;
    const gridDivisions = 40;
    this.gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x1a1a2e, 0x151525);
    this.gridHelper.rotation.x = Math.PI / 2;
    this.gridHelper.position.z = -5;
    this.scene.add(this.gridHelper);
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this));
    canvas.addEventListener('dblclick', this.onDoubleClick.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onMouseDown(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.mouseDownTime = Date.now();
    this.mouseDownPos = { x: e.clientX, y: e.clientY };

    const worldPos = this.screenToWorld(screenX, screenY);
    const hitSource = this.hitTestSource(worldPos.x, worldPos.y);

    if (hitSource) {
      this.isDragging = true;
      this.dragSourceId = hitSource;
      this.renderer.domElement.style.cursor = 'grab';
    } else {
      this.isPanning = true;
      this.renderer.domElement.style.cursor = 'grabbing';
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (this.isDragging && this.dragSourceId) {
      const worldPos = this.screenToWorld(screenX, screenY);
      this.engine.updateSourcePosition(this.dragSourceId, worldPos.x, worldPos.y);
      this.updateSourceMesh(this.dragSourceId);
      if (this.onSourceChanged) {
        this.onSourceChanged();
      }
    } else if (this.isPanning) {
      const dx = (e.clientX - this.lastMouseX) / this.view.zoom;
      const dy = -(e.clientY - this.lastMouseY) / this.view.zoom;
      this.view.offsetX += dx;
      this.view.offsetY += dy;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.updateCamera();
    } else {
      const worldPos = this.screenToWorld(screenX, screenY);
      const hitSource = this.hitTestSource(worldPos.x, worldPos.y);

      if (hitSource !== this.hoverState.sourceId) {
        if (this.hoverState.sourceId) {
          this.setSourceHover(this.hoverState.sourceId, false);
        }
        if (hitSource) {
          this.setSourceHover(hitSource, true);
        }
        this.hoverState.sourceId = hitSource;
      }

      this.renderer.domElement.style.cursor = hitSource ? 'grab' : 'default';
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.dragSourceId = null;
    }
    if (this.isPanning) {
      this.isPanning = false;
    }

    const moveDist = Math.hypot(e.clientX - this.mouseDownPos.x, e.clientY - this.mouseDownPos.y);
    
    if (moveDist < 5) {
      this.renderer.domElement.style.cursor = this.hoverState.sourceId ? 'grab' : 'default';
    } else {
      this.renderer.domElement.style.cursor = 'default';
    }
  }

  private onMouseLeave(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.dragSourceId = null;
    }
    if (this.isPanning) {
      this.isPanning = false;
    }
    if (this.hoverState.sourceId) {
      this.setSourceHover(this.hoverState.sourceId, false);
      this.hoverState.sourceId = null;
    }
    this.renderer.domElement.style.cursor = 'default';
  }

  private onDoubleClick(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = this.screenToWorld(screenX, screenY);

    const hitSource = this.hitTestSource(worldPos.x, worldPos.y);
    if (!hitSource && this.onSourceDoubleClick) {
      this.onSourceDoubleClick(worldPos.x, worldPos.y);
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(2.0, this.view.zoom * delta));
    
    if (newZoom !== this.view.zoom) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - this.width / 2;
      const mouseY = -(e.clientY - rect.top - this.height / 2);

      const worldX = mouseX / this.view.zoom + this.view.offsetX;
      const worldY = mouseY / this.view.zoom + this.view.offsetY;

      this.view.zoom = newZoom;

      const newScreenX = (worldX - this.view.offsetX) * this.view.zoom;
      const newScreenY = (worldY - this.view.offsetY) * this.view.zoom;

      this.view.offsetX += (mouseX - newScreenX) / this.view.zoom;
      this.view.offsetY += (mouseY - newScreenY) / this.view.zoom;

      this.updateCamera();
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

  private screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const x = (screenX - this.width / 2) / this.view.zoom + this.view.offsetX;
    const y = -(screenY - this.height / 2) / this.view.zoom + this.view.offsetY;
    return { x, y };
  }

  private hitTestSource(x: number, y: number): string | null {
    const sources = this.engine.getSources();
    for (let i = sources.length - 1; i >= 0; i--) {
      const source = sources[i];
      const dx = x - source.x;
      const dy = y - source.y;
      const dist = Math.hypot(dx, dy);
      const hoverScale = this.hoverState.sourceId === source.id ? 1.2 : 1.0;
      if (dist < source.radius * hoverScale) {
        return source.id;
      }
    }
    return null;
  }

  private setSourceHover(sourceId: string, isHovered: boolean): void {
    const entry = this.sourceMeshes.get(sourceId);
    if (entry) {
      const scale = isHovered ? 1.2 : 1.0;
      entry.mesh.scale.set(scale, scale, 1);
      if (entry.label) {
        entry.label.visible = isHovered;
        entry.label.scale.set(isHovered ? 1.2 : 1.0, isHovered ? 1.2 : 1.0, 1);
      }
    }
  }

  private updateCamera(): void {
    this.camera.position.x = this.view.offsetX;
    this.camera.position.y = this.view.offsetY;
    this.camera.zoom = this.view.zoom;
    this.camera.updateProjectionMatrix();
  }

  public setOnSourceDoubleClick(callback: SourceDoubleClickCallback): void {
    this.onSourceDoubleClick = callback;
  }

  public setOnSourceChanged(callback: SourceListChangeCallback): void {
    this.onSourceChanged = callback;
  }

  public updateSources(): void {
    const sources = this.engine.getSources();
    const currentIds = new Set(sources.map(s => s.id));

    for (const [id, entry] of this.sourceMeshes) {
      if (!currentIds.has(id)) {
        this.scene.remove(entry.mesh);
        if (entry.label) {
          this.scene.remove(entry.label);
        }
        entry.mesh.geometry.dispose();
        (entry.mesh.material as THREE.Material).dispose();
        this.sourceMeshes.delete(id);
      }
    }

    for (const source of sources) {
      if (!this.sourceMeshes.has(source.id)) {
        this.createSourceMesh(source);
      } else {
        this.updateSourceMesh(source.id);
      }
    }
  }

  private createSourceMesh(source: GravitySource): void {
    const geometry = new THREE.CircleGeometry(source.radius, 32);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(source.color),
      transparent: true,
      opacity: 0.9
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(source.x, source.y, 0);
    this.scene.add(mesh);

    const labelCanvas = document.createElement('canvas');
    const ctx = labelCanvas.getContext('2d')!;
    labelCanvas.width = 128;
    labelCanvas.height = 64;
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`质量: ${source.mass.toFixed(1)}`, 64, 32);

    const texture = new THREE.CanvasTexture(labelCanvas);
    const labelMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.9
    });
    const label = new THREE.Sprite(labelMaterial);
    label.position.set(source.x, source.y + source.radius + 15, 1);
    label.scale.set(80, 40, 1);
    label.visible = false;
    this.scene.add(label);

    this.sourceMeshes.set(source.id, { mesh, label });
  }

  private updateSourceMesh(sourceId: string): void {
    const source = this.engine.getSourceById(sourceId);
    const entry = this.sourceMeshes.get(sourceId);

    if (source && entry) {
      entry.mesh.position.set(source.x, source.y, 0);

      const oldGeom = entry.mesh.geometry;
      if (oldGeom.parameters.radius !== source.radius) {
        entry.mesh.geometry.dispose();
        entry.mesh.geometry = new THREE.CircleGeometry(source.radius, 32);
      }

      (entry.mesh.material as THREE.MeshBasicMaterial).color.set(source.color);

      if (entry.label) {
        entry.label.position.set(source.x, source.y + source.radius + 15, 1);
        
        const labelCanvas = document.createElement('canvas');
        const ctx = labelCanvas.getContext('2d')!;
        labelCanvas.width = 128;
        labelCanvas.height = 64;
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`质量: ${source.mass.toFixed(1)}`, 64, 32);
        
        const texture = new THREE.CanvasTexture(labelCanvas);
        (entry.label.material as THREE.SpriteMaterial).map = texture;
        (entry.label.material as THREE.SpriteMaterial).needsUpdate = true;
      }
    }
  }

  public updateParticles(): void {
    const particles = this.engine.getParticles();
    const currentIds = new Set(particles.map(p => p.id));

    for (const [id, mesh] of this.particleMeshes) {
      if (!currentIds.has(id)) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        this.particleMeshes.delete(id);
      }
    }

    for (const [id, line] of this.trailLines) {
      if (!currentIds.has(id)) {
        this.scene.remove(line);
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
        this.trailLines.delete(id);
      }
    }

    for (const particle of particles) {
      if (!this.particleMeshes.has(particle.id)) {
        this.createParticleMesh(particle);
      } else {
        this.updateParticleMesh(particle);
      }
      this.updateTrailLine(particle);
    }
  }

  private createParticleMesh(particle: Particle): void {
    const geometry = new THREE.CircleGeometry(3, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00d2ff,
      transparent: true,
      opacity: 0.9
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(particle.x, particle.y, 2);
    this.scene.add(mesh);
    this.particleMeshes.set(particle.id, mesh);
  }

  private updateParticleMesh(particle: Particle): void {
    const mesh = this.particleMeshes.get(particle.id);
    if (mesh) {
      mesh.position.set(particle.x, particle.y, 2);
    }
  }

  private updateTrailLine(particle: Particle): void {
    let line = this.trailLines.get(particle.id);
    
    if (particle.trail.length < 2) {
      if (line) {
        this.scene.remove(line);
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
        this.trailLines.delete(particle.id);
      }
      return;
    }

    const positions: number[] = [];
    const colors: number[] = [];

    for (let i = 0; i < particle.trail.length; i++) {
      const point = particle.trail[i];
      positions.push(point.x, point.y, 1);

      const t = i / (particle.trail.length - 1);
      const r = (1 - t) * 0 + t * 1;
      const g = (1 - t) * 0.82 + t * 0.42;
      const b = (1 - t) * 1 + t * 0.42;
      colors.push(r, g, b);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    if (!line) {
      const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.8
      });
      line = new THREE.Line(geometry, material);
      this.scene.add(line);
      this.trailLines.set(particle.id, line);
    } else {
      line.geometry.dispose();
      line.geometry = geometry;
    }
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public getView(): ViewState {
    return { ...this.view };
  }

  public resetView(): void {
    this.view = {
      zoom: 1,
      offsetX: 0,
      offsetY: 0
    };
    this.updateCamera();
  }

  public dispose(): void {
    this.renderer.dispose();
    window.removeEventListener('resize', this.onResize.bind(this));
  }
}
