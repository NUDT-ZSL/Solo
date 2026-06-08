import React, { forwardRef, useImperativeHandle, useRef, useEffect, useCallback } from 'react'

export interface GameCanvasHandle {
  activateSkill: (index: number) => void
  restart: () => void
}

export interface GameUIState {
  health: number
  energy: number
  score: number
  gameOver: boolean
  skills: { name: string; key: string; ready: boolean; cooldown: number; maxCooldown: number }[]
}

interface GameCanvasProps {
  onStateChange: (state: GameUIState) => void
}

interface Vec2 { x: number; y: number }

interface PlayerState {
  pos: Vec2
  health: number
  energy: number
  shieldTimer: number
  invTimer: number
  recoilTimer: number
  fireTimer: number
}

type EnemyType = 'triangle' | 'diamond' | 'disc'

interface Enemy {
  pos: Vec2
  vel: Vec2
  type: EnemyType
  hp: number
  maxHp: number
  fireTimer: number
  fireInterval: number
  angle: number
  age: number
}

interface Bullet {
  pos: Vec2
  vel: Vec2
  radius: number
  color: string
  glowColor: string
  isPlayer: boolean
  damage: number
}

interface Particle {
  pos: Vec2
  vel: Vec2
  life: number
  maxLife: number
  radius: number
  color: string
  type: 'explosion' | 'trail' | 'muzzle' | 'energy' | 'shield' | 'debris'
}

interface Star {
  x: number
  y: number
  depth: number
  brightness: number
  twinklePhase: number
  twinkleSpeed: number
}

interface Nebula {
  x: number
  y: number
  radius: number
  rotation: number
  rotSpeed: number
  hue: number
  opacity: number
}

interface EnergyOrb {
  pos: Vec2
  vel: Vec2
  life: number
  value: number
  attracted: boolean
}

interface PulseWave {
  pos: Vec2
  radius: number
  maxRadius: number
  alpha: number
}

interface ScreenEffect {
  redFlash: number
  whiteFlash: number
  shakeX: number
  shakeY: number
  shakeIntensity: number
  shakeDecay: number
}

const PLAYER_SPEED = 320
const PLAYER_FIRE_RATE = 0.1
const PLAYER_BULLET_SPEED = 700
const ENEMY_BULLET_SPEED = 220
const ENERGY_MAX = 100
const SHIELD_DURATION = 3
const SKILL_COOLDOWNS = [0, 0]
const INV_DURATION = 1.5
const PLAYER_RADIUS = 18

const ENEMY_CONFIGS: Record<EnemyType, { hp: number; speed: number; radius: number; fireInterval: number; energyDrop: number; scoreValue: number }> = {
  triangle: { hp: 1, speed: 180, radius: 14, fireInterval: 0, energyDrop: 8, scoreValue: 100 },
  diamond: { hp: 2, speed: 100, radius: 18, fireInterval: 1.8, energyDrop: 12, scoreValue: 250 },
  disc: { hp: 8, speed: 60, radius: 30, fireInterval: 2.5, energyDrop: 25, scoreValue: 500 },
}

function createStars(w: number, h: number): Star[] {
  const stars: Star[] = []
  for (let i = 0; i < 200; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      depth: Math.random() * 0.8 + 0.2,
      brightness: Math.random() * 0.6 + 0.4,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: Math.random() * 2 + 1,
    })
  }
  return stars
}

function createNebulae(w: number, h: number): Nebula[] {
  const nebulae: Nebula[] = []
  for (let i = 0; i < 3; i++) {
    nebulae.push({
      x: Math.random() * w,
      y: Math.random() * h,
      radius: Math.random() * 150 + 100,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.1,
      hue: Math.random() * 60 + 260,
      opacity: Math.random() * 0.08 + 0.03,
    })
  }
  return nebulae
}

