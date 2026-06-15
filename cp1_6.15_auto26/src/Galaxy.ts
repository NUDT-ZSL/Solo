import * as THREE from 'three'

export interface ColorScheme {
  name: string
  innerColor: THREE.Color
  outerColor: THREE.Color
}

export const COLOR_SCHEMES: ColorScheme[] = [
  {
    name: '银河蓝',
    innerColor: new THREE.Color(0xffe4a3),
    outerColor: new THREE.Color(0x5588ff)
  },
  {
    name: '星云紫',
    innerColor: new THREE.Color(0xffc4e0),
    outerColor: new THREE.Color(0x8855ff)
  },
  {
    name: '烈焰橙',
    innerColor: new THREE.Color(0xffffff),
    outerColor: new THREE.Color(0xff5522)
  },
  {
    name: '极光绿',
    innerColor: new THREE.Color(0xe8ffd6),
    outerColor: new THREE.Color(0x22ff99)
  },
  {
    name: '霓虹粉',
    innerColor: new THREE.Color(0xfff0fa),
    outerColor: new THREE.Color(0xff33aa)
  }
]

const GALAXY_RADIUS = 200
const GALAXY_THICKNESS = 20
const PARTICLE_COUNT = 10000
const STAR_COUNT = 2000
const ARMS_COUNT = 4
const TWIST_FACTOR = 3.8
const COLOR_TRANSITION_DURATION = 0.5

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aTwinklePhase;
  attribute float aTwinkleFreq;
  attribute float aBaseAlpha;
  attribute float aRadiusFactor;

  uniform float uTime;
  uniform float uSizeMultiplier;
  uniform float uPixelRatio;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vTwinkle;

  void main() {
    vColor = color;

    float twinkle = 0.5 + 0.5 * sin(uTime * aTwinkleFreq + aTwinklePhase);
    vTwinkle = twinkle;

    float sizeMod = 0.6 + 0.6 * twinkle;
    vAlpha = aBaseAlpha * (0.35 + 0.65 * twinkle);

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * sizeMod * uSizeMultiplier * uPixelRatio * (200.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vTwinkle;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv);

    if (dist > 0.5) discard;

    float softGlow = pow(1.0 - dist * 2.0, 1.8);
    float midGlow = smoothstep(0.5, 0.15, dist) * 0.7;
    float core = smoothstep(0.15, 0.0, dist) * 1.5;

    float glow = softGlow * 0.5 + midGlow * 0.5 + core;

    float alpha = glow * vAlpha;

    vec3 finalColor = vColor * (1.0 + core * 1.2 + midGlow * 0.4);

    gl_FragColor = vec4(finalColor, alpha);
  }
`

const starVertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aTwinklePhase;

  uniform float uTime;
  uniform float uPixelRatio;

  varying float vAlpha;

  void main() {
    float twinkle = 0.7 + 0.3 * sin(uTime * 0.3 + aTwinklePhase);
    vAlpha = 0.7 * twinkle;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelRatio * (600.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const starFragmentShader = /* glsl */ `
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv);
    if (dist > 0.5) discard;
    float alpha = pow(1.0 - dist * 2.0, 1.5) * vAlpha;
    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
  }
