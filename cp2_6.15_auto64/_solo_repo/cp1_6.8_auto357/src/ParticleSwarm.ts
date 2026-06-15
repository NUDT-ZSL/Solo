import * as THREE from 'three';
import { ColorTheme } from './AuroraDome';

const SWARM_VERTEX_SHADER = `
  uniform float uTime;
  uniform float uAudioLevel;
  uniform float uAudioBass;
  uniform float uAudioMid;
  uniform float uAudioTreble;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uRippleOrigins[5];
  uniform float uRippleTimes[5];
  uniform float uRippleActives[5];

  attribute vec3 aVelocity;
  attribute float aSize;
  attribute float aPhase;
  attribute float aFreqBand;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vTrail;

  void main() {
    vec3 pos = position;

    float drift = uTime * 0.15;
    pos.x += sin(drift + aPhase) * 0.5 + aVelocity.x * uTime * 0.08;
    pos.y += cos(drift * 0.7 + aPhase * 1.3) * 0.3 + aVelocity.y * uTime * 0.05;
    pos.z += sin(drift * 0.5 + aPhase * 0.8) * 0.4 + aVelocity.z * uTime * 0.07;

    pos.y += sin(uTime * 0.2 + aPhase * 2.0) * 0.5;

    pos += aVelocity * uAudioLevel * 3.0 * vec3(
      sin(uTime * 2.0 + aPhase),
      cos(uTime * 1.5 + aPhase * 1.7),
      sin(uTime * 1.8 + aPhase * 0.6)
    );

    for (int i = 0; i < 5; i++) {
      if (uRippleActives[i] < 0.5) continue;
      float elapsed = uTime - uRippleTimes[i];
      if (elapsed < 0.0 || elapsed > 3.0) continue;
      vec3 toPart = pos - uRippleOrigins[i];
      float dist = length(toPart);
      float waveRadius = elapsed * 8.0;
      float waveDist = abs(dist - waveRadius);
      float waveWidth = 2.0 + elapsed * 1.5;
      float influence = exp(-waveDist * waveDist / (waveWidth * waveWidth));
      influence *= exp(-elapsed * 1.2);
      pos += normalize(toPart) * influence * 2.0;
    }

    float distFromCenter = length(pos.xz);
    if (distFromCenter > 14.0) {
      pos.xz *= 14.0 / distFromCenter;
    }
    pos.y = clamp(pos.y, -2.0, 15.0);

    float bandFactor = aFreqBand;
    vec3 freqColor;
    if (bandFactor < 0.33) {
      freqColor = mix(uColorA, uColorB, uAudioBass);
    } else if (bandFactor < 0.66) {
      freqColor = mix(uColorA, uColorB, uAudioMid);
    } else {
      freqColor = mix(uColorA, uColorB, uAudioTreble);
    }
    vColor = freqColor;
    vAlpha = 0.6 + uAudioLevel * 0.4;

    vec3 motionDir = aVelocity * uAudioLevel + vec3(
      sin(uTime * 2.0 + aPhase),
      cos(uTime * 1.5 + aPhase),
      sin(uTime * 1.8 + aPhase)
    ) * 0.3;
    vTrail = length(motionDir);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    float baseSize = aSize * (1.0 + uAudioLevel * 1.5 + uAudioBass * 0.8);
    gl_PointSize = baseSize * (250.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const SWARM_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vTrail;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv) * 2.0;
    if (d > 1.0) discard;

    float core = exp(-d * d * 8.0);
    float glow = exp(-d * d * 2.0);
    float halo = exp(-d * 1.5) * 0.3;

    float alpha = (core + glow * 0.5 + halo) * vAlpha;
    vec3 color = vColor * (1.0 + core * 1.5);

    gl_FragColor = vec4(color, alpha);
  }
`;

const MAX_PARTICLES = 10000;

interface RippleState {
  origin: THREE.Vector3;
  startTime: number;
  active: boolean;
}

export class ParticleSwarm {
  private mesh: THREE.Points;
  private material: THREE.ShaderMaterial;
  private rippleStates: RippleState[] = [];
  private currentCount: number = MAX_PARTICLES;
  private targetCount: number = MAX_PARTICLES;

  private targetColorA: THREE.Color = new THREE.Color(0x00ff88);
  private targetColorB: THREE.Color = new THREE.Color(0xcc77ff);
  private lerpedColorA: THREE.Color = new THREE.Color(0x00ff88);
  private lerpedColorB: THREE.Color = new THREE.Color(0xcc77ff);

