import * as THREE from 'three'

const leatherAlbedoCache = new Map<string, THREE.Texture>()
const leatherBumpCache: THREE.Texture | null = null
const cordAlbedoCache = new Map<string, THREE.Texture>()
const cordBumpCache: THREE.Texture | null = null
let metalEnvMapCache: THREE.CubeTexture | null = null

function generateLeatherDetailCanvas(): HTMLCanvasElement {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  const grainData: { x: number; y: number; r: number; brightness: number }[] = []
  for (let i = 0; i < 8000; i++) {
    grainData.push({
      x: Math.random() * size,
      y: Math.random() * size,
      r: Math.random() * 2 + 0.5,
      brightness: Math.random() * 40 - 20,
    })
  }

  const lineData: { x: number; y: number; len: number; angle: number; lw: number }[] = []
  for (let i = 0; i < 150; i++) {
    lineData.push({
      x: Math.random() * size,
      y: Math.random() * size,
      len: Math.random() * 40 + 10,
      angle: Math.random() * Math.PI * 2,
      lw: Math.random() * 1.2 + 0.3,
    })
  }

  const poreData: { x: number; y: number; r: number }[] = []
  for (let i = 0; i < 500; i++) {
    poreData.push({
      x: Math.random() * size,
      y: Math.random() * size,
      r: Math.random() * 1.5 + 0.3,
    })
  }

  const drawGrey = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = 'rgb(128,128,128)'
    ctx.fillRect(0, 0, size, size)
    grainData.forEach((g) => {
      const gray = Math.floor(128 + g.brightness * 1.5)
      ctx.fillStyle = `rgb(${gray},${gray},${gray})`
      ctx.beginPath()
      ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2)
      ctx.fill()
    })
    lineData.forEach((l) => {
      ctx.strokeStyle = `rgba(80,80,80,0.25)`
      ctx.lineWidth = l.lw
      ctx.beginPath()
      ctx.moveTo(l.x, l.y)
      ctx.lineTo(l.x + Math.cos(l.angle) * l.len, l.y + Math.sin(l.angle) * l.len)
      ctx.stroke()
    })
    poreData.forEach((p) => {
      ctx.fillStyle = 'rgb(80,80,80)'
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fill()
    })
  }

  const greyCanvas = document.createElement('canvas')
  greyCanvas.width = size
  greyCanvas.height = size
  drawGrey(greyCanvas.getContext('2d')!)
  ;(canvas as any)._greySource = greyCanvas
  ;(canvas as any)._grainData = grainData
  ;(canvas as any)._lineData = lineData
  ;(canvas as any)._poreData = poreData

  return canvas
}

export function createLeatherTexture(color: string): THREE.Texture {
  if (leatherAlbedoCache.has(color)) {
    return leatherAlbedoCache.get(color)!
  }

  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  const baseColor = new THREE.Color(color)
  const r = Math.floor(baseColor.r * 255)
  const g = Math.floor(baseColor.g * 255)
  const b = Math.floor(baseColor.b * 255)

  ctx.fillStyle = `rgb(${r},${g},${b})`
  ctx.fillRect(0, 0, size, size)

  const grainData: { x: number; y: number; r: number; brightness: number }[] = []
  for (let i = 0; i < 8000; i++) {
    grainData.push({
      x: Math.random() * size,
      y: Math.random() * size,
      r: Math.random() * 2 + 0.5,
      brightness: Math.random() * 40 - 20,
    })
  }

  grainData.forEach((g) => {
    const gr = Math.max(0, Math.min(255, r + g.brightness))
    const gg = Math.max(0, Math.min(255, g + g.brightness * 0.9))
    const gb = Math.max(0, Math.min(255, b + g.brightness * 0.7))
    ctx.fillStyle = `rgba(${gr},${gg},${gb},0.6)`
    ctx.beginPath()
    ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2)
    ctx.fill()
  })

  for (let i = 0; i < 150; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const lineLength = Math.random() * 40 + 10
    const angle = Math.random() * Math.PI * 2
    const lw = Math.random() * 1.2 + 0.3

    ctx.strokeStyle = `rgba(${Math.floor(r * 0.6)},${Math.floor(g * 0.55)},${Math.floor(b * 0.45)},0.25)`
    ctx.lineWidth = lw
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(angle) * lineLength, y + Math.sin(angle) * lineLength)
    ctx.stroke()
  }

  for (let i = 0; i < 500; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const pr = Math.random() * 1.5 + 0.3

    ctx.fillStyle = `rgba(${Math.floor(r * 0.4)},${Math.floor(g * 0.35)},${Math.floor(b * 0.3)},0.35)`
    ctx.beginPath()
    ctx.arc(x, y, pr, 0, Math.PI * 2)
    ctx.fill()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(4, 4)
  texture.anisotropy = 8
  texture.needsUpdate = true

  leatherAlbedoCache.set(color, texture)
  return texture
}

