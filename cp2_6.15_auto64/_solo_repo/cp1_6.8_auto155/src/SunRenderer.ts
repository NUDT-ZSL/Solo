import * as THREE from 'three';
import { SunEngine, SUN_RADIUS, FlareInfo } from './SunEngine';

const NOISE_GLSL = `
float hash3(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x),
        mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x),
        mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y),
    f.z);
}
float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  vec3 shift = vec3(100.0);
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p = p * 2.0 + shift;
    a *= 0.5;
  }
  return v;
}
`;

const SUN_VERT = `
varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SUN_FRAG = `
uniform float uTime;
uniform float uFlowSpeed;
uniform float uGlowIntensity;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;
${NOISE_GLSL}
void main() {
  vec3 pos = vPosition * 0.28;
  float t = uTime * uFlowSpeed * 0.12;
  float n1 = fbm(pos + t * 0.3);
  float n2 = fbm(pos * 1.5 + t * 0.5 + 50.0);
  float n3 = fbm(pos * 0.7 - t * 0.2 + 120.0);
  float noise = (n1 + n2 * 0.6 + n3 * 0.3) / 1.9;
  vec3 darkRed = vec3(0.55, 0.05, 0.0);
  vec3 orange = vec3(1.0, 0.45, 0.0);
  vec3 yellow = vec3(1.0, 0.85, 0.25);
  vec3 white = vec3(1.0, 0.95, 0.7);
  float t1 = smoothstep(0.2, 0.45, noise);
  float t2 = smoothstep(0.45, 0.65, noise);
  float t3 = smoothstep(0.7, 0.9, noise);
  vec3 color = mix(darkRed, orange, t1);
  color = mix(color, yellow, t2);
  color = mix(color, white, t3 * 0.5);
  vec3 viewDir = normalize(cameraPosition - vPosition);
  float fresnel = 1.0 - max(dot(viewDir, vNormal), 0.0);
  fresnel = pow(fresnel, 2.5) * uGlowIntensity * 1.2;
  color += vec3(1.0, 0.5, 0.15) * fresnel;
  color *= 1.15;
  gl_FragColor = vec4(color, 1.0);
}
`;

const CORONA_VERT = `
varying vec3 vNormal;
varying vec3 vWorldPos;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const CORONA_FRAG = `
uniform float uGlowIntensity;
varying vec3 vNormal;
varying vec3 vWorldPos;
void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fresnel = 1.0 - max(dot(viewDir, vNormal), 0.0);
  fresnel = pow(fresnel, 3.0) * uGlowIntensity;
  vec3 color = vec3(1.0, 0.4, 0.05) * fresnel * 1.5;
  float alpha = fresnel * 0.6;
  gl_FragColor = vec4(color, alpha);
}
`;

const SURFACE_PARTICLE_VERT = `
uniform float uTime;
uniform float uFlowSpeed;
attribute float aSize;
attribute float aPhase;
varying float vAlpha;
varying vec3 vColor;
${NOISE_GLSL}
void main() {
  vec3 pos = position;
  vec3 norm = normalize(pos);
  float t = uTime * uFlowSpeed * 0.15 + aPhase;
  vec3 flow = vec3(
    vnoise(pos * 2.5 + t * 0.3),
    vnoise(pos * 2.5 + t * 0.3 + 100.0),
    vnoise(pos * 2.5 + t * 0.3 + 200.0)
  );
  vec3 tangentFlow = flow - dot(flow, norm) * norm;
  pos += tangentFlow * 0.35 * uFlowSpeed;
  pos = normalize(pos) * length(position);
  float heightNoise = vnoise(pos * 3.0 + t * 0.2) * 0.15;
  pos += norm * heightNoise;
  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  float dist = -mvPos.z;
  gl_PointSize = aSize * (280.0 / dist);
  gl_Position = projectionMatrix * mvPos;
  float brightness = vnoise(pos * 1.5 + t * 0.1);
  vec3 darkOrange = vec3(0.9, 0.3, 0.0);
  vec3 gold = vec3(1.0, 0.75, 0.2);
  vColor = mix(darkOrange, gold, brightness);
  vAlpha = 0.5 + brightness * 0.4;
  vec3 viewDir = normalize(cameraPosition - pos);
  float facing = dot(viewDir, norm);
  vAlpha *= smoothstep(-0.1, 0.3, facing);
}
`;

