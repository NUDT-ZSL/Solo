import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { eventBus, EVENTS } from './utils/EventBus';
import { ProcessedTimeData, ProcessedStationData, dataProcessor } from './DataProcessor';
import { POLLUTANT_COLORS, POLLUTANT_MAX, BAR_MAX_HEIGHT, PollutantData } from './data/mockData';

type PollutantKey = keyof PollutantData;

interface BarGroup {
  stationId: string;
  group: THREE.Group;
  bars: Map<PollutantKey, THREE.Mesh>;
  base: THREE.Mesh;
  labels: Map<PollutantKey, THREE.Sprite>;
  targetHeights: Map<PollutantKey, number>;
  currentHeights: Map<PollutantKey, number>;
  highlightRing?: THREE.Mesh;
  isHovered: boolean;
  targetScale: number;
  currentScale: number;
}

const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

function createValueLabel(value: number): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.width = 128;
  canvas.height = 64;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = 'bold 32px Arial';
  context.fillStyle = 'rgba(255, 255, 255, 0.95)';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.shadowColor = 'rgba(0, 0, 0, 0.8)';
  context.shadowBlur = 4;
  context.fillText(value.toFixed(1), canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.2, 0.6, 1);
  sprite.renderOrder = 100;

  return sprite;
}

function updateValueLabel(sprite: THREE.Sprite, value: number): void {
  const material = sprite.material as THREE.SpriteMaterial;
  const texture = material.map as THREE.CanvasTexture;
  if (!texture || !texture.image) return;

  const canvas = texture.image as HTMLCanvasElement;
  const context = canvas.getContext('2d')!;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = 'bold 32px Arial';
  context.fillStyle = 'rgba(255, 255, 255, 0.95)';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.shadowColor = 'rgba(0, 0, 0, 0.8)';
  context.shadowBlur = 4;
  context.fillText(value.toFixed(1), canvas.width / 2, canvas.height / 2);

  texture.needsUpdate = true;
}

function createGradientBar(color: string, height: number, radius: number = 0.25): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(radius, radius, height, 16, 1, false);

  const baseColor = new THREE.Color(color);
  const topColor = baseColor.clone().multiplyScalar(1.5);

  const colors: number[] = [];
  const positions = geometry.attributes.position;
  const vertexCount = positions.count;

  for (let i = 0; i < vertexCount; i++) {
    const y = positions.getY(i);
    const t = (y + height / 2) / height;
    const r = baseColor.r + (topColor.r - baseColor.r) * t;
    const g = baseColor.g + (topColor.g - baseColor.g) * t;
    const b = baseColor.b + (topColor.b - baseColor.b) * t;
    colors.push(r, g, b);
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.MeshPhongMaterial({
    vertexColors: true,
    shininess: 80,
    specular: 0x333333,
    transparent: true,
    opacity: 0.9,
  });

  return new THREE.Mesh(geometry, material);
}

class SceneManager {
  private container: HTMLElement | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private controls: OrbitControls | null = null;
  private animationId: number | null = null;

  private barGroups: Map<string, BarGroup> = new Map();
  private groundGrid: THREE.GridHelper | null = null;

  private isAnimating: boolean = false;
  private animationStartTime: number = 0;
  private animationDuration: number = 500;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private hoveredStation: string | null = null;
  private clickedStation: string | null = null;

  private lastUpdateTime: number = 0;

  init(container: HTMLElement): void {
    this.container = container;

    this.setupScene();
    this.setupLights();
    this.setupGround();
    this.setupEventListeners();

    eventBus.on(EVENTS.DATA_UPDATED, this.handleDataUpdate.bind(this));
    eventBus.on(EVENTS.STATION_HOVER, this.handleStationHoverFromUI.bind(this));

    this.animate();
  }

