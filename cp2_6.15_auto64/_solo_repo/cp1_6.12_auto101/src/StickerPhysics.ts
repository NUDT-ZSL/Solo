import Matter from 'matter-js'
import type { StickerObject } from './types'

const { Engine, Runner, Bodies, Body, Composite, Events, Vector } = Matter

export interface StickerPhysicsCallbacks {
  onPositionUpdate: (id: string, x: number, y: number, rotation: number) => void
  onSquashStart: (id: string) => void
  onCanvasShake: () => void
  onCollisionSound: () => void
}

export class StickerPhysics {
  engine: Matter.Engine
  runner: Matter.Runner
  bodies: Map<string, Matter.Body> = new Map()
  frameCount = 0
  audioContext?: AudioContext
  gravity = 1.0
  private callbacks: StickerPhysicsCallbacks
  private hasDraggingSticker = false
  private squashTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()
  private shakeCooldown = false

  constructor(callbacks: StickerPhysicsCallbacks) {
    this.callbacks = callbacks

    this.engine = Engine.create()
    this.engine.gravity.y = this.gravity
    this.engine.positionIterations = 8
    this.engine.velocityIterations = 6

    this.runner = Runner.create()

    this.setupCollisionEvents()
    this.setupGameLoop()

    Runner.run(this.runner, this.engine)
  }

  private setupCollisionEvents() {
    Events.on(this.engine, 'collisionStart', (event) => {
      const pairs = event.pairs
      for (const pair of pairs) {
        const { bodyA, bodyB } = pair

        const stickerA = this.bodyToStickerId(bodyA)
        const stickerB = this.bodyToStickerId(bodyB)

        const stickerIds: string[] = []
        if (stickerA) stickerIds.push(stickerA)
        if (stickerB) stickerIds.push(stickerB)

        if (stickerIds.length === 0) continue

        const velocityA = bodyA.velocity
        const velocityB = bodyB.velocity
        const relativeVelocity = Vector.magnitude(Vector.sub(velocityA, velocityB))

        for (const id of stickerIds) {
          this.triggerSquash(id)
        }

        if (stickerIds.length === 2 && relativeVelocity > 1.5) {
          if (!this.shakeCooldown) {
            this.shakeCooldown = true
            this.callbacks.onCanvasShake()
            this.callbacks.onCollisionSound()
            setTimeout(() => {
              this.shakeCooldown = false
            }, 200)
          }
        }
      }
    })
  }

  private bodyToStickerId(body: Matter.Body): string | null {
    const label = body.label
    if (label.startsWith('sticker-')) {
      return label.slice('sticker-'.length)
    }
    return null
  }

  private triggerSquash(id: string) {
    if (this.squashTimers.has(id)) {
      clearTimeout(this.squashTimers.get(id)!)
    }
    this.callbacks.onSquashStart(id)
    const timer = setTimeout(() => {
      this.squashTimers.delete(id)
    }, 150)
    this.squashTimers.set(id, timer)
  }

  private setupGameLoop() {
    Events.on(this.runner, 'tick', () => {
      this.frameCount++

      const stickerCount = this.bodies.size
      const shouldDowngrade =
        stickerCount > 80 && !this.hasDraggingSticker

      if (shouldDowngrade && this.frameCount % 2 !== 0) {
        return
      }

      for (const [id, body] of this.bodies) {
        this.callbacks.onPositionUpdate(id, body.position.x, body.position.y, body.angle)
      }
    })
  }

  setBounds(width: number, height: number) {
    const walls = Composite.allBodies(this.engine.world).filter(
      (b) => b.label.startsWith('wall-')
    )
    for (const wall of walls) {
      Composite.remove(this.engine.world, wall)
    }

    const wallThickness = 200
    const newWalls = [
      Bodies.rectangle(width / 2, height + wallThickness / 2, width * 2, wallThickness, {
        isStatic: true,
        restitution: 0.4,
        friction: 0.5,
        label: 'wall-bottom'
      }),
      Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height * 3, {
        isStatic: true,
        restitution: 0.4,
        friction: 0.5,
        label: 'wall-left'
      }),
      Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height * 3, {
        isStatic: true,
        restitution: 0.4,
        friction: 0.5,
        label: 'wall-right'
      }),
      Bodies.rectangle(width / 2, -wallThickness / 2, width * 2, wallThickness, {
        isStatic: true,
        restitution: 0.4,
        friction: 0.5,
        label: 'wall-top'
      })
    ]
    Composite.add(this.engine.world, newWalls)
  }

  addSticker(sticker: StickerObject) {
    if (this.bodies.size >= 100) return false

    const existing = this.bodies.get(sticker.id)
    if (existing) {
      Composite.remove(this.engine.world, existing)
      this.bodies.delete(sticker.id)
    }

    const body = Bodies.rectangle(sticker.x, sticker.y, sticker.width, sticker.height, {
      restitution: sticker.restitution,
      density: sticker.density / 1000,
      friction: sticker.friction,
      frictionAir: 0.02,
      label: `sticker-${sticker.id}`
    })

    Body.setAngle(body, sticker.rotation)
    Composite.add(this.engine.world, body)
    this.bodies.set(sticker.id, body)

    return true
  }

  removeSticker(id: string) {
    const body = this.bodies.get(id)
    if (body) {
      Composite.remove(this.engine.world, body)
      this.bodies.delete(id)
    }
    const timer = this.squashTimers.get(id)
    if (timer) {
      clearTimeout(timer)
      this.squashTimers.delete(id)
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
    if (body) {
      Body.setStatic(body, isDragging)
      if (isDragging) {
        Body.setVelocity(body, { x: 0, y: 0 })
        Body.setAngularVelocity(body, 0)
      }
    }
    if (isDragging) {
      this.hasDraggingSticker = true
    } else {
      let anyDragging = false
      for (const [bid, b] of this.bodies) {
        if (bid !== id && b.isStatic) {
          anyDragging = true
          break
        }
      }
      this.hasDraggingSticker = anyDragging
    }
  }

  setGravity(value: number) {
    this.gravity = value
    this.engine.gravity.y = value
  }

  playGravitySound() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    const ctx = this.audioContext
    if (ctx.state === 'suspended') {
      ctx.resume()
    }
    const frequency = 400 + ((this.gravity - 0.5) / 2.5) * 200
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

    gainNode.gain.setValueAtTime(0.08, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.08)
  }

  clearAll() {
    for (const id of Array.from(this.bodies.keys())) {
      this.removeSticker(id)
    }
  }

  getStickerCount() {
    return this.bodies.size
  }

  destroy() {
    Runner.stop(this.runner)
    Composite.clear(this.engine.world)
    Engine.clear(this.engine)
    for (const timer of this.squashTimers.values()) {
      clearTimeout(timer)
    }
    this.squashTimers.clear()
    if (this.audioContext) {
      this.audioContext.close()
    }
  }
}
