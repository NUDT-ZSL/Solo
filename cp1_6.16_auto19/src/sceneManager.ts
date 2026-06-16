import * as THREE from 'three';
import { sunPositionToDirection } from './sunCalculator';

export interface HighlightInfo {
  face: THREE.Mesh;
  area: number;
  position: THREE.Vector3;
}

export interface SelectionRectangle {
  mesh: THREE.Mesh;
  startPoint: THREE.Vector3;
  endPoint: THREE.Vector3;
  label: HTMLElement;
  chartCanvas: HTMLCanvasElement;
}

interface PulseAnimation {
  mesh: THREE.Mesh;
  startTime: number;
  duration: number;
  originalEmissive: THREE.Color;
}

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private buildingGroup: THREE.Group;
  private ground: THREE.Mesh;
  private sunLight: THREE.DirectionalLight;
  private sunLightHelper?: THREE.Line;
  private selectedFace: THREE.LineSegments | null = null;
  private areaLabel: HTMLElement | null = null;
  private highlightPosition: THREE.Vector3 | null = null;
  private selectionRectangles: SelectionRectangle[] = [];
  private isDraggingSelection: boolean = false;
  private selectionStart: THREE.Vector3 | null = null;
  private tempSelectionRect: THREE.Mesh | null = null;
  private pulseAnimations: PulseAnimation[] = [];
  private buildingMaterials: THREE.MeshStandardMaterial[] = [];
  private roofMaterial: THREE.MeshStandardMaterial | null = null;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, _renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.buildingGroup = new THREE.Group();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.ground = this.createGround();
    this.sunLight = this.createSunLight();
    this.createBuilding();

    this.scene.add(this.buildingGroup);
    this.scene.add(this.ground);
    this.scene.add(this.sunLight);
  }

  private createGround(): THREE.Mesh {
    const groundGeometry = new THREE.PlaneGeometry(100, 100, 1, 1);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'ground';

    const gridHelper = new THREE.GridHelper(100, 50, 0x4a4a4a, 0x333344);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);

    return ground;
  }

  private createRoughnessTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    const imageData = ctx.createImageData(256, 256);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = Math.random() * 60 + 180;
      imageData.data[i] = noise;
      imageData.data[i + 1] = noise;
      imageData.data[i + 2] = noise;
      imageData.data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
  }

  private createRoofGradientTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#E8E8E6');
    gradient.addColorStop(0.5, '#D5D5D3');
    gradient.addColorStop(1, '#C5C5C3');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const alpha = Math.random() * 0.08;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(x, y, 1, 1);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  createBuilding(): void {
    const roughnessTexture = this.createRoughnessTexture();
    const roofGradientTexture = this.createRoofGradientTexture();

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xC5C5C3,
      transparent: true,
      opacity: 0.85,
      roughness: 0.7,
      metalness: 0.05,
      roughnessMap: roughnessTexture,
      side: THREE.DoubleSide
    });
    this.buildingMaterials.push(wallMaterial);

    const wallGeometry = new THREE.BoxGeometry(8, 6, 10);
    const walls = new THREE.Mesh(wallGeometry, wallMaterial);
    walls.position.y = 3;
    walls.castShadow = true;
    walls.receiveShadow = true;
    walls.name = 'building_walls';
    this.buildingGroup.add(walls);

    this.roofMaterial = new THREE.MeshStandardMaterial({
      color: 0xD0D0CE,
      transparent: true,
      opacity: 0.9,
      roughness: 0.5,
      metalness: 0.02,
      map: roofGradientTexture,
      roughnessMap: roughnessTexture,
      side: THREE.DoubleSide
    });
    this.buildingMaterials.push(this.roofMaterial);

    const roofShape = new THREE.Shape();
    roofShape.moveTo(-5, 0);
    roofShape.lineTo(5, 0);
    roofShape.lineTo(5, 3);
    roofShape.lineTo(0, 4);
    roofShape.lineTo(-5, 3);
    roofShape.lineTo(-5, 0);

    const extrudeSettings = {
      depth: 8,
      bevelEnabled: false
    };

    const roofGeometry = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
    const roof = new THREE.Mesh(roofGeometry, this.roofMaterial);
    roof.rotation.x = -Math.PI / 2;
    roof.position.set(-4, 6, 5);
    roof.castShadow = true;
    roof.receiveShadow = true;
    roof.name = 'building_roof';
    this.buildingGroup.add(roof);

    this.buildingGroup.position.set(0, 0, 0);
  }

  private createSunLight(): THREE.DirectionalLight {
    const sunLight = new THREE.DirectionalLight(0xFFD700, 1);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 200;
    sunLight.shadow.camera.left = -50;
    sunLight.shadow.camera.right = 50;
    sunLight.shadow.camera.top = 50;
    sunLight.shadow.camera.bottom = -50;
    sunLight.shadow.bias = -0.0001;
    sunLight.shadow.radius = 2;
    sunLight.intensity = 0;

    return sunLight;
  }

  updateShadow(sunAzimuth: number, sunAltitude: number): void {
    if (sunAltitude <= 0) {
      this.sunLight.intensity = 0;
      if (this.sunLightHelper) {
        this.scene.remove(this.sunLightHelper);
        this.sunLightHelper = undefined;
      }
      return;
    }

    const direction = sunPositionToDirection(sunAzimuth, sunAltitude);
    const distance = 80;
    this.sunLight.position.set(
      direction.x * distance,
      direction.y * distance + 20,
      direction.z * distance
    );
    this.sunLight.target.position.set(0, 0, 0);

    const startIntensity = this.sunLight.intensity;
    const targetIntensity = Math.min(1.5, sunAltitude / 30 + 0.5);
    const startTime = performance.now();
    const duration = 500;

    const animateIntensity = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.sunLight.intensity = startIntensity + (targetIntensity - startIntensity) * eased;
      if (progress < 1) {
        requestAnimationFrame(animateIntensity);
      }
    };
    animateIntensity();

    this.createSunLightBeam(direction, distance);

    const color1 = new THREE.Color(0xFFF8DC);
    const color2 = new THREE.Color(0xFFD700);
    const t = Math.min(1, sunAltitude / 60);
    this.sunLight.color.copy(color1).lerp(color2, t);
  }

  private createSunLightBeam(direction: { x: number; y: number; z: number }, distance: number): void {
    if (this.sunLightHelper) {
      this.scene.remove(this.sunLightHelper);
    }

    const points = [];
    const startPos = new THREE.Vector3(
      direction.x * distance,
      direction.y * distance + 20,
      direction.z * distance
    );
    const endPos = new THREE.Vector3(0, 0, 0);
    points.push(startPos);
    points.push(endPos);

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xFFD700,
      transparent: true,
      opacity: 0.6
    });

    this.sunLightHelper = new THREE.Line(geometry, material);
    this.scene.add(this.sunLightHelper);
  }

  highlightFace(intersect: THREE.Intersection): HighlightInfo | null {
    this.clearHighlight();

    const mesh = intersect.object as THREE.Mesh;
    if (!mesh.geometry || !mesh.geometry.index) return null;

    const faceIndex = intersect.faceIndex;
    if (faceIndex === undefined) return null;

    const geometry = mesh.geometry;
    const indices = geometry.index!.array;
    const positions = geometry.attributes.position.array;

    const v1 = new THREE.Vector3(
      positions[indices[faceIndex * 3] * 3],
      positions[indices[faceIndex * 3] * 3 + 1],
      positions[indices[faceIndex * 3] * 3 + 2]
    );
    const v2 = new THREE.Vector3(
      positions[indices[faceIndex * 3 + 1] * 3],
      positions[indices[faceIndex * 3 + 1] * 3 + 1],
      positions[indices[faceIndex * 3 + 1] * 3 + 2]
    );
    const v3 = new THREE.Vector3(
      positions[indices[faceIndex * 3 + 2] * 3],
      positions[indices[faceIndex * 3 + 2] * 3 + 1],
      positions[indices[faceIndex * 3 + 2] * 3 + 2]
    );

    const localToWorld = mesh.matrixWorld;
    v1.applyMatrix4(localToWorld);
    v2.applyMatrix4(localToWorld);
    v3.applyMatrix4(localToWorld);

    const edgeGeometry = new THREE.BufferGeometry();
    const edgeVertices = new Float32Array([
      v1.x, v1.y, v1.z,
      v2.x, v2.y, v2.z,
      v2.x, v2.y, v2.z,
      v3.x, v3.y, v3.z,
      v3.x, v3.y, v3.z,
      v1.x, v1.y, v1.z
    ]);
    edgeGeometry.setAttribute('position', new THREE.BufferAttribute(edgeVertices, 3));

    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0xFF6B35,
      linewidth: 2,
      transparent: true,
      opacity: 1
    });

    this.selectedFace = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    this.scene.add(this.selectedFace);

    const edge1 = new THREE.Vector3().subVectors(v2, v1);
    const edge2 = new THREE.Vector3().subVectors(v3, v1);
    const area = edge1.cross(edge2).length() / 2;

    const center = new THREE.Vector3()
      .add(v1)
      .add(v2)
      .add(v3)
      .multiplyScalar(1 / 3);

    const normal = intersect.face?.normal.clone() || new THREE.Vector3(0, 1, 0);
    normal.transformDirection(mesh.matrixWorld);
    center.add(normal.multiplyScalar(0.3));

    this.highlightPosition = center.clone();
    this.triggerPulseAnimation(mesh);
    this.showAreaLabel(area, center);

    return { face: mesh, area, position: center };
  }

  private triggerPulseAnimation(mesh: THREE.Mesh): void {
    const material = mesh.material as THREE.MeshStandardMaterial;
    if (!material || !material.emissive) return;

    const pulse: PulseAnimation = {
      mesh,
      startTime: performance.now(),
      duration: 300,
      originalEmissive: material.emissive.clone()
    };

    this.pulseAnimations.push(pulse);

    const animatePulse = () => {
      const elapsed = performance.now() - pulse.startTime;
      const progress = Math.min(elapsed / pulse.duration, 1);
      const intensity = Math.sin(progress * Math.PI) * 0.5;
      
      if (material.emissive) {
        material.emissive.setRGB(intensity * 1.0, intensity * 0.42, intensity * 0.21);
      }

      if (progress < 1) {
        requestAnimationFrame(animatePulse);
      } else {
        if (material.emissive) {
          material.emissive.copy(pulse.originalEmissive);
        }
        const index = this.pulseAnimations.indexOf(pulse);
        if (index > -1) {
          this.pulseAnimations.splice(index, 1);
        }
      }
    };
    animatePulse();
  }

  private showAreaLabel(area: number, position: THREE.Vector3): void {
    this.clearAreaLabel();

    const label = document.createElement('div');
    label.style.position = 'absolute';
    label.style.background = 'rgba(255, 107, 53, 0.9)';
    label.style.color = '#FFFFFF';
    label.style.padding = '4px 10px';
    label.style.borderRadius = '4px';
    label.style.fontSize = '14px';
    label.style.fontWeight = 'bold';
    label.style.pointerEvents = 'none';
    label.style.zIndex = '1000';
    label.style.transform = 'translate(-50%, -100%)';
    label.style.whiteSpace = 'nowrap';
    label.textContent = `面积: ${area.toFixed(2)} m²`;

    document.body.appendChild(label);
    this.areaLabel = label;
    this.updateAreaLabelPosition(position);
  }

  updateAreaLabelPosition(position: THREE.Vector3): void {
    if (!this.areaLabel) return;

    const vector = position.clone();
    vector.project(this.camera);

    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

    this.areaLabel.style.left = `${x}px`;
    this.areaLabel.style.top = `${y - 10}px`;
  }

  clearHighlight(): void {
    if (this.selectedFace) {
      this.scene.remove(this.selectedFace);
      this.selectedFace.geometry.dispose();
      (this.selectedFace.material as THREE.Material).dispose();
      this.selectedFace = null;
    }
    this.highlightPosition = null;
    this.clearAreaLabel();
  }

  getHighlightPosition(): THREE.Vector3 | null {
    return this.highlightPosition;
  }

  private clearAreaLabel(): void {
    if (this.areaLabel) {
      document.body.removeChild(this.areaLabel);
      this.areaLabel = null;
    }
  }

  startSelection(event: MouseEvent, clientRect: DOMRect): void {
    this.mouse.x = ((event.clientX - clientRect.left) / clientRect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - clientRect.top) / clientRect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.ground);

    if (intersects.length > 0) {
      this.isDraggingSelection = true;
      this.selectionStart = intersects[0].point.clone();
    }
  }

  updateSelection(event: MouseEvent, clientRect: DOMRect): void {
    if (!this.isDraggingSelection || !this.selectionStart) return;

    this.mouse.x = ((event.clientX - clientRect.left) / clientRect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - clientRect.top) / clientRect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.ground);

    if (intersects.length > 0) {
      const currentPoint = intersects[0].point;
      this.updateTempSelectionRect(this.selectionStart, currentPoint);
    }
  }

  private updateTempSelectionRect(start: THREE.Vector3, end: THREE.Vector3): void {
    if (this.tempSelectionRect) {
      this.scene.remove(this.tempSelectionRect);
      this.tempSelectionRect.geometry.dispose();
      (this.tempSelectionRect.material as THREE.Material).dispose();
    }

    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minZ = Math.min(start.z, end.z);
    const maxZ = Math.max(start.z, end.z);
    const width = maxX - minX;
    const depth = maxZ - minZ;

    const geometry = new THREE.PlaneGeometry(width, depth);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00FF88,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });

    this.tempSelectionRect = new THREE.Mesh(geometry, material);
    this.tempSelectionRect.rotation.x = -Math.PI / 2;
    this.tempSelectionRect.position.set(
      (minX + maxX) / 2,
      0.02,
      (minZ + maxZ) / 2
    );

    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineDashedMaterial({
      color: 0x00FF88,
      dashSize: 0.3,
      gapSize: 0.2,
      linewidth: 2
    });
    const lineSegments = new THREE.LineSegments(edges, lineMaterial);
    lineSegments.computeLineDistances();
    this.tempSelectionRect.add(lineSegments);

    this.scene.add(this.tempSelectionRect);
  }

  endSelection(
    event: MouseEvent,
    clientRect: DOMRect,
    computeShadowCoverage: (timeHours: number) => number,
    startTime: number,
    endTime: number
  ): void {
    if (!this.isDraggingSelection || !this.selectionStart) return;

    this.mouse.x = ((event.clientX - clientRect.left) / clientRect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - clientRect.top) / clientRect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.ground);

    if (intersects.length > 0 && this.tempSelectionRect) {
      const endPoint = intersects[0].point.clone();
      const rectMesh = this.tempSelectionRect.clone();
      this.scene.add(rectMesh);

      const chartCanvas = this.createMiniChart();
      const label = this.createDurationLabel();

      const selection: SelectionRectangle = {
        mesh: rectMesh,
        startPoint: this.selectionStart.clone(),
        endPoint,
        label,
        chartCanvas
      };

      this.selectionRectangles.push(selection);
      this.updateShadowDuration(selection, computeShadowCoverage, startTime, endTime);
    }

    if (this.tempSelectionRect) {
      this.scene.remove(this.tempSelectionRect);
      this.tempSelectionRect = null;
    }

    this.isDraggingSelection = false;
    this.selectionStart = null;
  }

  private createDurationLabel(): HTMLElement {
    const label = document.createElement('div');
    label.style.position = 'absolute';
    label.style.background = 'rgba(10, 10, 26, 0.9)';
    label.style.color = '#FFFFFF';
    label.style.padding = '8px 12px';
    label.style.borderRadius = '6px';
    label.style.fontSize = '13px';
    label.style.fontWeight = '500';
    label.style.pointerEvents = 'none';
    label.style.zIndex = '1000';
    label.style.transform = 'translate(-50%, -100%)';
    label.style.whiteSpace = 'nowrap';
    label.style.border = '1px solid #00FF88';
    document.body.appendChild(label);
    return label;
  }

  private createMiniChart(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 40;
    canvas.style.position = 'absolute';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '1000';
    canvas.style.transform = 'translate(-50%, 0)';
    canvas.style.background = 'rgba(10, 10, 26, 0.8)';
    canvas.style.borderRadius = '4px';
    canvas.style.border = '1px solid #333344';
    document.body.appendChild(canvas);
    return canvas;
  }

  updateShadowDuration(
    selection: SelectionRectangle,
    computeShadowCoverage: (timeHours: number) => number,
    startTime: number,
    endTime: number
  ): void {
    const dataPoints: number[] = [];
    let totalDuration = 0;

    for (let t = startTime; t <= endTime; t += 0.25) {
      const coverage = computeShadowCoverage(t);
      dataPoints.push(coverage);
      if (coverage > 0.1) {
        totalDuration += 0.25;
      }
    }

    const hours = Math.floor(totalDuration);
    const minutes = Math.round((totalDuration - hours) * 60);
    selection.label.textContent = `阴影时长: ${hours}小时${minutes}分钟`;

    this.drawMiniChart(selection.chartCanvas, dataPoints);
    this.updateSelectionLabelPosition(selection);
  }

  private drawMiniChart(canvas: HTMLCanvasElement, data: number[]): void {
    const ctx = canvas.getContext('2d')!;
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = '#333344';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height - 1);
    ctx.lineTo(width, height - 1);
    ctx.stroke();

    ctx.strokeStyle = '#00FF88';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const xStep = width / (data.length - 1);
    const yScale = height - 4;

    for (let i = 0; i < data.length; i++) {
      const x = i * xStep;
      const y = height - 2 - data[i] * yScale;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  updateSelectionLabelPosition(selection: SelectionRectangle): void {
    const center = new THREE.Vector3(
      (selection.startPoint.x + selection.endPoint.x) / 2,
      0.1,
      (selection.startPoint.z + selection.endPoint.z) / 2
    );

    const vector = center.clone();
    vector.project(this.camera);

    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

    selection.label.style.left = `${x}px`;
    selection.label.style.top = `${y - 60}px`;

    selection.chartCanvas.style.left = `${x}px`;
    selection.chartCanvas.style.top = `${y - 50}px`;
  }

  getBuildingMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    this.buildingGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child);
      }
    });
    return meshes;
  }

  getGround(): THREE.Mesh {
    return this.ground;
  }

  clearSelections(): void {
    this.selectionRectangles.forEach((sel) => {
      this.scene.remove(sel.mesh);
      document.body.removeChild(sel.label);
      document.body.removeChild(sel.chartCanvas);
    });
    this.selectionRectangles = [];
  }

  updateAllSelections(
    computeShadowCoverage: (timeHours: number) => number,
    startTime: number,
    endTime: number
  ): void {
    this.selectionRectangles.forEach((sel) => {
      this.updateShadowDuration(sel, computeShadowCoverage, startTime, endTime);
    });
  }

  updateSelectionPositions(): void {
    this.selectionRectangles.forEach((sel) => {
      this.updateSelectionLabelPosition(sel);
    });
  }

  computeShadowCoverageAtPoint(
    worldX: number,
    worldZ: number,
    sunDirection: THREE.Vector3
  ): boolean {
    const rayOrigin = new THREE.Vector3(worldX, 50, worldZ);
    const rayDir = sunDirection.clone().normalize();

    const raycaster = new THREE.Raycaster(rayOrigin, rayDir, 0, 100);
    const buildingMeshes = this.getBuildingMeshes();
    const intersects = raycaster.intersectObjects(buildingMeshes, false);

    return intersects.length > 0;
  }

  getSelectionCoverage(selection: SelectionRectangle, sunDirection: THREE.Vector3): number {
    const minX = Math.min(selection.startPoint.x, selection.endPoint.x);
    const maxX = Math.max(selection.startPoint.x, selection.endPoint.x);
    const minZ = Math.min(selection.startPoint.z, selection.endPoint.z);
    const maxZ = Math.max(selection.startPoint.z, selection.endPoint.z);

    const gridSize = 10;
    let shadowCount = 0;
    let totalCount = 0;

    for (let i = 0; i <= gridSize; i++) {
      for (let j = 0; j <= gridSize; j++) {
        const x = minX + (maxX - minX) * (i / gridSize);
        const z = minZ + (maxZ - minZ) * (j / gridSize);

        if (this.computeShadowCoverageAtPoint(x, z, sunDirection)) {
          shadowCount++;
        }
        totalCount++;
      }
    }

    return shadowCount / totalCount;
  }

  updateBuildingMaterialRoughness(baseRoughness: number): void {
    this.buildingMaterials.forEach((mat) => {
      mat.roughness = baseRoughness;
      mat.needsUpdate = true;
    });
  }
}
