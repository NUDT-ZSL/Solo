import React, { useState, useEffect } from 'react'
import { type LevelScore, LEVEL_CONFIGS } from './utils/physics'

interface ControlPanelProps {
  energy: number
  maxEnergy: number
  currentLevel: number
  unlockedLevels: number[]
  fragmentsCollected: number
  totalFragments: number
  onReset: () => void
  onSelectLevel: (level: number) => void
  score: LevelScore | null
  showScore: boolean
  onContinue: () => void
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  energy,
  maxEnergy,
  currentLevel,
  unlockedLevels,
  fragmentsCollected,
  totalFragments,
  onReset,
  onSelectLevel,
  score,
  showScore,
  onContinue,
}) => {
  const [panelVisible, setPanelVisible] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [animEnergy, setAnimEnergy] = useState(energy)

  useEffect(() => {
    const timer = setTimeout(() => setAnimEnergy(energy), 50)
    return () => clearTimeout(timer)
  }, [energy])

  const energyPercent = (animEnergy / maxEnergy) * 100
  const energyColor = energyPercent > 50 ? '#64c8ff' : energyPercent > 25 ? '#ffa040' : '#ff4060'

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: expanded ? 280 : 220,
    background: 'rgba(15, 15, 40, 0.75)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(100, 180, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
    color: '#c8d8f0',
    fontFamily: '"Courier New", monospace',
    fontSize: 13,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: panelVisible ? 1 : 0,
    transform: panelVisible ? 'translateY(0)' : 'translateY(20px)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(100, 180, 255, 0.1)',
  }

  const energyBarOuter: React.CSSProperties = {
    width: '100%',
    height: 8,
    background: 'rgba(30, 30, 60, 0.8)',
    borderRadius: 4,
    overflow: 'hidden',
    border: '1px solid rgba(100, 180, 255, 0.15)',
  }

  const energyBarInner: React.CSSProperties = {
    height: '100%',
    width: `${energyPercent}%`,
    background: `linear-gradient(90deg, ${energyColor}80, ${energyColor})`,
    borderRadius: 4,
    transition: 'width 0.3s ease, background 0.3s ease',
    boxShadow: `0 0 8px ${energyColor}60`,
  }

  const btnStyle = (color: string): React.CSSProperties => ({
    background: `${color}20`,
    border: `1px solid ${color}40`,
    color: color,
    borderRadius: 8,
    padding: '6px 14px',
    cursor: 'pointer',
    fontFamily: '"Courier New", monospace',
    fontSize: 12,
    transition: 'all 0.2s ease',
  })

  const levelBtnStyle = (unlocked: boolean, selected: boolean): React.CSSProperties => ({
    width: 32,
    height: 32,
    borderRadius: 8,
    border: `1px solid ${selected ? 'rgba(100, 255, 200, 0.6)' : unlocked ? 'rgba(100, 180, 255, 0.3)' : 'rgba(80, 80, 100, 0.3)'}`,
    background: selected ? 'rgba(100, 255, 200, 0.15)' : unlocked ? 'rgba(100, 180, 255, 0.1)' : 'rgba(30, 30, 50, 0.5)',
    color: selected ? '#64ffc8' : unlocked ? '#a0c8ff' : '#505070',
    cursor: unlocked ? 'pointer' : 'not-allowed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: selected ? 'bold' : 'normal',
    transition: 'all 0.2s ease',
  })

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 11, opacity: 0.6, letterSpacing: 1 }}>能量</span>
        <span style={{ fontSize: 11, color: energyColor }}>{Math.floor(animEnergy)}/{maxEnergy}</span>
      </div>
      <div style={energyBarOuter}>
        <div style={energyBarInner} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 6 }}>
        <span style={{ fontSize: 11, opacity: 0.6, letterSpacing: 1 }}>恒星碎片</span>
        <span style={{ fontSize: 12, color: '#ffd864' }}>{fragmentsCollected}/{totalFragments}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 11, opacity: 0.6, letterSpacing: 1 }}>关卡</span>
        <span style={{ fontSize: 12, color: '#a0c8ff' }}>{LEVEL_CONFIGS[currentLevel - 1]?.name}</span>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {LEVEL_CONFIGS.map((_, i) => {
          const lvl = i + 1
          const unlocked = unlockedLevels.includes(lvl)
          const selected = lvl === currentLevel
          return (
            <button
              key={lvl}
              style={levelBtnStyle(unlocked, selected)}
              onClick={() => unlocked && onSelectLevel(lvl)}
              disabled={!unlocked}
            >
              {lvl}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          style={btnStyle('#ff6080')}
          onClick={onReset}
          onMouseEnter={e => (e.currentTarget.style.background = '#ff608030')}
          onMouseLeave={e => (e.currentTarget.style.background = '#ff608020')}
        >
          重置
        </button>
        <button
          style={btnStyle('#64c8ff')}
          onClick={() => setExpanded(!expanded)}
          onMouseEnter={e => (e.currentTarget.style.background = '#64c8ff30')}
          onMouseLeave={e => (e.currentTarget.style.background = '#64c8ff20')}
        >
          {expanded ? '收起' : '展开'}
        </button>
      </div>

      {showScore && score && (
        <div style={{
          marginTop: 14,
          paddingTop: 14,
          borderTop: '1px solid rgba(100, 180, 255, 0.15)',
          animation: 'fadeIn 0.4s ease',
        }}>
          <div style={{ fontSize: 14, color: '#64ffc8', marginBottom: 10, textAlign: 'center', fontWeight: 'bold' }}>
            关卡完成
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
            <div style={{ opacity: 0.6 }}>用时</div>
            <div style={{ textAlign: 'right' }}>{score.time.toFixed(1)}s</div>
            <div style={{ opacity: 0.6 }}>能量消耗</div>
            <div style={{ textAlign: 'right' }}>{score.energyUsed.toFixed(1)}</div>
            <div style={{ opacity: 0.6 }}>碎片收集</div>
            <div style={{ textAlign: 'right' }}>{score.fragmentsCollected}/{score.totalFragments}</div>
          </div>
          <div style={{ textAlign: 'center', marginTop: 10, fontSize: 22 }}>
            {Array.from({ length: 3 }, (_, i) => (
              <span key={i} style={{ color: i < score.starRating ? '#ffd864' : '#303050', margin: '0 2px' }}>★</span>
            ))}
          </div>
          <button
            style={{
              ...btnStyle('#64ffc8'),
              width: '100%',
              marginTop: 10,
              padding: '8px 0',
              textAlign: 'center',
            }}
            onClick={onContinue}
            onMouseEnter={e => (e.currentTarget.style.background = '#64ffc830')}
            onMouseLeave={e => (e.currentTarget.style.background = '#64ffc820')}
          >
            继续
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default ControlPanel
