import * as THREE from 'three';

export type LightType = 'ambient' | 'point' | 'spot';

export interface LightEntry {
  id: string;
  type: LightType;
  light: THREE.AmbientLight | THREE.PointLight | THREE.SpotLight;
  marker?: THREE.Mesh;
  helperLine?: THREE.Line;
  baseIntensity: number;
  isDragging?: boolean;
}

const PRESET_COLORS = [
  0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3,
  0xf38181, 0xaa96da, 0xfcbad3, 0xa8d8ea
];

const MAX_POINT_LIGHTS = 5;
const MAX_SPOT_LIGHTS = 3;

export class LightManager {
  private scene: THREE.Scene;
  private lights: Map<string, LightEntry> = new Map();
  private pointLightCount = 0;
  private spotLightCount = 0;
  private ambientLightCount = 0;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private dragPlane: THREE.Plane;
  private dragOffset: THREE.Vector3;
  private draggedLightId: string | null = null;

  private onLightChangeCallback?: () => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.dragPlane = new THREE.Plane();
    this.dragOffset = new THREE.Vector3();

    this.initializeDefaultLights();
  }

  private initializeDefaultLights(): void {
    this.addAmbientLight(0xffffff, 0.3);
    this.addPointLight(0xffffff, 1.0, new THREE.Vector3(3, 5, 5));
  }

  public setOnLightChangeCallback(callback: () => void): void {
    this.onLightChangeCallback = callback;
  }

  private generateId(): string {
    return 'light_' + Math.random().toString(36).substr(2, 9);
  }

  private getRandomPosition(): THREE.Vector3 {
    const radius = 4 + Math.random() * 4;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;

    return new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  private getRandomColor(): number {
    return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
  }

  private createLightMarker(color: number): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.2, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9
    });
    const marker = new THREE.Mesh(geometry, material);
    return marker;
  }

  private createHelperLine(position: THREE.Vector3, _color: number): THREE.Line {
    const points = [
      new THREE.Vector3(0, 0, 0),
      position.clone()
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
      color: 0xffff00,
      dashSize: 0.15,
      gapSize: 0.1,
      transparent: true,
      opacity: 0.6
    });
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    return line;
  }

  private updateHelperLine(entry: LightEntry): void {
    if (!entry.helperLine || entry.type === 'ambient') return;

    const position = entry.light.position.clone();
    const points = [
      new THREE.Vector3(0, 0, 0),
      position
    ];
    entry.helperLine.geometry.setFromPoints(points);
    entry.helperLine.computeLineDistances();
    entry.helperLine.geometry.attributes.position.needsUpdate = true;
  }

  public addAmbientLight(color: number, intensity: number): string | null {
    if (this.ambientLightCount >= 1) return null;

    const id = this.generateId();
    const light = new THREE.AmbientLight(color, intensity);
    this.scene.add(light);

    const entry: LightEntry = {
      id,
      type: 'ambient',
      light,
      baseIntensity: intensity
    };

    this.lights.set(id, entry);
    this.ambientLightCount++;
    this.notifyChange();
    return id;
  }

  public addPointLight(color?: number, intensity?: number, position?: THREE.Vector3): string | null {
    if (this.pointLightCount >= MAX_POINT_LIGHTS) return null;

    const id = this.generateId();
    const lightColor = color ?? this.getRandomColor();
    const lightIntensity = intensity ?? 1.0;
    const lightPosition = position ?? this.getRandomPosition();

    const light = new THREE.PointLight(lightColor, lightIntensity, 50, 0.5);
    light.position.copy(lightPosition);
    light.castShadow = true;
    light.shadow.mapSize.width = 512;
    light.shadow.mapSize.height = 512;
    this.scene.add(light);

    const marker = this.createLightMarker(lightColor);
    marker.position.copy(lightPosition);
    this.scene.add(marker);

    const helperLine = this.createHelperLine(lightPosition, lightColor);
    this.scene.add(helperLine);

    const entry: LightEntry = {
      id,
      type: 'point',
      light,
      marker,
      helperLine,
      baseIntensity: lightIntensity
    };

    this.lights.set(id, entry);
    this.pointLightCount++;
    this.notifyChange();
    return id;
  }

  public addSpotLight(): string | null {
    if (this.spotLightCount >= MAX_SPOT_LIGHTS) return null;

    const id = this.generateId();
    const lightColor = this.getRandomColor();
    const lightPosition = this.getRandomPosition();

    const light = new THREE.SpotLight(lightColor, 1.0, 50, Math.PI / 6, 0.3, 0.5);
    light.position.copy(lightPosition);
    light.target.position.set(0, 0, 0);
    light.castShadow = true;
    light.shadow.mapSize.width = 512;
    light.shadow.mapSize.height = 512;
    this.scene.add(light);
    this.scene.add(light.target);

    const marker = this.createLightMarker(lightColor);
    marker.position.copy(lightPosition);
    this.scene.add(marker);

    const helperLine = this.createHelperLine(lightPosition, lightColor);
    this.scene.add(helperLine);

    const entry: LightEntry = {
      id,
      type: 'spot',
      light,
      marker,
      helperLine,
      baseIntensity: 1.0
    };

    this.lights.set(id, entry);
    this.spotLightCount++;
    this.notifyChange();
    return id;
  }

  public removeLight(id: string): boolean {
    const entry = this.lights.get(id);
    if (!entry) return false;

    this.scene.remove(entry.light);

    if (entry.marker) {
      this.scene.remove(entry.marker);
      entry.marker.geometry.dispose();
      (entry.marker.material as THREE.Material).dispose();
    }

    if (entry.helperLine) {
      this.scene.remove(entry.helperLine);
      entry.helperLine.geometry.dispose();
      (entry.helperLine.material as THREE.Material).dispose();
    }

    if (entry.type === 'point') {
      this.pointLightCount--;
    } else if (entry.type === 'spot') {
      this.spotLightCount--;
    } else if (entry.type === 'ambient') {
      this.ambientLightCount--;
    }

    this.lights.delete(id);
    this.notifyChange();
    return true;
  }

  public updateLightIntensity(id: string, intensity: number): void {
    const entry = this.lights.get(id);
    if (!entry) return;

    entry.light.intensity = intensity;
    entry.baseIntensity = intensity;
  }

  public adjustLightPosition(id: string, axis: 'x' | 'y' | 'z', delta: number): void {
    const entry = this.lights.get(id);
    if (!entry || entry.type === 'ambient') return;

    entry.light.position[axis] += delta;
    if (entry.marker) {
      entry.marker.position[axis] += delta;
    }
    if (entry.type === 'spot') {
      (entry.light as THREE.SpotLight).target.position.set(0, 0, 0);
    }
    this.updateHelperLine(entry);
  }

  public getLights(): LightEntry[] {
    return Array.from(this.lights.values());
  }

  public getLightCount(): { point: number; spot: number; ambient: number } {
    return {
      point: this.pointLightCount,
      spot: this.spotLightCount,
      ambient: this.ambientLightCount
    };
  }

  public getMarkerAtPosition(
    clientX: number,
    clientY: number,
    camera: THREE.Camera,
    canvas: HTMLCanvasElement
  ): string | null {
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, camera);

    const markers: THREE.Mesh[] = [];
    const markerToId = new Map<THREE.Mesh, string>();

    this.lights.forEach((entry) => {
      if (entry.marker) {
        markers.push(entry.marker);
        markerToId.set(entry.marker, entry.id);
      }
    });

    const intersects = this.raycaster.intersectObjects(markers);

    if (intersects.length > 0) {
      return markerToId.get(intersects[0].object as THREE.Mesh) || null;
    }

    return null;
  }

  public startDrag(
    id: string,
    clientX: number,
    clientY: number,
    camera: THREE.Camera,
    canvas: HTMLCanvasElement
  ): void {
    const entry = this.lights.get(id);
    if (!entry || entry.type === 'ambient' || !entry.marker) return;

    this.draggedLightId = id;
    entry.isDragging = true;

    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, camera);

    const normal = new THREE.Vector3();
    camera.getWorldDirection(normal);
    normal.negate();

    this.dragPlane.setFromNormalAndCoplanarPoint(normal, entry.light.position);

    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.dragPlane, intersection);
    this.dragOffset.copy(entry.light.position).sub(intersection);
  }

  public updateDrag(
    clientX: number,
    clientY: number,
    camera: THREE.Camera,
    canvas: HTMLCanvasElement
  ): void {
    if (!this.draggedLightId) return;

    const entry = this.lights.get(this.draggedLightId);
    if (!entry || !entry.marker) return;

    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, camera);

    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.dragPlane, intersection);

    const newPosition = intersection.add(this.dragOffset);
    entry.light.position.copy(newPosition);
    entry.marker.position.copy(newPosition);

    if (entry.type === 'spot') {
      (entry.light as THREE.SpotLight).target.position.set(0, 0, 0);
    }

    this.updateHelperLine(entry);
  }

  public endDrag(): void {
    if (this.draggedLightId) {
      const entry = this.lights.get(this.draggedLightId);
      if (entry) {
        entry.isDragging = false;
        entry.light.intensity = entry.baseIntensity;
      }
    }
    this.draggedLightId = null;
  }

  public updateDraggingAnimation(time: number): void {
    this.lights.forEach((entry) => {
      if (entry.isDragging) {
        const flicker = 0.8 + 0.4 * (0.5 + 0.5 * Math.sin(time * 0.01));
        entry.light.intensity = entry.baseIntensity * flicker;
      }
    });
  }

  public adjustPointLightIntensityByDistance(cameraDistance: number): void {
    const normalizedDistance = THREE.MathUtils.clamp((cameraDistance - 3) / (20 - 3), 0, 1);
    const intensityFactor = 1.0 + (1.0 - normalizedDistance) * 0.5;

    this.lights.forEach((entry) => {
      if (entry.type === 'point' && !entry.isDragging) {
        entry.light.intensity = entry.baseIntensity * intensityFactor;
      }
    });
  }

  public reset(): void {
    const idsToRemove: string[] = [];
    let foundDefaultAmbient = false;
    let foundDefaultPoint = false;

    this.lights.forEach((entry, id) => {
      if (entry.type === 'ambient') {
        if (foundDefaultAmbient) {
          idsToRemove.push(id);
        } else {
          entry.light.intensity = 0.3;
          entry.baseIntensity = 0.3;
          (entry.light as THREE.AmbientLight).color.setHex(0xffffff);
          foundDefaultAmbient = true;
        }
      } else if (entry.type === 'point') {
        if (foundDefaultPoint) {
          idsToRemove.push(id);
        } else {
          entry.light.intensity = 1.0;
          entry.baseIntensity = 1.0;
          (entry.light as THREE.PointLight).color.setHex(0xffffff);
          entry.light.position.set(3, 5, 5);
          if (entry.marker) {
            entry.marker.position.set(3, 5, 5);
            (entry.marker.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
          }
          this.updateHelperLine(entry);
          foundDefaultPoint = true;
        }
      } else {
        idsToRemove.push(id);
      }
    });

    idsToRemove.forEach((id) => this.removeLight(id));

    if (!foundDefaultAmbient) {
      this.addAmbientLight(0xffffff, 0.3);
    }
    if (!foundDefaultPoint) {
      this.addPointLight(0xffffff, 1.0, new THREE.Vector3(3, 5, 5));
    }

    this.notifyChange();
  }

  private notifyChange(): void {
    if (this.onLightChangeCallback) {
      this.onLightChangeCallback();
    }
  }

  public dispose(): void {
    this.lights.forEach((entry) => {
      this.scene.remove(entry.light);
      if (entry.marker) {
        this.scene.remove(entry.marker);
        entry.marker.geometry.dispose();
        (entry.marker.material as THREE.Material).dispose();
      }
      if (entry.helperLine) {
        this.scene.remove(entry.helperLine);
        entry.helperLine.geometry.dispose();
        (entry.helperLine.material as THREE.Material).dispose();
      }
    });
    this.lights.clear();
  }
}
