import * as THREE from 'three'
import { Star, Constellation } from './types'

export interface ConstellationLine {
  startIndex: number
  endIndex: number
  constellationId: string
}

export interface ConstellationSystem {
  group: THREE.Group
  lines: THREE.LineSegments[]
  haloParticles: THREE.Points
  highlight: (constellationId: string | null) => void
  getConstellationByLine: (line: THREE.LineSegments) => Constellation | null
  update: (delta: number) => void
  constellations: Constellation[]
  lineToConstellation: Map<THREE.LineSegments, Constellation>
  raycastTargets: THREE.LineSegments[]
}

class UnionFind {
  private parent: number[]
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i)
  }
  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x])
    }
    return this.parent[x]
  }
  union(x: number, y: number): boolean {
    const px = this.find(x)
    const py = this.find(y)
    if (px === py) return false
    this.parent[px] = py
    return true
  }
}

export function kruskalMST(
  vertices: Array<{ index: number; pos: THREE.Vector3 }>,
  maxDistance: number
): Array<[number, number]> {
  if (vertices.length < 2) return []
  const edges: Array<{ a: number; b: number; dist: number }> = []
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const dist = vertices[i].pos.distanceTo(vertices[j].pos)
      if (dist <= maxDistance) {
        edges.push({ a: i, b: j, dist })
      }
    }
  }
  edges.sort((a, b) => a.dist - b.dist)
  const uf = new UnionFind(vertices.length)
  const result: Array<[number, number]> = []
  for (const edge of edges) {
    if (uf.union(edge.a, edge.b)) {
      result.push([vertices[edge.a].index, vertices[edge.b].index])
    }
    if (result.length === vertices.length - 1) break
  }
  return result
}

export function primMST(
  vertices: Array<{ index: number; pos: THREE.Vector3 }>,
  maxDistance: number
): Array<[number, number]> {
  if (vertices.length < 2) return []
  const n = vertices.length
  const inMST = new Array<boolean>(n).fill(false)
  const result: Array<[number, number]> = []
  const distances = new Array<number>(n).fill(Infinity)
  const parents = new Array<number>(n).fill(-1)
  distances[0] = 0
  for (let i = 0; i < n; i++) {
    let minDist = Infinity
    let u = -1
    for (let v = 0; v < n; v++) {
      if (!inMST[v] && distances[v] < minDist) {
        minDist = distances[v]
        u = v
      }
    }
    if (u === -1) break
    inMST[u] = true
    if (parents[u] !== -1) {
      result.push([vertices[parents[u]].index, vertices[u].index])
    }
    for (let v = 0; v < n; v++) {
      if (!inMST[v]) {
        const dist = vertices[u].pos.distanceTo(vertices[v].pos)
        if (dist <= maxDistance && dist < distances[v]) {
          distances[v] = dist
          parents[v] = u
        }
      }
    }
  }
  return result
}

export async function loadConstellationData(): Promise<Constellation[]> {
  try {
    const response = await fetch('/data/constellations.json')
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    const data = await response.json()
    return data.constellations as Constellation[]
  } catch (err) {
    console.warn('加载星座数据失败，使用内置回退数据:', err)
    return getFallbackConstellations()
  }
}

function getFallbackConstellations(): Constellation[] {
  return [
    {
      id: 'orion',
      name: '猎户座',
      nameEn: 'Orion',
      description: '猎户座是赤道带星座之一，位于双子座、麒麟座、大犬座、金牛座、天兔座、波江座与小犬座之间，其北部沉浸在银河之中。',
      mythology: '在希腊神话中，猎户座是海神波塞冬的儿子奥利翁，他是一位英俊而强壮的猎人。奥利翁夸口说他可以杀死世上任何动物，这引起了大地女神盖亚的愤怒，她派出一只蝎子去杀死奥利翁。后来，宙斯将奥利翁和蝎子都升上天空，成为猎户座和天蝎座，但永远不会同时出现在天空中。',
      mainStars: ['参宿四（Betelgeuse）', '参宿七（Rigel）', '参宿五（Bellatrix）', '参宿二（Alnilam）', '参宿一（Alnitak）'],
      starIndices: [0, 1, 2, 3, 4, 5, 6],
      lines: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 4], [0, 5], [1, 6]]
    },
    {
      id: 'ursa_major',
      name: '大熊座',
      nameEn: 'Ursa Major',
      description: '大熊座是北天星座之一，位于小熊座、小狮座附近，与仙后座相对。春季适合观察，是著名的北斗七星所在星座。',
      mythology: '在希腊神话中，大熊座原本是美丽的少女卡利斯托，她是狩猎女神阿尔忒弥斯的侍女。宙斯爱上了卡利斯托并生下了阿卡斯。宙斯的妻子赫拉出于嫉妒，将卡利斯托变成了一只大熊。后来，阿卡斯在狩猎时差点杀死自己的母亲，宙斯将他们一同升上天空，成为大熊座和小熊座。',
      mainStars: ['天枢（Dubhe）', '天璇（Merak）', '天玑（Phecda）', '天权（Megrez）', '玉衡（Alioth）', '开阳（Mizar）', '摇光（Alkaid）'],
      starIndices: [7, 8, 9, 10, 11, 12, 13],
      lines: [[7, 8], [8, 9], [9, 10], [10, 7], [10, 11], [11, 12], [12, 13]]
    }
  ]
}

