import * as THREE from 'three';
import { COLOR_THEMES, ColorTheme, lerpColor, smoothstep } from './utils';

const CORRIDOR_LENGTH = 60;
const CORRIDOR_RADIUS = 12;
const FILAMENT_MAX_DIST = 2.5;
const MAX_FILAMENTS = 8000;
const VORTEX_STRENGTH = 8;
const VORTEX_RADIUS = 6;
const VORTEX_DURATION = 2.0;

interface ParticleData {
  positions: Float32Array;
  velocities: Float32Array;
  colors: Float32Array;
  basePositions: Float32Array;
  sizes: Float32Array;
  vortexOffsets: Float32Array;
  vortexTimers: Float32Array;
  count: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particleData: ParticleData;
  private points: THREE.Points;
  private filamentGeometry: THREE.BufferGeometry;
  private filamentLines: THREE.LineSegments;
  private filamentPositions: Float32Array;
  private filamentColors: Float32Array;
  private currentTheme: ColorTheme;
  private rotationSpeed: number = 0.5;
  private time: number = 0;
  private corridorGroup: THREE.Group;

  constructor(scene: THREE.Scene, count: number = 2500) {
    this.scene = scene;
    this.currentTheme = COLOR_THEMES.nebula;
    this.corridorGroup = new THREE.Group();
    this.scene.add(this.corridorGroup);

    this.particleData = this.generateParticles(count);
    this.initFilaments();

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.particleData.positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(this.particleData.colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(this.particleData.sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        varying vec3 vColor;
        uniform float uPixelRatio;
        void main() {
          vColor = aColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (200.0 / -mvPosition.z);
          gl_PointSize = max(gl_PointSize, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float glow = 1.0 - smoothstep(0.0, 0.5, d);
          glow = pow(glow, 1.5);
          gl_FragColor = vec4(vColor * glow * 1.5, glow * 0.9);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geometry, material);
    this.corridorGroup.add(this.points);

    const filamentMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        attribute vec4 aFilamentColor;
        varying vec4 vFilamentColor;
        void main() {
          vFilamentColor = aFilamentColor;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec4 vFilamentColor;
        void main() {
          gl_FragColor = vFilamentColor;
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.filamentGeometry = new THREE.BufferGeometry();
    this.filamentGeometry.setAttribute('position', new THREE.BufferAttribute(this.filamentPositions, 3));
    this.filamentGeometry.setAttribute('aFilamentColor', new THREE.BufferAttribute(this.filamentColors, 4));
    this.filamentLines = new THREE.LineSegments(this.filamentGeometry, filamentMaterial);
    this.corridorGroup.add(this.filamentLines);
  }

  private generateParticles(count: number): ParticleData {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const basePositions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const vortexOffsets = new Float32Array(count * 3);
    const vortexTimers = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.pow(Math.random(), 0.6) * CORRIDOR_RADIUS;
      const z = (Math.random() - 0.5) * CORRIDOR_LENGTH;

      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      basePositions[i * 3] = x;
      basePositions[i * 3 + 1] = y;
      basePositions[i * 3 + 2] = z;

      velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 2] = 0.3 + Math.random() * 0.5;

      const t = Math.random();
      const color = lerpColor(this.currentTheme.particles[0], this.currentTheme.particles[1], t);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 1.5 + Math.random() * 2.5;

      vortexOffsets[i * 3] = 0;
      vortexOffsets[i * 3 + 1] = 0;
      vortexOffsets[i * 3 + 2] = 0;
      vortexTimers[i] = 0;
    }

    return { positions, velocities, colors, basePositions, sizes, vortexOffsets, vortexTimers, count };
  }

  private initFilaments() {
    this.filamentPositions = new Float32Array(MAX_FILAMENTS * 6);
    this.filamentColors = new Float32Array(MAX_FILAMENTS * 8);
  }

  setParticleCount(count: number) {
    this.corridorGroup.remove(this.points);
    this.points.geometry.dispose();
    (this.points.material as THREE.ShaderMaterial).dispose();

    this.particleData = this.generateParticles(count);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.particleData.positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(this.particleData.colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(this.particleData.sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        varying vec3 vColor;
        uniform float uPixelRatio;
        void main() {
          vColor = aColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (200.0 / -mvPosition.z);
          gl_PointSize = max(gl_PointSize, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float glow = 1.0 - smoothstep(0.0, 0.5, d);
          glow = pow(glow, 1.5);
          gl_FragColor = vec4(vColor * glow * 1.5, glow * 0.9);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geometry, material);
    this.corridorGroup.add(this.points);
  }

  setRotationSpeed(speed: number) {
    this.rotationSpeed = speed;
  }

  setTheme(themeName: string) {
    const theme = COLOR_THEMES[themeName];
    if (!theme) return;
    this.currentTheme = theme;

    const { count, colors } = this.particleData;
    for (let i = 0; i < count; i++) {
      const t = Math.random();
      const color = lerpColor(theme.particles[0], theme.particles[1], t);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    this.points.geometry.attributes.aColor.needsUpdate = true;
  }

  triggerVortex(worldPos: THREE.Vector3) {
    const { count, positions, vortexOffsets, vortexTimers } = this.particleData;
    for (let i = 0; i < count; i++) {
      const dx = positions[i * 3] - worldPos.x;
      const dy = positions[i * 3 + 1] - worldPos.y;
      const dz = positions[i * 3 + 2] - worldPos.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < VORTEX_RADIUS) {
        const factor = 1.0 - dist / VORTEX_RADIUS;
        vortexTimers[i] = VORTEX_DURATION * factor;
        const angle = Math.atan2(dy, dx);
        vortexOffsets[i * 3] = Math.cos(angle + Math.PI * 0.5) * VORTEX_STRENGTH * factor;
        vortexOffsets[i * 3 + 1] = Math.sin(angle + Math.PI * 0.5) * VORTEX_STRENGTH * factor;
        vortexOffsets[i * 3 + 2] = dz * factor * 2.0;
      }
    }
  }

  update(dt: number, cameraForward: THREE.Vector3) {
    this.time += dt;
    const { count, positions, velocities, basePositions, sizes, vortexOffsets, vortexTimers } = this.particleData;

    const flowDir = new THREE.Vector3(cameraForward.x, 0, cameraForward.z).normalize();
    const flowStrength = this.rotationSpeed * 0.5;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      if (vortexTimers[i] > 0) {
        vortexTimers[i] -= dt;
        const vortexFactor = smoothstep(0, VORTEX_DURATION, vortexTimers[i]);
        const spiralPhase = this.time * 4.0;
        const ox = vortexOffsets[i3] * vortexFactor * Math.cos(spiralPhase + i * 0.1);
        const oy = vortexOffsets[i3 + 1] * vortexFactor * Math.sin(spiralPhase + i * 0.1);
        const oz = vortexOffsets[i3 + 2] * vortexFactor;

        positions[i3] = basePositions[i3] + ox;
        positions[i3 + 1] = basePositions[i3 + 1] + oy;
        positions[i3 + 2] = basePositions[i3 + 2] + oz;
      } else {
        const wobbleX = Math.sin(this.time * 0.3 + i * 0.7) * 0.15;
        const wobbleY = Math.cos(this.time * 0.4 + i * 0.5) * 0.15;

        positions[i3] = basePositions[i3] + wobbleX + flowDir.x * flowStrength * Math.sin(this.time + i);
        positions[i3 + 1] = basePositions[i3 + 1] + wobbleY + flowDir.y * flowStrength * Math.cos(this.time * 0.8 + i);
        positions[i3 + 2] = basePositions[i3 + 2] + velocities[i3 + 2] * this.time * 0.5;

        if (positions[i3 + 2] > CORRIDOR_LENGTH * 0.5) {
          positions[i3 + 2] -= CORRIDOR_LENGTH;
          basePositions[i3 + 2] = positions[i3 + 2];
        } else if (positions[i3 + 2] < -CORRIDOR_LENGTH * 0.5) {
          positions[i3 + 2] += CORRIDOR_LENGTH;
          basePositions[i3 + 2] = positions[i3 + 2];
        }

        basePositions[i3] += Math.sin(this.time * 0.1 + i * 0.3) * 0.002;
        basePositions[i3 + 1] += Math.cos(this.time * 0.15 + i * 0.4) * 0.002;
      }

      sizes[i] = 1.5 + Math.sin(this.time * 2.0 + i * 0.5) * 0.5;
    }

    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.aSize.needsUpdate = true;

    this.updateFilaments();
  }

  private updateFilaments() {
    const { count, positions, colors } = this.particleData;
    let filamentCount = 0;
    const maxCheck = Math.min(count, 1500);
    const step = Math.max(1, Math.floor(count / maxCheck));

    for (let i = 0; i < count && filamentCount < MAX_FILAMENTS; i += step) {
      const ix = positions[i * 3];
      const iy = positions[i * 3 + 1];
      const iz = positions[i * 3 + 2];

      for (let j = i + step; j < count && filamentCount < MAX_FILAMENTS; j += step) {
        const jx = positions[j * 3];
        const jy = positions[j * 3 + 1];
        const jz = positions[j * 3 + 2];

        const dx = ix - jx;
        const dy = iy - jy;
        const dz = iz - jz;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < FILAMENT_MAX_DIST * FILAMENT_MAX_DIST) {
          const dist = Math.sqrt(distSq);
          const alpha = (1.0 - dist / FILAMENT_MAX_DIST) * 0.35;

          const fi = filamentCount * 6;
          this.filamentPositions[fi] = ix;
          this.filamentPositions[fi + 1] = iy;
          this.filamentPositions[fi + 2] = iz;
          this.filamentPositions[fi + 3] = jx;
          this.filamentPositions[fi + 4] = jy;
          this.filamentPositions[fi + 5] = jz;

          const ci = filamentCount * 8;
          const r1 = colors[i * 3], g1 = colors[i * 3 + 1], b1 = colors[i * 3 + 2];
          const r2 = colors[j * 3], g2 = colors[j * 3 + 1], b2 = colors[j * 3 + 2];

          this.filamentColors[ci] = r1;
          this.filamentColors[ci + 1] = g1;
          this.filamentColors[ci + 2] = b1;
          this.filamentColors[ci + 3] = alpha;
          this.filamentColors[ci + 4] = r2;
          this.filamentColors[ci + 5] = g2;
          this.filamentColors[ci + 6] = b2;
          this.filamentColors[ci + 7] = alpha;

          filamentCount++;
        }
      }
    }

    for (let i = filamentCount; i < MAX_FILAMENTS; i++) {
      const fi = i * 6;
      this.filamentPositions[fi] = 0;
      this.filamentPositions[fi + 1] = 0;
      this.filamentPositions[fi + 2] = 0;
      this.filamentPositions[fi + 3] = 0;
      this.filamentPositions[fi + 4] = 0;
      this.filamentPositions[fi + 5] = 0;

      const ci = i * 8;
      this.filamentColors[ci] = 0;
      this.filamentColors[ci + 1] = 0;
      this.filamentColors[ci + 2] = 0;
      this.filamentColors[ci + 3] = 0;
      this.filamentColors[ci + 4] = 0;
      this.filamentColors[ci + 5] = 0;
      this.filamentColors[ci + 6] = 0;
      this.filamentColors[ci + 7] = 0;
    }

    this.filamentGeometry.attributes.position.needsUpdate = true;
    this.filamentGeometry.attributes.aFilamentColor.needsUpdate = true;
  }

  getGroup(): THREE.Group {
    return this.corridorGroup;
  }

  getTheme(): ColorTheme {
    return this.currentTheme;
  }

  dispose() {
    this.points.geometry.dispose();
    (this.points.material as THREE.ShaderMaterial).dispose();
    this.filamentGeometry.dispose();
    (this.filamentLines.material as THREE.ShaderMaterial).dispose();
    this.scene.remove(this.corridorGroup);
  }
}
