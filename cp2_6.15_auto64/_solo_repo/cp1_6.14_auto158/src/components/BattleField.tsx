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

interface DrawAnimationCard {
  id: string
  card: Card
  player: 0 | 1
  startX: number
  startY: number
  endX: number
  endY: number
  startTime: number
  duration: number
  delay: number
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
  const [drawAnimations, setDrawAnimations] = useState<DrawAnimationCard[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [, setAnimationTick] = useState(0)
  const floatIdRef = useRef(0)
  const animationIdRef = useRef<number>(0)
  const battlefieldRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const state = cardEngine.initGame(player1Deck, player2Deck)
    setGameState(state)
  }, [cardEngine, player1Deck, player2Deck])

  const getDeckPosition = (player: 0 | 1): { x: number; y: number } => {
    if (!battlefieldRef.current) return { x: 0, y: 0 }

    const bfRect = battlefieldRef.current.getBoundingClientRect()
    const deckPile = document.querySelector(
      player === 0
        ? '.deck-pile.bottom-right'
        : '.deck-pile.top-right'
    )

    if (deckPile) {
      const rect = deckPile.getBoundingClientRect()
      return {
        x: rect.left - bfRect.left + rect.width / 2,
        y: rect.top - bfRect.top + rect.height / 2,
      }
    }

    return {
      x: player === 0 ? bfRect.width - 60 : bfRect.width - 60,
      y: player === 0 ? bfRect.height - 100 : 60,
    }
  }

  const getHandPosition = (player: 0 | 1, index: number): { x: number; y: number } => {
    if (!battlefieldRef.current) return { x: 0, y: 0 }

    const bfRect = battlefieldRef.current.getBoundingClientRect()
    const handCards = document.querySelector(
      player === 0
        ? '.hand-cards.bottom .hand-cards-row'
        : '.hand-cards.top .hand-cards-row'
    )

    if (handCards) {
      const rect = handCards.getBoundingClientRect()
      const cardWidth = 120
      const totalWidth = rect.width
      const startX = (bfRect.width - totalWidth) / 2
      return {
        x: startX + index * (cardWidth - 20) + cardWidth / 2,
        y: player === 0
          ? bfRect.height - 100
          : 120,
      }
    }

    return {
      x: bfRect.width / 2 + (index - 2) * 100,
      y: player === 0 ? bfRect.height - 100 : 120,
    }
  }

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

  const triggerDrawAnimations = (player: 0 | 1, drawnCards: Card[]) => {
    const deckPos = getDeckPosition(player)
    const handSize = gameState?.players[player].hand.length || 0

    const animations: DrawAnimationCard[] = drawnCards.map((card, index) => {
      const endPos = getHandPosition(player, handSize + index)
      return {
        id: `draw_${Date.now()}_${index}`,
        card,
        player,
        startX: deckPos.x,
        startY: deckPos.y,
        endX: endPos.x,
        endY: endPos.y,
        startTime: performance.now() + index * 100,
        duration: 300,
        delay: index * 100,
      }
    })

    setDrawAnimations((prev) => [...prev, ...animations])
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

    setTimeout(() => {
      const result = cardEngine.endTurn()

      if (result.drawnCards.length > 0) {
        triggerDrawAnimations(result.nextPlayerId as 0 | 1, result.drawnCards)
      }

      setGameState(result.state)

      setTimeout(() => {
        setIsProcessing(false)
      }, 300)
    }, 300)
  }

  useEffect(() => {
    if (drawAnimations.length === 0) return

    let rafId: number
    let lastTime = 0

    const animate = (time: number) => {
      if (time - lastTime >= 16) {
        setAnimationTick((t) => t + 1)
        lastTime = time
      }

      const now = performance.now()
      setDrawAnimations((prev) => {
        const remaining = prev.filter(
          (anim) => now - anim.startTime < anim.duration + anim.delay
        )
        return remaining
      })

      rafId = requestAnimationFrame(animate)
    }

    rafId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(rafId)
  }, [drawAnimations.length > 0])

  const getDrawCardStyle = (anim: DrawAnimationCard): React.CSSProperties => {
    const now = performance.now()
    const elapsed = now - anim.startTime - anim.delay

    if (elapsed < 0) {
      return {
        position: 'absolute',
        left: anim.startX - 60,
        top: anim.startY - 80,
        opacity: 0,
        pointerEvents: 'none',
        zIndex: 100,
      }
    }

    const progress = Math.min(1, elapsed / anim.duration)
    const t = progress

    const cp1x = anim.startX + (anim.endX - anim.startX) * 0.3
    const cp1y = anim.startY + (anim.endY - anim.startY) * -0.5
    const cp2x = anim.startX + (anim.endX - anim.startX) * 0.7
    const cp2y = anim.endY + (anim.startY - anim.endY) * 0.1

    const x =
      Math.pow(1 - t, 3) * anim.startX +
      3 * Math.pow(1 - t, 2) * t * cp1x +
      3 * (1 - t) * Math.pow(t, 2) * cp2x +
      Math.pow(t, 3) * anim.endX

    const y =
      Math.pow(1 - t, 3) * anim.startY +
      3 * Math.pow(1 - t, 2) * t * cp1y +
      3 * (1 - t) * Math.pow(t, 2) * cp2y +
      Math.pow(t, 3) * anim.endY

    const scale = 0.5 + progress * 0.5
    const rotation = progress * 5

    return {
      position: 'absolute',
      left: x - 60,
      top: y - 80,
      transform: `scale(${scale}) rotate(${rotation}deg)`,
      opacity: Math.min(1, progress * 2),
      pointerEvents: 'none',
      zIndex: 100,
      transition: 'opacity 0.1s ease-out',
    }
  }

  if (!gameState) {
    return <div className="battle-loading">加载中...</div>
  }

  const player0 = gameState.players[0]
  const player1 = gameState.players[1]
  const isPlayer0Turn = gameState.currentPlayerIndex === 0

  return (
    <div className="battlefield" ref={battlefieldRef}>
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

        {drawAnimations.map((anim) => (
          <div key={anim.id} style={getDrawCardStyle(anim)}>
            <div
              className="card draw-animation-card"
              style={{
                '--gradient-start': '#2c3e50',
                '--gradient-end': '#1a1a3e',
              } as React.CSSProperties}
            >
              <div className="card-back">
                <div className="card-back-pattern">✦</div>
              </div>
            </div>
          </div>
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
