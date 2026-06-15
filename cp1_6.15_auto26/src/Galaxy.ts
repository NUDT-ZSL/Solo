import * as THREE from 'three'

export interface ColorScheme {
  name: string
  innerColor: THREE.Color
  outerColor: THREE.Color
}

export const COLOR_SCHEMES: ColorScheme[] = [
  {
    name: '银河蓝',
    innerColor: new THREE.Color(0xffd68a),
    outerColor: new THREE.Color(0x4a7bff)
  },
  {
    name: '星云紫',
    innerColor: new THREE.Color(0xffa1c4),
    outerColor: new THREE.Color(0x7b4aff)
  },
  {
    name: '烈焰橙',
    innerColor: new THREE.Color(0xffffff),
    outerColor: new THREE.Color(0xff4a1a)
  },
  {
    name: '极光绿',
    innerColor: new THREE.Color(0xe0ffd6),
    outerColor: new THREE.Color(0x1aff8a)
  },
  {
    name: '霓虹粉',
    innerColor: new THREE.Color(0xfff0ff),
    outerColor: new THREE.Color(0xff1a9e)
  }
]

const GALAXY_RADIUS = 200
const GALAXY_THICKNESS = 20
const PARTICLE_COUNT = 10000
const STAR_COUNT = 2000
const ARMS_COUNT = 4
const TWIST_FACTOR = 3.5

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aTwinklePhase;
  attribute float aTwinkleFreq;
  attribute float aBaseAlpha;

  uniform float uTime;
  uniform float uSizeMultiplier;
  uniform float uPixelRatio;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = color;

    float twinkle = 0.5 + 0.5 * sin(uTime * aTwinkleFreq + aTwinklePhase);
    float sizeMod = 0.75 + 0.35 * twinkle;
    vAlpha = aBaseAlpha * (0.6 + 0.4 * twinkle);

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * sizeMod * uSizeMultiplier * uPixelRatio * (200.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv);

    if (dist > 0.5) discard;

    float glow = smoothstep(0.5, 0.0, dist);
    float core = smoothstep(0.3, 0.0, dist) * 0.8;
    float alpha = (glow * 0.6 + core) * vAlpha;

    vec3 finalColor = vColor * (1.0 + core * 0.8);

    gl_FragColor = vec4(finalColor, alpha);
  }
