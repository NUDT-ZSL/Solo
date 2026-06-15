import * as THREE from 'three';

const PARTICLE_COUNT = 5000;
const SPHERE_RADIUS = 200;
const CLUSTER_RADIUS = 30;
const MAX_FLOW_SPEED = 80;
const HUE_START = 180 / 360;
const SAT_START = 0.6;
const LUM_START = 0.9;
const HUE_END = 30 / 360;
const SAT_END = 0.8;
const LUM_END = 1.0;
const CLUSTER_DURATION = 2.0;
const JITTER_DURATION = 0.5;
const JITTER_AMPLITUDE = 5;
const JITTER_FREQUENCY = 10;

interface ParticleData {
  baseTheta: Float32Array;
  basePhi: Float32Array;
  theta: Float32Array;
  phi: Float32Array;
  size: Float32Array;
  flowVelocity: Float32Array;
  clusterProgress: Float32Array;
  clusterTargetTheta: number;
  clusterTargetPhi: number;
  isClustering: boolean;
  clusterTimer: number;
  inClusterState: boolean;
  jitterTimer: Float32Array;
  jitterPhase: Float32Array;
  baseColor: Float32Array;
  colorProgress: Float32Array;
  rippleHitTime: Float32Array;
}

interface Ripple {
  theta: number;
  phi: number;
  startTime: number;
  currentTime: number;
  duration: number;
}

export class ParticleSystem {
  public mesh: THREE.Points;
  public group: THREE.Group;

  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private data: ParticleData;
  private ripples: Ripple[] = [];
  private tmpColor = new THREE.Color();
  private globalTime = 0;

