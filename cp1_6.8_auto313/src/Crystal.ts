import * as THREE from 'three';
import { TimeColors } from './TimeSystem';

const CRYSTAL_VERT = `
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vViewDir;
varying float vLocalY;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  vNormal = normalize(normalMatrix * normal);
  vViewDir = normalize(cameraPosition - worldPos.xyz);
  vLocalY = position.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const CRYSTAL_FRAG = `
uniform vec3 uBaseColor;
uniform vec3 uEmissiveColor;
uniform float uTime;
uniform float uPulseTime;
uniform vec3 uPulseOrigin;
uniform float uOpacity;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vViewDir;
varying float vLocalY;

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  float fresnel = pow(1.0 - abs(dot(vViewDir, normalize(vNormal))), 2.5);

  float luster = sin(vLocalY * 8.0 + uTime * 1.5) * 0.5 + 0.5;
  luster *= sin(vWorldPosition.x * 4.0 + uTime * 1.2) * 0.3 + 0.7;
  luster *= sin(vWorldPosition.z * 4.0 - uTime * 0.8) * 0.2 + 0.8;

  vec3 color = uBaseColor * (0.7 + luster * 0.3);
  color += uEmissiveColor * (fresnel * 0.8 + luster * 0.15);
  color += uEmissiveColor * fresnel * 0.4;

  if (uPulseTime >= 0.0 && uPulseTime < 3.5) {
    float dist = distance(vWorldPosition, uPulseOrigin);
    float rippleSpeed = 6.0;
    float rippleRadius = uPulseTime * rippleSpeed;
    float rippleWidth = 1.8;

    float rippleMask = smoothstep(rippleRadius - rippleWidth, rippleRadius, dist)
                     * smoothstep(rippleRadius + rippleWidth, rippleRadius, dist);
    float rippleWave = sin((dist - rippleRadius) * 5.0) * rippleMask;

    float hue = fract(uPulseTime * 0.25 + dist * 0.08);
    vec3 rainbow = hsv2rgb(vec3(hue, 0.9, 1.0));

    float pulseStrength = rippleWave * exp(-uPulseTime * 0.7);
    color = mix(color, rainbow, clamp(pulseStrength * 2.5, 0.0, 1.0));
  }

  float alpha = uOpacity + fresnel * 0.25;
  gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
}
`;

const GLOW_VERT = `
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vViewDir = normalize(cameraPosition - worldPos.xyz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const GLOW_FRAG = `
uniform vec3 uGlowColor;
uniform float uIntensity;

varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  float fresnel = pow(1.0 - abs(dot(vViewDir, normalize(vNormal))), 3.0);
  float alpha = fresnel * uIntensity;
  gl_FragColor = vec4(uGlowColor * 1.5, alpha);
}
`;

const PARTICLE_VERT = `
attribute float aSize;
attribute float aOffset;
attribute float aSpeed;
uniform float uTime;

varying float vAlpha;

void main() {
  float baseAngle = atan(position.z, position.x);
  float r = length(position.xz);
  float angle = baseAngle + uTime * aSpeed * 0.15;

  vec3 pos = position;
  pos.x = r * cos(angle);
  pos.z = r * sin(angle);
  pos.y += sin(uTime * 0.3 + aOffset * 6.2832) * 0.3;

  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPos;
  gl_PointSize = aSize * (250.0 / -mvPos.z);
  vAlpha = 0.25 + 0.25 * sin(uTime * 0.8 + aOffset * 6.2832);
}
`;

const PARTICLE_FRAG = `
uniform vec3 uParticleColor;
varying float vAlpha;

void main() {
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;
  float alpha = smoothstep(0.5, 0.05, dist) * vAlpha;
  gl_FragColor = vec4(uParticleColor, alpha);
}
`;

interface CrystalConfig {
  h: number;
  r: number;
  tip: number;
  px: number;
  py: number;
  pz: number;
  rx: number;
  ry: number;
  rz: number;
}

export class Crystal {
  readonly group: THREE.Group;
  private crystalMeshes: THREE.Mesh[] = [];
  private crystalMaterial: THREE.ShaderMaterial;
  private glowMaterial: THREE.ShaderMaterial;
  private particleMaterial: THREE.ShaderMaterial;
  private particles!: THREE.Points;
  private glowSphere!: THREE.Mesh;
  private pointLight: THREE.PointLight;
  private pulseTime: number = -1;
  private pulseOrigin: THREE.Vector3 = new THREE.Vector3();
  private _elapsed: number = 0;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();

    this.crystalMaterial = new THREE.ShaderMaterial({
      vertexShader: CRYSTAL_VERT,
      fragmentShader: CRYSTAL_FRAG,
      uniforms: {
        uBaseColor: { value: new THREE.Color(1, 0.84, 0.3) },
        uEmissiveColor: { value: new THREE.Color(0.8, 0.65, 0.2) },
        uTime: { value: 0 },
        uPulseTime: { value: -1 },
        uPulseOrigin: { value: new THREE.Vector3() },
        uOpacity: { value: 0.65 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.glowMaterial = new THREE.ShaderMaterial({
      vertexShader: GLOW_VERT,
      fragmentShader: GLOW_FRAG,
      uniforms: {
        uGlowColor: { value: new THREE.Color(0.8, 0.65, 0.2) },
        uIntensity: { value: 0.45 },
      },
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.particleMaterial = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uParticleColor: { value: new THREE.Color(1, 1, 1) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.createCrystals();
    this.createGlow();
    this.createParticles();

    this.pointLight = new THREE.PointLight(0xffd700, 2, 15);
    this.pointLight.position.set(0, 0, 0);
    this.group.add(this.pointLight);

    scene.add(this.group);
  }

  private generateConfigs(): CrystalConfig[] {
    const configs: CrystalConfig[] = [];
    configs.push({ h: 3.5, r: 0.5, tip: 1.2, px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0 });

    const rand = this.seededRandom(42);
    const count = 18;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.6;
      const elevation = (rand() - 0.5) * Math.PI * 0.5;
      const dist = 0.3 + rand() * 0.9;
      const h = 1.2 + rand() * 2.2;
      const r = 0.12 + rand() * 0.28;
      const tip = h * (0.25 + rand() * 0.15);

      configs.push({
        h, r, tip,
        px: Math.cos(angle) * Math.cos(elevation) * dist,
        py: Math.sin(elevation) * dist * 0.6,
        pz: Math.sin(angle) * Math.cos(elevation) * dist,
        rx: -Math.sin(angle) * 0.35 + (rand() - 0.5) * 0.25,
        ry: rand() * Math.PI * 2,
        rz: Math.cos(angle) * 0.35 + (rand() - 0.5) * 0.25,
      });
    }
    return configs;
  }

  private seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  private createCrystals(): void {
    const configs = this.generateConfigs();

    for (const cfg of configs) {
      const bodyGeom = new THREE.CylinderGeometry(
        cfg.r * 0.75, cfg.r, cfg.h, 6, 1
      );
      const body = new THREE.Mesh(bodyGeom, this.crystalMaterial);

      const tipGeom = new THREE.ConeGeometry(cfg.r * 0.75, cfg.tip, 6, 1);
      const tip = new THREE.Mesh(tipGeom, this.crystalMaterial);
      tip.position.y = cfg.h / 2 + cfg.tip / 2;

      const crystalGroup = new THREE.Group();
      crystalGroup.add(body);
      crystalGroup.add(tip);
      crystalGroup.position.set(cfg.px, cfg.py, cfg.pz);
      crystalGroup.rotation.set(cfg.rx, cfg.ry, cfg.rz);

      this.group.add(crystalGroup);
      this.crystalMeshes.push(body, tip);
    }
  }

  private createGlow(): void {
    const geom = new THREE.IcosahedronGeometry(4.5, 3);
    this.glowSphere = new THREE.Mesh(geom, this.glowMaterial);
    this.glowSphere.position.set(0, 0.5, 0);
    this.group.add(this.glowSphere);
  }

  private createParticles(): void {
    const count = 400;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const offsets = new Float32Array(count);
    const speeds = new Float32Array(count);

    const rand = this.seededRandom(99);
    for (let i = 0; i < count; i++) {
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      const r = 2.5 + rand() * 5;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      sizes[i] = 2.0 + rand() * 4.0;
      offsets[i] = rand();
      speeds[i] = 0.3 + rand() * 0.7;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geom.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 1));
    geom.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));

    this.particles = new THREE.Points(geom, this.particleMaterial);
    this.group.add(this.particles);
  }

  getMeshesForRaycast(): THREE.Mesh[] {
    return this.crystalMeshes;
  }

  pulse(origin: THREE.Vector3): void {
    this.pulseTime = 0;
    this.pulseOrigin.copy(origin);
  }

  update(colors: TimeColors, delta: number): void {
    this._elapsed += delta;

    this.crystalMaterial.uniforms.uBaseColor.value.copy(colors.base);
    this.crystalMaterial.uniforms.uEmissiveColor.value.copy(colors.emissive);
    this.crystalMaterial.uniforms.uTime.value = this._elapsed;

    if (this.pulseTime >= 0) {
      this.pulseTime += delta;
      this.crystalMaterial.uniforms.uPulseTime.value = this.pulseTime;
      this.crystalMaterial.uniforms.uPulseOrigin.value.copy(this.pulseOrigin);
      if (this.pulseTime > 3.5) {
        this.pulseTime = -1;
        this.crystalMaterial.uniforms.uPulseTime.value = -1;
      }
    }

    this.glowMaterial.uniforms.uGlowColor.value.copy(colors.emissive);
    this.glowMaterial.uniforms.uIntensity.value = 0.35 + 0.1 * Math.sin(this._elapsed * 0.5);

    this.particleMaterial.uniforms.uTime.value = this._elapsed;
    this.particleMaterial.uniforms.uParticleColor.value.copy(colors.base).lerp(colors.emissive, 0.5);

    this.pointLight.color.copy(colors.base);
    this.pointLight.intensity = 1.5 + 0.5 * Math.sin(this._elapsed * 0.5);

    const breathe = 1 + Math.sin(this._elapsed * 0.4) * 0.02;
    this.group.scale.set(breathe, breathe, breathe);
  }
}
