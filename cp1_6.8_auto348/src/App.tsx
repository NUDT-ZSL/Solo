import React, { useState, useEffect, useCallback, useRef } from 'react'
import GameCanvas from './GameCanvas'
import ControlPanel from './ControlPanel'
import {
  type Vec2,
  type Asteroid,
  type StarGate,
  type GravityLine,
  type GravityInterferenceZone,
  type BlackHole,
  type SpeedStar,
  type StarFragment,
  type Nebula,
  type LevelScore,
  vec2,
  vecDist,
  vecNorm,
  vecSub,
  updateAsteroid,
  updateEnergy,
  checkStarGateCollision,
  checkHiddenGateOrbit,
  checkFragmentCollection,
  calculateGravityLineEnergyCost,
  calculateLevelScore,
  createLevelState,
  LEVEL_CONFIGS,
  ENERGY_MAX,
  SPEED_BOOST_MULTIPLIER,
  SPEED_BOOST_DURATION,
  ASTEROID_BASE_SPEED,
} from './utils/physics'

type GamePhase = 'playing' | 'complete' | 'score'

interface GameState {
  asteroids: Asteroid[]
  starGates: StarGate[]
  fragments: StarFragment[]
  gravityLines: GravityLine[]
  interferenceZones: GravityInterferenceZone[]
  blackHoles: BlackHole[]
  speedStars: SpeedStar[]
  nebulae: Nebula[]
  energy: number
  energyUsed: number
  elapsedTime: number
  phase: GamePhase
  score: LevelScore | null
}

function createInitialGameState(levelId: number): GameState {
  const config = LEVEL_CONFIGS.find(l => l.id === levelId) || LEVEL_CONFIGS[0]
  const { asteroids, starGates, fragments } = createLevelState(config)

  return {
    asteroids,
    starGates,
    fragments,
    gravityLines: [],
    interferenceZones: config.interferenceZones.map(z => ({
      ...z,
      pos: { ...z.pos },
    })),
    blackHoles: config.blackHoles.map(bh => ({
      ...bh,
      pos: { ...bh.pos },
      pullStrength: 5000,
      consumeRadius: bh.radius * 0.8,
      pulsePhase: Math.random() * Math.PI * 2,
    })),
    speedStars: config.speedStars.map(s => ({
      ...s,
      pos: { ...s.pos },
      speedMultiplier: SPEED_BOOST_MULTIPLIER,
      duration: SPEED_BOOST_DURATION,
      consumed: false,
      pulsePhase: Math.random() * Math.PI * 2,
    })),
    nebulae: config.nebulae.map(n => ({
      ...n,
      pos: { ...n.pos },
      size: { ...n.size },
      rotation: Math.random() * Math.PI * 2,
    })),
    energy: ENERGY_MAX,
    energyUsed: 0,
    elapsedTime: 0,
    phase: 'playing',
    score: null,
  }
}

