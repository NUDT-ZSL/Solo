import * as THREE from 'three';
import {
  FIELD_SIZE,
  PARTICLE_SIZE,
  CONNECTION_DIST,
  MAX_CONNECTIONS,
  RIPPLE_MAX,
  RIPPLE_SPEED,
  RIPPLE_LIFETIME,
  RIPPLE_RADIUS,
  DEFAULT_PARTICLES,
  DEFAULT_WAVE_AMP,
  THEMES,
  type ThemeName,
  type ColorTheme,
  getThemeColor,
  lerp,
} from './utils';

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uWaveAmp;
uniform vec3 uRipplePos[${RIPPLE_MAX}];
uniform float uRippleTime[${RIPPLE_MAX}];
uniform float uRippleActive[${RIPPLE_MAX}];
uniform vec3 uThemeColors[4];
uniform vec3 uWarmColor;
uniform float uFieldSize;

attribute float aSeed;
attribute vec3 aBasePos;

varying vec3 vColor;
varying float vAlpha;
varying float vGlow;

float hexDist(vec2 p) {
  p = abs(p);
  return max(dot(p, vec2(0.866025, 0.5)), p.y);
}

vec4 hexCoords(vec2 uv) {
  vec2 r = vec2(1.0, 1.732);
  vec2 h = r * 0.5;
  vec2 a = mod(uv, r) - h;
  vec2 b = mod(uv + h, r) - h;
  vec2 gv = dot(a, a) < dot(b, b) ? a : b;
  float x = atan(gv.x, gv.y);
  float y = 0.5 - hexDist(gv);
  vec2 id = uv - gv;
  return vec4(x, y, id.x, id.y);
}

void main() {
  vec3 pos = aBasePos;

  float wave1 = sin(pos.x * 0.3 + uTime * 0.8) * cos(pos.z * 0.25 + uTime * 0.6);
  float wave2 = sin(pos.x * 0.15 - pos.z * 0.1 + uTime * 1.2) * 0.5;
  float wave3 = cos(pos.x * 0.4 + pos.z * 0.3 + uTime * 0.5) * 0.3;
  pos.y += (wave1 + wave2 + wave3) * uWaveAmp;

  float rippleEffect = 0.0;
  float rippleWarmth = 0.0;

  for (int i = 0; i < ${RIPPLE_MAX}; i++) {
    if (uRippleActive[i] < 0.5) continue;
    float elapsed = uTime - uRippleTime[i];
    if (elapsed < 0.0 || elapsed > ${RIPPLE_LIFETIME.toFixed(1)}) continue;

    float dist = distance(pos.xz, uRipplePos[i].xz);
    float currentRadius = elapsed * ${RIPPLE_SPEED.toFixed(1)};
    float ringWidth = 3.0;

    float ringDist = abs(dist - currentRadius);
    float ringFactor = smoothstep(ringWidth, 0.0, ringDist);

    float fade = 1.0 - smoothstep(0.0, ${RIPPLE_LIFETIME.toFixed(1)}, elapsed);
    float strength = ringFactor * fade;

    float pushDir = dist > 0.01 ? 1.0 : 0.0;
    pos.y += strength * 1.5 * sin(elapsed * 8.0);

    rippleEffect += strength;
    rippleWarmth += strength * fade;
  }

  float t = aSeed;
  int idx = int(t * 3.0);
  float localT = fract(t * 3.0);
  vec3 col1, col2;
  if (idx == 0) { col1 = uThemeColors[0]; col2 = uThemeColors[1]; }
  else if (idx == 1) { col1 = uThemeColors[1]; col2 = uThemeColors[2]; }
  else { col1 = uThemeColors[2]; col2 = uThemeColors[3]; }
  vec3 baseColor = mix(col1, col2, localT);

  vec3 warmColor = uWarmColor;
  vColor = mix(baseColor, warmColor, clamp(rippleWarmth * 1.5, 0.0, 1.0));

  float baseGlow = 0.5 + 0.3 * sin(uTime * 2.0 + aSeed * 6.28);
  vGlow = baseGlow + rippleEffect * 2.0;

  vAlpha = 0.7 + 0.3 * baseGlow + rippleEffect * 0.5;
  vAlpha = clamp(vAlpha, 0.0, 1.0);

  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = ${PARTICLE_SIZE.toFixed(2)} * (300.0 / -mvPos.z) * (1.0 + rippleEffect * 0.5);
  gl_Position = projectionMatrix * mvPos;
}
`;

const fragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vGlow;

void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;

  float angle = atan(uv.y, uv.x);
  float radius = length(uv);

  float hexRadius = cos(3.14159 / 3.0) / cos(mod(angle, 2.0 * 3.14159 / 6.0) - 3.14159 / 6.0);
  float hexShape = smoothstep(hexRadius + 0.05, hexRadius - 0.1, radius);

  if (hexShape < 0.01) discard;

  float glowFactor = 1.0 - smoothstep(0.0, 0.9, radius);
  glowFactor = pow(glowFactor, 1.5);

  vec3 finalColor = vColor * (0.6 + glowFactor * vGlow);
  finalColor += vColor * glowFactor * 0.5;

  float alpha = hexShape * vAlpha * (0.5 + glowFactor * 0.5);

  gl_FragColor = vec4(finalColor, alpha);
}
`;

