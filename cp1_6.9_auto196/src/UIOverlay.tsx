import React, { useState } from 'react'
import { PlantType, PLANT_CONFIGS, CellData } from './terrainGenerator'

interface UIOverlayProps {
  plantType: PlantType
  onPlantChange: (type: PlantType) => void
  zoomLevel: number
  selectedCell: CellData | null
  onResetView: () => void
}

const PLANT_OPTIONS: { value: PlantType; label: string; icon: string }[] = [
  { value: 'ginkgo', label: '银杏', icon: '🍃' },
  { value: 'rose', label: '玫瑰', icon: '🌹' },
  { value: 'waterLily', label: '睡莲', icon: '🪷' },
]

const PlantDropdown: React.FC<{
  plantType: PlantType
  onPlantChange: (type: PlantType) => void
}> = ({ plantType, onPlantChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const currentPlant = PLANT_OPTIONS.find((p) => p.value === plantType)

  return (
    <div
      style={{
        position: 'relative',
        width: 220,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '0.7'
        setIsOpen(false)
      }}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(255, 255, 255, 0.06)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '0.5px solid rgba(255, 215, 0, 0.3)',
          borderRadius: 10,
          padding: '14px 18px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 0 20px rgba(255, 215, 0, 0.08), inset 0 0 20px rgba(255,255,255,0.03)',
          transition: 'all 0.2s ease',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>{currentPlant?.icon}</span>
          <span
            style={{
              color: '#FFD700',
              fontSize: 15,
              fontWeight: 500,
              letterSpacing: 0.5,
            }}
          >
            {currentPlant?.label}
          </span>
        </div>
        <span
          style={{
            color: '#FFD700',
            fontSize: 12,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        >
          ▼
        </span>
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'rgba(11, 12, 16, 0.92)',
            backdropFilter: 'blur(15px)',
            WebkitBackdropFilter: 'blur(15px)',
            border: '0.5px solid rgba(255, 215, 0, 0.2)',
            borderRadius: 10,
            overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            zIndex: 100,
          }}
        >
          {PLANT_OPTIONS.map((opt) => {
            const config = PLANT_CONFIGS[opt.value]
            const isSelected = opt.value === plantType
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onPlantChange(opt.value)
                  setIsOpen(false)
                }}
                style={{
                  padding: '12px 18px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: isSelected ? 'rgba(255, 215, 0, 0.08)' : 'transparent',
                  transition: 'background 0.15s ease',
                  borderBottom:
                    opt.value !== PLANT_OPTIONS[PLANT_OPTIONS.length - 1].value
                      ? '0.5px solid rgba(255,255,255,0.06)'
                      : 'none',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = isSelected
                    ? 'rgba(255, 215, 0, 0.15)'
                    : 'rgba(255,255,255,0.05)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = isSelected
                    ? 'rgba(255, 215, 0, 0.08)'
                    : 'transparent')
                }
              >
                <span style={{ fontSize: 18 }}>{opt.icon}</span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      color: isSelected ? '#FFD700' : '#E0E0E0',
                      fontSize: 14,
                      fontWeight: 500,
                      marginBottom: 2,
                    }}
                  >
                    {opt.label}
                  </div>
                  <div
                    style={{
                      color: 'rgba(224,224,224,0.5)',
                      fontSize: 11,
                    }}
                  >
                    气孔密度 {(config.stomataDensity * 100).toFixed(0)}% · 细胞壁{' '}
                    {config.wallHeight.toFixed(1)}
                  </div>
                </div>
                {isSelected && (
                  <span style={{ color: '#FFD700', fontSize: 14 }}>✓</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const CellInfoCard: React.FC<{ cell: CellData }> = ({ cell }) => {
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  React.useEffect(() => {
    const mountTimer = setTimeout(() => setMounted(true), 10)
    const visTimer = setTimeout(() => setVisible(true), 20)
    return () => {
      clearTimeout(mountTimer)
      clearTimeout(visTimer)
    }
  }, [cell.id])

  const rows = [
    { label: '细胞编号', value: `#${String(cell.id).padStart(4, '0')}`, highlight: true },
    { label: '面积（相对单位）', value: cell.area.toFixed(2), highlight: false },
    { label: '周长（边数）', value: `${cell.vertices.length} 边`, highlight: false },
    {
      label: '是否含气孔',
      value: cell.hasStomata ? '✓ 含气孔' : '✗ 无气孔',
      highlight: cell.hasStomata,
    },
  ]

  return (
    <div
      style={{
        width: 280,
        background: 'rgba(255,255,255,0.15)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: 12,
        border: '0.5px solid rgba(255,255,255,0.18)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
        padding: '20px 22px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'all 0.3s cubic-bezier(0.25,0.46,0.45,0.94)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.92')}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: '0.5px solid rgba(255,255,255,0.1)',
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#FFD700',
            letterSpacing: 1,
          }}
        >
          ◈ 细胞结构参数
        </div>
        {cell.hasStomata && (
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#FF8A65',
              boxShadow: '0 0 10px #FF8A65',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map((row, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                color: 'rgba(224,224,224,0.6)',
                fontSize: 12,
              }}
            >
              {row.label}
            </span>
            <span
              style={{
                color: row.highlight ? '#FFD700' : '#E0E0E0',
                fontSize: 13,
                fontWeight: row.highlight ? 600 : 400,
                fontFamily: 'monospace',
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {cell.hasStomata && cell.stomataRadius && (
        <div
          style={{
            marginTop: 14,
            padding: '10px 12px',
            background: 'rgba(255, 138, 101, 0.1)',
            borderRadius: 8,
            border: '0.5px solid rgba(255, 138, 101, 0.3)',
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: 'rgba(255, 138, 101, 0.8)',
              marginBottom: 3,
            }}
          >
            气孔半径
          </div>
          <div style={{ fontSize: 12, color: '#FFAB91', fontFamily: 'monospace' }}>
            {cell.stomataRadius.toFixed(2)} 单位
          </div>
        </div>
      )}
    </div>
  )
}

const UIOverlay: React.FC<UIOverlayProps> = ({
  plantType,
  onPlantChange,
  zoomLevel,
  selectedCell,
  onResetView,
}) => {
  const zoomPercentage = Math.round(zoomLevel * 100)

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 24,
            left: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            pointerEvents: 'auto',
            opacity: 0.7,
            transition: 'opacity 0.2s ease',
          }}
        >
          <PlantDropdown plantType={plantType} onPlantChange={onPlantChange} />

          <div
            style={{
              width: 220,
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              padding: '14px 18px',
              opacity: 0.7,
              transition: 'opacity 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  color: 'rgba(224,224,224,0.6)',
                  fontSize: 11,
                  letterSpacing: 1,
                }}
              >
                缩放比例
              </span>
              <span
                style={{
                  color: '#64B5F6',
                  fontSize: 16,
                  fontWeight: 600,
                  fontFamily: 'monospace',
                }}
              >
                {zoomPercentage}%
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: 4,
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, Math.max(10, (zoomLevel / 5) * 100))}%`,
                  background: 'linear-gradient(90deg, #64B5F6, #FFD700)',
                  borderRadius: 2,
                  transition: 'width 0.1s linear',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 6,
                fontSize: 10,
                color: 'rgba(224,224,224,0.35)',
              }}
            >
              <span>50%</span>
              <span>500%</span>
            </div>
          </div>

          <button
            onClick={onResetView}
            style={{
              width: 220,
              background: 'rgba(100, 181, 246, 0.1)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '0.5px solid rgba(100, 181, 246, 0.3)',
              borderRadius: 10,
              padding: '12px 18px',
              color: '#64B5F6',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              letterSpacing: 0.5,
              transition: 'all 0.2s ease',
              opacity: 0.7,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1'
              e.currentTarget.style.background = 'rgba(100, 181, 246, 0.2)'
              e.currentTarget.style.boxShadow = '0 0 20px rgba(100, 181, 246, 0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.7'
              e.currentTarget.style.background = 'rgba(100, 181, 246, 0.1)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            ⟲ 重置视角
          </button>
        </div>

        <div
          style={{
            position: 'absolute',
            top: 24,
            right: 24,
            textAlign: 'right',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 300,
              color: '#E0E0E0',
              letterSpacing: 3,
              marginBottom: 4,
            }}
          >
            叶脉微境
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'rgba(224,224,224,0.4)',
              letterSpacing: 6,
            }}
          >
            EPIDERMIS TERRAIN
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 24,
            left: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: 'rgba(224,224,224,0.35)',
              letterSpacing: 1,
            }}
          >
            拖拽 · 旋转视角
          </div>
          <div
            style={{
              fontSize: 10,
              color: 'rgba(224,224,224,0.35)',
              letterSpacing: 1,
            }}
          >
            滚轮 · 缩放探索
          </div>
          <div
            style={{
              fontSize: 10,
              color: 'rgba(224,224,224,0.35)',
              letterSpacing: 1,
            }}
          >
            点击 · 查看细胞
          </div>
        </div>

        {selectedCell && (
          <div
            style={{
              position: 'absolute',
              bottom: 24,
              right: 24,
              pointerEvents: 'auto',
            }}
          >
            <CellInfoCard cell={selectedCell} />
          </div>
        )}
      </div>
    </>
  )
}

export default UIOverlay