const SURFACE_PARTICLE_FRAG = `
varying float vAlpha;
varying vec3 vColor;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float alpha = (1.0 - d * d) * vAlpha;
  gl_FragColor = vec4(vColor, alpha);
}
`;

const FLARE_VERT = `
uniform float uTime;
attribute float aIntensity;
attribute float aPhase2;
varying float vIntensity;
varying vec3 vFlareColor;
void main() {
  vIntensity = aIntensity;
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  float dist = -mvPos.z;
  float pulse = 1.0 + 0.2 * sin(uTime * 3.0 + aPhase2);
  gl_PointSize = (12.0 + aIntensity * 20.0) * pulse * (300.0 / dist);
  gl_Position = projectionMatrix * mvPos;
  float temp = aIntensity;
  vec3 cool = vec3(1.0, 0.6, 0.1);
  vec3 hot = vec3(1.0, 0.95, 0.7);
  vFlareColor = mix(cool, hot, temp);
}
`;

const FLARE_FRAG = `
varying float vIntensity;
varying vec3 vFlareColor;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float glow = exp(-d * d * 3.0);
  float alpha = glow * vIntensity;
  vec3 color = vFlareColor * (1.0 + glow * 0.5);
  gl_FragColor = vec4(color, alpha);
}
`;

const CME_VERT = `
attribute float aCMESize;
attribute float aCMEOpacity;
varying float vCMEOpacity;
void main() {
  vCMEOpacity = aCMEOpacity;
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  float dist = -mvPos.z;
  gl_PointSize = aCMESize * (350.0 / dist);
  gl_Position = projectionMatrix * mvPos;
}
`;

const CME_FRAG = `
varying float vCMEOpacity;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float alpha = (1.0 - d * d) * vCMEOpacity;
  vec3 color = mix(vec3(1.0, 0.3, 0.0), vec3(1.0, 0.8, 0.3), 1.0 - d);
  gl_FragColor = vec4(color, alpha);
}
`;

const STAR_VERT = `
attribute float aStarSize;
attribute float aStarPhase;
uniform float uTime;
varying float vStarAlpha;
void main() {
  float twinkle = 0.6 + 0.4 * sin(uTime * 1.5 + aStarPhase * 6.28);
  vStarAlpha = twinkle;
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aStarSize * twinkle;
  gl_Position = projectionMatrix * mvPos;
}
`;

const STAR_FRAG = `
varying float vStarAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float alpha = (1.0 - d * d) * vStarAlpha;
  gl_FragColor = vec4(0.9, 0.92, 1.0, alpha * 0.8);
}
`;

const DEFAULT_THETA = 0;
const DEFAULT_PHI = Math.PI / 3;
const DEFAULT_RADIUS = 16;
const MIN_PHI = 0.15;
const MAX_PHI = Math.PI - 0.15;
const MIN_RADIUS = 8;
const MAX_RADIUS = 35;

export class SunRenderer {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  webglRenderer: THREE.WebGLRenderer;

  private sunMesh!: THREE.Mesh;
  private coronaMesh!: THREE.Mesh;
  private surfacePoints!: THREE.Points;
  private flarePoints!: THREE.Points;
  private cmePoints!: THREE.Points;
  private starPoints!: THREE.Points;

  private sunMaterial!: THREE.ShaderMaterial;
  private coronaMaterial!: THREE.ShaderMaterial;
  private surfaceMaterial!: THREE.ShaderMaterial;
  private flareMaterial!: THREE.ShaderMaterial;
  private cmeMaterial!: THREE.ShaderMaterial;
  private starMaterial!: THREE.ShaderMaterial;

  private engine: SunEngine;
  private container: HTMLElement;

  private orbitTheta = DEFAULT_THETA;
  private orbitPhi = DEFAULT_PHI;
  private orbitRadius = DEFAULT_RADIUS;
  private targetTheta = DEFAULT_THETA;
  private targetPhi = DEFAULT_PHI;
  private targetRadius = DEFAULT_RADIUS;

