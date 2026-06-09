import { Pet } from './pet'
import { UIManager } from './ui'

const canvas = document.getElementById('game') as HTMLCanvasElement
if (!canvas) {
  throw new Error('Canvas element not found')
}

const ctx: CanvasRenderingContext2D = canvas.getContext('2d')!
if (!ctx) {
  throw new Error('Canvas 2D context not available')
}

const pet = new Pet()
const ui = new UIManager()

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1
  const width = window.innerWidth
  const height = window.innerHeight
  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = width + 'px'
  canvas.style.height = height + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ui.layout(width, height)
}

resizeCanvas()
window.addEventListener('resize', resizeCanvas)

function getCanvasPos(e: MouseEvent | TouchEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect()
  let clientX = 0
  let clientY = 0
  if (e instanceof MouseEvent) {
    clientX = e.clientX
    clientY = e.clientY
  } else if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX
    clientY = e.touches[0].clientY
  } else if (e.changedTouches && e.changedTouches.length > 0) {
    clientX = e.changedTouches[0].clientX
    clientY = e.changedTouches[0].clientY
  }
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  }
}

function handleButtonPress(type: string) {
  if (type === 'food') pet.eat()
  else if (type === 'clean') pet.clean()
  else if (type === 'play') pet.play()
  else if (type === 'heal') pet.heal()
}

canvas.addEventListener('mousedown', (e) => {
  const pos = getCanvasPos(e)
  const btn = ui.getButtonAt(pos.x, pos.y)
  if (btn) {
    btn.isPressed = true
  }
})

canvas.addEventListener('mousemove', (e) => {
  const pos = getCanvasPos(e)
  for (const btn of ui.buttons) {
    const cx = btn.x + btn.size / 2
    const cy = btn.y + btn.size / 2
    const dx = pos.x - cx
    const dy = pos.y - cy
    const r = btn.size / 2
    const inside = dx * dx + dy * dy <= r * r
    btn.isHovered = inside && !btn.isPressed
  }
  const center = ui.getPetCenter()
  const scale = ui.getPetScale()
  pet.isHovering = pet.contains(pos.x, pos.y, center.x, center.y, scale)
})

canvas.addEventListener('mouseup', (e) => {
  const pos = getCanvasPos(e)
  for (const btn of ui.buttons) {
    if (btn.isPressed) {
      btn.isPressed = false
      const cx = btn.x + btn.size / 2
      const cy = btn.y + btn.size / 2
      const dx = pos.x - cx
      const dy = pos.y - cy
      const r = btn.size / 2
      if (dx * dx + dy * dy <= r * r) {
        handleButtonPress(btn.type)
      }
    }
  }
})

canvas.addEventListener('mouseleave', () => {
  for (const btn of ui.buttons) {
    btn.isHovered = false
    btn.isPressed = false
  }
  pet.isHovering = false
})

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault()
  const pos = getCanvasPos(e)
  const btn = ui.getButtonAt(pos.x, pos.y)
  if (btn) {
    btn.isPressed = true
  }
  const center = ui.getPetCenter()
  const scale = ui.getPetScale()
  pet.isHovering = pet.contains(pos.x, pos.y, center.x, center.y, scale)
}, { passive: false })

canvas.addEventListener('touchend', (e) => {
  e.preventDefault()
  const pos = getCanvasPos(e)
  for (const btn of ui.buttons) {
    if (btn.isPressed) {
      btn.isPressed = false
      const cx = btn.x + btn.size / 2
      const cy = btn.y + btn.size / 2
      const dx = pos.x - cx
      const dy = pos.y - cy
      const r = btn.size / 2
      if (dx * dx + dy * dy <= r * r) {
        handleButtonPress(btn.type)
      }
    }
  }
  pet.isHovering = false
}, { passive: false })

let lastTime = performance.now()

function loop(now: number) {
  const dt = Math.min(0.05, (now - lastTime) / 1000)
  lastTime = now

  const time = now / 1000

  pet.update(dt)
  ui.draw(ctx, pet, time)

  const center = ui.getPetCenter()
  const scale = ui.getPetScale()
  pet.draw(ctx, center.x, center.y, scale)

  requestAnimationFrame(loop)
}

requestAnimationFrame(loop)
