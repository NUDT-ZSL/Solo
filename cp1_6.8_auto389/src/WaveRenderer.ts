import * as THREE from 'three';
import { WaveSource } from './WaveSource';

const MAX_SOURCES = 20;
const PARTICLE_COUNT = 4000;
const PLANE_SIZE = 60;

const waveVertexShader = /* glsl */ `
varying vec2 vWorldPos;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const waveFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vWorldPos;

#define MAX_SOURCES ${MAX_SOURCES}

uniform vec4 uSources[MAX_SOURCES];
uniform int uSourceCount;
uniform float uTime;
uniform float uWaveSpeed;
uniform vec3 uColorCenter;
uniform vec3 uColorEdge;
uniform vec2 uResolution;

void main() {
  vec2 screenUv = gl_FragCoord.xy / uResolution;
  float screenDist = length(screenUv - 0.5);
  vec3 bgColor = mix(
    vec3(0.03, 0.0, 0.08),
    vec3(0.0, 0.0, 0.02),
    screenDist
  );

  float bgWorldDist = length(vWorldPos);
  bgColor *= 1.0 - smoothstep(20.0, 30.0, bgWorldDist) * 0.5;

  vec3 totalColor = vec3(0.0);
  float totalIntensity = 0.0;

  for (int i = 0; i < MAX_SOURCES; i++) {
    if (i >= uSourceCount) break;

    vec2 sourcePos = uSources[i].xy;
    float creationTime = uSources[i].z;
    float srcFlag = uSources[i].w;

    if (srcFlag < 0.5) continue;

    float age = uTime - creationTime;
    if (age < 0.0) continue;

    float dist = length(vWorldPos - sourcePos);
    float expandedRadius = age * uWaveSpeed * 2.5;

    if (dist > expandedRadius + 1.5) continue;

    float frequency = 14.0;
    float phase = dist * frequency - age * uWaveSpeed * 9.0;
    float rawRing = sin(phase);

    float ring = pow(max(rawRing, 0.0), 12.0);
    float glow = pow(max(rawRing, 0.0), 2.5) * 0.12;
    float pattern = ring + glow;

    float distFade = exp(-dist * 0.07);
    float ageFade = 1.0 / (1.0 + age * 0.015);
    float frontEdge = smoothstep(expandedRadius + 0.2, expandedRadius - 0.4, dist);

    float birthBoost = 1.0 + exp(-age * 2.5) * 0.8;

    float intensity = pattern * distFade * ageFade * frontEdge * birthBoost;

    float colorMix = smoothstep(0.0, max(expandedRadius, 0.1), dist);
    vec3 ringColor = mix(uColorCenter, uColorEdge, colorMix);

    float pulse = exp(-age * 4.0) * smoothstep(2.0, 0.0, dist);

    totalColor += ringColor * intensity;
    totalColor += uColorCenter * pulse * 0.6;
    totalIntensity += intensity;
  }

  float interference = max(totalIntensity - 0.6, 0.0);
  totalColor += vec3(0.9, 0.95, 1.0) * interference * 0.25;

  float vignette = 1.0 - smoothstep(18.0, 30.0, bgWorldDist) * 0.6;
  totalColor *= vignette;

  vec3 finalColor = bgColor + totalColor;

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

const particleVertexShader = /* glsl */ `
attribute float aPhase;
attribute float aSize;

varying float vIntensity;
varying float vPhase;

#define MAX_SOURCES ${MAX_SOURCES}

uniform vec4 uSources[MAX_SOURCES];
uniform int uSourceCount;
uniform float uTime;
uniform float uWaveSpeed;

