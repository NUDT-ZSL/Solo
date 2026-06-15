import React, { createContext, useContext, useReducer, ReactNode, useCallback } from 'react'
import type { Player, PuzzlePieceState } from './socketService'
import type { PuzzlePieceData } from './puzzleUtils'

export interface GameStoreState {
  roomId: string
  gamePhase: 'waiting' | 'countdown' | 'playing' | 'finished'
  roundTimer: number
  countdownValue: number
  players: Player[]
  pieces: PuzzlePieceState[]
  puzzlePiecesData: PuzzlePieceData[]
  puzzleTheme: string
  puzzleCols: number
  puzzleRows: number
  boardWidth: number
  boardHeight: number
  progress: number
  chatMessages: any[]
  currentPlayerId: string | null
  currentPlayerColor: string
}

type Action =
  | { type: 'SET_ROOM_STATE'; payload: Partial<GameStoreState> }
  | { type: 'SET_PIECES'; payload: PuzzlePieceState[] }
  | { type: 'UPDATE_PIECE'; payload: { id: string; x: number; y: number; rotation?: number; playerId?: string } }
  | { type: 'PLACE_PIECE'; payload: { id: string; x: number; y: number; playerId: string; score: number } }
  | { type: 'REJECT_PIECE'; payload: { id: string; originalX: number; originalY: number } }
  | { type: 'ADD_PLAYER'; payload: Player }
  | { type: 'REMOVE_PLAYER'; payload: string }
  | { type: 'UPDATE_PLAYER_SCORE'; payload: { playerId: string; score: number } }
  | { type: 'ADD_CHAT_MESSAGE'; payload: any }
  | { type: 'SET_CHAT_HISTORY'; payload: any[] }
  | { type: 'SET_COUNTDOWN'; payload: number }
  | { type: 'SET_GAME_PHASE'; payload: GameStoreState['gamePhase'] }
  | { type: 'SET_PUZZLE_DATA'; payload: PuzzlePieceData[] }
  | { type: 'SET_CURRENT_PLAYER'; payload: { id: string; color: string } }

const initialState: GameStoreState = {
  roomId: '',
  gamePhase: 'waiting',
  roundTimer: 180,
  countdownValue: 3,
  players: [],
  pieces: [],
  puzzlePiecesData: [],
  puzzleTheme: '',
  puzzleCols: 0,
  puzzleRows: 0,
  boardWidth: 800,
  boardHeight: 600,
  progress: 0,
  chatMessages: [],
  currentPlayerId: null,
  currentPlayerColor: '#6366f1',
}

function gameReducer(state: GameStoreState, action: Action): GameStoreState {
  switch (action.type) {
    case 'SET_ROOM_STATE':
      return { ...state, ...action.payload }

    case 'SET_PIECES':
      return { ...state, pieces: action.payload }

    case 'UPDATE_PIECE': {
      const { id, x, y, rotation, playerId } = action.payload
      const pieces = state.pieces.map((p) =>
        p.id === id
          ? { ...p, currentX: x, currentY: y, ...(rotation !== undefined && { rotation }), ...(playerId && { ownerId: playerId }) }
          : p
      )
      return { ...state, pieces }
    }

    case 'PLACE_PIECE': {
      const { id, x, y, playerId, score } = action.payload
      const pieces = state.pieces.map((p) =>
        p.id === id ? { ...p, placed: true, currentX: x, currentY: y, ownerId: playerId } : p
      )
      const players = state.players.map((p) =>
        p.id === playerId ? { ...p, score } : p
      )
      const progress = pieces.filter((p) => p.placed).length / pieces.length
      return { ...state, pieces, players, progress }
    }

    case 'REJECT_PIECE': {
      const { id, originalX, originalY } = action.payload
      const pieces = state.pieces.map((p) =>
        p.id === id ? { ...p, currentX: originalX, currentY: originalY } : p
      )
      return { ...state, pieces }
    }

    case 'ADD_PLAYER':
      return {
        ...state,
        players: [...state.players, action.payload],
      }

    case 'REMOVE_PLAYER':
      return {
        ...state,
        players: state.players.filter((p) => p.id !== action.payload),
      }

    case 'UPDATE_PLAYER_SCORE': {
      const { playerId, score } = action.payload
      const players = state.players.map((p) =>
        p.id === playerId ? { ...p, score } : p
      )
      return { ...state, players }
    }

    case 'ADD_CHAT_MESSAGE':
      return {
        ...state,
        chatMessages: [...state.chatMessages, action.payload].slice(-50),
      }

    case 'SET_CHAT_HISTORY':
      return { ...state, chatMessages: action.payload }

    case 'SET_COUNTDOWN':
      return { ...state, countdownValue: action.payload }

    case 'SET_GAME_PHASE':
      return { ...state, gamePhase: action.payload }

    case 'SET_PUZZLE_DATA':
      return { ...state, puzzlePiecesData: action.payload }

    case 'SET_CURRENT_PLAYER':
      return {
        ...state,
        currentPlayerId: action.payload.id,
        currentPlayerColor: action.payload.color,
      }

    default:
      return state
  }
}

interface GameContextType {
  state: GameStoreState
  dispatch: React.Dispatch<Action>
  getPieceData: (pieceId: string) => PuzzlePieceData | undefined
  getPlayerById: (playerId: string) => Player | undefined
  getOwnedPieces: (playerId: string) => PuzzlePieceState[]
  getAdjacentPieces: (pieceId: string) => PuzzlePieceState[]
}

const GameContext = createContext<GameContextType | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState)

  const getPieceData = useCallback(
    (pieceId: string) => {
      return state.puzzlePiecesData.find((p) => p.id === pieceId)
    },
    [state.puzzlePiecesData]
  )

  const getPlayerById = useCallback(
    (playerId: string) => {
      return state.players.find((p) => p.id === playerId)
    },
    [state.players]
  )

  const getOwnedPieces = useCallback(
    (playerId: string) => {
      return state.pieces.filter((p) => p.ownerId === playerId && !p.placed)
    },
    [state.pieces]
  )

  const getAdjacentPieces = useCallback(
    (pieceId: string) => {
      const piece = state.pieces.find((p) => p.id === pieceId)
      if (!piece) return []

      const { puzzleCols, puzzleRows } = state
      const col = piece.index % puzzleCols
      const row = Math.floor(piece.index / puzzleCols)
      const adjacentIndices: number[] = []

      if (row > 0) adjacentIndices.push(piece.index - puzzleCols)
      if (col < puzzleCols - 1) adjacentIndices.push(piece.index + 1)
      if (row < puzzleRows - 1) adjacentIndices.push(piece.index + puzzleCols)
      if (col > 0) adjacentIndices.push(piece.index - 1)

      return state.pieces.filter((p) => adjacentIndices.includes(p.index))
    },
    [state.pieces, state.puzzleCols, state.puzzleRows]
  )

  return (
    <GameContext.Provider
      value={{ state, dispatch, getPieceData, getPlayerById, getOwnedPieces, getAdjacentPieces }}
    >
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
}
