import * as THREE from 'three'

const MAX_PARTICLES = 5000

interface Particle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  life: number
  maxLife: number
  size: number
  type: 'lava' | 'spark'
}

export class ParticleEmitter {
  mesh: THREE.Points
  particles: Particle[]
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  alphas: Float32Array
  geometry: THREE.BufferGeometry
  count: number

  constructor() {
    this.particles = []
    this.count = 0

    this.positions = new Float32Array(MAX_PARTICLES * 3)
    this.colors = new Float32Array(MAX_PARTICLES * 3)
    this.sizes = new Float32Array(MAX_PARTICLES)
    this.alphas = new Float32Array(MAX_PARTICLES)

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3))
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1))
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1))
    this.geometry.setDrawRange(0, 0)

    const material = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aAlpha;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float glow = 1.0 - smoothstep(0.0, 0.5, d);
          gl_FragColor = vec4(vColor, vAlpha * glow);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    this.mesh = new THREE.Points(this.geometry, material)
    this.mesh.frustumCulled = false
  }

  spawnAmbient(origin: THREE.Vector3, density: number) {
    const count = Math.floor(density * 2)
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break
      const angle = Math.random() * Math.PI * 2
      const speed = 0.5 + Math.random() * 1.5
      this.particles.push({
        position: origin.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.5, Math.random() * 0.2, (Math.random() - 0.5) * 0.5)),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed * 0.3,
          1 + Math.random() * 2,
          Math.sin(angle) * speed * 0.3
        ),
        life: 0,
        maxLife: 0.8 + Math.random() * 1.2,
        size: 0.15 + Math.random() * 0.25,
        type: 'lava',
      })
    }
  }

  spawnEruption(origin: THREE.Vector3, density: number) {
    const lavaCount = Math.floor(density * 80)
    const sparkCount = Math.floor(density * 120)

    for (let i = 0; i < lavaCount; i++) {
      if (this.particles.length >= MAX_PARTICLES) break
      const angle = Math.random() * Math.PI * 2
      const speed = 2 + Math.random() * 5
      const upSpeed = 6 + Math.random() * 10
      this.particles.push({
        position: origin.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3)),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          upSpeed,
          Math.sin(angle) * speed
        ),
        life: 0,
        maxLife: 1.0 + Math.random() * 2.0,
        size: 0.2 + Math.random() * 0.4,
        type: 'lava',
      })
    }

    for (let i = 0; i < sparkCount; i++) {
      if (this.particles.length >= MAX_PARTICLES) break
      const angle = Math.random() * Math.PI * 2
      const speed = 3 + Math.random() * 8
      const upSpeed = 8 + Math.random() * 12
      this.particles.push({
        position: origin.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.5, (Math.random() - 0.5) * 0.2)),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          upSpeed,
          Math.sin(angle) * speed
        ),
        life: 0,
        maxLife: 0.5 + Math.random() * 1.5,
        size: 0.05 + Math.random() * 0.1,
        type: 'spark',
      })
    }
  }

  update(delta: number) {
    const gravity = new THREE.Vector3(0, -9.8, 0)
    let alive = 0

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life += delta
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1)
        continue
      }

      p.velocity.add(gravity.clone().multiplyScalar(delta))
      p.position.add(p.velocity.clone().multiplyScalar(delta))

      if (p.position.y < 0.01 && p.velocity.y < 0) {
        p.velocity.y *= -0.3
        p.velocity.x *= 0.7
        p.velocity.z *= 0.7
        p.position.y = 0.01
      }
    }

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]
      const t = p.life / p.maxLife
      const fade = 1.0 - t

      this.positions[i * 3] = p.position.x
      this.positions[i * 3 + 1] = p.position.y
      this.positions[i * 3 + 2] = p.position.z

      if (p.type === 'lava') {
        const r = 1.0
        const g = 0.3 + 0.4 * (1.0 - t)
        const b = 0.05
        this.colors[i * 3] = r
        this.colors[i * 3 + 1] = g
        this.colors[i * 3 + 2] = b
      } else {
        this.colors[i * 3] = 1.0
        this.colors[i * 3 + 1] = 0.9 - t * 0.5
        this.colors[i * 3 + 2] = 0.5 - t * 0.4
      }

      this.sizes[i] = p.size * (0.5 + 0.5 * fade)
      this.alphas[i] = fade
      alive++
    }

    this.count = alive
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.aColor.needsUpdate = true
    this.geometry.attributes.aSize.needsUpdate = true
    this.geometry.attributes.aAlpha.needsUpdate = true
    this.geometry.setDrawRange(0, this.count)
  }

  reset() {
    this.particles = []
    this.geometry.setDrawRange(0, 0)
  }
}
