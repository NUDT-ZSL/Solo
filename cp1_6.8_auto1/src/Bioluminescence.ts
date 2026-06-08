import * as THREE from 'three';
import { TideSystem } from './TideSystem';
import type { SceneParams } from './SceneManager';

interface Cluster {
  center: THREE.Vector3;
  radius: number;
  particleIndices: number[];
  density: number;
}

interface BurstInfo {
  phase: number;
  density: number;
  intensity: number;
}

interface BurstState {
  active: boolean;
  center: THREE.Vector3;
  startTime: number;
  duration: number;
  particles: {
    positions: Float32Array;
    velocities: Float32Array;
    count: number;
  };
  info: BurstInfo;
}

export class Bioluminescence {
  private scene: THREE.Scene;
  private tideSystem: TideSystem;
  private canvas: HTMLCanvasElement;
  private camera: THREE.PerspectiveCamera;
  private params: SceneParams;

  private particleCount: number;
  private positions: Float32Array;
  private velocities: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private alphas: Float32Array;
  private clusterOffsets: Float32Array;

  private particleGeometry!: THREE.BufferGeometry;
  private particleMaterial!: THREE.ShaderMaterial;
  private particleSystem!: THREE.Points;

  private clusters: Cluster[] = [];
  private burstState: BurstState | null = null;
  private burstMesh: THREE.Points | null = null;
  private burstGeometry: THREE.BufferGeometry | null = null;

  private streamlineGeometry!: THREE.BufferGeometry;
  private streamlineMaterial!: THREE.ShaderMaterial;
  private streamlineMesh!: THREE.LineSegments;

  private raycaster = new THREE.Raycaster();

  onBurst: ((info: BurstInfo) => void) | null = null;

  constructor(
    scene: THREE.Scene,
    tideSystem: TideSystem,
    canvas: HTMLCanvasElement,
    camera: THREE.PerspectiveCamera,
    params: SceneParams,
  ) {
    this.scene = scene;
    this.tideSystem = tideSystem;
    this.canvas = canvas;
    this.camera = camera;
    this.params = params;

    this.particleCount = params.particleDensity;
    this.positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.sizes = new Float32Array(this.particleCount);
    this.alphas = new Float32Array(this.particleCount);
    this.clusterOffsets = new Float32Array(this.particleCount);

    this.initParticles();
    this.initClusters();
    this.createParticleSystem();
    this.createStreamlines();
  }