export function updateLeatherTextureColor(
  texture: THREE.Texture,
  newColor: string
): THREE.Texture {
  if (leatherAlbedoCache.has(newColor)) {
    return leatherAlbedoCache.get(newColor)!
  }

  const canvas = texture.image as HTMLCanvasElement
  if (!canvas || !canvas.getContext) {
    return createLeatherTexture(newColor)
  }

  const size = canvas.width
  const ctx = canvas.getContext('2d')!
  const baseColor = new THREE.Color(newColor)
  const r = Math.floor(baseColor.r * 255)
  const g = Math.floor(baseColor.g * 255)
  const b = Math.floor(baseColor.b * 255)

  const imageData = ctx.getImageData(0, 0, size, size)
  const data = imageData.data

  for (let i = 0; i < data.length; i += 4) {
    const origGray = (data[i] + data[i + 1] + data[i + 2]) / 3
    const factor = origGray / 128
    data[i] = Math.max(0, Math.min(255, Math.floor(r * factor)))
    data[i + 1] = Math.max(0, Math.min(255, Math.floor(g * factor)))
    data[i + 2] = Math.max(0, Math.min(255, Math.floor(b * factor)))
  }

  ctx.putImageData(imageData, 0, 0)
  texture.needsUpdate = true
  leatherAlbedoCache.set(newColor, texture)
  return texture
}

export function createLeatherBumpMap(): THREE.Texture {
  if (leatherBumpCache) return leatherBumpCache

  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = 'rgb(128,128,128)'
  ctx.fillRect(0, 0, size, size)

  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const grainSize = Math.random() * 3 + 0.5
    const gray = Math.floor(128 + Math.random() * 60 - 30)

    ctx.fillStyle = `rgb(${gray},${gray},${gray})`
    ctx.beginPath()
    ctx.arc(x, y, grainSize, 0, Math.PI * 2)
    ctx.fill()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(4, 4)
  texture.needsUpdate = true

  return texture
}

export function createCordTexture(color: string): THREE.Texture {
  if (cordAlbedoCache.has(color)) {
    return cordAlbedoCache.get(color)!
  }

  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  const baseColor = new THREE.Color(color)
  const r = Math.floor(baseColor.r * 255)
  const g = Math.floor(baseColor.g * 255)
  const b = Math.floor(baseColor.b * 255)

  ctx.fillStyle = `rgb(${r},${g},${b})`
  ctx.fillRect(0, 0, size, size)

  const strands = 16
  for (let s = 0; s < strands; s++) {
    for (let y = 0; y < size; y += 2) {
      const offset = (s * size / strands + y * 0.3) % size
      const x1 = offset
      const x2 = (offset + size * 0.6) % size
      const wave = Math.sin(y * 0.05 + s) * 3
      const strandBrightness = Math.sin(s * 0.5) * 15
      const sr = Math.max(0, Math.min(255, r + strandBrightness))
      const sg = Math.max(0, Math.min(255, g + strandBrightness * 0.9))
      const sb = Math.max(0, Math.min(255, b + strandBrightness * 0.8))

      ctx.strokeStyle = `rgb(${sr},${sg},${sb})`
      ctx.lineWidth = size / strands * 0.7
      ctx.beginPath()
      ctx.moveTo(x1 + wave, y)
      ctx.lineTo(x1 + wave + size * 0.3, y + 5)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(x2 - wave, y)
      ctx.lineTo(x2 - wave - size * 0.3, y + 5)
      ctx.stroke()
    }
  }

  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const fiberLen = Math.random() * 8 + 2
    const angle = Math.random() * Math.PI
    const brightness = Math.random() * 30 - 15
    ctx.strokeStyle = `rgba(${Math.floor(r + brightness)},${Math.floor(g + brightness)},${Math.floor(b + brightness)},0.5)`
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(angle) * fiberLen, y + Math.sin(angle) * fiberLen)
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(3, 8)
  texture.anisotropy = 8
  texture.needsUpdate = true
  texture.center.set(0.5, 0.5)

  cordAlbedoCache.set(color, texture)
  return texture
}

export function createCylinderCompatibleUVs(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute
  const uvs: number[] = []

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)

    const u = (Math.atan2(z, x) + Math.PI) / (2 * Math.PI)
    const v = (y + 2) / 4

    uvs.push(u, v)
  }

  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  return geometry
}

