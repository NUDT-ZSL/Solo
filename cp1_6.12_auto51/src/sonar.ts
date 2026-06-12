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
  pulseRings: { radius: number; opacity: number }[];
  sweepAngle: number;
  cooldown: number;
  cooldownMax: number;
  isPulsing: boolean;
}

export interface MapMarker {
  position: THREE.Vector3;
  timestamp: number;
  type: 'terrain' | 'shipwreck' | 'reef';
  strength: number;
}

const SONAR_RANGE = 15;
const SONAR_ANGLE = (120 * Math.PI) / 180;
const AUTO_PULSE_INTERVAL = 0.3;
const MANUAL_COOLDOWN = 1.0;
const RAY_COUNT = 80;
const MARKER_LIFETIME = 5.0;
const PULSE_SPEED = 30;
const PULSE_LIFETIME = SONAR_RANGE / PULSE_SPEED;

export class SonarSystem {
  private scene: THREE.Scene;
  private terrainData: TerrainData;
  private detectableObjects: THREE.Object3D[];
  private raycaster: THREE.Raycaster;

  private autoPulseTimer: number = 0;
  private manualCooldownTimer: number = 0;
  private sweepAngle: number = -SONAR_ANGLE / 2;
  private sweepDirection: number = 1;

  private activePulseRings: { age: number; maxAge: number; mesh: THREE.Line }[] = [];
  private echoLines: { mesh: THREE.Line; age: number; maxAge: number; strength: number }[] = [];
  private echoPoints: { mesh: THREE.Mesh; age: number; maxAge: number; type: string }[] = [];

  private latestEchoes: SonarEcho[] = [];
  private mapMarkers: MapMarker[] = [];

  private sonarCone: THREE.Mesh | null = null;
  private sonarSweep: THREE.Line | null = null;

  private shipwrecksList: ShipwreckInfo[] = [];
  private reefsList: { mesh: THREE.Group; position: THREE.Vector3 }[] = [];

  private highlightedObjects: Set<THREE.Object3D> = new Set();
  private highlightTimers: Map<THREE.Object3D, number> = new Map();

  constructor(scene: THREE.Scene, terrainData: TerrainData, detectableObjects: THREE.Object3D[]) {
    this.scene = scene;
    this.terrainData = terrainData;
    this.detectableObjects = detectableObjects;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = SONAR_RANGE;
    this.createSonarVisuals();
  }

  private createSonarVisuals(): void {
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
      color: 0x00ccff,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.sonarCone = new THREE.Mesh(geo, mat);
    this.sonarCone.rotation.x = -Math.PI / 2;
    this.scene.add(this.sonarCone);
  }

  fireManualPulse(position: THREE.Vector3, direction: number): void {
    if (this.manualCooldownTimer > 0) return;
    this.manualCooldownTimer = MANUAL_COOLDOWN;
    this.firePulse(position, direction, true);
  }

  private firePulse(position: THREE.Vector3, direction: number, isManual: boolean): void {
    const echoes = this.castRays(position, direction);
    this.latestEchoes = echoes;

    this.createPulseRing(position, direction);

    for (const echo of echoes) {
      this.createEchoVisual(position, echo);

      if (isManual) {
        this.mapMarkers.push({
          position: echo.worldPosition.clone(),
          timestamp: performance.now() / 1000,
          type: echo.type,
          strength: echo.strength,
        });

        this.triggerObjectHighlight(echo);
      }
    }
  }

