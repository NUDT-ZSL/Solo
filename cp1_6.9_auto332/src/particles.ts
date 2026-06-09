import * as THREE from 'three';

export interface ParticleData {
  index: number;
  initialTheta: number;
  initialPhi: number;
  initialRadius: number;
  theta: number;
  phi: number;
  radius: number;
  thetaSpeed: number;
  phiSpeed: number;
  radiusSpeed: number;
  baseHue: number;
  baseSaturation: number;
  baseLightness: number;
  pulsePhase: number;
  pulsePeriod: number;
  pulseAmplitude: number;
  targetSize: number;
  currentSize: number;
  hoverFactor: number;
  pulseBrightnessFactor: number;
  resetProgress: number;
  isResetting: boolean;
}

export class ParticleSystem {
  scene: THREE.Scene;
  group: THREE.Group;
  count: number;
  points: THREE.Points;
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  particles: ParticleData[] = [];
  emotion: number = 0;
  targetEmotion: number = 0;

  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;

  colorStart: THREE.Color = new THREE.Color('#4A90D9');
  colorEnd: THREE.Color = new THREE.Color('#9B59B6');

  constructor(group: THREE.Group, count: number = 1000) {
    this.group = group;
    this.scene = group.parent as THREE.Scene;
    this.count = Math.max(800, Math.min(1200, count));

    this.positions = new Float32Array(this.count * 3);
    this.colors = new Float32Array(this.count * 3);
    this.sizes = new Float32Array(this.count);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.material = this.createShaderMaterial();
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.name = 'thoughtParticles';
    this.group.add(this.points);

    this.initializeParticles();
  }

  createShaderMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: this.createCircleTexture() },
        uEmotion: { value: 0.0 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vSize;
        void main() {
          vColor = color;
          vSize = size;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        varying float vSize;
        void main() {
          vec4 texColor = texture2D(pointTexture, gl_PointCoord);
          if (texColor.a < 0.1) discard;
          gl_FragColor = vec4(vColor, 1.0) * texColor;
        }
      `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      vertexColors: true
    });
  }

  createCircleTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.6, 'rgba(255,255,255,0.3)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  initializeParticles(): void {
    for (let i = 0; i < this.count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 15 + Math.random() * 10;

      const baseHue = 220 + Math.random() * 40;
      const particle: ParticleData = {
        index: i,
        initialTheta: theta,
        initialPhi: phi,
        initialRadius: radius,
        theta,
        phi,
        radius,
        thetaSpeed: (Math.random() - 0.5) * 0.5,
        phiSpeed: (Math.random() - 0.5) * 0.3,
        radiusSpeed: (Math.random() - 0.5) * 0.2,
        baseHue,
        baseSaturation: 65 + Math.random() * 15,
        baseLightness: 55 + Math.random() * 10,
        pulsePhase: Math.random() * Math.PI * 2,
        pulsePeriod: 1 + Math.random() * 2,
        pulseAmplitude: 0.2,
        targetSize: 2 + Math.random() * 1.5,
        currentSize: 2 + Math.random() * 1.5,
        hoverFactor: 0,
        pulseBrightnessFactor: 0,
        resetProgress: 1,
        isResetting: false
      };

      this.particles.push(particle);
      this.updateParticlePosition(i, particle);
      this.updateParticleColor(i, particle);
      this.sizes[i] = particle.currentSize;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  updateParticlePosition(index: number, p: ParticleData): void {
    const x = p.radius * Math.sin(p.phi) * Math.cos(p.theta);
    const y = p.radius * Math.sin(p.phi) * Math.sin(p.theta);
    const z = p.radius * Math.cos(p.phi);
    this.positions[index * 3] = x;
    this.positions[index * 3 + 1] = y;
    this.positions[index * 3 + 2] = z;
  }

  updateParticleColor(index: number, p: ParticleData): void {
    const t = this.emotion;
    const hue = THREE.MathUtils.lerp(220, 20, t);
    const saturation = p.baseSaturation + t * 15;
    const lightnessBase = p.baseLightness;
    const pulseValue = Math.sin(p.pulsePhase) * (p.pulseAmplitude + t * 0.6) * 0.5;
    const hoverValue = p.hoverFactor * 0.15;
    const pulseBrightness = p.pulseBrightnessFactor * 0.5;
    const lightness = Math.min(100, lightnessBase + pulseValue * 50 + hoverValue * 50 + pulseBrightness * 50);

    const color = new THREE.Color().setHSL(hue / 360, saturation / 100, lightness / 100);
    this.colors[index * 3] = color.r;
    this.colors[index * 3 + 1] = color.g;
    this.colors[index * 3 + 2] = color.b;
  }

  setEmotion(value: number): void {
    this.targetEmotion = Math.max(0, Math.min(1, value));
  }

  startReset(): void {
    for (const p of this.particles) {
      p.isResetting = true;
      p.resetProgress = 0;
    }
    this.targetEmotion = 0;
  }

  setHoverParticle(index: number, hover: boolean): void {
    if (index >= 0 && index < this.count) {
      this.particles[index].hoverFactor = hover ? 1 : 0;
    }
  }

  setPulseBrightness(index: number, factor: number): void {
    if (index >= 0 && index < this.count) {
      this.particles[index].pulseBrightnessFactor = Math.max(
        this.particles[index].pulseBrightnessFactor,
        factor
      );
    }
  }

  update(deltaTime: number, elapsedTime: number): void {
    this.emotion = THREE.MathUtils.lerp(this.emotion, this.targetEmotion, Math.min(1, deltaTime * 3));
    this.material.uniforms.uEmotion.value = this.emotion;

    const baseSpeed = THREE.MathUtils.lerp(0.2, 1.0, this.emotion);
    const epsilon = 0.0001;

    for (let i = 0; i < this.count; i++) {
      const p = this.particles[i];

      if (p.isResetting) {
        p.resetProgress += deltaTime;
        if (p.resetProgress >= 1) {
          p.resetProgress = 1;
          p.isResetting = false;
        }
        const easeT = 0.5 - 0.5 * Math.cos(Math.PI * p.resetProgress);
        p.theta = THREE.MathUtils.lerp(p.theta, p.initialTheta, easeT);
        p.phi = THREE.MathUtils.lerp(p.phi, p.initialPhi, easeT);
        p.radius = THREE.MathUtils.lerp(p.radius, p.initialRadius, easeT);
      } else {
        p.theta += p.thetaSpeed * baseSpeed * deltaTime;
        p.phi += p.phiSpeed * baseSpeed * deltaTime;
        p.radius += p.radiusSpeed * baseSpeed * deltaTime * 0.3;

        if (p.radius < 15) { p.radius = 15; p.radiusSpeed *= -1; }
        if (p.radius > 25) { p.radius = 25; p.radiusSpeed *= -1; }
        if (p.phi < epsilon) p.phi = epsilon;
        if (p.phi > Math.PI - epsilon) p.phi = Math.PI - epsilon;
      }

      p.pulsePhase = (elapsedTime / p.pulsePeriod) * Math.PI * 2 + p.pulsePhase % (Math.PI * 2);
      p.pulseAmplitude = THREE.MathUtils.lerp(0.2, 0.8, this.emotion);

      p.hoverFactor = THREE.MathUtils.lerp(p.hoverFactor, p.hoverFactor > 0.5 ? 1 : 0, Math.min(1, deltaTime * 4));
      p.pulseBrightnessFactor = THREE.MathUtils.lerp(p.pulseBrightnessFactor, 0, Math.min(1, deltaTime * 1.5));

      const hoverSizeMult = 1 + p.hoverFactor * 0.5;
      const emotionSizeMult = THREE.MathUtils.lerp(1, 1.3, this.emotion);
      const pulseSizeMult = 1 + Math.sin(p.pulsePhase) * 0.2 * (p.pulseAmplitude + 0.2);
      p.targetSize = (2 + Math.random() * 0.01) * emotionSizeMult;
      p.currentSize = THREE.MathUtils.lerp(
        p.currentSize,
        p.targetSize * hoverSizeMult * pulseSizeMult,
        Math.min(1, deltaTime * 3)
      );

      this.updateParticlePosition(i, p);
      this.updateParticleColor(i, p);
      this.sizes[i] = Math.max(1, Math.min(4, p.currentSize));
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  getParticleWorldPosition(index: number): THREE.Vector3 {
    const p = this.particles[index];
    const local = new THREE.Vector3(
      p.radius * Math.sin(p.phi) * Math.cos(p.theta),
      p.radius * Math.sin(p.phi) * Math.sin(p.theta),
      p.radius * Math.cos(p.phi)
    );
    return local.applyMatrix4(this.points.matrixWorld);
  }
}
