import * as THREE from 'three';
import {
  AuroraParams,
  DEFAULT_PARAMS,
  computeAuroraY,
  computeAuroraIntensity,
  computeAuroraColor,
  BurstState,
  computeBurstDisplacement,
  noise3D,
} from './AuroraPhysics';

const AURORA_SEGMENTS_X = 120;
const AURORA_SEGMENTS_Y = 8;
const AURORA_WIDTH = 60;
const AURORA_BANDS = 3;
const AURORA_DEPTH_SPREAD = 6;

const STAR_COUNT_BASE = 3000;
const AURORA_PARTICLE_COUNT_BASE = 5000;
const BURST_RAY_COUNT = 60;

const AURORA_VERT = `
  uniform float uTime;
  uniform float uFlowSpeed;
  uniform float uDistortion;
  uniform vec3 uBurstOrigin;
  uniform float uBurstActive;
  uniform float uBurstTime;

  varying vec2 vUv;
  varying float vIntensity;
  varying vec3 vWorldPos;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y) * 2.0 - 1.0;
  }

  float vfbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * vnoise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vUv = uv;
    vec3 pos = position;

    float flowOff = uTime * uFlowSpeed * 0.3;
    float nx = pos.x * 0.15 + flowOff;
    float nz = pos.z * 0.1;
    float nt = uTime * 0.2;

    float n1 = vfbm(vec2(nx, nz + nt));
    float n2 = vfbm(vec2(nx * 2.0 + 50.0, nz * 2.0 + nt * 0.75));

    pos.y += (n1 * 4.0 + n2 * 1.5) * uDistortion;

    float flicker = vfbm(vec2(pos.x * 0.5, uTime * 0.8 + 200.0));
    float pulse = sin(uTime * 1.5 + pos.x * 0.2) * 0.15 + 0.85;
    vIntensity = clamp((0.5 + flicker * 0.5) * pulse, 0.0, 1.0);

    if (uBurstActive > 0.5) {
      float elapsed = uTime - uBurstTime;
      float duration = 2.0;
      if (elapsed < duration) {
        float progress = elapsed / duration;
        float decay = 1.0 - progress;
        vec3 diff = pos - uBurstOrigin;
        float dist = length(diff);
        float radius = elapsed * 8.0;
        float ringDist = abs(dist - radius);
        float influence = exp(-ringDist * 0.5) * decay * 2.0;
        vec3 dir = normalize(diff + vec3(0.001));
        float expandForce = influence * 3.0 * exp(-ringDist * 0.3);
        pos += dir * expandForce;
        vIntensity += influence * 0.5;
      }
    }

    vWorldPos = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const AURORA_FRAG = `
  uniform float uTime;
  varying vec2 vUv;
  varying float vIntensity;
  varying vec3 vWorldPos;

  void main() {
    float cycle = (sin(uTime * 0.3 + vWorldPos.x * 0.1) + 1.0) * 0.5;
    vec3 cyanGreen = vec3(0.0, 1.0, 0.66);
    vec3 pinkPurple = vec3(1.0, 0.3, 1.0);
    vec3 gold = vec3(1.0, 0.84, 0.0);
    vec3 col = mix(cyanGreen, pinkPurple, cycle);
    float goldMix = sin(uTime * 0.2 + vWorldPos.x * 0.05) * 0.5 + 0.5;
    goldMix = smoothstep(0.7, 1.0, goldMix) * 0.3;
    col = mix(col, gold, goldMix);

    float edgeFade = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
    float widthFade = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);

    float alpha = vIntensity * edgeFade * widthFade * 0.7;
    col *= (1.0 + vIntensity * 0.5);

    gl_FragColor = vec4(col, alpha);
  }
`;

const STAR_VERT = `
  uniform float uTime;
  attribute float aSize;
  attribute float aPhase;
  varying float vAlpha;

  void main() {
    float twinkle = sin(uTime * (1.0 + aPhase * 2.0) + aPhase * 6.28) * 0.3 + 0.7;
    vAlpha = twinkle;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / -mvPos.z) * twinkle;
    gl_Position = projectionMatrix * mvPos;
  }
