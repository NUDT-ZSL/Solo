import * as THREE from 'three';

export interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  baseColor: THREE.Color;
  size: number;
  alpha: number;
  brightBoost: number;
  brightTimer: number;
  colorMixTimer: number;
  mixedColor: THREE.Color | null;
  radius: number;
  phase: number;
  spiralRadius: number;
  spiralPhase: number;
  riseSpeed: number;
  id: number;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255
  };
}

function lerpColor(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }, t: number) {
  return new THREE.Color(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t
  );
}

export class NebulaSystem {
  scene: THREE.Scene;
  count = 2000;
  particles: ParticleData[] = [];
  points: THREE.Points;
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;

  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  alphas: Float32Array;

  rotationY = 0;
  private idCounter = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.positions = new Float32Array(this.count * 3);
    this.colors = new Float32Array(this.count * 3);
    this.sizes = new Float32Array(this.count);
    this.alphas = new Float32Array(this.count);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aAlpha;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uPixelRatio;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uPixelRatio * (300.0 / max(1.0, -mv.z));
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float core = smoothstep(0.5, 0.0, d);
          float halo = smoothstep(0.5, 0.15, d) * 0.6;
          float a = (core + halo) * vAlpha;
          gl_FragColor = vec4(vColor * (1.2 + core * 0.8), a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);

    this.initParticles();
  }

  private initParticles() {
    const purple = hexToRgb('#7B2D8E');
    const orange = hexToRgb('#E8A87C');

    for (let i = 0; i < this.count; i++) {
      const shellRadius = 200 + Math.random() * 300;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const x = shellRadius * Math.sin(phi) * Math.cos(theta);
      const z = shellRadius * Math.sin(phi) * Math.sin(theta);
      const y = shellRadius * Math.cos(phi) * 0.6;

      const colorT = Math.pow(Math.random(), 0.7);
      const baseColor = lerpColor(purple, orange, colorT);

      const particle: ParticleData = {
        position: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(),
        color: baseColor.clone(),
        baseColor: baseColor.clone(),
        size: 2 + Math.random() * 4,
        alpha: 0.5 + Math.random() * 0.4,
        brightBoost: 1,
        brightTimer: 0,
        colorMixTimer: 0,
        mixedColor: null,
        radius: shellRadius,
        phase: Math.random() * Math.PI * 2,
        spiralRadius: 50 + Math.random() * 150,
        spiralPhase: Math.random() * Math.PI * 2,
        riseSpeed: 0.5 + Math.random() * 1,
        id: this.idCounter++
      };
      this.particles.push(particle);
    }
    this.syncBuffers();
  }

  syncBuffers() {
    for (let i = 0; i < this.count; i++) {
      const p = this.particles[i];
      this.positions[i * 3] = p.position.x;
      this.positions[i * 3 + 1] = p.position.y;
      this.positions[i * 3 + 2] = p.position.z;

      const boost = p.brightBoost;
      this.colors[i * 3] = Math.min(1, p.color.r * boost);
      this.colors[i * 3 + 1] = Math.min(1, p.color.g * boost);
      this.colors[i * 3 + 2] = Math.min(1, p.color.b * boost);

      this.sizes[i] = p.size;
      this.alphas[i] = p.alpha;
    }
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
  }

  applyShockwave(center: THREE.Vector3, waveRadius: number, width: number) {
    for (let i = 0; i < this.count; i++) {
      const p = this.particles[i];
      const d = p.position.distanceTo(center);
      if (Math.abs(d - waveRadius) < width) {
        p.brightBoost = 2;
        p.brightTimer = 0.3;
      }
    }
  }

  update(time: number, dt: number) {
    const rotationSpeed = 0.005 * 60 * dt;
    this.rotationY += rotationSpeed;

    for (let i = 0; i < this.count; i++) {
      const p = this.particles[i];

      p.spiralPhase += rotationSpeed * (1 + p.radius * 0.002);
      p.riseSpeed = 0.5 + 0.5 * Math.sin(time * 0.3 + p.phase);

      const baseAngle = Math.atan2(p.position.z, p.position.x) + rotationSpeed;
      const spiralMod = Math.sin(time * 0.4 + p.phase) * 20;
      const currentR = Math.sqrt(p.position.x * p.position.x + p.position.z * p.position.z) + spiralMod * dt * 10;

      const r = Math.max(180, Math.min(520, currentR));
      p.position.x = Math.cos(baseAngle) * r;
      p.position.z = Math.sin(baseAngle) * r;
      p.position.y += p.riseSpeed * dt * 60;

      if (p.position.y > 250) p.position.y = -250;
      if (p.position.y < -250) p.position.y = 250;

      if (p.brightTimer > 0) {
        p.brightTimer -= dt;
        if (p.brightTimer <= 0) {
          p.brightBoost = 1;
        } else {
          p.brightBoost = 1 + p.brightTimer / 0.3;
        }
      }

      if (p.colorMixTimer > 0) {
        p.colorMixTimer -= dt;
        if (p.colorMixTimer <= 0) {
          p.color.copy(p.baseColor);
          p.mixedColor = null;
        } else if (p.mixedColor) {
          const t = p.colorMixTimer / 0.08;
          p.color.lerpColors(p.mixedColor, p.baseColor, 1 - t);
        }
      }
    }

    this.syncBuffers();
  }
}
