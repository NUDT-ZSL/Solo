import React from 'react'
import type { GameState } from './GameEngine'
import { LEVELS } from './LevelData'

interface UIProps {
  gameState: GameState
  onSelectLevel: (index: number) => void
  onGoToMenu: () => void
  onUseHourglass: () => void
  echoCount: number
  activatedCount: number
  requiredCount: number
  currentLevelName: string
  currentLevelHint: string
}

export const GameUI: React.FC<UIProps> = ({
  gameState,
  onSelectLevel,
  onGoToMenu,
  onUseHourglass,
  echoCount,
  activatedCount,
  requiredCount,
  currentLevelName,
  currentLevelHint,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        userSelect: 'none',
      }}
    >
      {gameState.status === 'playing' || gameState.status === 'paused' || gameState.status === 'levelComplete' || gameState.status === 'dead' ? (
        <>
          <div
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              background: '#00000055',
              padding: '12px 18px',
              borderRadius: 10,
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(0, 168, 255, 0.25)',
              pointerEvents: 'auto',
              minWidth: 240,
            }}
          >
            <div
              style={{
                color: '#ffffff',
                fontSize: 16,
                fontWeight: 600,
                marginBottom: 6,
                textShadow: '0 0 10px rgba(0, 168, 255, 0.6)',
              }}
            >
              {currentLevelName}
            </div>
            <div
              style={{
                color: '#88ccff',
                fontSize: 13,
                marginBottom: 10,
                opacity: 0.9,
              }}
            >
              💡 {currentLevelHint}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div
                style={{
                  color: activatedCount >= requiredCount ? '#00ff88' : '#ffd700',
                  fontSize: 14,
                  fontWeight: 600,
                  textShadow: activatedCount >= requiredCount ? '0 0 8px rgba(0, 255, 136, 0.7)' : '0 0 8px rgba(255, 215, 0, 0.5)',
                }}
              >
                Progress: {activatedCount} / {requiredCount}
              </div>
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 10,
              pointerEvents: 'auto',
            }}
          >
            <button
              onClick={onGoToMenu}
              style={{
                background: '#00000055',
                color: '#aaccff',
                border: '1px solid rgba(0, 168, 255, 0.3)',
                padding: '8px 16px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 13,
                backdropFilter: 'blur(8px)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 168, 255, 0.2)'
                e.currentTarget.style.color = '#ffffff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#00000055'
                e.currentTarget.style.color = '#aaccff'
              }}
            >
              ≡ Menu
            </button>

            <div
              style={{
                background: '#00000055',
                padding: 14,
                borderRadius: 12,
                backdropFilter: 'blur(8px)',
                border: `1px solid ${gameState.hourglassReady ? 'rgba(255, 215, 0, 0.5)' : 'rgba(100, 100, 100, 0.3)'}`,
                cursor: gameState.hourglassReady ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                opacity: gameState.hourglassReady ? 1 : 0.85,
              }}
              onClick={() => gameState.hourglassReady && onUseHourglass()}
              onMouseEnter={(e) => {
                if (gameState.hourglassReady) {
                  e.currentTarget.style.background = 'rgba(255, 215, 0, 0.15)'
                  e.currentTarget.style.transform = 'scale(1.05)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#00000055'
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              <HourglassIcon ready={gameState.hourglassReady} cooldown={gameState.hourglassCooldown} />
              <div
                style={{
                  color: gameState.hourglassReady ? '#ffd700' : '#888',
                  fontSize: 11,
                  textAlign: 'center',
                  marginTop: 6,
                  fontWeight: 600,
                }}
              >
                {gameState.hourglassReady
                  ? 'Hourglass'
                  : `${Math.ceil(gameState.hourglassCooldown / 1000)}s`}
              </div>
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#00000055',
              padding: '10px 24px',
              borderRadius: 20,
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(0, 168, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 24,
            }}
          >
            <div style={{ color: '#ffffff', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#ffffff',
                  boxShadow: '0 0 8px #ffffff',
                }}
              />
              Player: 1
            </div>
            <div style={{ color: '#00d4ff', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#00d4ff',
                  boxShadow: '0 0 8px #00d4ff',
                }}
              />
              Echoes: {echoCount} / 3
            </div>
            <div style={{ color: '#888', fontSize: 12, borderLeft: '1px solid #333', paddingLeft: 20 }}>
              <span style={{ color: '#66aadd' }}>WASD</span> Move · <span style={{ color: '#66aadd' }}>Space</span> Echo · <span style={{ color: '#66aadd' }}>P</span> Pause · <span style={{ color: '#66aadd' }}>R</span> Reset
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              color: 'rgba(255,255,255,0.3)',
              fontSize: 11,
            }}
          >
            FPS: {gameState.fps}
          </div>
        </>
      ) : null}

      {gameState.status === 'menu' && (
        <MainMenu
          gameState={gameState}
          onSelectLevel={onSelectLevel}
        />
      )}
    </div>
  )
}

