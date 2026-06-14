import React from 'react'
import type { BrushType, BrushParams } from '../core/ParticleEngine'

interface ToolbarProps {
  currentBrush: BrushType
  brushParams: BrushParams
  onBrushChange: (type: BrushType, params?: BrushParams) => void
  isCollapsed: boolean
}

const brushConfig = [
  {
    type: 'spray' as BrushType,
    name: '喷枪',
    icon: '💨',
    paramKey: 'density',
    paramLabel: '密度',
    paramMin: 30,
    paramMax: 100,
    paramDefault: 65,
    paramUnit: '个/秒'
  },
  {
    type: 'vortex' as BrushType,
    name: '漩涡',
    icon: '🌀',
    paramKey: 'radius',
    paramLabel: '半径',
    paramMin: 40,
    paramMax: 120,
    paramDefault: 80,
    paramUnit: 'px'
  },
  {
    type: 'trail' as BrushType,
    name: '拖尾',
    icon: '✨',
    paramKey: 'length',
    paramLabel: '长度',
    paramMin: 50,
    paramMax: 200,
    paramDefault: 125,
    paramUnit: 'px'
  }
]

export const Toolbar: React.FC<ToolbarProps> = ({
  currentBrush,
  brushParams,
  onBrushChange,
  isCollapsed
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100%',
        width: isCollapsed ? 48 : 220,
        background: 'rgba(10, 10, 30, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        backdropFilter: 'blur(10px)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        padding: isCollapsed ? '8px 4px' : '16px 12px',
        gap: isCollapsed ? 8 : 12,
        transition: 'width 0.3s ease, padding 0.3s ease',
        margin: 8,
        boxSizing: 'border-box'
      }}
    >
      {brushConfig.map((brush) => {
        const isSelected = currentBrush === brush.type
        const paramValue = brushParams[brush.paramKey as keyof BrushParams] ?? brush.paramDefault

        return (
          <div key={brush.type}>
            <button
              onClick={() => onBrushChange(brush.type)}
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: isCollapsed ? 'column' : 'row',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                gap: isCollapsed ? 2 : 10,
                padding: isCollapsed ? '8px 4px' : '10px 12px',
                background: isSelected ? 'rgba(167, 139, 250, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                border: isSelected ? '2px solid #a78bfa' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 8,
                color: 'white',
                cursor: 'pointer',
                fontSize: isCollapsed ? 18 : 14,
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'brightness(1.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'brightness(1)'
              }}
            >
              <span style={{ fontSize: isCollapsed ? 20 : 18 }}>{brush.icon}</span>
              {!isCollapsed && (
                <span style={{ fontWeight: isSelected ? 600 : 400 }}>{brush.name}</span>
              )}
            </button>

            {isSelected && !isCollapsed && (
              <div style={{
                marginTop: 8,
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                  fontSize: 12,
                  color: 'rgba(255, 255, 255, 0.7)'
                }}>
                  <span>{brush.paramLabel}</span>
                  <span style={{ color: '#a78bfa', fontWeight: 600 }}>
                    {paramValue}{brush.paramUnit}
                  </span>
                </div>
                <input
                  type="range"
                  min={brush.paramMin}
                  max={brush.paramMax}
                  value={paramValue as number}
                  onChange={(e) => onBrushChange(brush.type, {
                    [brush.paramKey]: parseInt(e.target.value)
                  })}
                  style={{
                    width: '100%',
                    height: 4,
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 2,
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer',
                    accentColor: '#a78bfa'
                  }}
                />
              </div>
            )}
          </div>
        )
      })}

      {!isCollapsed && (
        <div style={{
          marginTop: 'auto',
          padding: '12px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: 11,
          color: 'rgba(255, 255, 255, 0.4)',
          lineHeight: 1.6
        }}>
          <div>左键绘制</div>
          <div>右键旋转视角</div>
          <div>滚轮缩放</div>
        </div>
      )}
    </div>
  )
}
