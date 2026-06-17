import * as THREE from 'three';

export interface BuildingData {
  id: string;
  position: THREE.Vector3;
  width: number;
  depth: number;
  height: number;
}

export interface SurfacePressure {
  buildingId: string;
  faceIndex: number;
  pressure: number;
  isWindward: boolean;
}

export class BuildingManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private buildings: Map<string, { mesh: THREE.Mesh; edges: THREE.LineSegments; data: BuildingData; edgeHighlight: THREE.LineSegments }> = new Map();
  private pressureLabels: Map<string, HTMLDivElement> = new Map();
  private selectedBuildingId: string | null = null;
  private maxBuildings = 6;
  private buildingCount = 0;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private container: HTMLElement;
  private isDragging = false;
  private dragStartPos = new THREE.Vector2();
  private dragFace: string = '';
  private pressureMode = false;
  private onBuildingChangeCallback: (() => void) | null = null;
  private groundPlane: THREE.Mesh;
  private plotSize = 200;
  private previewMesh: THREE.Mesh | null = null;
  private previewEdges: THREE.LineSegments | null = null;
  private previewVisible = false;
  private defaultWidth = 10;
  private defaultDepth = 10;
  private defaultHeight = 20;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, container: HTMLElement) {
    this.scene = scene;
    this.camera = camera;
    this.container = container;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    const groundGeometry = new THREE.PlaneGeometry(this.plotSize, this.plotSize);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d3748,
      roughness: 0.9,
      metalness: 0.1
    });
    this.groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.receiveShadow = true;
    this.groundPlane.name = 'ground';
    this.scene.add(this.groundPlane);

    const gridHelper = new THREE.GridHelper(this.plotSize, 20, 0x475569, 0x334155);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);

    this.createPreview();
  }

  private createPreview() {
    const geometry = new THREE.BoxGeometry(this.defaultWidth, this.defaultHeight, this.defaultDepth);
    const material = new THREE.MeshStandardMaterial({
      color: 0x3B82F6,
      transparent: true,
      opacity: 0,
      roughness: 0.5,
      metalness: 0.1,
      depthWrite: false
    });
    this.previewMesh = new THREE.Mesh(geometry, material);
    this.previewMesh.position.set(0, this.defaultHeight / 2, 0);
    this.previewMesh.visible = false;
    this.previewMesh.name = 'building_preview_mesh';
    this.scene.add(this.previewMesh);

    const edgeGeometry = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ 
      color: 0x3B82F6, 
      transparent: true, 
      opacity: 0 
    });
    this.previewEdges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    this.previewEdges.position.copy(this.previewMesh.position);
    this.previewEdges.visible = false;
    this.previewEdges.name = 'building_preview_edges';
    this.scene.add(this.previewEdges);
  }

  showPreview() {
    if (this.previewMesh && this.previewEdges) {
      this.previewMesh.visible = true;
      this.previewEdges.visible = true;
      this.previewVisible = true;
      const meshMat = this.previewMesh.material as THREE.MeshStandardMaterial;
      const edgeMat = this.previewEdges.material as THREE.LineBasicMaterial;
      meshMat.opacity = 0.25;
      edgeMat.opacity = 0.7;
    }
  }

  hidePreview() {
    if (this.previewMesh && this.previewEdges) {
      this.previewVisible = false;
      this.previewMesh.visible = false;
      this.previewEdges.visible = false;
      const meshMat = this.previewMesh.material as THREE.MeshStandardMaterial;
      const edgeMat = this.previewEdges.material as THREE.LineBasicMaterial;
      meshMat.opacity = 0;
      edgeMat.opacity = 0;
    }
  }

  resetPreview() {
    this.hidePreview();
    if (this.previewMesh) {
      this.previewMesh.position.set(0, this.defaultHeight / 2, 0);
    }
    if (this.previewEdges) {
      this.previewEdges.position.set(0, this.defaultHeight / 2, 0);
    }
  }

  updatePreviewPosition(event: MouseEvent): boolean {
    if (!this.previewMesh || !this.previewEdges) return false;

    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.groundPlane);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      const halfPlot = this.plotSize / 2;
      const x = Math.max(-halfPlot + 15, Math.min(halfPlot - 15, point.x));
      const z = Math.max(-halfPlot + 15, Math.min(halfPlot - 15, point.z));
      
      this.previewMesh.position.set(x, this.defaultHeight / 2, z);
      this.previewEdges.position.copy(this.previewMesh.position);
      
      if (!this.previewVisible) {
        this.showPreview();
      }
      return true;
    } else {
      this.hidePreview();
      return false;
    }
  }

  setOnBuildingChange(callback: () => void) {
    this.onBuildingChangeCallback = callback;
  }

  getBuildings(): BuildingData[] {
    return Array.from(this.buildings.values()).map(b => b.data);
  }

  getSelectedBuildingId(): string | null {
    return this.selectedBuildingId;
  }

  selectBuilding(id: string | null) {
    if (this.selectedBuildingId && this.buildings.has(this.selectedBuildingId)) {
      const oldBuilding = this.buildings.get(this.selectedBuildingId)!;
      (oldBuilding.mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
    }
    this.selectedBuildingId = id;
    if (id && this.buildings.has(id)) {
      const building = this.buildings.get(id)!;
      (building.mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x1e40af);
      (building.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.2;
    }
  }

  addBuilding(x: number, z: number): boolean {
    if (this.buildingCount >= this.maxBuildings) return false;

    const id = `building_${Date.now()}_${this.buildingCount}`;
    const width = 10;
    const depth = 10;
    const height = 20;

    const data: BuildingData = {
      id,
      position: new THREE.Vector3(x, height / 2, z),
      width,
      depth,
      height
    };

    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({
      color: 0xD3D3D3,
      transparent: true,
      opacity: 0.7,
      roughness: 0.7,
      metalness: 0.1
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(data.position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = id;
    mesh.userData.buildingId = id;

    const edgeGeometry = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.6 });
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    edges.position.copy(data.position);
    edges.name = `${id}_edges`;

    const highlightMaterial = new THREE.LineBasicMaterial({ color: 0xFFA500, transparent: true, opacity: 0 });
    const edgeHighlight = new THREE.LineSegments(edgeGeometry.clone(), highlightMaterial);
    edgeHighlight.position.copy(data.position);
    edgeHighlight.name = `${id}_highlight`;

    this.scene.add(mesh);
    this.scene.add(edges);
    this.scene.add(edgeHighlight);

    this.buildings.set(id, { mesh, edges, data, edgeHighlight });
    this.buildingCount++;

    this.resetPreview();
    this.updateAllEdgeHighlights();
    this.notifyChange();
    return true;
  }

  removeBuilding(id: string) {
    const building = this.buildings.get(id);
    if (!building) return;

    this.scene.remove(building.mesh);
    this.scene.remove(building.edges);
    this.scene.remove(building.edgeHighlight);
    building.mesh.geometry.dispose();
    (building.mesh.material as THREE.Material).dispose();
    building.edges.geometry.dispose();
    (building.edges.material as THREE.Material).dispose();
    building.edgeHighlight.geometry.dispose();
    (building.edgeHighlight.material as THREE.Material).dispose();

    this.buildings.delete(id);
    this.buildingCount--;

    const label = this.pressureLabels.get(id);
    if (label) {
      label.remove();
      this.pressureLabels.delete(id);
    }

    if (this.selectedBuildingId === id) {
      this.selectedBuildingId = null;
    }

    this.updateAllEdgeHighlights();
    this.notifyChange();
  }

  updateBuildingSize(id: string, width: number, depth: number, height: number) {
    const building = this.buildings.get(id);
    if (!building) return;

    width = Math.max(5, Math.min(20, width));
    depth = Math.max(5, Math.min(20, depth));
    height = Math.max(10, Math.min(40, height));

    building.data.width = width;
    building.data.depth = depth;
    building.data.height = height;
    building.data.position.y = height / 2;

    building.mesh.geometry.dispose();
    building.mesh.geometry = new THREE.BoxGeometry(width, height, depth);
    building.mesh.position.copy(building.data.position);

    building.edges.geometry.dispose();
    building.edges.geometry = new THREE.EdgesGeometry(building.mesh.geometry);
    building.edges.position.copy(building.data.position);

    building.edgeHighlight.geometry.dispose();
    building.edgeHighlight.geometry = new THREE.EdgesGeometry(building.mesh.geometry);
    building.edgeHighlight.position.copy(building.data.position);

    this.updateAllEdgeHighlights();
    this.notifyChange();
  }

  private updateAllEdgeHighlights() {
    const buildingList = Array.from(this.buildings.values());
    
    for (let i = 0; i < buildingList.length; i++) {
      const b1 = buildingList[i];
      let hasCloseNeighbor = false;

      for (let j = 0; j < buildingList.length; j++) {
        if (i === j) continue;
        const b2 = buildingList[j];
        
        const minDistX = (b1.data.width + b2.data.width) / 2 + 5;
        const minDistZ = (b1.data.depth + b2.data.depth) / 2 + 5;
        
        const distX = Math.abs(b1.data.position.x - b2.data.position.x);
        const distZ = Math.abs(b1.data.position.z - b2.data.position.z);
        
        if (distX < minDistX && distZ < minDistZ) {
          const overlapX = Math.min(
            b1.data.position.x + b1.data.width / 2,
            b2.data.position.x + b2.data.width / 2
          ) - Math.max(
            b1.data.position.x - b1.data.width / 2,
            b2.data.position.x - b2.data.width / 2
          );
          const overlapZ = Math.min(
            b1.data.position.z + b1.data.depth / 2,
            b2.data.position.z + b2.data.depth / 2
          ) - Math.max(
            b1.data.position.z - b1.data.depth / 2,
            b2.data.position.z - b2.data.depth / 2
          );
          
          if (overlapX > -5 && overlapZ > -5) {
            hasCloseNeighbor = true;
            break;
          }
        }
      }

      const highlightMat = b1.edgeHighlight.material as THREE.LineBasicMaterial;
      if (hasCloseNeighbor) {
        highlightMat.opacity = 1;
      } else {
        highlightMat.opacity = 0;
      }
    }
  }

  handleClick(event: MouseEvent, mode: 'place' | 'adjust'): boolean {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (mode === 'place') {
      const intersects = this.raycaster.intersectObject(this.groundPlane);
      if (intersects.length > 0) {
        const point = intersects[0].point;
        const halfPlot = this.plotSize / 2;
        const x = Math.max(-halfPlot + 15, Math.min(halfPlot - 15, point.x));
        const z = Math.max(-halfPlot + 15, Math.min(halfPlot - 15, point.z));
        return this.addBuilding(x, z);
      }
      return false;
    }

    const meshes = Array.from(this.buildings.values()).map(b => b.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);
    
    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const buildingId = mesh.userData.buildingId;
      this.selectBuilding(buildingId);
      
      if (this.pressureMode) {
        this.showPressureForBuilding(buildingId);
      }
      return true;
    } else {
      this.selectBuilding(null);
      return false;
    }
  }

  handleMouseDown(event: MouseEvent): boolean {
    if (!this.selectedBuildingId) return false;
    
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const building = this.buildings.get(this.selectedBuildingId);
    if (!building) return false;
    
    const intersects = this.raycaster.intersectObject(building.mesh);
    if (intersects.length > 0) {
      this.isDragging = true;
      this.dragStartPos.set(event.clientX, event.clientY);
      
      const face = intersects[0].face;
      if (face) {
        const normal = face.normal.clone();
        normal.transformDirection(building.mesh.matrixWorld);
        
        if (Math.abs(normal.x) > 0.5) {
          this.dragFace = 'width';
        } else if (Math.abs(normal.z) > 0.5) {
          this.dragFace = 'depth';
        } else if (normal.y > 0.5) {
          this.dragFace = 'height';
        }
      }
      return true;
    }
    return false;
  }

  handleMouseMove(event: MouseEvent): boolean {
    if (!this.isDragging || !this.selectedBuildingId) return false;
    
    const building = this.buildings.get(this.selectedBuildingId);
    if (!building) return false;
    
    const deltaX = event.clientX - this.dragStartPos.x;
    const deltaY = event.clientY - this.dragStartPos.y;
    
    const data = building.data;
    let newWidth = data.width;
    let newDepth = data.depth;
    let newHeight = data.height;
    
    if (this.dragFace === 'width') {
      newWidth = data.width + deltaX * 0.1;
    } else if (this.dragFace === 'depth') {
      newDepth = data.depth + deltaX * 0.1;
    } else if (this.dragFace === 'height') {
      newHeight = data.height - deltaY * 0.1;
    }
    
    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      this.updateBuildingSize(this.selectedBuildingId, newWidth, newDepth, newHeight);
      this.dragStartPos.set(event.clientX, event.clientY);
    }
    
    return true;
  }

  handleMouseUp(): boolean {
    if (this.isDragging) {
      this.isDragging = false;
      this.dragFace = '';
      return true;
    }
    return false;
  }

  setPressureMode(enabled: boolean) {
    this.pressureMode = enabled;
    if (!enabled) {
      this.clearAllPressureLabels();
    }
  }

  showPressureForBuilding(buildingId: string) {
    this.clearPressureLabelsForBuilding(buildingId);
    
    const building = this.buildings.get(buildingId);
    if (!building) return;
    
    const data = building.data;
    const centerPos = data.position.clone();
    
    const faces = [
      { name: 'front', normal: new THREE.Vector3(0, 0, -1), offset: new THREE.Vector3(0, 0, -data.depth / 2 - 0.1) },
      { name: 'back', normal: new THREE.Vector3(0, 0, 1), offset: new THREE.Vector3(0, 0, data.depth / 2 + 0.1) },
      { name: 'left', normal: new THREE.Vector3(-1, 0, 0), offset: new THREE.Vector3(-data.width / 2 - 0.1, 0, 0) },
      { name: 'right', normal: new THREE.Vector3(1, 0, 0), offset: new THREE.Vector3(data.width / 2 + 0.1, 0, 0) },
      { name: 'top', normal: new THREE.Vector3(0, 1, 0), offset: new THREE.Vector3(0, data.height / 2 + 0.1, 0) },
    ];
    
    faces.forEach((face, index) => {
      const isWindward = face.normal.x < 0;
      const basePressure = isWindward ? 125 : -125;
      const variation = Math.random() * 50 - 25;
      const pressure = isWindward 
        ? Math.max(50, Math.min(200, basePressure + variation))
        : Math.max(-200, Math.min(-50, basePressure + variation));
      
      const label = document.createElement('div');
      label.className = 'pressure-label';
      label.style.cssText = `
        position: absolute;
        padding: 4px 8px;
        font-size: 14px;
        font-weight: bold;
        color: ${isWindward ? '#FF4444' : '#4444FF'};
        background: rgba(0, 0, 0, 0.6);
        border-radius: 4px;
        pointer-events: none;
        text-shadow: 0 1px 2px rgba(0,0,0,0.8);
        opacity: 0;
        transition: opacity 0.2s ease;
        white-space: nowrap;
        z-index: 10;
      `;
      label.textContent = `${Math.round(pressure)} Pa`;
      label.dataset.buildingId = buildingId;
      label.dataset.faceIndex = index.toString();
      
      this.container.appendChild(label);
      this.pressureLabels.set(`${buildingId}_${index}`, label);
      
      requestAnimationFrame(() => {
        label.style.opacity = '1';
      });
    });
    
    this.updatePressureLabelPositions();
  }

  updatePressureLabelPositions() {
    this.pressureLabels.forEach((label, key) => {
      const [buildingId, faceIndexStr] = key.split('_');
      const faceIndex = parseInt(faceIndexStr);
      
      const building = this.buildings.get(buildingId);
      if (!building) return;
      
      const data = building.data;
      const facePositions = [
        new THREE.Vector3(0, data.height / 2, -data.depth / 2 - 0.5),
        new THREE.Vector3(0, data.height / 2, data.depth / 2 + 0.5),
        new THREE.Vector3(-data.width / 2 - 0.5, data.height / 2, 0),
        new THREE.Vector3(data.width / 2 + 0.5, data.height / 2, 0),
        new THREE.Vector3(0, data.height / 2 + 0.5, 0),
      ];
      
      const worldPos = facePositions[faceIndex].clone().add(data.position);
      const screenPos = worldPos.project(this.camera);
      
      const rect = this.container.getBoundingClientRect();
      const x = (screenPos.x + 1) / 2 * rect.width;
      const y = (-screenPos.y + 1) / 2 * rect.height;
      
      label.style.left = `${x - label.offsetWidth / 2}px`;
      label.style.top = `${y - label.offsetHeight / 2}px`;
    });
  }

  clearPressureLabelsForBuilding(buildingId: string) {
    const keysToRemove: string[] = [];
    this.pressureLabels.forEach((label, key) => {
      if (key.startsWith(buildingId)) {
        label.remove();
        keysToRemove.push(key);
      }
    });
    keysToRemove.forEach(key => this.pressureLabels.delete(key));
  }

  clearAllPressureLabels() {
    this.pressureLabels.forEach(label => label.remove());
    this.pressureLabels.clear();
  }

  setSectionView(enabled: boolean) {
    this.buildings.forEach((building) => {
      const mat = building.mesh.material as THREE.MeshStandardMaterial;
      if (enabled) {
        mat.opacity = 0.3;
      } else {
        mat.opacity = 0.7;
      }
    });
  }

  private notifyChange() {
    if (this.onBuildingChangeCallback) {
      this.onBuildingChangeCallback();
    }
  }

  getBuildingMeshes(): THREE.Mesh[] {
    return Array.from(this.buildings.values()).map(b => b.mesh);
  }

  getPlotSize(): number {
    return this.plotSize;
  }

  dispose() {
    this.buildings.forEach((building) => {
      building.mesh.geometry.dispose();
      (building.mesh.material as THREE.Material).dispose();
      building.edges.geometry.dispose();
      (building.edges.material as THREE.Material).dispose();
      building.edgeHighlight.geometry.dispose();
      (building.edgeHighlight.material as THREE.Material).dispose();
    });
    this.groundPlane.geometry.dispose();
    (this.groundPlane.material as THREE.Material).dispose();
    
    if (this.previewMesh) {
      this.previewMesh.geometry.dispose();
      (this.previewMesh.material as THREE.Material).dispose();
    }
    if (this.previewEdges) {
      this.previewEdges.geometry.dispose();
      (this.previewEdges.material as THREE.Material).dispose();
    }
    
    this.clearAllPressureLabels();
  }
}
