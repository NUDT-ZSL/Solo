import * as THREE from 'three'

function generateCrossTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!

  const gradient = ctx.createLinearGradient(0, 0, 256, 256)
  gradient.addColorStop(0, '#3a3a3a')
  gradient.addColorStop(0.5, '#4a4a4a')
  gradient.addColorStop(1, '#3a3a3a')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 256)

  ctx.strokeStyle = 'rgba(26, 26, 26, 0.4)'
  ctx.lineWidth = 1.5
  for (let i = 0; i < 256; i += 16) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, 256)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, i)
    ctx.lineTo(256, i)
    ctx.stroke()
  }

  ctx.fillStyle = 'rgba(60, 60, 60, 0.3)'
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 256
    const y = Math.random() * 256
    const r = Math.random() * 1.5 + 0.5
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 2)
  return texture
}

function generateLitchiTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!

  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 256)
  gradient.addColorStop(0, '#5a4a3a')
  gradient.addColorStop(1, '#3a2a1a')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 256)

  for (let i = 0; i < 500; i++) {
    const x = Math.random() * 256
    const y = Math.random() * 256
    const r = Math.random() * 4 + 2
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r)
    grd.addColorStop(0, 'rgba(80, 60, 40, 0.8)')
    grd.addColorStop(0.7, 'rgba(50, 35, 20, 0.6)')
    grd.addColorStop(1, 'rgba(30, 20, 10, 0)')
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 2)
  return texture
}

function generateGrainTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!

  const gradient = ctx.createLinearGradient(0, 0, 0, 256)
  gradient.addColorStop(0, '#4a4a4a')
  gradient.addColorStop(1, '#2a2a2a')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 256)

  for (let i = 0; i < 1000; i++) {
    const x = Math.random() * 256
    const y = Math.random() * 256
    const r = Math.random() * 1 + 0.3
    const alpha = Math.random() * 0.4 + 0.2
    ctx.fillStyle = `rgba(20, 20, 20, ${alpha})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.strokeStyle = 'rgba(30, 30, 30, 0.3)'
  ctx.lineWidth = 0.5
  for (let i = 0; i < 50; i++) {
    ctx.beginPath()
    ctx.moveTo(Math.random() * 256, Math.random() * 256)
    ctx.bezierCurveTo(
      Math.random() * 256,
      Math.random() * 256,
      Math.random() * 256,
      Math.random() * 256,
      Math.random() * 256,
      Math.random() * 256,
    )
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(3, 3)
  return texture
}

function generateWaxTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!

  const gradient = ctx.createLinearGradient(0, 0, 256, 0)
  gradient.addColorStop(0, '#3a3028')
  gradient.addColorStop(0.5, '#4a4038')
  gradient.addColorStop(1, '#3a3028')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 256)

  ctx.fillStyle = 'rgba(120, 100, 80, 0.15)'
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * 256
    const y = Math.random() * 256
    const w = Math.random() * 60 + 20
    const h = Math.random() * 3 + 1
    ctx.beginPath()
    ctx.ellipse(x, y, w, h, Math.random() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.fillStyle = 'rgba(255, 240, 220, 0.08)'
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * 256
    const y = Math.random() * 256
    const r = Math.random() * 2 + 1
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 2)
  return texture
}

const textureCache: Map<string, THREE.CanvasTexture> = new Map()

export function getLeatherTexture(type: string): THREE.CanvasTexture {
  if (textureCache.has(type)) {
    return textureCache.get(type)!
  }

  let texture: THREE.CanvasTexture
  switch (type) {
    case 'cross':
      texture = generateCrossTexture()
      break
    case 'litchi':
      texture = generateLitchiTexture()
      break
    case 'grain':
      texture = generateGrainTexture()
      break
    case 'wax':
      texture = generateWaxTexture()
      break
    default:
      texture = generateGrainTexture()
  }

  textureCache.set(type, texture)
  return texture
}
