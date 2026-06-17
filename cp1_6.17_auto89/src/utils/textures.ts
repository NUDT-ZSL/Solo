import * as THREE from 'three'

export function createLeatherTexture(color: string): THREE.Texture {
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

  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const grainSize = Math.random() * 2 + 0.5
    const brightness = Math.random() * 40 - 20

    const grainR = Math.max(0, Math.min(255, r + brightness))
    const grainG = Math.max(0, Math.min(255, g + brightness * 0.9))
    const grainB = Math.max(0, Math.min(255, b + brightness * 0.7))

    ctx.fillStyle = `rgba(${grainR},${grainG},${grainB},0.6)`
    ctx.beginPath()
    ctx.arc(x, y, grainSize, 0, Math.PI * 2)
    ctx.fill()
  }

  for (let i = 0; i < 150; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const lineLength = Math.random() * 40 + 10
    const angle = Math.random() * Math.PI * 2

    ctx.strokeStyle = `rgba(${Math.floor(r * 0.6)},${Math.floor(g * 0.55)},${Math.floor(b * 0.45)},0.25)`
    ctx.lineWidth = Math.random() * 1.2 + 0.3
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(
      x + Math.cos(angle) * lineLength,
      y + Math.sin(angle) * lineLength
    )
    ctx.stroke()
  }

  for (let i = 0; i < 500; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const poreR = Math.random() * 1.5 + 0.3

    ctx.fillStyle = `rgba(${Math.floor(r * 0.4)},${Math.floor(g * 0.35)},${Math.floor(b * 0.3)},0.35)`
    ctx.beginPath()
    ctx.arc(x, y, poreR, 0, Math.PI * 2)
    ctx.fill()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(4, 4)
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

export function createLeatherBumpMap(): THREE.Texture {
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
  texture.repeat.set(2, 6)
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

export function createCordBumpMap(): THREE.Texture {
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
  texture.repeat.set(2, 6)
  texture.needsUpdate = true
  return texture
}

export function createMetalEnvironmentMap(): THREE.CubeTexture {
  const faces: string[] = ['px', 'nx', 'py', 'ny', 'pz', 'nz']
  const canvases: HTMLCanvasElement[] = faces.map(() => {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 256
    return c
  })

  canvases.forEach((canvas, faceIdx) => {
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 256, 256)

    const faceColors = [
      ['#FFFFFF', '#D0D0D0', '#A0A0A0'],
      ['#C0C0C0', '#E8E8E8', '#909090'],
      ['#F8F8F8', '#FFFFFF', '#E0E0E0'],
      ['#808080', '#A0A0A0', '#606060'],
      ['#D8D8D8', '#F0F0F0', '#B0B0B0'],
      ['#B0B0B0', '#D0D0D0', '#888888'],
    ]

    gradient.addColorStop(0, faceColors[faceIdx][0])
    gradient.addColorStop(0.5, faceColors[faceIdx][1])
    gradient.addColorStop(1, faceColors[faceIdx][2])
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 256, 256)

    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 256
      const y = Math.random() * 256
      const w = Math.random() * 60 + 10
      const h = Math.random() * 30 + 5

      const lightGrad = ctx.createLinearGradient(x, y, x + w, y + h)
      lightGrad.addColorStop(0, 'rgba(255,255,255,0.3)')
      lightGrad.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = lightGrad
      ctx.fillRect(x, y, w, h)
    }
  })

  const texture = new THREE.CubeTexture(canvases)
  texture.needsUpdate = true
  return texture
}
