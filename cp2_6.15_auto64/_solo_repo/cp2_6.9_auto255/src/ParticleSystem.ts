import * as THREE from 'three';

export type MotionMode = 'spiral' | 'wave' | 'drift';
export type ThemeType = 'purple' | 'orange' | 'green' | 'blue';

interface ThemeColors {
  primary: THREE.Color;
  secondary: THREE.Color;
  tertiary: THREE.Color;
  accent: THREE.Color;
}

const THEMES: Record<ThemeType, ThemeColors> = {
  purple: {
    primary: new THREE.Color(0x9B59B6),
    secondary: new THREE.Color(0x8E44AD),
    tertiary: new THREE.Color(0xE74C3C),
    accent: new THREE.Color(0xBB8FCE),
  },
  orange: {
    primary: new THREE.Color(0xFF6B6B),
    secondary: new THREE.Color(0xFFD93D),
    tertiary: new THREE.Color(0xFF8C42),
    accent: new THREE.Color(0xFFB347),
  },
  green: {
    primary: new THREE.Color(0x6BCB77),
    secondary: new THREE.Color(0x4D96FF),
    tertiary: new THREE.Color(0x00D9FF),
    accent: new THREE.Color(0x7DCEA0),
  },
  blue: {
    primary: new THREE.Color(0x4D96FF),
    secondary: new THREE.Color(0x00D9FF),
    tertiary: new THREE.Color(0xE0FFFF),
    accent: new THREE.Color(0x5DADE2),
  },
};

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  birthTime: number;
  lifetime: number;
  coreIndex: number;
  baseColor: THREE.Color;
  currentColor: THREE.Color;
  size: number;
  trail: THREE.Vector3[];
  lastTrailUpdate: number;
  distanceFromCore: number;
  angle: number;
  speed: number;
  modeOffset: number;
}

