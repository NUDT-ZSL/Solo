import * as THREE from 'three'
import { Neuron } from './neuron'

interface Connection {
  neuronA: Neuron
  neuronB: Neuron
  distance: number
  line: THREE.Line
  baseOpacity: number
  currentOpacity: number
  highlightEndTime: number
  highlightActive: boolean
  pulseProgress: number
  pulseActive: boolean
  pulseStartTime: number
  pulseDuration: number
}

interface Ripple {
  sprite: THREE.Sprite
  startTime: number
  duration: number
  position: THREE.Vector3
}

interface StormWave {
  originNeuron: Neuron
  visited: Set<number>
  frontier: Neuron[]
  startTime: number
  propagationSpeed: number
}

export class NeuralNetwork {
  public readonly neurons: Neuron[] = []
  public readonly connections: Connection[] = []
  public readonly neuronGroup: THREE.Group
  public readonly connectionGroup: THREE.Group
  public readonly rippleGroup: THREE.Group
  public readonly particleGroup: THREE.Group

  private readonly scene: THREE.Scene
  private readonly neuronCount: number
  private readonly sphereRadius: number
  private readonly minNeuronDistance: number
  private readonly connectionDistanceThreshold: number

  private ripples: Ripple[] = []
  private stormWaves: StormWave[] = []
  private lastAutoSignalTime: number = 0
  private readonly autoSignalInterval: number = 3000

  private particles: THREE.Points | null = null

  constructor(
    scene: THREE.Scene,
    options: {
      neuronCount?: number
      sphereRadius?: number
      minNeuronDistance?: number
      connectionDistanceThreshold?: number
    } = {}
  ) {
    this.scene = scene
    this.neuronCount = options.neuronCount ?? 800
    this.sphereRadius = options.sphereRadius ?? 10
    this.minNeuronDistance = options.minNeuronDistance ?? 0.5
    this.connectionDistanceThreshold = options.connectionDistanceThreshold ?? 2

    this.neuronGroup = new THREE.Group()
    this.connectionGroup = new THREE.Group()
    this.rippleGroup = new THREE.Group()
    this.particleGroup = new THREE.Group()

    this.neuronGroup.name = 'neuronGroup'
    this.connectionGroup.name = 'connectionGroup'
    this.rippleGroup.name = 'rippleGroup'
    this.particleGroup.name = 'particleGroup'

    this.generateNeurons()
    this.buildConnections()
    this.createBackgroundParticles(500)

    this.scene.add(this.connectionGroup)
    this.scene.add(this.neuronGroup)
    this.scene.add(this.rippleGroup)
    this.scene.add(this.particleGroup)
  }

  private generateNeurons(): void {
    const maxAttempts = this.neuronCount * 50
    let attempts = 0

    while (this.neurons.length < this.neuronCount && attempts < maxAttempts) {
      attempts++

      const u = Math.random()
      const v = Math.random()
      const theta = 2 * Math.PI * u
      const phi = Math.acos(2 * v - 1)
      const r = this.sphereRadius * Math.cbrt(Math.random())

      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.sin(phi) * Math.sin(theta)
      const z = r * Math.cos(phi)
      const pos = new THREE.Vector3(x, y, z)

      let tooClose = false
      for (const existing of this.neurons) {
        if (pos.distanceTo(existing.position) < this.minNeuronDistance) {
          tooClose = true
          break
        }
      }
      if (tooClose) continue

      const hue = 180 + Math.random() * 120
      const neuron = new Neuron({
        position: pos,
        hue,
        saturation: 0.8,
        lightness: 0.6,
        radius: 0.3
      })

      this.neurons.push(neuron)
      this.neuronGroup.add(neuron.mesh)
      this.neuronGroup.add(neuron.glowSprite)
    }

    console.log(`Generated ${this.neurons.length} neurons after ${attempts} attempts`)
  }