  private createPulseRing(position: THREE.Vector3, direction: number): void {
    const points: THREE.Vector3[] = [];
    const halfAngle = SONAR_ANGLE / 2;
    const segments = 48;
    const radius = 0.3;
    const y = position.y + 0.4;

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
      color: 0x00ffaa,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
    });
    const line = new THREE.Line(geo, mat);
    line.userData = { origin: position.clone(), direction, baseY: y };
    this.scene.add(line);
    this.activePulseRings.push({ age: 0, maxAge: PULSE_LIFETIME, mesh: line });
  }

  private createEchoVisual(origin: THREE.Vector3, echo: SonarEcho): void {
    const points = [
      new THREE.Vector3(origin.x, origin.y + 0.4, origin.z),
      echo.worldPosition.clone().add(new THREE.Vector3(0, 0.3, 0)),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(points);

    const alpha = 0.3 + echo.strength * 0.5;
    const mat = new THREE.LineBasicMaterial({
      color: 0xffe066,
      transparent: true,
      opacity: alpha,
      depthWrite: false,
    });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.echoLines.push({ mesh: line, age: 0, maxAge: 0.8 + echo.strength * 0.4, strength: echo.strength });

    const pointGeo = new THREE.SphereGeometry(0.15 + echo.strength * 0.2, 8, 6);
    const pointMat = new THREE.MeshBasicMaterial({
      color: echo.type === 'shipwreck' ? 0xffd700 : 0xffff88,
      transparent: true,
      opacity: alpha,
      depthWrite: false,
    });
    const point = new THREE.Mesh(pointGeo, pointMat);
    point.position.copy(echo.worldPosition).add(new THREE.Vector3(0, 0.3, 0));
    this.scene.add(point);
    this.echoPoints.push({ mesh: point, age: 0, maxAge: 0.6 + echo.strength * 0.4, type: echo.type });
  }

  private triggerObjectHighlight(echo: SonarEcho): void {
    for (const sw of this.shipwrecksList) {
      if (echo.type === 'shipwreck' && echo.worldPosition.distanceTo(sw.position) < 4) {
        this.highlightObject(sw.mesh);
        break;
      }
    }
    for (const reef of this.reefsList) {
      if (echo.type === 'reef' && echo.worldPosition.distanceTo(reef.position) < 3) {
        this.highlightObject(reef.mesh);
        break;
      }
    }
  }

  private highlightObject(obj: THREE.Object3D): void {
    if (this.highlightedObjects.has(obj)) {
      this.highlightTimers.set(obj, 0.5);
      return;
    }

    this.highlightedObjects.add(obj);
    this.highlightTimers.set(obj, 0.5);

    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshPhongMaterial;
        if (mat.emissive) {
          (child.userData as any).originalEmissive = mat.emissive.getHex();
          mat.emissive.setHex(0xffffff);
          mat.emissiveIntensity = 0.6;
        }
      }
    });
  }

  private castRays(position: THREE.Vector3, direction: number): SonarEcho[] {
    const echoes: SonarEcho[] = [];
    const halfAngle = SONAR_ANGLE / 2;
    const origin = new THREE.Vector3(position.x, position.y + 0.8, position.z);

    for (let i = 0; i < RAY_COUNT; i++) {
      const angle = direction - halfAngle + (SONAR_ANGLE * i) / (RAY_COUNT - 1);
      const dir = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).normalize();
      this.raycaster.set(origin, dir);
      const intersects = this.raycaster.intersectObjects(this.detectableObjects, true);

      if (intersects.length > 0) {
        const hit = intersects[0];
        const dist = hit.distance;
        const strength = Math.max(0.15, 1.0 - dist / SONAR_RANGE);
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

  update(delta: number, position: THREE.Vector3, direction: number): SonarDisplayData {
    this.autoPulseTimer += delta;
    if (this.autoPulseTimer >= AUTO_PULSE_INTERVAL) {
      this.autoPulseTimer -= AUTO_PULSE_INTERVAL;
      this.firePulse(position, direction, false);
    }

    if (this.manualCooldownTimer > 0) {
      this.manualCooldownTimer = Math.max(0, this.manualCooldownTimer - delta);
    }

    this.sweepAngle += delta * 2.0 * this.sweepDirection;
    if (this.sweepAngle > SONAR_ANGLE / 2) {
      this.sweepAngle = SONAR_ANGLE / 2;
      this.sweepDirection = -1;
    } else if (this.sweepAngle < -SONAR_ANGLE / 2) {
      this.sweepAngle = -SONAR_ANGLE / 2;
      this.sweepDirection = 1;
    }

    for (let i = this.activePulseRings.length - 1; i >= 0; i--) {
      const pulse = this.activePulseRings[i];
      pulse.age += delta;

      if (pulse.age >= pulse.maxAge) {
        this.scene.remove(pulse.mesh);
        pulse.mesh.geometry.dispose();
        (pulse.mesh.material as THREE.Material).dispose();
        this.activePulseRings.splice(i, 1);
        continue;
      }

      const radius = pulse.age * PULSE_SPEED;
      const opacity = 1 - pulse.age / pulse.maxAge;

      const userData = pulse.mesh.userData;
      const origin = userData.origin as THREE.Vector3;
      const baseDir = userData.direction as number;
      const baseY = userData.baseY as number;
      const halfAngle = SONAR_ANGLE / 2;
      const segments = 48;

      const posAttr = pulse.mesh.geometry.attributes.position;
      const positions = posAttr.array as Float32Array;

      for (let j = 0; j <= segments; j++) {
        const angle = baseDir - halfAngle + (SONAR_ANGLE * j) / segments;
        positions[j * 3] = origin.x + Math.sin(angle) * radius;
        positions[j * 3 + 1] = baseY;
        positions[j * 3 + 2] = origin.z + Math.cos(angle) * radius;
      }
      posAttr.needsUpdate = true;

      const mat = pulse.mesh.material as THREE.LineBasicMaterial;
      mat.opacity = Math.max(0.1, opacity * 0.8);
    }

    for (let i = this.echoLines.length - 1; i >= 0; i--) {
      const echo = this.echoLines[i];
      echo.age += delta;

      if (echo.age >= echo.maxAge) {
        this.scene.remove(echo.mesh);
        echo.mesh.geometry.dispose();
        (echo.mesh.material as THREE.Material).dispose();
        this.echoLines.splice(i, 1);
        continue;
      }

      const mat = echo.mesh.material as THREE.LineBasicMaterial;
      const lifeRatio = echo.age / echo.maxAge;
      mat.opacity = (1 - lifeRatio) * (0.3 + echo.strength * 0.5);
    }

    for (let i = this.echoPoints.length - 1; i >= 0; i--) {
      const point = this.echoPoints[i];
      point.age += delta;

      if (point.age >= point.maxAge) {
        this.scene.remove(point.mesh);
        point.mesh.geometry.dispose();
        (point.mesh.material as THREE.Material).dispose();
        this.echoPoints.splice(i, 1);
        continue;
      }

      const mat = point.mesh.material as THREE.MeshBasicMaterial;
      const lifeRatio = point.age / point.maxAge;
      mat.opacity = (1 - lifeRatio) * 0.8;

      const scale = 1 + lifeRatio * 0.5;
      point.mesh.scale.setScalar(scale);
    }

    for (const [obj, timer] of this.highlightTimers) {
      const newTimer = timer - delta;
      if (newTimer <= 0) {
        this.highlightTimers.delete(obj);
        this.highlightedObjects.delete(obj);
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const mat = child.material as THREE.MeshPhongMaterial;
            if (mat.emissive && (child.userData as any).originalEmissive !== undefined) {
              mat.emissive.setHex((child.userData as any).originalEmissive);
              mat.emissiveIntensity = 0;
            }
          }
        });
      } else {
        this.highlightTimers.set(obj, newTimer);
      }
    }

    const now = performance.now() / 1000;
    this.mapMarkers = this.mapMarkers.filter(m => now - m.timestamp < MARKER_LIFETIME);

    if (this.sonarCone) {
      this.sonarCone.position.set(position.x, position.y + 0.4, position.z);
      this.sonarCone.rotation.y = direction + Math.PI;
    }

    const pulseRingsData = this.activePulseRings.map(p => ({
      radius: p.age * PULSE_SPEED,
      opacity: 1 - p.age / p.maxAge,
    }));

    return {
      echoes: this.latestEchoes,
      pulseRings: pulseRingsData,
      sweepAngle: this.sweepAngle,
      cooldown: this.manualCooldownTimer,
      cooldownMax: MANUAL_COOLDOWN,
      isPulsing: this.manualCooldownTimer > 0,
    };
  }

  getMapMarkers(): MapMarker[] {
    return this.mapMarkers;
  }

  triggerManualPulse(position: THREE.Vector3, direction: number): void {
    this.fireManualPulse(position, direction);
  }

  getScanData() {
    return {
      echoes: this.latestEchoes,
      sweepAngle: this.sweepAngle,
      range: SONAR_RANGE,
      angle: SONAR_ANGLE,
    };
  }
}
