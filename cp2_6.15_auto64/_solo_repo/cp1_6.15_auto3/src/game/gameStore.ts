import { create } from 'zustand'
import type { PuzzlePiece, Player, OperationLog } from './pieceUtils'
import { generatePuzzlePieces, calculateProgress } from './pieceUtils'

type GamePhase = 'lobby' | 'countdown' | 'playing' | 'completed' | 'replay'

interface GameState {
  roomId: string
  gamePhase: GamePhase
  countdown: number
  puzzleSize: number
  pieces: PuzzlePiece[]
  players: Player[]
  currentPlayer: Player | null
  operationLogs: OperationLog[]
  progress: number
  isReplaying: boolean
  replayIndex: number
  draggedPieceId: number | null
  shakePieceId: number | null
  showCompletionAnimation: boolean
  particles: { x: number; y: number; vx: number; vy: number; color: string; life: number }[]

  setRoomId: (roomId: string) => void
  setGamePhase: (phase: GamePhase) => void
  setCountdown: (count: number) => void
  setPuzzleSize: (size: number) => void
  initGame: (size: number) => void
  setCurrentPlayer: (player: Player) => void
  addPlayer: (player: Player) => void
  removePlayer: (playerId: string) => void
  updatePlayerCursor: (playerId: string, x: number, y: number) => void
  movePiece: (pieceId: number, toRow: number, toCol: number, playerId: string) => boolean
  movePieceRemote: (pieceId: number, toRow: number, toCol: number, playerId: string, success: boolean) => void
  setDraggedPiece: (pieceId: number | null) => void
  setShakePiece: (pieceId: number | null) => void
  addOperationLog: (log: OperationLog) => void
  triggerCompletion: () => void
  startReplay: () => void
  stopReplay: () => void
  replayStep: () => void
  updateProgress: () => void
  addParticle: (particle: { x: number; y: number; vx: number; vy: number; color: string; life: number }) => void
  updateParticles: () => void
  resetGame: () => void
}

export const useGameStore = create<GameState>((set, get) => ({
  roomId: '',
  gamePhase: 'lobby',
  countdown: 30,
  puzzleSize: 4,
  pieces: [],
  players: [],
  currentPlayer: null,
  operationLogs: [],
  progress: 0,
  isReplaying: false,
  replayIndex: 0,
  draggedPieceId: null,
  shakePieceId: null,
  showCompletionAnimation: false,
  particles: [],

  setRoomId: (roomId) => set({ roomId }),
  setGamePhase: (gamePhase) => set({ gamePhase }),
  setCountdown: (countdown) => set({ countdown }),
  setPuzzleSize: (puzzleSize) => set({ puzzleSize }),

  initGame: (size) => {
    const pieces = generatePuzzlePieces(size)
    set({
      puzzleSize: size,
      pieces,
      operationLogs: [],
      progress: 0,
      isReplaying: false,
      replayIndex: 0,
      showCompletionAnimation: false,
      particles: []
    })
  },

  setCurrentPlayer: (player) => set({ currentPlayer: player }),

  addPlayer: (player) =>
    set((state) => ({
      players: [...state.players.filter((p) => p.id !== player.id), player]
    })),

  removePlayer: (playerId) =>
    set((state) => ({
      players: state.players.filter((p) => p.id !== playerId)
    })),

  updatePlayerCursor: (playerId, x, y) =>
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, cursorX: x, cursorY: y } : p
      )
    })),

  movePiece: (pieceId, toRow, toCol, _playerId) => {
    const state = get()
    const piece = state.pieces.find((p) => p.id === pieceId)
    if (!piece || piece.isPlaced) return false

    const occupyingPiece = state.pieces.find(
      (p) => p.id !== pieceId && p.row === toRow && p.col === toCol && !p.isPlaced
    )

    if (occupyingPiece) {
      return false
    }

    const isCorrect = piece.correctRow === toRow && piece.correctCol === toCol

    set((state) => ({
      pieces: state.pieces.map((p) =>
        p.id === pieceId
          ? { ...p, row: toRow, col: toCol, isPlaced: isCorrect }
          : p
      )
    }))

    get().updateProgress()

    const isComplete = get().pieces.every((p) => p.isPlaced)
    if (isComplete) {
      get().triggerCompletion()
    }

    return isCorrect
  },

  movePieceRemote: (pieceId, toRow, toCol, _playerId, success) => {
    set((state) => ({
      pieces: state.pieces.map((p) =>
        p.id === pieceId
          ? { ...p, row: toRow, col: toCol, isPlaced: success }
          : p
      )
    }))
    get().updateProgress()
  },

  setDraggedPiece: (draggedPieceId) => set({ draggedPieceId }),
  setShakePiece: (shakePieceId) => set({ shakePieceId }),

  addOperationLog: (log) =>
    set((state) => ({
      operationLogs: [...state.operationLogs, log]
    })),

  triggerCompletion: () => {
    set({ showCompletionAnimation: true, gamePhase: 'completed' })
    const state = get()
    const centerX = (state.puzzleSize * 100) / 2
    const centerY = (state.puzzleSize * 100) / 2
    const colors = ['#c084fc', '#06b6d4', '#f472b6', '#a78bfa', '#22d3ee']

    for (let i = 0; i < 100; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = 300 + Math.random() * 200
      const speed = 3 + Math.random() * 5
      get().addParticle({
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        vx: -Math.cos(angle) * speed,
        vy: -Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1
      })
    }
  },

  startReplay: () => {
    const state = get()
    const pieces = generatePuzzlePieces(state.puzzleSize)
    set({
      isReplaying: true,
      replayIndex: 0,
      pieces,
      progress: 0,
      gamePhase: 'replay'
    })
  },

  stopReplay: () => {
    set({ isReplaying: false, gamePhase: 'completed' })
  },

  replayStep: () => {
    const state = get()
    if (state.replayIndex >= state.operationLogs.length) {
      set({ isReplaying: false, gamePhase: 'completed' })
      return
    }

    const log = state.operationLogs[state.replayIndex]
    set((state) => ({
      pieces: state.pieces.map((p) =>
        p.id === log.pieceId
          ? { ...p, row: log.toRow, col: log.toCol, isPlaced: log.success }
          : p
      ),
      replayIndex: state.replayIndex + 1
    }))
    get().updateProgress()
  },

  updateProgress: () => {
    const state = get()
    set({ progress: calculateProgress(state.pieces) })
  },

  addParticle: (particle) =>
    set((state) => ({
      particles: [...state.particles, particle]
    })),

  updateParticles: () =>
    set((state) => ({
      particles: state.particles
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          life: p.life - 0.02
        }))
        .filter((p) => p.life > 0)
    })),

  resetGame: () =>
    set({
      gamePhase: 'lobby',
      countdown: 30,
      pieces: [],
      operationLogs: [],
      progress: 0,
      isReplaying: false,
      replayIndex: 0,
      showCompletionAnimation: false,
      particles: []
    })
}))
