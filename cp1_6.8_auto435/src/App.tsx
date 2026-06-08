import React, { useState, useCallback, useRef, useEffect } from 'react'
import Scene from './components/Scene'
import Puzzle from './components/Puzzle'
import { levels } from './data/levels'
import type { SceneObject } from './data/levels'
import { createFilmGrain } from './utils/animations'

type GamePhase = 'title' | 'playing' | 'memory' | 'puzzle' | 'solved' | 'ending'

export default function App() {
  const [phase, setPhase] = useState<GamePhase>('title')
  const [currentLevel, setCurrentLevel] = useState(0)
  const [foilCount, setFoilCount] = useState(0)
  const [hintsLeft, setHintsLeft] = useState(3)
  const [showHintFlash, setShowHintFlash] = useState(false)
  const [hoveredObject, setHoveredObject] = useState<string | null>(null)
  const [memoryAlpha, setMemoryAlpha] = useState(0)
  const [clickedMemories, setClickedMemories] = useState<string[]>([])
  const grainCanvasRef = useRef<HTMLCanvasElement>(null)
  const stopGrainRef = useRef<(() => void) | null>(null)

  const level = levels[currentLevel]
  const hoveredObj = hoveredObject
    ? level.objects.find((o) => o.id === hoveredObject)
    : null

  useEffect(() => {
    return () => {
      stopGrainRef.current?.()
    }
  }, [])

  const handleObjectClick = useCallback(
    (obj: SceneObject) => {
      if (!clickedMemories.includes(obj.id)) {
        setClickedMemories((prev) => [...prev, obj.id])
        setPhase('memory')
        let alpha = 0
        const fadeIn = setInterval(() => {
          alpha += 0.03
          if (alpha >= 1) {
            alpha = 1
            clearInterval(fadeIn)
          }
          setMemoryAlpha(alpha)
        }, 16)

        setTimeout(() => {
          const fadeOut = setInterval(() => {
            alpha -= 0.03
            if (alpha <= 0) {
              alpha = 0
              clearInterval(fadeOut)
              setMemoryAlpha(0)
              setPhase('playing')
            }
            setMemoryAlpha(alpha)
          }, 16)
        }, level.memory.duration)
      }
    },
    [clickedMemories, level.memory.duration]
  )

  const handleAllObjectsClicked = useCallback(() => {
    setPhase('puzzle')
  }, [])

  const handlePuzzleSolved = useCallback(() => {
    setPhase('solved')
    setFoilCount((c) => c + 1)

    setTimeout(() => {
      if (currentLevel < levels.length - 1) {
        setCurrentLevel((l) => l + 1)
        setClickedMemories([])
        setPhase('playing')
      } else {
        setPhase('ending')
      }
    }, 2500)
  }, [currentLevel])

  const handleHint = useCallback(() => {
    if (hintsLeft <= 0) return
    setHintsLeft((h) => h - 1)
    setShowHintFlash(true)
    setTimeout(() => setShowHintFlash(false), 1500)
  }, [hintsLeft])

  const handleStartGame = useCallback(() => {
    setPhase('playing')
    setCurrentLevel(0)
    setFoilCount(0)
    setHintsLeft(3)
    setClickedMemories([])
  }, [])

  const handleRestart = useCallback(() => {
    setPhase('title')
    setCurrentLevel(0)
    setFoilCount(0)
    setHintsLeft(3)
    setClickedMemories([])
  }, [])

  useEffect(() => {
    if (phase === 'memory' && grainCanvasRef.current) {
      const canvas = grainCanvasRef.current
      const rect = canvas.parentElement!.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      stopGrainRef.current = createFilmGrain(canvas, level.memory.duration)
    } else {
      stopGrainRef.current?.()
      stopGrainRef.current = null
    }
  }, [phase, level.memory.duration])

  const renderTitle = () => (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f0e8, #e0d4c0)',
        zIndex: 200,
      }}
    >
      <div
        style={{
          width: 280,
          height: 380,
          background: 'linear-gradient(160deg, #faf6ee, #ede4d4)',
          borderRadius: 4,
          boxShadow:
            '0 4px 20px rgba(0,0,0,0.15), inset 0 0 40px rgba(180,160,130,0.1)',
          border: '1px solid rgba(180,160,130,0.3)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 8,
            border: '1px solid rgba(180,160,130,0.2)',
            borderRadius: 2,
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            fontSize: 32,
            color: '#5a4a38',
            fontFamily: "'Georgia', 'SimSun', serif",
            fontWeight: 'bold',
            letterSpacing: 6,
            marginBottom: 12,
          }}
        >
          时光剪影
        </div>
        <div
          style={{
            fontSize: 14,
            color: '#8a7a68',
            fontFamily: "'Georgia', 'SimSun', serif",
            marginBottom: 8,
            fontStyle: 'italic',
          }}
        >
          Time Silhouette
        </div>
        <div
          style={{
            width: 60,
            height: 1,
            background: 'linear-gradient(90deg, transparent, #c9a96e, transparent)',
            margin: '16px 0',
          }}
        />
        <div
          style={{
            fontSize: 13,
            color: '#8a7a68',
            fontFamily: "'Georgia', 'SimSun', serif",
            lineHeight: 2,
            textAlign: 'center',
            marginBottom: 28,
          }}
        >
          在古老相册中旅行的影子
          <br />
          点击物件，触发回忆
          <br />
          解开谜题，拼凑故事
        </div>
        <button
          onClick={handleStartGame}
          style={{
            padding: '12px 36px',
            border: '1px solid rgba(180,160,130,0.5)',
            borderRadius: 6,
            background: 'linear-gradient(135deg, #faf4e6, #f0e4c8)',
            color: '#5a4a38',
            fontFamily: "'Georgia', 'SimSun', serif",
            fontSize: 15,
            cursor: 'pointer',
            transition: 'all 0.3s',
            letterSpacing: 3,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 2px 12px rgba(201,169,110,0.3)'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          开启旅程
        </button>
      </div>
    </div>
  )

  const renderEnding = () => (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f0e8, #e0d4c0)',
        zIndex: 200,
        animation: 'fadeIn 1.5s ease-out',
      }}
    >
      <div
        style={{
          maxWidth: 480,
          textAlign: 'center',
          padding: 40,
        }}
      >
        <div
          style={{
            fontSize: 14,
            color: '#c9a96e',
            letterSpacing: 4,
            marginBottom: 16,
          }}
        >
          ✦ ✦ ✦
        </div>
        <div
          style={{
            fontSize: 26,
            color: '#5a4a38',
            fontFamily: "'Georgia', 'SimSun', serif",
            fontWeight: 'bold',
            marginBottom: 24,
          }}
        >
          故事终章
        </div>
        <div
          style={{
            fontSize: 15,
            color: '#6a5a48',
            fontFamily: "'Georgia', 'SimSun', serif",
            lineHeight: 2.2,
            marginBottom: 32,
          }}
        >
          所有的相页都已翻过，所有的回忆都已寻回。
          <br />
          你终于明白——你就是那本相册的守护者，
          <br />
          而每一段回忆，都是你自己曾经拥有、又悄然遗忘的时光。
          <br />
          金箔碎片重新拼合，相册的光芒重新闪耀。
          <br />
          这一次，你不会再遗忘了。
        </div>
        <div style={{ fontSize: 20, marginBottom: 32 }}>
          {Array.from({ length: foilCount }).map((_, i) => (
            <span key={i} style={{ margin: '0 4px' }}>
              💎
            </span>
          ))}
        </div>
        <button
          onClick={handleRestart}
          style={{
            padding: '10px 28px',
            border: '1px solid rgba(180,160,130,0.5)',
            borderRadius: 6,
            background: 'linear-gradient(135deg, #faf4e6, #f0e4c8)',
            color: '#5a4a38',
            fontFamily: "'Georgia', 'SimSun', serif",
            fontSize: 14,
            cursor: 'pointer',
            letterSpacing: 2,
            transition: 'all 0.3s',
          }}
        >
          重新开始
        </button>
      </div>
    </div>
  )

  const renderMemoryOverlay = () => (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `rgba(80, 65, 45, ${memoryAlpha * 0.7})`,
        zIndex: 80,
        pointerEvents: 'none',
      }}
    >
      <canvas
        ref={grainCanvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: memoryAlpha * 0.6,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          maxWidth: 440,
          textAlign: 'center',
          opacity: memoryAlpha,
          transform: `translateY(${(1 - memoryAlpha) * 20}px)`,
          transition: 'opacity 0.1s, transform 0.1s',
          padding: 30,
        }}
      >
        <div
          style={{
            fontSize: 16,
            color: '#f0e4c8',
            fontFamily: "'Georgia', 'SimSun', serif",
            lineHeight: 2.2,
            letterSpacing: 1,
            textShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }}
        >
          {level.memory.text}
        </div>
      </div>
    </div>
  )

  const renderSolvedOverlay = () => (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(245, 240, 232, 0.5)',
        zIndex: 90,
        animation: 'fadeIn 0.8s ease-out',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          animation: 'fadeIn 1s ease-out',
        }}
      >
        <div style={{ fontSize: 14, color: '#c9a96e', letterSpacing: 4, marginBottom: 12 }}>
          ✦
        </div>
        <div
          style={{
            fontSize: 20,
            color: '#5a4a38',
            fontFamily: "'Georgia', 'SimSun', serif",
            fontWeight: 'bold',
            marginBottom: 8,
          }}
        >
          谜题已解
        </div>
        <div style={{ fontSize: 13, color: '#8a7a68' }}>
          金箔碎片浮现...
        </div>
      </div>
    </div>
  )

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        fontFamily: "'Georgia', 'SimSun', serif",
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {phase === 'title' && renderTitle()}
      {phase === 'ending' && renderEnding()}

      {(phase === 'playing' || phase === 'memory' || phase === 'puzzle' || phase === 'solved') && (
        <>
          <Scene
            level={level}
            onObjectClick={handleObjectClick}
            onAllObjectsClicked={handleAllObjectsClicked}
            puzzleSolved={phase === 'solved'}
            showHintFlash={showHintFlash}
            hoveredObject={hoveredObject}
            onHoverObject={setHoveredObject}
          />

          {phase === 'memory' && renderMemoryOverlay()}
          {phase === 'solved' && renderSolvedOverlay()}
          {phase === 'puzzle' && (
            <Puzzle
              puzzle={level.puzzle}
              onSolved={handlePuzzleSolved}
              onClose={() => setPhase('playing')}
            />
          )}

          <div
            style={{
              position: 'absolute',
              top: 20,
              left: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              zIndex: 50,
              pointerEvents: 'none',
            }}
          >
            <span style={{ fontSize: 18 }}>💎</span>
            <span
              style={{
                fontSize: 16,
                color: '#c9a96e',
                fontFamily: "'Georgia', 'SimSun', serif",
                fontWeight: 'bold',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)',
              }}
            >
              {foilCount}
            </span>
          </div>

          <div
            style={{
              position: 'absolute',
              top: 20,
              right: 24,
              zIndex: 50,
            }}
          >
            <button
              onClick={handleHint}
              disabled={hintsLeft <= 0}
              style={{
                padding: '8px 16px',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 8,
                background: hintsLeft > 0
                  ? 'rgba(255,255,255,0.2)'
                  : 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(8px)',
                color: hintsLeft > 0 ? '#5a4a38' : '#b0a090',
                fontFamily: "'Georgia', 'SimSun', serif",
                fontSize: 13,
                cursor: hintsLeft > 0 ? 'pointer' : 'default',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              💡 提示 ({hintsLeft})
            </button>
          </div>

          <div
            style={{
              position: 'absolute',
              top: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 50,
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                fontSize: 18,
                color: '#5a4a38',
                fontFamily: "'Georgia', 'SimSun', serif",
                fontWeight: 'bold',
                textShadow: '0 1px 2px rgba(0,0,0,0.08)',
              }}
            >
              {level.title}
            </div>
            <div
              style={{
                fontSize: 12,
                color: '#8a7a68',
                marginTop: 2,
              }}
            >
              {level.subtitle}
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: 28,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 50,
              pointerEvents: 'none',
              transition: 'opacity 0.3s',
              opacity: hoveredObj ? 0.85 : 0,
            }}
          >
            <div
              style={{
                padding: '6px 18px',
                borderRadius: 16,
                background: 'rgba(255,255,255,0.25)',
                backdropFilter: 'blur(6px)',
                fontSize: 14,
                color: '#5a4a38',
                fontFamily: "'Georgia', 'SimSun', serif",
                whiteSpace: 'nowrap',
              }}
            >
              {hoveredObj?.name}
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: 20,
              right: 24,
              zIndex: 50,
              fontSize: 12,
              color: '#b0a090',
              pointerEvents: 'none',
            }}
          >
            {clickedMemories.length} / {level.objects.length} 回忆
          </div>
        </>
      )}
    </div>
  )
}
