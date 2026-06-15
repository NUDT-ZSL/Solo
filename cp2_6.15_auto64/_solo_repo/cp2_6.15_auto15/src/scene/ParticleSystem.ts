import * as THREE from 'three'

export interface Particle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  color: THREE.Color
  size: number
  life: number
  maxLife: number
  isTrail: boolean
}

export class ParticleSystem {
  private particles: Particle[] = []
  private maxParticles: number
  private geometry: THREE.BufferGeometry
  private material: THREE.ShaderMaterial
  public points: THREE.Points

  private positions: Float32Array
  private colors: Float32Array
  private sizes: Float32Array
  private alphas: Float32Array

  constructor(maxParticles: number = 500) {
    this.maxParticles = maxParticles

    this.positions = new Float32Array(this.maxParticles * 3)
    this.colors = new Float32Array(this.maxParticles * 3)
    this.sizes = new Float32Array(this.maxParticles)
    this.alphas = new Float32Array(this.maxParticles)

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1))
    this.geometry.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1))

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: null },
      },
      vertexShader: `
        attribute float size;
        attribute float alpha;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = color;
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float softEdge = 1.0 - smoothstep(0.3, 0.5, dist);
          gl_FragColor = vec4(vColor, vAlpha * softEdge);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    })

    this.points = new THREE.Points(this.geometry, this.material)
    this.points.frustumCulled = false
  }

  emit(
    position: THREE.Vector3,
    count: number,
    colorPalette: THREE.Color[],
    options?: {
      speed?: number
      life?: number
      isTrail?: boolean
    }
  ): void {
    const speed = options?.speed ?? 2
    const life = options?.life ?? 2
    const isTrail = options?.isTrail ?? false

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift()
      }

      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const particleSpeed = speed * (0.5 + Math.random() * 0.5)

      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * particleSpeed,
        Math.sin(phi) * Math.sin(theta) * particleSpeed * 0.5,
        Math.cos(phi) * particleSpeed
      )

      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)].clone()

      const particle: Particle = {
        position: position.clone(),
        velocity,
        color,
        size: isTrail ? 0.06 + Math.random() * 0.04 : 0.08 + Math.random() * 0.04,
        life,
        maxLife: life,
        isTrail,
      }

      this.particles.push(particle)
    }
  }

  update(deltaTime: number): void {
    const damping = 0.95
    const gravity = -0.2

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]

      p.life -= deltaTime

      if (p.life <= 0) {
        this.particles.splice(i, 1)
        continue
      }

      if (!p.isTrail) {
        const elasticFactor = Math.pow(damping, deltaTime * 60)
        p.velocity.multiplyScalar(elasticFactor)
      } else {
        p.velocity.multiplyScalar(Math.pow(damping, deltaTime * 30))
      }

      p.velocity.y += gravity * deltaTime * 0.3

      p.position.add(p.velocity.clone().multiplyScalar(deltaTime))
    }

    this.updateBuffers()
  }

  private updateBuffers(): void {
    const count = Math.min(this.particles.length, this.maxParticles)

    for (let i = 0; i < count; i++) {
      const p = this.particles[i]
      const lifeRatio = Math.max(0, p.life / p.maxLife)

      let sizeMultiplier: number
      let alphaMultiplier: number

      if (p.isTrail) {
        sizeMultiplier = lifeRatio * lifeRatio
        alphaMultiplier = lifeRatio
      } else {
        sizeMultiplier = Math.min(lifeRatio * 2, 1)
        alphaMultiplier = Math.min(lifeRatio * 1.5, 1)
      }

      this.positions[i * 3] = p.position.x
      this.positions[i * 3 + 1] = p.position.y
      this.positions[i * 3 + 2] = p.position.z

      this.colors[i * 3] = p.color.r
      this.colors[i * 3 + 1] = p.color.g
      this.colors[i * 3 + 2] = p.color.b

      this.sizes[i] = p.size * sizeMultiplier
      this.alphas[i] = alphaMultiplier
    }

    for (let i = count; i < this.maxParticles; i++) {
      this.positions[i * 3] = 0
      this.positions[i * 3 + 1] = -1000
      this.positions[i * 3 + 2] = 0
      this.sizes[i] = 0
      this.alphas[i] = 0
    }

    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute
    const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute
    const sizeAttr = this.geometry.getAttribute('size') as THREE.BufferAttribute
    const alphaAttr = this.geometry.getAttribute('alpha') as THREE.BufferAttribute

    posAttr.needsUpdate = true
    colorAttr.needsUpdate = true
    sizeAttr.needsUpdate = true
    alphaAttr.needsUpdate = true

    this.geometry.setDrawRange(0, count)
    this.geometry.computeBoundingSphere()
  }

  getParticles(): Particle[] {
    return this.particles
  }

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
  }
}
