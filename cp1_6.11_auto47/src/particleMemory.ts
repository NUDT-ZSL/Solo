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

const MAX_TOTAL_PARTICLES = 2000
const RECALL_DURATION_SEC = 1.0
const COLOR_FADE_SEC = 0.5
const HIGHLIGHT_DURATION_MS = 300
const HIGHLIGHT_SCALE = 1.5

const EMOTION_COLORS: Record<EmotionTag, [number, string, string]> = {
  '喜悦': [0, '#FF8C00', '#FFD700'],
  '忧伤': [1, '#00BFFF', '#DDA0DD'],
  '怀念': [2, '#8B4513', '#FFBF00'],
  '平静': [3, '#98FF98', '#87CEEB'],
  '期待': [4, '#FF69B4', '#DDA0DD'],
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function textToSeed(text: string): number {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i)
    hash = ((hash << 5) - hash + ch) | 0
  }
  const result = Math.abs(hash) || 1
  console.debug('[ParticleMemory] textToSeed:', text, '-> seed:', result)
  return result
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
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
  private frameWarningCount = 0

  constructor(scene: THREE.Scene) {
    this.scene = scene
    console.log('[ParticleMemory] System initialized')
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

  addMemory(memory: MemoryData): ParticleCluster | null {
    const seed = textToSeed(memory.text + memory.id)
    const rng = mulberry32(seed)

    const particleCount = Math.floor(rng() * 31) + 50

    if (this.totalParticleCount + particleCount > MAX_TOTAL_PARTICLES) {
      console.warn(
        `[ParticleMemory] 粒子数量超出限制: 当前${this.totalParticleCount} + 新增${particleCount} > 上限${MAX_TOTAL_PARTICLES}`
      )
      return null
    }

    const [_, colorStart, colorEnd] = EMOTION_COLORS[memory.emotion]
    const cStart = new THREE.Color(colorStart)
    const cEnd = new THREE.Color(colorEnd)

    const centerX = (rng() - 0.5) * 30
    const centerY = (rng() - 0.5) * 20
    const centerZ = (rng() - 0.5) * 30
    const center = new THREE.Vector3(centerX, centerY, centerZ)

    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)

    const shellRadius = 1.5 + rng() * 2.0

    for (let i = 0; i < particleCount; i++) {
      const u = rng()
      const v = rng()
      const theta = 2 * Math.PI * u
      const phi = Math.acos(2 * v - 1)
      const r = shellRadius * (0.7 + rng() * 0.3)

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)

      const colorT = rng()
      colors[i * 3] = cStart.r + (cEnd.r - cStart.r) * colorT
      colors[i * 3 + 1] = cStart.g + (cEnd.g - cStart.g) * colorT
      colors[i * 3 + 2] = cStart.b + (cEnd.b - cStart.b) * colorT

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

    console.log(
      `[ParticleMemory] 新增粒子簇: id=${memory.id}, 情感=${memory.emotion}, ` +
      `粒子数=${particleCount}, 总数=${this.totalParticleCount}, 中心=(${centerX.toFixed(1)}, ${centerY.toFixed(1)}, ${centerZ.toFixed(1)})`
    )
    return cluster
  }

  recallCluster(cluster: ParticleCluster) {
    if (cluster.isRecalled || cluster.isAnimating) return

    console.log(`[ParticleMemory] 召回粒子簇: ${cluster.id} - "${cluster.memory.text}"`)
    cluster.isAnimating = true
    cluster.animType = 'recall'
    cluster.animStartTime = performance.now()
    cluster.animProgress = 0
    this.activeRecallCluster = cluster
  }

  restoreCluster(cluster: ParticleCluster) {
    if (!cluster.isRecalled || cluster.isAnimating) return

    console.log(`[ParticleMemory] 恢复粒子簇: ${cluster.id}`)

    if (cluster.recallGroup) {
      this.scene.remove(cluster.recallGroup)
      cluster.recallGroup = null
    }

    cluster.points.visible = true
    cluster.isAnimating = true
    cluster.animType = 'restore'
    cluster.animStartTime = performance.now()
    cluster.animProgress = 0
    this.activeRecallCluster = null
  }

  highlightCluster(cluster: ParticleCluster) {
    console.log(`[ParticleMemory] 高亮粒子簇: ${cluster.id}`)

    const sizes = cluster.points.geometry.attributes.size as THREE.BufferAttribute
    const sizeArr = sizes.array as Float32Array
    for (let i = 0; i < sizeArr.length; i++) {
      sizeArr[i] = cluster.originalSizes[i] * HIGHLIGHT_SCALE
    }
    sizes.needsUpdate = true
    cluster.points.geometry.setAttribute('size', sizes)

    if (cluster.highlightTimer !== null) {
      clearTimeout(cluster.highlightTimer)
    }

    cluster.highlightTimer = window.setTimeout(() => {
      this.restoreHighlight(cluster)
    }, HIGHLIGHT_DURATION_MS)
  }

  restoreHighlight(cluster: ParticleCluster) {
    const sizes = cluster.points.geometry.attributes.size as THREE.BufferAttribute
    const sizeArr = sizes.array as Float32Array
    for (let i = 0; i < sizeArr.length; i++) {
      sizeArr[i] = cluster.originalSizes[i]
    }
    sizes.needsUpdate = true
    cluster.points.geometry.setAttribute('size', sizes)

    if (cluster.highlightTimer !== null) {
      clearTimeout(cluster.highlightTimer)
      cluster.highlightTimer = null
    }
    console.debug(`[ParticleMemory] 恢复高亮: ${cluster.id}`)
  }

  update(delta: number) {
    const frameStart = performance.now()
    const now = frameStart

    for (let c = 0; c < this.clusters.length; c++) {
      const cluster = this.clusters[c]

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
        const orb = cluster.recallGroup.getObjectByName('energyOrb') as THREE.Mesh
        const glow = cluster.recallGroup.getObjectByName('energyGlow') as THREE.Mesh
        if (orb) {
          const scale = 1 + Math.sin((now / 1000) * Math.PI) * 0.1
          orb.scale.setScalar(scale)
          if (glow) glow.scale.setScalar(scale)
        }
      }
    }

    const frameDuration = performance.now() - frameStart
    if (frameDuration > 16 && this.frameWarningCount < 5) {
      console.warn(
        `[ParticleMemory] 帧时间超过16ms: ${frameDuration.toFixed(1)}ms, 簇数量=${this.clusters.length}`
      )
      this.frameWarningCount++
    }
  }

  private updateRecallAnimation(cluster: ParticleCluster, elapsed: number) {
    const positions = cluster.points.geometry.attributes.position as THREE.BufferAttribute
    const colors = cluster.points.geometry.attributes.color as THREE.BufferAttribute
    const posArr = positions.array as Float32Array
    const colArr = colors.array as Float32Array

    const shrinkT = Math.min(elapsed / RECALL_DURATION_SEC, 1.0)
    const eased = easeOutCubic(shrinkT)
    const colorT = Math.min(elapsed / COLOR_FADE_SEC, 1.0)
    cluster.animProgress = eased

    const total = posArr.length
    for (let i = 0; i < total; i++) {
      posArr[i] = cluster.originalPositions[i] * (1 - eased)
    }

    const colTotal = colArr.length
    for (let i = 0; i < colTotal; i += 3) {
      const or = cluster.originalColors[i]
      const og = cluster.originalColors[i + 1]
      const ob = cluster.originalColors[i + 2]
      colArr[i] = or + (1.0 - or) * colorT
      colArr[i + 1] = og + (1.0 - og) * colorT
      colArr[i + 2] = ob + (1.0 - ob) * colorT
    }

    positions.needsUpdate = true
    colors.needsUpdate = true
    cluster.points.geometry.setAttribute('position', positions)
    cluster.points.geometry.setAttribute('color', colors)

    if (shrinkT >= 1.0) {
      cluster.isAnimating = false
      cluster.isRecalled = true
      cluster.animType = null
      cluster.points.visible = false
      this.createRecallOrb(cluster)
      console.debug(`[ParticleMemory] 召回动画完成: ${cluster.id}`)
    }
  }

  private updateRestoreAnimation(cluster: ParticleCluster, elapsed: number) {
    const positions = cluster.points.geometry.attributes.position as THREE.BufferAttribute
    const colors = cluster.points.geometry.attributes.color as THREE.BufferAttribute
    const posArr = positions.array as Float32Array
    const colArr = colors.array as Float32Array

    const t = Math.min(elapsed / RECALL_DURATION_SEC, 1.0)
    const eased = easeOutCubic(t)
    cluster.animProgress = eased

    const total = posArr.length
    for (let i = 0; i < total; i++) {
      posArr[i] = cluster.originalPositions[i] * eased
    }

    const colTotal = colArr.length
    for (let i = 0; i < colTotal; i += 3) {
      const or = cluster.originalColors[i]
      const og = cluster.originalColors[i + 1]
      const ob = cluster.originalColors[i + 2]
      colArr[i] = 1.0 - (1.0 - or) * eased
      colArr[i + 1] = 1.0 - (1.0 - og) * eased
      colArr[i + 2] = 1.0 - (1.0 - ob) * eased
    }

    positions.needsUpdate = true
    colors.needsUpdate = true
    cluster.points.geometry.setAttribute('position', positions)
    cluster.points.geometry.setAttribute('color', colors)

    if (t >= 1.0) {
      cluster.isAnimating = false
      cluster.isRecalled = false
      cluster.animType = null
      console.debug(`[ParticleMemory] 恢复动画完成: ${cluster.id}`)
    }
  }

  private createRecallOrb(cluster: ParticleCluster) {
    const recallGroup = new THREE.Group()
    recallGroup.position.copy(cluster.center)

    const orbGeometry = new THREE.SphereGeometry(0.5, 32, 32)
    const orbMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      emissive: 0x88ccff,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      shininess: 100,
    })
    const orb = new THREE.Mesh(orbGeometry, orbMaterial)
    orb.name = 'energyOrb'
    recallGroup.add(orb)

    const glowGeometry = new THREE.SphereGeometry(0.8, 32, 32)
    const glowMaterial = new THREE.MeshPhongMaterial({
      color: 0x4488ff,
      emissive: 0x4488ff,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    glow.name = 'energyGlow'
    recallGroup.add(glow)

    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.shadowColor = 'rgba(255, 255, 255, 0.9)'
    ctx.shadowBlur = 25
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
    texture.minFilter = THREE.LinearFilter

    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const sprite = new THREE.Sprite(spriteMaterial)
    sprite.scale.set(5, 2.5, 1)
    sprite.position.y = 1.8
    sprite.name = 'memoryText'
    recallGroup.add(sprite)

    cluster.recallGroup = recallGroup
    this.scene.add(recallGroup)
    console.log(`[ParticleMemory] 能量光球已创建, 文本="${text}", 行数=${lines.length}`)
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
        console.debug('[ParticleMemory] 点击了能量光球')
        this.onOrbClick?.()
        return this.activeRecallCluster
      }
    }

    for (const cluster of this.clusters) {
      if (cluster.isRecalled) continue
      const intersects = this.raycaster.intersectObject(cluster.points, false)
      if (intersects.length > 0) {
        console.debug(`[ParticleMemory] 点击了粒子簇: ${cluster.id}`)
        this.onClusterClick?.(cluster)
        return cluster
      }
    }

    return null
  }

  dismissRecall() {
    if (this.activeRecallCluster) {
      console.log('[ParticleMemory] 退出召回模式')
      this.restoreCluster(this.activeRecallCluster)
    }
  }

  clearHighlight() {
    console.log('[ParticleMemory] 清除所有高亮')
    for (const cluster of this.clusters) {
      this.restoreHighlight(cluster)
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

  getMaxParticleCount(): number {
    return MAX_TOTAL_PARTICLES
  }
}