function createCircleTexture(colorHex: string = '#FFD54F'): THREE.Texture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  )
  gradient.addColorStop(0, `${colorHex}FF`)
  gradient.addColorStop(0.4, `${colorHex}66`)
  gradient.addColorStop(1, `${colorHex}00`)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}

function createHaloParticles(count: number): THREE.Points {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const haloColor = new THREE.Color('#FFD54F')
  for (let i = 0; i < count; i++) {
    positions[i * 3] = 0
    positions[i * 3 + 1] = 0
    positions[i * 3 + 2] = 0
    colors[i * 3] = haloColor.r
    colors[i * 3 + 1] = haloColor.g
    colors[i * 3 + 2] = haloColor.b
    sizes[i] = 1.5 + Math.random() * 2
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  const texture = createCircleTexture('#FFD54F')
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { value: texture },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
    },
    vertexShader: `
      uniform float uPixelRatio;
      attribute float aSize;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPixelRatio * (200.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D uTexture;
      varying vec2 vUv;
      void main() {
        vec4 texColor = texture2D(uTexture, gl_PointCoord);
        if (texColor.a < 0.01) discard;
        gl_FragColor = texColor;
      }
    `,
    transparent: true,
    alphaTest: 0.01,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
  const uvs = new Float32Array(count * 2).fill(0)
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  return new THREE.Points(geometry, material)
}

