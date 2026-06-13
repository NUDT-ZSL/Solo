import React from 'react'
import type { MineralType } from './gameEngine'

export interface GameUIState {
  score: number
  health: number
  maxHealth: number
  weaponLevel: number
  minerals: Record<MineralType, number>
  gameOver: boolean
}

const mineralLabels: Record<MineralType, { color: string; name: string }> = {
  iron: { color: '#fb923c', name: 'Fe' },
  silicon: { color: '#93c5fd', name: 'Si' },
  rare: { color: '#c084fc', name: 'Re' },
}

const upgradeThresholds: Record<MineralType, number> = {
  iron: 50,
  silicon: 30,
  rare: 20,
}

const HUDContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
    {children}
  </div>
)

const TopRightPanel: React.FC<GameUIState> = ({ score, health, maxHealth, weaponLevel, minerals }) => {
  const healthPct = Math.max(0, Math.min(100, (health / maxHealth) * 100))

  return (
    <div style={{
      position: 'absolute',
      top: 16,
      right: 16,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 8,
    }}>
      <div style={{
        color: '#fef3c7',
        fontSize: 22,
        fontWeight: 'bold',
        textShadow: '0 0 8px rgba(254,243,199,0.4)',
        letterSpacing: 1,
      }}>
        {score.toLocaleString()}
      </div>

      <div style={{
        width: 200,
        height: 16,
        backgroundColor: '#7f1d1d',
        borderRadius: 4,
        overflow: 'hidden',
        border: '1px solid #450a0a',
        position: 'relative',
      }}>
        <div style={{
          width: `${healthPct}%`,
          height: '100%',
          background: healthPct > 50
            ? `linear-gradient(to right, #22c55e, #4ade80)`
            : healthPct > 25
              ? `linear-gradient(to right, #eab308, #facc15)`
              : `linear-gradient(to right, #dc2626, #ef4444)`,
          borderRadius: 4,
          transition: 'width 0.3s ease',
        }} />
        <span style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#fff',
          fontSize: 10,
          fontWeight: 'bold',
          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
        }}>
          {Math.ceil(health)} / {maxHealth}
        </span>
      </div>

      <div style={{
        color: '#67e8f9',
        fontSize: 18,
        fontWeight: 'bold',
        textShadow: '0 0 6px rgba(103,232,249,0.5)',
      }}>
        Lv.{weaponLevel}
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        padding: '8px 12px',
        borderRadius: 8,
        border: '1px solid #1e3a5f',
      }}>
        {(['iron', 'silicon', 'rare'] as MineralType[]).map(type => {
          const info = mineralLabels[type]
          const threshold = upgradeThresholds[type]
          const count = minerals[type]
          const progress = Math.min(count / threshold, 1)
          return (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 12,
                height: 12,
                backgroundColor: info.color,
                borderRadius: 2,
                flexShrink: 0,
                boxShadow: `0 0 4px ${info.color}`,
              }} />
              <span style={{ color: '#cbd5e1', fontSize: 13, width: 24, textAlign: 'right' }}>{count}</span>
              <div style={{
                width: 60,
                height: 6,
                backgroundColor: 'rgba(30,41,59,0.8)',
                borderRadius: 3,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${progress * 100}%`,
                  height: '100%',
                  backgroundColor: info.color,
                  borderRadius: 3,
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <span style={{ color: '#64748b', fontSize: 10 }}>{threshold}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const ControlHints: React.FC = () => (
  <div style={{
    position: 'absolute',
    left: 16,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 200,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 12,
    border: '1px solid #334155',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  }}>
    <div style={{ color: '#94a3b8', fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>Controls</div>
    <div style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>
      <span style={{ color: '#67e8f9' }}>W A S D</span> Move
    </div>
    <div style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>
      <span style={{ color: '#67e8f9' }}>Mouse</span> Aim
    </div>
    <div style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>
      <span style={{ color: '#67e8f9' }}>Left Click</span> Shoot
    </div>
    <div style={{ color: '#64748b', fontSize: 11, lineHeight: 1.5, marginTop: 8, borderTop: '1px solid #1e293b', paddingTop: 8 }}>
      Collect minerals to upgrade your ship
    </div>
  </div>
)

const UpgradeInfo: React.FC = () => (
  <div style={{
    position: 'absolute',
    left: 16,
    bottom: 16,
    width: 200,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: 8,
    border: '1px solid #1e293b',
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  }}>
    <div style={{ color: '#64748b', fontSize: 11, fontWeight: 'bold', marginBottom: 2 }}>Upgrades</div>
    <div style={{ color: '#fb923c', fontSize: 11 }}>Fe x50 → Speed +5%</div>
    <div style={{ color: '#93c5fd', fontSize: 11 }}>Si x30 → HP +10</div>
    <div style={{ color: '#c084fc', fontSize: 11 }}>Re x20 → Weapon Lv.Up</div>
  </div>
)

export const GameUI: React.FC<GameUIState> = (props) => {
  return (
    <HUDContainer>
      <TopRightPanel {...props} />
      {!props.gameOver && <ControlHints />}
      {!props.gameOver && <UpgradeInfo />}
    </HUDContainer>
  )
}
