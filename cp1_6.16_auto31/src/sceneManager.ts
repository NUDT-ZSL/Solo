import * as THREE from 'three';
import { CityBuilder } from './cityBuilder';
import { Building } from './city/Building';
import { EventEmitter } from './utils/eventEmitter';
import type { BuildingMetadata } from './types';

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private eventEmitter: EventEmitter;
  private cityBuilder: CityBuilder;
  private buildings: Building[] = [];

  private ambientLight!: THREE.AmbientLight;
  private directionalLight!: THREE.DirectionalLight;
  private hemisphereLight!: THREE.HemisphereLight;

  private colorTemperature: number = 0.5;
  private isNight: boolean = false;

  private selectedBuilding: Building | null = null;
  private highlightMesh: THREE.LineSegments | null = null;

  private windowPoints: THREE.Points | null = null;
  private windowGeometries: THREE.BufferGeometry | null = null;

  private warmColor = new THREE.Color(0xff9f43);
  private coolColor = new THREE.Color(0x00d2d3);
  private daySkyColor = new THREE.Color(0x87ceeb);
  private nightSkyColor = new THREE.Color(0x0a0a1f);

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private clock: THREE.Clock;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    eventEmitter: EventEmitter
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.eventEmitter = eventEmitter;
    this.cityBuilder = new CityBuilder(scene);
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.init();
  }

  private init(): void {
    this.setupLights();
    this.buildCity();
    this.setupEventListeners();
    this.updateEnvironment();
  }

  private setupLights(): void {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(50, 100, 50);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 500;
    this.directionalLight.shadow.camera.left = -100;
    this.directionalLight.shadow.camera.right = 100;
    this.directionalLight.shadow.camera.top = 100;
    this.directionalLight.shadow.camera.bottom = -100;
    this.scene.add(this.directionalLight);

    this.hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x1a1a2e, 0.3);
    this.scene.add(this.hemisphereLight);
  }

  private buildCity(): void {
    const result = this.cityBuilder.build();
    this.buildings = result.buildings;
    this.createWindowParticles();
  }

  private createWindowParticles(): void {
    const windowPositions: number[] = [];
    const windowColors: number[] = [];
    const litFlags: number[] = [];

    for (const building of this.buildings) {
      const metadata = building.getMetadata();
      const { width, depth, height, position, litWindows, windowsCount } = metadata;

      const floors = Math.floor(height / 3);
      const windowsPerFloorX = Math.max(1, Math.floor(width / 2.5));
      const windowsPerFloorZ = Math.max(1, Math.floor(depth / 2.5));

      let windowIndex = 0;
      const totalWindows = floors * (windowsPerFloorX * 2 + windowsPerFloorZ * 2);
      const litSet = new Set<number>();

      while (litSet.size < Math.min(litWindows, totalWindows)) {
        litSet.add(Math.floor(Math.random() * totalWindows));
      }

      for (let floor = 0; floor < floors; floor++) {
        const y = 1.5 + floor * 3;

        for (let i = 0; i < windowsPerFloorX; i++) {
          const x = -width / 2 + (width / (windowsPerFloorX + 1)) * (i + 1);

          windowPositions.push(position.x + x, y, position.z + depth / 2 + 0.05);
          const isLit = litSet.has(windowIndex++) ? 1 : 0;
          litFlags.push(isLit);
          windowColors.push(1, 0.8, 0.4);

          windowPositions.push(position.x + x, y, position.z - depth / 2 - 0.05);
          isLit && litSet.has(windowIndex - 1) ? litFlags.push(1) : litFlags.push(litSet.has(windowIndex++) ? 1 : 0);
          windowColors.push(1, 0.8, 0.4);
        }

        for (let i = 0; i < windowsPerFloorZ; i++) {
          const z = -depth / 2 + (depth / (windowsPerFloorZ + 1)) * (i + 1);

          windowPositions.push(position.x + width / 2 + 0.05, y, position.z + z);
          const isLit = litSet.has(windowIndex++) ? 1 : 0;
          litFlags.push(isLit);
          windowColors.push(1, 0.8, 0.4);

          windowPositions.push(position.x - width / 2 - 0.05, y, position.z + z);
          isLit && litSet.has(windowIndex - 1) ? litFlags.push(1) : litFlags.push(litSet.has(windowIndex++) ? 1 : 0);
          windowColors.push(1, 0.8, 0.4);
        }
      }

      void windowsCount;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(windowPositions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(windowColors, 3));
    geometry.setAttribute('aLit', new THREE.Float32BufferAttribute(litFlags, 1));

    this.windowGeometries = geometry;

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 220, 100, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 200, 80, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 180, 60, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 0.6,
      map: texture,
      transparent: true,
      opacity: 0,
      vertexColors: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.windowPoints = new THREE.Points(geometry, material);
    this.windowPoints.visible = false;
    this.scene.add(this.windowPoints);
  }

  private setupEventListeners(): void {
    this.eventEmitter.on('environment:colorTempChange', (data) => {
      const { value } = data as { value: number };
      this.setColorTemperature(value);
    });

    this.eventEmitter.on('environment:dayNightToggle', (data) => {
      const { isNight } = data as { isNight: boolean };
      this.toggleDayNight(isNight);
    });

    this.renderer.domElement.addEventListener('dblclick', (event) => {
      this.onDoubleClick(event);
    });

    this.renderer.domElement.addEventListener('click', (event) => {
      this.onClick(event);
    });
  }

  private onDoubleClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const buildingMeshes = this.buildings.map((b) => b.getMesh());
    const intersects = this.raycaster.intersectObjects(buildingMeshes);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const buildingId = mesh.userData.buildingId;
      const building = this.buildings.find((b) => b.getMetadata().id === buildingId);

      if (building) {
        this.selectBuilding(building);
      }
    }
  }

  private onClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const buildingMeshes = this.buildings.map((b) => b.getMesh());
    const intersects = this.raycaster.intersectObjects(buildingMeshes);

    if (intersects.length === 0 && this.selectedBuilding) {
      this.deselectBuilding();
    }
  }

  private selectBuilding(building: Building): void {
    if (this.selectedBuilding === building) return;

    this.deselectBuilding();
    this.selectedBuilding = building;

    const metadata = building.getMetadata();
    const mesh = building.getMesh();

    const edges = new THREE.EdgesGeometry(mesh.geometry);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xff6b6b,
      linewidth: 2,
      transparent: true,
      opacity: 1,
    });

    this.highlightMesh = new THREE.LineSegments(edges, lineMaterial);
    this.highlightMesh.position.copy(mesh.position);
    this.scene.add(this.highlightMesh);

    this.eventEmitter.emit('building:selected', {
      buildingId: metadata.id,
      metadata: metadata,
    });
  }

  private deselectBuilding(): void {
    if (this.highlightMesh) {
      this.scene.remove(this.highlightMesh);
      this.highlightMesh.geometry.dispose();
      if (this.highlightMesh.material instanceof THREE.Material) {
        this.highlightMesh.material.dispose();
      }
      this.highlightMesh = null;
    }
    this.selectedBuilding = null;
    this.eventEmitter.emit('building:deselected');
  }

  public setColorTemperature(value: number): void {
    this.colorTemperature = value;
    this.updateEnvironment();
  }

  public toggleDayNight(isNight: boolean): void {
    this.isNight = isNight;
    this.updateEnvironment();

    if (this.windowPoints) {
      this.windowPoints.visible = isNight;
      if (isNight) {
        this.animateWindowOpacity(1);
      } else {
        this.animateWindowOpacity(0);
      }
    }
  }

  private animateWindowOpacity(targetOpacity: number): void {
    if (!this.windowPoints) return;

    const material = this.windowPoints.material as THREE.PointsMaterial;
    const startOpacity = material.opacity;
    const duration = 500;
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      material.opacity = startOpacity + (targetOpacity - startOpacity) * eased;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  private updateEnvironment(): void {
    const tempColor = new THREE.Color().lerpColors(
      this.warmColor,
      this.coolColor,
      this.colorTemperature
    );

    const ambientIntensity = this.isNight ? 0.15 : 0.4;
    const directionalIntensity = this.isNight ? 0.2 : 0.8;

    this.ambientLight.color.copy(tempColor);
    this.ambientLight.intensity = ambientIntensity;

    this.directionalLight.color.copy(tempColor);
    this.directionalLight.intensity = directionalIntensity;

    const skyColor = this.isNight ? this.nightSkyColor : this.daySkyColor;
    this.scene.background = skyColor;

    if (this.hemisphereLight) {
      this.hemisphereLight.color.copy(skyColor);
      this.hemisphereLight.intensity = this.isNight ? 0.1 : 0.3;
    }

    this.renderer.setClearColor(skyColor);
  }

  public update(): void {
    const time = this.clock.getElapsedTime();
    this.cityBuilder.updateBeaconLights(time);

    if (this.highlightMesh && this.selectedBuilding) {
      const pulse = Math.sin(time * 3) * 0.2 + 0.8;
      const material = this.highlightMesh.material as THREE.LineBasicMaterial;
      material.opacity = pulse;
    }
  }

  public getBuildings(): Building[] {
    return this.buildings;
  }

  public getCityBuilder(): CityBuilder {
    return this.cityBuilder;
  }

  public dispose(): void {
    this.cityBuilder.dispose();
    this.deselectBuilding();

    if (this.windowPoints) {
      this.windowPoints.geometry.dispose();
      if (this.windowPoints.material instanceof THREE.Material) {
        this.windowPoints.material.dispose();
      }
      this.scene.remove(this.windowPoints);
    }
  }
}
