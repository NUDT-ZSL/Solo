import { useMemo } from 'react'
import type { PresetTemplate } from '../types'
import { useCityStore, PRESET_CONFIGS } from '../store/useCityStore'

interface ControlPanelProps {
  isMobile: boolean
  isDrawerOpen: boolean
  onToggleDrawer: () => void
}

const panelStyle: React.CSSProperties = {
  backgroundColor: '#1e293b',
  color: '#e2e8f0',
  borderRadius: 12,
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
  overflow: 'auto',
  height: '100%',
  boxSizing: 'border-box',
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
}

const sliderContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#94a3b8',
  fontWeight: 500
}

const valueStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#e2e8f0',
  fontWeight: 600,
  minWidth: 36,
  textAlign: 'right'
}

const sliderRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: '#f1f5f9',
  marginBottom: 4
}

const dividerStyle: React.CSSProperties = {
  height: 1,
  backgroundColor: '#334155',
  border: 'none'
}

function SliderInput({
  label,
  value,
  min,
  max,
  onChange
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div style={sliderContainerStyle}>
      <div style={sliderRowStyle}>
        <span style={labelStyle}>{label}</span>
        <span style={valueStyle}>{Math.round(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          accentColor: '#3b82f6',
          cursor: 'pointer'
        }}
      />
    </div>
  )
}

function TemplateButton({
  template,
  name,
  isActive,
  onClick
}: {
  template: PresetTemplate
  name: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 14px',
        borderRadius: 8,
        border: 'none',
        backgroundColor: isActive ? '#2563eb' : '#3b82f6',
        color: '#ffffff',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        width: '100%',
        textAlign: 'left',
        boxShadow: isActive ? '0 0 0 2px rgba(147, 197, 253, 0.5)' : 'none'
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#2563eb'
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.0)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = isActive ? '#2563eb' : '#3b82f6'
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
      }}
      onMouseDown={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'
      }}
      onMouseUp={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.0)'
      }}
    >
      {name}
    </button>
  )
}

export default function ControlPanel({ isMobile, isDrawerOpen, onToggleDrawer }: ControlPanelProps) {
  const buildings = useCityStore((s) => s.buildings)
  const selectedIds = useCityStore((s) => s.selectedIds)
  const selectedCount = useCityStore((s) => s.selectedCount)
  const currentTemplate = useCityStore((s) => s.currentTemplate)
  const updateBuilding = useCityStore((s) => s.updateBuilding)
  const batchUpdateHeight = useCityStore((s) => s.batchUpdateHeight)
  const batchUpdateColor = useCityStore((s) => s.batchUpdateColor)
  const setTemplate = useCityStore((s) => s.setTemplate)

  const selectedBuildings = useMemo(
    () => buildings.filter((b) => selectedIds.has(b.id)),
    [buildings, selectedIds]
  )

  const singleBuilding = selectedBuildings.length === 1 ? selectedBuildings[0] : null

  const handleHeightChange = (v: number) => {
    if (singleBuilding) {
      updateBuilding(singleBuilding.id, { height: v })
    } else if (selectedBuildings.length > 1) {
      batchUpdateHeight(v)
    }
  }

  const handleWidthChange = (v: number) => {
    if (singleBuilding) {
      updateBuilding(singleBuilding.id, { width: v })
    }
  }

  const handleDepthChange = (v: number) => {
    if (singleBuilding) {
      updateBuilding(singleBuilding.id, { depth: v })
    }
  }

  const handleColorChange = (color: string) => {
    if (singleBuilding) {
      updateBuilding(singleBuilding.id, { color })
    } else if (selectedBuildings.length > 1) {
      batchUpdateColor(color)
    }
  }

  const commonHeight = selectedBuildings.length > 0
    ? selectedBuildings.reduce((acc, b) => acc + b.height, 0) / selectedBuildings.length
    : 50

  const commonColor = singleBuilding ? singleBuilding.color : '#4a90d9'

  const presetKeys = Object.keys(PRESET_CONFIGS) as PresetTemplate[]

  const drawerContentStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed' as const,
        left: 0,
        right: 0,
        bottom: 0,
        height: isDrawerOpen ? '70vh' : 300,
        maxHeight: '85vh',
        borderRadius: '16px 16px 0 0',
        transform: isDrawerOpen ? 'translateY(0)' : 'translateY(0)',
        transition: 'height 0.3s ease',
        zIndex: 1000,
        touchAction: 'none'
      }
    : {
        width: '100%',
        height: '100%'
      }

  return (
    <div style={{ ...panelStyle, ...drawerContentStyle }}>
      {isMobile && (
        <div
          onClick={onToggleDrawer}
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '4px 0 12px 0',
            cursor: 'row-resize',
            userSelect: 'none'
          }}
        >
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: '#64748b'
            }}
          />
        </div>
      )}

      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8
          }}
        >
          <h1
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#f8fafc',
              margin: 0
            }}
          >
            城市天际线编辑器
          </h1>
        </div>
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: '#334155',
            borderRadius: 8,
            fontSize: 14,
            color: '#93c5fd',
            fontWeight: 500
          }}
        >
          已选中：{selectedCount} 栋建筑
        </div>
      </div>

      <hr style={dividerStyle} />

      <div>
        <div style={sectionTitleStyle}>属性编辑</div>
        {selectedCount === 0 ? (
          <div
            style={{
              fontSize: 13,
              color: '#64748b',
              fontStyle: 'italic',
              padding: '8px 0'
            }}
          >
            点击建筑或按住 Shift + 拖拽框选多个建筑
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <SliderInput
              label="高度"
              value={commonHeight}
              min={20}
              max={120}
              onChange={handleHeightChange}
            />
            {singleBuilding && (
              <>
                <SliderInput
                  label="宽度"
                  value={singleBuilding.width}
                  min={10}
                  max={40}
                  onChange={handleWidthChange}
                />
                <SliderInput
                  label="深度"
                  value={singleBuilding.depth}
                  min={10}
                  max={40}
                  onChange={handleDepthChange}
                />
              </>
            )}

            <div style={sliderContainerStyle}>
              <span style={labelStyle}>颜色</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="color"
                  value={commonColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  style={{
                    width: 44,
                    height: 32,
                    border: 'none',
                    borderRadius: 6,
                    padding: 0,
                    cursor: 'pointer',
                    backgroundColor: 'transparent'
                  }}
                />
                <span style={{ fontSize: 13, color: '#94a3b8', textTransform: 'uppercase' }}>
                  {commonColor}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <hr style={dividerStyle} />

      <div>
        <div style={sectionTitleStyle}>预设场景</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {presetKeys.map((key) => (
            <TemplateButton
              key={key}
              template={key}
              name={PRESET_CONFIGS[key].name}
              isActive={currentTemplate === key}
              onClick={() => setTemplate(key)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
