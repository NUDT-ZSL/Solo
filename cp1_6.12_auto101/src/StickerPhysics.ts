import Matter from 'matter-js'
import type { StickerObject } from './types'

const { Engine, Render, Runner, Bodies, Body, Composite, Events, Mouse, MouseConstraint } = Matter

export interface CollisionEvent {
  ids: [string, string]
  relativeVelocity: number
}

export interface StickerPhysicsOptions {
  width: number
  height: number
  onPositionUpdate: (id: string, x: number, y: number, rotation: number) => void
  onCollision: (event: CollisionEvent) => void
  onSquash: (id: string) => void
  onCanvasShake: () => void
  hasDraggingSticker: () => boolean
}

export class StickerPhysics {
  engine: Matter.Engine
  runner: Matter.Runner
  render?: Matter.Render
  canvas: HTMLCanvasElement
  bodies: Map<string, Matter.Body> = new Map()
  stickers: Map<string, StickerObject> = new Map()
  frameCount = 0
  audioContext?: AudioContext
  gravity = 1.0
  private options: StickerPhysicsOptions

  constructor(canvasContainer: HTMLElement, options: StickerPhysicsOptions) {
    this.options = options
    this.canvas = document.createElement('canvas')
    this.canvas.style.display = 'none'
    canvasContainer.appendChild(this.canvas)

    this.engine = Engine.create()
    this.engine.gravity.y = this.gravity
    this.engine.positionIterations = 6
    this.engine.velocityIterations = 4

    this.runner = Runner.create()

    this.createBoundaries(options.width, options.height)
    this.setupCollisionEvents()
    this.setupRenderLoop()

    Runner.run(this.runner, this.engine)
  }

  private createBoundaries(width: number, height: number) {
    const wallThickness = 100
    const walls = [
      Bodies.rectangle(width / 2, height + wallThickness / 2, width * 2, wallThickness, {
        isStatic: true,
        restitution: 0.4,
        label: 'wall-bottom'
      }),
      Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height * 2, {
        isStatic: true,
        restitution: 0.4,
        label: 'wall-left'
      }),
      Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height * 2, {
        isStatic: true,
        restitution: 0.4,
        label: 'wall-right'
      }),
      Bodies.rectangle(width / 2, -wallThickness / 2, width * 2, wallThickness, {
        isStatic: true,
        restitution: 0.4,
        label: 'wall-top'
      })
    ]
    Composite.add(this.engine.world, walls)
  }

  private setupCollisionEvents() {
    Events.on(this.engine, 'collisionStart', (event) => {
      const pairs = event.pairs
      for (const pair of pairs) {
        const { bodyA, bodyB } = pair

        const stickerA = this.bodiesToStickerId(bodyA)
        const stickerB = this.bodiesToStickerId(bodyB)

        if (!stickerA || !stickerB) continue

        const velocityA = bodyA.velocity
        const velocityB = bodyB.velocity
        const relativeVelocity = Math.sqrt(
          Math.pow(velocityA.x - velocityB.x, 2) + Math.pow(velocityA.y - velocityB.y, 2)
        )

        this.options.onCollision({
          ids: [stickerA, stickerB],
          relativeVelocity
        })

        this.options.onSquash(stickerA)
        this.options.onSquash(stickerB)

        if (relativeVelocity > 1.5) {
          this.options.onCanvasShake()
        }
      }
    })
  }

  private bodiesToStickerId(body: Matter.Body): string | null {
    const entry = Array.from(this.bodies.entries()).find(([, b]) => b.id === body.id)
    return entry ? entry[0] : null
  }

  private setupRenderLoop() {
    Events.on(this.engine, 'afterUpdate', () => {
      this.frameCount++

      const stickerCount = this.bodies.size
      const shouldSkipCollisionCheck =
        stickerCount > 80 && !this.options.hasDraggingSticker() && this.frameCount % 2 !== 0

      if (shouldSkipCollisionCheck) return

      for (const [id, body] of this.bodies) {
        const sticker = this.stickers.get(id)
        if (sticker && !sticker.isDragging) {
          this.options.onPositionUpdate(id, body.position.x, body.position.y, body.angle)
        }
      }
    })
  }

  addSticker(sticker: StickerObject) {
    if (this.bodies.size >= 100) return false

    const body = Bodies.rectangle(sticker.x, sticker.y, sticker.width, sticker.height, {
      restitution: sticker.restitution,
      density: sticker.density / 1000,
      friction: sticker.friction,
      frictionAir: 0.01,
      label: `sticker-${sticker.id}`
    })

    Body.setAngle(body, sticker.rotation)
    Composite.add(this.engine.world, body)
    this.bodies.set(sticker.id, body)
    this.stickers.set(sticker.id, sticker)

    return true
  }

  removeSticker(id: string) {
    const body = this.bodies.get(id)
    if (body) {
      Composite.remove(this.engine.world, body)
      this.bodies.delete(id)
      this.stickers.delete(id)
    }
  }

  setStickerPosition(id: string, x: number, y: number) {
    const body = this.bodies.get(id)
    if (body) {
      Body.setPosition(body, { x, y })
    }
  }

  setStickerVelocity(id: string, vx: number, vy: number) {
    const body = this.bodies.get(id)
    if (body) {
      Body.setVelocity(body, { x: vx, y: vy })
    }
  }

  setStickerDragging(id: string, isDragging: boolean) {
    const body = this.bodies.get(id)
    const sticker = this.stickers.get(id)
    if (body && sticker) {
      sticker.isDragging = isDragging
      Body.setStatic(body, isDragging)
      if (!isDragging) {
        Body.setVelocity(body, { x: 0, y: 0 })
      }
    }
  }

  setGravity(value: number) {
    this.gravity = value
    this.engine.gravity.y = value
  }

  playCollisionSound() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    const ctx = this.audioContext
    const frequency = 400 + (this.gravity - 0.5) * (200 / 2.5)
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

    gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.08)
  }

  resize(width: number, height: number) {
    Composite.clear(this.engine.world, false, true)
    this.bodies.clear()
    this.stickers.clear()
    this.createBoundaries(width, height)
  }

  clearAll() {
    for (const id of Array.from(this.bodies.keys())) {
      this.removeSticker(id)
    }
  }

  destroy() {
    Runner.stop(this.runner)
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas)
    }
  }
}
