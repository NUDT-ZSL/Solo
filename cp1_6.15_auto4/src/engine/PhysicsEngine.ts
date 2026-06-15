import Matter from 'matter-js'
import { LevelObject, GameState, MovingPlatform } from '../core/types'

const { Engine, Render, Runner, Bodies, Body, Composite, Events, Vector } =
  Matter

export interface PhysicsCallbacks {
  onStateUpdate: (state: GameState) => void
  onDeath: () => void
  onWin: () => void
  onObjectPositionUpdate?: (id: string, x: number, y: number) => void
}

export class PhysicsEngine {
  private engine: Matter.Engine
  private runner: Matter.Runner | null = null
  private render: Matter.Render | null = null
  private canvas: HTMLCanvasElement | null = null
  private playerBody: Matter.Body | null = null
  private levelObjects: Map<string, Matter.Body> = new Map()
  private movingPlatforms: Array<{
    body: Matter.Body
    config: MovingPlatform
    originX: number
    originY: number
    time: number
  }> = []
  private startPosition: { x: number; y: number } = { x: 100, y: 100 }
  private goalBody: Matter.Body | null = null
  private callbacks: PhysicsCallbacks
  private gameState: GameState
  private keys: Set<string> = new Set()
  private isRunning: boolean = false
  private deathTimer: number = 0
  private readonly PLAYER_SPEED = 5
  private readonly JUMP_FORCE = 12
  private readonly GRAVITY_SCALE = 0.0015

  constructor(callbacks: PhysicsCallbacks) {
    this.callbacks = callbacks
    this.engine = Engine.create({
      gravity: { x: 0, y: 1, scale: this.GRAVITY_SCALE }
    })
    this.gameState = {
      playerX: 0,
      playerY: 0,
      playerVX: 0,
      playerVY: 0,
      isOnGround: false,
      isDead: false,
      isWin: false,
      deathFlashTime: 0
    }
  }

  init(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    levelObjects: LevelObject[]
  ): void {
    this.canvas = canvas
    this.clearAll()

    this.render = Render.create({
      canvas,
      engine: this.engine,
      options: {
        width,
        height,
        wireframes: false,
        background: '#1A1A2E',
        showAngleIndicator: false,
        pixelRatio: window.devicePixelRatio || 1
      }
    })

    this.loadLevelObjects(levelObjects)
    this.createPlayer()
    this.setupCollisionHandlers()
    this.setupKeyboardListeners()
  }

  private clearAll(): void {
    this.stop()
    if (this.render) {
      Render.stop(this.render)
      this.render.canvas.width = 0
      this.render.canvas.height = 0
    }
    Composite.clear(this.engine.world, false, true)
    this.levelObjects.clear()
    this.movingPlatforms = []
    this.playerBody = null
    this.goalBody = null
    this.keys.clear()
    this.isRunning = false
    this.deathTimer = 0
  }

  private loadLevelObjects(objects: LevelObject[]): void {
    for (const obj of objects) {
      let body: Matter.Body | null = null
      const options: Matter.IBodyDefinition = {
        isStatic: true,
        render: {
          fillStyle: obj.color,
          strokeStyle: obj.color,
          lineWidth: 0
        },
        angle: (obj.rotation * Math.PI) / 180,
        label: obj.type
      }

      switch (obj.type) {
        case 'platform-rect':
          body = Bodies.rectangle(
            obj.x,
            obj.y,
            obj.width,
            obj.height,
            options
          )
          break
        case 'platform-triangle':
          body = Bodies.polygon(obj.x, obj.y, 3, Math.max(obj.width, obj.height) / 2, {
            ...options,
            render: { ...options.render }
          })
          break
        case 'trap-spike':
          body = Bodies.rectangle(
            obj.x,
            obj.y,
            obj.width,
            obj.height,
            {
              ...options,
              isSensor: true,
              label: 'trap-spike'
            }
          )
          break
        case 'trap-moving':
          body = Bodies.rectangle(
            obj.x,
            obj.y,
            obj.width,
            obj.height,
            options
          )
          this.movingPlatforms.push({
            body,
            config: obj as MovingPlatform,
            originX: obj.x,
            originY: obj.y,
            time: 0
          })
          break
        case 'player-start':
          this.startPosition = { x: obj.x, y: obj.y - obj.height / 2 }
          continue
        case 'goal-flag':
          this.goalBody = Bodies.rectangle(
            obj.x,
            obj.y,
            obj.width,
            obj.height,
            {
              ...options,
              isSensor: true,
              label: 'goal-flag',
              render: {
                fillStyle: obj.color,
                strokeStyle: '#FFD700',
                lineWidth: 2
              }
            }
          )
          body = this.goalBody
          break
      }

      if (body) {
        Composite.add(this.engine.world, body)
        this.levelObjects.set(obj.id, body)
      }
    }
  }

  private createPlayer(): void {
    this.playerBody = Bodies.rectangle(
      this.startPosition.x,
      this.startPosition.y,
      28,
      36,
      {
        friction: 0.1,
        frictionAir: 0.02,
        restitution: 0,
        label: 'player',
        render: {
          fillStyle: '#E94560',
          strokeStyle: '#FF6B6B',
          lineWidth: 2
        },
        collisionFilter: {
          category: 0x0001
        }
      }
    )
    Body.setMass(this.playerBody, 1)
    Composite.add(this.engine.world, this.playerBody)
    this.updateGameState()
  }

