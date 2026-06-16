import * as THREE from 'three';
import type { FreqData, Mode, CubeState } from './types';

const GRID_SIZE = 10;
const CUBE_COUNT = GRID_SIZE * GRID_SIZE;
const SPACING = 0.8;
const MIN_SIZE = 0.2;
const MAX_SIZE = 0.6;
const INITIAL_EMISSIVE = 0.3;
const MAX_BOUNCE = 0.5;
const MAX_ROT_SPEED = 3;
const MIN_EMISSIVE = 0.2;
const MAX_EMISSIVE = 1.0;
const COLD_COLOR = new THREE.Color('#4169E1');
const WARM_COLOR = new THREE.Color('#FF4500');
const MODE_TRANSITION_DURATION = 500;

const EDGE_LINE_WIDTH = 0.02;

const GLOW_BASE_SCALE = 1.15;
const GLOW_MAX_SCALE = 1.5;
const GLOW_BASE_OPACITY = 0.12;
const GLOW_MAX_OPACITY = 0.35;

export class CubeArray {
  public group: THREE.Group;
  public particleGroup: THREE.Group;
  private cubes: THREE.Mesh[] = [];
  private glows: THREE.Mesh[] = [];
  private edges: THREE.LineSegments[] = [];
  private particles: THREE.Points[] = [];
  private cubeStates: CubeState[] = [];
  private cubeSizes: number[] = [];
  private mode: Mode = 'geometric';
  private modeTransitionStart: number = 0;
  private isTransitioning: boolean = false;
  private materialCache: Map<string, THREE.MeshStandardMaterial> = new Map();

  constructor() {
    this.group = new THREE.Group();
    this.particleGroup = new THREE.Group();
    this.particleGroup.visible = false;
    this.createCubes();
    this.createParticles();
  }

  private getRegion(row: number, col: number): 'outer' | 'middle' | 'center' {
    const center = (GRID_SIZE - 1) / 2;
    const dist = Math.max(Math.abs(row - center), Math.abs(col - center));
    if (dist <= 1) return 'center';
    if (dist <= 3) return 'middle';
    return 'outer';
  }

  private createCubes(): void {
    const offset = (GRID_SIZE - 1) * SPACING / 2;

    const glowGeometry = new THREE.SphereGeometry(1, 24, 16);

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const size = MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE);
        this.cubeSizes.push(size);

        const geometry = new THREE.BoxGeometry(size, size, size);
        const material = new THREE.MeshStandardMaterial({
          color: '#8888ff',
          emissive: '#8888ff',
          emissiveIntensity: INITIAL_EMISSIVE,
          metalness: 0.3,
          roughness: 0.4,
        });

        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(
          col * SPACING - offset,
          0,
          row * SPACING - offset
        );
        this.cubes.push(cube);
        this.group.add(cube);

        const glowMaterial = new THREE.MeshBasicMaterial({
          color: 0x8888ff,
          transparent: true,
          opacity: GLOW_BASE_OPACITY,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.BackSide,
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.scale.setScalar(size * GLOW_BASE_SCALE);
        glow.position.copy(cube.position);
        this.glows.push(glow);
        this.group.add(glow);

        const edgesGeometry = new THREE.EdgesGeometry(geometry);
        const edgesMaterial = new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.25,
          linewidth: 1,
        });
        const edge = new THREE.LineSegments(edgesGeometry, edgesMaterial);
        const edgeScale = 1 + EDGE_LINE_WIDTH / size;
        edge.scale.setScalar(edgeScale);
        edge.position.copy(cube.position);
        this.edges.push(edge);
        this.group.add(edge);

