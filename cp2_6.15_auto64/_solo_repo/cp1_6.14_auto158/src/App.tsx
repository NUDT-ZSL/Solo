import React, { useState } from 'react'
import { DeckBuilder } from './components/DeckBuilder'
import { BattleField } from './components/BattleField'
import { cardEngine } from './CardEngine'
import { particleEffect } from './ParticleEffect'
import { Card } from './data/cards'
import './styles.css'

type GamePhase = 'build' | 'battle'

const App: React.FC = () => {
  const [phase, setPhase] = useState<GamePhase>('build')
  const [currentBuildPlayer, setCurrentBuildPlayer] = useState<0 | 1>(0)
  const [player1Deck, setPlayer1Deck] = useState<Card[]>([])
  const [player2Deck, setPlayer2Deck] = useState<Card[]>([])
  const [battleKey, setBattleKey] = useState(0)

  const handleDeckConfirm = (deck: Card[]) => {
    if (currentBuildPlayer === 0) {
      setPlayer1Deck(deck)
      setCurrentBuildPlayer(1)
    } else {
      setPlayer2Deck(deck)
      setPhase('battle')
      setBattleKey((k) => k + 1)
    }
  }

  const handleBack = () => {
    if (currentBuildPlayer === 1) {
      setCurrentBuildPlayer(0)
    }
  }

  const handleRestart = () => {
    setPhase('build')
    setPlayer1Deck([])
    setPlayer2Deck([])
    setCurrentBuildPlayer(0)
    particleEffect.clearAll()
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">✦ ArcaneDeck ✦</h1>
        <p className="app-subtitle">魔法学院卡牌对战</p>
      </header>

      <main className="app-main">
        {phase === 'build' && (
          <div className="build-phase">
            <div className="build-mode-tabs">
              <button
                className={`tab-btn ${currentBuildPlayer === 0 ? 'active' : ''}`}
                onClick={() => setCurrentBuildPlayer(0)}
              >
                玩家一
                {player1Deck.length > 0 && <span className="tab-dot">✓</span>}
              </button>
              <button
                className={`tab-btn ${currentBuildPlayer === 1 ? 'active' : ''}`}
                onClick={() => player1Deck.length > 0 && setCurrentBuildPlayer(1)}
                disabled={player1Deck.length === 0}
              >
                玩家二
                {player2Deck.length > 0 && <span className="tab-dot">✓</span>}
              </button>
            </div>
            <DeckBuilder
              playerIndex={currentBuildPlayer}
              initialDeck={currentBuildPlayer === 0 ? player1Deck : player2Deck}
              onConfirm={handleDeckConfirm}
              onBack={handleBack}
              showBackButton={currentBuildPlayer === 1}
            />
          </div>
        )}

        {phase === 'battle' && (
          <BattleField
            key={battleKey}
            player1Deck={player1Deck}
            player2Deck={player2Deck}
            cardEngine={cardEngine}
            particleEngine={particleEffect}
            onRestart={handleRestart}
          />
        )}
      </main>
    </div>
  )
}

export default App
