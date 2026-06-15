import React from 'react'
import { EnsembleResult, INSTRUMENTS, InstrumentType, SummaryPanelProps } from '@/types'

export default function SummaryPanel({ result, onClose, onRestart }: SummaryPanelProps) {
  const renderHalfRing = () => {
    const instruments: InstrumentType[] = ['piano', 'violin', 'cello', 'flute', 'percussion']
    const svgWidth = instruments.length * 52
    const svgHeight = 40
    const ringSize = 48
    const strokeWidth = 6
    const radius = (ringSize - strokeWidth) / 2
    const center = ringSize / 2
    const gap = 4

    const maxVal = Math.max(...Object.values(result.instrumentActivity), 1)

    return (
      <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
        {instruments.map((inst, idx) => {
          const instConfig = INSTRUMENTS.find((i) => i.id === inst)!
          const value = result.instrumentActivity[inst]
          const pct = value / maxVal
          const cx = idx * (ringSize + gap) + center
          const cy = svgHeight - 2

          const startAngle = -180
          const fullAngle = -180 + 180 * pct
          const endAngleFull = 0

          const polarToCart = (angle: number) => {
            const rad = (angle * Math.PI) / 180
            return {
              x: cx + radius * Math.cos(rad),
              y: cy + radius * Math.sin(rad),
            }
          }

          const bgStart = polarToCart(startAngle)
          const bgEnd = polarToCart(endAngleFull)
          const fgStart = polarToCart(startAngle)
          const fgEnd = polarToCart(fullAngle)

          const bgArc = `M ${bgStart.x} ${bgStart.y} A ${radius} ${radius} 0 0 1 ${bgEnd.x} ${bgEnd.y}`
          const largeArc = pct > 0.5 ? 1 : 0
          const fgArc = `M ${fgStart.x} ${fgStart.y} A ${radius} ${radius} 0 ${largeArc} 1 ${fgEnd.x} ${fgEnd.y}`

          return (
            <g key={inst}>
              <path
                d={bgArc}
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
              <path
                d={fgArc}
                fill="none"
                stroke={instConfig.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                style={{ transition: 'all 0.5s ease-out' }}
              />
            </g>
          )
        })}
      </svg>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          width: '520px',
          height: '380px',
          borderRadius: '20px',
          backgroundColor: '#2d2d3d',
          backdropFilter: 'blur(8px)',
          padding: '32px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <h2
          style={{
            color: '#ffffff',
            fontSize: '28px',
            fontWeight: 'bold',
            marginBottom: '24px',
            fontFamily: "'Playfair Display', serif",
          }}
        >
          🎼 合奏完成！
        </h2>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '4px' }}>
            总时长
          </span>
          <span style={{ color: '#ffffff', fontSize: '36px', fontWeight: 'bold' }}>
            {result.totalDuration} 秒
          </span>
        </div>

        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <span
            style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '14px',
              marginBottom: '12px',
            }}
          >
            乐器活跃度
          </span>
          {renderHalfRing()}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '8px' }}>
            {INSTRUMENTS.map((inst) => (
              <div key={inst.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: inst.color,
                  }}
                />
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
                  {inst.name}
                </span>
                <span style={{ color: '#ffffff', fontSize: '12px', fontWeight: 'bold' }}>
                  {result.instrumentActivity[inst.id]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginTop: 'auto' }}>
          <button
            style={{
              padding: '10px 28px',
              border: 'none',
              borderRadius: '10px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease-out',
            }}
            onClick={onClose}
          >
            关闭
          </button>
          <button
            style={{
              padding: '10px 28px',
              border: 'none',
              borderRadius: '10px',
              backgroundColor: '#66bb6a',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease-out',
            }}
            onClick={onRestart}
          >
            重新开始
          </button>
        </div>
      </div>
    </div>
  )
}
