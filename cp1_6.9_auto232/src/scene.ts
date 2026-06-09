import * as THREE from 'three';
import { AshParticleSystem } from './particles';

const CAVE_RADIUS = 12;
const CAVE_HEIGHT = 10;
const LAVA_Y = -3;
const CRYSTAL_COUNT = 80;
const PULSE_PERIOD = 2;

export interface CrystalData {
  mesh: THREE.Mesh;
  halo: THREE.Mesh;
  baseScale: number;
  baseEmissive: THREE.Color;
  rotationSpeed: THREE.Vector3;
  hoverStartTime: number;
  isHovered: boolean;
}

interface LavaHotspot {
  position: THREE.Vector2;
  startTime: number;
  duration: number;
}

export class LavaCaveScene {
  private scene: THREE.Scene;
  private lavaSurface!: THREE.Mesh;
  private lavaWalls!: THREE.Mesh;
  private caveCeiling!: THREE.Mesh;
  private crystalDatas: CrystalData[] = [];
  private pulseRings: { mesh: THREE.Mesh; startTime: number; position: THREE.Vector3 }[] = [];
  private lavaHotspots: LavaHotspot[] = [];
  private lavaMaterial!: THREE.ShaderMaterial;
  private flowDirection: THREE.Vector2;
  private particleSystem: AshParticleSystem;

  private lavaVertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying float vHeight;

    uniform float uTime;
    uniform vec2 uFlowDir;

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      vUv = uv;
      vNormal = normal;

      vec3 pos = position;
      float flowOffset = dot(pos.xz, uFlowDir) * 0.3 + uTime * 0.5;

      float noise1 = snoise(vec3(pos.x * 0.25, pos.z * 0.25, flowOffset * 0.8)) * 0.6;
      float noise2 = snoise(vec3(pos.x * 0.6, pos.z * 0.6, flowOffset * 1.5 + 100.0)) * 0.25;
      float noise3 = snoise(vec3(pos.x * 1.2, pos.z * 1.2, flowOffset * 2.0 + 200.0)) * 0.12;

      float totalNoise = noise1 + noise2 + noise3;

      pos.y += totalNoise;
      vHeight = totalNoise;
      vPosition = pos;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  private lavaFragmentShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying float vHeight;

    uniform float uTime;
    uniform vec2 uFlowDir;
    uniform vec2 uHotspots[20];
    uniform float uHotspotCount;
    uniform float uHotspotStartTimes[20];
    uniform float uHotspotDurations[20];

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      float flowOffset = dot(vPosition.xz, uFlowDir) * 0.5 + uTime * 0.5;
      float noiseA = snoise(vec3(vPosition.x * 0.4, vPosition.z * 0.4, flowOffset));
      float noiseB = snoise(vec3(vPosition.x * 0.8, vPosition.z * 0.8, flowOffset * 1.3 + 50.0));
      float flowPattern = (noiseA + noiseB * 0.5) * 0.5 + 0.5;

      float pulsePhase = uTime * 3.14159 / ${PULSE_PERIOD}.0;
      float pulse = 0.5 + 0.5 * sin(pulsePhase + vHeight * 2.0 + flowPattern * 3.0);

      float heightFactor = smoothstep(-0.8, 0.8, vHeight);

      vec3 darkRed = vec3(0.55, 0.08, 0.02);
      vec3 midOrange = vec3(0.95, 0.35, 0.05);
      vec3 brightOrange = vec3(1.0, 0.6, 0.1);
      vec3 brightYellow = vec3(1.0, 0.9, 0.4);

      vec3 baseColor = mix(darkRed, midOrange, flowPattern);
      baseColor = mix(baseColor, brightOrange, heightFactor * 0.6);
      baseColor = mix(baseColor, brightYellow, pulse * heightFactor * 0.4);

      float hotspotIntensity = 0.0;
      for (int i = 0; i < 20; i++) {
        if (float(i) >= uHotspotCount) break;
        float age = uTime - uHotspotStartTimes[i];
        float life = 1.0 - clamp(age / uHotspotDurations[i], 0.0, 1.0);
        if (life <= 0.0) continue;
        vec2 diff = vPosition.xz - uHotspots[i];
        float dist = length(diff);
        float influence = exp(-dist * dist * 1.2) * life;
        hotspotIntensity = max(hotspotIntensity, influence);
      }
      baseColor = mix(baseColor, vec3(1.0, 1.0, 0.6), hotspotIntensity * 0.8);

      float brightness = 0.7 + pulse * 0.4 + heightFactor * 0.3 + hotspotIntensity * 0.8;
      vec3 finalColor = baseColor * brightness;

