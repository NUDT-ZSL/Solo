import * as THREE from 'three'

export type EmotionTag = '喜悦' | '忧伤' | '怀念' | '平静' | '期待'

export interface MemoryData {
  id: string
  text: string
  emotion: EmotionTag
  timestamp: number
}

export interface ParticleCluster {
  id: string
  memory: MemoryData
  center: THREE.Vector3
  points: THREE.Points
  group: THREE.Group
  rotationSpeed: number
  isRecalled: boolean
  isAnimating: boolean
  originalPositions: Float32Array
  originalColors: Float32Array
  originalSizes: Float32Array
  recallGroup: THREE.Group | null
  animStartTime: number
  animType: 'recall' | 'restore' | 'highlight' | null
  animProgress: number
  highlightTimer: number | null
}

const EMOTION_COLORS: Record<EmotionTag, [number, string, string]> = {
  '喜悦': [0, '#FF8C00', '#FFD700'],
  '忧伤': [1, '#00BFFF', '#DDA0DD'],
  '怀念': [2, '#8B4513', '#FFBF00'],
  '平静': [3, '#98FF98', '#87CEEB'],
  '期待': [4, '#FF69B4', '#DDA0DD'],
}

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function textToSeed(text: string): number {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i)
    hash = ((hash << 5) - hash + ch) | 0
  }
  return Math.abs(hash) || 1
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function lerpColor(c1: THREE.Color, c2: THREE.Color, t: number): THREE.Color {
  return new THREE.Color(
    c1.r + (c2.r - c1.r) * t,
    c1.g + (c2.g - c1.g) * t,
    c1.b + (c2.b - c1.b) * t
  )
}

export class ParticleMemorySystem {
  private clusters: ParticleCluster[] = []
  private scene: THREE.Scene
  private raycaster = new THREE.Raycaster()
  private mouse = new THREE.Vector2()
  private activeRecallCluster: ParticleCluster | null = null
  private onClusterClick: ((cluster: ParticleCluster) => void) | null = null
  private onOrbClick: (() => void) | null = null
  private totalParticleCount = 0

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  setClusterClickHandler(handler: (cluster: ParticleCluster) => void) {
    this.onClusterClick = handler
  }

  setOrbClickHandler(handler: () => void) {
    this.onOrbClick = handler
  }

  getClusters(): ParticleCluster[] {
    return this.clusters
  }

  getActiveRecallCluster(): ParticleCluster | null {
    return this.activeRecallCluster
  }

  addMemory(memory: MemoryData): ParticleCluster {
    const seed = textToSeed(memory.text + memory.id)
    const rng = seededRandom(seed)

    const [_, colorStart, colorEnd] = EMOTION_COLORS[memory.emotion]
    const cStart = new THREE.Color(colorStart)
    const cEnd = new THREE.Color(colorEnd)

    const centerX = (rng() - 0.5) * 30
    const centerY = (rng() - 0.5) * 20
    const centerZ = (rng() - 0.5) * 30
    const center = new THREE.Vector3(centerX, centerY, centerZ)

    const particleCount = Math.floor(rng() * 31) + 50
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)

    const shellRadius = 1.5 + rng() * 2.0

    for (let i = 0; i < particleCount; i++) {
      const phi = Math.acos(2 * rng() - 1)
      const theta = rng() * Math.PI * 2
      const r = shellRadius * (0.7 + rng() * 0.3)

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)

      const colorT = rng()
      const color = lerpColor(cStart, cEnd, colorT)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b

      sizes[i] = 0.1 + rng() * 0.2
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const points = new THREE.Points(geometry, material)

    const group = new THREE.Group()
    group.position.copy(center)
    group.add(points)

    const rotationSpeed = 0.005 + (rng() - 0.5) * 0.002

    const cluster: ParticleCluster = {
      id: memory.id,
      memory,
      center,
      points,
      group,
      rotationSpeed,
      isRecalled: false,
      isAnimating: false,
      originalPositions: new Float32Array(positions),
      originalColors: new Float32Array(colors),
      originalSizes: new Float32Array(sizes),
      recallGroup: null,
      animStartTime: 0,
      animType: null,
      animProgress: 0,
      highlightTimer: null,
    }

    this.clusters.push(cluster)
    this.scene.add(group)
    this.totalParticleCount += particleCount

