import * as THREE from 'three'

interface Pulse {
  mesh: THREE.Mesh
  startTime: number
  maxRadius: number
  duration: number
}

interface Wall {
  mesh: THREE.Mesh
  glowMaterial: THREE.MeshBasicMaterial | null
  glowStart: number
  baseMaterial: THREE.MeshStandardMaterial
}

interface ResonanceStone {
  mesh: THREE.Mesh
  particles: THREE.Points
  collected: boolean
  hasTonePlayed: boolean
}

interface MazeData {
  walls: Array<{ x: number; z: number; width: number; depth: number }>
  stones: Array<{ x: number; z: number }>
  exit: { x: number; z: number }
  size: number
}

export class SceneManager {
  private canvas: HTMLCanvasElement
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private clock: THREE.Clock

  private player: THREE.Mesh
  private playerLight: THREE.PointLight
  private playerPos: THREE.Vector3 = new THREE.Vector3(0, 0.15, 0)
  private playerVel: THREE.Vector3 = new THREE.Vector3()
  private keys: Record<string, boolean> = {}
  private playerSpeed: number = 4

  private walls: Wall[] = []
  private stones: ResonanceStone[] = []
  private pulses: Pulse[] = []
  private exitDoor: THREE.Mesh | null = null
  private exitLight: THREE.PointLight | null = null
  private exitUnlocked: boolean = false

  private mazeSize: number = 15
  private cellSize: number = 1
  private wallThickness: number = 0.5
  private wallHeight: number = 2

  private rafId: number = 0
  private stonesCollected: number = 0