void main() {
  vec2 pos = position.xz;
  float totalWave = 0.0;

  for (int i = 0; i < MAX_SOURCES; i++) {
    if (i >= uSourceCount) break;

    vec2 sourcePos = uSources[i].xy;
    float creationTime = uSources[i].z;
    float srcFlag = uSources[i].w;

    if (srcFlag < 0.5) continue;

    float age = uTime - creationTime;
    if (age < 0.0) continue;

    float dist = length(pos - sourcePos);
    float expandedRadius = age * uWaveSpeed * 2.5;

    if (dist > expandedRadius + 1.5) continue;

    float frequency = 14.0;
    float phase = dist * frequency - age * uWaveSpeed * 9.0;
    float ring = pow(max(sin(phase), 0.0), 8.0);
    float distFade = exp(-dist * 0.07);
    float ageFade = 1.0 / (1.0 + age * 0.015);
    float frontEdge = smoothstep(expandedRadius + 0.2, expandedRadius - 0.4, dist);

    totalWave += ring * distFade * ageFade * frontEdge;
  }

  vIntensity = totalWave;
  vPhase = aPhase;

  vec3 particlePos = position;
  particlePos.y += 0.15 + sin(uTime * 1.5 + aPhase * 6.28) * 0.08;

  vec4 mvPosition = modelViewMatrix * vec4(particlePos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float size = aSize * totalWave * 2.5;
  gl_PointSize = max(size * (250.0 / -mvPosition.z), 0.0);
}
`;

const particleFragmentShader = /* glsl */ `
precision highp float;

varying float vIntensity;
varying float vPhase;

uniform float uTime;
uniform vec3 uColorCenter;
uniform vec3 uColorEdge;

void main() {
  float dist = length(gl_PointCoord - 0.5) * 2.0;
  if (dist > 1.0) discard;

  float alpha = 1.0 - smoothstep(0.2, 1.0, dist);

  float twinkle = 0.5 + 0.5 * sin(uTime * 6.0 + vPhase * 6.28);

  vec3 color = mix(uColorCenter, uColorEdge, 0.4);
  color = mix(color, vec3(1.0), 0.35);

  float finalAlpha = alpha * vIntensity * twinkle;

  if (finalAlpha < 0.005) discard;

  gl_FragColor = vec4(color, finalAlpha);
}
`;

export interface WaveSettings {
  waveSpeed: number;
  colorCenter: THREE.Color;
  colorEdge: THREE.Color;
}

export class WaveRenderer {
  private scene: THREE.Scene;
  private groundPlane: THREE.Mesh;
  private particles: THREE.Points;
  private sourceUniforms: THREE.Vector4[];
  private waveMaterial: THREE.ShaderMaterial;
  private particleMaterial: THREE.ShaderMaterial;

  constructor(scene: THREE.Scene, settings: WaveSettings) {
    this.scene = scene;

    this.sourceUniforms = Array.from(
      { length: MAX_SOURCES },
      () => new THREE.Vector4(0, 0, -1000, 0)
    );

    this.waveMaterial = new THREE.ShaderMaterial({
      vertexShader: waveVertexShader,
      fragmentShader: waveFragmentShader,
      uniforms: {
        uSources: { value: this.sourceUniforms },
        uSourceCount: { value: 0 },
        uTime: { value: 0 },
        uWaveSpeed: { value: settings.waveSpeed },
        uColorCenter: { value: settings.colorCenter },
        uColorEdge: { value: settings.colorEdge },
        uResolution: {
          value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
      },
      side: THREE.DoubleSide,
    });

    const planeGeo = new THREE.PlaneGeometry(PLANE_SIZE, PLANE_SIZE, 1, 1);
    planeGeo.rotateX(-Math.PI / 2);
    this.groundPlane = new THREE.Mesh(planeGeo, this.waveMaterial);
    this.scene.add(this.groundPlane);

    const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    const particlePhases = new Float32Array(PARTICLE_COUNT);
    const particleSizes = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = (Math.random() - 0.5) * PLANE_SIZE * 0.9;
      const z = (Math.random() - 0.5) * PLANE_SIZE * 0.9;
      particlePositions[i * 3] = x;
      particlePositions[i * 3 + 1] = 0.1;
      particlePositions[i * 3 + 2] = z;
      particlePhases[i] = Math.random();
      particleSizes[i] = 0.5 + Math.random() * 1.5;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(particlePositions, 3)
    );
    particleGeo.setAttribute(
      'aPhase',
      new THREE.BufferAttribute(particlePhases, 1)
    );
    particleGeo.setAttribute(
      'aSize',
      new THREE.BufferAttribute(particleSizes, 1)
    );

    this.particleMaterial = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      uniforms: {
        uSources: { value: this.sourceUniforms },
        uSourceCount: { value: 0 },
        uTime: { value: 0 },
        uWaveSpeed: { value: settings.waveSpeed },
        uColorCenter: { value: settings.colorCenter },
        uColorEdge: { value: settings.colorEdge },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particles = new THREE.Points(particleGeo, this.particleMaterial);
    this.scene.add(this.particles);
  }

  getGroundPlane(): THREE.Mesh {
    return this.groundPlane;
  }

  update(sources: WaveSource[], time: number): void {
    for (let i = 0; i < MAX_SOURCES; i++) {
      if (i < sources.length) {
        const s = sources[i];
        this.sourceUniforms[i].set(s.position.x, s.position.z, s.creationTime, 1);
      } else {
        this.sourceUniforms[i].set(0, 0, -1000, 0);
      }
    }

    this.waveMaterial.uniforms.uSourceCount.value = sources.length;
    this.waveMaterial.uniforms.uTime.value = time;
    this.particleMaterial.uniforms.uSourceCount.value = sources.length;
    this.particleMaterial.uniforms.uTime.value = time;
  }

  updateSpeed(speed: number): void {
    this.waveMaterial.uniforms.uWaveSpeed.value = speed;
    this.particleMaterial.uniforms.uWaveSpeed.value = speed;
  }

  updateColors(center: THREE.Color, edge: THREE.Color): void {
    this.waveMaterial.uniforms.uColorCenter.value = center;
    this.waveMaterial.uniforms.uColorEdge.value = edge;
    this.particleMaterial.uniforms.uColorCenter.value = center;
    this.particleMaterial.uniforms.uColorEdge.value = edge;
  }

  onResize(): void {
    this.waveMaterial.uniforms.uResolution.value.set(
      window.innerWidth,
      window.innerHeight
    );
  }
}
