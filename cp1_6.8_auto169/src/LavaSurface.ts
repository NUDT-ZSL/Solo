import * as THREE from 'three';
import type { SceneParams } from './CoreScene';

const LAVA_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uFlowSpeed;
  uniform float uHeatWave;
  varying vec2 vUv;
  varying float vElevation;
  varying float vHeat;

  //
  // Simplex 3D Noise (optimized GLSL)
  // Source: Ashima Arts
  //
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
    vec4 x2_ = x_ *ns.x + ns.yyyy;
    vec4 y2_ = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x2_) - abs(y2_);
    vec4 b0 = vec4(x2_.xy, y2_.xy);
    vec4 b1 = vec4(x2_.zw, y2_.zw);
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
    float t = uTime * uFlowSpeed * 0.3;

    float n1 = snoise(vec3(position.x * 0.5, position.z * 0.5, t)) * 0.6;
    float n2 = snoise(vec3(position.x * 1.0, position.z * 1.0, t * 1.5)) * 0.3;
    float n3 = snoise(vec3(position.x * 2.0, position.z * 2.0, t * 2.0)) * 0.1;
    float elevation = n1 + n2 + n3;

    float heatWave = sin(position.x * 3.0 + t * 4.0) * sin(position.z * 3.0 + t * 3.0) * 0.15 * uHeatWave;
    elevation += heatWave;

    vElevation = elevation;
    vHeat = (elevation + 1.0) * 0.5;

    vec3 newPosition = position;
    newPosition.y += elevation;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const LAVA_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uFlowSpeed;
  uniform float uCoolingRate;
  varying vec2 vUv;
  varying float vElevation;
  varying float vHeat;

  vec3 mod289v3(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289v4(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289v4(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise3(vec3 v) {
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
    i = mod289v3(i);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x2_ = x_ *ns.x + ns.yyyy;
    vec4 y2_ = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x2_) - abs(y2_);
    vec4 b0 = vec4(x2_.xy, y2_.xy);
    vec4 b1 = vec4(x2_.zw, y2_.zw);
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
    float t = uTime * uFlowSpeed * 0.15;

    float crackNoise = snoise3(vec3(vUv * 12.0, t * 0.5));
    float crack = smoothstep(0.0, 0.08, abs(crackNoise)) * uCoolingRate;

    vec3 hotColor = vec3(1.0, 0.55, 0.0);
    vec3 warmColor = vec3(0.9, 0.2, 0.0);
    vec3 coolColor = vec3(0.15, 0.02, 0.0);
    vec3 crackGlow = vec3(1.0, 0.8, 0.2);

    float heat = vHeat;
    heat = clamp(heat * (1.0 - uCoolingRate * 0.4) + crackNoise * 0.2, 0.0, 1.0);

    vec3 lavaColor = mix(coolColor, warmColor, smoothstep(0.2, 0.5, heat));
    lavaColor = mix(lavaColor, hotColor, smoothstep(0.5, 0.85, heat));

    float crackLine = 1.0 - crack;
    lavaColor = mix(crackGlow * 0.6, lavaColor, crackLine);

    float emissiveStrength = heat * 1.5;
    lavaColor += vec3(0.8, 0.2, 0.0) * emissiveStrength * 0.3;

    gl_FragColor = vec4(lavaColor, 1.0);
  }
`;

export class LavaSurface {
  private mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private params: SceneParams;

  constructor(scene: THREE.Scene, params: SceneParams) {
    this.params = params;

    const geometry = new THREE.PlaneGeometry(30, 30, 200, 200);
    geometry.rotateX(-Math.PI / 2);

    this.material = new THREE.ShaderMaterial({
      vertexShader: LAVA_VERTEX_SHADER,
      fragmentShader: LAVA_FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uFlowSpeed: { value: params.flowSpeed },
        uHeatWave: { value: params.heatWaveIntensity },
        uCoolingRate: { value: params.coolingRate },
      },
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);
  }

  update(elapsed: number): void {
    this.material.uniforms.uTime.value = elapsed;
    this.material.uniforms.uFlowSpeed.value = this.params.flowSpeed;
    this.material.uniforms.uHeatWave.value = this.params.heatWaveIntensity;
    this.material.uniforms.uCoolingRate.value = this.params.coolingRate;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
