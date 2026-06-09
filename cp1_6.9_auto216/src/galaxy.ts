import * as THREE from 'three';

export type ColorTheme = 'nebula' | 'lava' | 'ice' | 'aurora';

export interface GalaxyConfig {
  particleCount: number;
  spiralArms: number;
  rotationSpeed: number;
  theme: ColorTheme;
}

interface ShockWave {
  position: THREE.Vector3;
  startTime: number;
  duration: number;
  maxRadius: number;
  color: THREE.Color;
}

interface ThemeColors {
  center: THREE.Color;
  mid: THREE.Color;
  edge: THREE.Color;
  coreStart: THREE.Color;
  coreEnd: THREE.Color;
  shockStart: THREE.Color;
  shockEnd: THREE.Color;
}

const THEME_PRESETS: Record<ColorTheme, ThemeColors> = {
  nebula: {
    center: new THREE.Color(0xfff4e0),
    mid: new THREE.Color(0xb070ff),
    edge: new THREE.Color(0x3040ff),
    coreStart: new THREE.Color(0xffdd88),
    coreEnd: new THREE.Color(0xff6633),
    shockStart: new THREE.Color(0xff88ff),
    shockEnd: new THREE.Color(0x4488ff)
  },
  lava: {
    center: new THREE.Color(0xffffee),
    mid: new THREE.Color(0xff6633),
    edge: new THREE.Color(0x991100),
    coreStart: new THREE.Color(0xffcc44),
    coreEnd: new THREE.Color(0xff2200),
    shockStart: new THREE.Color(0xffaa00),
    shockEnd: new THREE.Color(0xff2200)
  },
  ice: {
    center: new THREE.Color(0xffffff),
    mid: new THREE.Color(0xaaddff),
    edge: new THREE.Color(0x4466aa),
    coreStart: new THREE.Color(0xddeeff),
    coreEnd: new THREE.Color(0x6699cc),
    shockStart: new THREE.Color(0x88ffff),
    shockEnd: new THREE.Color(0x4466ff)
  },
  aurora: {
    center: new THREE.Color(0xfffef0),
    mid: new THREE.Color(0x33ffaa),
    edge: new THREE.Color(0xaa33ff),
    coreStart: new THREE.Color(0x88ffdd),
    coreEnd: new THREE.Color(0xff66cc),
    shockStart: new THREE.Color(0x44ff88),
    shockEnd: new THREE.Color(0xff44aa)
  }
};

export class Galaxy {
  private scene: THREE.Scene;
  private group: THREE.Group;
  private particles: THREE.Points | null = null;
  private particleGeometry: THREE.BufferGeometry | null = null;
  private particleMaterial: THREE.ShaderMaterial | null = null;

  private core: THREE.Mesh | null = null;
  private coreGlow: THREE.Mesh | null = null;
  private coreParticles: THREE.Points | null = null;
  private coreMaterial: THREE.ShaderMaterial | null = null;
  private coreGlowMaterial: THREE.ShaderMaterial | null = null;

  private shockWaves: ShockWave[] = [];
  private shockWaveMesh: THREE.Mesh | null = null;
  private shockWaveGeometry: THREE.RingGeometry | null = null;
  private shockWaveMaterial: THREE.ShaderMaterial | null = null;

  private config: GalaxyConfig = {
    particleCount: 3000,
    spiralArms: 2,
    rotationSpeed: 1.0,
    theme: 'nebula'
  };

  private themeColors: ThemeColors;
  private targetThemeColors: ThemeColors;
  private themeTransitionProgress: number = 1;

  private pixelRatio: number = 1;

  private basePositions: Float32Array | null = null;
  private baseAngles: Float32Array | null = null;
  private baseRadii: Float32Array | null = null;
  private baseHeights: Float32Array | null = null;
  private baseSizes: Float32Array | null = null;
  private baseColorFactors: Float32Array | null = null;

  private shockInfluence: Float32Array | null = null;
  private shockVelocities: Float32Array | null = null;

