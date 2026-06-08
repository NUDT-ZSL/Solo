import * as THREE from 'three';
import { CONFIG, THEMES, ThemeName } from './config';

const vertexShader = `
  attribute float aSize;
  attribute float aPhase;
  attribute float aDensity;

  uniform float uTime;
  uniform float uPulseAmount;
  uniform float uShockActive;
  uniform vec3 uShockOrigin;
  uniform float uShockAge;
  uniform float uDensityThreshold;
  uniform float uIdleFactor;
  uniform vec3 uColorStart;
  uniform vec3 uColorMid;
  uniform vec3 uColorEnd;
  uniform float uTunnelLength;
  uniform float uCameraZ;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 pos = position;
    vAlpha = 1.0;

    if (aDensity > uDensityThreshold) {
      vAlpha = 0.0;
    }

    float halfLen = uTunnelLength * 0.5;
    float relativeZ = pos.z - uCameraZ;
    float t = clamp((relativeZ + halfLen) / uTunnelLength, 0.0, 1.0);

    vec3 baseColor = t < 0.5
      ? mix(uColorStart, uColorMid, t * 2.0)
      : mix(uColorMid, uColorEnd, (t - 0.5) * 2.0);
    vColor = baseColor;

    float pulse = 1.0 + sin(uTime * 2.0 + aPhase) * uPulseAmount;

    if (uIdleFactor > 0.01) {
      float distort = uIdleFactor * sin(pos.z * 0.12 + uTime * 0.5) * 0.35;
      pos.x += distort * cos(uTime * 0.37);
      pos.y += distort * sin(uTime * 0.29);
    }

    if (uShockActive > 0.5) {
      float dist = distance(pos, uShockOrigin);
      float shockRadius = uShockAge * ${CONFIG.shockExpandSpeed.toFixed(1)};
      float ringDist = abs(dist - shockRadius);
      float shockWidth = ${CONFIG.shockWidth.toFixed(1)};

      if (ringDist < shockWidth) {
        float factor = 1.0 - ringDist / shockWidth;
        factor *= factor;
        vec3 dir = normalize(pos - uShockOrigin);
        pos += dir * factor * ${CONFIG.shockForce.toFixed(1)};
        vColor = mix(vColor, vec3(1.0, 1.0, 1.0), factor * 0.85);
        vAlpha = max(vAlpha, 0.3 + factor * 0.7);
      }
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    float pointSize = aSize * pulse * (250.0 / max(-mvPosition.z, 1.0));
    gl_PointSize = max(pointSize, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    if (vAlpha < 0.01) discard;

    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    alpha *= vAlpha;

    float glow = exp(-dist * 5.0) * 0.4;
    vec3 color = vColor + vColor * glow;

    gl_FragColor = vec4(color, alpha * 0.85);
  }
`;

export class ParticleSystem {
  private mesh: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private positions: Float32Array;
  private sizes: Float32Array;
  private phases: Float32Array;
  private densityValues: Float32Array;
  private shockActive = false;
  private shockAge = 0;
  private shockOrigin = new THREE.Vector3();
  private currentTheme: ThemeName = 'default';
  private count: number;

  constructor(scene: THREE.Scene) {
    this.count = CONFIG.particleCount;
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.count * 3);
    this.sizes = new Float32Array(this.count);
    this.phases = new Float32Array(this.count);
    this.densityValues = new Float32Array(this.count);

    this.generateParticles();

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aPhase', new THREE.BufferAttribute(this.phases, 1));
    this.geometry.setAttribute('aDensity', new THREE.BufferAttribute(this.densityValues, 1));

