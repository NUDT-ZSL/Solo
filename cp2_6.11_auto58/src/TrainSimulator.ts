import * as THREE from 'three';
import { MetroLine, LineManager } from './LineManager';
import { StationManager } from './StationManager';

export interface TrainData {
  lineId: string;
  progress: number;
  speedMultiplier: number;
}

export interface SimulatorState {
  trains: TrainData[];
  globalSpeed: number;
  running: boolean;
}

class Train {
  public lineId: string;
  public group: THREE.Group;
  public sphere: THREE.Mesh;
  public pulseLight: THREE.PointLight;
  public trailParticles: THREE.Points;
  public trailPositions: Float32Array;
  public progress: number = 0;
  public stationSize: number = 1;
  public isStopped: boolean = false;
  public stopTimer: number = 0;
  public pulseTimer: number = 0;
  public isPulsing: boolean = false;
  public currentStationIndex: number = -1;
  public baseSpeed: number = 0.05;

  constructor(lineId: string, color: string, stationSize: number) {
    this.lineId = lineId;
    this.stationSize = stationSize;
    this.group = new THREE.Group();
    this.sphere = this.createSphere(color, stationSize);
    this.pulseLight = this.createPulseLight(color);
    this.trailParticles = this.createTrail(color);
    this.trailPositions = (this.trailParticles.geometry.attributes.position.array as Float32Array);
    this.group.add(this.sphere, this.pulseLight, this.trailParticles);
    this.group.userData.train = this;
  }

  private createSphere(color: string, stationSize: number): THREE.Mesh {
    const radius = stationSize * 0.3;
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 1.0,
      metalness: 0.9,
      roughness: 0.1
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.castShadow = true;
    return sphere;
  }

  private createPulseLight(color: string): THREE.PointLight {
    const light = new THREE.PointLight(color, 0, 0, 2);
    return light;
  }

  private createTrail(color: string): THREE.Points {
    const particleCount = 25;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const baseColor = new THREE.Color(color);

    for (let i = 0; i < particleCount; i++) {
      sizes[i] = (1 - i / particleCount) * 0.3;
      colors[i * 3] = baseColor.r;
      colors[i * 3 + 1] = baseColor.g;
      colors[i * 3 + 2] = baseColor.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = 1.0 - dist * 2.0;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    return points;
  }

  public updateTrail(position: THREE.Vector3): void {
    const particleCount = this.trailPositions.length / 3;
    for (let i = particleCount - 1; i > 0; i--) {
      this.trailPositions[i * 3] = this.trailPositions[(i - 1) * 3];
      this.trailPositions[i * 3 + 1] = this.trailPositions[(i - 1) * 3 + 1];
      this.trailPositions[i * 3 + 2] = this.trailPositions[(i - 1) * 3 + 2];
    }
    this.trailPositions[0] = position.x;
    this.trailPositions[1] = position.y;
    this.trailPositions[2] = position.z;
    this.trailParticles.geometry.attributes.position.needsUpdate = true;
  }

  public updateColor(color: string): void {
    (this.sphere.material as THREE.MeshStandardMaterial).color.set(color);
    (this.sphere.material as THREE.MeshStandardMaterial).emissive.set(color);
    this.pulseLight.color.set(color);
    const c = new THREE.Color(color);
    const colors = this.trailParticles.geometry.attributes.color.array as Float32Array;
    for (let i = 0; i < colors.length; i += 3) {
      colors[i] = c.r;
      colors[i + 1] = c.g;
      colors[i + 2] = c.b;
    }
    this.trailParticles.geometry.attributes.color.needsUpdate = true;
  }

  public startPulse(): void {
    this.isPulsing = true;
    this.pulseTimer = 0;
  }

  public updatePulse(delta: number): void {
    if (!this.isPulsing) return;
    this.pulseTimer += delta;
    const pulseDuration = 2.0;
    const t = this.pulseTimer / pulseDuration;

    if (t >= 1) {
      this.isPulsing = false;
      this.pulseLight.intensity = 0;
      const r = this.stationSize * 0.3;
      this.sphere.scale.set(1, 1, 1);
      this.sphere.geometry.dispose();
      this.sphere.geometry = new THREE.SphereGeometry(r, 32, 32);
      return;
    }

    const pulsePhase = Math.sin(t * Math.PI);
    const scale = 1 + pulsePhase * 0.666;
    this.sphere.scale.set(scale, scale, scale);
    this.pulseLight.intensity = pulsePhase * 3;
    this.pulseLight.distance = this.stationSize * 3;
  }

  public dispose(): void {
    this.sphere.geometry.dispose();
    (this.sphere.material as THREE.Material).dispose();
    this.trailParticles.geometry.dispose();
    (this.trailParticles.material as THREE.Material).dispose();
  }
}

export class TrainSimulator {
  public trains: Map<string, Train> = new Map();
  private scene: THREE.Scene;
  private lineManager: LineManager;
  private stationManager: StationManager;
  public globalSpeed: number = 1.0;
  public running: boolean = true;
  public onTrainCreated?: (train: Train) => void;
  public onTrainRemoved?: (train: Train) => void;

