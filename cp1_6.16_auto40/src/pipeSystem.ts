import * as THREE from 'three';
import {
  PIPE_CONFIG,
  PipeType,
  SCENE_CONFIG,
  randomRange,
  generatePipeId,
  lerp
} from './utils';

export interface PipeData {
  id: string;
  type: PipeType;
  curve: THREE.CatmullRomCurve3;
  points: THREE.Vector3[];
  depth: number;
  diameter: number;
}

export interface PipeMeshData {
  mesh: THREE.Mesh;
  data: PipeData;
  originalEmissive: THREE.Color;
  currentEmissiveIntensity: number;
  targetEmissiveIntensity: number;
  isFlashing: boolean;
  flashStartTime: number;
  visible: boolean;
  isLocked: boolean;
  markers: THREE.Mesh[];
}

export class PipeSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  public pipes: PipeMeshData[] = [];
  public pipeGroup: THREE.Group;
  public markerGroup: THREE.Group;

  private hoveredPipe: PipeMeshData | null = null;
  private onHoverCallback: ((pipe: PipeMeshData | null, point: THREE.Vector3 | null) => void) | null = null;

  private useLOD: boolean = false;
  private lodDistance: number = 150;
  private globalOpacity: number = 1;
  private lockedPipe: PipeMeshData | null = null;
  private onClickCallback: ((pipe: PipeMeshData | null, point: THREE.Vector3 | null) => void) | null = null;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.pipeGroup = new THREE.Group();
    this.pipeGroup.name = 'pipes';
    this.markerGroup = new THREE.Group();
    this.markerGroup.name = 'markers';

    this.scene.add(this.pipeGroup);
    this.scene.add(this.markerGroup);
  }

  public generatePipes(pipesPerType: number = 4): void {
    const types: PipeType[] = ['water', 'drainage', 'gas', 'power'];

    types.forEach((type) => {
      for (let i = 0; i < pipesPerType; i++) {
        const pipeData = this.createPipeData(type, i);
        this.createPipeMesh(pipeData);
      }
    });

    this.useLOD = this.pipes.length > 100;
  }

  private createPipeData(type: PipeType, index: number): PipeData {
    const { GROUND_SIZE, MIN_DEPTH, MAX_DEPTH } = SCENE_CONFIG;
    const halfSize = GROUND_SIZE / 2;

    const numPoints = Math.floor(randomRange(5, 9));
    const points: THREE.Vector3[] = [];
    const depth = randomRange(MIN_DEPTH, MAX_DEPTH);

    for (let i = 0; i < numPoints; i++) {
      const t = i / (numPoints - 1);
      const x = THREE.MathUtils.lerp(-halfSize + 20, halfSize - 20, t) + randomRange(-30, 30);
      const z = randomRange(-halfSize + 20, halfSize - 20);
      const y = -(depth + randomRange(-5, 5));
      points.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    curve.curveType = 'catmullrom';
    curve.tension = 0.5;

    return {
      id: generatePipeId(type, index),
      type,
      curve,
      points,
      depth,
      diameter: PIPE_CONFIG[type].diameter
    };
  }

  private createPipeMesh(data: PipeData): void {
    const { diameter } = PIPE_CONFIG[data.type];
    const { TUBULAR_SEGMENTS, CURVE_SEGMENTS } = SCENE_CONFIG;

    const geometry = new THREE.TubeGeometry(
      data.curve,
      CURVE_SEGMENTS,
      diameter / 2,
      TUBULAR_SEGMENTS,
      false
    );

    const color = new THREE.Color(PIPE_CONFIG[data.type].color);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.3,
      roughness: 0.6,
      emissive: color.clone(),
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 1
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const markers = this.createMarkers(data);

    const pipeMeshData: PipeMeshData = {
      mesh,
      data,
      originalEmissive: color.clone(),
      currentEmissiveIntensity: 0.2,
      targetEmissiveIntensity: 0.2,
      isFlashing: false,
      flashStartTime: 0,
      visible: true,
      isLocked: false,
      markers
    };

    this.pipes.push(pipeMeshData);
    this.pipeGroup.add(mesh);
    markers.forEach(m => this.markerGroup.add(m));
  }

  private createMarkers(data: PipeData): THREE.Mesh[] {
    const markers: THREE.Mesh[] = [];
    const { MARKER_SPACING, MARKER_RADIUS, CURVE_SEGMENTS } = SCENE_CONFIG;
    const curveLength = data.curve.getLength();
    const numMarkers = Math.floor(curveLength / MARKER_SPACING);

    const color = new THREE.Color(PIPE_CONFIG[data.type].color);
    const geometry = new THREE.SphereGeometry(MARKER_RADIUS, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.4
    });

    for (let i = 0; i <= numMarkers; i++) {
      const t = i / numMarkers;
      const point = data.curve.getPointAt(t);
      const marker = new THREE.Mesh(geometry, material.clone());
      marker.position.copy(point);
      marker.userData.pipeId = data.id;
      markers.push(marker);
    }

    return markers;
  }

  public setOnHoverCallback(
    callback: (pipe: PipeMeshData | null, point: THREE.Vector3 | null) => void
  ): void {
    this.onHoverCallback = callback;
  }

  public setOnClickCallback(
    callback: (pipe: PipeMeshData | null, point: THREE.Vector3 | null) => void
  ): void {
    this.onClickCallback = callback;
  }

  public setGlobalOpacity(opacity: number): void {
    this.globalOpacity = opacity;
    this.pipes.forEach(pipe => {
      const material = pipe.mesh.material as THREE.MeshStandardMaterial;
      if (!pipe.isFlashing) {
        material.opacity = opacity;
        material.transparent = opacity < 1;
      }
      pipe.markers.forEach(marker => {
        const markerMaterial = marker.material as THREE.MeshBasicMaterial;
        markerMaterial.opacity = 0.4 * opacity;
      });
    });
  }

  public checkClick(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes = this.pipes
      .filter(p => p.visible)
      .map(p => p.mesh);

    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const intersectedMesh = intersects[0].object as THREE.Mesh;
      const pipeData = this.pipes.find(p => p.mesh === intersectedMesh);

      if (pipeData) {
        if (this.lockedPipe === pipeData) {
          this.lockedPipe.isLocked = false;
          this.lockedPipe.targetEmissiveIntensity = 0.2;
          this.lockedPipe = null;
          if (this.onClickCallback) {
            this.onClickCallback(null, null);
          }
        } else {
          if (this.lockedPipe) {
            this.lockedPipe.isLocked = false;
            this.lockedPipe.targetEmissiveIntensity = 0.2;
          }
          this.lockedPipe = pipeData;
          this.lockedPipe.isLocked = true;
          this.lockedPipe.targetEmissiveIntensity = 0.8;
          if (this.onClickCallback) {
            this.onClickCallback(this.lockedPipe, intersects[0].point);
          }
        }
      }
    } else if (this.lockedPipe) {
      this.lockedPipe.isLocked = false;
      this.lockedPipe.targetEmissiveIntensity = 0.2;
      this.lockedPipe = null;
      if (this.onClickCallback) {
        this.onClickCallback(null, null);
      }
    }
  }

  public updateMouse(normalizedX: number, normalizedY: number): void {
    this.mouse.x = normalizedX;
    this.mouse.y = normalizedY;
  }

  public checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes = this.pipes
      .filter(p => p.visible && !p.isFlashing)
      .map(p => p.mesh);

    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const intersectedMesh = intersects[0].object as THREE.Mesh;
      const pipeData = this.pipes.find(p => p.mesh === intersectedMesh);

      if (pipeData && pipeData !== this.hoveredPipe) {
        if (this.hoveredPipe && !this.hoveredPipe.isLocked) {
          this.hoveredPipe.targetEmissiveIntensity = 0.2;
        }
        this.hoveredPipe = pipeData;
        if (!this.hoveredPipe.isLocked) {
          this.hoveredPipe.targetEmissiveIntensity = 0.8;
        }

        if (this.onHoverCallback && !this.lockedPipe) {
          this.onHoverCallback(this.hoveredPipe, intersects[0].point);
        }
      } else if (pipeData && this.onHoverCallback && !this.lockedPipe) {
        this.onHoverCallback(pipeData, intersects[0].point);
      }
    } else if (this.hoveredPipe) {
      if (!this.hoveredPipe.isLocked) {
        this.hoveredPipe.targetEmissiveIntensity = 0.2;
      }
      this.hoveredPipe = null;
      if (this.onHoverCallback && !this.lockedPipe) {
        this.onHoverCallback(null, null);
      }
    }
  }

  public update(deltaTime: number): void {
    const now = performance.now();

    this.pipes.forEach(pipe => {
      const material = pipe.mesh.material as THREE.MeshStandardMaterial;

      if (pipe.isFlashing) {
        const elapsed = (now - pipe.flashStartTime) / 1000;
        const flashDuration = 0.5;
        const totalFlashes = 3;
        const totalDuration = flashDuration * totalFlashes * 2;

        if (elapsed >= totalDuration) {
          pipe.isFlashing = false;
          material.opacity = this.globalOpacity;
          material.transparent = this.globalOpacity < 1;
          pipe.currentEmissiveIntensity = pipe.targetEmissiveIntensity;
        } else {
          const flashPhase = Math.floor(elapsed / flashDuration) % 2;
          material.transparent = true;
          material.opacity = flashPhase === 0 ? 0.2 * this.globalOpacity : this.globalOpacity;
        }
      } else {
        if (Math.abs(pipe.currentEmissiveIntensity - pipe.targetEmissiveIntensity) > 0.001) {
          pipe.currentEmissiveIntensity = lerp(
            pipe.currentEmissiveIntensity,
            pipe.targetEmissiveIntensity,
            deltaTime * 5
          );
          material.emissiveIntensity = pipe.currentEmissiveIntensity;
        }
      }

      if (pipe.markers.length > 0) {
        const markerMaterial = (pipe.markers[0].material as THREE.MeshBasicMaterial);
        if (pipe.isFlashing) {
          const elapsed = (now - pipe.flashStartTime) / 1000;
          const flashDuration = 0.5;
          const flashPhase = Math.floor(elapsed / flashDuration) % 2;
          markerMaterial.opacity = flashPhase === 0 ? 0.1 * this.globalOpacity : 0.4 * this.globalOpacity;
        } else {
          markerMaterial.opacity = 0.4 * this.globalOpacity;
        }
      }
    });

    if (this.useLOD) {
      this.updateLOD();
    }
  }

  private updateLOD(): void {
    const cameraPos = this.camera.position;

    this.pipes.forEach(pipe => {
      const distance = pipe.mesh.position.distanceTo(cameraPos);

      if (distance > this.lodDistance) {
        pipe.mesh.visible = false;
        pipe.markers.forEach(m => m.visible = false);
      } else {
        pipe.mesh.visible = pipe.visible;
        pipe.markers.forEach(m => m.visible = pipe.visible);
      }
    });
  }

  public setPipeVisibility(type: PipeType, visible: boolean): void {
    this.pipes.forEach(pipe => {
      if (pipe.data.type === type) {
        pipe.visible = visible;
        pipe.mesh.visible = visible && (!this.useLOD || pipe.mesh.position.distanceTo(this.camera.position) <= this.lodDistance);
        pipe.markers.forEach(m => {
          m.visible = visible && (!this.useLOD || pipe.mesh.position.distanceTo(this.camera.position) <= this.lodDistance);
        });
      }
    });
  }

  public flashPipeById(id: string): boolean {
    const pipe = this.pipes.find(p => p.data.id.toLowerCase() === id.toLowerCase());
    if (pipe) {
      pipe.isFlashing = true;
      pipe.flashStartTime = performance.now();
      return true;
    }
    return false;
  }

  public getPipeById(id: string): PipeMeshData | undefined {
    return this.pipes.find(p => p.data.id.toLowerCase() === id.toLowerCase());
  }

  public getPipeCount(): number {
    return this.pipes.length;
  }
}
