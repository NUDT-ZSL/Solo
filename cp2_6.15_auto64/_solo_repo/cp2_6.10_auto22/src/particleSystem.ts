import * as THREE from 'three';
import { SensorData, ClimateMode, MODE_CONFIGS, ModeConfig } from './sensorDataSimulator';

interface Particle {
  id: number;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3;
  velocity: THREE.Vector3;
  targetVelocity: THREE.Vector3;
  temperature: number;
  targetTemperature: number;
  humidity: number;
  targetHumidity: number;
  birthTime: number;
  lifespan: number;
  isDead: boolean;
  opacity: number;
  scale: number;
  currentMode: ClimateMode;
  trail: THREE.Vector3[];
}

interface PendingTransition {
  fromMode: ClimateMode;
  toMode: ClimateMode;
  progress: number;
  duration: number;
  isActive: boolean;
}

const COLOR_STOPS: Array<{ temp: number; color: THREE.Color }> = [
  { temp: -10, color: new THREE.Color(0x1e90ff) },
  { temp: 0, color: new THREE.Color(0x00ced1) },
  { temp: 10, color: new THREE.Color(0x32cd32) },
  { temp: 22, color: new THREE.Color(0xffd700) },
  { temp: 33, color: new THREE.Color(0xff8c00) },
  { temp: 45, color: new THREE.Color(0xff4500) }
];

