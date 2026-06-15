import { useRef, useCallback } from 'react'

export type EnemyType = 'eel' | 'shark'

export interface Enemy {
  id: number
  type: EnemyType
  x: number
  y: number
  angle: number
  speed: number
  baseSpeed: number
  chaseSpeed: number
  visionRange: number
  visionAngle: number
  state: 'patrol' | 'chase' | 'stunned'
  patrolPoints: { x: number; y: number }[]
  currentPatrolIndex: number
  stunTimer: number
  bodyLength: number
  glowPhase: number
  alertTimer: number
}

interface EnemyAIConfig {
  eelCount: number
  sharkCount: number
}

const AREA_CONFIGS: EnemyAIConfig[] = [
  { eelCount: 2, sharkCount: 1 },
  { eelCount: 3, sharkCount: 2 },
  { eelCount: 2, sharkCount: 3 },
]

export function useEnemyAI() {
  const enemiesRef = useRef<Enemy[]>([])
  const nextIdRef = useRef(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const humOscRef = useRef<OscillatorNode | null>(null)
  const humGainRef = useRef<GainNode | null>(null)
  const chasingRef = useRef(false)

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
    }
  }, [])

  const startHum = useCallback(() => {
    if (!audioCtxRef.current || humOscRef.current) return
    const ctx = audioCtxRef.current
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(60, ctx.currentTime)
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.3)
    osc.start()
    humOscRef.current = osc
    humGainRef.current = gain
  }, [])

  const stopHum = useCallback(() => {
    if (humOscRef.current && humGainRef.current && audioCtxRef.current) {
      const ctx = audioCtxRef.current
      humGainRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3)
      const osc = humOscRef.current
      setTimeout(() => {
        try { osc.stop() } catch {}
      }, 400)
      humOscRef.current = null
      humGainRef.current = null
    }
  }, [])

  const generateEnemies = useCallback((areaIndex: number, canvasW: number, canvasH: number) => {
    const config = AREA_CONFIGS[areaIndex] || AREA_CONFIGS[0]
    const enemies: Enemy[] = []
    const margin = 80

    const createEnemy = (type: EnemyType): Enemy => {
      const points: { x: number; y: number }[] = []
      const pointCount = 3 + Math.floor(Math.random() * 3)
      for (let i = 0; i < pointCount; i++) {
        points.push({
          x: margin + Math.random() * (canvasW - margin * 2),
          y: margin + Math.random() * (canvasH - margin * 2),
        })
      }
      const startX = points[0].x
      const startY = points[0].y

      const isEel = type === 'eel'
      return {
        id: nextIdRef.current++,
        type,
        x: startX,
        y: startY,
        angle: Math.random() * Math.PI * 2,
        speed: 0,
        baseSpeed: isEel ? 1.2 : 0.8,
        chaseSpeed: isEel ? 2.5 : 2.0,
        visionRange: isEel ? 140 : 180,
        visionAngle: isEel ? Math.PI * 0.6 : Math.PI * 0.5,
        state: 'patrol',
        patrolPoints: points,
        currentPatrolIndex: 0,
        stunTimer: 0,
        bodyLength: isEel ? 40 : 50,
        glowPhase: Math.random() * Math.PI * 2,
        alertTimer: 0,
      }
    }

    for (let i = 0; i < config.eelCount; i++) {
      enemies.push(createEnemy('eel'))
    }
    for (let i = 0; i < config.sharkCount; i++) {
      enemies.push(createEnemy('shark'))
    }

    enemiesRef.current = enemies
    chasingRef.current = false
  }, [])

  const stunNearby = useCallback((px: number, py: number, radius: number) => {
    for (const enemy of enemiesRef.current) {
      const dist = Math.hypot(enemy.x - px, enemy.y - py)
      if (dist < radius) {
        enemy.state = 'stunned'
        enemy.stunTimer = 2.0
      }
    }
  }, [])

  const isPlayerChased = useCallback(() => {
    return enemiesRef.current.some(e => e.state === 'chase')
  }, [])

  const update = useCallback(
    (dt: number, playerX: number, playerY: number, canvasW: number, canvasH: number) => {
      let anyChasing = false

      for (const enemy of enemiesRef.current) {
        enemy.glowPhase += dt * 3

        if (enemy.state === 'stunned') {
          enemy.stunTimer -= dt
          enemy.speed = 0
          if (enemy.stunTimer <= 0) {
            enemy.state = 'patrol'
            enemy.stunTimer = 0
          }
          continue
        }

        const dx = playerX - enemy.x
        const dy = playerY - enemy.y
        const distToPlayer = Math.hypot(dx, dy)
        const angleToPlayer = Math.atan2(dy, dx)

        let angleDiff = angleToPlayer - enemy.angle
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2
        const absAngleDiff = Math.abs(angleDiff)

        const canSee =
          distToPlayer < enemy.visionRange &&
          absAngleDiff < enemy.visionAngle / 2

        if (canSee && enemy.state === 'patrol') {
          enemy.state = 'chase'
          enemy.alertTimer = 0.5
        }

        if (enemy.state === 'chase') {
          anyChasing = true
          enemy.alertTimer -= dt

          const targetAngle = Math.atan2(dy, dx)
          let turnDiff = targetAngle - enemy.angle
          while (turnDiff > Math.PI) turnDiff -= Math.PI * 2
          while (turnDiff < -Math.PI) turnDiff += Math.PI * 2
          enemy.angle += turnDiff * dt * 4

          enemy.speed = enemy.chaseSpeed
          enemy.x += Math.cos(enemy.angle) * enemy.speed
          enemy.y += Math.sin(enemy.angle) * enemy.speed

          if (distToPlayer > enemy.visionRange * 1.5) {
            enemy.alertTimer -= dt
            if (enemy.alertTimer <= 0) {
              enemy.state = 'patrol'
            }
          }
        } else if (enemy.state === 'patrol') {
          const target = enemy.patrolPoints[enemy.currentPatrolIndex]
          const tdx = target.x - enemy.x
          const tdy = target.y - enemy.y
          const tdist = Math.hypot(tdx, tdy)

          if (tdist < 10) {
            enemy.currentPatrolIndex = (enemy.currentPatrolIndex + 1) % enemy.patrolPoints.length
          } else {
            const targetAngle = Math.atan2(tdy, tdx)
            let turnDiff = targetAngle - enemy.angle
            while (turnDiff > Math.PI) turnDiff -= Math.PI * 2
            while (turnDiff < -Math.PI) turnDiff += Math.PI * 2
            enemy.angle += turnDiff * dt * 2

            enemy.speed = enemy.baseSpeed
            enemy.x += Math.cos(enemy.angle) * enemy.speed
            enemy.y += Math.sin(enemy.angle) * enemy.speed
          }
        }

        const margin = 20
        if (enemy.x < margin) { enemy.x = margin; enemy.angle = Math.PI - enemy.angle }
        if (enemy.x > canvasW - margin) { enemy.x = canvasW - margin; enemy.angle = Math.PI - enemy.angle }
        if (enemy.y < margin) { enemy.y = margin; enemy.angle = -enemy.angle }
        if (enemy.y > canvasH - margin) { enemy.y = canvasH - margin; enemy.angle = -enemy.angle }
      }

      if (anyChasing && !chasingRef.current) {
        chasingRef.current = true
        startHum()
      } else if (!anyChasing && chasingRef.current) {
        chasingRef.current = false
        stopHum()
      }
    },
    [startHum, stopHum],
  )

  return {
    enemiesRef,
    generateEnemies,
    update,
    stunNearby,
    isPlayerChased,
    initAudio,
  }
}
