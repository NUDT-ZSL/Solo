import { create } from 'zustand'
import { EventEmitter } from './EventBus'
import { SoundEngine } from './SoundEngine'
import MazeEngine from './MazeEngine'
import type { Position, SoundWave, Particle, Fragment, WaveType, Tile } from './types'

type EventBusType = EventEmitter<Record<string, unknown>>

interface LevelConfig {
  width: number
  height: number
  fragmentCount: number
}

const LEVEL_CONFIGS: LevelConfig[] = [
  { width: 8, height: 8, fragmentCount: 3 },
  { width: 10, height: 10, fragmentCount: 4 },
  { width: 12, height: 12, fragmentCount: 5 },
]

const MAX_TIME = 300
const FRAGMENT_BONUS = 60
const WRONG_FREQ_PENALTY = 5
const WRONG_FREQ_THRESHOLD = 3
const MAX_WAVE_BOUNCES = 10
const TRAIL_DURATION = 1500

interface GameStore {
  level: number
  playerPos: Position
  playerDir: { dx: number; dy: number }
  fragments: Fragment[]
  collectedFragments: number
  timeRemaining: number
  totalTime: number
  currentFrequency: number
  currentWaveType: WaveType
  isPaused: boolean
  isWaveActive: boolean
  isGameOver: boolean
  isLevelComplete: boolean
  isGameComplete: boolean
  score: number
  wrongFrequencyCount: number
  activeWaves: SoundWave[]
  particles: Particle[]
  collectedFragmentAngles: number[]
  doorAnimations: Map<string, number>

  mazeEngine: MazeEngine | null
  soundEngine: SoundEngine | null
  eventBus: EventBusType | null

  movePlayer: (dx: number, dy: number) => void
  emitWave: () => void
  stopWave: () => void
  setFrequency: (freq: number) => void
  setWaveType: (type: WaveType) => void
  togglePause: () => void
  startLevel: (level: number) => void
  startGame: () => void
  updateWaves: (dt: number) => void
  updateParticles: (dt: number) => void
  updateDoorAnimations: (dt: number) => void
  tick: (dt: number) => void
  getGrid: () => Tile[][]
  getGridSize: () => { w: number; h: number }
  getDoors: () => { id: string; position: Position; frequency: number; isOpen: boolean; openProgress: number }[]
  attemptUnlockDoor: (doorId: string) => void
  onTuningForkClick: (doorId: string) => void
  getPlayerFragments: () => string[]
}

let waveIdCounter = 0