interface StarCore {
  position: THREE.Vector3;
  color: THREE.Color;
  targetColor: THREE.Color;
  birthTime: number;
  radius: number;
  id: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private particles: Particle[] = [];
  private cores: StarCore[] = [];
  private backgroundStars: THREE.Points | null = null;
  private particleMesh: THREE.Points | null = null;
  private trailMesh: THREE.Points | null = null;
  private connectionMesh: THREE.LineSegments | null = null;
  private coreMesh: THREE.Points | null = null;
  private motionMode: MotionMode = 'spiral';
  private currentTheme: ThemeType = 'purple';
  private targetTheme: ThemeType = 'purple';
  private themeTransitionStart: number = 0;
  private themeTransitionDuration: number = 2000;
  private coreIdCounter: number = 0;
  private maxParticles: number = 8000;
  private maxTrailLength: number = 40;
  private currentTrailLength: number = 40;
  private particleSpawnMultiplier: number = 1;
  private connectionDistance: number = 15;
  private connectionDistanceSq: number = 225;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.createBackgroundStars();
    this.createParticleSystems();
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private createBackgroundStars(): void {
    const starCount = 500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const opacities = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 800;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 800;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 800;

      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;

      sizes[i] = 0.5 + Math.random();
      opacities[i] = 0.3 + Math.random() * 0.3;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        pixelRatio: { value: window.devicePixelRatio },
      },
      vertexShader: `
        attribute float size;
        attribute float opacity;
        varying vec3 vColor;
        varying float vOpacity;
        uniform float pixelRatio;
        void main() {
          vColor = color;
          vOpacity = opacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * pixelRatio * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          float r = distance(gl_PointCoord, vec2(0.5));
          if (r > 0.5) discard;
          float glow = 1.0 - r * 2.0;
          glow = pow(glow, 1.5);
          gl_FragColor = vec4(vColor, glow * vOpacity);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.backgroundStars = new THREE.Points(geometry, material);
    this.scene.add(this.backgroundStars);
  }

  private createParticleSystems(): void {
    const particleGeometry = new THREE.BufferGeometry();
    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        pixelRatio: { value: window.devicePixelRatio },
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vOpacity;
        attribute float opacity;
        uniform float pixelRatio;
        void main() {
          vColor = color;
          vOpacity = opacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * pixelRatio * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          float r = distance(gl_PointCoord, vec2(0.5));
          if (r > 0.5) discard;
          float glow = 1.0 - r * 2.0;
          glow = pow(glow, 1.2);
          gl_FragColor = vec4(vColor, glow * vOpacity);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particleMesh = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(this.particleMesh);

    const trailGeometry = new THREE.BufferGeometry();
    const trailMaterial = new THREE.ShaderMaterial({
      uniforms: {
        pixelRatio: { value: window.devicePixelRatio },
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vOpacity;
        attribute float opacity;
        uniform float pixelRatio;
        void main() {
          vColor = color;
          vOpacity = opacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * 0.6 * pixelRatio * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          float r = distance(gl_PointCoord, vec2(0.5));
          if (r > 0.5) discard;
          float glow = 1.0 - r * 2.0;
          glow = pow(glow, 2.0);
          gl_FragColor = vec4(vColor, glow * vOpacity);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.trailMesh = new THREE.Points(trailGeometry, trailMaterial);
    this.scene.add(this.trailMesh);

    const connectionGeometry = new THREE.BufferGeometry();
    const connectionMaterial = new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.5,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.connectionMesh = new THREE.LineSegments(connectionGeometry, connectionMaterial);
    this.scene.add(this.connectionMesh);

    const coreGeometry = new THREE.BufferGeometry();
    const coreMaterial = new THREE.ShaderMaterial({
      uniforms: {
        pixelRatio: { value: window.devicePixelRatio },
        time: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        uniform float pixelRatio;
        uniform float time;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float pulse = 1.0 + sin(time * 3.0) * 0.15;
          gl_PointSize = size * pulse * pixelRatio * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float r = distance(gl_PointCoord, vec2(0.5));
          if (r > 0.5) discard;
          float glow = 1.0 - r * 2.0;
          glow = pow(glow, 0.8);
          vec3 finalColor = vColor * (1.0 + glow * 0.5);
          gl_FragColor = vec4(finalColor, glow);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.coreMesh = new THREE.Points(coreGeometry, coreMaterial);
    this.scene.add(this.coreMesh);
  }

  private getThemeColorsArray(theme: ThemeType): THREE.Color[] {
    const t = THEMES[theme];
    return [t.primary, t.secondary, t.tertiary, t.accent];
  }

  private interpolateHSL(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
    const hsl1 = { h: 0, s: 0, l: 0 };
    const hsl2 = { h: 0, s: 0, l: 0 };
    color1.getHSL(hsl1);
    color2.getHSL(hsl2);

    let h: number;
    const dh = hsl2.h - hsl1.h;
    if (Math.abs(dh) <= 0.5) {
      h = hsl1.h + dh * t;
    } else if (dh > 0.5) {
      h = hsl1.h + (dh - 1) * t;
    } else {
      h = hsl1.h + (dh + 1) * t;
    }
    if (h < 0) h += 1;
    if (h > 1) h -= 1;

    const s = hsl1.s + (hsl2.s - hsl1.s) * t;
    const l = hsl1.l + (hsl2.l - hsl1.l) * t;

    return new THREE.Color().setHSL(h, s, l);
  }

  public spawnStarCore(position: THREE.Vector3): void {
    const colors = this.getThemeColorsArray(this.currentTheme);
    const baseColor = colors[Math.floor(Math.random() * colors.length)].clone();

    const core: StarCore = {
      position: position.clone(),
      color: baseColor.clone(),
      targetColor: baseColor.clone(),
      birthTime: performance.now(),
      radius: 3,
      id: this.coreIdCounter++,
    };

    this.cores.push(core);

    const baseCount = 30 + Math.floor(Math.random() * 21);
    const particleCount = Math.floor(baseCount * this.particleSpawnMultiplier);

    for (let i = 0; i < particleCount; i++) {
      this.spawnParticleFromCore(core, i, particleCount);
    }

    this.enforceParticleLimit();
  }

  private spawnParticleFromCore(core: StarCore, index: number, total: number): void {
    const angle = (index / total) * Math.PI * 2 + Math.random() * 0.3;
    const speed = 2 + Math.random() * 4;
    const elevation = (Math.random() - 0.5) * 0.5;

    const velocity = new THREE.Vector3(
      Math.cos(angle) * speed,
      elevation * speed,
      Math.sin(angle) * speed
    );

    const coreColors = this.getThemeColorsArray(this.currentTheme);
    const baseColor = coreColors[Math.floor(Math.random() * coreColors.length)].clone();

    const particle: Particle = {
      position: core.position.clone().add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        )
      ),
      velocity,
      birthTime: performance.now(),
      lifetime: 8000,
      coreIndex: this.cores.length - 1,
      baseColor: baseColor.clone(),
      currentColor: baseColor.clone(),
      size: 1 + Math.random() * 2,
      trail: [],
      lastTrailUpdate: performance.now(),
      distanceFromCore: 0,
      angle,
      speed,
      modeOffset: Math.random() * Math.PI * 2,
    };

    this.particles.push(particle);
  }

  private enforceParticleLimit(): void {
    while (this.particles.length > this.maxParticles && this.cores.length > 0) {
      const oldestCore = this.cores.shift();
      if (oldestCore) {
        const threshold = oldestCore.id;
        this.particles = this.particles.filter((_, idx) => {
          const coreIdx = this.particles[idx].coreIndex;
          return coreIdx > 0 || (this.cores.length > 0 && this.particles[idx].coreIndex >= 0);
        });
        this.particles = this.particles.filter(p => {
          const core = this.cores.find(c => c.position.distanceTo(p.position) < 100);
          return core !== undefined || p.birthTime > oldestCore.birthTime;
        });
        for (const p of this.particles) {
          p.coreIndex = Math.max(0, p.coreIndex - 1);
        }
      }
    }
  }

  public setMotionMode(mode: MotionMode): void {
    this.motionMode = mode;
    for (const p of this.particles) {
      p.modeOffset = Math.random() * Math.PI * 2;
    }
  }

  public getMotionMode(): MotionMode {
    return this.motionMode;
  }

  public setTheme(theme: ThemeType): void {
    if (theme === this.currentTheme) return;
    this.targetTheme = theme;
    this.themeTransitionStart = performance.now();
  }

  public getTheme(): ThemeType {
    return this.currentTheme;
  }

  public clearAllTrails(): void {
    this.particles = [];
    this.cores = [];
  }

  public getTotalParticleCount(): number {
    return this.particles.length;
  }

  public updatePerformanceParams(fps: number): void {
    if (fps < 30) {
      this.currentTrailLength = Math.max(10, Math.floor(this.maxTrailLength / 2));
      this.particleSpawnMultiplier = 0.5;
    } else if (fps < 45) {
      this.currentTrailLength = Math.max(20, Math.floor(this.maxTrailLength / 2));
      this.particleSpawnMultiplier = 1;
    } else {
      this.currentTrailLength = this.maxTrailLength;
      this.particleSpawnMultiplier = 1;
    }
  }

  public update(deltaTime: number): void {
    const now = performance.now();

    const themeProgress = Math.min(1, (now - this.themeTransitionStart) / this.themeTransitionDuration);
    const easedProgress = this.easeInOutCubic(themeProgress);
    if (themeProgress < 1 && this.targetTheme !== this.currentTheme) {
      const currentColors = this.getThemeColorsArray(this.currentTheme);
      const targetColors = this.getThemeColorsArray(this.targetTheme);

      for (const core of this.cores) {
        const colorIdx = Math.floor(Math.random() * currentColors.length);
        core.color.copy(this.interpolateHSL(currentColors[colorIdx], targetColors[colorIdx], easedProgress));
      }

      for (const particle of this.particles) {
        const colorIdx = Math.floor(Math.random() * currentColors.length);
        particle.currentColor.copy(this.interpolateHSL(currentColors[colorIdx], targetColors[colorIdx], easedProgress));
        particle.baseColor.copy(particle.currentColor);
      }
    }
    if (themeProgress >= 1 && this.targetTheme !== this.currentTheme) {
      this.currentTheme = this.targetTheme;
      const targetColors = this.getThemeColorsArray(this.currentTheme);
      for (const core of this.cores) {
        const colorIdx = Math.floor(Math.random() * targetColors.length);
        core.color.copy(targetColors[colorIdx]);
      }
    }

    const dt = deltaTime / 1000;

    this.particles = this.particles.filter(particle => {
      const age = now - particle.birthTime;
      if (age > particle.lifetime) return false;

      switch (this.motionMode) {
        case 'spiral': {
          particle.angle += dt * 1.5;
          const radius = particle.distanceFromCore + particle.speed * dt * 2;
          particle.distanceFromCore = radius;
          const core = this.cores[particle.coreIndex];
          const center = core ? core.position : new THREE.Vector3();
          particle.position.x = center.x + Math.cos(particle.angle + particle.modeOffset) * radius;
          particle.position.z = center.z + Math.sin(particle.angle + particle.modeOffset) * radius;
          particle.position.y += particle.velocity.y * dt * 0.5;
          particle.position.y += Math.sin(now * 0.002 + particle.modeOffset) * dt * 2;
          break;
        }
        case 'wave': {
          particle.position.add(particle.velocity.clone().multiplyScalar(dt));
          particle.position.y += Math.sin(now * 0.003 + particle.modeOffset) * dt * 8;
          particle.position.x += Math.cos(now * 0.002 + particle.modeOffset * 1.3) * dt * 3;
          particle.velocity.multiplyScalar(0.995);
          break;
        }
        case 'drift': {
          particle.position.add(particle.velocity.clone().multiplyScalar(dt));
          particle.velocity.x += (Math.random() - 0.5) * dt * 3;
          particle.velocity.y += (Math.random() - 0.5) * dt * 3;
          particle.velocity.z += (Math.random() - 0.5) * dt * 3;
          particle.velocity.multiplyScalar(0.99);
          break;
        }
      }

      if (now - particle.lastTrailUpdate > 100) {
        particle.trail.push(particle.position.clone());
        if (particle.trail.length > this.currentTrailLength) {
          particle.trail.shift();
        }
        particle.lastTrailUpdate = now;
      }

      const lifeRatio = age / particle.lifetime;
      const hsl = { h: 0, s: 0, l: 0 };
      particle.baseColor.getHSL(hsl);
      const saturationT = Math.min(1, particle.distanceFromCore / 100);
      hsl.s = 0.8 - saturationT * 0.6;
      particle.currentColor.setHSL(hsl.h, hsl.s, hsl.l);

      return true;
    });

    this.updateParticleMesh();
    this.updateTrailMesh();
    this.updateConnectionMesh();
    this.updateCoreMesh(now);
  }

  private updateParticleMesh(): void {
    if (!this.particleMesh) return;

    const count = this.particles.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const opacities = new Float32Array(count);
    const now = performance.now();

    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;

      colors[i * 3] = p.currentColor.r;
      colors[i * 3 + 1] = p.currentColor.g;
      colors[i * 3 + 2] = p.currentColor.b;

      sizes[i] = p.size;

      const age = now - p.birthTime;
      const lifeRatio = age / p.lifetime;
      opacities[i] = 0.9 * (1 - lifeRatio);
    }

    this.particleMesh.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleMesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.particleMesh.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.particleMesh.geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
    this.particleMesh.geometry.attributes.position.needsUpdate = true;
    this.particleMesh.geometry.attributes.color.needsUpdate = true;
  }

  private updateTrailMesh(): void {
    if (!this.trailMesh) return;

    let totalTrailPoints = 0;
    for (const p of this.particles) {
      totalTrailPoints += p.trail.length;
    }

    const positions = new Float32Array(totalTrailPoints * 3);
    const colors = new Float32Array(totalTrailPoints * 3);
    const sizes = new Float32Array(totalTrailPoints);
    const opacities = new Float32Array(totalTrailPoints);
    const now = performance.now();

    let offset = 0;
    for (const p of this.particles) {
      for (let i = 0; i < p.trail.length; i++) {
        const point = p.trail[i];
        const trailIdx = offset + i;
        positions[trailIdx * 3] = point.x;
        positions[trailIdx * 3 + 1] = point.y;
        positions[trailIdx * 3 + 2] = point.z;

        colors[trailIdx * 3] = p.currentColor.r;
        colors[trailIdx * 3 + 1] = p.currentColor.g;
        colors[trailIdx * 3 + 2] = p.currentColor.b;

        sizes[trailIdx] = p.size * 0.5;

        const trailRatio = i / p.trail.length;
        const age = now - p.birthTime;
        const lifeRatio = age / p.lifetime;
        opacities[trailIdx] = 0.5 * (1 - trailRatio) * (1 - lifeRatio);
      }
      offset += p.trail.length;
    }

    this.trailMesh.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.trailMesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.trailMesh.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.trailMesh.geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
    this.trailMesh.geometry.attributes.position.needsUpdate = true;
    this.trailMesh.geometry.attributes.color.needsUpdate = true;
  }

  private updateConnectionMesh(): void {
    if (!this.connectionMesh) return;

    const maxConnections = Math.min(this.particles.length * 10, 20000);
    const positions = new Float32Array(maxConnections * 6);
    const colors = new Float32Array(maxConnections * 6);
    let connectionCount = 0;

    for (let i = 0; i < this.particles.length && connectionCount < maxConnections; i++) {
      for (let j = i + 1; j < this.particles.length && connectionCount < maxConnections; j++) {
        const p1 = this.particles[i];
        const p2 = this.particles[j];

        const dx = p1.position.x - p2.position.x;
        const dy = p1.position.y - p2.position.y;
        const dz = p1.position.z - p2.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < this.connectionDistanceSq) {
          const dist = Math.sqrt(distSq);
          const alpha = 0.2 + 0.6 * (1 - dist / this.connectionDistance);

          const idx = connectionCount * 6;
          positions[idx] = p1.position.x;
          positions[idx + 1] = p1.position.y;
          positions[idx + 2] = p1.position.z;
          positions[idx + 3] = p2.position.x;
          positions[idx + 4] = p2.position.y;
          positions[idx + 5] = p2.position.z;

          const mixedR = (p1.currentColor.r + p2.currentColor.r) * 0.5;
          const mixedG = (p1.currentColor.g + p2.currentColor.g) * 0.5;
          const mixedB = (p1.currentColor.b + p2.currentColor.b) * 0.5;

          colors[idx] = mixedR;
          colors[idx + 1] = mixedG;
          colors[idx + 2] = mixedB;
          colors[idx + 3] = mixedR;
          colors[idx + 4] = mixedG;
          colors[idx + 5] = mixedB;

          connectionCount++;
        }
      }
    }

    const usedPositions = positions.slice(0, connectionCount * 6);
    const usedColors = colors.slice(0, connectionCount * 6);

    this.connectionMesh.geometry.setAttribute('position', new THREE.BufferAttribute(usedPositions, 3));
    this.connectionMesh.geometry.setAttribute('color', new THREE.BufferAttribute(usedColors, 3));
    this.connectionMesh.geometry.attributes.position.needsUpdate = true;

    if (this.connectionMesh.material instanceof THREE.LineBasicMaterial) {
      this.connectionMesh.material.opacity = 0.6;
    }
  }

  private updateCoreMesh(now: number): void {
    if (!this.coreMesh) return;

    const count = this.cores.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const core = this.cores[i];
      positions[i * 3] = core.position.x;
      positions[i * 3 + 1] = core.position.y;
      positions[i * 3 + 2] = core.position.z;

      colors[i * 3] = core.color.r;
      colors[i * 3 + 1] = core.color.g;
      colors[i * 3 + 2] = core.color.b;

      const age = now - core.birthTime;
      const fadeIn = Math.min(1, age / 500);
      sizes[i] = core.radius * fadeIn * 3;
    }

    this.coreMesh.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.coreMesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.coreMesh.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.coreMesh.geometry.attributes.position.needsUpdate = true;
    this.coreMesh.geometry.attributes.color.needsUpdate = true;

    if (this.coreMesh.material instanceof THREE.ShaderMaterial) {
      this.coreMesh.material.uniforms.time.value = now / 1000;
    }
  }

  public onResize(): void {
    if (this.particleMesh && this.particleMesh.material instanceof THREE.ShaderMaterial) {
      this.particleMesh.material.uniforms.pixelRatio.value = window.devicePixelRatio;
    }
    if (this.trailMesh && this.trailMesh.material instanceof THREE.ShaderMaterial) {
      this.trailMesh.material.uniforms.pixelRatio.value = window.devicePixelRatio;
    }
    if (this.coreMesh && this.coreMesh.material instanceof THREE.ShaderMaterial) {
      this.coreMesh.material.uniforms.pixelRatio.value = window.devicePixelRatio;
    }
    if (this.backgroundStars && this.backgroundStars.material instanceof THREE.ShaderMaterial) {
      this.backgroundStars.material.uniforms.pixelRatio.value = window.devicePixelRatio;
    }
  }

  public dispose(): void {
    if (this.backgroundStars) {
      this.backgroundStars.geometry.dispose();
      if (this.backgroundStars.material instanceof THREE.Material) {
        this.backgroundStars.material.dispose();
      }
    }
    if (this.particleMesh) {
      this.particleMesh.geometry.dispose();
      if (this.particleMesh.material instanceof THREE.Material) {
        this.particleMesh.material.dispose();
      }
    }
    if (this.trailMesh) {
      this.trailMesh.geometry.dispose();
      if (this.trailMesh.material instanceof THREE.Material) {
        this.trailMesh.material.dispose();
      }
    }
    if (this.connectionMesh) {
      this.connectionMesh.geometry.dispose();
      if (this.connectionMesh.material instanceof THREE.Material) {
        this.connectionMesh.material.dispose();
      }
    }
    if (this.coreMesh) {
      this.coreMesh.geometry.dispose();
      if (this.coreMesh.material instanceof THREE.Material) {
        this.coreMesh.material.dispose();
      }
    }
  }
}
