import { useEffect, useRef, useState, useCallback } from 'react'
import Phaser from 'phaser'
import type { GameStateData, RoomInfo } from '../App'
import type { Direction, SkillType } from '../../shared/types'
import { GameScene } from '../game/GameScene'

interface GameProps {
  gameState: GameStateData
  playerId: string
  roomInfo: RoomInfo | null
  countdown: number | null
  winner: string | null
  onSendDirection: (direction: Direction) => void
  onUseSkill: () => void
  onExit: () => void
}

const SKILL_INFO: Record<SkillType, { name: string; icon: string; color: string }> = {
  speed: { name: '加速冲刺', icon: '⚡', color: '#ffd700' },
  invisible: { name: '隐身', icon: '👻', color: '#aa66ff' },
  trap: { name: '减速陷阱', icon: '🕸️', color: '#00ff88' },
  laser: { name: '激光波', icon: '💥', color: '#ff6b6b' },
}

export default function Game({
  gameState,
  playerId,
  roomInfo,
  countdown,
  winner,
  onSendDirection,
  onUseSkill,
  onExit,
}: GameProps) {
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const sceneRef = useRef<GameScene | null>(null)
  const [showCountdown, setShowCountdown] = useState(false)
  const [countdownNum, setCountdownNum] = useState(3)

  const myPlayer = gameState.players.find((p) => p.id === playerId)
  const mySkill = myPlayer?.skill || null
  const mySkillCooldown = myPlayer?.skillCooldown || 0
  const isWinner = winner === playerId

  useEffect(() => {
    if (countdown !== null && countdown >= 0) {
      setShowCountdown(true)
      setCountdownNum(countdown)
    } else {
      setShowCountdown(false)
    }
  }, [countdown])

  useEffect(() => {
    if (!gameContainerRef.current) return

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: gameContainerRef.current,
      width: 640,
      height: 640,
      scene: GameScene,
      backgroundColor: '#0a0a2e',
      pixelArt: true,
    }

    const game = new Phaser.Game(config)
    gameRef.current = game

    game.events.on('ready', () => {
      const scene = game.scene.getScene('GameScene') as GameScene
      sceneRef.current = scene
    })

    return () => {
      game.destroy(true)
      gameRef.current = null
      sceneRef.current = null
    }
  }, [])

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.updateGameState(gameState, playerId)
    }
  }, [gameState, playerId])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (gameState.gameOver) return

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault()
          onSendDirection('up')
          break
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault()
          onSendDirection('down')
          break
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault()
          onSendDirection('left')
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault()
          onSendDirection('right')
          break
        case ' ':
          e.preventDefault()
          onUseSkill()
          break
      }
    },
    [onSendDirection, onUseSkill, gameState.gameOver]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const skillInfo = mySkill ? SKILL_INFO[mySkill] : null
  const cooldownPercent = mySkillCooldown > 0 ? (mySkillCooldown / 27) * 100 : 0

  return (
    <div className="game-screen">
      <div className="game-layout">
        <div className="left-panel">
          <h3 className="panel-title">玩家列表</h3>
          <div className="player-status-list">
            {gameState.players.map((player) => (
              <div
                key={player.id}
                className={`player-status ${player.alive ? 'alive' : 'dead'} ${
                  player.id === playerId ? 'self' : ''
                }`}
              >
                <div
                  className="player-snake-icon"
                  style={{
                    backgroundColor: player.color,
                    boxShadow: player.alive ? `0 0 8px ${player.color}` : 'none',
                    opacity: player.alive ? 1 : 0.3,
                  }}
                ></div>
                <div className="player-status-info">
                  <span className="player-status-name">
                    {player.nickname}
                    {player.id === playerId && <span className="self-badge">你</span>}
                  </span>
                  <span className="player-length">长度: {player.score}</span>
                </div>
                <div
                  className={`status-indicator ${player.alive ? 'breathing' : ''}`}
                  style={{ backgroundColor: player.alive ? player.color : '#444' }}
                ></div>
              </div>
            ))}
          </div>
        </div>

        <div className="game-main">
          <div ref={gameContainerRef} className="game-canvas-container"></div>

          {showCountdown && (
            <div className="countdown-overlay">
              <div className="countdown-number">{countdownNum || 'GO!'}</div>
            </div>
          )}

          {gameState.gameOver && (
            <div className="game-over-overlay">
              <div className="game-over-modal">
                <h2 className={`result-title ${isWinner ? 'winner' : 'loser'}`}>
                  {isWinner ? '🎉 胜利！' : '💀 失败'}
                </h2>
                <p className="result-subtitle">
                  {isWinner ? '你是最后存活的蛇！' : '再接再厉！'}
                </p>
                <button className="btn btn-primary" onClick={onExit}>
                  返回大厅
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="right-panel">
          <h3 className="panel-title">技能</h3>
          <div className="skill-container">
            <div
              className={`skill-icon ${mySkill && mySkillCooldown === 0 ? 'available' : ''} ${
                mySkillCooldown > 0 ? 'cooldown' : ''
              }`}
              style={{
                borderColor: skillInfo?.color || '#333',
                boxShadow:
                  mySkill && mySkillCooldown === 0
                    ? `0 0 20px ${skillInfo?.color}, inset 0 0 10px ${skillInfo?.color}40`
                    : 'none',
              }}
              onClick={() => {
                if (mySkill && mySkillCooldown === 0) {
                  onUseSkill()
                }
              }}
            >
              <span className="skill-icon-text">{skillInfo?.icon || '?'}</span>
              {mySkillCooldown > 0 && (
                <div
                  className="skill-cooldown-mask"
                  style={{ height: `${cooldownPercent}%` }}
                ></div>
              )}
            </div>
            <div className="skill-name">
              {skillInfo?.name || '无技能'}
            </div>
            {mySkillCooldown > 0 && (
              <div className="skill-cooldown-text">冷却: {Math.ceil(mySkillCooldown * 0.3)}s</div>
            )}
            <div className="skill-hint">按 空格键 释放</div>
          </div>

          <div className="controls-hint">
            <h4>操作说明</h4>
            <p>↑ W - 向上</p>
            <p>↓ S - 向下</p>
            <p>← A - 向左</p>
            <p>→ D - 向右</p>
            <p>空格 - 技能</p>
          </div>
        </div>
      </div>
    </div>
  )
}