const MIN_PARTICLES = 2000;
const MAX_PARTICLES = 2500;
const PARTICLE_LIFESPAN = 5000;
const TRAIL_LENGTH = 8;
const SIZE_MIN = 0.5;
const SIZE_MAX = 3.0;
const TEMP_MIN = -10;
const TEMP_MAX = 45;
const TRANSITION_DURATION = 1500;

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private particlePool: Particle[] = [];
  private points: THREE.Points | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.PointsMaterial | null = null;
  private trailLines: THREE.Line[] = [];
  private positionArray: Float32Array | null = null;
  private colorArray: Float32Array | null = null;
  private sizeArray: Float32Array | null = null;
  private nextId = 0;
  private transition: PendingTransition | null = null;
  private currentMode: ClimateMode = ClimateMode.SUMMER;
  private particleTexture: THREE.Texture | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createParticleTexture();
    this.initGeometry();
    this.initMaterial();
    this.initPoints();
    this.preFillPool();
  }

  private createParticleTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.6, 'rgba(200, 200, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(100, 100, 200, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    
    this.particleTexture = new THREE.CanvasTexture(canvas);
    this.particleTexture.needsUpdate = true;
  }

  private initGeometry(): void {
    this.geometry = new THREE.BufferGeometry();
    this.positionArray = new Float32Array(MAX_PARTICLES * 3);
    this.colorArray = new Float32Array(MAX_PARTICLES * 3);
    this.sizeArray = new Float32Array(MAX_PARTICLES);
    
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positionArray, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colorArray, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizeArray, 1));
  }

  private initMaterial(): void {
    this.material = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: this.particleTexture,
      sizeAttenuation: true
    });
  }

  private initPoints(): void {
    if (this.geometry && this.material) {
      this.points = new THREE.Points(this.geometry, this.material);
      this.points.frustumCulled = false;
      this.scene.add(this.points);
    }
  }

  private preFillPool(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particlePool.push(this.createEmptyParticle());
    }
  }

  private createEmptyParticle(): Particle {
    return {
      id: -1,
      position: new THREE.Vector3(),
      targetPosition: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      targetVelocity: new THREE.Vector3(),
      temperature: 0,
      targetTemperature: 0,
      humidity: 0,
      targetHumidity: 0,
      birthTime: 0,
      lifespan: PARTICLE_LIFESPAN,
      isDead: true,
      opacity: 1,
      scale: 1,
      currentMode: this.currentMode,
      trail: []
    };
  }

  public spawnParticle(data: SensorData): void {
    if (this.particles.length >= MAX_PARTICLES) return;

    let particle: Particle;
    if (this.particlePool.length > 0) {
      particle = this.particlePool.pop()!;
    } else {
      particle = this.createEmptyParticle();
    }

    particle.id = this.nextId++;
    particle.position.copy(data.position as any);
    particle.targetPosition.copy(data.position as any);
    particle.velocity.copy(data.velocity as any);
    particle.targetVelocity.copy(data.velocity as any);
    particle.temperature = data.temperature;
    particle.targetTemperature = data.temperature;
    particle.humidity = data.humidity;
    particle.targetHumidity = data.humidity;
    particle.birthTime = performance.now();
    particle.lifespan = PARTICLE_LIFESPAN;
    particle.isDead = false;
    particle.opacity = 0;
    particle.scale = 0;
    particle.currentMode = this.currentMode;
    particle.trail = [];

    this.particles.push(particle);
  }

  public updateSensorData(dataBatch: SensorData[]): void {
    if (this.transition?.isActive) return;
    
    const spawnCount = Math.min(dataBatch.length, MAX_PARTICLES - this.particles.length);
    for (let i = 0; i < spawnCount; i++) {
      this.spawnParticle(dataBatch[i]);
    }
  }

  public update(deltaTime: number): void {
    const now = performance.now();

    if (this.transition?.isActive) {
      this.transition.progress += deltaTime * 1000;
      if (this.transition.progress >= this.transition.duration) {
        this.transition.isActive = false;
        this.currentMode = this.transition.toMode;
        this.transition = null;
      }
    }

    let aliveCount = 0;
    const toRecycle: Particle[] = [];

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.isDead) continue;

      const age = now - p.birthTime;
      const lifeProgress = age / p.lifespan;

      if (lifeProgress >= 1) {
        p.isDead = true;
        toRecycle.push(p);
        continue;
      }

      aliveCount++;

      this.updateTransition(p, deltaTime);
      this.updatePosition(p, deltaTime);
      this.updateLifecycle(p, lifeProgress);
      this.updateTrail(p);
      this.updateBufferAttributes(i, p);
    }

    this.recycleParticles(toRecycle);
    this.maintainMinimumParticles(aliveCount, now);
    this.updateGeometryDrawRange(aliveCount);
  }

  private updateTransition(p: Particle, deltaTime: number): void {
    if (!this.transition?.isActive) return;

    const t = Math.min(1, this.transition.progress / this.transition.duration);
    const eased = this.easeInOutCubic(t);

    p.position.lerp(p.targetPosition, eased * deltaTime * 2);
    p.velocity.lerp(p.targetVelocity, eased * deltaTime * 2);
    p.temperature = THREE.MathUtils.lerp(p.temperature, p.targetTemperature, eased * deltaTime * 2);
    p.humidity = THREE.MathUtils.lerp(p.humidity, p.targetHumidity, eased * deltaTime * 2);
  }

  private updatePosition(p: Particle, deltaTime: number): void {
    p.position.x += p.velocity.x * deltaTime;
    p.position.y += p.velocity.y * deltaTime;
    p.position.z += p.velocity.z * deltaTime;

    const bounds = 60;
    if (Math.abs(p.position.x) > bounds) p.velocity.x *= -0.8;
    if (Math.abs(p.position.y) > bounds) p.velocity.y *= -0.8;
    if (Math.abs(p.position.z) > bounds) p.velocity.z *= -0.8;
  }

  private updateLifecycle(p: Particle, lifeProgress: number): void {
    if (lifeProgress < 0.1) {
      p.opacity = lifeProgress / 0.1;
      p.scale = lifeProgress / 0.1;
    } else if (lifeProgress > 0.8) {
      const fadeProgress = (lifeProgress - 0.8) / 0.2;
      p.opacity = 1 - fadeProgress;
      p.scale = 1 - fadeProgress;
    } else {
      p.opacity = 1;
      p.scale = 1;
    }
  }

  private updateTrail(p: Particle): void {
    p.trail.unshift(p.position.clone());
    if (p.trail.length > TRAIL_LENGTH) {
      p.trail.pop();
    }
  }

  private updateBufferAttributes(index: number, p: Particle): void {
    if (!this.positionArray || !this.colorArray || !this.sizeArray) return;

    const i3 = index * 3;
    this.positionArray[i3] = p.position.x;
    this.positionArray[i3 + 1] = p.position.y;
    this.positionArray[i3 + 2] = p.position.z;

    const color = this.temperatureToColor(p.temperature);
    this.colorArray[i3] = color.r * p.opacity;
    this.colorArray[i3 + 1] = color.g * p.opacity;
    this.colorArray[i3 + 2] = color.b * p.opacity;

    const size = this.humidityToSize(p.humidity) * p.scale;
    this.sizeArray[index] = size;
  }

  private recycleParticles(toRecycle: Particle[]): void {
    this.particles = this.particles.filter(p => !p.isDead);
    for (const p of toRecycle) {
      p.trail = [];
      this.particlePool.push(p);
    }
  }

  private maintainMinimumParticles(aliveCount: number, now: number): void {
    if (aliveCount < MIN_PARTICLES && !this.transition?.isActive) {
      const deficit = MIN_PARTICLES - aliveCount;
      const spawnPerFrame = Math.ceil(deficit / 30);
      
      for (let i = 0; i < spawnPerFrame && this.particles.length < MAX_PARTICLES; i++) {
        const config = MODE_CONFIGS[this.currentMode];
        const data = this.generateRandomSensorData(config);
        this.spawnParticle(data);
      }
    }
  }

  private generateRandomSensorData(config: ModeConfig): SensorData {
    const range = 50;
    let x: number, y: number, z: number;

    switch (config.distribution) {
      case 'sphere': {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = range * Math.cbrt(Math.random());
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta) + config.biasY;
        z = r * Math.cos(phi);
        break;
      }
      case 'disk': {
        const theta = Math.random() * Math.PI * 2;
        const r = range * Math.sqrt(Math.random());
        x = r * Math.cos(theta);
        y = (Math.random() - 0.5) * 20 + config.biasY;
        z = r * Math.sin(theta);
        break;
      }
      case 'column': {
        const theta = Math.random() * Math.PI * 2;
        const r = range * 0.6 * Math.sqrt(Math.random());
        x = r * Math.cos(theta);
        y = (Math.random() - 0.5) * range * 1.5 + config.biasY;
        z = r * Math.sin(theta);
        break;
      }
    }

    const scale = config.velocityScale;
    let vx = (Math.random() - 0.5) * 2 * scale;
    let vy = (Math.random() - 0.5) * 2 * scale;
    let vz = (Math.random() - 0.5) * 2 * scale;

    if (config.distribution === 'column') {
      vy = (Math.random() > 0.5 ? 1 : -1) * (3 + Math.random() * 3) * scale;
    }

    return {
      position: { x, y, z },
      velocity: { x: vx, y: vy, z: vz },
      temperature: config.tempRange[0] + Math.random() * (config.tempRange[1] - config.tempRange[0]),
      humidity: config.humidityRange[0] + Math.random() * (config.humidityRange[1] - config.humidityRange[0])
    };
  }

  private updateGeometryDrawRange(aliveCount: number): void {
    if (this.geometry) {
      this.geometry.setDrawRange(0, Math.max(aliveCount, 1));
      const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
      const colAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
      const sizeAttr = this.geometry.getAttribute('size') as THREE.BufferAttribute;
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
    }
  }

  public temperatureToColor(temperature: number): THREE.Color {
    const t = THREE.MathUtils.clamp(temperature, TEMP_MIN, TEMP_MAX);

    for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
      const curr = COLOR_STOPS[i];
      const next = COLOR_STOPS[i + 1];

      if (t >= curr.temp && t <= next.temp) {
        const range = next.temp - curr.temp;
        const localT = (t - curr.temp) / range;
        return curr.color.clone().lerp(next.color, localT);
      }
    }

    return t < TEMP_MIN ? COLOR_STOPS[0].color.clone() : COLOR_STOPS[COLOR_STOPS.length - 1].color.clone();
  }

  public humidityToSize(humidity: number): number {
    const h = THREE.MathUtils.clamp(humidity, 0, 100);
    return SIZE_MIN + (SIZE_MAX - SIZE_MIN) * (h / 100);
  }

  public transitionToMode(newMode: ClimateMode): void {
    if (newMode === this.currentMode || this.transition?.isActive) return;

    this.transition = {
      fromMode: this.currentMode,
      toMode: newMode,
      progress: 0,
      duration: TRANSITION_DURATION,
      isActive: true
    };

    const newConfig = MODE_CONFIGS[newMode];
    for (const p of this.particles) {
      if (p.isDead) continue;

      const newData = this.generateRandomSensorData(newConfig);
      p.targetPosition.copy(newData.position as any);
      p.targetVelocity.copy(newData.velocity as any);
      p.targetTemperature = newData.temperature;
      p.targetHumidity = newData.humidity;
    }
  }

  public getParticleCount(): number {
    return this.particles.filter(p => !p.isDead).length;
  }

  public getParticleByIndex(index: number): Particle | null {
    const aliveParticles = this.particles.filter(p => !p.isDead);
    return aliveParticles[index] || null;
  }

  public getPoints(): THREE.Points | null {
    return this.points;
  }

  public getCurrentMode(): ClimateMode {
    return this.currentMode;
  }

  public isTransitioning(): boolean {
    return this.transition?.isActive ?? false;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public dispose(): void {
    if (this.points) {
      this.scene.remove(this.points);
      this.points.geometry.dispose();
      (this.points.material as THREE.Material).dispose();
    }
    if (this.particleTexture) {
      this.particleTexture.dispose();
    }
    this.particles = [];
    this.particlePool = [];
  }
}
