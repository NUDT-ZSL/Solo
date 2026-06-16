import * as THREE from 'three';
import { eventBus } from './eventBus';

export interface FragmentData {
  id: number;
  mesh: THREE.Mesh;
  outline: THREE.LineSegments;
  glowMesh: THREE.Mesh;
  heatMapMesh: THREE.Mesh | null;
  initialPosition: THREE.Vector3;
  initialRotation: THREE.Euler;
  breakEdges: THREE.Vector3[][];
  jointedIds: number[];
  isSelected: boolean;
  isJointed: boolean;
}

const FRAGMENT_COUNT = 6;
const SNAP_DISTANCE = 0.5;

export class FragmentManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private fragments: Map<number, FragmentData> = new Map();
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private selectedId: number | null = null;
  private isDragging: boolean = false;
  private isRotatingView: boolean = false;
  private previousMouse: THREE.Vector2 = new THREE.Vector2();
  private dragPlane: THREE.Plane = new THREE.Plane();
  private dragOffset: THREE.Vector3 = new THREE.Vector3();
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private cameraTheta: number = 0;
  private cameraPhi: number = Math.PI / 4;
  private cameraDistance: number = 12;
  private jointGroups: Map<number, number[]> = new Map();

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.createFragments();
    this.setupEventListeners();
    this.updateCameraPosition();
  }

  private createVaseProfile(): THREE.Vector2[] {
    const points: THREE.Vector2[] = [];
    const segments = 24;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      let radius: number;
      const height = t * 5 - 2.5;
      if (t < 0.1) {
        radius = 0.8 + (1.8 - 0.8) * (t / 0.1);
      } else if (t < 0.35) {
        radius = 1.8 + (2.4 - 1.8) * ((t - 0.1) / 0.25);
      } else if (t < 0.65) {
        const s = (t - 0.35) / 0.3;
        radius = 2.4 - 0.6 * Math.sin(s * Math.PI);
      } else if (t < 0.85) {
        radius = 1.8 - (1.8 - 1.0) * ((t - 0.65) / 0.2);
      } else {
        radius = 1.0 - (1.0 - 0.6) * ((t - 0.85) / 0.15);
      }
      points.push(new THREE.Vector2(radius, height));
    }
    return points;
  }

  private createFragmentGeometry(
    profile: THREE.Vector2[],
    startAngle: number,
    endAngle: number,
    fragmentId: number
  ): { geometry: THREE.BufferGeometry; breakEdges: THREE.Vector3[][] } {
    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const breakEdges: THREE.Vector3[][] = [[], []];

    const radialSegments = 12;
    const heightSegments = profile.length - 1;
    const angleSpan = endAngle - startAngle;

    const leftBreakPoints: THREE.Vector3[] = [];
    const rightBreakPoints: THREE.Vector3[] = [];

    for (let h = 0; h <= heightSegments; h++) {
      for (let r = 0; r <= radialSegments; r++) {
        const tAngle = r / radialSegments;
        const angle = startAngle + tAngle * angleSpan;
        const rad = profile[h].x;
        const y = profile[h].y;
        const x = rad * Math.cos(angle);
        const z = rad * Math.sin(angle);

        const nx = Math.cos(angle);
        const nz = Math.sin(angle);

        positions.push(x, y, z);
        normals.push(nx, 0, nz);
        uvs.push(r / radialSegments, h / heightSegments);

        if (r === 0) {
          leftBreakPoints.push(new THREE.Vector3(x, y, z));
        }
        if (r === radialSegments) {
          rightBreakPoints.push(new THREE.Vector3(x, y, z));
        }
      }
    }

    const innerOffset = (heightSegments + 1) * (radialSegments + 1);
    for (let h = 0; h <= heightSegments; h++) {
      for (let r = 0; r <= radialSegments; r++) {
        const tAngle = r / radialSegments;
        const angle = startAngle + tAngle * angleSpan;
        const rad = profile[h].x * 0.92;
        const y = profile[h].y;
        const x = rad * Math.cos(angle);
        const z = rad * Math.sin(angle);

        const nx = -Math.cos(angle);
        const nz = -Math.sin(angle);

        positions.push(x, y, z);
        normals.push(nx, 0, nz);
        uvs.push(r / radialSegments, h / heightSegments);
      }
    }

    const rowStride = radialSegments + 1;
    for (let h = 0; h < heightSegments; h++) {
      for (let r = 0; r < radialSegments; r++) {
        const a = h * rowStride + r;
        const b = a + 1;
        const c = a + rowStride;
        const d = c + 1;
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    for (let h = 0; h < heightSegments; h++) {
      for (let r = 0; r < radialSegments; r++) {
        const a = innerOffset + h * rowStride + r;
        const b = a + 1;
        const c = a + rowStride;
        const d = c + 1;
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    const leftEdgeOffset = innerOffset * 2;
    for (let h = 0; h <= heightSegments; h++) {
      const outerIdx = h * rowStride;
      const innerIdx = innerOffset + h * rowStride;
      positions.push(positions[outerIdx * 3], positions[outerIdx * 3 + 1], positions[outerIdx * 3 + 2]);
      positions.push(positions[innerIdx * 3], positions[innerIdx * 3 + 1], positions[innerIdx * 3 + 2]);
      normals.push(-Math.sin(startAngle), 0, Math.cos(startAngle));
      normals.push(-Math.sin(startAngle), 0, Math.cos(startAngle));
      uvs.push(0, h / heightSegments);
      uvs.push(1, h / heightSegments);
    }

    for (let h = 0; h < heightSegments; h++) {
      const a = leftEdgeOffset + h * 2;
      const b = a + 1;
      const c = a + 2;
      const d = c + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }

    const rightEdgeOffset = leftEdgeOffset + (heightSegments + 1) * 2;
    for (let h = 0; h <= heightSegments; h++) {
      const outerIdx = h * rowStride + radialSegments;
      const innerIdx = innerOffset + h * rowStride + radialSegments;
      positions.push(positions[outerIdx * 3], positions[outerIdx * 3 + 1], positions[outerIdx * 3 + 2]);
      positions.push(positions[innerIdx * 3], positions[innerIdx * 3 + 1], positions[innerIdx * 3 + 2]);
      normals.push(Math.sin(endAngle), 0, -Math.cos(endAngle));
      normals.push(Math.sin(endAngle), 0, -Math.cos(endAngle));
      uvs.push(0, h / heightSegments);
      uvs.push(1, h / heightSegments);
    }

    for (let h = 0; h < heightSegments; h++) {
      const a = rightEdgeOffset + h * 2;
      const b = a + 1;
      const c = a + 2;
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }

    const topCapOffset = rightEdgeOffset + (heightSegments + 1) * 2;
    for (let r = 0; r <= radialSegments; r++) {
      const tAngle = r / radialSegments;
      const angle = startAngle + tAngle * angleSpan;
      const radTop = profile[0].x;
      const radTopInner = profile[0].x * 0.92;
      positions.push(radTop * Math.cos(angle), profile[0].y, radTop * Math.sin(angle));
      positions.push(radTopInner * Math.cos(angle), profile[0].y, radTopInner * Math.sin(angle));
      normals.push(0, -1, 0);
      normals.push(0, -1, 0);
      uvs.push(r / radialSegments, 0);
      uvs.push(r / radialSegments, 1);
    }

    for (let r = 0; r < radialSegments; r++) {
      const a = topCapOffset + r * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }

    const bottomCapOffset = topCapOffset + (radialSegments + 1) * 2;
    for (let r = 0; r <= radialSegments; r++) {
      const tAngle = r / radialSegments;
      const angle = startAngle + tAngle * angleSpan;
      const radBot = profile[heightSegments].x;
      const radBotInner = profile[heightSegments].x * 0.92;
      positions.push(radBot * Math.cos(angle), profile[heightSegments].y, radBot * Math.sin(angle));
      positions.push(radBotInner * Math.cos(angle), profile[heightSegments].y, radBotInner * Math.sin(angle));
      normals.push(0, 1, 0);
      normals.push(0, 1, 0);
      uvs.push(r / radialSegments, 0);
      uvs.push(r / radialSegments, 1);
    }

    for (let r = 0; r < radialSegments; r++) {
      const a = bottomCapOffset + r * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }

    breakEdges[0] = leftBreakPoints;
    breakEdges[1] = rightBreakPoints;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return { geometry, breakEdges };
  }

  private createFragments(): void {
    const profile = this.createVaseProfile();
    const totalAngle = Math.PI * 2;
    const anglePerFragment = totalAngle / FRAGMENT_COUNT;

    const baseColors = [0xd4a574, 0xc4956a, 0xb8865a, 0xcf9e6e, 0xbfa076, 0xd1a070];

    for (let i = 0; i < FRAGMENT_COUNT; i++) {
      const startAngle = i * anglePerFragment - Math.PI / 2;
      const endAngle = (i + 1) * anglePerFragment - Math.PI / 2;

      const { geometry, breakEdges } = this.createFragmentGeometry(
        profile,
        startAngle,
        endAngle,
        i
      );

      const baseColor = new THREE.Color(baseColors[i % baseColors.length]);

      const material = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.85,
        metalness: 0.05,
        side: THREE.DoubleSide,
        flatShading: false
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const scatterAngle = (i - FRAGMENT_COUNT / 2) * 0.4 + (Math.random() - 0.5) * 0.3;
      const scatterRadius = 6 + Math.random() * 2;
      const scatterHeight = (Math.random() - 0.5) * 1.5;
      const initPos = new THREE.Vector3(
        Math.cos(scatterAngle) * scatterRadius,
        scatterHeight,
        Math.sin(scatterAngle) * scatterRadius
      );
      const initRot = new THREE.Euler(
        (Math.random() - 0.5) * 0.6,
        scatterAngle + Math.PI + (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.4
      );

      mesh.position.copy(initPos);
      mesh.rotation.copy(initRot);
      mesh.userData.fragmentId = i;

      const edges = new THREE.EdgesGeometry(geometry, 15);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x8b7355,
        transparent: true,
        opacity: 0.5,
        linewidth: 1
      });
      const outline = new THREE.LineSegments(edges, lineMat);
      mesh.add(outline);

      const glowGeo = geometry.clone();
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.scale.multiplyScalar(1.04);
      mesh.add(glowMesh);

      this.scene.add(mesh);

      this.fragments.set(i, {
        id: i,
        mesh,
        outline,
        glowMesh,
        heatMapMesh: null,
        initialPosition: initPos.clone(),
        initialRotation: initRot.clone(),
        breakEdges,
        jointedIds: [],
        isSelected: false,
        isJointed: false
      });
    }

    eventBus.emit('fragmentsCreated', Array.from(this.fragments.keys()));
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    eventBus.on('snapFragments', (data: { id1: number; id2: number; snapPos1: THREE.Vector3; snapPos2: THREE.Vector3 }) => {
      this.applySnap(data.id1, data.id2);
    });

    eventBus.on('requestReset', () => this.reset());
    eventBus.on('requestExport', () => this.exportState());
  }

  private updateMouse(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onMouseDown = (e: MouseEvent): void => {
    this.updateMouse(e);

    if (e.button === 2) {
      this.isRotatingView = true;
      this.previousMouse.set(e.clientX, e.clientY);
      return;
    }

    if (e.button !== 0) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = Array.from(this.fragments.values()).map((f) => f.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const fragId = hitMesh.userData.fragmentId as number;
      this.selectFragment(fragId);

      this.isDragging = true;
      this.previousMouse.set(e.clientX, e.clientY);

      const frag = this.fragments.get(fragId)!;
      this.dragPlane.setFromNormalAndCoplanarPoint(
        new THREE.Vector3(0, 1, 0),
        frag.mesh.position
      );

      const intersectPoint = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);
      this.dragOffset.copy(frag.mesh.position).sub(intersectPoint);
    } else {
      this.selectFragment(null);
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    this.updateMouse(e);

    if (this.isRotatingView) {
      const dx = e.clientX - this.previousMouse.x;
      const dy = e.clientY - this.previousMouse.y;
      this.cameraTheta -= dx * 0.01;
      this.cameraPhi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, this.cameraPhi + dy * 0.01));
      this.updateCameraPosition();
      this.previousMouse.set(e.clientX, e.clientY);
      return;
    }

    if (this.isDragging && this.selectedId !== null) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersectPoint = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint)) {
        const frag = this.fragments.get(this.selectedId)!;
        const newPos = intersectPoint.add(this.dragOffset);
        frag.mesh.position.copy(newPos);
        this.notifyFragmentMoved();
      }
    }
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
    this.isRotatingView = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();

    if (this.selectedId !== null && !e.ctrlKey && !e.shiftKey) {
      const frag = this.fragments.get(this.selectedId)!;
      const delta = e.deltaY > 0 ? 0.08 : -0.08;
      frag.mesh.rotation.y += delta;
      this.notifyFragmentMoved();
    } else {
      this.cameraDistance = Math.max(5, Math.min(30, this.cameraDistance + e.deltaY * 0.01));
      this.updateCameraPosition();
    }
  };

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    const y = this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    this.camera.position.set(x, y, z).add(this.cameraTarget);
    this.camera.lookAt(this.cameraTarget);
  }

  private selectFragment(id: number | null): void {
    if (this.selectedId === id) return;

    if (this.selectedId !== null) {
      const prevFrag = this.fragments.get(this.selectedId);
      if (prevFrag) {
        prevFrag.isSelected = false;
        const glowMat = prevFrag.glowMesh.material as THREE.MeshBasicMaterial;
        this.animateGlow(glowMat, 0, 200);
      }
    }

    this.selectedId = id;

    if (id !== null) {
      const frag = this.fragments.get(id);
      if (frag) {
        frag.isSelected = true;
        const glowMat = frag.glowMesh.material as THREE.MeshBasicMaterial;
        this.animateGlow(glowMat, 0.45, 200);
      }
    }

    eventBus.emit('selectionChanged', id);
  }

  private animateGlow(material: THREE.MeshBasicMaterial, targetOpacity: number, duration: number): void {
    const start = material.opacity;
    const startTime = performance.now();
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      material.opacity = start + (targetOpacity - start) * ease;
      if (t < 1) requestAnimationFrame(animate);
    };
    animate();
  }

  private notifyFragmentMoved(): void {
    const states = this.getFragmentStates();
    eventBus.emit('fragmentMoved', states);
  }

  public getFragmentStates(): Map<number, { position: THREE.Vector3; rotation: THREE.Euler; breakEdges: THREE.Vector3[][] }> {
    const states = new Map();
    this.fragments.forEach((frag, id) => {
      const transformedEdges: THREE.Vector3[][] = frag.breakEdges.map((edgeLoop) =>
        edgeLoop.map((p) => p.clone().applyEuler(frag.mesh.rotation).add(frag.mesh.position))
      );
      states.set(id, {
        position: frag.mesh.position.clone(),
        rotation: frag.mesh.rotation.clone(),
        breakEdges: transformedEdges
      });
    });
    return states;
  }

  private applySnap(id1: number, id2: number): void {
    const frag1 = this.fragments.get(id1);
    const frag2 = this.fragments.get(id2);
    if (!frag1 || !frag2) return;

    if (!frag1.jointedIds.includes(id2)) frag1.jointedIds.push(id2);
    if (!frag2.jointedIds.includes(id1)) frag2.jointedIds.push(id1);

    if (frag1.jointedIds.length > 0 || frag2.jointedIds.length > 0) {
      const targetPos = frag2.mesh.position.clone();
      const targetRot = frag2.mesh.rotation.clone();
      const idealAngle = (Math.PI * 2) / FRAGMENT_COUNT;
      const angleDiff = Math.round((id2 - id1) * idealAngle);
      const newRot = new THREE.Euler(targetRot.x, targetRot.y - angleDiff, targetRot.z);
      const offset = new THREE.Vector3(
        Math.cos(newRot.y + idealAngle / 2) * 0.02,
        0,
        Math.sin(newRot.y + idealAngle / 2) * 0.02
      );
      frag1.mesh.position.copy(targetPos).add(offset);
      frag1.mesh.rotation.copy(newRot);
    }

    frag1.isJointed = true;
    frag2.isJointed = true;

    const outMat1 = frag1.outline.material as THREE.LineBasicMaterial;
    const outMat2 = frag2.outline.material as THREE.LineBasicMaterial;
    outMat1.color.set(0x00ff88);
    outMat2.color.set(0x00ff88);
    outMat1.opacity = 1;
    outMat2.opacity = 1;
    this.startPulse(frag1.outline);
    this.startPulse(frag2.outline);

    eventBus.emit('particleBurst', { position: frag1.mesh.position.clone().lerp(frag2.mesh.position, 0.5) });
    this.notifyFragmentMoved();
  }

  private startPulse(line: THREE.LineSegments): void {
    let phase = 0;
    const startTime = performance.now();
    const pulse = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      phase = elapsed * (1 / 0.6) * Math.PI * 2;
      const mat = line.material as THREE.LineBasicMaterial;
      mat.opacity = 0.5 + 0.5 * Math.sin(phase);
      if (elapsed < 4) requestAnimationFrame(pulse);
      else {
        mat.opacity = 0.6;
      }
    };
    pulse();
  }

  public reset(): void {
    this.fragments.forEach((frag) => {
      frag.mesh.position.copy(frag.initialPosition);
      frag.mesh.rotation.copy(frag.initialRotation);
      frag.jointedIds = [];
      frag.isSelected = false;
      frag.isJointed = false;
      const outMat = frag.outline.material as THREE.LineBasicMaterial;
      outMat.color.set(0x8b7355);
      outMat.opacity = 0.5;
      const glowMat = frag.glowMesh.material as THREE.MeshBasicMaterial;
      glowMat.opacity = 0;
      if (frag.heatMapMesh) {
        frag.mesh.remove(frag.heatMapMesh);
        frag.heatMapMesh = null;
      }
    });
    this.selectedId = null;
    eventBus.emit('resetComplete');
    this.notifyFragmentMoved();
  }

  public exportState(): void {
    const exportData: Record<number, any> = {};
    this.fragments.forEach((frag, id) => {
      const q = new THREE.Quaternion().setFromEuler(frag.mesh.rotation);
      exportData[id] = {
        id,
        position: { x: frag.mesh.position.x, y: frag.mesh.position.y, z: frag.mesh.position.z },
        quaternion: { x: q.x, y: q.y, z: q.z, w: q.w },
        jointedIds: [...frag.jointedIds],
        isJointed: frag.isJointed
      };
    });
    console.log('Fragment Export Data:', JSON.stringify(exportData, null, 2));
    eventBus.emit('exportComplete', exportData);
  }

  public getFragmentCount(): number {
    return this.fragments.size;
  }

  public getJointedCount(): number {
    let count = 0;
    this.fragments.forEach((f) => {
      if (f.isJointed) count++;
    });
    return count;
  }

  public getFragments(): Map<number, FragmentData> {
    return this.fragments;
  }

  public addHeatMap(id: number, scores: { vertexIndex: number; score: number }[]): void {
    const frag = this.fragments.get(id);
    if (!frag) return;

    if (frag.heatMapMesh) {
      frag.mesh.remove(frag.heatMapMesh);
    }

    const geo = frag.mesh.geometry.clone();
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
    const colors = new Float32Array(posAttr.count * 3);

    for (let i = 0; i < posAttr.count; i++) {
      const entry = scores[i] || { score: 50 };
      const score = Math.max(0, Math.min(100, entry.score));
      let r: number, g: number, b: number;
      if (score < 31) {
        r = 1; g = score / 31 * 0.5; b = 0.1;
      } else if (score < 71) {
        const t = (score - 31) / 40;
        r = 1 - t * 0.5;
        g = 0.5 + t * 0.5;
        b = 0.1;
      } else {
        const t = (score - 71) / 29;
        r = 0.5 - t * 0.4;
        g = 1;
        b = 0.2 + t * 0.3;
      }
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const heatMesh = new THREE.Mesh(geo, mat);
    heatMesh.scale.multiplyScalar(1.008);
    frag.mesh.add(heatMesh);
    frag.heatMapMesh = heatMesh;

    (mat as any).userData = { startOpacity: 0.65 };
    setTimeout(() => {
      const m = heatMesh.material as THREE.MeshBasicMaterial;
      const start = performance.now();
      const fade = () => {
        const t = Math.min(1, (performance.now() - start) / 1000);
        m.opacity = 0.65 * (1 - t);
        if (t < 1) requestAnimationFrame(fade);
        else {
          if (frag.heatMapMesh === heatMesh) {
            frag.mesh.remove(heatMesh);
            frag.heatMapMesh = null;
          }
        }
      };
      fade();
    }, 5000);
  }

  public dispose(): void {
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('mousedown', this.onMouseDown);
    canvas.removeEventListener('mousemove', this.onMouseMove);
    canvas.removeEventListener('mouseup', this.onMouseUp);
    canvas.removeEventListener('wheel', this.onWheel);
  }
}