  constructor(scene: THREE.Scene, lineManager: LineManager, stationManager: StationManager) {
    this.scene = scene;
    this.lineManager = lineManager;
    this.stationManager = stationManager;

    this.lineManager.onLineAdded = (line) => {
      this.createTrainForLine(line);
    };
    this.lineManager.onLineRemoved = (line) => {
      this.removeTrain(line.id);
    };
    this.lineManager.onLineUpdated = (line) => {
      const train = this.trains.get(line.id);
      if (train) {
        train.updateColor(line.color);
      }
    };
    this.stationManager.onStationMoved = () => {
      this.lineManager.rebuildAllLines();
    };
  }

  public createTrainForLine(line: MetroLine): Train | null {
    if (this.trains.has(line.id)) return null;
    if (line.stationIds.length < 2) return null;

    const firstStation = this.stationManager.getStation(line.stationIds[0]);
    if (!firstStation) return null;

    const train = new Train(line.id, line.color, firstStation.size);
    const pos = line.getPointAt(0);
    if (pos) {
      train.group.position.copy(pos);
      train.updateTrail(pos);
    }
    this.trains.set(line.id, train);
    this.scene.add(train.group);
    this.onTrainCreated?.(train);
    return train;
  }

  public removeTrain(lineId: string): boolean {
    const train = this.trains.get(lineId);
    if (!train) return false;
    this.scene.remove(train.group);
    train.dispose();
    this.trains.delete(lineId);
    this.onTrainRemoved?.(train);
    return true;
  }

  public startAll(): void {
    this.running = true;
  }

  public stopAll(): void {
    this.running = false;
  }

  public setGlobalSpeed(speed: number): void {
    this.globalSpeed = THREE.MathUtils.clamp(speed, 0.5, 3.0);
  }

  public update(delta: number): void {
    if (!this.running) return;

    for (const train of this.trains.values()) {
      const line = this.lineManager.getLine(train.lineId);
      if (!line || !line.curve) continue;

      train.updatePulse(delta);

      if (train.isStopped) {
        train.stopTimer -= delta;
        if (train.stopTimer <= 0) {
          train.isStopped = false;
        } else {
          continue;
        }
      }

      const lineLength = line.getTotalLength();
      if (lineLength === 0) continue;

      const effectiveSpeed = train.baseSpeed * this.globalSpeed * delta;
      train.progress += effectiveSpeed;

      if (train.progress >= 1) {
        train.progress = 0;
        train.currentStationIndex = -1;
      }

      const pos = line.getPointAt(train.progress);
      if (pos) {
        train.group.position.copy(pos);
        train.updateTrail(pos);
      }

      const stationCount = line.stationIds.length;
      for (let i = 0; i < stationCount; i++) {
        let stationProgress: number;
        if (stationCount === 1) {
          stationProgress = 0;
        } else {
          stationProgress = i / (stationCount - 1);
        }
        const dist = Math.abs(train.progress - stationProgress);
        if (dist < 0.01 && train.currentStationIndex !== i) {
          train.currentStationIndex = i;
          train.isStopped = true;
          train.stopTimer = 2.0;
          train.startPulse();
          break;
        }
      }
    }
  }

  public clearAll(): void {
    for (const train of this.trains.values()) {
      this.scene.remove(train.group);
      train.dispose();
    }
    this.trains.clear();
  }

  public createTrainsForAllLines(): void {
    for (const line of this.lineManager.getAllLines()) {
      if (!this.trains.has(line.id)) {
        this.createTrainForLine(line);
      }
    }
  }

  public exportData(): SimulatorState {
    const trainsData: TrainData[] = [];
    for (const train of this.trains.values()) {
      trainsData.push({
        lineId: train.lineId,
        progress: train.progress,
        speedMultiplier: this.globalSpeed
      });
    }
    return {
      trains: trainsData,
      globalSpeed: this.globalSpeed,
      running: this.running
    };
  }

  public importData(state: SimulatorState): void {
    this.globalSpeed = state.globalSpeed;
    this.running = state.running;

    for (const trainData of state.trains) {
      const train = this.trains.get(trainData.lineId);
      if (train) {
        train.progress = trainData.progress;
      }
    }
  }
}
