import * as THREE from 'three';

export interface CloudParticlesConfig {
  count: number;
  flowSpeed: number;
  beamIntensity: number;
}

const CLOUD_VERTEX_SHADER = `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aPhase;
  attribute float aFlowOffset;

  uniform float uTime;
  uniform float uFlowSpeed;
  uniform float uBeamIntensity;
  uniform float uBreathScale;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = aColor;

    vec3 pos = position;

    float flowX = sin(uTime * uFlowSpeed * 0.3 + aFlowOffset) * 2.0;
    float flowZ = cos(uTime * uFlowSpeed * 0.2 + aFlowOffset * 1.3) * 1.5;
    float flowY = sin(uTime * uFlowSpeed * 0.15 + aPhase) * 0.8;

    pos.x += flowX;
    pos.z += flowZ;
    pos.y += flowY;

    float breath = 1.0 + sin(uTime * 0.5 + aPhase) * 0.05 * uBreathScale;
    pos *= breath;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

    float dist = length(mvPosition.xyz);
    float fogFactor = smoothstep(60.0, 120.0, dist);

    vec3 lightDir = normalize(vec3(0.3, 1.0, 0.2));
    float lightInfluence = max(dot(normalize(pos - vec3(0.0, -10.0, 0.0)), lightDir), 0.0);
    float volumetricGlow = pow(lightInfluence, 3.0) * uBeamIntensity * 0.6;

    vColor = aColor + vec3(volumetricGlow * 0.5, volumetricGlow * 0.3, volumetricGlow * 0.1);

    float sizeAtten = (300.0 / -mvPosition.z);
    gl_PointSize = aSize * sizeAtten * (1.0 + volumetricGlow * 2.0);
    gl_PointSize = clamp(gl_PointSize, 1.0, 64.0);

    vAlpha = smoothstep(0.0, 0.15, aSize / 8.0) * (1.0 - fogFactor);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const CLOUD_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if (dist > 0.5) discard;

    float alpha = smoothstep(0.5, 0.05, dist);
    alpha *= vAlpha;

    float glow = exp(-dist * 4.0) * 0.4;
    vec3 finalColor = vColor + vColor * glow;

    gl_FragColor = vec4(finalColor, alpha * 0.7);
  }
`;

export class CloudParticles {
  private mesh: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private config: CloudParticlesConfig;
  private basePositions: Float32Array;
  private baseCount: number;

  constructor(config: CloudParticlesConfig) {
    this.config = config;
    this.baseCount = config.count;
    this.basePositions = new Float32Array(0);

    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.ShaderMaterial({
      vertexShader: CLOUD_VERTEX_SHADER,
      fragmentShader: CLOUD_FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uFlowSpeed: { value: config.flowSpeed },
        uBeamIntensity: { value: config.beamIntensity },
        uBreathScale: { value: 1.0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.mesh = new THREE.Points(this.geometry, this.material);
    this.buildParticles(config.count);
  }

  private buildParticles(count: number) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const flowOffsets = new Float32Array(count);

    const warmWhite = new THREE.Color(0xfff5ee);
    const lightPink = new THREE.Color(0xffd6e0);
    const tmpColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 50 + 5;
      const heightBase = (Math.random() - 0.5) * 12;
      const clusterCount = Math.floor(Math.random() * 3);
      const clusterOffset = clusterCount * 0.3;

      positions[i3] = Math.cos(angle) * radius + (Math.random() - 0.5) * 10;
      positions[i3 + 1] = heightBase + clusterOffset + Math.sin(radius * 0.1) * 3;
      positions[i3 + 2] = Math.sin(angle) * radius + (Math.random() - 0.5) * 10;

      const t = Math.random();
      tmpColor.lerpColors(warmWhite, lightPink, t);
      colors[i3] = tmpColor.r;
      colors[i3 + 1] = tmpColor.g;
      colors[i3 + 2] = tmpColor.b;

      sizes[i] = Math.random() * 6 + 2;
      phases[i] = Math.random() * Math.PI * 2;
      flowOffsets[i] = Math.random() * Math.PI * 2;
    }

    this.basePositions = new Float32Array(positions);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    this.geometry.setAttribute('aFlowOffset', new THREE.BufferAttribute(flowOffsets, 1));
  }

  update(time: number) {
    this.material.uniforms.uTime.value = time;
  }

  setCount(count: number) {
    if (count === this.baseCount) return;
    this.baseCount = count;
    this.buildParticles(count);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aColor.needsUpdate = true;
    this.geometry.attributes.aSize.needsUpdate = true;
    this.geometry.attributes.aPhase.needsUpdate = true;
    this.geometry.attributes.aFlowOffset.needsUpdate = true;
  }

  setFlowSpeed(speed: number) {
    this.config.flowSpeed = speed;
    this.material.uniforms.uFlowSpeed.value = speed;
  }

  setBeamIntensity(intensity: number) {
    this.config.beamIntensity = intensity;
    this.material.uniforms.uBeamIntensity.value = intensity;
  }

  getObject(): THREE.Points {
    return this.mesh;
  }
}