  private isDragging = false;
  private prevMouseX = 0;
  private prevMouseY = 0;

  private raycaster = new THREE.Raycaster();
  private clickMouse = new THREE.Vector2();
  private sunSphereHelper!: THREE.Mesh;

  onFlareClick: ((flare: FlareInfo) => void) | null = null;

  private flareIdMap: number[] = [];

  private animId: number = 0;
  private lastTime = 0;

  constructor(container: HTMLElement, engine: SunEngine) {
    this.container = container;
    this.engine = engine;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      500
    );
    this.webglRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.webglRenderer.setSize(container.clientWidth, container.clientHeight);
    this.webglRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.webglRenderer.setClearColor(0x000000, 1);
    container.appendChild(this.webglRenderer.domElement);
  }

  init() {
    this.createSunSphere();
    this.createCoronaGlow();
    this.createSurfaceParticles();
    this.createFlareMarkers();
    this.createCMEParticles();
    this.createStarField();
    this.createSunSphereHelper();
    this.setupControls();
    this.updateCamera(true);
  }

  private createSunSphere() {
    const geo = new THREE.SphereGeometry(SUN_RADIUS, 128, 64);
    this.sunMaterial = new THREE.ShaderMaterial({
      vertexShader: SUN_VERT,
      fragmentShader: SUN_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uFlowSpeed: { value: this.engine.params.flowSpeed },
        uGlowIntensity: { value: this.engine.params.glowIntensity },
      },
    });
    this.sunMesh = new THREE.Mesh(geo, this.sunMaterial);
    this.scene.add(this.sunMesh);
  }

  private createCoronaGlow() {
    const geo = new THREE.SphereGeometry(SUN_RADIUS * 1.25, 64, 32);
    this.coronaMaterial = new THREE.ShaderMaterial({
      vertexShader: CORONA_VERT,
      fragmentShader: CORONA_FRAG,
      uniforms: {
        uGlowIntensity: { value: this.engine.params.glowIntensity },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.coronaMesh = new THREE.Mesh(geo, this.coronaMaterial);
    this.scene.add(this.coronaMesh);
  }

  private createSurfaceParticles() {
    const count = 25000;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    for (let i = 0; i < count; i++) {
      const theta = 2 * Math.PI * i / goldenRatio;
      const phi = Math.acos(1 - 2 * (i + 0.5) / count);
      const r = SUN_RADIUS * (1.0 + Math.random() * 0.04);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      sizes[i] = 0.8 + Math.random() * 2.0;
      phases[i] = Math.random() * 100;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    this.surfaceMaterial = new THREE.ShaderMaterial({
      vertexShader: SURFACE_PARTICLE_VERT,
      fragmentShader: SURFACE_PARTICLE_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uFlowSpeed: { value: this.engine.params.flowSpeed },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.surfacePoints = new THREE.Points(geo, this.surfaceMaterial);
    this.scene.add(this.surfacePoints);
  }

  private createFlareMarkers() {
    const maxFlares = 5;
    const positions = new Float32Array(maxFlares * 3);
    const intensities = new Float32Array(maxFlares);
    const phases = new Float32Array(maxFlares);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aIntensity', new THREE.BufferAttribute(intensities, 1));
    geo.setAttribute('aPhase2', new THREE.BufferAttribute(phases, 1));
    geo.setDrawRange(0, 0);

    this.flareMaterial = new THREE.ShaderMaterial({
      vertexShader: FLARE_VERT,
      fragmentShader: FLARE_FRAG,
      uniforms: {
        uTime: { value: 0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.flarePoints = new THREE.Points(geo, this.flareMaterial);
    this.scene.add(this.flarePoints);
  }

  private createCMEParticles() {
    const maxCount = 3000;
    const positions = new Float32Array(maxCount * 3);
    const sizes = new Float32Array(maxCount);
    const opacities = new Float32Array(maxCount);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aCMESize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aCMEOpacity', new THREE.BufferAttribute(opacities, 1));
    geo.setDrawRange(0, 0);

    this.cmeMaterial = new THREE.ShaderMaterial({
      vertexShader: CME_VERT,
      fragmentShader: CME_FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.cmePoints = new THREE.Points(geo, this.cmeMaterial);
    this.scene.add(this.cmePoints);
  }

  private createStarField() {
    const count = 2000;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const starPhases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 80 + Math.random() * 120;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      sizes[i] = 0.5 + Math.random() * 1.5;
      starPhases[i] = Math.random();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aStarSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aStarPhase', new THREE.BufferAttribute(starPhases, 1));

    this.starMaterial = new THREE.ShaderMaterial({
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      uniforms: {
        uTime: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
    });

    this.starPoints = new THREE.Points(geo, this.starMaterial);
    this.scene.add(this.starPoints);
  }

  private createSunSphereHelper() {
    const geo = new THREE.SphereGeometry(SUN_RADIUS * 1.05, 32, 16);
    const mat = new THREE.MeshBasicMaterial({
      visible: false,
      side: THREE.FrontSide,
    });
    this.sunSphereHelper = new THREE.Mesh(geo, mat);
    this.scene.add(this.sunSphereHelper);
  }

  private setupControls() {
    const canvas = this.webglRenderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = false;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
    });

    canvas.addEventListener('mousemove', (e) => {
      if (e.buttons === 0) return;
      const dx = e.clientX - this.prevMouseX;
      const dy = e.clientY - this.prevMouseY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        this.isDragging = true;
      }
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
      this.targetTheta -= dx * 0.005;
      this.targetPhi += dy * 0.005;
      this.targetPhi = Math.max(MIN_PHI, Math.min(MAX_PHI, this.targetPhi));
    });

    canvas.addEventListener('mouseup', (e) => {
      if (!this.isDragging) {
        this.handleClick(e);
      }
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.targetRadius += e.deltaY * 0.01;
      this.targetRadius = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, this.targetRadius));
    }, { passive: false });

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = false;
        this.prevMouseX = e.touches[0].clientX;
        this.prevMouseY = e.touches[0].clientY;
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - this.prevMouseX;
        const dy = e.touches[0].clientY - this.prevMouseY;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          this.isDragging = true;
        }
        this.prevMouseX = e.touches[0].clientX;
        this.prevMouseY = e.touches[0].clientY;
        this.targetTheta -= dx * 0.005;
        this.targetPhi += dy * 0.005;
        this.targetPhi = Math.max(MIN_PHI, Math.min(MAX_PHI, this.targetPhi));
      }
    }, { passive: true });

    canvas.addEventListener('touchend', (e) => {
      if (!this.isDragging && e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        this.handleClickAt(touch.clientX, touch.clientY);
      }
    });

    window.addEventListener('resize', () => this.resize());
  }

  private handleClick(e: MouseEvent) {
    this.handleClickAt(e.clientX, e.clientY);
  }

  private handleClickAt(clientX: number, clientY: number) {
    const rect = this.webglRenderer.domElement.getBoundingClientRect();
    this.clickMouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.clickMouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.clickMouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.sunSphereHelper);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      this.findAndTriggerFlare(point);
    }
  }

  private findAndTriggerFlare(clickPoint: THREE.Vector3) {
    let closest: FlareInfo | null = null;
    let minDist = Infinity;
    const threshold = 2.5;

    for (const flare of this.engine.flares) {
      const fx = flare.position[0] - clickPoint.x;
      const fy = flare.position[1] - clickPoint.y;
      const fz = flare.position[2] - clickPoint.z;
      const dist = Math.sqrt(fx * fx + fy * fy + fz * fz);
      if (dist < minDist && dist < threshold) {
        minDist = dist;
        closest = flare;
      }
    }

    if (closest) {
      this.engine.triggerCME(closest.id);
      if (this.onFlareClick) {
        this.onFlareClick(closest);
      }
    }
  }

  private updateCamera(immediate = false) {
    const lerp = immediate ? 1.0 : 0.07;
    this.orbitTheta += (this.targetTheta - this.orbitTheta) * lerp;
    this.orbitPhi += (this.targetPhi - this.orbitPhi) * lerp;
    this.orbitRadius += (this.targetRadius - this.orbitRadius) * lerp;

    const x = this.orbitRadius * Math.sin(this.orbitPhi) * Math.cos(this.orbitTheta);
    const y = this.orbitRadius * Math.cos(this.orbitPhi);
    const z = this.orbitRadius * Math.sin(this.orbitPhi) * Math.sin(this.orbitTheta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  resetView() {
    this.targetTheta = DEFAULT_THETA;
    this.targetPhi = DEFAULT_PHI;
    this.targetRadius = DEFAULT_RADIUS;
  }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.webglRenderer.setSize(w, h);
  }

  start() {
    this.lastTime = performance.now();
    const loop = (now: number) => {
      this.animId = requestAnimationFrame(loop);
      const dt = (now - this.lastTime) / 1000;
      this.lastTime = now;

      this.engine.update(dt);
      this.updateScene(dt);
      this.webglRenderer.render(this.scene, this.camera);
    };
    this.animId = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.animId);
  }

  private updateScene(_dt: number) {
    const t = this.engine.time;
    const p = this.engine.params;

    this.sunMaterial.uniforms.uTime.value = t;
    this.sunMaterial.uniforms.uFlowSpeed.value = p.flowSpeed;
    this.sunMaterial.uniforms.uGlowIntensity.value = p.glowIntensity;

    this.coronaMaterial.uniforms.uGlowIntensity.value = p.glowIntensity;

    this.surfaceMaterial.uniforms.uTime.value = t;
    this.surfaceMaterial.uniforms.uFlowSpeed.value = p.flowSpeed;

    this.flareMaterial.uniforms.uTime.value = t;
    this.starMaterial.uniforms.uTime.value = t;

    this.updateFlareGeometry();
    this.updateCMEGeometry();
    this.updateCamera();
  }

  private updateFlareGeometry() {
    const flares = this.engine.flares;
    const posAttr = this.flarePoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    const intAttr = this.flarePoints.geometry.getAttribute('aIntensity') as THREE.BufferAttribute;
    const phaseAttr = this.flarePoints.geometry.getAttribute('aPhase2') as THREE.BufferAttribute;

    this.flareIdMap = [];

    for (let i = 0; i < 5; i++) {
      if (i < flares.length) {
        const f = flares[i];
        posAttr.setXYZ(i, f.position[0], f.position[1], f.position[2]);
        intAttr.setX(i, f.intensity);
        phaseAttr.setX(i, f.id * 1.7);
        this.flareIdMap.push(f.id);
      } else {
        posAttr.setXYZ(i, 0, 0, 0);
        intAttr.setX(i, 0);
        phaseAttr.setX(i, 0);
      }
    }

    posAttr.needsUpdate = true;
    intAttr.needsUpdate = true;
    phaseAttr.needsUpdate = true;
    this.flarePoints.geometry.setDrawRange(0, flares.length);
  }

  private updateCMEGeometry() {
    const count = this.engine.activeCMEParticleCount;
    if (count === 0) {
      this.cmePoints.geometry.setDrawRange(0, 0);
      return;
    }

    const posAttr = this.cmePoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    const sizeAttr = this.cmePoints.geometry.getAttribute('aCMESize') as THREE.BufferAttribute;
    const opacAttr = this.cmePoints.geometry.getAttribute('aCMEOpacity') as THREE.BufferAttribute;

    const enginePositions = this.engine.cmePositions;
    const engineSizes = this.engine.cmeSizes;
    const engineOpacities = this.engine.cmeOpacities;

    for (let i = 0; i < count; i++) {
      posAttr.setXYZ(i, enginePositions[i * 3], enginePositions[i * 3 + 1], enginePositions[i * 3 + 2]);
      sizeAttr.setX(i, engineSizes[i] * 50);
      opacAttr.setX(i, engineOpacities[i]);
    }

    posAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    opacAttr.needsUpdate = true;
    this.cmePoints.geometry.setDrawRange(0, count);
  }

  dispose() {
    this.stop();
    this.webglRenderer.dispose();
    this.container.removeChild(this.webglRenderer.domElement);
  }
}