    return cluster
  }

  recallCluster(cluster: ParticleCluster) {
    if (cluster.isRecalled || cluster.isAnimating) return

    cluster.isAnimating = true
    cluster.animType = 'recall'
    cluster.animStartTime = performance.now()
    cluster.animProgress = 0
    this.activeRecallCluster = cluster
  }

  restoreCluster(cluster: ParticleCluster) {
    if (!cluster.isRecalled || cluster.isAnimating) return

    if (cluster.recallGroup) {
      this.scene.remove(cluster.recallGroup)
      cluster.recallGroup = null
    }

    cluster.isAnimating = true
    cluster.animType = 'restore'
    cluster.animStartTime = performance.now()
    cluster.animProgress = 0
    this.activeRecallCluster = null
  }

  highlightCluster(cluster: ParticleCluster) {
    if (cluster.isRecalled || cluster.isAnimating) return

    const positions = cluster.points.geometry.attributes.position as THREE.BufferAttribute
    const sizes = cluster.points.geometry.attributes.size as THREE.BufferAttribute

    for (let i = 0; i < sizes.count; i++) {
      sizes.array[i] = cluster.originalSizes[i] * 1.5
    }
    sizes.needsUpdate = true

    if (cluster.highlightTimer !== null) {
      clearTimeout(cluster.highlightTimer)
    }

    cluster.highlightTimer = window.setTimeout(() => {
      for (let i = 0; i < sizes.count; i++) {
        sizes.array[i] = cluster.originalSizes[i]
      }
      sizes.needsUpdate = true
      cluster.highlightTimer = null
    }, 300)
  }

  update(delta: number) {
    const now = performance.now()

    for (const cluster of this.clusters) {
      if (!cluster.isRecalled && !cluster.isAnimating) {
        cluster.group.rotation.y += cluster.rotationSpeed * delta * 60
      }

      if (cluster.isAnimating) {
        const elapsed = (now - cluster.animStartTime) / 1000

        if (cluster.animType === 'recall') {
          this.updateRecallAnimation(cluster, elapsed)
        } else if (cluster.animType === 'restore') {
          this.updateRestoreAnimation(cluster, elapsed)
        }
      }

      if (cluster.recallGroup) {
        const orb = cluster.recallGroup.getObjectByName('energyOrb')
        if (orb) {
          const scale = 1 + Math.sin(now / 1000 * Math.PI) * 0.1
          orb.scale.set(scale, scale, scale)
        }
      }
    }
  }

  private updateRecallAnimation(cluster: ParticleCluster, elapsed: number) {
    const positions = cluster.points.geometry.attributes.position as THREE.BufferAttribute
    const colors = cluster.points.geometry.attributes.color as THREE.BufferAttribute

    const shrinkT = Math.min(elapsed / 1.0, 1.0)
    const easedShrink = easeOutCubic(shrinkT)

    const colorT = Math.min(elapsed / 0.5, 1.0)
    const whiteColor = new THREE.Color('#FFFFFF')

    for (let i = 0; i < positions.count; i++) {
      const ox = cluster.originalPositions[i * 3]
      const oy = cluster.originalPositions[i * 3 + 1]
      const oz = cluster.originalPositions[i * 3 + 2]

      positions.array[i * 3] = ox * (1 - easedShrink)
      positions.array[i * 3 + 1] = oy * (1 - easedShrink)
      positions.array[i * 3 + 2] = oz * (1 - easedShrink)

      const origR = cluster.originalColors[i * 3]
      const origG = cluster.originalColors[i * 3 + 1]
      const origB = cluster.originalColors[i * 3 + 2]

      colors.array[i * 3] = origR + (1 - origR) * colorT
      colors.array[i * 3 + 1] = origG + (1 - origG) * colorT
      colors.array[i * 3 + 2] = origB + (1 - origB) * colorT
    }

    positions.needsUpdate = true
    colors.needsUpdate = true

    if (shrinkT >= 1.0) {
      cluster.isAnimating = false
      cluster.isRecalled = true
      cluster.animType = null
      cluster.points.visible = false
      this.createRecallOrb(cluster)
    }
  }

  private updateRestoreAnimation(cluster: ParticleCluster, elapsed: number) {
    const positions = cluster.points.geometry.attributes.position as THREE.BufferAttribute
    const colors = cluster.points.geometry.attributes.color as THREE.BufferAttribute

    const t = Math.min(elapsed / 1.0, 1.0)
    const eased = easeOutCubic(t)

    for (let i = 0; i < positions.count; i++) {
      positions.array[i * 3] = cluster.originalPositions[i * 3] * eased
      positions.array[i * 3 + 1] = cluster.originalPositions[i * 3 + 1] * eased
      positions.array[i * 3 + 2] = cluster.originalPositions[i * 3 + 2] * eased

      const origR = cluster.originalColors[i * 3]
      const origG = cluster.originalColors[i * 3 + 1]
      const origB = cluster.originalColors[i * 3 + 2]

      colors.array[i * 3] = 1 - (1 - origR) * eased
      colors.array[i * 3 + 1] = 1 - (1 - origG) * eased
      colors.array[i * 3 + 2] = 1 - (1 - origB) * eased
    }

    positions.needsUpdate = true
    colors.needsUpdate = true

    if (t >= 1.0) {
      cluster.isAnimating = false
      cluster.isRecalled = false
      cluster.animType = null
    }
  }

  private createRecallOrb(cluster: ParticleCluster) {
    const recallGroup = new THREE.Group()
    recallGroup.position.copy(cluster.center)

    const orbGeometry = new THREE.SphereGeometry(0.5, 32, 32)
    const orbMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const orb = new THREE.Mesh(orbGeometry, orbMaterial)
    orb.name = 'energyOrb'
    recallGroup.add(orb)

    const glowGeometry = new THREE.SphereGeometry(0.7, 32, 32)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    glow.name = 'energyGlow'
    recallGroup.add(glow)

    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)'
    ctx.shadowBlur = 20
    ctx.font = '48px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const text = cluster.memory.text
    const maxWidth = canvas.width - 60
    const lines: string[] = []
    let currentLine = ''

    for (const char of text) {
      const testLine = currentLine + char
      if (ctx.measureText(testLine).width > maxWidth && currentLine.length > 0) {
        lines.push(currentLine)
        currentLine = char
      } else {
        currentLine = testLine
      }
    }
    if (currentLine) lines.push(currentLine)

    const lineHeight = 60
    const startY = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2
    lines.forEach((line, idx) => {
      ctx.fillText(line, canvas.width / 2, startY + idx * lineHeight)
    })

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true

    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const sprite = new THREE.Sprite(spriteMaterial)
    sprite.scale.set(4, 2, 1)
    sprite.position.y = 1.5
    sprite.name = 'memoryText'
    recallGroup.add(sprite)

    cluster.recallGroup = recallGroup
    this.scene.add(recallGroup)
  }

  handleClick(event: MouseEvent, camera: THREE.Camera): ParticleCluster | null {
    const rect = (event.target as HTMLElement).getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, camera)

    if (this.activeRecallCluster && this.activeRecallCluster.recallGroup) {
      const orbHits = this.raycaster.intersectObjects(
        this.activeRecallCluster.recallGroup.children, true
      )
      if (orbHits.length > 0) {
        this.onOrbClick?.()
        return this.activeRecallCluster
      }
    }

    for (const cluster of this.clusters) {
      if (cluster.isRecalled) continue
      const intersects = this.raycaster.intersectObject(cluster.points, false)
      if (intersects.length > 0) {
        this.onClusterClick?.(cluster)
        return cluster
      }
    }

    return null
  }

  dismissRecall() {
    if (this.activeRecallCluster) {
      this.restoreCluster(this.activeRecallCluster)
    }
  }

  clearHighlight() {
    for (const cluster of this.clusters) {
      if (cluster.highlightTimer !== null) {
        clearTimeout(cluster.highlightTimer)
        cluster.highlightTimer = null
      }
      const sizes = cluster.points.geometry.attributes.size as THREE.BufferAttribute
      for (let i = 0; i < sizes.count; i++) {
        sizes.array[i] = cluster.originalSizes[i]
      }
      sizes.needsUpdate = true
    }
  }

  findClusterById(id: string): ParticleCluster | undefined {
    return this.clusters.find(c => c.id === id)
  }

  getEmotionGradient(emotion: EmotionTag): [string, string] {
    const [_, start, end] = EMOTION_COLORS[emotion]
    return [start, end]
  }

  getTotalParticleCount(): number {
    return this.totalParticleCount
  }
}