`

export class Galaxy {
  public group: THREE.Group
  private particles: THREE.Points
  private stars: THREE.Points
  private geometry: THREE.BufferGeometry
  private starGeometry: THREE.BufferGeometry
  private material: THREE.ShaderMaterial
  private starMaterial: THREE.ShaderMaterial

  private basePositions: Float32Array
  private radiusFactors: Float32Array
  private brightnessFactors: Float32Array
  private startColors: Float32Array
  private endColors: Float32Array
  private sizes: Float32Array
  private twinklePhases: Float32Array
  private twinkleFreqs: Float32Array
  private baseAlphas: Float32Array

  private currentSchemeIndex: number = 0
  private transitionProgress: number = 1.0
  private isTransitioning: boolean = false

  public rotationSpeed: number = 0.5
  public sizeMultiplier: number = 1.0

  private clock: THREE.Clock
  private tmpColor: THREE.Color

  constructor() {
    this.clock = new THREE.Clock()
    this.tmpColor = new THREE.Color()
    this.group = new THREE.Group()

    this.basePositions = new Float32Array(PARTICLE_COUNT * 3)
    this.radiusFactors = new Float32Array(PARTICLE_COUNT)
    this.brightnessFactors = new Float32Array(PARTICLE_COUNT)
    this.startColors = new Float32Array(PARTICLE_COUNT * 3)
    this.endColors = new Float32Array(PARTICLE_COUNT * 3)
    this.sizes = new Float32Array(PARTICLE_COUNT)
    this.twinklePhases = new Float32Array(PARTICLE_COUNT)
    this.twinkleFreqs = new Float32Array(PARTICLE_COUNT)
    this.baseAlphas = new Float32Array(PARTICLE_COUNT)

    this.generateParticles()
    this.geometry = this.createParticleGeometry()
    this.material = this.createParticleMaterial()
    this.particles = new THREE.Points(this.geometry, this.material)
    this.group.add(this.particles)

    this.starGeometry = this.createStarGeometry()
    this.starMaterial = this.createStarMaterial()
    this.stars = new THREE.Points(this.starGeometry, this.starMaterial)
    this.group.add(this.stars)

    this.applyColorScheme(0, false)
  }

  private generateParticles(): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3

      const rawT = Math.random()
      const t = Math.pow(rawT, 0.35)
      const radius = t * GALAXY_RADIUS

      this.radiusFactors[i] = t

      const arm = Math.floor(Math.random() * ARMS_COUNT)
      const armAngle = (arm / ARMS_COUNT) * Math.PI * 2
      const spiralAngle = radius * 0.01 * TWIST_FACTOR
      const spreadAmount = 0.45 + (1.0 - t) * 0.25
      const randomSpread = (Math.random() - 0.5) * spreadAmount
      const angle = armAngle + spiralAngle + randomSpread

      const flatY = (Math.random() - 0.5) * GALAXY_THICKNESS
      const thicknessFalloff = Math.exp(-radius * 0.012)
      const y = flatY * thicknessFalloff * (0.3 + Math.random() * 0.7)

      const radialJitter = (Math.random() - 0.5) * 6 * (1 - t * 0.6)
      const finalRadius = radius + radialJitter

      const x = Math.cos(angle) * finalRadius
      const z = Math.sin(angle) * finalRadius

      this.basePositions[i3] = x
      this.basePositions[i3 + 1] = y
      this.basePositions[i3 + 2] = z

      this.brightnessFactors[i] = 0.8 + Math.random() * 0.4

      this.sizes[i] = 0.5 + Math.random() * 1.5 + (1 - t) * 0.8

      this.twinklePhases[i] = Math.random() * Math.PI * 2
      this.twinkleFreqs[i] = 0.5 + Math.random() * 1.5

      const coreBoost = Math.exp(-radius * 0.025) * 0.45
      this.baseAlphas[i] = 0.45 + coreBoost + Math.random() * 0.25
    }
  }

  private createParticleGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry()

    const posAttr = new THREE.BufferAttribute(new Float32Array(this.basePositions), 3)
    posAttr.setUsage(THREE.StaticDrawUsage)

    const colorAttr = new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3)
    colorAttr.setUsage(THREE.DynamicDrawUsage)

    geometry.setAttribute('position', posAttr)
    geometry.setAttribute('color', colorAttr)
    geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1))
    geometry.setAttribute('aTwinklePhase', new THREE.BufferAttribute(this.twinklePhases, 1))
    geometry.setAttribute('aTwinkleFreq', new THREE.BufferAttribute(this.twinkleFreqs, 1))
    geometry.setAttribute('aBaseAlpha', new THREE.BufferAttribute(this.baseAlphas, 1))
    geometry.setAttribute('aRadiusFactor', new THREE.BufferAttribute(this.radiusFactors, 1))

    return geometry
  }

  private createParticleMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uSizeMultiplier: { value: this.sizeMultiplier },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    })
  }

  private createStarGeometry(): THREE.BufferGeometry {
    const positions = new Float32Array(STAR_COUNT * 3)
    const sizes = new Float32Array(STAR_COUNT)
    const phases = new Float32Array(STAR_COUNT)

    for (let i = 0; i < STAR_COUNT; i++) {
      const i3 = i * 3
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 700 + Math.random() * 500

      positions[i3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i3 + 2] = r * Math.cos(phi)

      sizes[i] = 0.8 + Math.random() * 2.2
      phases[i] = Math.random() * Math.PI * 2
    }

    const geometry = new THREE.BufferGeometry()
    const posAttr = new THREE.BufferAttribute(positions, 3)
    posAttr.setUsage(THREE.StaticDrawUsage)
    geometry.setAttribute('position', posAttr)
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('aTwinklePhase', new THREE.BufferAttribute(phases, 1))
    return geometry
  }

  private createStarMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  }

  private computeSchemeColors(scheme: ColorScheme, outArray: Float32Array): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3
      const t = this.radiusFactors[i]
      const easedT = t * t * (3 - 2 * t)

      const r = scheme.innerColor.r + (scheme.outerColor.r - scheme.innerColor.r) * easedT
      const g = scheme.innerColor.g + (scheme.outerColor.g - scheme.innerColor.g) * easedT
      const b = scheme.innerColor.b + (scheme.outerColor.b - scheme.innerColor.b) * easedT

      const brightness = this.brightnessFactors[i]
      outArray[i3] = r * brightness
      outArray[i3 + 1] = g * brightness
      outArray[i3 + 2] = b * brightness
    }
  }

  public applyColorScheme(index: number, animate: boolean = true): void {
    if (index < 0 || index >= COLOR_SCHEMES.length) return

    const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute
    const colorArray = colorAttr.array as Float32Array

    if (this.isTransitioning) {
      for (let i = 0; i < this.startColors.length; i++) {
        this.startColors[i] = colorArray[i]
      }
    } else {
      for (let i = 0; i < this.startColors.length; i++) {
        this.startColors[i] = colorArray[i]
      }
    }

    this.computeSchemeColors(COLOR_SCHEMES[index], this.endColors)

    this.currentSchemeIndex = index

    if (animate) {
      this.isTransitioning = true
      this.transitionProgress = 0.0
    } else {
      for (let i = 0; i < colorArray.length; i++) {
        colorArray[i] = this.endColors[i]
      }
      colorAttr.needsUpdate = true
      this.transitionProgress = 1.0
      this.isTransitioning = false
    }
  }

  public setSizeMultiplier(value: number): void {
    this.sizeMultiplier = value
    this.material.uniforms.uSizeMultiplier.value = value
  }

  public setRotationSpeed(value: number): void {
    this.rotationSpeed = value
  }

  public getCurrentSchemeIndex(): number {
    return this.currentSchemeIndex
  }

  public update(deltaTime?: number): void {
    const dt = deltaTime ?? this.clock.getDelta()
    const elapsed = this.clock.getElapsedTime()

    this.group.rotation.y += this.rotationSpeed * dt

    this.material.uniforms.uTime.value = elapsed
    this.starMaterial.uniforms.uTime.value = elapsed

    if (this.isTransitioning) {
      this.transitionProgress = Math.min(
        this.transitionProgress + dt / COLOR_TRANSITION_DURATION,
        1.0
      )

      const t = this.transitionProgress
      const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute
      const colorArray = colorAttr.array as Float32Array

      for (let i = 0; i < colorArray.length; i++) {
        colorArray[i] = this.startColors[i] + (this.endColors[i] - this.startColors[i]) * t
      }
      colorAttr.needsUpdate = true

      if (this.transitionProgress >= 1.0) {
        this.isTransitioning = false
      }
    }
  }

  public handleResize(): void {
    const pr = Math.min(window.devicePixelRatio, 2)
    this.material.uniforms.uPixelRatio.value = pr
    this.starMaterial.uniforms.uPixelRatio.value = pr
  }

  public dispose(): void {
    this.geometry.dispose()
    this.starGeometry.dispose()
    this.material.dispose()
    this.starMaterial.dispose()
  }
}
