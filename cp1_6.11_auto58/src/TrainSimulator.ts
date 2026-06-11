import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import type { TrainData } from './types';
import { LineManager } from './LineManager';
import { StationManager } from './StationManager';

interface Particle {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

interface TrainObject {
  data: TrainData;
  group: THREE.Group;
  sphere: THREE.Mesh;
  pulseLight: THREE.PointLight;
  particles: Particle[];
  particlePool: Particle[];
  direction: 1 | -1;
  currentStationId: string | null;
  lastStationId: string | null;
}

export class TrainSimulator {
  private scene: THREE.Scene;
  private lineManager: LineManager;
  private stationManager: StationManager;
  private trains: Map<string, TrainObject> = new Map();
  private globalSpeedMultiplier: number = 1;
  private running: boolean = false;
  private readonly BASE_SPEED: number = 0.04;
  private readonly STOP_DURATION: number = 2;
  private readonly PULSE_DURATION: number = 2;
  private readonly PARTICLE_COUNT: number = 25;
  private readonly STATION_PROXIMITY: number = 0.03;

  public onTrainStateChanged?: () => void;

  constructor(
    scene: THREE.Scene,
    lineManager: LineManager,
    stationManager: StationManager,
  ) {
    this.scene = scene;
    this.lineManager = lineManager;
    this.stationManager = stationManager;
  }