      float fresnel = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 1.0, 0.0))), 2.0);
      finalColor += brightYellow * fresnel * 0.2;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  constructor(scene: THREE.Scene, particleSystem: AshParticleSystem) {
    this.scene = scene;
    this.particleSystem = particleSystem;
    const theta = Math.random() * Math.PI * 2;
    this.flowDirection = new THREE.Vector2(Math.cos(theta), Math.sin(theta)).normalize();
    this.createLavaSurface();
    this.createCaveWalls();
    this.createCaveCeiling();
    this.createCrystals();
  }

  private createLavaSurface(): void {
    const geometry = new THREE.PlaneGeometry(CAVE_RADIUS * 2.4, CAVE_RADIUS * 2.4, 180, 180);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, LAVA_Y, 0);

    const positions = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];
      const dist = Math.sqrt(x * x + z * z);
      if (dist > CAVE_RADIUS * 1.1) {
        const edgeFactor = (dist - CAVE_RADIUS * 1.1) / (CAVE_RADIUS * 0.2);
        positions[i + 1] -= edgeFactor * edgeFactor * 3;
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    const hotspots = new Float32Array(20 * 2);
    const hotspotStartTimes = new Float32Array(20);
    const hotspotDurations = new Float32Array(20);

    this.lavaMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uFlowDir: { value: this.flowDirection },
        uHotspots: { value: hotspots },
        uHotspotCount: { value: 0 },
        uHotspotStartTimes: { value: hotspotStartTimes },
        uHotspotDurations: { value: hotspotDurations }
      },
      vertexShader: this.lavaVertexShader,
      fragmentShader: this.lavaFragmentShader
    });

    this.lavaSurface = new THREE.Mesh(geometry, this.lavaMaterial);
    this.scene.add(this.lavaSurface);

    const glowGeometry = new THREE.PlaneGeometry(CAVE_RADIUS * 2.6, CAVE_RADIUS * 2.6);
    glowGeometry.rotateX(-Math.PI / 2);
    glowGeometry.translate(0, LAVA_Y - 0.01, 0);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff5520,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.scene.add(glow);

    this.particleSystem.setLavaSurface(this.lavaSurface);
  }

  private createCaveWalls(): void {
    const geometry = new THREE.CylinderGeometry(
      CAVE_RADIUS * 1.05, CAVE_RADIUS * 1.15, CAVE_HEIGHT + 6, 64, 16, true
    );
    geometry.translate(0, LAVA_Y + 2, 0);

    const positions = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      const noise = this.simpleNoise(x * 0.15 + 10, y * 0.1, z * 0.15 + 20) * 1.5;
      const dist = Math.sqrt(x * x + z * z);
      const nx = x / dist;
      const nz = z / dist;

      positions[i] = x + nx * noise;
      positions[i + 2] = z + nz * noise;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x1a0a08,
      roughness: 0.95,
      metalness: 0.05,
      side: THREE.BackSide,
      emissive: 0x1a0500,
      emissiveIntensity: 0.15
    });

    this.lavaWalls = new THREE.Mesh(geometry, material);
    this.scene.add(this.lavaWalls);
  }

  private createCaveCeiling(): void {
    const geometry = new THREE.SphereGeometry(CAVE_RADIUS * 1.1, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const positions = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const noise = this.simpleNoise(
        positions[i] * 0.12 + 50,
        positions[i + 1] * 0.12 + 30,
        positions[i + 2] * 0.12 + 70
      ) * 2.0;
      const dist = Math.sqrt(
        positions[i] * positions[i] +
        positions[i + 1] * positions[i + 1] +
        positions[i + 2] * positions[i + 2]
      );
      positions[i] += (positions[i] / dist) * noise;
      positions[i + 1] += (positions[i + 1] / dist) * noise;
      positions[i + 2] += (positions[i + 2] / dist) * noise;
    }
    geometry.scale(1, 0.65, 1);
    geometry.translate(0, CAVE_HEIGHT * 0.3 + LAVA_Y + 2, 0);
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x140808,
      roughness: 0.92,
      metalness: 0.08,
      side: THREE.BackSide,
      emissive: 0x0d0300,
      emissiveIntensity: 0.1
    });

    this.caveCeiling = new THREE.Mesh(geometry, material);
    this.scene.add(this.caveCeiling);
  }

  private createCrystals(): void {
    const colors = [0x77ddff, 0x99ffcc, 0xff88cc, 0xcc99ff, 0xffdd66, 0x66ff88];

    for (let i = 0; i < CRYSTAL_COUNT; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const baseScale = 0.2 + Math.random() * 0.45;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.45 + 0.15;
      const r = CAVE_RADIUS * (0.6 + Math.random() * 0.35);

      const worldX = r * Math.sin(phi) * Math.cos(theta);
      const worldZ = r * Math.sin(phi) * Math.sin(theta);

      const ceilingNoise = this.simpleNoise(worldX * 0.1 + 100, 0, worldZ * 0.1 + 100);
      const worldY = CAVE_HEIGHT * 0.15 + LAVA_Y + 2 + ceilingNoise * 0.8 - Math.random() * 1.5;

      const crystalHeight = 1.0 + Math.random() * 0.8;
      const crystalGeometry = new THREE.CylinderGeometry(
        baseScale * 0.35, baseScale * 0.15, crystalHeight, 6, 1, false
      );
      crystalGeometry.translate(0, -crystalHeight * 0.5, 0);

      const crystalMaterial = new THREE.MeshPhysicalMaterial({
        color: color,
        transparent: true,
        opacity: 0.72,
        roughness: 0.08,
        metalness: 0.15,
        transmission: 0.4,
        thickness: 0.8,
        emissive: color,
        emissiveIntensity: 0.9,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1
      });

      const mesh = new THREE.Mesh(crystalGeometry, crystalMaterial);
      mesh.position.set(worldX, worldY, worldZ);
      mesh.rotation.z = (Math.random() - 0.5) * 0.6;
      mesh.rotation.x = (Math.random() - 0.5) * 0.6;
      mesh.rotation.y = Math.random() * Math.PI * 2;
      mesh.userData.crystalIndex = i;
      mesh.userData.isCrystal = true;

      const haloGeometry = new THREE.RingGeometry(baseScale * 0.8, baseScale * 2.2, 32);
      haloGeometry.rotateX(-Math.PI / 2);
      const haloMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const halo = new THREE.Mesh(haloGeometry, haloMaterial);
      halo.position.copy(mesh.position);
      halo.position.y -= crystalHeight * 0.3;
      halo.rotation.copy(mesh.rotation);

      this.scene.add(mesh);
      this.scene.add(halo);

      const emissiveColor = new THREE.Color(color);
      this.crystalDatas.push({
        mesh,
        halo,
        baseScale,
        baseEmissive: emissiveColor,
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          0.6 + Math.random() * 0.6,
          (Math.random() - 0.5) * 0.3
        ),
        hoverStartTime: -Infinity,
        isHovered: false
      });
    }
  }

  private simpleNoise(x: number, y: number, z: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);
    const xf = x - xi;
    const yf = y - yi;
    const zf = z - zi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const w = zf * zf * (3 - 2 * zf);

    const hash = (ix: number, iy: number, iz: number) => {
      let h = ix * 374761393 + iy * 668265263 + iz * 2246822519;
      h = (h ^ (h >> 13)) * 1274126177;
      return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff;
    };

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const c000 = hash(xi, yi, zi);
    const c100 = hash(xi + 1, yi, zi);
    const c010 = hash(xi, yi + 1, zi);
    const c110 = hash(xi + 1, yi + 1, zi);
    const c001 = hash(xi, yi, zi + 1);
    const c101 = hash(xi + 1, yi, zi + 1);
    const c011 = hash(xi, yi + 1, zi + 1);
    const c111 = hash(xi + 1, yi + 1, zi + 1);

    const x00 = lerp(c000, c100, u);
    const x10 = lerp(c010, c110, u);
    const x01 = lerp(c001, c101, u);
    const x11 = lerp(c011, c111, u);
    const y0 = lerp(x00, x10, v);
    const y1 = lerp(x01, x11, v);
    return (lerp(y0, y1, w) - 0.5) * 2;
  }

  update(delta: number, elapsed: number): void {
    this.lavaMaterial.uniforms.uTime.value = elapsed;

    this.lavaHotspots = this.lavaHotspots.filter((hs) => {
      const age = elapsed - hs.startTime;
      return age < hs.duration;
    });

    const hsUniform = this.lavaMaterial.uniforms.uHotspots.value as Float32Array;
    const hsStarts = this.lavaMaterial.uniforms.uHotspotStartTimes.value as Float32Array;
    const hsDurs = this.lavaMaterial.uniforms.uHotspotDurations.value as Float32Array;
    for (let i = 0; i < this.lavaHotspots.length && i < 20; i++) {
      hsUniform[i * 2] = this.lavaHotspots[i].position.x;
      hsUniform[i * 2 + 1] = this.lavaHotspots[i].position.y;
      hsStarts[i] = this.lavaHotspots[i].startTime;
      hsDurs[i] = this.lavaHotspots[i].duration;
    }
    this.lavaMaterial.uniforms.uHotspotCount.value = Math.min(this.lavaHotspots.length, 20);
    this.lavaMaterial.uniforms.uHotspots.needsUpdate = true;
    this.lavaMaterial.uniforms.uHotspotStartTimes.needsUpdate = true;
    this.lavaMaterial.uniforms.uHotspotDurations.needsUpdate = true;

    for (const data of this.crystalDatas) {
      data.mesh.rotation.x += data.rotationSpeed.x * delta;
      data.mesh.rotation.y += data.rotationSpeed.y * delta;
      data.mesh.rotation.z += data.rotationSpeed.z * delta;
      data.halo.rotation.copy(data.mesh.rotation);

      let targetScale = data.baseScale;
      let targetEmissiveIntensity = 0.9;

      if (data.isHovered) {
        const age = (performance.now() - data.hoverStartTime) / 1000;
        const t = Math.min(age / 0.15, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        targetScale = data.baseScale * (1 + 0.5 * ease);
        targetEmissiveIntensity = 0.9 + 1.8 * ease;
      } else if (data.hoverStartTime > 0) {
        const age = (performance.now() - data.hoverStartTime) / 1000;
        if (age < 0.25) {
          const t = 1 - age / 0.25;
          const ease = t * t * (3 - 2 * t);
          targetScale = data.baseScale * (1 + 0.5 * ease);
          targetEmissiveIntensity = 0.9 + 1.8 * ease;
        } else {
          data.hoverStartTime = -Infinity;
        }
      }

      const currentScale = data.mesh.scale.x;
      const newScale = currentScale + (targetScale / data.baseScale - currentScale) * Math.min(delta * 10, 1);
      data.mesh.scale.setScalar(newScale);

      const mat = data.mesh.material as THREE.MeshPhysicalMaterial;
      mat.emissiveIntensity += (targetEmissiveIntensity - mat.emissiveIntensity) * Math.min(delta * 10, 1);

      const haloSpin = elapsed * 0.5 + data.rotationSpeed.y * 3;
      data.halo.material.opacity = 0.15 + 0.08 * Math.sin(haloSpin) + (data.isHovered ? 0.25 : 0);
      (data.halo.material as THREE.MeshBasicMaterial).color.lerpColors(
        data.baseEmissive,
        new THREE.Color(0xffffff),
        data.isHovered ? 0.5 : 0
      );
    }

    this.pulseRings = this.pulseRings.filter((ring) => {
      const age = (performance.now() - ring.startTime) / 1000;
      const life = age / 1.5;
      if (life >= 1) {
        this.scene.remove(ring.mesh);
        ring.mesh.geometry.dispose();
        (ring.mesh.material as THREE.Material).dispose();
        return false;
      }

      const radius = 0.5 + life * CAVE_RADIUS * 2.5;
      ring.mesh.scale.setScalar(radius);
      const mat = ring.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - life) * 0.7;
      return true;
    });
  }

  getCrystals(): THREE.Mesh[] {
    return this.crystalDatas.map((d) => d.mesh);
  }

  getCrystalData(mesh: THREE.Mesh): CrystalData | undefined {
    return this.crystalDatas.find((d) => d.mesh === mesh);
  }

  setCrystalHovered(mesh: THREE.Mesh, hovered: boolean): void {
    const data = this.getCrystalData(mesh);
    if (!data) return;
    if (hovered !== data.isHovered) {
      data.isHovered = hovered;
      data.hoverStartTime = performance.now();
      if (hovered) {
        const worldPos = new THREE.Vector3();
        mesh.getWorldPosition(worldPos);
        this.lavaHotspots.push({
          position: new THREE.Vector2(worldPos.x, worldPos.z),
          startTime: this.lavaMaterial.uniforms.uTime.value,
          duration: 0.3
        });
      }
    }
  }

  triggerCrystalPulse(mesh: THREE.Mesh, elapsed: number): void {
    const data = this.getCrystalData(mesh);
    if (!data) return;

    const worldPos = new THREE.Vector3();
    mesh.getWorldPosition(worldPos);

    const ringGeometry = new THREE.RingGeometry(0.98, 1.0, 96);
    ringGeometry.rotateX(-Math.PI / 2);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xff8833,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.copy(worldPos);
    ring.position.y = LAVA_Y + 0.05;
    this.scene.add(ring);
    this.pulseRings.push({
      mesh: ring,
      startTime: performance.now(),
      position: worldPos.clone()
    });

    this.particleSystem.addPulseEffect(worldPos);
    this.particleSystem.applyPulseToNearby(worldPos, CAVE_RADIUS * 2);

    this.lavaHotspots.push({
      position: new THREE.Vector2(worldPos.x, worldPos.z),
      startTime: elapsed,
      duration: 0.8
    });
  }

  getLavaY(): number {
    return LAVA_Y;
  }
}
