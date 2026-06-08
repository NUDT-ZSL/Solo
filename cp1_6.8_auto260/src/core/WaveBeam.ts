import * as THREE from 'three';
import { lerp, clamp } from '../utils/animation';

export interface WaveBeamOptions {
  beamWidth?: number;
  length?: number;
  color?: THREE.Color;
}

interface PulseWave {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  age: number;
  maxAge: number;
  intensity: number;
  direction: number;
}

export class WaveBeam {
  group: THREE.Group;
  beamWidth: number;
  beamLength: number;
  baseColor: THREE.Color;
  waves: PulseWave[];
  private pooledWaves: PulseWave[];

  constructor(opts: WaveBeamOptions = {}) {
    this.beamWidth = opts.beamWidth ?? 0.4;
    this.beamLength = opts.length ?? 18;
    this.baseColor = opts.color ?? new THREE.Color(0.5, 0.3, 1.0);
    this.group = new THREE.Group();
    this.waves = [];
    this.pooledWaves = [];
  }

  private acquireWave(): PulseWave {
    if (this.pooledWaves.length > 0) {
      const pooled = this.pooledWaves.pop()!;
      pooled.age = 0;
      pooled.intensity = 1;
      pooled.direction = 1;
      pooled.mesh.visible = true;
      this.group.add(pooled.mesh);
      return pooled;
    }

    const geo = new THREE.ConeGeometry(1, 1, 64, 1, true);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uAge: { value: 0 },
        uIntensity: { value: 1 },
        uColor: { value: this.baseColor.clone() },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uAge;
        uniform float uIntensity;
        uniform vec3 uColor;
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          float fade = 1.0 - smoothstep(0.5, 1.0, uAge);
          float edge = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 0.8);
          float distFade = 1.0 - vUv.y;
          vec3 col = mix(vec3(0.3, 0.15, 0.8), uColor, vUv.y);
          col += vec3(0.3, 0.5, 1.0) * uIntensity * 0.5;
          float alpha = fade * (0.2 + edge * 0.4) * distFade * uIntensity;
          alpha *= smoothstep(0.0, 0.08, vUv.y);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geo, mat);
    this.group.add(mesh);

    return { mesh, material: mat, age: 0, maxAge: 2.5, intensity: 1, direction: 1 };
  }

  emit(intensity: number = 1.0) {
    const dirs = [1, -1];
    for (const dir of dirs) {
      const wave = this.acquireWave();
      wave.intensity = clamp(intensity, 0.5, 2.5);
      wave.maxAge = lerp(3.5, 1.8, clamp(intensity / 2, 0, 1));
      wave.direction = dir;

      const h = this.beamLength * (0.7 + intensity * 0.3);
      const r = this.beamWidth * 3;
      wave.mesh.scale.set(r, h, r);
      wave.mesh.rotation.x = dir > 0 ? 0 : Math.PI;
      wave.mesh.position.y = dir * h * 0.5;

      wave.material.uniforms.uColor.value.copy(this.baseColor);
      this.waves.push(wave);
    }
  }

  setBeamWidth(width: number) {
    this.beamWidth = width;
  }

  update(delta: number) {
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const wave = this.waves[i];
      wave.age += delta;

      const progress = clamp(wave.age / wave.maxAge, 0, 1);
      const fade = 1.0 - smoothstepLocal(0.5, 1.0, progress);
      const currentIntensity = wave.intensity * fade;

      wave.material.uniforms.uAge.value = progress;
      wave.material.uniforms.uIntensity.value = currentIntensity;

      const expand = 1 + progress * 0.6;
      const r = this.beamWidth * 3 * expand;
      const h = this.beamLength * (0.7 + wave.intensity * 0.3) * (1 - progress * 0.2);
      wave.mesh.scale.set(r, h, r);
      wave.mesh.position.y = wave.direction * h * 0.5;

      if (wave.age >= wave.maxAge) {
        wave.mesh.visible = false;
        this.group.remove(wave.mesh);
        this.pooledWaves.push(wave);
        this.waves.splice(i, 1);
      }
    }
  }

  dispose() {
    const all = [...this.waves, ...this.pooledWaves];
    for (const wave of all) {
      wave.mesh.geometry.dispose();
      wave.material.dispose();
    }
    this.waves.length = 0;
    this.pooledWaves.length = 0;
  }
}

function smoothstepLocal(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