  private createParticlePool(color: THREE.Color, baseSize: number): Particle[] {
    const pool: Particle[] = [];
    for (let i = 0; i < this.PARTICLE_COUNT + 10; i++) {
      const geo = new THREE.SphereGeometry(baseSize * 0.3, 8, 8);
      const mat = new THREE.MeshBasicMaterial({
        color: color.clone(),
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      pool.push({ mesh, life: 0, maxLife: 0.8 });
    }
    return pool;
  }

  createTrainForLine(lineId: string, initialProgress: number = 0): TrainData | null {
    const line = this.lineManager.getLineById(lineId);
    if (!line) return null;

    const firstStation = this.stationManager.getStationById(line.stationIds[0]);
    const trainSize = (firstStation?.size ?? 0.8) * 0.3;
    const lineColor = new THREE.Color(line.color);

    const group = new THREE.Group();
    const sphereGeo = new THREE.SphereGeometry(trainSize, 24, 24);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: lineColor.clone(),
      emissive: lineColor.clone(),
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.95,
      metalness: 0.7,
      roughness: 0.1,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    group.add(sphere);

    const pulseLight = new THREE.PointLight(lineColor.clone(), 0, trainSize * 10, 2);
    group.add(pulseLight);

    const data: TrainData = {
      id: uuidv4(),
      lineId,
      progress: initialProgress,
      speed: this.BASE_SPEED,
      isPaused: false,
      stopTimer: 0,
      pulseTimer: 0,
    };

    const particlePool = this.createParticlePool(lineColor, trainSize);
    const obj: TrainObject = {
      data,
      group,
      sphere,
      pulseLight,
      particles: [],
      particlePool,
      direction: 1,
      currentStationId: null,
      lastStationId: null,
    };

    this.updateTrainPosition(obj);
    this.scene.add(group);
    this.trains.set(lineId, obj);
    return data;
  }

  private updateTrainPosition(obj: TrainObject): void {
    const curve = this.lineManager.getCurve(obj.data.lineId);
    if (!curve) return;
    const pos = curve.getPointAt(Math.max(0, Math.min(1, obj.data.progress)));
    obj.group.position.copy(pos);
  }

  private spawnParticle(obj: TrainObject): void {
    let particle = obj.particlePool.find(p => !p.mesh.visible);
    if (!particle) {
      particle = obj.particles[0];
      if (!particle) return;
      obj.particles.shift();
    }
    particle.mesh.position.copy(obj.group.position);
    particle.mesh.visible = true;
    particle.life = particle.maxLife;
    const firstStation = this.stationManager.getStationById(
      this.lineManager.getLineById(obj.data.lineId)?.stationIds[0] ?? '',
    );
    const baseSize = (firstStation?.size ?? 0.8) * 0.3;
    particle.mesh.scale.setScalar(1);
    (particle.mesh.material as THREE.MeshBasicMaterial).opacity = 0.7;
    obj.particles.push(particle);
  }

  private updateParticles(obj: TrainObject, delta: number): void {
    for (let i = obj.particles.length - 1; i >= 0; i--) {
      const p = obj.particles[i];
      p.life -= delta;
      if (p.life <= 0) {
        p.mesh.visible = false;
        obj.particles.splice(i, 1);
      } else {
        const t = p.life / p.maxLife;
        p.mesh.scale.setScalar(t);
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = t * 0.7;
      }
    }
  }

  private checkStationProximity(obj: TrainObject): string | null {
    const progressMap = this.lineManager.getStationProgressMap(obj.data.lineId);
    if (!progressMap) return null;
    const line = this.lineManager.getLineById(obj.data.lineId);
    if (!line) return null;

    for (const sid of line.stationIds) {
      const stationProgress = progressMap.get(sid);
      if (stationProgress === undefined) continue;
      if (Math.abs(obj.data.progress - stationProgress) < this.STATION_PROXIMITY) {
        return sid;
      }
    }
    return null;
  }

  private triggerPulse(obj: TrainObject): void {
    obj.data.pulseTimer = this.PULSE_DURATION;
    const line = this.lineManager.getLineById(obj.data.lineId);
    if (!line) return;
    const firstStation = this.stationManager.getStationById(line.stationIds[0]);
    const baseSize = (firstStation?.size ?? 0.8) * 0.3;
    obj.pulseLight.intensity = 3;
    obj.pulseLight.distance = baseSize * 10;
  }

  private updatePulse(obj: TrainObject, delta: number): void {
    if (obj.data.pulseTimer <= 0) return;
    obj.data.pulseTimer -= delta;
    const line = this.lineManager.getLineById(obj.data.lineId);
    if (!line) return;
    const firstStation = this.stationManager.getStationById(line.stationIds[0]);
    const baseSize = (firstStation?.size ?? 0.8) * 0.3;

    if (obj.data.pulseTimer > 0) {
      const t = 1 - obj.data.pulseTimer / this.PULSE_DURATION;
      const pulsePhase = t < 0.5 ? t * 2 : (1 - t) * 2;
      const scale = 1 + pulsePhase * (0.5 / 0.3 - 1);
      obj.sphere.scale.setScalar(scale);
      obj.pulseLight.intensity = 3 * (1 - t * 0.5);
    } else {
      obj.sphere.scale.setScalar(1);
      obj.pulseLight.intensity = 0;
      obj.data.pulseTimer = 0;
    }
  }

  update(delta: number): void {
    if (!this.running) return;

    for (const obj of this.trains.values()) {
      if (obj.data.isPaused) continue;

      this.updatePulse(obj, delta);
      this.updateParticles(obj, delta);

      if (obj.data.stopTimer > 0) {
        obj.data.stopTimer -= delta;
        continue;
      }

      const curve = this.lineManager.getCurve(obj.data.lineId);
      if (!curve) continue;

      const nearStation = this.checkStationProximity(obj);
      if (nearStation && nearStation !== obj.lastStationId) {
        obj.data.stopTimer = this.STOP_DURATION;
        obj.currentStationId = nearStation;
        obj.lastStationId = nearStation;
        this.triggerPulse(obj);
        continue;
      }

      const effectiveSpeed = obj.data.speed * this.globalSpeedMultiplier;
      obj.data.progress += effectiveSpeed * obj.direction * delta * 60;

      if (obj.data.progress >= 1) {
        obj.data.progress = 1;
        obj.direction = -1;
        obj.lastStationId = null;
      } else if (obj.data.progress <= 0) {
        obj.data.progress = 0;
        obj.direction = 1;
        obj.lastStationId = null;
      }

      this.updateTrainPosition(obj);

      if (Math.random() < 0.6) {
        this.spawnParticle(obj);
      }
    }
  }

  removeTrainForLine(lineId: string): void {
    const obj = this.trains.get(lineId);
    if (!obj) return;
    this.scene.remove(obj.group);
    obj.sphere.geometry.dispose();
    (obj.sphere.material as THREE.Material).dispose();
    for (const p of obj.particlePool) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    obj.particles.length = 0;
    obj.particlePool.length = 0;
    this.trains.delete(lineId);
  }

  setTrainProgress(lineId: string, progress: number): void {
    const obj = this.trains.get(lineId);
    if (!obj) return;
    obj.data.progress = Math.max(0, Math.min(1, progress));
    this.updateTrainPosition(obj);
  }

  startSimulation(): void {
    this.running = true;
    for (const obj of this.trains.values()) {
      obj.data.isPaused = false;
    }
    this.onTrainStateChanged?.();
  }

  stopSimulation(): void {
    this.running = false;
    for (const obj of this.trains.values()) {
      obj.data.isPaused = true;
    }
    this.onTrainStateChanged?.();
  }

  isRunning(): boolean {
    return this.running;
  }

  setGlobalSpeedMultiplier(multiplier: number): void {
    this.globalSpeedMultiplier = Math.max(0.5, Math.min(3, multiplier));
    this.onTrainStateChanged?.();
  }

  getGlobalSpeedMultiplier(): number {
    return this.globalSpeedMultiplier;
  }

  getTrainProgress(lineId: string): number {
    return this.trains.get(lineId)?.data.progress ?? 0;
  }

  getAllTrainStates(): { lineId: string; progress: number }[] {
    return Array.from(this.trains.values()).map(o => ({
      lineId: o.data.lineId,
      progress: o.data.progress,
    }));
  }

  clearAll(): void {
    for (const id of Array.from(this.trains.keys())) {
      this.removeTrainForLine(id);
    }
  }

  dispose(): void {
    this.stopSimulation();
    this.clearAll();
  }
}