  private buildConnections(): void {
    const positions = new Float32Array(this.neurons.length * 3)
    for (let i = 0; i < this.neurons.length; i++) {
      positions[i * 3] = this.neurons[i].position.x
      positions[i * 3 + 1] = this.neurons[i].position.y
      positions[i * 3 + 2] = this.neurons[i].position.z
    }

    for (let i = 0; i < this.neurons.length; i++) {
      const ni = this.neurons[i]
      for (let j = i + 1; j < this.neurons.length; j++) {
        const nj = this.neurons[j]
        const dx = positions[i * 3] - positions[j * 3]
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1]
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2]
        const distSq = dx * dx + dy * dy + dz * dz

        if (distSq <= this.connectionDistanceThreshold * this.connectionDistanceThreshold) {
          const distance = Math.sqrt(distSq)
          this.createConnection(ni, nj, distance)
        }
      }
    }

    console.log(`Built ${this.connections.length} connections`)
  }

  private createConnection(neuronA: Neuron, neuronB: Neuron, distance: number): void {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array([
      neuronA.position.x, neuronA.position.y, neuronA.position.z,
      neuronB.position.x, neuronB.position.y, neuronB.position.z
    ])
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const opacityFactor = 1 - distance / this.connectionDistanceThreshold
    const baseOpacity = 0.4 + 0.4 * opacityFactor

    const material = new THREE.LineBasicMaterial({
      color: 0x6688cc,
      transparent: true,
      opacity: baseOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    const line = new THREE.Line(geometry, material)
    ;(line as any).connectionRef = this.connections.length

    neuronA.addNeighbor(neuronB)
    neuronB.addNeighbor(neuronA)

    const connection: Connection = {
      neuronA,
      neuronB,
      distance,
      line,
      baseOpacity,
      currentOpacity: baseOpacity,
      highlightEndTime: 0,
      highlightActive: false,
      pulseProgress: 0,
      pulseActive: false,
      pulseStartTime: 0,
      pulseDuration: 0
    }

    this.connections.push(connection)
    this.connectionGroup.add(line)
  }

  private createBackgroundParticles(count: number): void {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const velocities: THREE.Vector3[] = []

    const radius = this.sphereRadius * 2.5
    for (let i = 0; i < count; i++) {
      const u = Math.random()
      const v = Math.random()
      const theta = 2 * Math.PI * u
      const phi = Math.acos(2 * v - 1)
      const r = radius * (0.5 + Math.random() * 0.5)

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)

      const shade = 0.3 + Math.random() * 0.5
      colors[i * 3] = shade * 0.4
      colors[i * 3 + 1] = shade * 0.7
      colors[i * 3 + 2] = shade

      sizes[i] = 1 + Math.random() * 2

      const vdir = new THREE.Vector3(
        (Math.random() - 0.5),
        (Math.random() - 0.5),
        (Math.random() - 0.5)
      ).normalize().multiplyScalar(0.1)
      velocities.push(vdir)
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    })

    this.particles = new THREE.Points(geometry, material)
    ;(this.particles as any).velocities = velocities
    this.particleGroup.add(this.particles)
  }

  public triggerElectricalStorm(originNeuron: Neuron): void {
    const radius = 2.5
    const affectedConnections: Connection[] = []
    const affectedNeurons: Set<Neuron> = new Set([originNeuron])

    for (const conn of this.connections) {
      const dA = conn.neuronA.position.distanceTo(originNeuron.position)
      const dB = conn.neuronB.position.distanceTo(originNeuron.position)
      if (dA <= radius || dB <= radius) {
        affectedConnections.push(conn)
        affectedNeurons.add(conn.neuronA)
        affectedNeurons.add(conn.neuronB)
      }
    }

    const now = performance.now()
    for (const conn of affectedConnections) {
      conn.highlightActive = true
      conn.highlightEndTime = now + 500
      const mat = conn.line.material as THREE.LineBasicMaterial
      mat.color.setHex(0x00ffff)
    }

    for (const neuron of affectedNeurons) {
      neuron.triggerStormBoost(200)
      this.spawnRipple(neuron.position.clone())
    }

    this.stormWaves.push({
      originNeuron,
      visited: new Set(Array.from(affectedNeurons).map((n: Neuron) => n.id)),
      frontier: Array.from(affectedNeurons),
      startTime: now,
      propagationSpeed: 0.5
    })
  }

  private spawnRipple(position: THREE.Vector3): void {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(0,255,255,0)')
    gradient.addColorStop(0.5, 'rgba(0,255,255,0.5)')
    gradient.addColorStop(0.85, 'rgba(0,255,255,0.2)')
    gradient.addColorStop(1, 'rgba(0,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 128, 128)
    const texture = new THREE.CanvasTexture(canvas)

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })

    const sprite = new THREE.Sprite(material)
    sprite.scale.set(0.2, 0.2, 1)
    sprite.position.copy(position)

    this.ripples.push({
      sprite,
      startTime: performance.now(),
      duration: 800,
      position
    })

    this.rippleGroup.add(sprite)
  }

  public startAutoSignal(fromNeuron?: Neuron): void {
    const start = fromNeuron ?? this.neurons[Math.floor(Math.random() * this.neurons.length)]
    if (!start) return

    for (const neighbor of start.neighbors) {
      this.sendPulse(start, neighbor)
    }
  }

  private sendPulse(from: Neuron, to: Neuron): void {
    for (const conn of this.connections) {
      if (
        (conn.neuronA.id === from.id && conn.neuronB.id === to.id) ||
        (conn.neuronA.id === to.id && conn.neuronB.id === from.id)
      ) {
        conn.pulseActive = true
        conn.pulseStartTime = performance.now()
        conn.pulseDuration = (conn.distance / 0.5) * 16.67
        break
      }
    }
  }

  public update(currentTime: number, deltaTime: number): void {
    for (const neuron of this.neurons) {
      neuron.update(currentTime, deltaTime)
    }

    for (const conn of this.connections) {
      this.updateConnection(conn, currentTime, deltaTime)
    }

    this.updateRipples(currentTime)
    this.updateStormWaves(currentTime, deltaTime)

    if (currentTime - this.lastAutoSignalTime >= this.autoSignalInterval) {
      this.lastAutoSignalTime = currentTime
      this.startAutoSignal()
    }

    this.updateParticles(deltaTime)
  }

  private updateConnection(conn: Connection, currentTime: number, deltaTime: number): void {
    const mat = conn.line.material as THREE.LineBasicMaterial

    if (conn.highlightActive) {
      if (currentTime >= conn.highlightEndTime) {
        conn.highlightActive = false
      } else {
        const t = (conn.highlightEndTime - currentTime) / 500
        conn.currentOpacity = conn.baseOpacity + 0.4 * t
        mat.opacity = Math.min(1, conn.currentOpacity)
        return
      }
    }

    if (conn.pulseActive) {
      const elapsed = currentTime - conn.pulseStartTime
      const progress = Math.min(1, elapsed / conn.pulseDuration)
      conn.pulseProgress = progress

      mat.color.lerpColors(
        new THREE.Color(0x6688cc),
        new THREE.Color(0x00bfff),
        Math.sin(progress * Math.PI)
      )
      conn.currentOpacity = conn.baseOpacity + 0.2 * Math.sin(progress * Math.PI)
      mat.opacity = Math.min(1, conn.currentOpacity)

      if (progress >= 1) {
        conn.pulseActive = false
        conn.neuronB.triggerAutoFlash(80)
        mat.color.setHex(0x6688cc)
      }
      return
    }

    const targetColor = new THREE.Color(0x6688cc)
    if (!mat.color.equals(targetColor)) {
      mat.color.lerp(targetColor, Math.min(1, deltaTime * 4))
    }
    if (Math.abs(mat.opacity - conn.baseOpacity) > 0.01) {
      mat.opacity += (conn.baseOpacity - mat.opacity) * Math.min(1, deltaTime * 6)
      conn.currentOpacity = mat.opacity
    }
  }

  private updateRipples(currentTime: number): void {
    const maxScale = 4
    const toRemove: number[] = []

    for (let i = 0; i < this.ripples.length; i++) {
      const ripple = this.ripples[i]
      const elapsed = currentTime - ripple.startTime
      const t = elapsed / ripple.duration

      if (t >= 1) {
        toRemove.push(i)
        continue
      }

      const scale = 0.2 + t * maxScale
      ripple.sprite.scale.set(scale, scale, 1)
      ;(ripple.sprite.material as THREE.SpriteMaterial).opacity = 0.8 * (1 - t)
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i]
      const ripple = this.ripples[idx]
      const mat = ripple.sprite.material as THREE.SpriteMaterial
      if (mat.map) mat.map.dispose()
      mat.dispose()
      this.rippleGroup.remove(ripple.sprite)
      this.ripples.splice(idx, 1)
    }
  }

  private updateStormWaves(currentTime: number, deltaTime: number): void {
    const toRemove: number[] = []

    for (let wi = 0; wi < this.stormWaves.length; wi++) {
      const wave = this.stormWaves[wi]
      const elapsed = currentTime - wave.startTime
      const waveRadius = elapsed * 0.015

      const newFrontier: Neuron[] = []

      for (const frontierNeuron of wave.frontier) {
        for (const neighbor of frontierNeuron.neighbors) {
          if (wave.visited.has(neighbor.id)) continue
          const dist = frontierNeuron.position.distanceTo(neighbor.position)
          if (dist <= waveRadius) {
            wave.visited.add(neighbor.id)
            neighbor.triggerStormBoost(200)
            this.spawnRipple(neighbor.position.clone())
            newFrontier.push(neighbor)

            for (const conn of this.connections) {
              if (
                (conn.neuronA.id === frontierNeuron.id && conn.neuronB.id === neighbor.id) ||
                (conn.neuronA.id === neighbor.id && conn.neuronB.id === frontierNeuron.id)
              ) {
                conn.highlightActive = true
                conn.highlightEndTime = currentTime + 500
                const mat = conn.line.material as THREE.LineBasicMaterial
                mat.color.setHex(0x00ffff)
                break
              }
            }
          }
        }
      }

      if (newFrontier.length > 0) {
        wave.frontier = newFrontier
      } else if (elapsed > 4000) {
        toRemove.push(wi)
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.stormWaves.splice(toRemove[i], 1)
    }
  }

  private updateParticles(deltaTime: number): void {
    if (!this.particles) return

    const positions = this.particles.geometry.attributes.position.array as Float32Array
    const velocities = (this.particles as any).velocities as THREE.Vector3[]
    const radius = this.sphereRadius * 2.5

    for (let i = 0; i < velocities.length; i++) {
      positions[i * 3] += velocities[i].x * deltaTime
      positions[i * 3 + 1] += velocities[i].y * deltaTime
      positions[i * 3 + 2] += velocities[i].z * deltaTime

      const distSq =
        positions[i * 3] ** 2 +
        positions[i * 3 + 1] ** 2 +
        positions[i * 3 + 2] ** 2

      if (distSq > radius * radius) {
        const dist = Math.sqrt(distSq)
        positions[i * 3] *= radius / dist * 0.9
        positions[i * 3 + 1] *= radius / dist * 0.9
        positions[i * 3 + 2] *= radius / dist * 0.9
      }
    }

    this.particles.geometry.attributes.position.needsUpdate = true
  }

  public dispose(): void {
    for (const neuron of this.neurons) {
      neuron.dispose()
    }
    for (const conn of this.connections) {
      conn.line.geometry.dispose()
      ;(conn.line.material as THREE.Material).dispose()
    }
    if (this.particles) {
      this.particles.geometry.dispose()
      ;(this.particles.material as THREE.Material).dispose()
    }
  }
}