interface Ripple {
  position: THREE.Vector3;
  time: number;
  active: boolean;
}

export class ParticleScene {
  scene: THREE.Scene;
  particleMesh: THREE.Points | null = null;
  lightNet: THREE.LineSegments | null = null;
  waterPlane: THREE.Mesh | null = null;

  private positions: Float32Array = new Float32Array(0);
  private seeds: Float32Array = new Float32Array(0);
  private particleCount: number = DEFAULT_PARTICLES;
  private waveAmp: number = DEFAULT_WAVE_AMP;
  private currentTheme: ColorTheme = THEMES.phantom;
  private ripples: Ripple[] = [];
  private material: THREE.ShaderMaterial | null = null;
  private netGeometry: THREE.BufferGeometry | null = null;
  private netMaterial: THREE.LineBasicMaterial | null = null;
  private currentPositions: Float32Array = new Float32Array(0);

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.012);
  }

  init() {
    this.createBackground();
    this.createWaterPlane();
    this.createParticles(this.particleCount);
    this.createLightNet();
    this.initRipples();
  }

  private createBackground() {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(0.5, '#0d1230');
    gradient.addColorStop(1, '#0d1b3e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.LinearFilter;
    this.scene.background = tex;
  }

  private createWaterPlane() {
    const geo = new THREE.PlaneGeometry(FIELD_SIZE * 2, FIELD_SIZE * 2);
    const mat = new THREE.MeshBasicMaterial({
      visible: false,
      side: THREE.DoubleSide,
    });
    this.waterPlane = new THREE.Mesh(geo, mat);
    this.waterPlane.rotation.x = -Math.PI / 2;
    this.waterPlane.position.y = 0;
    this.scene.add(this.waterPlane);
  }

  createParticles(count: number) {
    if (this.particleMesh) {
      this.scene.remove(this.particleMesh);
      this.particleMesh.geometry.dispose();
      if (this.material) this.material.dispose();
    }

    this.particleCount = count;
    this.positions = new Float32Array(count * 3);
    this.seeds = new Float32Array(count);

    const half = FIELD_SIZE / 2;
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * FIELD_SIZE;
      const z = (Math.random() - 0.5) * FIELD_SIZE;
      const y = randomRange(-0.5, 0.5);
      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = z;
      this.seeds[i] = Math.random();
    }

    this.currentPositions = new Float32Array(this.positions);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('aBasePos', new THREE.BufferAttribute(new Float32Array(this.positions), 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(this.seeds, 1));

    const ripplePos = new Float32Array(RIPPLE_MAX * 3);
    const rippleTime = new Float32Array(RIPPLE_MAX);
    const rippleActive = new Float32Array(RIPPLE_MAX);

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uWaveAmp: { value: this.waveAmp },
        uRipplePos: { value: ripplePos },
        uRippleTime: { value: rippleTime },
        uRippleActive: { value: rippleActive },
        uThemeColors: {
          value: this.currentTheme.colors.map((c) => c.clone()),
        },
        uWarmColor: { value: this.currentTheme.warmColor.clone() },
        uFieldSize: { value: FIELD_SIZE },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.particleMesh = new THREE.Points(geometry, this.material);
    this.scene.add(this.particleMesh);
  }

  private createLightNet() {
    if (this.lightNet) {
      this.scene.remove(this.lightNet);
      this.lightNet.geometry.dispose();
      if (this.netMaterial) this.netMaterial.dispose();
    }

    const maxVerts = MAX_CONNECTIONS * 2;
    const positions = new Float32Array(maxVerts * 3);
    const colors = new Float32Array(maxVerts * 4);

    this.netGeometry = new THREE.BufferGeometry();
    this.netGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.netGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
    this.netGeometry.setDrawRange(0, 0);

    this.netMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.lightNet = new THREE.LineSegments(this.netGeometry, this.netMaterial);
    this.scene.add(this.lightNet);
  }

  private initRipples() {
    this.ripples = [];
    for (let i = 0; i < RIPPLE_MAX; i++) {
      this.ripples.push({
        position: new THREE.Vector3(),
        time: -100,
        active: false,
      });
    }
  }

  addRipple(point: THREE.Vector3) {
    let oldest = 0;
    let oldestTime = Infinity;
    for (let i = 0; i < this.ripples.length; i++) {
      if (!this.ripples[i].active) {
        oldest = i;
        break;
      }
      if (this.ripples[i].time < oldestTime) {
        oldestTime = this.ripples[i].time;
        oldest = i;
      }
    }
    this.ripples[oldest].position.copy(point);
    this.ripples[oldest].time = this.material!.uniforms.uTime.value;
    this.ripples[oldest].active = true;
  }

  setWaveAmp(amp: number) {
    this.waveAmp = amp;
    if (this.material) {
      this.material.uniforms.uWaveAmp.value = amp;
    }
  }

  setTheme(themeName: ThemeName) {
    this.currentTheme = THEMES[themeName];
    if (this.material) {
      const colors = this.material.uniforms.uThemeColors.value as THREE.Color[];
      for (let i = 0; i < 4; i++) {
        colors[i].copy(this.currentTheme.colors[i]);
      }
      this.material.uniforms.uWarmColor.value.copy(this.currentTheme.warmColor);
    }
    this.updateBackground();
  }

  private updateBackground() {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    const [r1, g1, b1] = [0.039, 0.039, 0.102];
    const [r2, g2, b2] = [this.currentTheme.bgColor[0], this.currentTheme.bgColor[1], 0.24];
    gradient.addColorStop(0, `rgb(${(r1 * 255) | 0},${(g1 * 255) | 0},${(b1 * 255) | 0})`);
    gradient.addColorStop(1, `rgb(${(r2 * 255) | 0},${(g2 * 255) | 0},${(b2 * 255) | 0})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const tex = (this.scene.background as THREE.CanvasTexture);
    if (tex && tex.image) {
      tex.image = canvas;
      tex.needsUpdate = true;
    }
  }

  update(time: number, camera: THREE.Camera) {
    if (!this.material || !this.particleMesh) return;

    this.material.uniforms.uTime.value = time;

    const ripplePos = this.material.uniforms.uRipplePos.value as Float32Array;
    const rippleTime = this.material.uniforms.uRippleTime.value as Float32Array;
    const rippleActive = this.material.uniforms.uRippleActive.value as Float32Array;

    for (let i = 0; i < RIPPLE_MAX; i++) {
      const r = this.ripples[i];
      ripplePos[i * 3] = r.position.x;
      ripplePos[i * 3 + 1] = r.position.y;
      ripplePos[i * 3 + 2] = r.position.z;
      rippleTime[i] = r.time;

      if (r.active && time - r.time > RIPPLE_LIFETIME) {
        r.active = false;
      }
      rippleActive[i] = r.active ? 1.0 : 0.0;
    }

    this.updateParticlePositions(time);
    this.updateLightNet(time);
  }

  private updateParticlePositions(time: number) {
    const basePosAttr = this.particleMesh!.geometry.getAttribute('aBasePos') as THREE.BufferAttribute;
    const arr = basePosAttr.array as Float32Array;

    for (let i = 0; i < this.particleCount; i++) {
      const bx = this.positions[i * 3];
      const bz = this.positions[i * 3 + 2];

      const dx = Math.sin(bx * 0.05 + time * 0.1) * 0.3;
      const dz = Math.cos(bz * 0.05 + time * 0.08) * 0.3;

      arr[i * 3] = bx + dx;
      arr[i * 3 + 1] = this.positions[i * 3 + 1];
      arr[i * 3 + 2] = bz + dz;

      this.currentPositions[i * 3] = arr[i * 3];
      this.currentPositions[i * 3 + 1] = arr[i * 3 + 1];
      this.currentPositions[i * 3 + 2] = arr[i * 3 + 2];
    }
    basePosAttr.needsUpdate = true;
  }

  private updateLightNet(_time: number) {
    if (!this.netGeometry || !this.lightNet) return;

    const posAttr = this.netGeometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.netGeometry.getAttribute('color') as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;
    const colArr = colAttr.array as Float32Array;

    let lineIdx = 0;
    const maxLines = MAX_CONNECTIONS;
    const dist2 = CONNECTION_DIST * CONNECTION_DIST;
    const themeColors = this.currentTheme.colors;
    const count = this.particleCount;

    const step = count > 4000 ? 3 : count > 2000 ? 2 : 1;

    for (let i = 0; i < count && lineIdx < maxLines; i += step) {
      const ix = this.currentPositions[i * 3];
      const iy = this.currentPositions[i * 3 + 1];
      const iz = this.currentPositions[i * 3 + 2];

      for (let j = i + step; j < count && lineIdx < maxLines; j += step) {
        const jx = this.currentPositions[j * 3];
        const jy = this.currentPositions[j * 3 + 1];
        const jz = this.currentPositions[j * 3 + 2];

        const dx = ix - jx;
        const dy = iy - jy;
        const dz = iz - jz;
        const d2 = dx * dx + dy * dy + dz * dz;

        if (d2 < dist2) {
          const v = lineIdx * 2;
          posArr[v * 3] = ix;
          posArr[v * 3 + 1] = iy;
          posArr[v * 3 + 2] = iz;
          posArr[(v + 1) * 3] = jx;
          posArr[(v + 1) * 3 + 1] = jy;
          posArr[(v + 1) * 3 + 2] = jz;

          const alpha = 1.0 - Math.sqrt(d2) / CONNECTION_DIST;
          const ci = (this.seeds[i] * 3) | 0;
          const cj = (this.seeds[j] * 3) | 0;
          const c1 = themeColors[ci % themeColors.length];
          const c2 = themeColors[cj % themeColors.length];

          colArr[v * 4] = c1.r;
          colArr[v * 4 + 1] = c1.g;
          colArr[v * 4 + 2] = c1.b;
          colArr[v * 4 + 3] = alpha * 0.4;
          colArr[(v + 1) * 4] = c2.r;
          colArr[(v + 1) * 4 + 1] = c2.g;
          colArr[(v + 1) * 4 + 2] = c2.b;
          colArr[(v + 1) * 4 + 3] = alpha * 0.4;

          lineIdx++;
        }
      }
    }

    this.netGeometry.setDrawRange(0, lineIdx * 2);
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  getParticleCount(): number {
    return this.particleCount;
  }

  getWaveAmp(): number {
    return this.waveAmp;
  }

  getTheme(): ThemeName {
    return this.currentTheme.name;
  }

  dispose() {
    if (this.particleMesh) {
      this.particleMesh.geometry.dispose();
      this.material?.dispose();
    }
    if (this.lightNet) {
      this.lightNet.geometry.dispose();
      this.netMaterial?.dispose();
    }
    if (this.waterPlane) {
      this.waterPlane.geometry.dispose();
      (this.waterPlane.material as THREE.Material).dispose();
    }
  }
}

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}