  private readonly GALAXY_RADIUS = 10;
  private readonly ROTATION_PERIOD = 30;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.themeColors = { ...THEME_PRESETS.nebula };
    this.targetThemeColors = { ...THEME_PRESETS.nebula };
    this.cloneThemeColors(this.themeColors, THEME_PRESETS.nebula);
    this.cloneThemeColors(this.targetThemeColors, THEME_PRESETS.nebula);

    this.createGalaxy();
    this.createCore();
    this.createShockWaveSystem();
  }

  private cloneThemeColors(target: ThemeColors, source: ThemeColors): void {
    target.center = source.center.clone();
    target.mid = source.mid.clone();
    target.edge = source.edge.clone();
    target.coreStart = source.coreStart.clone();
    target.coreEnd = source.coreEnd.clone();
    target.shockStart = source.shockStart.clone();
    target.shockEnd = source.shockEnd.clone();
  }

  private lerpThemeColors(t: number): void {
    const target = this.targetThemeColors;
    const src = THEME_PRESETS[this.config.theme];
    target.center.lerpColors(this.themeColors.center, src.center, t);
    target.mid.lerpColors(this.themeColors.mid, src.mid, t);
    target.edge.lerpColors(this.themeColors.edge, src.edge, t);
    target.coreStart.lerpColors(this.themeColors.coreStart, src.coreStart, t);
    target.coreEnd.lerpColors(this.themeColors.coreEnd, src.coreEnd, t);
    target.shockStart.lerpColors(this.themeColors.shockStart, src.shockStart, t);
    target.shockEnd.lerpColors(this.themeColors.shockEnd, src.shockEnd, t);
  }

  private createGalaxy(): void {
    this.disposeParticles();

    const count = this.config.particleCount;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    this.basePositions = new Float32Array(count * 3);
    this.baseAngles = new Float32Array(count);
    this.baseRadii = new Float32Array(count);
    this.baseHeights = new Float32Array(count);
    this.baseSizes = new Float32Array(count);
    this.baseColorFactors = new Float32Array(count);
    this.shockInfluence = new Float32Array(count);
    this.shockVelocities = new Float32Array(count * 3);

    const arms = this.config.spiralArms;
    const armAngle = (Math.PI * 2) / arms;
    const twists = 2.5;

    for (let i = 0; i < count; i++) {
      const armIndex = i % arms;
      const armProgress = Math.floor(i / arms) / Math.ceil(count / arms);
      const radiusFactor = Math.pow(armProgress, 0.6);
      const radius = radiusFactor * this.GALAXY_RADIUS;
      const randomRadius = radius * (0.85 + Math.random() * 0.3);

      const baseAngle = armIndex * armAngle;
      const twist = radiusFactor * twists * Math.PI * 2;
      const randomAngle = (Math.random() - 0.5) * 0.4 * (1 - radiusFactor * 0.5);
      const angle = baseAngle + twist + randomAngle;

      const heightDecay = Math.exp(-radiusFactor * 2.5);
      const height = (Math.random() - 0.5) * 0.8 * heightDecay;

      const x = Math.cos(angle) * randomRadius;
      const z = Math.sin(angle) * randomRadius;
      const y = height;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      this.basePositions[i * 3] = x;
      this.basePositions[i * 3 + 1] = y;
      this.basePositions[i * 3 + 2] = z;
      this.baseAngles[i] = angle;
      this.baseRadii[i] = randomRadius;
      this.baseHeights[i] = y;

      const size = (0.04 + Math.random() * 0.06) * (1 - radiusFactor * 0.4);
      sizes[i] = size;
      this.baseSizes[i] = size;

      this.baseColorFactors[i] = radiusFactor;

      const color = this.getParticleColor(radiusFactor);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      phases[i] = Math.random() * Math.PI * 2;
    }

    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.particleGeometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

    this.particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: this.pixelRatio },
        uShockPositions: { value: new Array(10).fill(new THREE.Vector3()) },
        uShockRadii: { value: new Array(10).fill(0) },
        uShockIntensities: { value: new Array(10).fill(0) }
      },
      vertexShader: `
        attribute float size;
        attribute float phase;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vPulse;
        uniform float uTime;
        uniform float uPixelRatio;

        void main() {
          vColor = color;
          vPulse = 0.75 + 0.25 * sin(uTime * 1.8 + phase);

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * 220.0 * uPixelRatio / -mvPosition.z;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vPulse;

        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;

          float alpha = smoothstep(0.5, 0.0, dist);
          alpha = pow(alpha, 1.8) * vPulse;

          float glow = smoothstep(0.5, 0.15, dist) * 0.5;
          vec3 finalColor = vColor * (0.8 + glow);

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.group.add(this.particles);
  }

  private getParticleColor(radiusFactor: number): THREE.Color {
    const theme = this.targetThemeColors;
    const color = new THREE.Color();

    if (radiusFactor < 0.5) {
      const t = radiusFactor / 0.5;
      color.lerpColors(theme.center, theme.mid, t);
    } else {
      const t = (radiusFactor - 0.5) / 0.5;
      color.lerpColors(theme.mid, theme.edge, t);
    }

    const jitter = 0.9 + Math.random() * 0.2;
    color.r = Math.min(1, color.r * jitter);
    color.g = Math.min(1, color.g * jitter);
    color.b = Math.min(1, color.b * jitter);

    return color;
  }

  private updateParticleColors(): void {
    if (!this.particleGeometry || !this.baseColorFactors) return;

    const colors = this.particleGeometry.attributes.color.array as Float32Array;
    const count = this.config.particleCount;

    for (let i = 0; i < count; i++) {
      const color = this.getParticleColor(this.baseColorFactors[i]);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    this.particleGeometry.attributes.color.needsUpdate = true;
  }

  private createCore(): void {
    this.disposeCore();

    const coreGeometry = new THREE.SphereGeometry(0.8, 64, 64);
    this.coreMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorStart: { value: this.targetThemeColors.coreStart.clone() },
        uColorEnd: { value: this.targetThemeColors.coreEnd.clone() }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColorStart;
        uniform vec3 uColorEnd;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;

        float noise(vec3 p) {
          return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        }

        float fbm(vec3 p) {
          float value = 0.0;
          float amplitude = 0.5;
          float frequency = 1.0;
          for (int i = 0; i < 5; i++) {
            value += amplitude * noise(p * frequency);
            amplitude *= 0.5;
            frequency *= 2.0;
          }
          return value;
        }

        void main() {
          vec3 pos = vPosition * 2.5;
          float t = uTime * 0.3;

          float flow1 = fbm(pos + vec3(t * 0.7, t * 0.5, t * 0.3));
          float flow2 = fbm(pos * 1.7 + vec3(-t * 0.4, t * 0.8, -t * 0.6));
          float pattern = mix(flow1, flow2, 0.5);

          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.5);

          float pulse = 0.85 + 0.15 * sin(uTime * 2.0);

          vec3 baseColor = mix(uColorStart, uColorEnd, pattern * 0.8 + fresnel * 0.5);
          baseColor *= (0.7 + pattern * 0.6) * pulse;

          float brightness = 0.9 + fresnel * 0.8;
          baseColor *= brightness;

          gl_FragColor = vec4(baseColor, 1.0);
        }
      `,
      transparent: false
    });

    this.core = new THREE.Mesh(coreGeometry, this.coreMaterial);
    this.group.add(this.core);

    const glowGeometry = new THREE.SphereGeometry(1.3, 32, 32);
    this.coreGlowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorStart: { value: this.targetThemeColors.coreStart.clone() },
        uColorEnd: { value: this.targetThemeColors.coreEnd.clone() }
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColorStart;
        uniform vec3 uColorEnd;
        varying vec3 vNormal;

        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
          float pulse = 0.8 + 0.2 * sin(uTime * 1.5);
          vec3 color = mix(uColorStart, uColorEnd, 0.5);
          gl_FragColor = vec4(color, intensity * 0.5 * pulse);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false
    });

    this.coreGlow = new THREE.Mesh(glowGeometry, this.coreGlowMaterial);
    this.group.add(this.coreGlow);

    this.createCoreParticles();
  }

  private createCoreParticles(): void {
    const count = 200;
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const radius = 1.0 + Math.random() * 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.4;
      positions[i * 3 + 2] = radius * Math.cos(phi);

      phases[i] = Math.random() * Math.PI * 2;
      speeds[i] = 0.5 + Math.random() * 1.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: this.pixelRatio },
        uColor: { value: this.targetThemeColors.coreStart.clone() }
      },
      vertexShader: `
        attribute float phase;
        attribute float speed;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vAlpha;

        void main() {
          float twinkle = 0.3 + 0.7 * abs(sin(uTime * speed + phase));
          vAlpha = twinkle;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = (1.5 + twinkle * 2.0) * uPixelRatio * 80.0 / -mvPosition.z;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;

        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;

          float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.coreParticles = new THREE.Points(geometry, material);
    this.group.add(this.coreParticles);
  }

  private createShockWaveSystem(): void {
    this.shockWaveGeometry = new THREE.RingGeometry(0.95, 1.0, 64);
    this.shockWaveMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uProgress: { value: 0 },
        uColorStart: { value: new THREE.Color(0xff88ff) },
        uColorEnd: { value: new THREE.Color(0x4488ff) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uProgress;
        uniform vec3 uColorStart;
        uniform vec3 uColorEnd;
        varying vec2 vUv;

        void main() {
          float ring = 1.0 - abs(vUv.x - 0.5) * 2.0;
          float alpha = smoothstep(0.0, 0.3, ring);
          alpha *= (1.0 - uProgress) * 0.9;

          vec3 color = mix(uColorStart, uColorEnd, uProgress);
          float brightness = 1.0 + ring * 0.8;
          color *= brightness;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.shockWaveMesh = new THREE.Mesh(this.shockWaveGeometry, this.shockWaveMaterial);
    this.shockWaveMesh.visible = false;
    this.scene.add(this.shockWaveMesh);
  }

  public triggerShockWave(worldPosition: THREE.Vector3): void {
    const theme = this.targetThemeColors;
    const color = new THREE.Color().lerpColors(theme.shockStart, theme.shockEnd, Math.random());

    this.shockWaves.push({
      position: worldPosition.clone(),
      startTime: performance.now() / 1000,
      duration: 1.5,
      maxRadius: 12,
      color: color
    });
  }

  public updateConfig(partial: Partial<GalaxyConfig>): void {
    const needsRebuild =
      partial.particleCount !== undefined ||
      partial.spiralArms !== undefined;

    const needsColorUpdate = partial.theme !== undefined;

    if (partial.theme !== undefined && partial.theme !== this.config.theme) {
      this.cloneThemeColors(this.themeColors, this.targetThemeColors);
      this.themeTransitionProgress = 0;
    }

    Object.assign(this.config, partial);

    if (needsRebuild) {
      this.createGalaxy();
    }

    if (needsColorUpdate && !needsRebuild) {
      this.updateParticleColors();
    }
  }

  public updatePixelRatio(ratio: number): void {
    this.pixelRatio = ratio;
    if (this.particleMaterial) {
      this.particleMaterial.uniforms.uPixelRatio.value = ratio;
    }
    if (this.coreParticles && this.coreParticles.material instanceof THREE.ShaderMaterial) {
      this.coreParticles.material.uniforms.uPixelRatio.value = ratio;
    }
  }

  public update(delta: number, elapsed: number): void {
    if (this.themeTransitionProgress < 1) {
      this.themeTransitionProgress = Math.min(1, this.themeTransitionProgress + delta);
      this.lerpThemeColors(this.themeTransitionProgress);
      this.updateParticleColors();

      if (this.coreMaterial) {
        this.coreMaterial.uniforms.uColorStart.value.copy(this.targetThemeColors.coreStart);
        this.coreMaterial.uniforms.uColorEnd.value.copy(this.targetThemeColors.coreEnd);
      }
      if (this.coreGlowMaterial) {
        this.coreGlowMaterial.uniforms.uColorStart.value.copy(this.targetThemeColors.coreStart);
        this.coreGlowMaterial.uniforms.uColorEnd.value.copy(this.targetThemeColors.coreEnd);
      }
      if (this.coreParticles && this.coreParticles.material instanceof THREE.ShaderMaterial) {
        this.coreParticles.material.uniforms.uColor.value.copy(this.targetThemeColors.coreStart);
      }
    }

    const rotationAngle = (delta / this.ROTATION_PERIOD) * Math.PI * 2 * this.config.rotationSpeed;
    this.group.rotation.y += rotationAngle;

    this.updateParticles(delta, elapsed);

    if (this.particleMaterial) {
      this.particleMaterial.uniforms.uTime.value = elapsed;
    }
    if (this.coreMaterial) {
      this.coreMaterial.uniforms.uTime.value = elapsed;
    }
    if (this.coreGlowMaterial) {
      this.coreGlowMaterial.uniforms.uTime.value = elapsed;
    }
    if (this.coreParticles && this.coreParticles.material instanceof THREE.ShaderMaterial) {
      this.coreParticles.material.uniforms.uTime.value = elapsed;
    }
    if (this.coreParticles) {
      this.coreParticles.rotation.y += delta * 0.2;
    }

    this.updateShockWaves(elapsed);
  }

  private updateParticles(delta: number, elapsed: number): void {
    if (!this.particleGeometry || !this.basePositions || !this.baseSizes || !this.shockInfluence || !this.shockVelocities) return;

    const positions = this.particleGeometry.attributes.position.array as Float32Array;
    const colors = this.particleGeometry.attributes.color.array as Float32Array;
    const sizes = this.particleGeometry.attributes.size.array as Float32Array;
    const count = this.config.particleCount;

    const activeShocks = this.shockWaves.filter(s => {
      const progress = (elapsed - s.startTime) / s.duration;
      return progress >= 0 && progress < 1;
    });

    for (let i = 0; i < count; i++) {
      let totalBoost = 0;
      let vx = 0, vy = 0, vz = 0;

      const baseX = this.basePositions[i * 3];
      const baseY = this.basePositions[i * 3 + 1];
      const baseZ = this.basePositions[i * 3 + 2];

      for (const shock of activeShocks) {
        const progress = (elapsed - shock.startTime) / shock.duration;
        const waveRadius = progress * shock.maxRadius;
        const waveWidth = 2.5;

        const dx = baseX - shock.position.x;
        const dy = baseY - shock.position.y;
        const dz = baseZ - shock.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        const distToWave = Math.abs(dist - waveRadius);
        if (distToWave < waveWidth) {
          const influence = Math.pow(1 - distToWave / waveWidth, 2);
          const intensity = (1 - progress) * influence;

          totalBoost = Math.max(totalBoost, intensity);

          if (dist > 0.001) {
            const push = intensity * 0.8;
            vx += (dx / dist) * push;
            vy += (dy / dist) * push * 0.5;
            vz += (dz / dist) * push;
          }
        }
      }

      this.shockInfluence[i] = Math.max(this.shockInfluence[i] - delta * 3, totalBoost);

      const decay = Math.exp(-delta * 3);
      this.shockVelocities[i * 3] = this.shockVelocities[i * 3] * decay + vx * delta * 60;
      this.shockVelocities[i * 3 + 1] = this.shockVelocities[i * 3 + 1] * decay + vy * delta * 60;
      this.shockVelocities[i * 3 + 2] = this.shockVelocities[i * 3 + 2] * decay + vz * delta * 60;

      const pulseX = Math.sin(elapsed * 0.5 + i * 0.01) * 0.02;
      const pulseY = Math.cos(elapsed * 0.7 + i * 0.013) * 0.01;
      const pulseZ = Math.sin(elapsed * 0.6 + i * 0.017) * 0.02;

      positions[i * 3] = baseX + this.shockVelocities[i * 3] + pulseX;
      positions[i * 3 + 1] = baseY + this.shockVelocities[i * 3 + 1] + pulseY;
      positions[i * 3 + 2] = baseZ + this.shockVelocities[i * 3 + 2] + pulseZ;

      const boost = this.shockInfluence[i];
      if (boost > 0.01) {
        const bright = 1 + boost * 1.5;
        colors[i * 3] = Math.min(1, colors[i * 3] * bright);
        colors[i * 3 + 1] = Math.min(1, colors[i * 3 + 1] * bright);
        colors[i * 3 + 2] = Math.min(1, colors[i * 3 + 2] * bright);
      } else {
        const origColor = this.getParticleColor(this.baseColorFactors![i]);
        colors[i * 3] = origColor.r;
        colors[i * 3 + 1] = origColor.g;
        colors[i * 3 + 2] = origColor.b;
      }

      sizes[i] = this.baseSizes[i] * (1 + boost * 0.8);
    }

    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
    this.particleGeometry.attributes.size.needsUpdate = true;
  }

  private updateShockWaves(elapsed: number): void {
    this.shockWaves = this.shockWaves.filter(s => {
      const progress = (elapsed - s.startTime) / s.duration;
      if (progress < 0 || progress >= 1) return false;

      if (this.shockWaveMesh && this.shockWaveMaterial && this.shockWaveGeometry) {
        this.shockWaveMesh.visible = true;
        this.shockWaveMesh.position.copy(s.position);
        this.shockWaveMesh.lookAt(s.position.clone().add(new THREE.Vector3(0, 1, 0)));
        const scale = 0.01 + progress * s.maxRadius;
        this.shockWaveMesh.scale.setScalar(scale);
        this.shockWaveMaterial.uniforms.uProgress.value = progress;
        this.shockWaveMaterial.uniforms.uColorStart.value.copy(s.color);
        const endColor = new THREE.Color().lerpColors(s.color, this.targetThemeColors.edge, 0.5);
        this.shockWaveMaterial.uniforms.uColorEnd.value.copy(endColor);
      }

      return true;
    });

    if (this.shockWaves.length === 0 && this.shockWaveMesh) {
      this.shockWaveMesh.visible = false;
    }
  }

  private disposeParticles(): void {
    if (this.particles) {
      this.group.remove(this.particles);
      this.particleGeometry?.dispose();
      this.particleMaterial?.dispose();
      this.particles = null;
      this.particleGeometry = null;
      this.particleMaterial = null;
    }
  }

  private disposeCore(): void {
    if (this.core) {
      this.group.remove(this.core);
      this.core.geometry.dispose();
      (this.core.material as THREE.Material).dispose();
      this.core = null;
    }
    if (this.coreGlow) {
      this.group.remove(this.coreGlow);
      this.coreGlow.geometry.dispose();
      (this.coreGlow.material as THREE.Material).dispose();
      this.coreGlow = null;
    }
    if (this.coreParticles) {
      this.group.remove(this.coreParticles);
      this.coreParticles.geometry.dispose();
      (this.coreParticles.material as THREE.Material).dispose();
      this.coreParticles = null;
    }
    this.coreMaterial = null;
    this.coreGlowMaterial = null;
  }

  public dispose(): void {
    this.disposeParticles();
    this.disposeCore();
    if (this.shockWaveMesh) {
      this.scene.remove(this.shockWaveMesh);
      this.shockWaveGeometry?.dispose();
      this.shockWaveMaterial?.dispose();
    }
    this.scene.remove(this.group);
  }
}