export function createCordBumpMap(): THREE.Texture {
  if (cordBumpCache) return cordBumpCache

  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = 'rgb(128,128,128)'
  ctx.fillRect(0, 0, size, size)

  const strands = 12
  for (let s = 0; s < strands; s++) {
    for (let y = 0; y < size; y++) {
      const x = (s * size / strands + y * 0.25 + Math.sin(y * 0.04 + s * 0.8) * 6) % size
      const gray = 128 + Math.sin(s * 0.7 + y * 0.03) * 80

      ctx.fillStyle = `rgb(${Math.floor(gray)},${Math.floor(gray)},${Math.floor(gray)})`
      ctx.fillRect(x, y, size / strands * 0.6, 1)
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(3, 8)
  texture.center.set(0.5, 0.5)
  texture.needsUpdate = true
  return texture
}

export function createMetalEnvironmentMap(): THREE.CubeTexture {
  if (metalEnvMapCache) return metalEnvMapCache

  const faceNames = ['px', 'nx', 'py', 'ny', 'pz', 'nz']
  const faceColors = [
    [
      { pos: 0, color: [255, 255, 255] },
      { pos: 0.25, color: [230, 232, 235] },
      { pos: 0.5, color: [200, 205, 210] },
      { pos: 0.75, color: [170, 175, 180] },
      { pos: 1, color: [140, 145, 150] },
    ],
    [
      { pos: 0, color: [220, 222, 225] },
      { pos: 0.5, color: [190, 195, 200] },
      { pos: 1, color: [150, 155, 160] },
    ],
    [
      { pos: 0, color: [250, 252, 255] },
      { pos: 0.5, color: [235, 238, 242] },
      { pos: 1, color: [210, 215, 220] },
    ],
    [
      { pos: 0, color: [100, 105, 110] },
      { pos: 0.5, color: [130, 135, 140] },
      { pos: 1, color: [80, 85, 90] },
    ],
    [
      { pos: 0, color: [240, 242, 245] },
      { pos: 0.5, color: [215, 220, 225] },
      { pos: 1, color: [180, 185, 190] },
    ],
    [
      { pos: 0, color: [180, 185, 190] },
      { pos: 0.5, color: [160, 165, 170] },
      { pos: 1, color: [120, 125, 130] },
    ],
  ]

  const canvases = faceNames.map((_, faceIdx) => {
    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const colors = faceColors[faceIdx]

    const gradient = ctx.createLinearGradient(0, 0, size, size)
    colors.forEach((c) => {
      gradient.addColorStop(c.pos, `rgb(${c.color[0]},${c.color[1]},${c.color[2]})`)
    })
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)

    for (let i = 0; i < 15; i++) {
      const x = Math.random() * size
      const y = Math.random() * size
      const w = Math.random() * 100 + 20
      const h = Math.random() * 40 + 10
      const angle = Math.random() * Math.PI

      const grad2 = ctx.createLinearGradient(x, y, x + Math.cos(angle) * w, y + Math.sin(angle) * w)
      grad2.addColorStop(0, 'rgba(255,255,255,0.35)')
      grad2.addColorStop(0.5, 'rgba(255,255,255,0.1)')
      grad2.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = grad2
      ctx.fillRect(x, y, w, h)
    }

    for (let i = 0; i < 5; i++) {
      const x = Math.random() * size
      const y = Math.random() * size
      const radius = Math.random() * 30 + 10

      const radial = ctx.createRadialGradient(x, y, 0, x, y, radius)
      radial.addColorStop(0, 'rgba(255,255,255,0.4)')
      radial.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = radial
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()
    }

    for (let i = 0; i < 8; i++) {
      const x = Math.random() * size
      const y = Math.random() * size
      const w = Math.random() * 3 + 1
      const len = Math.random() * 150 + 50
      const angle = Math.random() * Math.PI

      const grad3 = ctx.createLinearGradient(x, y, x + Math.cos(angle) * len, y + Math.sin(angle) * len)
      grad3.addColorStop(0, 'rgba(255,255,255,0.0)')
      grad3.addColorStop(0.5, 'rgba(255,255,255,0.25)')
      grad3.addColorStop(1, 'rgba(255,255,255,0.0)')
      ctx.strokeStyle = grad3
      ctx.lineWidth = w
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len)
      ctx.stroke()
    }

    return canvas
  })

  const texture = new THREE.CubeTexture(canvases)
  texture.needsUpdate = true
  metalEnvMapCache = texture
  return texture
}
