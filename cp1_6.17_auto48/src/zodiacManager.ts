import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import constellationsData, { ConstellationData } from './data/constellations';

interface HighlightState {
  mesh: THREE.Mesh;
  originalScale: THREE.Vector3;
  pulseRing: THREE.Mesh | null;
}

export class ZodiacManager {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private labelRenderer: CSS2DRenderer;
  private constellationGroup: THREE.Group;
  private starMeshes: THREE.Mesh[] = [];
  private constellationMeshes: Map<string, THREE.Mesh[]> = new Map();
  private constellationLines: Map<string, THREE.Line> = new Map();
  private labels: Map<string, CSS2DObject> = new Map();
  private highlightState: HighlightState | null = null;
  private selectedConstellation: string | null = null;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private onConstellationClick: ((id: string) => void) | null = null;
  private currentFilter: string = 'all';
  private opacityTargets: Map<string, { starOpacity: number; lineOpacity: number }> = new Map();
  private currentOpacities: Map<string, { starOpacity: number; lineOpacity: number }> = new Map();
  private isMythMode = false;
  private colorTransition = 0;
  private collectedConstellations: Set<string> = new Set();
  private pulseRings: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene, camera: THREE.Camera, labelRenderer: CSS2DRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.labelRenderer = labelRenderer;
    this.constellationGroup = new THREE.Group();
    this.scene.add(this.constellationGroup);
    this.buildConstellations();
  }

  private buildConstellations() {
    const starGeo = new THREE.SphereGeometry(0.3, 12, 12);
    const defaultMat = new THREE.MeshBasicMaterial({ color: 0xffe082 });

    for (const c of constellationsData) {
      const meshes: THREE.Mesh[] = [];
      const linePoints: THREE.Vector3[] = [];

      for (const star of c.stars) {
        const mat = defaultMat.clone();
        const mesh = new THREE.Mesh(starGeo, mat);
        mesh.position.set(star.x, star.y, star.z);
        mesh.userData = { constellationId: c.id, starName: star.name, magnitude: star.magnitude };
        this.constellationGroup.add(mesh);
        this.starMeshes.push(mesh);
        meshes.push(mesh);
        linePoints.push(new THREE.Vector3(star.x, star.y, star.z));
      }

      this.constellationMeshes.set(c.id, meshes);

      const linePositions: number[] = [];
      for (const [a, b] of c.lines) {
        linePositions.push(
          c.stars[a].x, c.stars[a].y, c.stars[a].z,
          c.stars[b].x, c.stars[b].y, c.stars[b].z,
        );
      }
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x81d4fa,
        transparent: true,
        opacity: 0.7,
      });
      const line = new THREE.LineSegments(lineGeo, lineMat);
      this.constellationGroup.add(line);
      this.constellationLines.set(c.id, line);

      const center = this.getConstellationCenter(c);
      const labelDiv = document.createElement('div');
      labelDiv.className = 'constellation-label';
      labelDiv.textContent = c.nameCN;
      labelDiv.style.cssText = `
        color: #E0E0E0;
        font-size: 14px;
        font-weight: bold;
        font-family: 'Noto Sans SC', sans-serif;
        white-space: nowrap;
        pointer-events: none;
        text-shadow: 0 0 8px rgba(0,0,0,0.8);
      `;
      const label = new CSS2DObject(labelDiv);
      label.position.set(center.x, center.y + 1.0, center.z);
      this.constellationGroup.add(label);
      this.labels.set(c.id, label);

      this.opacityTargets.set(c.id, { starOpacity: 1, lineOpacity: 0.7 });
      this.currentOpacities.set(c.id, { starOpacity: 1, lineOpacity: 0.7 });
    }
  }

  private getConstellationCenter(c: ConstellationData): THREE.Vector3 {
    let sx = 0, sy = 0, sz = 0;
    for (const s of c.stars) {
      sx += s.x; sy += s.y; sz += s.z;
    }
    const n = c.stars.length;
    return new THREE.Vector3(sx / n, sy / n, sz / n);
  }

  getConstellationData(id: string): ConstellationData | undefined {
    return constellationsData.find(c => c.id === id);
  }

  getConstellationCenterById(id: string): THREE.Vector3 {
    const c = this.getConstellationData(id);
    if (!c) return new THREE.Vector3(0, 0, 0);
    return this.getConstellationCenter(c);
  }

  setOnConstellationClick(cb: (id: string) => void) {
    this.onConstellationClick = cb;
  }

  handleClick(event: MouseEvent, container: HTMLElement) {
    const rect = container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.starMeshes);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const constellationId = mesh.userData.constellationId as string;
      this.highlightStar(mesh);
      this.selectedConstellation = constellationId;
      if (this.onConstellationClick) {
        this.onConstellationClick(constellationId);
      }
    }
  }

  handleHover(event: MouseEvent, container: HTMLElement) {
    const rect = container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.starMeshes);

    container.style.cursor = intersects.length > 0 ? 'pointer' : 'default';

    if (intersects.length > 0 && !this.highlightState) {
      const mesh = intersects[0].object as THREE.Mesh;
      this.highlightStar(mesh);
    } else if (intersects.length === 0 && !this.selectedConstellation) {
      this.clearHighlight();
    }
  }

  highlightStar(mesh: THREE.Mesh) {
    this.clearHighlight();

    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.color.set(0xffd54f);
    mesh.scale.set(2, 2, 2);

    const ringGeo = new THREE.RingGeometry(0.5, 0.6, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffd54f,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(mesh.position);
    ring.lookAt(this.camera.position);
    this.constellationGroup.add(ring);
    this.pulseRings.push(ring);

    this.highlightState = {
      mesh,
      originalScale: new THREE.Vector3(1, 1, 1),
      pulseRing: ring,
    };
  }

  clearHighlight() {
    if (this.highlightState) {
      const mat = this.highlightState.mesh.material as THREE.MeshBasicMaterial;
      if (this.isMythMode && this.colorTransition > 0.5) {
        mat.color.set(0xffd700);
      } else {
        mat.color.set(0xffe082);
      }
      this.highlightState.mesh.scale.copy(this.highlightState.originalScale);

      if (this.highlightState.pulseRing) {
        this.constellationGroup.remove(this.highlightState.pulseRing);
        this.highlightState.pulseRing.geometry.dispose();
        (this.highlightState.pulseRing.material as THREE.Material).dispose();
        const idx = this.pulseRings.indexOf(this.highlightState.pulseRing);
        if (idx >= 0) this.pulseRings.splice(idx, 1);
      }
      this.highlightState = null;
    }
    this.selectedConstellation = null;
  }

  update(time: number) {
    if (this.highlightState && this.highlightState.pulseRing) {
      const ring = this.highlightState.pulseRing;
      const scale = 1 + 0.8 * Math.sin((time / 1.2) * Math.PI * 2);
      ring.scale.set(scale, scale, scale);
      ring.lookAt(this.camera.position);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - (scale - 1) / 1.2);
    }

    for (const [id, target] of this.opacityTargets) {
      const current = this.currentOpacities.get(id)!;
      const speed = 0.05;
      current.starOpacity += (target.starOpacity - current.starOpacity) * speed;
      current.lineOpacity += (target.lineOpacity - current.lineOpacity) * speed;

      const meshes = this.constellationMeshes.get(id);
      if (meshes) {
        for (const m of meshes) {
          (m.material as THREE.MeshBasicMaterial).opacity = current.starOpacity;
          (m.material as THREE.MeshBasicMaterial).transparent = true;
        }
      }
      const line = this.constellationLines.get(id);
      if (line) {
        (line.material as THREE.LineBasicMaterial).opacity = current.lineOpacity;
      }
    }

    if (this.colorTransition > 0 || this.isMythMode) {
      this.updateColors();
    }
  }

  filterBySeason(season: string) {
    this.currentFilter = season;
    for (const c of constellationsData) {
      const target = this.opacityTargets.get(c.id)!;
      if (season === 'all' || c.season === season) {
        target.starOpacity = 1;
        target.lineOpacity = 0.7;
      } else {
        target.starOpacity = 0.15;
        target.lineOpacity = 0.05;
      }
    }
  }

  setMythMode(enabled: boolean, transition: number) {
    this.isMythMode = enabled;
    this.colorTransition = transition;
  }

  private updateColors() {
    const t = this.colorTransition;
    const defaultStarColor = new THREE.Color(0xffe082);
    const mythStarColor = new THREE.Color(0xffd700);
    const defaultLineColor = new THREE.Color(0x81d4fa);
    const mythLineColor = new THREE.Color(0xb71c1c);

    for (const [id, meshes] of this.constellationMeshes) {
      for (const m of meshes) {
        if (this.highlightState && m === this.highlightState.mesh) continue;
        const mat = m.material as THREE.MeshBasicMaterial;
        mat.color.copy(defaultStarColor).lerp(mythStarColor, t);
      }
    }

    for (const [id, line] of this.constellationLines) {
      const mat = line.material as THREE.LineBasicMaterial;
      mat.color.copy(defaultLineColor).lerp(mythLineColor, t);
    }
  }

  collectConstellation(id: string): boolean {
    if (this.collectedConstellations.has(id)) return false;
    this.collectedConstellations.add(id);

    const meshes = this.constellationMeshes.get(id);
    const line = this.constellationLines.get(id);
    if (meshes) {
      for (const m of meshes) {
        const mat = m.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.3;
        mat.transparent = true;
      }
    }
    if (line) {
      (line.material as THREE.LineBasicMaterial).opacity = 0.15;
    }
    const label = this.labels.get(id);
    if (label) {
      (label.element as HTMLElement).style.opacity = '0.4';
    }

    return true;
  }

  getCollectedCount(): number {
    return this.collectedConstellations.size;
  }

  isCollected(id: string): boolean {
    return this.collectedConstellations.has(id);
  }

  getStarPositions(id: string): { x: number; y: number; z: number }[] {
    const c = this.getConstellationData(id);
    if (!c) return [];
    return c.stars.map(s => ({ x: s.x, y: s.y, z: s.z }));
  }

  dispose() {
    this.constellationGroup.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
      if (obj instanceof THREE.LineSegments) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
    this.scene.remove(this.constellationGroup);
  }
}