const HourglassIcon: React.FC<{ ready: boolean; cooldown: number }> = ({ ready, cooldown }) => {
  const COOLDOWN_TOTAL = 30000
  const effectivelyReady = ready || cooldown <= 0
  const progress = effectivelyReady ? 0 : Math.max(0, Math.min(1, 1 - cooldown / COOLDOWN_TOTAL))
  const svgSize = 48
  const center = svgSize / 2
  const ringRadius = 22
  const strokeWidth = 3

  const drawRing = () => {
    if (effectivelyReady) return null
    const circumference = 2 * Math.PI * ringRadius
    const offset = circumference * (1 - progress)
    return (
      <circle
        cx={center}
        cy={center}
        r={ringRadius}
        fill="none"
        stroke="#ffd700"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        opacity={0.85}
        transform={`rotate(-90 ${center} ${center})`}
      />
    )
  }

  const drawBgRing = () => {
    if (effectivelyReady) return null
    return (
      <circle
        cx={center}
        cy={center}
        r={ringRadius}
        fill="none"
        stroke="#333"
        strokeWidth={strokeWidth}
        opacity={0.5}
      />
    )
  }

  return (
    <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} fill="none">
      <defs>
        <linearGradient id="hgGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={effectivelyReady ? '#ffd700' : '#666'} />
          <stop offset="100%" stopColor={effectivelyReady ? '#ff8c00' : '#444'} />
        </linearGradient>
      </defs>

      {drawBgRing()}
      {drawRing()}

      {!effectivelyReady && (
        <text
          x={center}
          y={center + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#ffd700"
          fontSize="14"
          fontWeight="bold"
          opacity={0.9}
        >
          {Math.max(1, Math.ceil(cooldown / 1000))}
        </text>
      )}

      {effectivelyReady && (
        <text
          x={center}
          y={center + 18}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#ffd700"
          fontSize="9"
          fontWeight="bold"
          opacity={0.95}
        >
          READY
        </text>
      )}

      <g opacity={effectivelyReady ? 1 : 0.4}>
        <rect x="10" y="4" width="28" height="4" rx="1" fill="url(#hgGold)" />
        <rect x="10" y="40" width="28" height="4" rx="1" fill="url(#hgGold)" />
        <path
          d="M12 8 L24 24 L12 40"
          stroke="url(#hgGold)"
          strokeWidth="2.5"
          fill="none"
          strokeLinejoin="round"
        />
        <path
          d="M36 8 L24 24 L36 40"
          stroke="url(#hgGold)"
          strokeWidth="2.5"
          fill="none"
          strokeLinejoin="round"
        />
      </g>

      {effectivelyReady && (
        <>
          <circle cx="17" cy="13" r="1.5" fill="#ffd700">
            <animate attributeName="cy" values="13;22;13" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="20" cy="11" r="1" fill="#ffd700">
            <animate attributeName="cy" values="11;23;11" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="14" cy="15" r="1" fill="#ffaa00">
            <animate attributeName="cy" values="15;21;15" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="24" cy="25" r="1.2" fill="#ffd700">
            <animate attributeName="cy" values="25;35;25" dur="1.2s" repeatCount="indefinite" />
          </circle>
          <circle cx="28" cy="30" r="1.5" fill="#ffaa00" opacity="0.8">
            <animate attributeName="cy" values="30;38;30" dur="1.6s" repeatCount="indefinite" />
          </circle>
          <circle cx="31" cy="32" r="1" fill="#ffd700">
            <animate attributeName="cy" values="32;37;32" dur="1.4s" repeatCount="indefinite" />
          </circle>
        </>
      )}
    </svg>
  )
}