const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(({ onStateChange }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<{
    player: PlayerState
    enemies: Enemy[]
    bullets: Bullet[]
    particles: Particle[]
    stars: Star[]
    nebulae: Nebula[]
    energyOrbs: EnergyOrb[]
    pulseWaves: PulseWave[]
    effects: ScreenEffect
    score: number
    gameOver: boolean
    gameStarted: boolean
    spawnTimer: number
    difficulty: number
    keys: Set<string>
    skillCooldowns: number[]
    skillReady: boolean[]
    animFrameId: number
    lastTime: number
    gameTime: number
    W: number
    H: number
    touchMove: Vec2 | null
    touchFiring: boolean
    dpr: number
  } | null>(null)

  const emitState = useCallback(() => {
    const g = gameRef.current
    if (!g) return
    onStateChange({
      health: g.player.health,
      energy: g.player.energy,
      score: g.score,
      gameOver: g.gameOver,
      skills: [
        { name: '天穹护盾', key: 'Q', ready: g.skillReady[0], cooldown: g.skillCooldowns[0], maxCooldown: 0 },
        { name: '星爆脉冲', key: 'E', ready: g.skillReady[1], cooldown: g.skillCooldowns[1], maxCooldown: 0 },
      ],
    })
  }, [onStateChange])

  const initGame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const W = window.innerWidth
    const H = window.innerHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = W + 'px'
    canvas.style.height = H + 'px'

    gameRef.current = {
      player: {
        pos: { x: W / 2, y: H * 0.75 },
        health: 3,
        energy: 0,
        shieldTimer: 0,
        invTimer: 0,
        recoilTimer: 0,
        fireTimer: 0,
      },
      enemies: [],
      bullets: [],
      particles: [],
      stars: createStars(W, H),
      nebulae: createNebulae(W, H),
      energyOrbs: [],
      pulseWaves: [],
      effects: { redFlash: 0, whiteFlash: 0, shakeX: 0, shakeY: 0, shakeIntensity: 0, shakeDecay: 0 },
      score: 0,
      gameOver: false,
      gameStarted: true,
      spawnTimer: 0,
      difficulty: 1,
      keys: new Set(),
      skillCooldowns: [0, 0],
      skillReady: [false, false],
      animFrameId: 0,
      lastTime: 0,
      gameTime: 0,
      W,
      H,
      touchMove: null,
      touchFiring: false,
      dpr,
    }
    emitState()
  }, [emitState])

  const activateSkill = useCallback((index: number) => {
    const g = gameRef.current
    if (!g || g.gameOver || !g.gameStarted) return
    if (g.player.energy < ENERGY_MAX) return
    if (g.skillCooldowns[index] > 0) return

    g.player.energy = 0
    g.skillCooldowns[index] = 3
    g.skillReady[index] = false

    if (index === 0) {
      g.player.shieldTimer = SHIELD_DURATION
      for (let i = 0; i < 30; i++) {
        const angle = (Math.PI * 2 * i) / 30
        g.particles.push({
          pos: { x: g.player.pos.x + Math.cos(angle) * 40, y: g.player.pos.y + Math.sin(angle) * 40 },
          vel: { x: Math.cos(angle) * 60, y: Math.sin(angle) * 60 },
          life: 0.6,
          maxLife: 0.6,
          radius: 3,
          color: '#4dc9f6',
          type: 'shield',
        })
      }
    } else if (index === 1) {
      g.effects.whiteFlash = 1
      g.effects.shakeIntensity = 15
      g.pulseWaves.push({
        pos: { x: g.player.pos.x, y: g.player.pos.y },
        radius: 0,
        maxRadius: Math.max(g.W, g.H) * 1.2,
        alpha: 1,
      })
      const enemiesToKill = [...g.enemies]
      for (const e of enemiesToKill) {
        e.hp = 0
        g.score += ENEMY_CONFIGS[e.type].scoreValue
        spawnExplosion(g, e.pos, e.type)
        spawnEnergyOrb(g, e.pos, ENEMY_CONFIGS[e.type].energyDrop)
      }
      g.bullets = g.bullets.filter(b => b.isPlayer)
    }
    emitState()
  }, [emitState])

  const restart = useCallback(() => {
    initGame()
  }, [initGame])

  useImperativeHandle(ref, () => ({ activateSkill, restart }), [activateSkill, restart])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    initGame()
    const g = gameRef.current!

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      g.keys.add(key)
      if (key === 'q') activateSkill(0)
      if (key === 'e') activateSkill(1)
      if (key === ' ' || key === 'arrowup' || key === 'arrowdown' || key === 'arrowleft' || key === 'arrowright') {
        e.preventDefault()
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      g.keys.delete(e.key.toLowerCase())
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1
      const W = window.innerWidth
      const H = window.innerHeight
      canvas.width = W * dpr
      canvas.height = H * dpr
      canvas.style.width = W + 'px'
      canvas.style.height = H + 'px'
      g.W = W
      g.H = H
      g.dpr = dpr
      g.stars = createStars(W, H)
      g.nebulae = createNebulae(W, H)
    }
    window.addEventListener('resize', handleResize)

    const isTouchDevice = 'ontouchstart' in window
    const touchEl = document.getElementById('touchControls')
    if (touchEl) touchEl.style.display = isTouchDevice ? 'flex' : 'none'

    let joystickTouchId: number | null = null
    let joystickOrigin: Vec2 | null = null

    const joystickZone = document.getElementById('joystickZone')
    const joystickBase = document.getElementById('joystickBase')
    const joystickThumb = document.getElementById('joystickThumb')

    const onJoystickStart = (e: TouchEvent) => {
      e.preventDefault()
      const t = e.changedTouches[0]
      joystickTouchId = t.identifier
      joystickOrigin = { x: t.clientX, y: t.clientY }
      if (joystickBase) {
        joystickBase.style.left = t.clientX - 50 + 'px'
        joystickBase.style.top = t.clientY - 50 + 'px'
        joystickBase.style.opacity = '1'
      }
    }
    const onJoystickMove = (e: TouchEvent) => {
      e.preventDefault()
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i]
        if (t.identifier === joystickTouchId && joystickOrigin) {
          const dx = t.clientX - joystickOrigin.x
          const dy = t.clientY - joystickOrigin.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const maxDist = 40
          const clampDist = Math.min(dist, maxDist)
          const nx = dist > 0 ? dx / dist : 0
          const ny = dist > 0 ? dy / dist : 0
          if (joystickThumb) {
            joystickThumb.style.transform = `translate(${nx * clampDist}px, ${ny * clampDist}px)`
          }
          g.touchMove = { x: nx * (clampDist / maxDist), y: ny * (clampDist / maxDist) }
        }
      }
    }
    const onJoystickEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joystickTouchId) {
          joystickTouchId = null
          joystickOrigin = null
          g.touchMove = null
          if (joystickThumb) joystickThumb.style.transform = 'translate(0,0)'
          if (joystickBase) joystickBase.style.opacity = '0.4'
        }
      }
    }

    if (joystickZone) {
      joystickZone.addEventListener('touchstart', onJoystickStart, { passive: false })
      joystickZone.addEventListener('touchmove', onJoystickMove, { passive: false })
      joystickZone.addEventListener('touchend', onJoystickEnd)
    }

    const touchFireBtn = document.getElementById('touchFire')
    const onFireStart = (e: TouchEvent) => { e.preventDefault(); g.touchFiring = true }
    const onFireEnd = () => { g.touchFiring = false }
    if (touchFireBtn) {
      touchFireBtn.addEventListener('touchstart', onFireStart, { passive: false })
      touchFireBtn.addEventListener('touchend', onFireEnd)
    }

    const touchSkill0 = document.getElementById('touchSkill0')
    const touchSkill1 = document.getElementById('touchSkill1')
    if (touchSkill0) touchSkill0.addEventListener('touchstart', (e) => { e.preventDefault(); activateSkill(0) }, { passive: false })
    if (touchSkill1) touchSkill1.addEventListener('touchstart', (e) => { e.preventDefault(); activateSkill(1) }, { passive: false })

    function spawnExplosion(g: NonNullable<typeof gameRef.current>, pos: Vec2, type: EnemyType) {
      const count = type === 'disc' ? 30 : type === 'diamond' ? 20 : 12
      const colors = type === 'triangle' ? ['#ff4444', '#ff8844', '#ffaa44']
        : type === 'diamond' ? ['#ff8800', '#ffaa00', '#ffcc44']
        : ['#aa44ff', '#cc66ff', '#ff44ff']
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = Math.random() * 200 + 80
        g.particles.push({
          pos: { x: pos.x, y: pos.y },
          vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
          life: Math.random() * 0.5 + 0.3,
          maxLife: 0.8,
          radius: Math.random() * 4 + 2,
          color: colors[Math.floor(Math.random() * colors.length)],
          type: 'explosion',
        })
      }
      for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = Math.random() * 150 + 50
        g.particles.push({
          pos: { x: pos.x, y: pos.y },
          vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
          life: Math.random() * 0.8 + 0.4,
          maxLife: 1.2,
          radius: Math.random() * 2 + 1,
          color: '#ffffff',
          type: 'debris',
        })
      }
    }

    function spawnEnergyOrb(g: NonNullable<typeof gameRef.current>, pos: Vec2, value: number) {
      g.energyOrbs.push({
        pos: { x: pos.x + (Math.random() - 0.5) * 20, y: pos.y + (Math.random() - 0.5) * 20 },
        vel: { x: (Math.random() - 0.5) * 40, y: (Math.random() - 0.5) * 40 },
        life: 8,
        value,
        attracted: false,
      })
    }

    function spawnEnemy(g: NonNullable<typeof gameRef.current>) {
      const W = g.W
      const roll = Math.random()
      let type: EnemyType
      if (roll < 0.5) type = 'triangle'
      else if (roll < 0.82) type = 'diamond'
      else type = 'disc'

      const cfg = ENEMY_CONFIGS[type]
      const x = Math.random() * (W - 80) + 40
      const speedMult = 1 + g.difficulty * 0.1

      let vel: Vec2
      if (type === 'triangle') {
        const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.6
        vel = { x: Math.cos(angle) * cfg.speed * speedMult, y: Math.sin(angle) * cfg.speed * speedMult }
      } else if (type === 'diamond') {
        vel = { x: (Math.random() - 0.5) * 40, y: cfg.speed * speedMult }
      } else {
        vel = { x: (Math.random() - 0.5) * 30, y: cfg.speed * speedMult }
      }

      g.enemies.push({
        pos: { x, y: -40 },
        vel,
        type,
        hp: cfg.hp + Math.floor(g.difficulty * 0.3),
        maxHp: cfg.hp + Math.floor(g.difficulty * 0.3),
        fireTimer: Math.random() * cfg.fireInterval,
        fireInterval: cfg.fireInterval / speedMult,
        angle: 0,
        age: 0,
      })
    }

    function fireEnemyBullets(g: NonNullable<typeof gameRef.current>, enemy: Enemy) {
      const p = g.player.pos
      if (enemy.type === 'diamond') {
        const dx = p.x - enemy.pos.x
        const dy = p.y - enemy.pos.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        g.bullets.push({
          pos: { x: enemy.pos.x, y: enemy.pos.y },
          vel: { x: (dx / dist) * ENEMY_BULLET_SPEED, y: (dy / dist) * ENEMY_BULLET_SPEED },
          radius: 4,
          color: '#ff8800',
          glowColor: '#ffaa44',
          isPlayer: false,
          damage: 1,
        })
      } else if (enemy.type === 'disc') {
        const count = 7
        const spread = Math.PI * 0.5
        const baseAngle = Math.PI / 2
        for (let i = 0; i < count; i++) {
          const angle = baseAngle - spread / 2 + (spread / (count - 1)) * i
          g.bullets.push({
            pos: { x: enemy.pos.x, y: enemy.pos.y },
            vel: { x: Math.cos(angle) * ENEMY_BULLET_SPEED, y: Math.sin(angle) * ENEMY_BULLET_SPEED },
            radius: 5,
            color: '#aa44ff',
            glowColor: '#cc66ff',
            isPlayer: false,
            damage: 1,
          })
        }
      }
    }

    let prevHealth = 3
    let prevEnergy = 0
    let prevScore = 0
    let prevGameOver = false
    let prevSkill0Ready = false
    let prevSkill1Ready = false

    function update(g: NonNullable<typeof gameRef.current>, dt: number) {
      if (g.gameOver) return
      g.gameTime += dt
      g.difficulty = 1 + g.score / 2000

      const p = g.player

      let mx = 0, my = 0
      if (g.keys.has('w') || g.keys.has('arrowup')) my -= 1
      if (g.keys.has('s') || g.keys.has('arrowdown')) my += 1
      if (g.keys.has('a') || g.keys.has('arrowleft')) mx -= 1
      if (g.keys.has('d') || g.keys.has('arrowright')) mx += 1
      if (g.touchMove) {
        mx += g.touchMove.x
        my += g.touchMove.y
      }
      const moveLen = Math.sqrt(mx * mx + my * my)
      if (moveLen > 0) {
        mx /= moveLen
        my /= moveLen
      }
      p.pos.x += mx * PLAYER_SPEED * dt
      p.pos.y += my * PLAYER_SPEED * dt
      p.pos.x = Math.max(PLAYER_RADIUS, Math.min(g.W - PLAYER_RADIUS, p.pos.x))
      p.pos.y = Math.max(PLAYER_RADIUS, Math.min(g.H - PLAYER_RADIUS, p.pos.y))

      p.fireTimer -= dt
      if ((g.keys.has(' ') || g.touchFiring) && p.fireTimer <= 0) {
        p.fireTimer = PLAYER_FIRE_RATE
        p.recoilTimer = 0.06
        g.bullets.push({
          pos: { x: p.pos.x, y: p.pos.y - 20 },
          vel: { x: 0, y: -PLAYER_BULLET_SPEED },
          radius: 3,
          color: '#44ddff',
          glowColor: '#88eeff',
          isPlayer: true,
          damage: 1,
        })
        g.particles.push({
          pos: { x: p.pos.x, y: p.pos.y - 20 },
          vel: { x: (Math.random() - 0.5) * 30, y: -60 },
          life: 0.08,
          maxLife: 0.08,
          radius: 6,
          color: '#ffffff',
          type: 'muzzle',
        })
      }

      if (p.shieldTimer > 0) p.shieldTimer -= dt
      if (p.invTimer > 0) p.invTimer -= dt
      if (p.recoilTimer > 0) p.recoilTimer -= dt

      if (Math.random() < 0.7) {
        g.particles.push({
          pos: { x: p.pos.x + (Math.random() - 0.5) * 8, y: p.pos.y + 16 },
          vel: { x: (Math.random() - 0.5) * 20, y: Math.random() * 80 + 40 },
          life: 0.3 + Math.random() * 0.2,
          maxLife: 0.5,
          radius: Math.random() * 3 + 1,
          color: `hsl(${200 + Math.random() * 20}, 100%, ${60 + Math.random() * 30}%)`,
          type: 'trail',
        })
      }

      g.spawnTimer -= dt
      if (g.spawnTimer <= 0) {
        const interval = Math.max(0.3, 2.0 - g.difficulty * 0.15)
        g.spawnTimer = interval
        spawnEnemy(g)
        if (g.difficulty > 3 && Math.random() < 0.3) spawnEnemy(g)
        if (g.difficulty > 6 && Math.random() < 0.3) spawnEnemy(g)
      }

      for (let i = g.enemies.length - 1; i >= 0; i--) {
        const e = g.enemies[i]
        e.pos.x += e.vel.x * dt
        e.pos.y += e.vel.y * dt
        e.age += dt
        e.angle += dt * 2

        if (e.type === 'diamond') {
          e.vel.x = Math.sin(e.age * 1.5) * 60
        }

        if (e.fireInterval > 0) {
          e.fireTimer -= dt
          if (e.fireTimer <= 0 && e.pos.y > 0) {
            e.fireTimer = e.fireInterval
            fireEnemyBullets(g, e)
          }
        }

        if (e.pos.y > g.H + 60 || e.pos.x < -60 || e.pos.x > g.W + 60) {
          g.enemies.splice(i, 1)
        }
      }

      for (let i = g.bullets.length - 1; i >= 0; i--) {
        const b = g.bullets[i]
        b.pos.x += b.vel.x * dt
        b.pos.y += b.vel.y * dt
        if (b.pos.y < -20 || b.pos.y > g.H + 20 || b.pos.x < -20 || b.pos.x > g.W + 20) {
          g.bullets.splice(i, 1)
        }
      }

      for (let i = g.bullets.length - 1; i >= 0; i--) {
        const b = g.bullets[i]
        if (!b.isPlayer) continue
        for (let j = g.enemies.length - 1; j >= 0; j--) {
          const e = g.enemies[j]
          const cfg = ENEMY_CONFIGS[e.type]
          const dx = b.pos.x - e.pos.x
          const dy = b.pos.y - e.pos.y
          if (dx * dx + dy * dy < (b.radius + cfg.radius) ** 2) {
            e.hp -= b.damage
            g.bullets.splice(i, 1)
            if (e.hp <= 0) {
              g.score += cfg.scoreValue
              spawnExplosion(g, e.pos, e.type)
              spawnEnergyOrb(g, e.pos, cfg.energyDrop)
              g.effects.shakeIntensity = Math.max(g.effects.shakeIntensity, e.type === 'disc' ? 8 : 4)
              g.enemies.splice(j, 1)
            } else {
              for (let k = 0; k < 4; k++) {
                const angle = Math.random() * Math.PI * 2
                g.particles.push({
                  pos: { x: b.pos.x, y: b.pos.y },
                  vel: { x: Math.cos(angle) * 80, y: Math.sin(angle) * 80 },
                  life: 0.2,
                  maxLife: 0.2,
                  radius: 2,
                  color: '#ffffff',
                  type: 'debris',
                })
              }
            }
            break
          }
        }
      }

      if (p.shieldTimer <= 0 && p.invTimer <= 0) {
        for (let i = g.bullets.length - 1; i >= 0; i--) {
          const b = g.bullets[i]
          if (b.isPlayer) continue
          const dx = b.pos.x - p.pos.x
          const dy = b.pos.y - p.pos.y
          if (dx * dx + dy * dy < (b.radius + PLAYER_RADIUS * 0.7) ** 2) {
            g.bullets.splice(i, 1)
            p.health -= 1
            p.invTimer = INV_DURATION
            g.effects.redFlash = 0.6
            g.effects.shakeIntensity = 10
            if (p.health <= 0) {
              g.gameOver = true
              spawnExplosion(g, p.pos, 'disc')
            }
            break
          }
        }
      }

      if (p.shieldTimer <= 0 && p.invTimer <= 0) {
        for (let j = g.enemies.length - 1; j >= 0; j--) {
          const e = g.enemies[j]
          const cfg = ENEMY_CONFIGS[e.type]
          const dx = e.pos.x - p.pos.x
          const dy = e.pos.y - p.pos.y
          if (dx * dx + dy * dy < (cfg.radius + PLAYER_RADIUS * 0.7) ** 2) {
            p.health -= 1
            p.invTimer = INV_DURATION
            g.effects.redFlash = 0.6
            g.effects.shakeIntensity = 10
            e.hp -= 2
            if (e.hp <= 0) {
              g.score += cfg.scoreValue
              spawnExplosion(g, e.pos, e.type)
              g.enemies.splice(j, 1)
            }
            if (p.health <= 0) {
              g.gameOver = true
              spawnExplosion(g, p.pos, 'disc')
            }
            break
          }
        }
      }

      for (let i = g.energyOrbs.length - 1; i >= 0; i--) {
        const orb = g.energyOrbs[i]
        orb.life -= dt
        if (orb.life <= 0) { g.energyOrbs.splice(i, 1); continue }

        const dx = p.pos.x - orb.pos.x
        const dy = p.pos.y - orb.pos.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 120) orb.attracted = true
        if (orb.attracted) {
          const speed = 300
          orb.vel.x = (dx / dist) * speed
          orb.vel.y = (dy / dist) * speed
        }
        orb.pos.x += orb.vel.x * dt
        orb.pos.y += orb.vel.y * dt

        if (dist < 20) {
          p.energy = Math.min(ENERGY_MAX, p.energy + orb.value)
          g.energyOrbs.splice(i, 1)
        }
      }

      for (let i = g.particles.length - 1; i >= 0; i--) {
        const pt = g.particles[i]
        pt.life -= dt
        if (pt.life <= 0) { g.particles.splice(i, 1); continue }
        pt.pos.x += pt.vel.x * dt
        pt.pos.y += pt.vel.y * dt
        pt.vel.x *= 0.98
        pt.vel.y *= 0.98
      }

      for (let i = g.pulseWaves.length - 1; i >= 0; i--) {
        const pw = g.pulseWaves[i]
        pw.radius += dt * 1200
        pw.alpha -= dt * 1.5
        if (pw.alpha <= 0) g.pulseWaves.splice(i, 1)
      }

      for (const star of g.stars) {
        star.y += star.depth * 30 * dt
        star.twinklePhase += star.twinkleSpeed * dt
        if (star.y > g.H) { star.y = 0; star.x = Math.random() * g.W }
      }
      for (const neb of g.nebulae) {
        neb.y += 8 * dt
        neb.rotation += neb.rotSpeed * dt
        if (neb.y - neb.radius > g.H) { neb.y = -neb.radius; neb.x = Math.random() * g.W }
      }

      g.effects.redFlash = Math.max(0, g.effects.redFlash - dt * 3)
      g.effects.whiteFlash = Math.max(0, g.effects.whiteFlash - dt * 4)
      if (g.effects.shakeIntensity > 0) {
        g.effects.shakeX = (Math.random() - 0.5) * g.effects.shakeIntensity * 2
        g.effects.shakeY = (Math.random() - 0.5) * g.effects.shakeIntensity * 2
        g.effects.shakeIntensity = Math.max(0, g.effects.shakeIntensity - dt * 30)
      } else {
        g.effects.shakeX = 0
        g.effects.shakeY = 0
      }

      for (let i = 0; i < 2; i++) {
        if (g.skillCooldowns[i] > 0) {
          g.skillCooldowns[i] = Math.max(0, g.skillCooldowns[i] - dt)
        }
        g.skillReady[i] = p.energy >= ENERGY_MAX && g.skillCooldowns[i] <= 0
      }

      if (p.shieldTimer > 0 && Math.random() < 0.4) {
        const angle = Math.random() * Math.PI * 2
        g.particles.push({
          pos: { x: p.pos.x + Math.cos(angle) * 35, y: p.pos.y + Math.sin(angle) * 35 },
          vel: { x: Math.cos(angle) * 15, y: Math.sin(angle) * 15 },
          life: 0.3,
          maxLife: 0.3,
          radius: 2,
          color: '#4dc9f6',
          type: 'shield',
        })
      }

      if (p.health !== prevHealth || p.energy !== prevEnergy || g.score !== prevScore || g.gameOver !== prevGameOver || g.skillReady[0] !== prevSkill0Ready || g.skillReady[1] !== prevSkill1Ready) {
        prevHealth = p.health
        prevEnergy = p.energy
        prevScore = g.score
        prevGameOver = g.gameOver
        prevSkill0Ready = g.skillReady[0]
        prevSkill1Ready = g.skillReady[1]
        emitState()
      }
    }

    function render(g: NonNullable<typeof gameRef.current>) {
      const { dpr, W, H } = g
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.save()
      ctx.translate(g.effects.shakeX, g.effects.shakeY)

      const bgGrad = ctx.createLinearGradient(0, 0, 0, H)
      bgGrad.addColorStop(0, '#050510')
      bgGrad.addColorStop(0.5, '#0a0820')
      bgGrad.addColorStop(1, '#120828')
      ctx.fillStyle = bgGrad
      ctx.fillRect(-20, -20, W + 40, H + 40)

      for (const neb of g.nebulae) {
        ctx.save()
        ctx.translate(neb.x, neb.y)
        ctx.rotate(neb.rotation)
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, neb.radius)
        grad.addColorStop(0, `hsla(${neb.hue}, 70%, 40%, ${neb.opacity})`)
        grad.addColorStop(0.5, `hsla(${neb.hue + 20}, 60%, 30%, ${neb.opacity * 0.5})`)
        grad.addColorStop(1, 'transparent')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.ellipse(0, 0, neb.radius * 1.3, neb.radius, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      for (const star of g.stars) {
        const twinkle = 0.5 + 0.5 * Math.sin(star.twinklePhase)
        const alpha = star.brightness * twinkle
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
        const size = star.depth * 2
        ctx.fillRect(star.x - size / 2, star.y - size / 2, size, size)
      }

      for (const pw of g.pulseWaves) {
        ctx.beginPath()
        ctx.arc(pw.pos.x, pw.pos.y, pw.radius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(100, 200, 255, ${pw.alpha * 0.6})`
        ctx.lineWidth = 4
        ctx.stroke()
        ctx.strokeStyle = `rgba(200, 230, 255, ${pw.alpha * 0.3})`
        ctx.lineWidth = 12
        ctx.stroke()
      }

      for (const orb of g.energyOrbs) {
        const pulse = 0.7 + 0.3 * Math.sin(g.gameTime * 6)
        ctx.save()
        ctx.shadowColor = '#44ff88'
        ctx.shadowBlur = 12 * pulse
        ctx.fillStyle = `rgba(68, 255, 136, ${0.8 * pulse})`
        ctx.beginPath()
        ctx.arc(orb.pos.x, orb.pos.y, 6 * pulse, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(orb.pos.x, orb.pos.y, 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      for (const e of g.enemies) {
        ctx.save()
        ctx.translate(e.pos.x, e.pos.y)
        const cfg = ENEMY_CONFIGS[e.type]

        if (e.type === 'triangle') {
          ctx.shadowColor = '#ff4444'
          ctx.shadowBlur = 10
          ctx.strokeStyle = '#ff6644'
          ctx.lineWidth = 2
          ctx.fillStyle = 'rgba(255, 50, 30, 0.3)'
          ctx.beginPath()
          ctx.moveTo(0, -cfg.radius)
          ctx.lineTo(-cfg.radius * 0.8, cfg.radius * 0.7)
          ctx.lineTo(cfg.radius * 0.8, cfg.radius * 0.7)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
        } else if (e.type === 'diamond') {
          ctx.shadowColor = '#ff8800'
          ctx.shadowBlur = 12
          ctx.strokeStyle = '#ffaa44'
          ctx.lineWidth = 2
          ctx.fillStyle = 'rgba(255, 140, 0, 0.3)'
          ctx.beginPath()
          ctx.moveTo(0, -cfg.radius)
          ctx.lineTo(cfg.radius * 0.7, 0)
          ctx.lineTo(0, cfg.radius)
          ctx.lineTo(-cfg.radius * 0.7, 0)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
        } else {
          ctx.rotate(e.angle * 0.3)
          ctx.shadowColor = '#aa44ff'
          ctx.shadowBlur = 16
          ctx.strokeStyle = '#cc66ff'
          ctx.lineWidth = 2.5
          ctx.fillStyle = 'rgba(160, 60, 255, 0.25)'
          ctx.beginPath()
          ctx.arc(0, 0, cfg.radius, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI * 2 * i) / 6 + e.angle
            ctx.beginPath()
            ctx.moveTo(Math.cos(a) * cfg.radius * 0.5, Math.sin(a) * cfg.radius * 0.5)
            ctx.lineTo(Math.cos(a) * cfg.radius, Math.sin(a) * cfg.radius)
            ctx.strokeStyle = 'rgba(200, 100, 255, 0.4)'
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }

        if (e.hp < e.maxHp) {
          const barW = cfg.radius * 1.6
          const barH = 3
          const barY = -cfg.radius - 8
          ctx.fillStyle = 'rgba(0,0,0,0.5)'
          ctx.fillRect(-barW / 2, barY, barW, barH)
          ctx.fillStyle = e.type === 'disc' ? '#cc66ff' : e.type === 'diamond' ? '#ffaa44' : '#ff6644'
          ctx.fillRect(-barW / 2, barY, barW * (e.hp / e.maxHp), barH)
        }

        ctx.restore()
      }

      for (const b of g.bullets) {
        ctx.save()
        ctx.shadowColor = b.glowColor
        ctx.shadowBlur = b.isPlayer ? 8 : 10
        ctx.fillStyle = b.color
        ctx.beginPath()
        ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.globalAlpha = 0.6
        ctx.beginPath()
        ctx.arc(b.pos.x, b.pos.y, b.radius * 0.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      for (const pt of g.particles) {
        const alpha = Math.max(0, pt.life / pt.maxLife)
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.shadowColor = pt.color
        ctx.shadowBlur = 6
        ctx.fillStyle = pt.color
        ctx.beginPath()
        ctx.arc(pt.pos.x, pt.pos.y, pt.radius * alpha, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      const p = g.player
      if (!g.gameOver) {
        ctx.save()
        ctx.translate(p.pos.x, p.pos.y)

        if (p.shieldTimer > 0) {
          const shieldAlpha = Math.min(1, p.shieldTimer / 0.5) * 0.4
          ctx.beginPath()
          ctx.arc(0, 0, 35, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(77, 201, 246, ${shieldAlpha})`
          ctx.lineWidth = 2
          ctx.shadowColor = '#4dc9f6'
          ctx.shadowBlur = 15
          ctx.stroke()
          ctx.fillStyle = `rgba(77, 201, 246, ${shieldAlpha * 0.15})`
          ctx.fill()
        }

        if (p.invTimer > 0 && Math.floor(p.invTimer * 10) % 2 === 0) {
          ctx.globalAlpha = 0.4
        }

        const recoilY = p.recoilTimer > 0 ? 3 : 0

        ctx.shadowColor = '#4488ff'
        ctx.shadowBlur = 12
        ctx.strokeStyle = '#c0d0e8'
        ctx.lineWidth = 2
        ctx.fillStyle = 'rgba(160, 180, 220, 0.15)'

        ctx.beginPath()
        ctx.moveTo(0, -22 + recoilY)
        ctx.lineTo(-6, -14 + recoilY)
        ctx.lineTo(-14, 8 + recoilY)
        ctx.lineTo(-18, 14 + recoilY)
        ctx.lineTo(-8, 10 + recoilY)
        ctx.lineTo(0, 16 + recoilY)
        ctx.lineTo(8, 10 + recoilY)
        ctx.lineTo(18, 14 + recoilY)
        ctx.lineTo(14, 8 + recoilY)
        ctx.lineTo(6, -14 + recoilY)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        ctx.shadowColor = '#44aaff'
        ctx.shadowBlur = 20
        ctx.fillStyle = '#44aaff'
        ctx.beginPath()
        ctx.ellipse(-6, 16, 3, 6, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(6, 16, 3, 6, 0, 0, Math.PI * 2)
        ctx.fill()

        if (p.recoilTimer > 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.8)'
          ctx.shadowColor = '#88eeff'
          ctx.shadowBlur = 10
          ctx.beginPath()
          ctx.arc(0, -22, 3, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.restore()
      }

      if (g.effects.redFlash > 0) {
        ctx.fillStyle = `rgba(255, 0, 0, ${g.effects.redFlash * 0.3})`
        ctx.fillRect(-20, -20, W + 40, H + 40)
      }
      if (g.effects.whiteFlash > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${g.effects.whiteFlash * 0.5})`
        ctx.fillRect(-20, -20, W + 40, H + 40)
      }

      if (g.gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
        ctx.fillRect(-20, -20, W + 40, H + 40)
        ctx.font = 'bold 48px "Segoe UI", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillStyle = '#ff4444'
        ctx.shadowColor = '#ff4444'
        ctx.shadowBlur = 20
        ctx.fillText('GAME OVER', W / 2, H / 2 - 30)
        ctx.shadowBlur = 0
        ctx.font = '24px "Segoe UI", sans-serif'
        ctx.fillStyle = '#cccccc'
        ctx.fillText(`得分: ${g.score}`, W / 2, H / 2 + 20)
        ctx.font = '16px "Segoe UI", sans-serif'
        ctx.fillStyle = '#888888'
        ctx.fillText('按 R 键重新开始', W / 2, H / 2 + 60)
      }

      ctx.restore()
    }

    let lastFrameTime = 0
    const frameTimes: number[] = []

    const gameLoop = (timestamp: number) => {
      if (!gameRef.current) return
      const g = gameRef.current

      if (g.lastTime === 0) g.lastTime = timestamp
      let dt = (timestamp - g.lastTime) / 1000
      g.lastTime = timestamp
      dt = Math.min(dt, 0.05)

      frameTimes.push(timestamp)
      while (frameTimes.length > 0 && frameTimes[0] < timestamp - 1000) frameTimes.shift()

      if (g.gameOver && g.keys.has('r')) {
        initGame()
      }

      update(g, dt)
      render(g)

      g.animFrameId = requestAnimationFrame(gameLoop)
    }

    g.animFrameId = requestAnimationFrame(gameLoop)

    return () => {
      cancelAnimationFrame(g.animFrameId)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('resize', handleResize)
      if (joystickZone) {
        joystickZone.removeEventListener('touchstart', onJoystickStart)
        joystickZone.removeEventListener('touchmove', onJoystickMove)
        joystickZone.removeEventListener('touchend', onJoystickEnd)
      }
      if (touchFireBtn) {
        touchFireBtn.removeEventListener('touchstart', onFireStart)
        touchFireBtn.removeEventListener('touchend', onFireEnd)
      }
    }
  }, [initGame, activateSkill, emitState])

  return <canvas ref={canvasRef} className="game-canvas" />
})

GameCanvas.displayName = 'GameCanvas'
export default GameCanvas