  constructor() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_PARTICLES * 3);
    const velocities = new Float32Array(MAX_PARTICLES * 3);
    const sizes = new Float32Array(MAX_PARTICLES);
    const phases = new Float32Array(MAX_PARTICLES);
    const freqBands = new Float32Array(MAX_PARTICLES);

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.6;
      const r = 2 + Math.random() * 10;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.random() * 12 - 1;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      velocities[i * 3] = (Math.random() - 0.5) * 0.5;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.3;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5;

      sizes[i] = 2.0 + Math.random() * 4.0;
      phases[i] = Math.random() * Math.PI * 2;
      freqBands[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute('aFreqBand', new THREE.BufferAttribute(freqBands, 1));

    const rippleOrigins = new Float32Array(15);
    const rippleTimes = new Float32Array(5);
    const rippleActives = new Float32Array(5);

    this.material = new THREE.ShaderMaterial({
      vertexShader: SWARM_VERTEX_SHADER,
      fragmentShader: SWARM_FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uAudioLevel: { value: 0 },
        uAudioBass: { value: 0 },
        uAudioMid: { value: 0 },
        uAudioTreble: { value: 0 },
        uColorA: { value: this.lerpedColorA },
        uColorB: { value: this.lerpedColorB },
        uRippleOrigins: { value: rippleOrigins },
        uRippleTimes: { value: rippleTimes },
        uRippleActives: { value: rippleActives },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.mesh = new THREE.Points(geometry, this.material);
    this.mesh.frustumCulled = false;

    for (let i = 0; i < 5; i++) {
      this.rippleStates.push({ origin: new THREE.Vector3(), startTime: 0, active: false });
    }
  }

  get object(): THREE.Points {
    return this.mesh;
  }

  setTheme(theme: ColorTheme) {
    const themeMap: Record<ColorTheme, { a: number; b: number }> = {
      aurora: { a: 0x00ff88, b: 0xcc77ff },
      flame: { a: 0xff4400, b: 0xffdd00 },
      ocean: { a: 0x0066cc, b: 0x00eeff },
    };
    this.targetColorA.set(themeMap[theme].a);
    this.targetColorB.set(themeMap[theme].b);
  }

  setDensity(ratio: number) {
    this.targetCount = Math.max(500, Math.floor(MAX_PARTICLES * ratio));
  }

  triggerRipple(origin: THREE.Vector3, time: number) {
    const oldest = this.rippleStates.reduce((prev, curr, idx) => {
      if (!curr.active) return idx;
      return curr.startTime < this.rippleStates[prev].startTime ? idx : prev;
    }, 0);

    this.rippleStates[oldest].origin.copy(origin);
    this.rippleStates[oldest].startTime = time;
    this.rippleStates[oldest].active = true;
  }

  update(time: number, audioData: { level: number; bass: number; mid: number; treble: number }) {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uAudioLevel.value = audioData.level;
    this.material.uniforms.uAudioBass.value = audioData.bass;
    this.material.uniforms.uAudioMid.value = audioData.mid;
    this.material.uniforms.uAudioTreble.value = audioData.treble;

    this.lerpedColorA.lerp(this.targetColorA, 0.03);
    this.lerpedColorB.lerp(this.targetColorB, 0.03);
    this.material.uniforms.uColorA.value = this.lerpedColorA;
    this.material.uniforms.uColorB.value = this.lerpedColorB;

    const rippleOrigins = this.material.uniforms.uRippleOrigins.value as Float32Array;
    const rippleTimes = this.material.uniforms.uRippleTimes.value as Float32Array;
    const rippleActives = this.material.uniforms.uRippleActives.value as Float32Array;

    for (let i = 0; i < 5; i++) {
      const state = this.rippleStates[i];
      if (state.active && time - state.startTime > 3.0) {
        state.active = false;
      }
      rippleOrigins[i * 3] = state.origin.x;
      rippleOrigins[i * 3 + 1] = state.origin.y;
      rippleOrigins[i * 3 + 2] = state.origin.z;
      rippleTimes[i] = state.startTime;
      rippleActives[i] = state.active ? 1.0 : 0.0;
    }

    if (this.currentCount !== this.targetCount) {
      const step = Math.ceil(Math.abs(this.targetCount - this.currentCount) * 0.1);
      if (this.currentCount < this.targetCount) {
        this.currentCount = Math.min(this.currentCount + step, this.targetCount);
      } else {
        this.currentCount = Math.max(this.currentCount - step, this.targetCount);
      }
      this.mesh.geometry.setDrawRange(0, this.currentCount);
    }
  }
}