const MainMenu: React.FC<{
  gameState: GameState
  onSelectLevel: (index: number) => void
}> = ({ gameState, onSelectLevel }) => {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 30,
      }}
    >
      <div
        style={{
          color: '#ffffff',
          fontSize: 72,
          fontWeight: 900,
          letterSpacing: 8,
          textShadow: '0 0 30px #00a8ff, 0 0 60px rgba(0, 168, 255, 0.5)',
          marginBottom: 10,
        }}
      >
        EchoRift
      </div>
      <div
        style={{
          color: '#88ccff',
          fontSize: 18,
          letterSpacing: 3,
          opacity: 0.8,
          marginBottom: 20,
        }}
      >
        A PUZZLE OF MIRRORS AND ECHOES
      </div>

      <div
        style={{
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 168, 255, 0.3)',
          borderRadius: 16,
          padding: 32,
          width: 480,
          boxShadow: '0 0 40px rgba(0, 168, 255, 0.1)',
        }}
      >
        <div
          style={{
            color: '#ffffff',
            fontSize: 20,
            fontWeight: 600,
            marginBottom: 20,
            textAlign: 'center',
          }}
        >
          Select Level
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {LEVELS.map((level, index) => {
            const completed = gameState.levelCompleted[index]
            const isFlashing = completed
            return (
              <button
                key={level.id}
                onClick={() => onSelectLevel(index)}
                style={{
                  background: isFlashing
                    ? `rgba(255, 215, 0, ${0.15 + 0.1 * Math.sin(Date.now() * 0.005 + index)})`
                    : 'rgba(0, 168, 255, 0.08)',
                  border: `2px solid ${isFlashing ? '#ffd700' : 'rgba(0, 168, 255, 0.3)'}`,
                  borderRadius: 10,
                  padding: '14px 20px',
                  color: isFlashing ? '#ffd700' : '#ffffff',
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                  boxShadow: isFlashing
                    ? `0 0 ${12 + 8 * Math.sin(Date.now() * 0.008 + index)}px rgba(255, 215, 0, 0.4)`
                    : 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isFlashing
                    ? 'rgba(255, 215, 0, 0.3)'
                    : 'rgba(0, 168, 255, 0.25)'
                  e.currentTarget.style.transform = 'translateX(4px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isFlashing
                    ? `rgba(255, 215, 0, ${0.15 + 0.1 * Math.sin(Date.now() * 0.005 + index)})`
                    : 'rgba(0, 168, 255, 0.08)'
                  e.currentTarget.style.transform = 'translateX(0)'
                }}
              >
                <span>
                  {completed && <span style={{ marginRight: 8 }}>⭐</span>}
                  {level.name}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: isFlashing ? '#ffe066' : '#88aacc',
                    fontWeight: 400,
                    maxWidth: 200,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {level.hint}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div
        style={{
          color: 'rgba(136, 204, 255, 0.6)',
          fontSize: 13,
          maxWidth: 500,
          textAlign: 'center',
          lineHeight: 1.8,
          marginTop: 10,
        }}
      >
        <p>🌊 Navigate the labyrinth using <strong style={{color:'#fff'}}>WASD</strong></p>
        <p>👻 Press <strong style={{color:'#fff'}}>Space</strong> to leave an Echo that replays your last 2 seconds</p>
        <p>⚙️ Activate all mechanisms to open the golden exit</p>
      </div>
    </div>
  )
}