`;

const STAR_FRAG = `
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.1, d) * vAlpha;
    gl_FragColor = vec4(0.9, 0.92, 1.0, alpha);
  }
`;

const PARTICLE_VERT = `
  uniform float uTime;
  uniform float uFlowSpeed;
  uniform float uDensity;
  attribute float aSize;
  attribute float aPhase;
  attribute float aBand;
  varying float vAlpha;
  varying float vCycle;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    float t = uTime * uFlowSpeed * 0.15;
    float bandOffset = aBand * 2.0;
    vec3 pos = position;
    pos.x += sin(t + aPhase * 6.28) * 2.0;
    pos.y += cos(t * 0.7 + aPhase * 3.14) * 0.8 + bandOffset;
    pos.z += sin(t * 0.5 + aPhase * 4.71) * 1.5;

    vAlpha = (sin(uTime * 1.2 + aPhase * 6.28) * 0.3 + 0.7) * uDensity;
    vCycle = (sin(uTime * 0.3 + pos.x * 0.1) + 1.0) * 0.5;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * uDensity * (200.0 / -mvPos.z);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const PARTICLE_FRAG = `
  varying float vAlpha;
  varying float vCycle;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.0, d) * vAlpha * 0.6;
    vec3 cyanGreen = vec3(0.0, 1.0, 0.66);
    vec3 pinkPurple = vec3(1.0, 0.3, 1.0);
    vec3 col = mix(cyanGreen, pinkPurple, vCycle);
    col += vec3(0.1, 0.05, 0.15);
    gl_FragColor = vec4(col, alpha);
  }
`;

const BURST_RAY_VERT = `
  uniform float uTime;
  uniform float uBurstTime;
  attribute float aSpeed;
  attribute float aAngle;
  attribute float aElevation;
  varying float vAlpha;
  varying float vCycle;

  void main() {
    float elapsed = uTime - uBurstTime;
    float progress = clamp(elapsed / 2.0, 0.0, 1.0);
    float dist = progress * aSpeed * 15.0;
    float decay = 1.0 - progress;

    vec3 dir = vec3(
      cos(aAngle) * cos(aElevation),
      sin(aElevation) * 0.5 + 0.3,
      sin(aAngle) * cos(aElevation)
    );

    vec3 pos = position + dir * dist;
    vAlpha = decay * 0.8;
    vCycle = aAngle / 6.28;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = max(1.0, 4.0 * decay * (200.0 / -mvPos.z));
    gl_Position = projectionMatrix * mvPos;
  }
`;

const BURST_RAY_FRAG = `
  varying float vAlpha;
  varying float vCycle;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.0, d) * vAlpha;
    vec3 cyanGreen = vec3(0.0, 1.0, 0.66);
    vec3 pinkPurple = vec3(1.0, 0.3, 1.0);
    vec3 gold = vec3(1.0, 0.84, 0.0);
    vec3 col = mix(cyanGreen, pinkPurple, vCycle);
    col = mix(col, gold, smoothstep(0.3, 0.7, vCycle));
    gl_FragColor = vec4(col * 1.5, alpha);
  }
`;

