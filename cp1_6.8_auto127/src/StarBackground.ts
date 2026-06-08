import * as THREE from 'three'

const STAR_COUNT = 2500
const STAR_SPREAD = 800
const NEBULA_COLOR_A = new THREE.Color(0x0a0a2e)
const NEBULA_COLOR_B = new THREE.Color(0x1a0a3e)

const starVertexShader = `
  attribute float aSize;
  attribute float aPhase;
  uniform float uTime;
  varying float vAlpha;
  void main() {
    vAlpha = 0.4 + 0.6 * (0.5 + 0.5 * sin(uTime * 0.8 + aPhase));
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (200.0 / -mvPosition.z);
    gl_PointSize = max(gl_PointSize, 0.5);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const starFragmentShader = `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float glow = 1.0 - smoothstep(0.0, 0.5, d);
    gl_FragColor = vec4(0.85, 0.88, 1.0, vAlpha * glow);
  }
`

const nebulaVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const nebulaFragmentShader = `
  varying vec2 vUv;
  uniform float uTime;
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  void main() {
    vec2 uv = vUv;
    float n = noise(uv * 4.0 + uTime * 0.02) * 0.5
            + noise(uv * 8.0 - uTime * 0.03) * 0.25
            + noise(uv * 16.0 + uTime * 0.01) * 0.125;
    vec3 colA = vec3(0.04, 0.04, 0.18);
    vec3 colB = vec3(0.1, 0.04, 0.24);
    vec3 col = mix(colA, colB, n);
    float dist = length(uv - 0.5);
    float vignette = 1.0 - smoothstep(0.2, 0.7, dist);
    col *= vignette * 0.6 + 0.4;
    gl_FragColor = vec4(col, 1.0);
  }
`

export class StarBackground {
  private starPoints: THREE.Points
  private starMaterial: THREE.ShaderMaterial
  private nebulaMesh: THREE.Mesh
  private nebulaMaterial: THREE.ShaderMaterial
  private group: THREE.Group
  private autoRotateSpeed: number

  constructor() {
    this.group = new THREE.Group()
    this.autoRotateSpeed = 0.5
    this.starMaterial = new THREE.ShaderMaterial({
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      uniforms: { uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
    })
    this.starPoints = this.createStars()
    this.nebulaMaterial = new THREE.ShaderMaterial({
      vertexShader: nebulaVertexShader,
      fragmentShader: nebulaFragmentShader,
      uniforms: { uTime: { value: 0 } },
      side: THREE.BackSide,
      depthWrite: false,
    })
    this.nebulaMesh = this.createNebula()
    this.group.add(this.starPoints)
    this.group.add(this.nebulaMesh)
  }

  private createStars(): THREE.Points {
    const positions = new Float32Array(STAR_COUNT * 3)
    const sizes = new Float32Array(STAR_COUNT)
    const phases = new Float32Array(STAR_COUNT)
    for (let i = 0; i < STAR_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = STAR_SPREAD * (0.5 + Math.random() * 0.5)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
      sizes[i] = 0.5 + Math.random() * 2.5
      phases[i] = Math.random() * Math.PI * 2
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
    return new THREE.Points(geo, this.starMaterial)
  }

  private createNebula(): THREE.Mesh {
    const geo = new THREE.SphereGeometry(900, 32, 32)
    const mesh = new THREE.Mesh(geo, this.nebulaMaterial)
    return mesh
  }

  setAutoRotateSpeed(speed: number) {
    this.autoRotateSpeed = speed
  }

  update(delta: number, elapsed: number) {
    this.starMaterial.uniforms.uTime.value = elapsed
    this.nebulaMaterial.uniforms.uTime.value = elapsed
    this.group.rotation.y += delta * this.autoRotateSpeed * 0.05
  }

  getObject(): THREE.Group {
    return this.group
  }

  dispose() {
    this.starPoints.geometry.dispose()
    this.starMaterial.dispose()
    this.nebulaMesh.geometry.dispose()
    this.nebulaMaterial.dispose()
  }
}
