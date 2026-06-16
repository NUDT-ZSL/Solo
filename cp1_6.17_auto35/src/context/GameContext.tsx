import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react'
import type { GameEngine } from '../core/gameEngine'
import type { SceneContext } from '../renderer/sceneSetup'
import type { AIState } from '../ai/battleAI'
import type { Ship, BattleLog, GameResult, GamePhase } from '../types'

interface GameContextType {
  engine: GameEngine | null
  sceneCtx: SceneContext | null
  setEngine: (e: GameEngine | null) => void
  setSceneCtx: (c: SceneContext | null) => void
  phase: GamePhase
  ships: Ship[]
  logs: BattleLog[]
  result: GameResult | null
  selectedShipId: string | null
  aiState: AIState | null
  refreshTrigger: number
  refreshUI: () => void
}

const GameContext = createContext<GameContextType | null>(null)

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [engine, setEngine] = useState<GameEngine | null>(null)
  const [sceneCtx, setSceneCtx] = useState<SceneContext | null>(null)
  const [phase, setPhase] = useState<GamePhase>('deploy')
  const [ships, setShips] = useState<Ship[]>([])
  const [logs, setLogs] = useState<BattleLog[]>([])
  const [result, setResult] = useState<GameResult | null>(null)
  const [selectedShipId, setSelectedShipId] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [aiState, setAIState] = useState<AIState | null>(null)

  const refreshUI = useCallback(() => setRefreshTrigger(t => t + 1), [])

  useEffect(() => {
    if (!engine) {
      setAIState(null)
      return
    }
    setAIState(engine.getAIState())
    const off1 = engine.on('phaseChange', (p: GamePhase) => { setPhase(p); setAIState(engine.getAIState()) })
    const off2 = engine.on('shipsChanged', (s: Ship[]) => setShips([...s]))
    const off3 = engine.on('newLog', (l: BattleLog) => setLogs(prev => [...prev.slice(-199), l]))
    const off4 = engine.on('battleResult', (r: GameResult) => setResult(r))
    const off5 = engine.on('selectionChanged', (id: string | null) => setSelectedShipId(id))
    const off6 = engine.on('frameUpdate', () => { setRefreshTrigger(t => t + 1); setAIState(engine.getAIState()) })
    return () => { off1(); off2(); off3(); off4(); off5(); off6() }
  }, [engine])

  return (
    <GameContext.Provider value={{
      engine, sceneCtx, setEngine, setSceneCtx,
      phase, ships, logs, result, selectedShipId, aiState,
      refreshTrigger, refreshUI
    }}>
      {children}
    </GameContext.Provider>
  )
}

export const useGame = () => {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
