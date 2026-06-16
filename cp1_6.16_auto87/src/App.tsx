import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { GameEngine, HexCoord, Unit } from './modules/game/GameEngine'
import { TacticCardSystem, TacticCard } from './modules/game/TacticCardSystem'
import BattleField from './modules/ui/BattleField'
import ControlPanel from './modules/ui/ControlPanel'
import CardDeck from './modules/ui/CardDeck'

const App: React.FC = () => {
  const [engine] = useState(() => new GameEngine())
  const [cardSystem] = useState(() => new TacticCardSystem(engine))
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [floatMessages, setFloatMessages] = useState<{ id: number; text: string; x: number; y: number }[]>([])

  let msgIdCounter = 0

  const forceUpdate = useCallback(() => {
    setRefreshTrigger(prev => prev + 1)
  }, [])

  const state = engine.getState()

  const validCardTargets = useMemo(() => {
    if (!selectedCardId) return { units: [], cells: [] }
    return cardSystem.getCardValidTargets(selectedCardId)
  }, [selectedCardId, refreshTrigger])

  useEffect(() => {
    if (state.gameOver && !showResult) {
      setTimeout(() => setShowResult(true), 500)
    }
  }, [state.gameOver])

  const showFloatMessage = (text: string) => {
    const id = ++msgIdCounter
    const msg = {
      id,
      text,
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
      y: window.innerHeight / 2 + (Math.random() - 0.5) * 100
    }
    setFloatMessages(prev => [...prev, msg])
    setTimeout(() => {
      setFloatMessages(prev => prev.filter(m => m.id !== id))
    }, 1500)
  }

  const handleEndTurn = () => {
    if (state.currentTurn !== 'player' || state.gameOver) return
    setSelectedCardId(null)
    cardSystem.onNewTurn()
    engine.endTurn()
    setTimeout(forceUpdate, 850)
    forceUpdate()
  }

  const handleCardTargetSelected = useCallback((unitId?: string, cell?: HexCoord) => {
    if (!selectedCardId) return
    const card = cardSystem.getHand().find(c => c.id === selectedCardId)
    if (!card) return

    let success = false
    if (card.needsTarget === 'none') {
      success = cardSystem.playCard(selectedCardId)
    } else if (card.needsTarget === 'unit' && unitId) {
      success = cardSystem.playCard(selectedCardId, unitId)
    } else if (card.needsTarget === 'cell' && cell) {
      success = cardSystem.playCard(selectedCardId, undefined, cell)
    }

    if (success) {
      setSelectedCardId(null)
      showFloatMessage(`✨ ${card.name} 发动！`)
      forceUpdate()
    }
  }, [selectedCardId, cardSystem, forceUpdate])

  const handleCardSelect = useCallback((cardId: string | null) => {
    if (!cardId) {
      setSelectedCardId(null)
      return
    }

    const card = cardSystem.getHand().find(c => c.id === cardId)
    if (!card) return

    if (card.needsTarget === 'none') {
      const success = cardSystem.playCard(cardId)
      if (success) {
        showFloatMessage(`✨ ${card.name} 发动！`)
        setSelectedCardId(null)
        forceUpdate()
      }
    } else {
      setSelectedCardId(cardId === selectedCardId ? null : cardId)
    }
  }, [selectedCardId, cardSystem, forceUpdate])

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="game-title">⚔ 兵法棋局 ⚔</h1>
        <div className="subtitle">— 运筹帷幄，决胜千里 —</div>
      </header>

      <div className="main-layout">
        <div className="battlefield-wrapper">
          <BattleField
            engine={engine}
            refreshTrigger={refreshTrigger}
            onStateChange={forceUpdate}
            selectedCardId={selectedCardId}
            validCardTargets={validCardTargets}
            onCardTargetSelected={handleCardTargetSelected}
          />
          <CardDeck
            cards={cardSystem.getHand()}
            selectedCardId={selectedCardId}
            onSelectCard={handleCardSelect}
            canPlay={state.currentTurn === 'player' && !state.gameOver}
          />
        </div>

        <div className="sidebar">
          <ControlPanel
            engine={engine}
            refreshTrigger={refreshTrigger}
            onEndTurn={handleEndTurn}
            onStateChange={forceUpdate}
          />
        </div>
      </div>

      {floatMessages.map(msg => (
        <div
          key={msg.id}
          className="float-message"
          style={{ left: msg.x, top: msg.y }}
        >
          {msg.text}
        </div>
      ))}

      {showResult && state.gameOver && (
        <div className="result-overlay" onClick={() => {}}>
          <div className="result-modal">
            <div className="trophy-icon">
              {state.winner === 'player' ? '🏆' : '💀'}
            </div>
            <h2 className={`result-title ${state.winner || ''}`}>
              {state.winner === 'player' ? '胜 利！' : '失 败'}
            </h2>
            <div className="result-stats">
              <div className="stat-row">
                <span>回合数</span>
                <span className="stat-value">{state.stats.turnsPlayed}</span>
              </div>
              <div className="stat-row">
                <span>杀敌数</span>
                <span className="stat-value">{state.stats.enemiesKilled}</span>
              </div>
              <div className="stat-row">
                <span>计策使用次数</span>
                <span className="stat-value">{state.stats.tacticsUsed}</span>
              </div>
            </div>
            <button className="btn btn-primary result-btn" onClick={() => window.location.reload()}>
              🔄 再战一局
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
