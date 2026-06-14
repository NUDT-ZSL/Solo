import React, { useState, useEffect, useRef } from 'react'
import { Card } from '../data/cards'
import { CardEngine, GameState, PlayCardResult } from '../CardEngine'
import { ParticleEffect } from '../ParticleEffect'
import { HealthBar } from './HealthBar'
import { HandCards } from './HandCards'
import { BattleCanvas } from './BattleCanvas'
import { DeckPile } from './DeckPile'
import { DamageNumber } from './DamageNumber'
import { GameOverModal } from './GameOverModal'

interface BattleFieldProps {
  player1Deck: Card[]
  player2Deck: Card[]
  cardEngine: CardEngine
  particleEngine: ParticleEffect
  onRestart: () => void
}

interface FloatingNumber {
  id: number
  value: number
  type: 'damage' | 'heal' | 'shield'
  x: number
  y: number
  player: 0 | 1
}

export const BattleField: React.FC<BattleFieldProps> = ({
  player1Deck,
  player2Deck,
  cardEngine,
  particleEngine,
  onRestart,
}) => {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const floatIdRef = useRef(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const state = cardEngine.initGame(player1Deck, player2Deck)
    setGameState(state)
  }, [cardEngine, player1Deck, player2Deck])

  const addFloatingNumber = (
    value: number,
    type: 'damage' | 'heal' | 'shield',
    player: 0 | 1
  ) => {
    const id = ++floatIdRef.current
    const x = player === 0 ? 120 : 120
    const y = player === 0 ? 20 : 260

    setFloatingNumbers((prev) => [...prev, { id, value, type, x, y, player }])
  }

  const removeFloatingNumber = (id: number) => {
    setFloatingNumbers((prev) => prev.filter((n) => n.id !== id))
  }

  const handleCardPlay = (cardId: string, x: number, y: number) => {
    if (!gameState || gameState.gameOver || isProcessing) return

    const currentPlayerIndex = gameState.currentPlayerIndex
    const result = cardEngine.playCard(currentPlayerIndex, cardId)

    if (!result) return

    setIsProcessing(true)

    particleEngine.playEffect(result.card.element, x, y, result.card.particleParams)

    const targetPlayerIndex = result.targetPlayerId as 0 | 1
    const sourcePlayerIndex = result.sourcePlayerId as 0 | 1

    setTimeout(() => {
      for (const effect of result.effects) {
        if (effect.type === 'damage' && effect.applied) {
          addFloatingNumber(effect.value, 'damage', targetPlayerIndex)
        } else if (effect.type === 'heal' && effect.applied) {
          addFloatingNumber(effect.value, 'heal', sourcePlayerIndex)
        } else if (effect.type === 'shield' && effect.applied) {
          addFloatingNumber(effect.value, 'shield', sourcePlayerIndex)
        }
      }

      setGameState(cardEngine.getState())
      setIsProcessing(false)
    }, 300)
  }

  const handleEndTurn = () => {
    if (!gameState || gameState.gameOver || isProcessing) return

    setIsProcessing(true)

    const newState = cardEngine.endTurn()
    setGameState(newState)

    setTimeout(() => {
      setIsProcessing(false)
    }, 500)
  }

  if (!gameState) {
    return <div className="battle-loading">加载中...</div>
  }

  const player0 = gameState.players[0]
  const player1 = gameState.players[1]
  const isPlayer0Turn = gameState.currentPlayerIndex === 0

  return (
    <div className="battlefield">
      <div className="battlefield-top">
        <HealthBar
          current={player1.health}
          max={player1.maxHealth}
          shield={player1.shield}
          position="top"
          playerName="玩家二"
          isCurrentPlayer={!isPlayer0Turn}
        />
        <div className="top-right-info">
          <DeckPile remaining={player1.deck.length} position="top-right" />
        </div>
      </div>

      <div className="battlefield-turn-info">
        <span className="turn-number">第 {gameState.turn} 回合</span>
        <span className="current-player">
          当前: {isPlayer0Turn ? '玩家一' : '玩家二'}
        </span>
      </div>

      <div className="battlefield-middle">
        <BattleCanvas particleEngine={particleEngine} />

        {floatingNumbers.map((num) => (
          <DamageNumber
            key={num.id}
            value={num.value}
            type={num.type}
            x={num.x}
            y={num.y}
            onComplete={() => removeFloatingNumber(num.id)}
          />
        ))}
      </div>

      <div className="battlefield-bottom">
        <HealthBar
          current={player0.health}
          max={player0.maxHealth}
          shield={player0.shield}
          position="bottom"
          playerName="玩家一"
          isCurrentPlayer={isPlayer0Turn}
        />
        <DeckPile remaining={player0.deck.length} position="bottom-right" />
      </div>

      <div className="hand-cards bottom">
        <HandCards
          cards={player0.hand}
          isCurrentPlayer={isPlayer0Turn && !isProcessing}
          onCardPlay={handleCardPlay}
          side="bottom"
          playerId={0}
        />
      </div>

      <div className="battlefield-actions">
        <button
          className={`btn btn-secondary end-turn-btn ${
            isPlayer0Turn && !isProcessing ? '' : 'disabled'
          }`}
          onClick={handleEndTurn}
          disabled={!isPlayer0Turn || isProcessing}
        >
          结束回合
        </button>
      </div>

      {gameState.gameOver && (
        <GameOverModal
          winner={gameState.winner}
          playerIndex={0}
          onRestart={onRestart}
        />
      )}
    </div>
  )
}