        const region = this.getRegion(row, col);
        this.cubeStates.push({
          basePositionY: cube.position.y,
          targetPositionY: cube.position.y,
          currentRotationSpeed: 0,
          targetRotationSpeed: 0,
          baseEmissiveIntensity: INITIAL_EMISSIVE,
          targetEmissiveIntensity: INITIAL_EMISSIVE,
          baseColor: '#8888ff',
          targetColor: '#8888ff',
          bouncePhase: Math.random() * Math.PI * 2,
          region,
        });
      }
    }

    this.group.position.y = 1.5;
  }

  private createParticles(): void {
    const offsets: THREE.Vector3[] = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const offset = (GRID_SIZE - 1) * SPACING / 2;
        offsets.push(new THREE.Vector3(
          col * SPACING - offset,
          0,
          row * SPACING - offset
        ));
      }
    }

    offsets.forEach((basePos) => {
      const particleCount = 80;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);

      const baseColor = new THREE.Color('#8888ff');

      for (let i = 0; i < particleCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = 0.1 + Math.random() * 0.3;

        positions[i * 3] = basePos.x + radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = basePos.y + radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = basePos.z + radius * Math.cos(phi);

        colors[i * 3] = baseColor.r;
        colors[i * 3 + 1] = baseColor.g;
        colors[i * 3 + 2] = baseColor.b;

        sizes[i] = 0.02 + Math.random() * 0.04;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const material = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      });

      const points = new THREE.Points(geometry, material);
      points.position.y = 1.5;
      this.particles.push(points);
      this.particleGroup.add(points);
    });
  }

  private easeOutBounce(t: number): number {
    const n1 = 7.5625;
    const d1 = 2.75;

    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  }

  private lerpColor(from: string, to: string, t: number): string {
    const c1 = new THREE.Color(from);
    const c2 = new THREE.Color(to);
    const result = c1.clone().lerp(c2, t);
    return `#${result.getHexString()}`;
  }

  update(freqData: FreqData, deltaTime: number, currentTime: number): void {
    const { low, mid, high, amplitude } = freqData;
    const time = currentTime * 0.001;

    let transitionProgress = 1;
    if (this.isTransitioning) {
      transitionProgress = Math.min(1, (currentTime - this.modeTransitionStart) / MODE_TRANSITION_DURATION);
      if (transitionProgress >= 1) {
        this.isTransitioning = false;
        if (this.mode === 'particle') {
          this.group.visible = false;
        } else {
          this.particleGroup.visible = false;
        }
      }
    }

    const geoOpacity = this.mode === 'geometric' 
      ? (this.isTransitioning ? 1 - transitionProgress * 0.7 : 1)
      : (this.isTransitioning ? transitionProgress * 0.3 : 0);
    
    const particleOpacity = this.mode === 'particle'
      ? (this.isTransitioning ? 0.3 + transitionProgress * 0.7 : 1)
      : (this.isTransitioning ? 1 - transitionProgress * 0.7 : 0);

    if (this.isTransitioning) {
      this.group.visible = geoOpacity > 0.05;
      this.particleGroup.visible = particleOpacity > 0.05;
    }

    for (let i = 0; i < CUBE_COUNT; i++) {
      const cube = this.cubes[i];
      const glow = this.glows[i];
      const edge = this.edges[i];
      const state = this.cubeStates[i];
      const cubeSize = this.cubeSizes[i];
      const particle = this.particles[i];

      switch (state.region) {
        case 'outer': {
          const bounceAmount = this.easeOutBounce(Math.min(1, low * 1.2));
          state.targetPositionY = state.basePositionY + bounceAmount * MAX_BOUNCE;
          state.targetColor = this.lerpColor('#8888ff', '#aaccff', low);
          state.targetEmissiveIntensity = INITIAL_EMISSIVE + low * 0.4;
          break;
        }
        case 'middle': {
          state.targetColor = this.lerpColor(
            COLD_COLOR.getStyle(),
            WARM_COLOR.getStyle(),
            mid
          );
          state.targetEmissiveIntensity = INITIAL_EMISSIVE + mid * 0.5;
          state.targetPositionY = state.basePositionY + Math.sin(time * 2 + state.bouncePhase) * mid * 0.15;
          break;
        }
        case 'center': {
          state.targetRotationSpeed = high * MAX_ROT_SPEED;
          state.targetEmissiveIntensity = MIN_EMISSIVE + high * (MAX_EMISSIVE - MIN_EMISSIVE);
          state.targetColor = this.lerpColor(
            WARM_COLOR.getStyle(),
            '#FFFF00',
            high
          );
          state.targetPositionY = state.basePositionY + high * 0.2;
          break;
        }
      }

      state.currentRotationSpeed += (state.targetRotationSpeed - state.currentRotationSpeed) * 0.15;
      state.baseEmissiveIntensity += (state.targetEmissiveIntensity - state.baseEmissiveIntensity) * 0.1;
      state.baseColor = this.lerpColor(state.baseColor, state.targetColor, 0.1);

      const smoothedLow = low * 0.3 + amplitude * 0.7;
      const bounceOffset = this.easeOutBounce(Math.min(1, smoothedLow)) * MAX_BOUNCE * 0.3;
      cube.position.y += ((state.targetPositionY + bounceOffset) - cube.position.y) * 0.2;

      cube.rotation.x += state.currentRotationSpeed * deltaTime * 0.001;
      cube.rotation.y += state.currentRotationSpeed * deltaTime * 0.0015;

      const material = cube.material as THREE.MeshStandardMaterial;
      const targetColorObj = new THREE.Color(state.baseColor);
      material.color.lerp(targetColorObj, 0.15);
      material.emissive.copy(targetColorObj);
      material.emissiveIntensity += (state.baseEmissiveIntensity - material.emissiveIntensity) * 0.15;

      glow.position.copy(cube.position);
      glow.rotation.copy(cube.rotation);
      const glowScale = cubeSize * (GLOW_BASE_SCALE + this.easeOutBounce(Math.min(1, low * 1.5)) * (GLOW_MAX_SCALE - GLOW_BASE_SCALE));
      glow.scale.x += (glowScale - glow.scale.x) * 0.2;
      glow.scale.y += (glowScale - glow.scale.y) * 0.2;
      glow.scale.z += (glowScale - glow.scale.z) * 0.2;
      const glowMat = glow.material as THREE.MeshBasicMaterial;
      glowMat.color.lerp(targetColorObj, 0.15);
      const targetGlowOpacity = GLOW_BASE_OPACITY + this.easeOutBounce(Math.min(1, low * 1.3)) * (GLOW_MAX_OPACITY - GLOW_BASE_OPACITY);
      glowMat.opacity += (targetGlowOpacity - glowMat.opacity) * 0.18;

      edge.position.copy(cube.position);
      edge.rotation.copy(cube.rotation);
      const edgeMat = edge.material as THREE.LineBasicMaterial;
      const baseEdgeOpacity = 0.25;
      const boostEdgeOpacity = low * 0.2 + state.baseEmissiveIntensity * 0.08;
      const targetEdgeOpacity = baseEdgeOpacity + boostEdgeOpacity;
      edgeMat.opacity += (targetEdgeOpacity - edgeMat.opacity) * 0.12;
      edgeMat.color.lerp(targetColorObj, 0.05);

      if (this.isTransitioning || this.mode === 'particle') {
        const particleMaterial = particle.material as THREE.PointsMaterial;
        const particleColor = new THREE.Color(state.baseColor);
        particleMaterial.opacity = particleOpacity;
        
        const positions = particle.geometry.attributes.position.array as Float32Array;
        const colors = particle.geometry.attributes.color.array as Float32Array;
        const particleCount = positions.length / 3;
        
        particle.position.y = cube.position.y;
        particle.rotation.y += high * deltaTime * 0.0005;
        
        for (let j = 0; j < particleCount; j++) {
          colors[j * 3] = particleColor.r;
          colors[j * 3 + 1] = particleColor.g;
          colors[j * 3 + 2] = particleColor.b;
          
          positions[j * 3 + 1] += Math.sin(time * 3 + j * 0.5) * 0.001 * (1 + high * 2);
        }
        particle.geometry.attributes.position.needsUpdate = true;
        particle.geometry.attributes.color.needsUpdate = true;
      }
    }

    this.group.rotation.y += deltaTime * 0.00005 * (1 + amplitude * 2);
    this.particleGroup.rotation.copy(this.group.rotation);
    this.particleGroup.position.copy(this.group.position);
  }

  setMode(mode: Mode, currentTime: number): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.modeTransitionStart = currentTime;
    this.isTransitioning = true;
    
    if (mode === 'particle') {
      this.particleGroup.visible = true;
    } else {
      this.group.visible = true;
    }
  }

  getMode(): Mode {
    return this.mode;
  }

  dispose(): void {
    this.cubes.forEach(cube => {
      cube.geometry.dispose();
      (cube.material as THREE.Material).dispose();
    });
    this.glows.forEach(glow => {
      glow.geometry.dispose();
      (glow.material as THREE.Material).dispose();
    });
    this.edges.forEach(edge => {
      edge.geometry.dispose();
      (edge.material as THREE.Material).dispose();
    });
    this.particles.forEach(particle => {
      particle.geometry.dispose();
      (particle.material as THREE.Material).dispose();
    });
    this.materialCache.forEach(material => material.dispose());
    this.materialCache.clear();
  }
}