export function createConstellationSystem(
  constellationData: Constellation[],
  starsData: Star[]
): ConstellationSystem {
  const group = new THREE.Group()
  const lines: THREE.LineSegments[] = []
  const lineToConstellation = new Map<THREE.LineSegments, Constellation>()
  const raycastTargets: THREE.LineSegments[] = []

  const brightStars = starsData
    .map((s, i) => ({ index: i, data: s, pos: new THREE.Vector3(s.x, s.y, s.z) }))
    .filter(s => s.data.magnitude <= 2)

  console.log(`找到 ${brightStars.length} 颗亮度1-2等的亮星`)

  const autoMstEdges = kruskalMST(
    brightStars.map(s => ({ index: s.index, pos: s.pos })),
    30
  )

  console.log(`自动MST生成 ${autoMstEdges.length} 条连线`)

  const allEdges: Map<string, { starA: number; starB: number; constellation: Constellation | null }> = new Map()

  autoMstEdges.forEach(([a, b]) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`
    if (!allEdges.has(key)) {
      allEdges.set(key, { starA: a, starB: b, constellation: null })
    }
  })

  constellationData.forEach(constellation => {
    console.log(`处理星座 ${constellation.name}, starIndices: ${constellation.starIndices}`)
    const validStarIndices = constellation.starIndices.filter(idx => starsData[idx])
    let edgesToUse: Array<[number, number]> = []

    if (constellation.lines && constellation.lines.length > 0) {
      edgesToUse = constellation.lines
        .filter(l => starsData[l[0]] && starsData[l[1]])
        .map(l => [l[0], l[1]] as [number, number])
      console.log(`  使用预设连线 ${edgesToUse.length} 条`)
    } else if (validStarIndices.length >= 2) {
      edgesToUse = kruskalMST(
        validStarIndices
          .map(idx => ({ index: idx, pos: new THREE.Vector3(starsData[idx].x, starsData[idx].y, starsData[idx].z) })),
        500
      )
      console.log(`  MST生成连线 ${edgesToUse.length} 条`)
    }

    edgesToUse.forEach(([a, b]) => {
      const key = a < b ? `${a}-${b}` : `${b}-${a}`
      allEdges.set(key, { starA: a, starB: b, constellation })
    })
  })

  console.log(`总连线数: ${allEdges.size}`)

  const defaultColor = new THREE.Color('#90CAF9')
  const highlightColor = new THREE.Color('#FFD54F')

  const edgeMetadata: Array<{ starA: number; starB: number; constellation: Constellation | null }> = []
  allEdges.forEach(edge => {
    edgeMetadata.push(edge)
  })

  const segmentGroup = new THREE.Group()

  edgeMetadata.forEach(meta => {
    const starA = starsData[meta.starA]
    const starB = starsData[meta.starB]
    if (!starA || !starB) return

    const positions = new Float32Array([
      starA.x, starA.y, starA.z,
      starB.x, starB.y, starB.z
    ])
    const colors = new Float32Array([
      defaultColor.r, defaultColor.g, defaultColor.b,
      defaultColor.r, defaultColor.g, defaultColor.b
    ])
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.LineBasicMaterial({
      color: defaultColor,
      transparent: true,
      opacity: 0.45,
      vertexColors: true,
      linewidth: 1
    })

    const line = new THREE.LineSegments(geometry, material)
    line.userData = {
      starA: meta.starA,
      starB: meta.starB,
      constellation: meta.constellation,
      defaultColor: defaultColor.clone(),
      highlightColor: highlightColor.clone(),
      highlighted: false
    }

    lines.push(line)
    raycastTargets.push(line)
    if (meta.constellation) {
      lineToConstellation.set(line, meta.constellation)
    }
    segmentGroup.add(line)
  })

  group.add(segmentGroup)

  const haloParticles = createHaloParticles(300)
  group.add(haloParticles)

  let highlightedConstellation: Constellation | null = null
  let haloTime = 0

  return {
    group,
    lines,
    haloParticles,
    constellations: constellationData,
    lineToConstellation,
    raycastTargets,
    highlight(constellationId: string | null) {
      highlightedConstellation = constellationId
        ? constellationData.find(c => c.id === constellationId) || null
        : null

      console.log(`高亮星座: ${highlightedConstellation?.name || '无'}`)

      const haloGeom = haloParticles.geometry
      const haloPos = haloGeom.getAttribute('position') as THREE.BufferAttribute
      const haloPosArr = haloPos.array as Float32Array
      for (let i = 0; i < haloPosArr.length; i++) {
        haloPosArr[i] = 0
      }

      lines.forEach(line => {
        const lineConst = line.userData.constellation as Constellation | null
        const shouldHighlight = highlightedConstellation && lineConst && lineConst.id === highlightedConstellation.id
        line.userData.highlighted = shouldHighlight
        const material = line.material as THREE.LineBasicMaterial
        const colorAttr = line.geometry.getAttribute('color') as THREE.BufferAttribute
        const colorArr = colorAttr.array as Float32Array

        if (shouldHighlight) {
          material.opacity = 1
          for (let i = 0; i < 2; i++) {
            colorArr[i * 3] = highlightColor.r
            colorArr[i * 3 + 1] = highlightColor.g
            colorArr[i * 3 + 2] = highlightColor.b
          }
          const positions = line.geometry.getAttribute('position').array as Float32Array
          const mid = new THREE.Vector3(
            (positions[0] + positions[3]) / 2,
            (positions[1] + positions[4]) / 2,
            (positions[2] + positions[5]) / 2
          )
          for (let i = 0; i < 40; i++) {
            const idx = (line.id * 40 + i) % (haloPosArr.length / 3)
            const angle = Math.random() * Math.PI * 2
            const phi = Math.acos(2 * Math.random() - 1)
            const radius = 3 + Math.random() * 7
            haloPosArr[idx * 3] = mid.x + radius * Math.sin(phi) * Math.cos(angle)
            haloPosArr[idx * 3 + 1] = mid.y + radius * Math.sin(phi) * Math.sin(angle)
            haloPosArr[idx * 3 + 2] = mid.z + radius * Math.cos(phi)
          }
        } else {
          material.opacity = 0.45
          for (let i = 0; i < 2; i++) {
            colorArr[i * 3] = defaultColor.r
            colorArr[i * 3 + 1] = defaultColor.g
            colorArr[i * 3 + 2] = defaultColor.b
          }
        }
        colorAttr.needsUpdate = true
      })

      haloPos.needsUpdate = true
      const haloMaterial = haloParticles.material as THREE.ShaderMaterial
      haloMaterial.uniforms.uTexture.value.needsUpdate = true
    },
    getConstellationByLine(line: THREE.LineSegments): Constellation | null {
      return line.userData.constellation || null
    },
    update(delta: number) {
      haloTime += delta
      const haloMaterial = haloParticles.material as THREE.ShaderMaterial
      if (highlightedConstellation) {
        haloMaterial.opacity = 0.6 + 0.2 * Math.sin(haloTime * 3)
        const haloGeom = haloParticles.geometry
        const haloPos = haloGeom.getAttribute('position') as THREE.BufferAttribute
        const haloPosArr = haloPos.array as Float32Array
        for (let i = 0; i < haloPosArr.length / 3; i++) {
          if (haloPosArr[i * 3] !== 0 || haloPosArr[i * 3 + 1] !== 0 || haloPosArr[i * 3 + 2] !== 0) {
            haloPosArr[i * 3] += (Math.random() - 0.5) * 0.4
            haloPosArr[i * 3 + 1] += (Math.random() - 0.5) * 0.4
            haloPosArr[i * 3 + 2] += (Math.random() - 0.5) * 0.4
          }
        }
        haloPos.needsUpdate = true
      } else {
        haloMaterial.opacity = 0
      }
    }
  }
}