  private setupScene(): void {
    if (!this.container) return;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a15);

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    this.camera.position.set(15, 10, 15);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false;

    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minPolarAngle = 0;
    this.controls.maxPolarAngle = (Math.PI / 180) * 60;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 30;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
  }

  private setupLights(): void {
    if (!this.scene) return;

    const ambientLight = new THREE.AmbientLight(0x404050, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x6080ff, 0.3);
    fillLight.position.set(-10, 5, -10);
    this.scene.add(fillLight);
  }

  private setupGround(): void {
    if (!this.scene) return;

    this.groundGrid = new THREE.GridHelper(30, 20, 0x222233, 0x222233);
    this.groundGrid.position.y = -0.05;
    (this.groundGrid.material as THREE.Material).transparent = true;
    (this.groundGrid.material as THREE.Material).opacity = 0.3;
    this.scene.add(this.groundGrid);

    const groundGeometry = new THREE.PlaneGeometry(30, 30);
    const groundMaterial = new THREE.MeshBasicMaterial({
      color: 0x0f0f1a,
      transparent: true,
      opacity: 0.5,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.06;
    this.scene.add(ground);
  }

  private setupEventListeners(): void {
    if (!this.container || !this.renderer) return;

    window.addEventListener('resize', this.handleResize.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.renderer.domElement.addEventListener('click', this.handleClick.bind(this));
  }

  private handleResize(): void {
    if (!this.container || !this.camera || !this.renderer) return;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.container || !this.camera || !this.scene) return;

    const rect = this.renderer!.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.checkHover();
  }

  private handleClick(event: MouseEvent): void {
    if (!this.hoveredStation) {
      this.clickedStation = null;
      eventBus.emit(EVENTS.STATION_CLICK, null);
      return;
    }

    this.clickedStation = this.hoveredStation;
    const stationData = this.getStationDataById(this.hoveredStation);
    eventBus.emit(EVENTS.STATION_CLICK, stationData);
  }

  private getStationDataById(stationId: string): ProcessedStationData | null {
    const stations = dataProcessor.getStations();
    const station = stations.find((s) => s.id === stationId);
    if (!station) return null;

    const timePoints = dataProcessor.getTimePoints();
    const currentIndex = dataProcessor.getCurrentTimeIndex();
    const timePoint = timePoints[currentIndex];
    if (!timePoint) return null;

    const pos = mapLayerProxy.getPosition(stationId);

    return {
      id: station.id,
      name: station.name,
      position: pos || { x: 0, y: 0 },
      pollutants: timePoint.stations[station.id] || { pm25: 0, pm10: 0, o3: 0, no2: 0 },
    };
  }

  private checkHover(): void {
    if (!this.scene || !this.camera) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const barMeshes: THREE.Object3D[] = [];
    this.barGroups.forEach((bg) => {
      barMeshes.push(bg.base);
      bg.bars.forEach((bar) => barMeshes.push(bar));
    });

    const intersects = this.raycaster.intersectObjects(barMeshes, false);

    let newHovered: string | null = null;
    if (intersects.length > 0) {
      const obj = intersects[0].object;
      this.barGroups.forEach((bg, id) => {
        if (obj === bg.base || bg.bars.has(obj as any)) {
          newHovered = id;
        }
      });
    }

    if (newHovered !== this.hoveredStation) {
      if (this.hoveredStation) {
        this.setStationHovered(this.hoveredStation, false);
      }
      if (newHovered) {
        this.setStationHovered(newHovered, true);
      }
      this.hoveredStation = newHovered;
      eventBus.emit(EVENTS.STATION_HOVER, newHovered);
    }
  }

  private setStationHovered(stationId: string, hovered: boolean): void {
    const barGroup = this.barGroups.get(stationId);
    if (!barGroup) return;

    barGroup.isHovered = hovered;
    barGroup.targetScale = hovered ? 1.2 : 1.0;

    if (hovered && !barGroup.highlightRing) {
      const ringGeometry = new THREE.RingGeometry(1.0, 1.1, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02;
      barGroup.group.add(ring);
      barGroup.highlightRing = ring;
    }

    if (!hovered && barGroup.highlightRing) {
      barGroup.group.remove(barGroup.highlightRing);
      barGroup.highlightRing.geometry.dispose();
      (barGroup.highlightRing.material as THREE.Material).dispose();
      barGroup.highlightRing = undefined;
    }
  }

  private handleStationHoverFromUI(stationId: string | null): void {
    if (stationId === this.hoveredStation) return;

    if (this.hoveredStation) {
      this.setStationHovered(this.hoveredStation, false);
    }
    if (stationId) {
      this.setStationHovered(stationId, true);
    }
    this.hoveredStation = stationId;
  }

  private handleDataUpdate(data: ProcessedTimeData): void {
    const now = performance.now();
    if (now - this.lastUpdateTime < 16) return;
    this.lastUpdateTime = now;

    if (this.barGroups.size === 0) {
      this.createBarGroups(data.stations);
    }

    data.stations.forEach((station) => {
      this.updateBarTargetHeights(station.id, station.pollutants);
    });

    this.isAnimating = true;
    this.animationStartTime = performance.now();
  }

  private createBarGroups(stations: ProcessedStationData[]): void {
    if (!this.scene) return;

    const pollutantKeys: PollutantKey[] = ['pm25', 'pm10', 'o3', 'no2'];
    const barSpacing = 0.55;
    const totalWidth = barSpacing * 3;

    stations.forEach((station, idx) => {
      const group = new THREE.Group();
      group.position.set(station.position.x, 0, station.position.y);
      group.userData.stationId = station.id;

      const baseGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 32);
      const baseMaterial = new THREE.MeshPhongMaterial({
        color: 0x2d2d44,
        transparent: true,
        opacity: 0.8,
        shininess: 60,
        specular: 0x444466,
      });
      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      base.position.y = 0.05;
      group.add(base);

      const bars = new Map<PollutantKey, THREE.Mesh>();
      const labels = new Map<PollutantKey, THREE.Sprite>();
      const targetHeights = new Map<PollutantKey, number>();
      const currentHeights = new Map<PollutantKey, number>();

      pollutantKeys.forEach((key, i) => {
        const offsetX = -totalWidth / 2 + i * barSpacing;
        const value = station.pollutants[key];
        const height = (value / POLLUTANT_MAX) * BAR_MAX_HEIGHT;

        const bar = createGradientBar(POLLUTANT_COLORS[key], Math.max(0.01, height), 0.2);
        bar.position.set(offsetX, 0.1 + height / 2, 0);
        bar.userData.pollutant = key;
        bar.userData.stationId = station.id;
        group.add(bar);
        bars.set(key, bar);

        const label = createValueLabel(value);
        label.position.set(offsetX, 0.1 + height + 0.4, 0);
        group.add(label);
        labels.set(key, label);

        targetHeights.set(key, height);
        currentHeights.set(key, height);
      });

      this.scene!.add(group);

      this.barGroups.set(station.id, {
        stationId: station.id,
        group,
        bars,
        base,
        labels,
        targetHeights,
        currentHeights,
        isHovered: false,
        targetScale: 1.0,
        currentScale: 1.0,
      });
    });
  }

  private updateBarTargetHeights(stationId: string, pollutants: PollutantData): void {
    const barGroup = this.barGroups.get(stationId);
    if (!barGroup) return;

    const pollutantKeys: PollutantKey[] = ['pm25', 'pm10', 'o3', 'no2'];
    pollutantKeys.forEach((key) => {
      const value = pollutants[key];
      const height = (value / POLLUTANT_MAX) * BAR_MAX_HEIGHT;
      barGroup.targetHeights.set(key, Math.max(0.01, height));

      const label = barGroup.labels.get(key);
      if (label) {
        updateValueLabel(label, value);
      }
    });
  }

  private updateBarGeometry(bar: THREE.Mesh, newHeight: number): void {
    const geometry = bar.geometry as THREE.CylinderGeometry;
    const positions = geometry.attributes.position;
    const colors = geometry.attributes.color;

    const currentTopY = geometry.parameters.height / 2;
    const newTopY = newHeight / 2;
    const currentBottomY = -geometry.parameters.height / 2;
    const newBottomY = -newHeight / 2;

    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      if (y > 0) {
        positions.setY(i, newTopY);
      } else if (y < 0) {
        positions.setY(i, newBottomY);
      }
    }

    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.parameters.height = newHeight;
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const now = performance.now();

    if (this.isAnimating) {
      const elapsed = now - this.animationStartTime;
      const progress = Math.min(elapsed / this.animationDuration, 1);
      const eased = easeInOutCubic(progress);

      this.barGroups.forEach((barGroup) => {
        const pollutantKeys: PollutantKey[] = ['pm25', 'pm10', 'o3', 'no2'];
        const barSpacing = 0.55;
        const totalWidth = barSpacing * 3;

        pollutantKeys.forEach((key, i) => {
          const bar = barGroup.bars.get(key);
          const label = barGroup.labels.get(key);
          const targetHeight = barGroup.targetHeights.get(key) || 0;
          const currentHeight = barGroup.currentHeights.get(key) || 0;
          const offsetX = -totalWidth / 2 + i * barSpacing;

          const newHeight = currentHeight + (targetHeight - currentHeight) * eased;

          if (bar) {
            this.updateBarGeometry(bar, newHeight);
            bar.position.y = 0.1 + newHeight / 2;
            bar.position.x = offsetX;
          }

          if (label) {
            label.position.y = 0.1 + newHeight + 0.4;
            label.position.x = offsetX;
          }

          barGroup.currentHeights.set(key, newHeight);
        });

        const scaleDiff = barGroup.targetScale - barGroup.currentScale;
        const newScale = barGroup.currentScale + scaleDiff * Math.min(eased * 2, 1);
        barGroup.group.scale.setScalar(newScale);
        barGroup.currentScale = newScale;
      });

      if (progress >= 1) {
        this.isAnimating = false;
      }
    } else {
      this.barGroups.forEach((barGroup) => {
        if (Math.abs(barGroup.targetScale - barGroup.currentScale) > 0.001) {
          const scaleDiff = barGroup.targetScale - barGroup.currentScale;
          const newScale = barGroup.currentScale + scaleDiff * 0.15;
          barGroup.group.scale.setScalar(newScale);
          barGroup.currentScale = newScale;
        }
      });
    }

    if (this.controls) {
      this.controls.update();
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  resize(): void {
    this.handleResize();
  }

  dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    window.removeEventListener('resize', this.handleResize.bind(this));

    this.barGroups.forEach((bg) => {
      bg.bars.forEach((bar) => {
        bar.geometry.dispose();
        (bar.material as THREE.Material).dispose();
      });
      bg.labels.forEach((label) => {
        const material = label.material as THREE.SpriteMaterial;
        if (material.map) material.map.dispose();
        material.dispose();
      });
      bg.base.geometry.dispose();
      (bg.base.material as THREE.Material).dispose();
      if (bg.highlightRing) {
        bg.highlightRing.geometry.dispose();
        (bg.highlightRing.material as THREE.Material).dispose();
      }
    });

    if (this.groundGrid) {
      this.groundGrid.geometry.dispose();
      (this.groundGrid.material as THREE.Material).dispose();
    }

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }

    if (this.controls) {
      this.controls.dispose();
    }

    eventBus.off(EVENTS.DATA_UPDATED, this.handleDataUpdate.bind(this));
  }
}

export const sceneManager = new SceneManager();

const mapLayerProxy = {
  getPosition: (stationId: string) => {
    const stations = dataProcessor.getStations();
    const station = stations.find((s) => s.id === stationId);
    if (!station) return null;

    const timePoints = dataProcessor.getTimePoints();
    if (timePoints.length === 0) return null;

    const allLats = stations.map((s) => s.lat);
    const allLngs = stations.map((s) => s.lng);

    const latRange = Math.max(...allLats) - Math.min(...allLats) || 0.1;
    const lngRange = Math.max(...allLngs) - Math.min(...allLngs) || 0.1;

    const centerLat = (Math.min(...allLats) + Math.max(...allLats)) / 2;
    const centerLng = (Math.min(...allLngs) + Math.max(...allLngs)) / 2;

    const x = ((station.lng - centerLng) / lngRange) * 20;
    const y = ((station.lat - centerLat) / latRange) * 20;

    return { x, y };
  },
};