  private initParticles() {
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const r = Math.random() * 45;
      const y = Math.random() * 25 - 2;

      this.positions[i3] = Math.cos(theta) * r;
      this.positions[i3 + 1] = y;
      this.positions[i3 + 2] = Math.sin(theta) * r;

      this.velocities[i3] = (Math.random() - 0.5) * 0.5;
      this.velocities[i3 + 1] = (Math.random() - 0.5) * 0.2;
      this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.5;

      const colorMix = Math.random();
      if (colorMix < 0.4) {
        this.colors[i3] = 0.3 + Math.random() * 0.2;
        this.colors[i3 + 1] = 0.2 + Math.random() * 0.15;
        this.colors[i3 + 2] = 0.8 + Math.random() * 0.2;
      } else if (colorMix < 0.7) {
        this.colors[i3] = 0.1 + Math.random() * 0.1;
        this.colors[i3 + 1] = 0.7 + Math.random() * 0.3;
        this.colors[i3 + 2] = 0.9 + Math.random() * 0.1;
      } else {
        this.colors[i3] = 0.0 + Math.random() * 0.1;
        this.colors[i3 + 1] = 0.9 + Math.random() * 0.1;
        this.colors[i3 + 2] = 0.6 + Math.random() * 0.2;
      }

      this.sizes[i] = 1.0 + Math.random() * 2.5;
      this.alphas[i] = 0.4 + Math.random() * 0.6;
      this.clusterOffsets[i] = Math.random() * Math.PI * 2;
    }
  }

  private initClusters() {
    this.clusters = [];
    const clusterCount = 6;
    for (let c = 0; c < clusterCount; c++) {
      const angle = (c / clusterCount) * Math.PI * 2;
      const r = 12 + Math.random() * 18;
      const cluster: Cluster = {
        center: new THREE.Vector3(
          Math.cos(angle) * r,
          3 + Math.random() * 10,
          Math.sin(angle) * r,
        ),
        radius: 6 + Math.random() * 6,
        particleIndices: [],
        density: 0,
      };
      this.clusters.push(cluster);
    }

    this.assignParticlesToClusters();
  }

  private assignParticlesToClusters() {
    for (const cluster of this.clusters) {
      cluster.particleIndices = [];
    }
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const px = this.positions[i3];
      const py = this.positions[i3 + 1];
      const pz = this.positions[i3 + 2];
      let minDist = Infinity;
      let closest = 0;
      for (let c = 0; c < this.clusters.length; c++) {
        const d = this.clusters[c].center.distanceTo(
          new THREE.Vector3(px, py, pz),
        );
        if (d < minDist) {
          minDist = d;
          closest = c;
        }
      }
      this.clusters[closest].particleIndices.push(i);
    }
    for (const cluster of this.clusters) {
      cluster.density = cluster.particleIndices.length / this.particleCount;
    }
  }

  private createParticleSystem() {
    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3),
    );
    this.particleGeometry.setAttribute(
      'aColor',
      new THREE.BufferAttribute(this.colors, 3),
    );
    this.particleGeometry.setAttribute(
      'aSize',
      new THREE.BufferAttribute(this.sizes, 1),
    );
    this.particleGeometry.setAttribute(
      'aAlpha',
      new THREE.BufferAttribute(this.alphas, 1),
    );

    this.particleMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uGlowIntensity: { value: this.params.glowIntensity },
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aAlpha;
        uniform float uPixelRatio;
        uniform float uGlowIntensity;
        uniform float uTime;
        varying vec3 vColor;
        varying float vAlpha;
        varying float vGlow;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float pulse = 1.0 + sin(uTime * 2.0 + position.x * 0.5 + position.z * 0.5) * 0.15;
          float sz = aSize * uPixelRatio * pulse * uGlowIntensity;
          gl_PointSize = sz * (200.0 / -mvPosition.z);
          gl_PointSize = max(gl_PointSize, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          vGlow = uGlowIntensity;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        varying float vGlow;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float core = exp(-dist * dist * 20.0);
          float glow = exp(-dist * dist * 6.0);
          float alpha = (core * 0.8 + glow * 0.4) * vAlpha * vGlow;
          vec3 finalColor = vColor * (core * 1.5 + glow * 0.5);
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
    });

    this.particleSystem = new THREE.Points(
      this.particleGeometry,
      this.particleMaterial,
    );
    this.scene.add(this.particleSystem);
  }

  private createStreamlines() {
    const lineCount = Math.min(200, Math.floor(this.particleCount * 0.15));
    const linePositions = new Float32Array(lineCount * 2 * 3);
    const lineColors = new Float32Array(lineCount * 2 * 3);
    const lineAlphas = new Float32Array(lineCount * 2);

    for (let i = 0; i < lineCount; i++) {
      const idx = Math.floor(Math.random() * this.particleCount);
      const i3 = idx * 3;
      const li = i * 6;

      linePositions[li] = this.positions[i3];
      linePositions[li + 1] = this.positions[i3 + 1];
      linePositions[li + 2] = this.positions[i3 + 2];

      const dir = this.tideSystem.getFlowDirection(
        new THREE.Vector3(this.positions[i3], this.positions[i3 + 1], this.positions[i3 + 2]),
      );
      const len = 2 + Math.random() * 3;
      linePositions[li + 3] = this.positions[i3] + dir.x * len;
      linePositions[li + 4] = this.positions[i3 + 1] + dir.y * len;
      linePositions[li + 5] = this.positions[i3 + 2] + dir.z * len;

      lineColors[li] = this.colors[i3] * 0.5;
      lineColors[li + 1] = this.colors[i3 + 1] * 0.5;
      lineColors[li + 2] = this.colors[i3 + 2] * 0.5;
      lineColors[li + 3] = this.colors[i3] * 0.2;
      lineColors[li + 4] = this.colors[i3 + 1] * 0.2;
      lineColors[li + 5] = this.colors[i3 + 2] * 0.2;

      lineAlphas[i * 2] = 0.3;
      lineAlphas[i * 2 + 1] = 0.0;
    }

    this.streamlineGeometry = new THREE.BufferGeometry();
    this.streamlineGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(linePositions, 3),
    );
    this.streamlineGeometry.setAttribute(
      'aColor',
      new THREE.BufferAttribute(lineColors, 3),
    );
    this.streamlineGeometry.setAttribute(
      'aAlpha',
      new THREE.BufferAttribute(lineAlphas, 1),
    );

    this.streamlineMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uGlowIntensity: { value: this.params.glowIntensity },
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aAlpha;
        uniform float uGlowIntensity;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = aColor * uGlowIntensity;
          vAlpha = aAlpha * uGlowIntensity;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          gl_FragColor = vec4(vColor, vAlpha);
        }
      `,
    });

    this.streamlineMesh = new THREE.LineSegments(
      this.streamlineGeometry,
      this.streamlineMaterial,
    );
    this.scene.add(this.streamlineMesh);
  }

  handleClick(mouse: THREE.Vector2) {
    this.raycaster.setFromCamera(mouse, this.camera);

    let closestCluster: Cluster | null = null;
    let closestDist = Infinity;

    for (const cluster of this.clusters) {
      const dist = this.raycaster.ray.distanceToPoint(cluster.center);
      if (dist < cluster.radius && dist < closestDist) {
        closestDist = dist;
        closestCluster = cluster;
      }
    }

    if (closestCluster) {
      this.triggerBurst(closestCluster);
    }
  }

  private triggerBurst(cluster: Cluster) {
    const burstParticleCount = 300;
    const burstPositions = new Float32Array(burstParticleCount * 3);
    const burstVelocities = new Float32Array(burstParticleCount * 3);

    for (let i = 0; i < burstParticleCount; i++) {
      const i3 = i * 3;
      burstPositions[i3] = cluster.center.x;
      burstPositions[i3 + 1] = cluster.center.y;
      burstPositions[i3 + 2] = cluster.center.z;

      const angle = (i / burstParticleCount) * Math.PI * 8;
      const heightT = i / burstParticleCount;
      const spiralR = 0.5 + heightT * 3;

      burstVelocities[i3] = Math.cos(angle) * spiralR * 0.8;
      burstVelocities[i3 + 1] = 2.0 + heightT * 5.0;
      burstVelocities[i3 + 2] = Math.sin(angle) * spiralR * 0.8;
    }

    this.burstState = {
      active: true,
      center: cluster.center.clone(),
      startTime: 0,
      duration: 3.0,
      particles: {
        positions: burstPositions,
        velocities: burstVelocities,
        count: burstParticleCount,
      },
      info: {
        phase: this.tideSystem.getPhaseNormalized(),
        density: cluster.density,
        intensity: this.params.glowIntensity,
      },
    };

    this.createBurstMesh();

    const clusterIndices = cluster.particleIndices.slice();
    const center = cluster.center;
    for (const idx of clusterIndices) {
      const i3 = idx * 3;
      const dx = this.positions[i3] - center.x;
      const dz = this.positions[i3 + 2] - center.z;
      const dist2D = Math.sqrt(dx * dx + dz * dz);
      const dir2D = dist2D > 0.01 ? { x: dx / dist2D, z: dz / dist2D } : { x: 1, z: 0 };

      this.velocities[i3] += dir2D.x * 3.0;
      this.velocities[i3 + 1] += 2.0;
      this.velocities[i3 + 2] += dir2D.z * 3.0;

      this.alphas[idx] = 1.0;
      this.sizes[idx] *= 1.8;
    }

    this.onBurst?.(this.burstState.info);
  }

  private createBurstMesh() {
    if (this.burstMesh) {
      this.scene.remove(this.burstMesh);
      this.burstGeometry?.dispose();
    }

    if (!this.burstState) return;

    const count = this.burstState.particles.count;
    const positions = this.burstState.particles.positions;
    const burstColors = new Float32Array(count * 3);
    const burstAlphas = new Float32Array(count);
    const burstSizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const t = i / count;
      burstColors[i3] = 0.4 + t * 0.3;
      burstColors[i3 + 1] = 0.6 + t * 0.3;
      burstColors[i3 + 2] = 1.0;
      burstAlphas[i] = 1.0;
      burstSizes[i] = 2.0 + Math.random() * 2.0;
    }

    this.burstGeometry = new THREE.BufferGeometry();
    this.burstGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3),
    );
    this.burstGeometry.setAttribute(
      'aColor',
      new THREE.BufferAttribute(burstColors, 3),
    );
    this.burstGeometry.setAttribute(
      'aAlpha',
      new THREE.BufferAttribute(burstAlphas, 1),
    );
    this.burstGeometry.setAttribute(
      'aSize',
      new THREE.BufferAttribute(burstSizes, 1),
    );

    const burstMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uTime: { value: 0 },
        uFade: { value: 1.0 },
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aAlpha;
        uniform float uPixelRatio;
        uniform float uFade;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha * uFade;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (200.0 / -mvPosition.z) * uFade;
          gl_PointSize = max(gl_PointSize, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float core = exp(-dist * dist * 15.0);
          float glow = exp(-dist * dist * 5.0);
          float alpha = (core + glow * 0.5) * vAlpha;
          vec3 finalColor = vColor * (core * 2.0 + glow);
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
    });

    this.burstMesh = new THREE.Points(this.burstGeometry, burstMaterial);
    this.scene.add(this.burstMesh);
  }

  update(delta: number, elapsed: number) {
    this.updateParticles(delta, elapsed);
    this.updateClusters(elapsed);
    this.updateStreamlines(elapsed);
    this.updateBurst(delta);

    this.particleMaterial.uniforms.uTime.value = elapsed;
    this.particleMaterial.uniforms.uGlowIntensity.value = this.params.glowIntensity;

    const posAttr = this.particleGeometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    const alphaAttr = this.particleGeometry.getAttribute('aAlpha') as THREE.BufferAttribute;
    alphaAttr.needsUpdate = true;
    const sizeAttr = this.particleGeometry.getAttribute('aSize') as THREE.BufferAttribute;
    sizeAttr.needsUpdate = true;
    const colorAttr = this.particleGeometry.getAttribute('aColor') as THREE.BufferAttribute;
    colorAttr.needsUpdate = true;
  }

  private updateParticles(delta: number, elapsed: number) {
    const flowSpeed = this.tideSystem.getFlowSpeed();
    const clusterStrength = this.tideSystem.getClusterStrength();
    const damping = 0.97;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      const pos = new THREE.Vector3(
        this.positions[i3],
        this.positions[i3 + 1],
        this.positions[i3 + 2],
      );

      const flowDir = this.tideSystem.getFlowDirection(pos);
      this.velocities[i3] += flowDir.x * flowSpeed * delta * 2.0;
      this.velocities[i3 + 1] += flowDir.y * flowSpeed * delta * 0.5;
      this.velocities[i3 + 2] += flowDir.z * flowSpeed * delta * 2.0;

      let closestCluster: Cluster | null = null;
      let closestDist = Infinity;
      for (const cluster of this.clusters) {
        const d = pos.distanceTo(cluster.center);
        if (d < closestDist) {
          closestDist = d;
          closestCluster = cluster;
        }
      }

      if (closestCluster && closestDist < closestCluster.radius * 2.0) {
        const toCenter = new THREE.Vector3()
          .subVectors(closestCluster.center, pos)
          .normalize();
        const attractStrength = clusterStrength * 0.3 * (1.0 - closestDist / (closestCluster.radius * 2.0));
        this.velocities[i3] += toCenter.x * attractStrength * delta;
        this.velocities[i3 + 1] += toCenter.y * attractStrength * delta;
        this.velocities[i3 + 2] += toCenter.z * attractStrength * delta;
      }

      const noiseX = Math.sin(elapsed * 1.3 + this.clusterOffsets[i] * 6.0) * 0.02;
      const noiseY = Math.cos(elapsed * 0.9 + this.clusterOffsets[i] * 4.0) * 0.01;
      const noiseZ = Math.sin(elapsed * 1.1 + this.clusterOffsets[i] * 5.0) * 0.02;
      this.velocities[i3] += noiseX;
      this.velocities[i3 + 1] += noiseY;
      this.velocities[i3 + 2] += noiseZ;

      this.velocities[i3] *= damping;
      this.velocities[i3 + 1] *= damping;
      this.velocities[i3 + 2] *= damping;

      this.positions[i3] += this.velocities[i3] * delta;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * delta;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * delta;

      const boundary = 50;
      if (Math.abs(this.positions[i3]) > boundary) {
        this.positions[i3] *= 0.95;
        this.velocities[i3] *= -0.5;
      }
      if (this.positions[i3 + 1] < -5) {
        this.positions[i3 + 1] = -4;
        this.velocities[i3 + 1] = Math.abs(this.velocities[i3 + 1]) * 0.5;
      }
      if (this.positions[i3 + 1] > 30) {
        this.velocities[i3 + 1] -= delta * 2;
      }
      if (Math.abs(this.positions[i3 + 2]) > boundary) {
        this.positions[i3 + 2] *= 0.95;
        this.velocities[i3 + 2] *= -0.5;
      }

      const baseAlpha = 0.3 + Math.sin(elapsed * 2.0 + this.clusterOffsets[i] * 3.0) * 0.2;
      this.alphas[i] = THREE.MathUtils.lerp(this.alphas[i], baseAlpha + clusterStrength * 0.3, delta * 2.0);

      const pulseSize = 1.0 + Math.sin(elapsed * 1.5 + this.clusterOffsets[i]) * 0.2;
      const baseSize = 1.0 + Math.random() * 0.01;
      this.sizes[i] = THREE.MathUtils.lerp(this.sizes[i], baseSize * pulseSize * this.params.glowIntensity, delta * 3.0);

      const colorShift = Math.sin(elapsed * 0.5 + this.clusterOffsets[i] * 2.0) * 0.5 + 0.5;
      if (colorShift > 0.6) {
        this.colors[i3] = THREE.MathUtils.lerp(this.colors[i3], 0.1, delta * 0.5);
        this.colors[i3 + 1] = THREE.MathUtils.lerp(this.colors[i3 + 1], 0.9, delta * 0.5);
        this.colors[i3 + 2] = THREE.MathUtils.lerp(this.colors[i3 + 2], 0.7, delta * 0.5);
      } else {
        this.colors[i3] = THREE.MathUtils.lerp(this.colors[i3], 0.4, delta * 0.5);
        this.colors[i3 + 1] = THREE.MathUtils.lerp(this.colors[i3 + 1], 0.3, delta * 0.5);
        this.colors[i3 + 2] = THREE.MathUtils.lerp(this.colors[i3 + 2], 0.9, delta * 0.5);
      }
    }
  }

  private updateClusters(elapsed: number) {
    for (let c = 0; c < this.clusters.length; c++) {
      const cluster = this.clusters[c];
      const angle = (c / this.clusters.length) * Math.PI * 2 + elapsed * 0.1;
      const tideShift = Math.sin(this.tideSystem.getPhase()) * 5;
      const r = 15 + Math.sin(elapsed * 0.2 + c) * 5 + tideShift;

      cluster.center.x = THREE.MathUtils.lerp(
        cluster.center.x,
        Math.cos(angle) * r,
        0.005,
      );
      cluster.center.y = THREE.MathUtils.lerp(
        cluster.center.y,
        5 + Math.sin(elapsed * 0.3 + c * 2) * 5,
        0.005,
      );
      cluster.center.z = THREE.MathUtils.lerp(
        cluster.center.z,
        Math.sin(angle) * r,
        0.005,
      );
    }

    if (Math.floor(elapsed * 10) % 50 === 0) {
      this.assignParticlesToClusters();
    }
  }

  private updateStreamlines(elapsed: number) {
    const posAttr = this.streamlineGeometry.getAttribute('position') as THREE.BufferAttribute;
    const lineCount = posAttr.count / 2;

    for (let i = 0; i < lineCount; i++) {
      const idx = Math.min(
        Math.floor((i * this.particleCount) / lineCount),
        this.particleCount - 1,
      );
      const i3 = idx * 3;
      const li = i * 6;

      const px = this.positions[i3];
      const py = this.positions[i3 + 1];
      const pz = this.positions[i3 + 2];

      posAttr.setXYZ(i * 2, px, py, pz);

      const dir = this.tideSystem.getFlowDirection(new THREE.Vector3(px, py, pz));
      const speed = this.tideSystem.getFlowSpeed();
      const len = 2 + speed * 3;

      posAttr.setXYZ(
        i * 2 + 1,
        px + dir.x * len,
        py + dir.y * len,
        pz + dir.z * len,
      );
    }
    posAttr.needsUpdate = true;

    this.streamlineMaterial.uniforms.uGlowIntensity.value = this.params.glowIntensity;
  }

  private updateBurst(delta: number) {
    if (!this.burstState || !this.burstState.active) return;

    this.burstState.startTime += delta;
    const t = this.burstState.startTime / this.burstState.duration;

    if (t >= 1.0) {
      this.burstState.active = false;
      if (this.burstMesh) {
        this.scene.remove(this.burstMesh);
        this.burstGeometry?.dispose();
        this.burstMesh = null;
        this.burstGeometry = null;
      }
      return;
    }

    const positions = this.burstState.particles.positions;
    const velocities = this.burstState.particles.velocities;
    const count = this.burstState.particles.count;

    const fadeOut = 1.0 - t * t;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const gravity = -2.0 * delta;
      velocities[i3 + 1] += gravity;
      velocities[i3] *= 0.99;
      velocities[i3 + 1] *= 0.99;
      velocities[i3 + 2] *= 0.99;

      positions[i3] += velocities[i3] * delta;
      positions[i3 + 1] += velocities[i3 + 1] * delta;
      positions[i3 + 2] += velocities[i3 + 2] * delta;
    }

    if (this.burstGeometry) {
      const posAttr = this.burstGeometry.getAttribute('position') as THREE.BufferAttribute;
      posAttr.needsUpdate = true;
    }

    if (this.burstMesh) {
      const mat = this.burstMesh.material as THREE.ShaderMaterial;
      mat.uniforms.uFade.value = fadeOut;
    }
  }

  updateParams(params: SceneParams) {
    this.params.glowIntensity = params.glowIntensity;
    this.params.tideSpeed = params.tideSpeed;
    this.params.particleDensity = params.particleDensity;
  }

  dispose() {
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
    this.streamlineGeometry.dispose();
    this.streamlineMaterial.dispose();
    if (this.burstGeometry) this.burstGeometry.dispose();
    this.scene.remove(this.particleSystem);
    this.scene.remove(this.streamlineMesh);
    if (this.burstMesh) this.scene.remove(this.burstMesh);
  }
}