`

const starVertexShader = /* glsl */ `
  attribute float aSize;
  uniform float uPixelRatio;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelRatio * (800.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const starFragmentShader = /* glsl */ `
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv);
    if (dist > 0.5) discard;
    float alpha = smoothstep(0.5, 0.0, dist);
    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha * 0.85);
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
  private baseColors: Float32Array
  private targetColors: Float32Array
  private currentColors: Float32Array
  private sizes: Float32Array
  private twinklePhases: Float32Array
  private twinkleFreqs: Float32Array
  private baseAlphas: Float32Array

  private currentSchemeIndex: number = 0
  private colorTransitionProgress: number = 1.0
  private colorTransitionDuration: number = 0.5
  private isTransitioning: boolean = false

  public rotationSpeed: number = 0.5
  public sizeMultiplier: number = 1.0

  private clock: THREE.Clock

  constructor() {
    this.clock = new THREE.Clock()
    this.group = new THREE.Group()

    this.basePositions = new Float32Array(PARTICLE_COUNT * 3)
    this.baseColors = new Float32Array(PARTICLE_COUNT * 3)
    this.targetColors = new Float32Array(PARTICLE_COUNT * 3)
    this.currentColors = new Float32Array(PARTICLE_COUNT * 3)
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
    const scheme = COLOR_SCHEMES[0]

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3

      const t = Math.pow(Math.random(), 0.6)
      const radius = t * GALAXY_RADIUS

      const arm = Math.floor(Math.random() * ARMS_COUNT)
      const armAngle = (arm / ARMS_COUNT) * Math.PI * 2
      const spiralAngle = radius * 0.01 * TWIST_FACTOR
      const randomSpread = (Math.random() - 0.5) * 0.6 * (1 - t * 0.5)
      const angle = armAngle + spiralAngle + randomSpread

      const flatY = (Math.random() - 0.5) * GALAXY_THICKNESS
      const thicknessFalloff = Math.exp(-radius * 0.008)
      const y = flatY * thicknessFalloff * (0.4 + Math.random() * 0.6)

      const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 8 * (1 - t * 0.5)
      const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 8 * (1 - t * 0.5)

      this.basePositions[i3] = x
      this.basePositions[i3 + 1] = y
      this.basePositions[i3 + 2] = z

      const colorT = Math.min(radius / GALAXY_RADIUS, 1.0)
      const easedT = colorT * colorT * (3 - 2 * colorT)

      const r = scheme.innerColor.r + (scheme.outerColor.r - scheme.innerColor.r) * easedT
      const g = scheme.innerColor.g + (scheme.outerColor.g - scheme.innerColor.g) * easedT
      const b = scheme.innerColor.b + (scheme.outerColor.b - scheme.innerColor.b) * easedT

      const brightnessVar = 0.85 + Math.random() * 0.3
      this.baseColors[i3] = r * brightnessVar
      this.baseColors[i3 + 1] = g * brightnessVar
      this.baseColors[i3 + 2] = b * brightnessVar

      this.currentColors[i3] = this.baseColors[i3]
      this.currentColors[i3 + 1] = this.baseColors[i3 + 1]
      this.currentColors[i3 + 2] = this.baseColors[i3 + 2]

      this.sizes[i] = 0.5 + Math.random() * 1.5

      this.twinklePhases[i] = Math.random() * Math.PI * 2
      this.twinkleFreqs[i] = 0.5 + Math.random() * 1.5

      const coreBoost = Math.exp(-radius * 0.02) * 0.5
      this.baseAlphas[i] = 0.55 + coreBoost + Math.random() * 0.25
    }
  }

  private createParticleGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry()

    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.basePositions), 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.currentColors), 3))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1))
    geometry.setAttribute('aTwinklePhase', new THREE.BufferAttribute(this.twinklePhases, 1))
    geometry.setAttribute('aTwinkleFreq', new THREE.BufferAttribute(this.twinkleFreqs, 1))
    geometry.setAttribute('aBaseAlpha', new THREE.BufferAttribute(this.baseAlphas, 1))

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

    for (let i = 0; i < STAR_COUNT; i++) {
      const i3 = i * 3
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 800 + Math.random() * 400

      positions[i3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i3 + 2] = r * Math.cos(phi)

      sizes[i] = 0.6 + Math.random() * 1.4
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    return geometry
  }

  private createStarMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  }

  public applyColorScheme(index: number, animate: boolean = true): void {
    if (index < 0 || index >= COLOR_SCHEMES.length) return
    if (index === this.currentSchemeIndex && !this.isTransitioning) return

    const scheme = COLOR_SCHEMES[index]

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3
      const radius = Math.sqrt(
        this.basePositions[i3] * this.basePositions[i3] +
        this.basePositions[i3 + 2] * this.basePositions[i3 + 2]
      )
      const colorT = Math.min(radius / GALAXY_RADIUS, 1.0)
      const easedT = colorT * colorT * (3 - 2 * colorT)

      const brightnessVar = (this.baseColors[i3] / (COLOR_SCHEMES[this.currentSchemeIndex].innerColor.r +
        (COLOR_SCHEMES[this.currentSchemeIndex].outerColor.r - COLOR_SCHEMES[this.currentSchemeIndex].innerColor.r) * easedT)) || 1.0

      const r = scheme.innerColor.r + (scheme.outerColor.r - scheme.innerColor.r) * easedT
      const g = scheme.innerColor.g + (scheme.outerColor.g - scheme.innerColor.g) * easedT
      const b = scheme.innerColor.b + (scheme.outerColor.b - scheme.innerColor.b) * easedT

      const avgBrightness = brightnessVar * 0.3 + 1.0 * 0.7

      this.targetColors[i3] = r * avgBrightness
      this.targetColors[i3 + 1] = g * avgBrightness
      this.targetColors[i3 + 2] = b * avgBrightness
    }

    this.currentSchemeIndex = index

    if (animate) {
      this.isTransitioning = true
      this.colorTransitionProgress = 0.0
    } else {
      for (let i = 0; i < this.currentColors.length; i++) {
        this.currentColors[i] = this.targetColors[i]
      }
      const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute
      colorAttr.needsUpdate = true
      this.colorTransitionProgress = 1.0
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

    if (this.isTransitioning) {
      this.colorTransitionProgress = Math.min(
        this.colorTransitionProgress + dt / this.colorTransitionDuration,
        1.0
      )

      const t = this.colorTransitionProgress
      const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute
      const colorArray = colorAttr.array as Float32Array

      for (let i = 0; i < this.currentColors.length; i++) {
        colorArray[i] = this.currentColors[i] + (this.targetColors[i] - this.currentColors[i]) * t
      }
      colorAttr.needsUpdate = true

      if (this.colorTransitionProgress >= 1.0) {
        for (let i = 0; i < this.currentColors.length; i++) {
          this.currentColors[i] = this.targetColors[i]
        }
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