  public onStonesChange: ((count: number) => void) | null = null
  public onExit: (() => void) | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x030712)
    this.scene.fog = new THREE.FogExp2(0x030712, 0.15)

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200)
    this.camera.position.set(0, 12, 6)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    this.clock = new THREE.Clock()

    const ambient = new THREE.AmbientLight(0x1e293b, 0.15)
    this.scene.add(ambient)

    const playerGeom = new THREE.SphereGeometry(0.15, 16, 16)
    const playerMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    this.player = new THREE.Mesh(playerGeom, playerMat)
    this.player.position.copy(this.playerPos)
    this.scene.add(this.player)

    this.playerLight = new THREE.PointLight(0xffffff, 0.8, 4)
    this.playerLight.position.copy(this.playerPos)
    this.scene.add(this.playerLight)

    this.createGround()
    window.addEventListener('resize', this.onResize)
  }

  private onResize = () => {
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h, false)
  }

  private createGround() {
    const size = this.mazeSize * this.cellSize * 2
    const geom = new THREE.PlaneGeometry(size, size)
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.9,
      metalness: 0.1,
    })
    const ground = new THREE.Mesh(geom, mat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.5
    ground.receiveShadow = true
    this.scene.add(ground)
  }

  public init() {
    this.onResize()
    const mazeData = this.generateMaze()
    this.loadMaze(mazeData)
    this.saveMazeToBackend(mazeData)
    this.animate()
  }

  private generateMaze(): MazeData {
    const n = this.mazeSize
    const grid: number[][] = Array.from({ length: n }, () => Array(n).fill(1))
    const half = Math.floor(n / 2)

    const carve = (x: number, z: number) => {
      grid[z][x] = 0
      const dirs = [
        [0, -2],
        [0, 2],
        [-2, 0],
        [2, 0],
      ].sort(() => Math.random() - 0.5)

      for (const [dx, dz] of dirs) {
        const nx = x + dx
        const nz = z + dz
        if (nx > 0 && nx < n - 1 && nz > 0 && nz < n - 1 && grid[nz][nx] === 1) {
          grid[z + dz / 2][x + dx / 2] = 0
          carve(nx, nz)
        }
      }
    }

    carve(1, 1)

    const walls: MazeData['walls'] = []
    const offset = -half * this.cellSize

    for (let z = 0; z < n; z++) {
      for (let x = 0; x < n; x++) {
        if (grid[z][x] === 1) {
          walls.push({
            x: offset + x * this.cellSize,
            z: offset + z * this.cellSize,
            width: this.wallThickness,
            depth: this.wallThickness,
          })
        }
      }
    }

    const passages: Array<{ x: number; z: number }> = []
    for (let z = 0; z < n; z++) {
      for (let x = 0; x < n; x++) {
        if (grid[z][x] === 0 && !(x === 1 && z === 1)) {
          const dist = Math.sqrt((x - 1) ** 2 + (z - 1) ** 2)
          if (dist > 3) {
            passages.push({ x: offset + x * this.cellSize, z: offset + z * this.cellSize })
          }
        }
      }
    }

    passages.sort(() => Math.random() - 0.5)
    const stonePositions = passages.slice(0, 5)

    let exitPos = passages[passages.length - 1] || { x: half * this.cellSize - 2, z: half * this.cellSize - 2 }
    if (passages.length > 10) {
      exitPos = passages[passages.length - 1]
    }

    return {
      walls,
      stones: stonePositions,
      exit: exitPos,
      size: this.mazeSize,
    }
  }

  public loadMaze(data: MazeData) {
    this.walls.forEach((w) => this.scene.remove(w.mesh))
    this.stones.forEach((s) => {
      this.scene.remove(s.mesh)
      this.scene.remove(s.particles)
    })
    if (this.exitDoor) this.scene.remove(this.exitDoor)
    if (this.exitLight) this.scene.remove(this.exitLight)
    this.walls = []
    this.stones = []
    this.exitDoor = null
    this.exitLight = null
    this.stonesCollected = 0
    this.exitUnlocked = false

    if (data.size) this.mazeSize = data.size

    data.walls.forEach((w) => {
      const geom = new THREE.BoxGeometry(w.width, this.wallHeight, w.depth)
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x1f2937,
        roughness: 0.8,
        metalness: 0.2,
        emissive: 0x000000,
      })
      const mesh = new THREE.Mesh(geom, baseMat)
      mesh.position.set(w.x, this.wallHeight / 2 - 0.5, w.z)
      mesh.castShadow = true
      mesh.receiveShadow = true
      this.scene.add(mesh)

      this.walls.push({
        mesh,
        glowMaterial: null,
        glowStart: -10,
        baseMaterial: baseMat,
      })

      mesh.userData.basePosition = mesh.position.clone()
      mesh.userData.wallData = w
    })

    data.stones.forEach((s, idx) => {
      const freq = 330 + idx * 55
      const stoneGeom = new THREE.SphereGeometry(0.1, 16, 16)
      const stoneMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xfbbf24,
        emissiveIntensity: 0.6,
        roughness: 0.3,
        metalness: 0.8,
      })
      const mesh = new THREE.Mesh(stoneGeom, stoneMat)
      mesh.position.set(s.x, 0.3, s.z)
      mesh.userData.frequency = freq
      this.scene.add(mesh)

      const particleCount = 8
      const particleGeom = new THREE.BufferGeometry()
      const positions = new Float32Array(particleCount * 3)
      for (let i = 0; i < particleCount; i++) {
        const a = (i / particleCount) * Math.PI * 2
        positions[i * 3] = Math.cos(a) * 0.2
        positions[i * 3 + 1] = Math.sin(a * 2) * 0.1
        positions[i * 3 + 2] = Math.sin(a) * 0.2
      }
      particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      const particleMat = new THREE.PointsMaterial({
        color: 0xfde68a,
        size: 0.05,
        transparent: true,
        opacity: 0.8,
      })
      const particles = new THREE.Points(particleGeom, particleMat)
      particles.position.copy(mesh.position)
      this.scene.add(particles)

      this.stones.push({
        mesh,
        particles,
        collected: false,
        hasTonePlayed: false,
      })
    })

    const doorGeom = new THREE.PlaneGeometry(1, 2)
    const doorMat = new THREE.MeshBasicMaterial({
      color: 0x64748b,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    })
    const door = new THREE.Mesh(doorGeom, doorMat)
    door.position.set(data.exit.x, 0.5, data.exit.z)
    this.exitDoor = door
    this.scene.add(door)

    const exitLight = new THREE.PointLight(0x64748b, 0.1, 3)
    exitLight.position.copy(door.position)
    this.exitLight = exitLight
    this.scene.add(exitLight)

    this.playerPos.set(
      -Math.floor(this.mazeSize / 2) * this.cellSize + this.cellSize,
      0.15,
      -Math.floor(this.mazeSize / 2) * this.cellSize + this.cellSize
    )
    this.player.position.copy(this.playerPos)
    this.playerLight.position.copy(this.playerPos)
  }

  private async saveMazeToBackend(data: MazeData) {
    try {
      await fetch('/api/maze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } catch (e) {
      // ignore
    }
  }

  public triggerPulse() {
    const geom = new THREE.SphereGeometry(0.01, 32, 32)
    const mat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.6,
      side: THREE.BackSide,
      depthWrite: false,
    })
    const mesh = new THREE.Mesh(geom, mat)
    mesh.position.copy(this.playerPos)
    this.scene.add(mesh)

    this.pulses.push({
      mesh,
      startTime: this.clock.getElapsedTime(),
      maxRadius: 8,
      duration: 0.8,
    })
  }

  public handleKey(code: string, pressed: boolean) {
    this.keys[code] = pressed
  }

  public resetGame() {
    this.exitUnlocked = false
    const mazeData = this.generateMaze()
    this.loadMaze(mazeData)
    this.saveMazeToBackend(mazeData)
    this.pulses.forEach((p) => this.scene.remove(p.mesh))
    this.pulses = []
    if (this.onStonesChange) this.onStonesChange(0)
  }

  private checkWallCollision(pos: THREE.Vector3): boolean {
    const r = 0.2 + this.wallThickness / 2
    for (const wall of this.walls) {
      const wallPos = wall.mesh.position
      const dx = Math.abs(pos.x - wallPos.x)
      const dz = Math.abs(pos.z - wallPos.z)
      if (dx < r && dz < r) {
        return true
      }
    }
    return false
  }

  private animate = () => {
    this.rafId = requestAnimationFrame(this.animate)
    const dt = Math.min(this.clock.getDelta(), 0.05)
    const time = this.clock.getElapsedTime()

    let dx = 0
    let dz = 0
    if (this.keys['KeyW'] || this.keys['ArrowUp']) dz -= 1
    if (this.keys['KeyS'] || this.keys['ArrowDown']) dz += 1
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1

    const len = Math.hypot(dx, dz)
    if (len > 0) {
      dx /= len
      dz /= len
      const newPos = this.playerPos.clone()
      newPos.x += dx * this.playerSpeed * dt
      if (!this.checkWallCollision(newPos)) {
        this.playerPos.x = newPos.x
      }
      newPos.copy(this.playerPos)
      newPos.z += dz * this.playerSpeed * dt
      if (!this.checkWallCollision(newPos)) {
        this.playerPos.z = newPos.z
      }
    }

    this.player.position.copy(this.playerPos)
    this.playerLight.position.copy(this.playerPos)

    this.camera.position.set(this.playerPos.x, 10, this.playerPos.z + 6)
    this.camera.lookAt(this.playerPos.x, 0, this.playerPos.z)

    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i]
      const t = (time - p.startTime) / p.duration
      if (t >= 1) {
        this.scene.remove(p.mesh)
        this.pulses.splice(i, 1)
        p.mesh.geometry.dispose()
        ;(p.mesh.material as THREE.Material).dispose()
        continue
      }
      const radius = t * p.maxRadius
      const scale = radius / 0.01
      p.mesh.scale.set(scale, scale, scale)
      ;(p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - t)

      this.walls.forEach((w) => {
        const dist = w.mesh.position.distanceTo(p.mesh.position)
        if (Math.abs(dist - radius) < 0.6) {
          w.glowStart = time
        }
      })
    }

    this.walls.forEach((w) => {
      const glowElapsed = time - w.glowStart
      if (glowElapsed >= 0 && glowElapsed <= 0.6) {
        const gt = glowElapsed / 0.6
        const color = new THREE.Color()
        color.setHSL(
          THREE.MathUtils.lerp(0.6, 0.67, gt),
          0.8,
          THREE.MathUtils.lerp(0.68, 0.75, gt)
        )
        w.baseMaterial.emissive = color
        w.baseMaterial.emissiveIntensity = (1 - gt) * 0.8
      } else {
        w.baseMaterial.emissiveIntensity = 0
      }
    })

    this.stones.forEach((s) => {
      if (s.collected) return
      s.mesh.rotation.y += dt * (Math.PI * 2) / 1.5
      s.particles.rotation.y -= dt * 0.5
      s.particles.position.copy(s.mesh.position)
      s.particles.position.y = 0.3 + Math.sin(time * 3) * 0.08
      s.mesh.position.y = 0.3 + Math.sin(time * 3) * 0.08

      const dist = s.mesh.position.distanceTo(this.playerPos)
      if (dist < 1.5 && !s.hasTonePlayed) {
        s.hasTonePlayed = true
        const freq = (s.mesh.userData.frequency as number) || 440
        this.playStoneToneExternal(freq, 0.5)
      }
      if (dist < 1.5) {
        ;(s.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2
      } else {
        ;(s.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6
        s.hasTonePlayed = false
      }

      if (dist < 0.4) {
        s.collected = true
        this.scene.remove(s.mesh)
        this.scene.remove(s.particles)
        this.stonesCollected++
        if (this.onStonesChange) {
          this.onStonesChange(this.stonesCollected)
        }
        if (this.stonesCollected >= 5) {
          this.exitUnlocked = true
          this.unlockExit()
        }
      }
    })

    if (this.exitDoor && this.exitLight) {
      if (this.exitUnlocked) {
        ;(this.exitDoor.material as THREE.MeshBasicMaterial).color.setHex(0xa78bfa)
        ;(this.exitDoor.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(time * Math.PI * 2) * 0.3
        this.exitDoor.scale.setScalar(1 + Math.sin(time * Math.PI * 2) * 0.1)
        this.exitLight.color.setHex(0xa78bfa)
        this.exitLight.intensity = 1.5 + Math.sin(time * Math.PI * 2) * 0.5
        this.exitLight.distance = 6

        const dist = this.exitDoor.position.distanceTo(this.playerPos)
        if (dist < 0.8 && this.onExit) {
          this.onExit()
        }
      } else {
        ;(this.exitDoor.material as THREE.MeshBasicMaterial).opacity = 0.3
        this.exitLight.intensity = 0.1
      }
    }

    this.renderer.render(this.scene, this.camera)
  }

  private playStoneToneExternal(freq: number, dur: number) {
    const evt = new CustomEvent('stoneTone', { detail: { frequency: freq, duration: dur } })
    window.dispatchEvent(evt)
  }

  private unlockExit() {
    if (!this.exitDoor) return
    const pos = this.exitDoor.position
    const geom = new THREE.SphereGeometry(0.01, 24, 24)
    const mat = new THREE.MeshBasicMaterial({
      color: 0xa78bfa,
      transparent: true,
      opacity: 0.8,
      side: THREE.BackSide,
      depthWrite: false,
    })
    const burst = new THREE.Mesh(geom, mat)
    burst.position.copy(pos)
    this.scene.add(burst)
    this.pulses.push({
      mesh: burst,
      startTime: this.clock.getElapsedTime(),
      maxRadius: 5,
      duration: 1.2,
    })
  }

  public dispose() {
    cancelAnimationFrame(this.rafId)
    window.removeEventListener('resize', this.onResize)
    this.renderer.dispose()
  }
}
