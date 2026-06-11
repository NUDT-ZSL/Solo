import * as THREE from 'three';
import { ShipwreckInfo, TerrainData } from './scene';

export interface SonarEcho {
  distance: number;
  angle: number;
  strength: number;
  worldPosition: THREE.Vector3;
  type: 'terrain' | 'shipwreck' | 'reef';
}

export interface SonarDisplayData {
  echoes: SonarEcho[];
  pulseProgress: number;
  cooldown: number;
  cooldownMax: number;
}

export interface MapMarker {
  position: THREE.Vector3;
  timestamp: number;
  type: 'terrain' | 'shipwreck' | 'reef';
}

const SONAR_RANGE = 15;
const SONAR_ANGLE = (120 * Math.PI) / 180;
const AUTO_PULSE_INTERVAL = 0.3;
const MANUAL_COOLDOWN = 1.0;
const RAY_COUNT = 60;
const MARKER_LIFETIME = 5.0;

export class SonarSystem {
  private scene: THREE.Scene;
  private terrainData: TerrainData;
  private detectableObjects: THREE.Object3D[];
  private raycaster: THREE.Raycaster;
  private autoPulseTimer: number = 0;
  private manualCooldownTimer: number = 0;
  private currentPulseProgress: number = 0;
  private activePulses: { age: number; maxAge: number; echoes: SonarEcho[] }[] = [];
  private latestEchoes: SonarEcho[] = [];
  private mapMarkers: MapMarker[] = [];
  private sonarCone: THREE.Mesh | null = null;
  private pulseRings: { line: THREE.Line; origin: THREE.Vector3; direction: number; age: number }[] = [];
  private playerPosition: THREE.Vector3 = new THREE.Vector3();
  private playerDirection: number = 0;

  constructor(scene: THREE.Scene, terrainData: TerrainData, detectableObjects: THREE.Object3D[]) {
    this.scene = scene;
    this.terrainData = terrainData;
    this.detectableObjects = detectableObjects;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = SONAR_RANGE;
    this.createSonarCone();
  }

  private createSonarCone(): void {
    const shape = new THREE.Shape();
    const segments = 32;
    const halfAngle = SONAR_ANGLE / 2;
    shape.moveTo(0, 0);
    for (let i = 0; i <= segments; i++) {
      const angle = -halfAngle + (SONAR_ANGLE * i) / segments;
      shape.lineTo(Math.sin(angle) * SONAR_RANGE, Math.cos(angle) * SONAR_RANGE);
    }
    shape.lineTo(0, 0);

    const geo = new THREE.ShapeGeometry(shape);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00ff44,
      transparent: true,
      opacity: 0.04,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.sonarCone = new THREE.Mesh(geo, mat);
    this.sonarCone.rotation.x = -Math.PI / 2;
    this.sonarCone.position.y = 0.15;
    this.scene.add(this.sonarCone);
  }

  fireManualPulse(position: THREE.Vector3, direction: number): void {
    if (this.manualCooldownTimer > 0) return;
    this.manualCooldownTimer = MANUAL_COOLDOWN;
    this.firePulse(position, direction, true);
  }

  private firePulse(position: THREE.Vector3, direction: number, isManual: boolean): void {
    this.playerPosition.copy(position);
    this.playerDirection = direction;

    if (this.sonarCone) {
      this.sonarCone.position.set(position.x, position.y + 0.15, position.z);
      this.sonarCone.rotation.y = -direction + Math.PI;
    }

    const echoes = this.castRays(position, direction);
    this.latestEchoes = echoes;
    this.currentPulseProgress = 0;
    this.activePulses.push({ age: 0, maxAge: 0.8, echoes });

    if (isManual) {
      for (const echo of echoes) {
        this.mapMarkers.push({
          position: echo.worldPosition.clone(),
          timestamp: performance.now() / 1000,
          type: echo.type,
        });
      }
    }

    this.createPulseRing(position, direction);
  }

  private castRays(position: THREE.Vector3, direction: number): SonarEcho[] {
    const echoes: SonarEcho[] = [];
    const halfAngle = SONAR_ANGLE / 2;
    const origin = new THREE.Vector3(position.x, position.y + 0.5, position.z);

    for (let i = 0; i < RAY_COUNT; i++) {
      const angle = direction - halfAngle + (SONAR_ANGLE * i) / (RAY_COUNT - 1);
      const dir = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).normalize();
      this.raycaster.set(origin, dir);
      const intersects = this.raycaster.intersectObjects(this.detectableObjects, true);

      if (intersects.length > 0) {
        const hit = intersects[0];
        const dist = hit.distance;
        const strength = Math.max(0.1, 1.0 - dist / SONAR_RANGE);
        let type: 'terrain' | 'shipwreck' | 'reef' = 'terrain';

        const hitObj = hit.object;
        for (const sw of this.shipwrecksList) {
          if (this.isDescendant(hitObj, sw.mesh)) {
            type = 'shipwreck';
            break;
          }
        }
        if (type === 'terrain') {
          for (const r of this.reefsList) {
            if (this.isDescendant(hitObj, r.mesh)) {
              type = 'reef';
              break;
            }
          }
        }

        echoes.push({
          distance: dist,
          angle: angle - direction,
          strength,
          worldPosition: hit.point.clone(),
          type,
        });
      }
    }