  constructor() {
    this.group = new THREE.Group();
    this.geometry = new THREE.BufferGeometry();
    this.data = this.initParticleData();
    this.setupGeometry();

    this.material = new THREE.PointsMaterial({
      size: 5,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.mesh = new THREE.Points(this.geometry, this.material);
    this.group.add(this.mesh);
  }

  private initParticleData(): ParticleData {
    const baseTheta = new Float32Array(PARTICLE_COUNT);
    const basePhi = new Float32Array(PARTICLE_COUNT);
    const theta = new Float32Array(PARTICLE_COUNT);
    const phi = new Float32Array(PARTICLE_COUNT);
    const size = new Float32Array(PARTICLE_COUNT);
    const flowVelocity = new Float32Array(PARTICLE_COUNT);
    const clusterProgress = new Float32Array(PARTICLE_COUNT);
    const jitterTimer = new Float32Array(PARTICLE_COUNT);
    const jitterPhase = new Float32Array(PARTICLE_COUNT);
    const baseColor = new Float32Array(PARTICLE_COUNT * 3);
    const colorProgress = new Float32Array(PARTICLE_COUNT);
    const rippleHitTime = new Float32Array(PARTICLE_COUNT).fill(-999);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const u1 = Math.random();
      const u2 = Math.random();
      const phi_i = Math.acos(2 * u1 - 1);
      const theta_i = 2 * Math.PI * u2;

      baseTheta[i] = theta_i;
      basePhi[i] = phi_i;
      theta[i] = theta_i;
      phi[i] = phi_i;
      size[i] = 3 + Math.random() * 5;
      flowVelocity[i] = 0;
      clusterProgress[i] = 0;
      jitterTimer[i] = 0;
      jitterPhase[i] = Math.random() * Math.PI * 2;
      colorProgress[i] = 0;

      const color = new THREE.Color().setHSL(HUE_START, SAT_START, LUM_START);
      baseColor[i * 3] = color.r;
      baseColor[i * 3 + 1] = color.g;
      baseColor[i * 3 + 2] = color.b;
    }

    return {
      baseTheta,
      basePhi,
      theta,
      phi,
      size,
      flowVelocity,
      clusterProgress,
      clusterTargetTheta: 0,
      clusterTargetPhi: Math.PI / 2,
      isClustering: false,
      clusterTimer: 0,
      inClusterState: false,
      jitterTimer,
      jitterPhase,
      baseColor,
      colorProgress,
      rippleHitTime,
    };
  }

  private setupGeometry() {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.updatePosition(positions, i);
      this.updateColor(colors, i, 0);
      sizes[i] = this.data.size[i];
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  }

  private updatePosition(positions: Float32Array, i: number) {
    const theta = this.data.theta[i];
    const phi = this.data.phi[i];

    let r = SPHERE_RADIUS;
    const cp = this.data.clusterProgress[i];
    if (cp > 0) {
      const targetR = SPHERE_RADIUS - CLUSTER_RADIUS;
      r = SPHERE_RADIUS - (SPHERE_RADIUS - targetR) * this.smoothstep(cp);
    }

    let jitterX = 0, jitterY = 0, jitterZ = 0;
    const jt = this.data.jitterTimer[i];
    if (jt > 0) {
      const jitterStrength = this.easeOutCubic(jt / JITTER_DURATION) * JITTER_AMPLITUDE;
      const phase = this.data.jitterPhase[i] + this.globalTime * JITTER_FREQUENCY * Math.PI * 2;
      jitterX = Math.sin(phase) * jitterStrength;
      jitterY = Math.cos(phase * 1.3) * jitterStrength;
      jitterZ = Math.sin(phase * 0.7) * jitterStrength;
    }

    const sinPhi = Math.sin(phi);
    positions[i * 3] = r * sinPhi * Math.cos(theta) + jitterX;
    positions[i * 3 + 1] = r * Math.cos(phi) + jitterY;
    positions[i * 3 + 2] = r * sinPhi * Math.sin(theta) + jitterZ;
  }

  private updateColor(colors: Float32Array, i: number, _dt: number) {
    const cp = this.data.colorProgress[i];
    let h = HUE_START + (HUE_END - HUE_START) * cp;
    let s = SAT_START + (SAT_END - SAT_START) * cp;
    let l = LUM_START + (LUM_END - LUM_START) * cp;

    const jt = this.data.jitterTimer[i];
    if (jt > 0) {
      const jAlpha = this.easeOutCubic(jt / JITTER_DURATION);
      l = l + (1.0 - l) * jAlpha;
      s = s * (1 - jAlpha * 0.5);
    }

    const color = this.tmpColor.setHSL(h, s, l);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  private smoothstep(x: number): number {
    return x * x * (3 - 2 * x);
  }

  private easeOutCubic(x: number): number {
    const t = Math.max(0, Math.min(1, x));
    return 1 - Math.pow(1 - t, 3);
  }

  public setFlowSpeed(speed: number) {
    const clamped = Math.max(-MAX_FLOW_SPEED, Math.min(MAX_FLOW_SPEED, speed));
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.data.flowVelocity[i] = clamped;
    }
  }

  public startClustering(worldPoint: THREE.Vector3) {
    const normalized = worldPoint.clone().normalize();
    const theta = Math.atan2(normalized.z, normalized.x);
    const phi = Math.acos(Math.max(-1, Math.min(1, normalized.y)));
    this.data.clusterTargetTheta = theta;
    this.data.clusterTargetPhi = phi;
    this.data.isClustering = true;
    this.data.inClusterState = true;
    this.data.clusterTimer = 0;
  }

  public triggerRipple(worldPoint: THREE.Vector3) {
    const normalized = worldPoint.clone().normalize();
    const theta = Math.atan2(normalized.z, normalized.x);
    const phi = Math.acos(Math.max(-1, Math.min(1, normalized.y)));

    for (let ring = 0; ring < 3; ring++) {
      this.ripples.push({
        theta,
        phi,
        startTime: this.globalTime + ring * 0.12,
        currentTime: -ring * 0.12,
        duration: 0.4,
      });
    }
  }

  public update(dt: number) {
    this.globalTime += dt;
    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;

    if (this.data.isClustering) {
      this.data.clusterTimer += dt;

      if (!this.data.inClusterState) {
        this.updateDisperseIfNeeded();
      } else if (this.data.clusterTimer >= CLUSTER_DURATION) {
        this.data.inClusterState = false;
        this.data.clusterTimer = 0;
      }
    }

    const activeRipples: Ripple[] = [];
    for (const ripple of this.ripples) {
      ripple.currentTime += dt;
      if (ripple.currentTime < ripple.duration + 0.1) {
        activeRipples.push(ripple);
      }
    }
    this.ripples = activeRipples;

    const targetTheta = this.data.clusterTargetTheta;
    const targetPhi = this.data.clusterTargetPhi;
    const sinTargetPhi = Math.sin(targetPhi);
    const cosTargetPhi = Math.cos(targetPhi);
    const cosTargetTheta = Math.cos(targetTheta);
    const sinTargetTheta = Math.sin(targetTheta);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const flow = this.data.flowVelocity[i];
      if (Math.abs(flow) > 0.01) {
        this.data.theta[i] += flow * dt * 0.01;
        this.data.flowVelocity[i] *= Math.pow(0.92, dt * 60);
      }

      if (this.data.isClustering) {
        if (this.data.inClusterState) {
          this.data.clusterProgress[i] = Math.min(1, this.data.clusterProgress[i] + dt * 1.2);
          this.data.colorProgress[i] = Math.min(1, this.data.colorProgress[i] + dt * 1.2);
        } else {
          this.data.clusterProgress[i] = Math.max(0, this.data.clusterProgress[i] - dt * 1.5);
          this.data.colorProgress[i] = Math.max(0, this.data.colorProgress[i] - dt * 1.5);
        }

        const cp = this.smoothstep(this.data.clusterProgress[i]);
        const curSinPhi = Math.sin(this.data.basePhi[i]);
        const curX = SPHERE_RADIUS * curSinPhi * Math.cos(this.data.baseTheta[i]);
        const curY = SPHERE_RADIUS * Math.cos(this.data.basePhi[i]);
        const curZ = SPHERE_RADIUS * curSinPhi * Math.sin(this.data.baseTheta[i]);

        const tgtR = SPHERE_RADIUS - CLUSTER_RADIUS;
        const tgtX = tgtR * sinTargetPhi * cosTargetTheta;
        const tgtY = tgtR * cosTargetPhi;
        const tgtZ = tgtR * sinTargetPhi * sinTargetTheta;

        const lerpX = curX + (tgtX - curX) * cp;
        const lerpY = curY + (tgtY - curY) * cp;
        const lerpZ = curZ + (tgtZ - curZ) * cp;

        const lerpLen = Math.sqrt(lerpX * lerpX + lerpY * lerpY + lerpZ * lerpZ);
        const lerpNX = lerpX / lerpLen;
        const lerpNY = lerpY / lerpLen;
        const lerpNZ = lerpZ / lerpLen;

        this.data.theta[i] = Math.atan2(lerpNZ, lerpNX);
        this.data.phi[i] = Math.acos(Math.max(-1, Math.min(1, lerpNY)));
      } else {
        if (this.data.clusterProgress[i] > 0) {
          this.data.clusterProgress[i] = Math.max(0, this.data.clusterProgress[i] - dt * 1.5);
        }
        if (this.data.colorProgress[i] > 0) {
          this.data.colorProgress[i] = Math.max(0, this.data.colorProgress[i] - dt * 1.5);
        }
      }

      if (this.data.jitterTimer[i] > 0) {
        this.data.jitterTimer[i] = Math.max(0, this.data.jitterTimer[i] - dt);
      }

      for (const ripple of this.ripples) {
        if (ripple.currentTime < 0) continue;
        const rippleProgress = ripple.currentTime / ripple.duration;
        if (rippleProgress < 0 || rippleProgress > 1.2) continue;

        const ringRadius = rippleProgress * Math.PI * 0.6;
        const waveWidth = 0.25;

        const pSinPhi = Math.sin(this.data.phi[i]);
        const pCosPhi = Math.cos(this.data.phi[i]);
        const pX = pSinPhi * Math.cos(this.data.theta[i]);
        const pY = pCosPhi;
        const pZ = pSinPhi * Math.sin(this.data.theta[i]);

        const rX = Math.sin(ripple.phi) * Math.cos(ripple.theta);
        const rY = Math.cos(ripple.phi);
        const rZ = Math.sin(ripple.phi) * Math.sin(ripple.theta);

        const dot = pX * rX + pY * rY + pZ * rZ;
        const angularDist = Math.acos(Math.max(-1, Math.min(1, dot)));
        const distFromRing = Math.abs(angularDist - ringRadius);

        if (distFromRing < waveWidth) {
          const hitStrength = 1 - distFromRing / waveWidth;
          if (hitStrength > 0.3 && this.data.rippleHitTime[i] < this.globalTime - 0.1) {
            this.data.jitterTimer[i] = JITTER_DURATION;
            this.data.rippleHitTime[i] = this.globalTime;
          }
        }
      }

      this.updatePosition(positions, i);
      this.updateColor(colors, i, dt);
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  private updateDisperseIfNeeded() {
    let allDone = true;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      if (this.data.clusterProgress[i] > 0.001) {
        allDone = false;
        break;
      }
    }
    if (allDone) {
      this.data.isClustering = false;
    }
  }

  public dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
