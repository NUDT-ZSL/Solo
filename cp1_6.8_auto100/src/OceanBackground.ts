import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  varying float vWave;
  uniform float uTime;

  void main() {
    vUv = uv;
    vec3 pos = position;
    float wave = sin(pos.x * 2.0 + uTime * 0.5) * cos(pos.y * 1.5 + uTime * 0.3) * 0.15;
    wave += sin(pos.x * 4.0 - uTime * 0.8) * 0.05;
    wave += cos(pos.y * 3.0 + uTime * 0.6) * 0.08;
    pos.z += wave;
    vWave = wave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  varying float vWave;
  uniform float uTime;

  void main() {
    vec3 shallowBlue = vec3(0.29, 0.56, 0.85);
    vec3 deepPurple = vec3(0.18, 0.10, 0.38);
    vec3 midTeal = vec3(0.12, 0.38, 0.55);

    float gradientY = vUv.y;
    vec3 baseColor = mix(shallowBlue, midTeal, gradientY);
    baseColor = mix(baseColor, deepPurple, gradientY * gradientY);

    float shimmer = sin(vUv.x * 20.0 + uTime * 1.2) * cos(vUv.y * 15.0 + uTime * 0.8) * 0.04;
    shimmer += sin(vUv.x * 8.0 - uTime * 0.5) * 0.02;
    baseColor += shimmer;

    float waveLight = vWave * 1.5 + 0.3;
    baseColor += vec3(0.08, 0.12, 0.18) * waveLight;

    float caustic = sin(vUv.x * 30.0 + uTime * 2.0) * sin(vUv.y * 30.0 + uTime * 1.5);
    caustic = smoothstep(0.85, 1.0, caustic) * 0.12;
    baseColor += vec3(0.2, 0.4, 0.6) * caustic;

    float glow = smoothstep(0.0, 0.3, 1.0 - abs(gradientY - 0.5) * 2.0) * 0.15;
    baseColor += vec3(0.1, 0.2, 0.4) * glow;

    gl_FragColor = vec4(baseColor, 1.0);
  }
`;

export class OceanBackground {
  private mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;

  constructor() {
    const geometry = new THREE.PlaneGeometry(60, 40, 128, 128);
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
      },
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.z = -8;
  }

  get object(): THREE.Mesh {
    return this.mesh;
  }

  update(time: number): void {
    this.material.uniforms.uTime.value = time;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