    const theme = THEMES[this.currentTheme];
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uPulseAmount: { value: CONFIG.pulseAmount },
        uShockActive: { value: 0 },
        uShockOrigin: { value: new THREE.Vector3() },
        uShockAge: { value: 0 },
        uDensityThreshold: { value: 0.5 },
        uIdleFactor: { value: 0 },
        uColorStart: { value: theme.start.clone() },
        uColorMid: { value: theme.mid.clone() },
        uColorEnd: { value: theme.end.clone() },
        uTunnelLength: { value: CONFIG.tunnelLength },
        uCameraZ: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });

    this.mesh = new THREE.Points(this.geometry, this.material);
    scene.add(this.mesh);
  }

  private generateParticles(): void {
    const { tunnelRadius, tunnelLength, helixCount, helixSpiralFactor } = CONFIG;
    const halfLen = tunnelLength * 0.5;

    for (let i = 0; i < this.count; i++) {
      const t = Math.random();
      const z = (t - 0.5) * tunnelLength;

      let x: number, y: number;
      const isStrand = Math.random() < 0.6;

      if (isStrand) {
        const strand = Math.floor(Math.random() * helixCount);
        const baseAngle = (strand / helixCount) * Math.PI * 2;
        const spiralAngle = baseAngle + z * helixSpiralFactor;
        const r = tunnelRadius + (Math.random() - 0.5) * 0.8;
        x = Math.cos(spiralAngle) * r;
        y = Math.sin(spiralAngle) * r;
      } else {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * tunnelRadius * 0.9;
        x = Math.cos(angle) * r;
        y = Math.sin(angle) * r;
      }

      x += (Math.random() - 0.5) * 0.25;
      y += (Math.random() - 0.5) * 0.25;

      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = z;

      this.sizes[i] = 0.6 + Math.random() * 1.8;
      this.phases[i] = Math.random() * Math.PI * 2;
      this.densityValues[i] = Math.random();
    }
  }

  update(delta: number, cameraZ: number, speedMultiplier: number, idleFactor: number): void {
    const uniforms = this.material.uniforms;
    uniforms.uTime.value += delta;
    uniforms.uCameraZ.value = cameraZ;
    uniforms.uIdleFactor.value = idleFactor;

    if (this.shockActive) {
      this.shockAge += delta;
      if (this.shockAge >= CONFIG.shockDuration) {
        this.shockActive = false;
        uniforms.uShockActive.value = 0;
        uniforms.uShockAge.value = 0;
      } else {
        uniforms.uShockAge.value = this.shockAge;
      }
    }

    this.recycleParticles(cameraZ);

    const rotSpeed = CONFIG.rotationSpeed * speedMultiplier * (1 + idleFactor * CONFIG.idleMaxAccel);
    this.mesh.rotation.z += rotSpeed * delta;
  }

  private recycleParticles(cameraZ: number): void {
    const halfWindow = CONFIG.tunnelWindow * 0.5;
    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    let needsUpdate = false;

    for (let i = 0; i < this.count; i++) {
      const iz = i * 3 + 2;
      const z = this.positions[iz];
      const relZ = z - cameraZ;

      if (relZ < -halfWindow) {
        this.positions[iz] += CONFIG.tunnelWindow;
        needsUpdate = true;
      } else if (relZ > halfWindow) {
        this.positions[iz] -= CONFIG.tunnelWindow;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      posAttr.needsUpdate = true;
    }
  }

  triggerShock(origin: THREE.Vector3): void {
    this.shockActive = true;
    this.shockAge = 0;
    this.shockOrigin.copy(origin);
    this.material.uniforms.uShockActive.value = 1;
    this.material.uniforms.uShockOrigin.value.copy(origin);
    this.material.uniforms.uShockAge.value = 0;
  }

  setDensity(value: number): void {
    this.material.uniforms.uDensityThreshold.value = value;
  }

  setTheme(theme: ThemeName): void {
    this.currentTheme = theme;
    const colors = THEMES[theme];
    this.material.uniforms.uColorStart.value.copy(colors.start);
    this.material.uniforms.uColorMid.value.copy(colors.mid);
    this.material.uniforms.uColorEnd.value.copy(colors.end);
  }

  getMesh(): THREE.Points {
    return this.mesh;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