    return echoes;
  }

  private shipwrecksList: ShipwreckInfo[] = [];
  private reefsList: { mesh: THREE.Group; position: THREE.Vector3 }[] = [];

  setShipwrecks(list: ShipwreckInfo[]): void {
    this.shipwrecksList = list;
  }

  setReefs(list: { mesh: THREE.Group; position: THREE.Vector3 }[]): void {
    this.reefsList = list;
  }

  private isDescendant(child: THREE.Object3D, parent: THREE.Object3D): boolean {
    let obj: THREE.Object3D | null = child;
    while (obj) {
      if (obj === parent) return true;
      obj = obj.parent;
    }
    return false;
  }

  private createPulseRing(position: THREE.Vector3, direction: number): void {
    const points: THREE.Vector3[] = [];
    const halfAngle = SONAR_ANGLE / 2;
    const segments = 40;
    const radius = 0.5;
    const y = position.y + 0.3;

    for (let i = 0; i <= segments; i++) {
      const angle = direction - halfAngle + (SONAR_ANGLE * i) / segments;
      points.push(new THREE.Vector3(
        position.x + Math.sin(angle) * radius,
        y,
        position.z + Math.cos(angle) * radius
      ));
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0x00ff66,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.pulseRings.push({ line, origin: position.clone(), direction, age: 0 });
  }

  update(delta: number, position: THREE.Vector3, direction: number): SonarDisplayData {
    this.autoPulseTimer += delta;
    if (this.autoPulseTimer >= AUTO_PULSE_INTERVAL) {
      this.autoPulseTimer -= AUTO_PULSE_INTERVAL;
      this.firePulse(position, direction, false);
    }

    if (this.manualCooldownTimer > 0) {
      this.manualCooldownTimer = Math.max(0, this.manualCooldownTimer - delta);
    }

    this.currentPulseProgress += delta / 0.8;
    if (this.currentPulseProgress > 1) this.currentPulseProgress = 0;

    this.activePulses = this.activePulses.filter(p => {
      p.age += delta;
      return p.age < p.maxAge;
    });

    const now = performance.now() / 1000;
    this.mapMarkers = this.mapMarkers.filter(m => now - m.timestamp < MARKER_LIFETIME);

    for (let i = this.pulseRings.length - 1; i >= 0; i--) {
      const ringData = this.pulseRings[i];
      ringData.age += delta;
      const ring = ringData.line;
      const posAttr = ring.geometry.attributes.position;
      const oldPositions = posAttr.array as Float32Array;

      const expandSpeed = SONAR_RANGE / 0.8 * delta;

      for (let j = 0; j < posAttr.count; j++) {
        const px = oldPositions[j * 3];
        const pz = oldPositions[j * 3 + 2];
        const dx = px - ringData.origin.x;
        const dz = pz - ringData.origin.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d > 0.01) {
          oldPositions[j * 3] += (dx / d) * expandSpeed;
          oldPositions[j * 3 + 2] += (dz / d) * expandSpeed;
        }
      }
      posAttr.needsUpdate = true;

      const mat = ring.material as THREE.LineBasicMaterial;
      mat.opacity -= delta * 1.2;

      const maxDist = (SONAR_RANGE / 0.8) * ringData.age;
      if (mat.opacity <= 0 || maxDist > SONAR_RANGE * 1.2) {
        this.scene.remove(ring);
        ring.geometry.dispose();
        (ring.material as THREE.Material).dispose();
        this.pulseRings.splice(i, 1);
      }
    }

    if (this.sonarCone) {
      this.sonarCone.position.set(position.x, position.y + 0.15, position.z);
      this.sonarCone.rotation.y = -direction + Math.PI;
    }

    return {
      echoes: this.latestEchoes,
      pulseProgress: this.currentPulseProgress,
      cooldown: this.manualCooldownTimer,
      cooldownMax: MANUAL_COOLDOWN,
    };
  }

  getMapMarkers(): MapMarker[] {
    return this.mapMarkers;
  }

  triggerManualPulse(position: THREE.Vector3, direction: number): void {
    this.fireManualPulse(position, direction);
  }
}