  private setupCollisionHandlers(): void {
    Events.on(this.engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const { bodyA, bodyB } = pair
        const labels = [bodyA.label, bodyB.label]

        if (labels.includes('player')) {
          const other = labels[0] === 'player' ? bodyB : bodyA

          if (other.label === 'trap-spike' && !this.gameState.isDead) {
            this.triggerDeath()
          }

          if (other.label === 'goal-flag' && !this.gameState.isWin) {
            this.triggerWin()
          }
        }
      }
    })

    Events.on(this.engine, 'collisionActive', () => {
      if (!this.playerBody) return
      this.checkGroundCollision()
    })

    Events.on(this.engine, 'collisionEnd', () => {
      if (!this.playerBody) return
      this.gameState.isOnGround = false
    })
  }

  private checkGroundCollision(): void {
    if (!this.playerBody) return
    const playerBottom = this.playerBody.position.y + 18
    this.gameState.isOnGround = false

    for (const [, body] of this.levelObjects) {
      if (body.isSensor) continue
      if (body.label === 'trap-spike') continue

      const top = body.position.y - (body.bounds.max.y - body.bounds.min.y) / 2
      const left = body.bounds.min.x
      const right = body.bounds.max.x
      const px = this.playerBody.position.x

      if (
        px > left &&
        px < right &&
        Math.abs(playerBottom - top) < 5 &&
        this.playerBody.velocity.y >= -1
      ) {
        this.gameState.isOnGround = true
        break
      }
    }
  }

  private setupKeyboardListeners(): void {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!this.isRunning) return
      this.keys.add(e.key.toLowerCase())

      if (e.key === 'Escape') {
        this.callbacks.onDeath = () => {}
        this.callbacks.onWin = () => {}
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      this.keys.delete(e.key.toLowerCase())
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    ;(this as any)._keyCleanup = () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }

  start(): void {
    if (this.isRunning || !this.render) return
    this.isRunning = true

    this.runner = Runner.create()
    Runner.run(this.runner, this.engine)
    Render.run(this.render)

    Events.on(this.engine, 'beforeUpdate', () => {
      if (!this.isRunning) return
      this.handleInput()
      this.updateMovingPlatforms()
      this.updateDeathState()
      this.updateGameState()
    })
  }

  stop(): void {
    this.isRunning = false
    if (this.runner) {
      Runner.stop(this.runner)
      this.runner = null
    }
    if ((this as any)._keyCleanup) {
      ;(this as any)._keyCleanup()
    }
  }

  private handleInput(): void {
    if (!this.playerBody || this.gameState.isDead || this.gameState.isWin) return

    let vx = 0

    if (this.keys.has('a') || this.keys.has('arrowleft')) {
      vx = -this.PLAYER_SPEED
    }
    if (this.keys.has('d') || this.keys.has('arrowright')) {
      vx = this.PLAYER_SPEED
    }

    Body.setVelocity(this.playerBody, {
      x: vx,
      y: this.playerBody.velocity.y
    })

    if (
      (this.keys.has('w') || this.keys.has('arrowup') || this.keys.has(' ')) &&
      this.gameState.isOnGround
    ) {
      Body.setVelocity(this.playerBody, {
        x: this.playerBody.velocity.x,
        y: -this.JUMP_FORCE
      })
      this.gameState.isOnGround = false
    }
  }

  private updateMovingPlatforms(): void {
    for (const mp of this.movingPlatforms) {
      mp.time += 0.016 * mp.config.moveSpeed
      const offsetX = Math.sin(mp.time) * mp.config.moveRangeX
      const offsetY = Math.sin(mp.time) * mp.config.moveRangeY

      const targetX = mp.originX + offsetX
      const targetY = mp.originY + offsetY

      Body.setPosition(mp.body, {
        x: targetX,
        y: targetY
      })
    }
  }

  private updateDeathState(): void {
    if (this.gameState.isDead) {
      this.deathTimer += 16
      this.gameState.deathFlashTime = this.deathTimer

      if (this.deathTimer >= 500) {
        this.respawnPlayer()
      }
    }
  }

  private triggerDeath(): void {
    this.gameState.isDead = true
    this.deathTimer = 0
    this.callbacks.onDeath()
  }

  private triggerWin(): void {
    this.gameState.isWin = true
    this.callbacks.onWin()
  }

  private respawnPlayer(): void {
    if (!this.playerBody) return
    this.gameState.isDead = false
    this.gameState.deathFlashTime = 0
    this.deathTimer = 0
    Body.setPosition(this.playerBody, {
      x: this.startPosition.x,
      y: this.startPosition.y
    })
    Body.setVelocity(this.playerBody, { x: 0, y: 0 })
    Body.setAngle(this.playerBody, 0)
  }

  private updateGameState(): void {
    if (!this.playerBody) return
    this.gameState.playerX = this.playerBody.position.x
    this.gameState.playerY = this.playerBody.position.y
    this.gameState.playerVX = this.playerBody.velocity.x
    this.gameState.playerVY = this.playerBody.velocity.y
    this.callbacks.onStateUpdate({ ...this.gameState })
  }

  resize(width: number, height: number): void {
    if (!this.render) return
    this.render.options.width = width
    this.render.options.height = height
    this.render.canvas.width = width
    this.render.canvas.height = height
  }

  destroy(): void {
    this.stop()
    this.clearAll()
    if (this.render) {
      this.render.textures = {}
      this.render = null
    }
    Engine.clear(this.engine)
  }
}

export { Matter }