const App: React.FC = () => {
  const [currentLevel, setCurrentLevel] = useState(1)
  const [unlockedLevels, setUnlockedLevels] = useState<number[]>([1])
  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState(1))
  const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight })
  const gameLoopRef = useRef<number>(0)
  const lastFrameRef = useRef<number>(0)
  const stateRef = useRef<GameState>(gameState)
  const totalFragmentsCollectedRef = useRef(0)

  useEffect(() => {
    stateRef.current = gameState
  }, [gameState])

  useEffect(() => {
    const handleResize = () => {
      setCanvasSize({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const resetLevel = useCallback(() => {
    const newState = createInitialGameState(currentLevel)
    setGameState(newState)
    totalFragmentsCollectedRef.current = 0
  }, [currentLevel])

  const selectLevel = useCallback((levelId: number) => {
    setCurrentLevel(levelId)
    const newState = createInitialGameState(levelId)
    setGameState(newState)
    totalFragmentsCollectedRef.current = 0
  }, [])

  const handleGravityLineComplete = useCallback((points: Vec2[]) => {
    const cost = calculateGravityLineEnergyCost(points)
    setGameState(prev => {
      if (cost > prev.energy) return prev
      return {
        ...prev,
        gravityLines: [
          ...prev.gravityLines,
          {
            points: points.map(p => ({ ...p })),
            energyCost: cost,
            fadeTimer: 4,
            active: true,
          },
        ],
        energy: prev.energy - cost,
        energyUsed: prev.energyUsed + cost,
      }
    })
  }, [])

  const handleGravityLineDrawing = useCallback((_points: Vec2[], _valid: boolean) => {
  }, [])

  const handleContinue = useCallback(() => {
    const nextLevel = currentLevel + 1
    if (nextLevel <= LEVEL_CONFIGS.length) {
      if (!unlockedLevels.includes(nextLevel)) {
        setUnlockedLevels(prev => [...prev, nextLevel])
      }
      setCurrentLevel(nextLevel)
      const newState = createInitialGameState(nextLevel)
      setGameState(newState)
      totalFragmentsCollectedRef.current = 0
    } else {
      resetLevel()
    }
  }, [currentLevel, unlockedLevels, resetLevel])

  useEffect(() => {
    let asteroidRespawnTimer = 0
    const ASTEROID_RESPAWN_DELAY = 3

    const gameLoop = (timestamp: number) => {
      if (lastFrameRef.current === 0) {
        lastFrameRef.current = timestamp
      }
      const rawDt = (timestamp - lastFrameRef.current) / 1000
      const dt = Math.min(rawDt, 1 / 30)
      lastFrameRef.current = timestamp

      setGameState(prev => {
        if (prev.phase !== 'playing') return prev

        const newElapsedTime = prev.elapsedTime + dt
        const newEnergy = updateEnergy(prev.energy, dt)

        let newAsteroids = prev.asteroids.map(a =>
          updateAsteroid(a, prev.gravityLines, prev.interferenceZones, prev.blackHoles, prev.speedStars, dt)
        )

        let newStarGates = prev.starGates.map(g => ({ ...g, glowPhase: g.glowPhase + dt }))
        let newFragments = prev.fragments.map(f => ({ ...f, pulsePhase: f.pulsePhase + dt }))
        let newSpeedStars = prev.speedStars.map(s => ({ ...s, pulsePhase: s.pulsePhase + dt }))
        let newBlackHoles = prev.blackHoles.map(bh => ({ ...bh, pulsePhase: bh.pulsePhase + dt }))
        let newGravityLines = prev.gravityLines
          .map(l => {
            if (l.active) {
              return { ...l, fadeTimer: l.fadeTimer }
            }
            return { ...l, fadeTimer: l.fadeTimer - dt }
          })
          .filter(l => l.active || l.fadeTimer > 0)

        for (let i = 0; i < newAsteroids.length; i++) {
          const ast = newAsteroids[i]
          if (!ast.active) continue

          for (let j = 0; j < newStarGates.length; j++) {
            const gate = newStarGates[j]
            if (gate.unlocked) continue

            if (checkStarGateCollision(ast, gate)) {
              newAsteroids[i] = { ...ast, active: false }
              newStarGates[j] = {
                ...gate,
                currentHits: gate.currentHits + 1,
                unlocked: gate.currentHits + 1 >= gate.requiredHits,
              }
            }
          }

          if (gate_check_hidden(newAsteroids, newStarGates)) {
            for (let j = 0; j < newStarGates.length; j++) {
              if (newStarGates[j].type === 'hidden' && !newStarGates[j].unlocked) {
                newStarGates[j] = { ...newStarGates[j], unlocked: true }
              }
            }
          }

          for (let j = 0; j < newFragments.length; j++) {
            const frag = newFragments[j]
            if (checkFragmentCollection(ast, frag)) {
              newFragments[j] = { ...frag, collected: true }
              totalFragmentsCollectedRef.current++
            }
          }

          for (let j = 0; j < newSpeedStars.length; j++) {
            const star = newSpeedStars[j]
            if (star.consumed) continue
            if (vecDist(ast.pos, star.pos) < star.radius + ast.radius) {
              newAsteroids[i] = {
                ...ast,
                speedBoostTimer: SPEED_BOOST_DURATION,
              }
              newSpeedStars[j] = { ...star, consumed: true }
            }
          }
        }

        asteroidRespawnTimer += dt
        if (asteroidRespawnTimer >= ASTEROID_RESPAWN_DELAY) {
          asteroidRespawnTimer = 0
          const activeCount = newAsteroids.filter(a => a.active).length
          if (activeCount < 3) {
            const config = LEVEL_CONFIGS.find(l => l.id === currentLevel) || LEVEL_CONFIGS[0]
            const template = config.asteroids[Math.floor(Math.random() * config.asteroids.length)]
            const newAst: Asteroid = {
              id: `ast_r_${Date.now()}_${Math.random()}`,
              pos: { ...template.pos },
              vel: { ...template.vel },
              radius: template.radius,
              rotation: Math.random() * Math.PI * 2,
              rotSpeed: (Math.random() - 0.5) * 2,
              textureSeed: Math.random() * 1000,
              active: true,
              speedBoostTimer: 0,
              trail: [],
            }
            newAsteroids = [...newAsteroids, newAst]
          }
        }

        newAsteroids = newAsteroids.map(a => {
          if (!a.active) return a
          const margin = 100
          if (
            a.pos.x < -margin ||
            a.pos.x > canvasSize.width + margin ||
            a.pos.y < -margin ||
            a.pos.y > canvasSize.height + margin
          ) {
            return { ...a, active: false }
          }
          return a
        })

        const allGatesUnlocked = newStarGates.every(g => g.unlocked)
        if (allGatesUnlocked) {
          const score = calculateLevelScore(
            newElapsedTime,
            prev.energyUsed,
            newFragments.filter(f => f.collected).length,
            newFragments.length
          )
          return {
            ...prev,
            asteroids: newAsteroids,
            starGates: newStarGates,
            fragments: newFragments,
            gravityLines: newGravityLines,
            speedStars: newSpeedStars,
            blackHoles: newBlackHoles,
            energy: newEnergy,
            elapsedTime: newElapsedTime,
            phase: 'complete',
            score,
          }
        }

        return {
          ...prev,
          asteroids: newAsteroids,
          starGates: newStarGates,
          fragments: newFragments,
          gravityLines: newGravityLines,
          speedStars: newSpeedStars,
          blackHoles: newBlackHoles,
          energy: newEnergy,
          elapsedTime: newElapsedTime,
        }
      })

      gameLoopRef.current = requestAnimationFrame(gameLoop)
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop)
    return () => cancelAnimationFrame(gameLoopRef.current)
  }, [currentLevel, canvasSize])

  useEffect(() => {
    if (gameState.phase === 'complete' && gameState.score) {
      const timer = setTimeout(() => {
        setGameState(prev => ({ ...prev, phase: 'score' }))
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [gameState.phase])

  const levelConfig = LEVEL_CONFIGS.find(l => l.id === currentLevel)
  const collectedCount = gameState.fragments.filter(f => f.collected).length

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#050212' }}>
      <GameCanvas
        width={canvasSize.width}
        height={canvasSize.height}
        asteroids={gameState.asteroids}
        starGates={gameState.starGates}
        gravityLines={gameState.gravityLines}
        interferenceZones={gameState.interferenceZones}
        blackHoles={gameState.blackHoles}
        speedStars={gameState.speedStars}
        fragments={gameState.fragments}
        nebulae={gameState.nebulae}
        energy={gameState.energy}
        onGravityLineComplete={handleGravityLineComplete}
        onGravityLineDrawing={handleGravityLineDrawing}
        isLevelComplete={gameState.phase === 'complete'}
        showScore={gameState.phase === 'score'}
      />

      <div style={{
        position: 'absolute',
        top: 20,
        left: 24,
        color: '#a0c8f0',
        fontFamily: '"Courier New", monospace',
        pointerEvents: 'none',
        userSelect: 'none',
      }}>
        <div style={{ fontSize: 18, fontWeight: 'bold', color: '#c8e0ff', marginBottom: 4 }}>
          {levelConfig?.name || '未知星域'}
        </div>
        <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#ffd864' }}>★</span>
          <span>{collectedCount} / {gameState.fragments.length}</span>
        </div>
        <div style={{ fontSize: 11, marginTop: 6, opacity: 0.5 }}>
          {gameState.phase === 'playing' ? `时间 ${gameState.elapsedTime.toFixed(1)}s` : ''}
        </div>
      </div>

      <ControlPanel
        energy={gameState.energy}
        maxEnergy={ENERGY_MAX}
        currentLevel={currentLevel}
        unlockedLevels={unlockedLevels}
        fragmentsCollected={collectedCount}
        totalFragments={gameState.fragments.length}
        onReset={resetLevel}
        onSelectLevel={selectLevel}
        score={gameState.score}
        showScore={gameState.phase === 'score'}
        onContinue={handleContinue}
      />

      <div style={{
        position: 'absolute',
        top: 20,
        right: 24,
        color: '#506080',
        fontFamily: '"Courier New", monospace',
        fontSize: 11,
        textAlign: 'right',
        pointerEvents: 'none',
        userSelect: 'none',
      }}>
        <div>星轨编织者</div>
        <div style={{ marginTop: 2, fontSize: 10 }}>拖拽绘制引力线 · 引导小行星撞击星门</div>
      </div>
    </div>
  )
}

function gate_check_hidden(asteroids: Asteroid[], starGates: StarGate[]): boolean {
  for (const gate of starGates) {
    if (gate.type === 'hidden' && !gate.unlocked) {
      if (checkHiddenGateOrbit(gate, asteroids)) {
        return true
      }
    }
  }
  return false
}

export default App