export class AuroraEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private auroraMeshes: THREE.Mesh[] = [];
  private starPoints: THREE.Points | null = null;
  private auroraParticles: THREE.Points | null = null;
  private burstRays: THREE.Points | null = null;
  private clock: THREE.Clock;
  private params: AuroraParams;
  private burstState: BurstState;
  private animationId: number = 0;
  private auroraMaterials: THREE.ShaderMaterial[] = [];
  private burstRayMaterial: THREE.ShaderMaterial | null = null;
  private onFrameCallback: ((time: number, params: AuroraParams, burst: BurstState) => void) | null = null;

  constructor(container: HTMLElement) {
    this.params = { ...DEFAULT_PARAMS };
    this.burstState = { active: false, originX: 0, originY: 0, originZ: 0, startTime: 0, strength: 0 };
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0a2e, 0.008);

    this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 500);
    this.camera.position.set(0, 5, 25);
    this.camera.lookAt(0, 8, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0a2e, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    this.createBackground();
    this.createAuroraBands();
    this.createStars();
    this.createAuroraParticles();
    this.createBurstRays();

    window.addEventListener('resize', this.onResize);
  }

  private createBackground(): void {
    const bgGeom = new THREE.SphereGeometry(200, 32, 32);
    const bgMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {},
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          vec3 deepBlue = vec3(0.04, 0.04, 0.18);
          vec3 purpleBlack = vec3(0.1, 0.04, 0.18);
          vec3 col = mix(purpleBlack, deepBlue, smoothstep(-0.2, 0.5, h));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.scene.add(new THREE.Mesh(bgGeom, bgMat));
  }

  private createAuroraBands(): void {
    for (let b = 0; b < AURORA_BANDS; b++) {
      const geom = new THREE.PlaneGeometry(AURORA_WIDTH, 3, AURORA_SEGMENTS_X, AURORA_SEGMENTS_Y);
      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uFlowSpeed: { value: this.params.flowSpeed },
          uDistortion: { value: this.params.distortion },
          uBurstOrigin: { value: new THREE.Vector3() },
          uBurstActive: { value: 0 },
          uBurstTime: { value: -10 },
        },
        vertexShader: AURORA_VERT,
        fragmentShader: AURORA_FRAG,
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(0, 8 + b * 2, -b * AURORA_DEPTH_SPREAD / AURORA_BANDS);
      mesh.rotation.x = -Math.PI * 0.1;

      this.scene.add(mesh);
      this.auroraMeshes.push(mesh);
      this.auroraMaterials.push(mat);
    }
  }

  private createStars(): void {
    const positions = new Float32Array(STAR_COUNT_BASE * 3);
    const sizes = new Float32Array(STAR_COUNT_BASE);
    const phases = new Float32Array(STAR_COUNT_BASE);

    for (let i = 0; i < STAR_COUNT_BASE; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 150 + Math.random() * 40;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi));
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      sizes[i] = 0.5 + Math.random() * 2.0;
      phases[i] = Math.random();
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geom.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
    });

    this.starPoints = new THREE.Points(geom, mat);
    this.scene.add(this.starPoints);
  }

  private createAuroraParticles(): void {
    const count = AURORA_PARTICLE_COUNT_BASE;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const bands = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const band = Math.floor(Math.random() * AURORA_BANDS);
      positions[i * 3] = (Math.random() - 0.5) * AURORA_WIDTH;
      positions[i * 3 + 1] = 6 + Math.random() * 8;
      positions[i * 3 + 2] = -band * AURORA_DEPTH_SPREAD / AURORA_BANDS + (Math.random() - 0.5) * 3;
      sizes[i] = 0.3 + Math.random() * 1.5;
      phases[i] = Math.random();
      bands[i] = band;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geom.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geom.setAttribute('aBand', new THREE.BufferAttribute(bands, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uFlowSpeed: { value: this.params.flowSpeed },
        uDensity: { value: this.params.particleDensity },
      },
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
    });

    this.auroraParticles = new THREE.Points(geom, mat);
    this.scene.add(this.auroraParticles);
  }

  private createBurstRays(): void {
    const positions = new Float32Array(BURST_RAY_COUNT * 3);
    const speeds = new Float32Array(BURST_RAY_COUNT);
    const angles = new Float32Array(BURST_RAY_COUNT);
    const elevations = new Float32Array(BURST_RAY_COUNT);

    for (let i = 0; i < BURST_RAY_COUNT; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      speeds[i] = 0.5 + Math.random() * 1.0;
      angles[i] = Math.random() * Math.PI * 2;
      elevations[i] = (Math.random() - 0.3) * Math.PI * 0.5;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geom.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1));
    geom.setAttribute('aElevation', new THREE.BufferAttribute(elevations, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uBurstTime: { value: -10 },
      },
      vertexShader: BURST_RAY_VERT,
      fragmentShader: BURST_RAY_FRAG,
    });

    this.burstRays = new THREE.Points(geom, mat);
    this.burstRays.visible = false;
    this.burstRayMaterial = mat;
    this.scene.add(this.burstRays);
  }

  triggerBurst(worldPos: THREE.Vector3): void {
    this.burstState = {
      active: true,
      originX: worldPos.x,
      originY: worldPos.y,
      originZ: worldPos.z,
      startTime: this.clock.getElapsedTime(),
      strength: 2.0,
    };

    for (const mat of this.auroraMaterials) {
      mat.uniforms.uBurstOrigin.value.copy(worldPos);
      mat.uniforms.uBurstActive.value = 1;
      mat.uniforms.uBurstTime.value = this.clock.getElapsedTime();
    }

    if (this.burstRays && this.burstRayMaterial) {
      const posAttr = this.burstRays.geometry.getAttribute('position');
      for (let i = 0; i < BURST_RAY_COUNT; i++) {
        posAttr.setXYZ(i, worldPos.x, worldPos.y, worldPos.z);
      }
      posAttr.needsUpdate = true;
      this.burstRays.visible = true;
      this.burstRayMaterial.uniforms.uBurstTime.value = this.clock.getElapsedTime();
    }
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getParams(): AuroraParams {
    return this.params;
  }

  getBurstState(): BurstState {
    return this.burstState;
  }

  getClock(): THREE.Clock {
    return this.clock;
  }

  updateParams(newParams: Partial<AuroraParams>): void {
    Object.assign(this.params, newParams);
  }

  resetScene(): void {
    this.params = { ...DEFAULT_PARAMS };
    this.burstState = { active: false, originX: 0, originY: 0, originZ: 0, startTime: 0, strength: 0 };
    this.camera.position.set(0, 5, 25);
    this.camera.lookAt(0, 8, 0);
    for (const mat of this.auroraMaterials) {
      mat.uniforms.uBurstActive.value = 0;
    }
    if (this.burstRays) this.burstRays.visible = false;
  }

  onFrame(cb: (time: number, params: AuroraParams, burst: BurstState) => void): void {
    this.onFrameCallback = cb;
  }

  start(): void {
    this.clock.start();
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      const time = this.clock.getElapsedTime();

      for (const mat of this.auroraMaterials) {
        mat.uniforms.uTime.value = time;
        mat.uniforms.uFlowSpeed.value = this.params.flowSpeed;
        mat.uniforms.uDistortion.value = this.params.distortion;
      }

      if (this.starPoints) {
        (this.starPoints.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
      }

      if (this.auroraParticles) {
        const pMat = this.auroraParticles.material as THREE.ShaderMaterial;
        pMat.uniforms.uTime.value = time;
        pMat.uniforms.uFlowSpeed.value = this.params.flowSpeed;
        pMat.uniforms.uDensity.value = this.params.particleDensity;
      }

      if (this.burstRays && this.burstRayMaterial) {
        this.burstRayMaterial.uniforms.uTime.value = time;
        const elapsed = time - this.burstState.startTime;
        if (this.burstState.active && elapsed > 2.0) {
          this.burstState.active = false;
          this.burstRays.visible = false;
          for (const mat of this.auroraMaterials) {
            mat.uniforms.uBurstActive.value = 0;
          }
        }
      }

      if (this.onFrameCallback) {
        this.onFrameCallback(time, this.params, this.burstState);
      }

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  stop(): void {
    cancelAnimationFrame(this.animationId);
  }

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    this.auroraMeshes.forEach((m) => {
      m.geometry.dispose();
      (m.material as THREE.ShaderMaterial).dispose();
    });
    if (this.starPoints) {
      this.starPoints.geometry.dispose();
      (this.starPoints.material as THREE.ShaderMaterial).dispose();
    }
    if (this.auroraParticles) {
      this.auroraParticles.geometry.dispose();
      (this.auroraParticles.material as THREE.ShaderMaterial).dispose();
    }
    if (this.burstRays) {
      this.burstRays.geometry.dispose();
      (this.burstRays.material as THREE.ShaderMaterial).dispose();
    }
    this.renderer.domElement.remove();
  }

  private onResize = () => {
    const parent = this.renderer.domElement.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };
}
