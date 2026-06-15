import { useState, useRef, useEffect, useCallback } from 'react'
import GameCanvas from './GameCanvas'
import { usePlayerController } from './PlayerController'
import { useEnemyAI } from './EnemyAI'
import { useCollectibleSystem } from './CollectibleSystem'

type GamePhase = 'title' | 'playing' | 'transition' | 'victory'

const AREA_NAMES = ['珊瑚浅滩', '海底峡谷', '沉船遗迹']
const SPORES_TO_UNLOCK = 50
const TOTAL_AREAS = 3

function App() {
  const [phase, setPhase] = useState<GamePhase>('title')
  const [areaIndex, setAreaIndex] = useState(0)
  const [collected, setCollected] = useState(0)
  const [flashCooldown, setFlashCooldown] = useState(0)
  const [flashMaxCooldown] = useState(2)
  const [isChased, setIsChased] = useState(false)
  const [showTransition, setShowTransition] = useState(false)
  const [playerAlive, setPlayerAlive] = useState(true)
  const [transitionText, setTransitionText] = useState('')

  const canvasReadyRef = useRef(false)
  const gameLoopRef = useRef(0)
  const lastTimeRef = useRef(0)

  const playerSystem = usePlayerController()
  const enemySystem = useEnemyAI()
  const collectSystem = useCollectibleSystem()

  const initArea = useCallback((area: number) => {
    const w = window.innerWidth
    const h = window.innerHeight
    playerSystem.resetPlayer(80, h / 2)
    enemySystem.generateEnemies(area, w, h)
    collectSystem.generateSpores(area, w, h)
    setCollected(0)
    setFlashCooldown(0)
    setIsChased(false)
    setPlayerAlive(true)
  }, [playerSystem, enemySystem, collectSystem])

  const handleCanvasReady = useCallback(() => {
    canvasReadyRef.current = true
  }, [])

  const startGame = useCallback(() => {
    collectSystem.initAudio()
    enemySystem.initAudio()
    setPhase('playing')
    setAreaIndex(0)
    initArea(0)
  }, [collectSystem, enemySystem, initArea])

  useEffect(() => {
    if (phase !== 'playing') {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
        gameLoopRef.current = 0
      }
      return
    }

    if (!canvasReadyRef.current) return

    lastTimeRef.current = performance.now()

    const gameLoop = (now: number) => {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05)
      lastTimeRef.current = now

      const w = window.innerWidth
      const h = window.innerHeight
      const player = playerSystem.playerRef.current

      playerSystem.update(dt, w, h, enemySystem.enemiesRef.current)

      if (player.flashActive) {
        enemySystem.stunNearby(player.x, player.y, player.flashRadius)
      }

      enemySystem.update(dt, player.x, player.y, w, h)

      const justCollected = collectSystem.checkCollection(player.x, player.y)
      collectSystem.update(dt)

      if (justCollected) {
        const progress = collectSystem.getProgress()
        setCollected(progress.collected)
      }

      setFlashCooldown(player.flashCooldown)
      setIsChased(enemySystem.isPlayerChased())
      setPlayerAlive(player.alive)

      if (collectSystem.isAreaComplete() && player.alive) {
        if (areaIndex < TOTAL_AREAS - 1) {
          setPhase('transition')
          const nextArea = areaIndex + 1
          setTransitionText(AREA_NAMES[nextArea])
          setShowTransition(true)

          setTimeout(() => {
            setAreaIndex(nextArea)
            initArea(nextArea)
          }, 800)

          setTimeout(() => {
            setShowTransition(false)
            setPhase('playing')
          }, 2000)
        } else {
          setPhase('victory')
        }
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop)
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
        gameLoopRef.current = 0
      }
    }
  }, [phase, areaIndex, playerSystem, enemySystem, collectSystem, initArea])

  const progressAngle = (collected / SPORES_TO_UNLOCK) * Math.PI * 2
  const cooldownRatio = flashCooldown / flashMaxCooldown

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', fontFamily: '"Microsoft YaHei", sans-serif' }}>
      {phase === 'title' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(180deg, #0a1628 0%, #020810 100%)',
          zIndex: 10,
        }}>
          <div style={{
            fontSize: '4rem', fontWeight: 'bold',
            background: 'linear-gradient(135deg, #7fdbff, #bf7fff, #ff6eb4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: 'none',
            marginBottom: '1rem',
            letterSpacing: '0.15em',
          }}>
            鳞光秘境
          </div>
          <div style={{ color: '#4a7a9a', fontSize: '1rem', marginBottom: '3rem', letterSpacing: '0.3em' }}>
            深海潜行 · 光之冒险
          </div>
          <div style={{ color: '#5a8aaa', fontSize: '0.85rem', marginBottom: '2rem', textAlign: 'center', lineHeight: 2 }}>
            方向键 / WASD 移动光鱼<br />
            空格键 释放闪光（眩晕捕食者）<br />
            收集荧光孢子解锁新区域
          </div>
          <button
            onClick={startGame}
            style={{
              padding: '14px 48px',
              fontSize: '1.1rem',
              border: '1px solid rgba(127,219,255,0.4)',
              borderRadius: '30px',
              background: 'rgba(127,219,255,0.1)',
              color: '#7fdbff',
              cursor: 'pointer',
              transition: 'all 0.3s',
              letterSpacing: '0.2em',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(127,219,255,0.2)'
              e.currentTarget.style.borderColor = 'rgba(127,219,255,0.7)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(127,219,255,0.1)'
              e.currentTarget.style.borderColor = 'rgba(127,219,255,0.4)'
            }}
          >
            开始探索
          </button>
        </div>
      )}

      {phase !== 'title' && (
        <GameCanvas
          areaIndex={areaIndex}
          playerRef={playerSystem.playerRef}
          trailRef={playerSystem.trailRef}
          enemiesRef={enemySystem.enemiesRef}
          sporesRef={collectSystem.sporesRef}
          feedbacksRef={collectSystem.feedbacksRef}
          isPlayerChased={isChased}
          onReady={handleCanvasReady}
        />
      )}

      {phase === 'playing' && (
        <>
          <div style={{ position: 'absolute', top: 24, left: 24, zIndex: 5 }}>
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(127,219,255,0.15)" strokeWidth="3" />
              <circle
                cx="32" cy="32" r="28"
                fill="none"
                stroke="rgba(127,219,255,0.7)"
                strokeWidth="3"
                strokeDasharray={`${progressAngle * 28} ${2 * Math.PI * 28 - progressAngle * 28}`}
                strokeDashoffset={Math.PI * 28 * 0.5}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.3s ease' }}
              />
              <text x="32" y="34" textAnchor="middle" fill="#7fdbff" fontSize="14" fontWeight="bold" dominantBaseline="middle">
                {collected}/{SPORES_TO_UNLOCK}
              </text>
            </svg>
            <div style={{
              color: 'rgba(127,219,255,0.7)',
              fontSize: '0.8rem',
              marginTop: 4,
              textAlign: 'center',
              textShadow: '0 0 10px rgba(127,219,255,0.3)',
            }}>
              {AREA_NAMES[areaIndex]}
            </div>
          </div>

          <div style={{ position: 'absolute', bottom: 24, right: 24, zIndex: 5 }}>
            <svg width="52" height="52" viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="22" fill="rgba(127,219,255,0.05)" stroke="rgba(127,219,255,0.2)" strokeWidth="2" />
              {cooldownRatio > 0 && (
                <circle
                  cx="26" cy="26" r="22"
                  fill="none"
                  stroke="rgba(127,219,255,0.5)"
                  strokeWidth="2.5"
                  strokeDasharray={`${cooldownRatio * 2 * Math.PI * 22} ${2 * Math.PI * 22 * (1 - cooldownRatio)}`}
                  strokeDashoffset={Math.PI * 22 * 0.5}
                  strokeLinecap="round"
                />
              )}
              <text x="26" y="27" textAnchor="middle" fill={cooldownRatio > 0 ? 'rgba(127,219,255,0.4)' : '#7fdbff'} fontSize="11" dominantBaseline="middle">
                {cooldownRatio > 0 ? Math.ceil(flashCooldown) + 's' : '⚡'}
              </text>
            </svg>
          </div>

          {!playerAlive && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 8,
              background: 'rgba(0,0,0,0.4)',
              pointerEvents: 'none',
            }}>
              <div style={{
                color: 'rgba(255,100,100,0.9)',
                fontSize: '1.5rem',
                textShadow: '0 0 20px rgba(255,50,50,0.5)',
                animation: 'pulse 1s ease-in-out infinite',
              }}>
                被捕获了... 重生中
              </div>
            </div>
          )}
        </>
      )}

      {showTransition && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 20,
          background: 'rgba(5,10,25,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          animation: 'fadeIn 0.6s ease',
        }}>
          <div style={{
            color: '#7fdbff',
            fontSize: '2rem',
            textShadow: '0 0 30px rgba(127,219,255,0.5)',
            letterSpacing: '0.2em',
            animation: 'slideUp 0.8s ease',
          }}>
            {transitionText}
          </div>
        </div>
      )}

      {phase === 'victory' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(5,10,25,0.9)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          zIndex: 20,
        }}>
          <div style={{
            fontSize: '3rem', fontWeight: 'bold',
            background: 'linear-gradient(135deg, #7fdbff, #ff6eb4, #bf7fff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '1.5rem',
            letterSpacing: '0.15em',
          }}>
            秘境通关
          </div>
          <div style={{ color: '#5a8aaa', fontSize: '1rem', marginBottom: '2rem', textAlign: 'center', lineHeight: 2 }}>
            你点亮了所有深海的黑暗<br />
            光鱼的故事还将继续...
          </div>
          <button
            onClick={() => { setPhase('title'); setAreaIndex(0); setCollected(0); }}
            style={{
              padding: '12px 40px',
              fontSize: '1rem',
              border: '1px solid rgba(127,219,255,0.4)',
              borderRadius: '30px',
              background: 'rgba(127,219,255,0.1)',
              color: '#7fdbff',
              cursor: 'pointer',
              letterSpacing: '0.2em',
            }}
          >
            重新探索
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default App
