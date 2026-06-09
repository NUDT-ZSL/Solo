import { ParticleSystem, Character } from './particles'
import { Brush } from './brush'
import { Renderer } from './renderer'

const BOTTOM_AREA_HEIGHT = 160
const TARGET_FPS = 60
const FRAME_TIME = 1000 / TARGET_FPS

let canvas: HTMLCanvasElement
let ps: ParticleSystem
let brush: Brush
let renderer: Renderer
let lastTime = 0
let accTime = 0
let rafId = 0
let viewW = 0
let viewH = 0

export function init(cvs: HTMLElement | null) {
  if (!cvs || !(cvs instanceof HTMLCanvasElement)) {
    throw new Error('Canvas element not found')
  }
  canvas = cvs
  ps = new ParticleSystem()
  brush = new Brush(canvas)
  renderer = new Renderer(canvas)

  resize()
  window.addEventListener('resize', resize)

  brush.onHover = (x, y) => {
    const bottomY = viewH - BOTTOM_AREA_HEIGHT
    const hovered = ps.hoverScatterDot(x, y, bottomY)
    if (hovered) {
      renderer.hoverPreview = { char: hovered.char, x, y }
    } else {
      renderer.hoverPreview = null
    }
  }

  lastTime = performance.now()
  loop()
}

function resize() {
  viewW = window.innerWidth
  viewH = window.innerHeight
  renderer.resize(viewW, viewH)
  ps.layout(viewW, viewH, BOTTOM_AREA_HEIGHT)
}

function loop() {
  const now = performance.now()
  let frameDt = (now - lastTime) / 1000
  lastTime = now

  accTime += now - lastTime + FRAME_TIME
  frameDt = Math.min(frameDt, FRAME_TIME * 3 / 1000)

  update(frameDt)
  render()

  rafId = requestAnimationFrame(loop)
}

function update(dt: number) {
  const hover = brush.getHoverPos()
  const completedChar: Character | null = ps.update(
    dt,
    hover.x,
    hover.y,
    brush.isPressed
  )

  if (completedChar) {
    renderer.addRipple(completedChar.centerX, completedChar.centerY)
  }

  const bottomY = viewH - BOTTOM_AREA_HEIGHT
  ps.settleScatterDots(bottomY, viewW)

  renderer.drawRipples(dt)
}

function render() {
  const bottomY = viewH - BOTTOM_AREA_HEIGHT

  renderer.clear(viewW, viewH)
  renderer.drawTablet(ps, viewW, viewH)
  renderer.drawStrokes(brush)
  renderer.drawParticles(ps)
  renderer.drawBottomArea(bottomY, viewW, viewH)
  renderer.drawScatterDots(ps)
  renderer.drawProgress(ps, viewW)
  renderer.drawHoverPreview()
}
