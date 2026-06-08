import * as THREE from 'three';

export type ColorTheme = 'aurora' | 'flame' | 'ocean';

const THEME_COLORS: Record<ColorTheme, { bottom: THREE.Color; top: THREE.Color }> = {
  aurora: { bottom: new THREE.Color(0x00ff88), top: new THREE.Color(0xcc77ff) },
  flame: { bottom: new THREE.Color(0xff4400), top: new THREE.Color(0xffdd00) },
  ocean: { bottom: new THREE.Color(0x0044aa), top: new THREE.Color(0x00eeff) },
};

const AURORA_VERTEX_SHADER = `
  uniform float uTime;
  uniform float uAudioLevel;
  uniform vec3 uColorBottom;
  uniform vec3 uColorTop;

  attribute float aPhi;
  attribute float aTheta;
  attribute float aBand;
  attribute float aRandom;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float wave = sin(aTheta * 3.0 + uTime * 0.4 + aBand * 1.5) * 0.8
               + sin(aTheta * 7.0 - uTime * 0.3 + aRandom * 6.28) * 0.3;
    float phiOffset = wave * 0.06 * (1.0 + uAudioLevel * 2.0);

    float phi = aPhi + phiOffset;
    float theta = aTheta + sin(uTime * 0.15 + aRandom * 6.28) * 0.02;

    float radius = 18.0 + sin(theta * 2.0 + uTime * 0.3) * 0.5 + uAudioLevel * 1.5;

    vec3 pos = vec3(
      radius * sin(phi) * cos(theta),
      radius * cos(phi),
      radius * sin(phi) * sin(theta)
    );

    float heightFactor = 1.0 - (aPhi / 1.5708);
    vColor = mix(uColorBottom, uColorTop, heightFactor * 0.7 + sin(aTheta * 4.0 + uTime * 0.5) * 0.3);
    vAlpha = (0.15 + uAudioLevel * 0.3) * smoothstep(0.0, 0.3, heightFactor) * smoothstep(1.0, 0.6, heightFactor);
    vAlpha *= (0.6 + 0.4 * sin(aTheta * 5.0 + uTime * 0.6 + aBand * 2.0));

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    float sizeBase = 12.0 + uAudioLevel * 20.0;
    gl_PointSize = sizeBase * (1.0 + 0.3 * sin(uTime + aRandom * 6.28)) * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const AURORA_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float alpha = vAlpha * smoothstep(1.0, 0.2, d);
    float glow = exp(-d * d * 3.0);
    gl_FragColor = vec4(vColor * (1.0 + glow * 0.5), alpha * glow);
  }
`;

const PARTICLE_COUNT = 10000;

export class AuroraDome {
  private mesh: THREE.Points;
  private material: THREE.ShaderMaterial;
  private currentTheme: ColorTheme = 'aurora';
  private targetBottom: THREE.Color = THEME_COLORS.aurora.bottom.clone();
  private targetTop: THREE.Color = THEME_COLORS.aurora.top.clone();
  private lerpedBottom: THREE.Color = THEME_COLORS.aurora.bottom.clone();
  private lerpedTop: THREE.Color = THEME_COLORS.aurora.top.clone();

  constructor() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const phis = new Float32Array(PARTICLE_COUNT);
    const thetas = new Float32Array(PARTICLE_COUNT);
    const bands = new Float32Array(PARTICLE_COUNT);
    const randoms = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const band = Math.floor(Math.random() * 5);
      const bandCenter = (band + 0.5) * (Math.PI * 2 / 5);
      const theta = bandCenter + (Math.random() - 0.5) * 1.2;
      const phi = Math.random() * (Math.PI * 0.45) + 0.05;

      const radius = 18.0;
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      phis[i] = phi;
      thetas[i] = theta;
      bands[i] = band;
      randoms[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aPhi', new THREE.BufferAttribute(phis, 1));
    geometry.setAttribute('aTheta', new THREE.BufferAttribute(thetas, 1));
    geometry.setAttribute('aBand', new THREE.BufferAttribute(bands, 1));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader: AURORA_VERTEX_SHADER,
      fragmentShader: AURORA_FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uAudioLevel: { value: 0 },
        uColorBottom: { value: this.lerpedBottom },
        uColorTop: { value: this.lerpedTop },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.mesh = new THREE.Points(geometry, this.material);
  }

  get object(): THREE.Points {
    return this.mesh;
  }

  setTheme(theme: ColorTheme) {
    this.currentTheme = theme;
    this.targetBottom.copy(THEME_COLORS[theme].bottom);
    this.targetTop.copy(THEME_COLORS[theme].top);
  }

  update(time: number, audioLevel: number) {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uAudioLevel.value = audioLevel;

    this.lerpedBottom.lerp(this.targetBottom, 0.03);
    this.lerpedTop.lerp(this.targetTop, 0.03);
    this.material.uniforms.uColorBottom.value = this.lerpedBottom;
    this.material.uniforms.uColorTop.value = this.lerpedTop;
  }
}