export const useGameStore = create<GameStore>((set, get) => ({
  level: 1,
  playerPos: { x: 1, y: 1 },
  playerDir: { dx: 1, dy: 0 },
  fragments: [],
  collectedFragments: 0,
  timeRemaining: MAX_TIME,
  totalTime: 0,
  currentFrequency: 440,
  currentWaveType: 'sine',
  isPaused: false,
  isWaveActive: false,
  isGameOver: false,
  isLevelComplete: false,
  isGameComplete: false,
  score: 0,
  wrongFrequencyCount: 0,
  activeWaves: [],
  particles: [],
  collectedFragmentAngles: [],
  doorAnimations: new Map(),
  mazeEngine: null,
  soundEngine: null,
  eventBus: null,

  movePlayer: (dx: number, dy: number) => {
    const state = get()
    if (state.isPaused || state.isGameOver || state.isLevelComplete) return

    const newX = state.playerPos.x + dx
    const newY = state.playerPos.y + dy

    if (!state.mazeEngine) return
    if (state.mazeEngine.checkCollision(newX, newY)) return

    set({
      playerPos: { x: newX, y: newY },
      playerDir: { dx, dy },
    })

    const tile = state.mazeEngine.getTile(newX, newY)
    if (tile.type === 'end') {
      const newState = get()
      const levelScore = Math.floor(newState.timeRemaining) * 10 + newState.collectedFragments * FRAGMENT_BONUS * 10
      set({
        isLevelComplete: true,
        score: newState.score + levelScore,
        totalTime: newState.totalTime + (MAX_TIME - newState.timeRemaining),
      })
    }
  },

  emitWave: () => {
    const state = get()
    if (state.isPaused || state.isGameOver || state.isLevelComplete) return

    const wave: SoundWave = {
      id: `wave-${waveIdCounter++}`,
      position: { ...state.playerPos },
      direction: { ...state.playerDir },
      frequency: state.currentFrequency,
      waveType: state.currentWaveType,
      active: true,
      trail: [{
        x: state.playerPos.x,
        y: state.playerPos.y,
        alpha: 1,
        timestamp: Date.now(),
      }],
      bounces: 0,
    }

    set({ activeWaves: [...state.activeWaves, wave], isWaveActive: true })

    if (state.soundEngine) {
      state.soundEngine.start(state.currentFrequency, state.currentWaveType)
    }
  },

  stopWave: () => {
    const state = get()
    if (state.soundEngine) {
      state.soundEngine.stop()
    }
    set({ isWaveActive: false })
  },

  setFrequency: (freq: number) => {
    set({ currentFrequency: freq })
  },

  setWaveType: (type: WaveType) => {
    set({ currentWaveType: type })
  },

  togglePause: () => {
    set(s => ({ isPaused: !s.isPaused }))
  },

  startLevel: (level: number) => {
    const config = LEVEL_CONFIGS[Math.min(level - 1, LEVEL_CONFIGS.length - 1)]

    const eventBus = get().eventBus || new EventEmitter<Record<string, unknown>>()
    const soundEngine = get().soundEngine || new SoundEngine(eventBus)
    const mazeEngine = new MazeEngine(eventBus)

    mazeEngine.generate(config.width, config.height, level)

    const startPos = mazeEngine.getStartPosition()

    set({
      level,
      playerPos: startPos,
      playerDir: { dx: 1, dy: 0 },
      fragments: mazeEngine.getFragments(),
      collectedFragments: 0,
      timeRemaining: MAX_TIME,
      isPaused: false,
      isWaveActive: false,
      isGameOver: false,
      isLevelComplete: false,
      isGameComplete: false,
      wrongFrequencyCount: 0,
      activeWaves: [],
      particles: [],
      collectedFragmentAngles: [],
      doorAnimations: new Map(),
      mazeEngine,
      soundEngine,
      eventBus,
    })
  },

  startGame: () => {
    const eventBus = new EventEmitter<Record<string, unknown>>()
    const soundEngine = new SoundEngine(eventBus)

    set({
      score: 0,
      totalTime: 0,
      soundEngine,
      eventBus,
    })
    get().startLevel(1)
  },

  updateWaves: (dt: number) => {
    const state = get()
    if (!state.mazeEngine || state.isPaused) return

    const speed = 8
    const newWaves: SoundWave[] = []
    const now = Date.now()

    for (const wave of state.activeWaves) {
      if (!wave.active) {
        const hasRecentTrail = wave.trail.some(t => now - t.timestamp < TRAIL_DURATION)
        if (hasRecentTrail) {
          newWaves.push({
            ...wave,
            trail: wave.trail
              .filter(t => now - t.timestamp < TRAIL_DURATION)
              .map(t => ({ ...t, alpha: Math.max(0, 1 - (now - t.timestamp) / TRAIL_DURATION) })),
          })
        }
        continue
      }

      const newX = wave.position.x + wave.direction.dx * speed * dt
      const newY = wave.position.y + wave.direction.dy * speed * dt

      const gridX = Math.round(newX)
      const gridY = Math.round(newY)

      const tile = state.mazeEngine.getTile(gridX, gridY)

      if (tile.type === 'wall') {
        const wallType = tile.wallType || 'stone'

        if (wallType === 'stone') {
          if (wave.direction.dx !== 0) {
            wave.direction = { dx: -wave.direction.dx, dy: wave.direction.dy }
          } else {
            wave.direction = { dx: wave.direction.dx, dy: -wave.direction.dy }
          }
          wave.bounces++
          wave.trail.push({ x: gridX, y: gridY, alpha: 1, timestamp: now })
        } else if (wallType === 'crystal') {
          const angle = Math.atan2(wave.direction.dy, wave.direction.dx)
          const refracted = angle + (Math.PI / 6) * (Math.random() > 0.5 ? 1 : -1)
          wave.direction = {
            dx: Math.cos(refracted),
            dy: Math.sin(refracted),
          }
          wave.bounces++
          wave.trail.push({ x: gridX, y: gridY, alpha: 0.8, timestamp: now })
        } else if (wallType === 'metal') {
          wave.active = false
          wave.trail.push({ x: gridX, y: gridY, alpha: 0.5, timestamp: now })
          newWaves.push({
            ...wave,
            trail: wave.trail.map(t => ({ ...t })),
          })
          continue
        }

        if (wave.bounces >= MAX_WAVE_BOUNCES) {
          wave.active = false
        }
      } else if (tile.type === 'door' && !tile.isOpen) {
        const freqDiff = Math.abs(wave.frequency - (tile.doorFrequency || 0))
        const tolerance = 30

        if (tile.tuningForkActivated && freqDiff <= tolerance) {
          state.mazeEngine.unlockDoor(tile.doorId || '')
          const anims = new Map(state.doorAnimations)
          anims.set(tile.doorId || '', 0)
          set({ doorAnimations: anims })

          wave.active = false
          wave.trail.push({ x: gridX, y: gridY, alpha: 1, timestamp: now })
          newWaves.push({
            ...wave,
            trail: wave.trail.map(t => ({ ...t })),
          })
          continue
        } else {
          if (wave.direction.dx !== 0) {
            wave.direction = { dx: -wave.direction.dx, dy: wave.direction.dy }
          } else {
            wave.direction = { dx: wave.direction.dx, dy: -wave.direction.dy }
          }
          wave.bounces++
          wave.trail.push({ x: gridX, y: gridY, alpha: 1, timestamp: now })
        }
      } else if (tile.type === 'fragment' && tile.fragmentId) {
        const frag = state.mazeEngine.getFragments().find(f => f.id === tile.fragmentId)
        if (frag && !frag.collected) {
          const freqDiff = Math.abs(wave.frequency - frag.frequency)
          const tolerance = 30

          if (freqDiff <= tolerance) {
            const freq = state.mazeEngine.collectFragment(tile.fragmentId)
            const angles = [...get().collectedFragmentAngles, 0]
            set(s => ({
              collectedFragments: s.collectedFragments + 1,
              timeRemaining: s.timeRemaining + FRAGMENT_BONUS,
              collectedFragmentAngles: angles,
              particles: [
                ...s.particles,
                ...Array.from({ length: 20 }, (_, i) => ({
                  x: gridX,
                  y: gridY,
                  vx: Math.cos((i / 20) * Math.PI * 2) * 2.5,
                  vy: Math.sin((i / 20) * Math.PI * 2) * 2.5,
                  life: 1,
                  maxLife: 1,
                  color: '#FFD54F',
                  size: 3,
                })),
              ],
            }))
            if (get().soundEngine) {
              get().soundEngine!.start(freq, 'sine')
              setTimeout(() => {
                if (get().soundEngine) get().soundEngine!.stop()
              }, 1000)
            }

            wave.active = false
            wave.trail.push({ x: gridX, y: gridY, alpha: 1, timestamp: now })
            newWaves.push({
              ...wave,
              trail: wave.trail.map(t => ({ ...t })),
            })
            continue
          }
        }
      }

      wave.position = { x: newX, y: newY }
      wave.trail.push({ x: newX, y: newY, alpha: 1, timestamp: now })

      if (wave.trail.length > 200) {
        wave.trail = wave.trail.slice(-200)
      }

      newWaves.push({
        ...wave,
        trail: wave.trail
          .filter(t => now - t.timestamp < TRAIL_DURATION)
          .map(t => ({ ...t, alpha: Math.max(0, t.alpha - (now - t.timestamp) / TRAIL_DURATION) })),
      })
    }

    set({ activeWaves: newWaves })
  },

  updateParticles: (dt: number) => {
    set(s => ({
      particles: s.particles
        .map(p => ({
          ...p,
          x: p.x + p.vx * dt,
          y: p.y + p.vy * dt,
          life: p.life - dt * 1.5,
          vx: p.vx * 0.98,
          vy: p.vy * 0.98,
        }))
        .filter(p => p.life > 0),
    }))
  },

  updateDoorAnimations: (dt: number) => {
    const anims = new Map(get().doorAnimations)
    let changed = false
    anims.forEach((progress, key) => {
      const newProgress = Math.min(1, progress + dt * 2)
      anims.set(key, newProgress)
      changed = true
    })
    if (changed) set({ doorAnimations: anims })
  },

  tick: (dt: number) => {
    const state = get()
    if (state.isPaused || state.isGameOver) return

    if (!state.isLevelComplete) {
      const newTime = state.timeRemaining - dt
      if (newTime <= 0) {
        set({ timeRemaining: 0, isGameOver: true })
        return
      }
      set({ timeRemaining: newTime })
    }

    const angles = state.collectedFragmentAngles.map((a, i) =>
      a + dt * (1.5 + i * 0.3)
    )
    set({ collectedFragmentAngles: angles })

    state.updateWaves(dt)
    state.updateParticles(dt)
    state.updateDoorAnimations(dt)
  },

  getGrid: () => {
    return get().mazeEngine?.getGrid() || []
  },

  getGridSize: () => {
    return get().mazeEngine?.getGridSize() || { w: 0, h: 0 }
  },

  getDoors: () => {
    return get().mazeEngine?.getDoors() || []
  },

  attemptUnlockDoor: (doorId: string) => {
    const state = get()
    if (!state.mazeEngine) return

    const doors = state.mazeEngine.getDoors()
    const door = doors.find(d => d.id === doorId)
    if (!door || door.isOpen) return

    const freqDiff = Math.abs(state.currentFrequency - door.frequency)
    const tolerance = 30

    if (freqDiff <= tolerance) {
      state.mazeEngine.unlockDoor(doorId)
      const anims = new Map(state.doorAnimations)
      anims.set(doorId, 0)
      set({
        doorAnimations: anims,
        wrongFrequencyCount: 0,
        particles: [
          ...state.particles,
          ...Array.from({ length: 30 }, (_, i) => ({
            x: door.position.x,
            y: door.position.y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            life: 1,
            maxLife: 1,
            color: '#3F51B5',
            size: 2 + Math.random() * 3,
          })),
        ],
      })
    } else {
      const newCount = state.wrongFrequencyCount + 1
      set({
        wrongFrequencyCount: newCount,
        timeRemaining: newCount > WRONG_FREQ_THRESHOLD
          ? state.timeRemaining - WRONG_FREQ_PENALTY
          : state.timeRemaining,
        particles: [
          ...state.particles,
          ...Array.from({ length: 5 }, (_, i) => ({
            x: door.position.x,
            y: door.position.y,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            life: 0.6,
            maxLife: 0.6,
            color: '#FF5722',
            size: 2,
          })),
        ],
      })
    }
  },

  onTuningForkClick: (doorId: string) => {
    const state = get()
    if (!state.mazeEngine) return

    const grid = state.mazeEngine.getGrid()
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const tile = grid[y][x]
        if (tile.doorId === doorId) {
          tile.tuningForkActivated = true
          set({
            particles: [
              ...state.particles,
              ...Array.from({ length: 8 }, (_, i) => ({
                x,
                y,
                vx: Math.cos((i / 8) * Math.PI * 2) * 1.5,
                vy: Math.sin((i / 8) * Math.PI * 2) * 1.5,
                life: 0.5,
                maxLife: 0.5,
                color: '#9C27B0',
                size: 1.5,
              })),
            ],
          })
          return
        }
      }
    }
  },

  getPlayerFragments: () => {
    const state = get()
    if (!state.mazeEngine) return []
    return state.mazeEngine.getFragments()
      .filter(f => f.collected)
      .map(f => f.id)
  },
}))
