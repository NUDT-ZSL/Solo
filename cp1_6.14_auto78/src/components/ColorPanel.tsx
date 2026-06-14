import { useState, useCallback, useRef } from 'react'
import type { ThemeVariable } from '../hooks/useTheme'

const PRESET_COLORS = [
  '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c',
  '#3498db', '#9b59b6', '#6c5ce7', '#fd79a8', '#e84393',
  '#00cec9', '#55efc4', '#81ecec', '#74b9ff', '#a29bfe',
  '#ffeaa7', '#fab1a0', '#ff7675', '#dfe6e9', '#636e72',
]

interface ColorPanelProps {
  onColorDrop: (variable: ThemeVariable, color: string) => void
  onCustomColor: (color: string) => void
}

export default function ColorPanel({ onColorDrop, onCustomColor }: ColorPanelProps) {
  const [tooltip, setTooltip] = useState<{ color: string; x: number; y: number } | null>(null)
  const [customColor, setCustomColor] = useState('#6c5ce7')
  const colorInputRef = useRef<HTMLInputElement>(null)
  const dragPreviewRef = useRef<HTMLDivElement | null>(null)

  const handleDragStart = useCallback((e: React.DragEvent, color: string) => {
    e.dataTransfer.setData('text/plain', color)
    e.dataTransfer.effectAllowed = 'copy'

    const preview = document.createElement('div')
    preview.style.width = '48px'
    preview.style.height = '48px'
    preview.style.borderRadius = '50%'
    preview.style.backgroundColor = color
    preview.style.opacity = '0.7'
    preview.style.position = 'absolute'
    preview.style.top = '-1000px'
    document.body.appendChild(preview)
    e.dataTransfer.setDragImage(preview, 24, 24)
    dragPreviewRef.current = preview

    setTimeout(() => {
      if (dragPreviewRef.current && dragPreviewRef.current.parentNode) {
        dragPreviewRef.current.parentNode.removeChild(dragPreviewRef.current)
        dragPreviewRef.current = null
      }
    }, 0)
  }, [])

  const handleDragEnd = useCallback(() => {
    if (dragPreviewRef.current && dragPreviewRef.current.parentNode) {
      dragPreviewRef.current.parentNode.removeChild(dragPreviewRef.current)
      dragPreviewRef.current = null
    }
  }, [])

  const handleCustomDragStart = useCallback((e: React.DragEvent) => {
    handleDragStart(e, customColor)
  }, [customColor, handleDragStart])

  const handleCustomColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value
    setCustomColor(color)
    onCustomColor(color)
  }, [onCustomColor])

  const handleColorInputClick = useCallback(() => {
    colorInputRef.current?.click()
  }, [])

  return (
    <div style={{
      width: '280px',
      minWidth: '280px',
      height: '100%',
      backgroundColor: '#1e1e2e',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
      overflowY: 'auto',
      zIndex: 10,
    }}>
      <h2 style={{
        color: '#e0e0e0',
        fontSize: '16px',
        fontWeight: 600,
        letterSpacing: '0.5px',
        margin: 0,
      }}>
        颜色面板
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '10px',
        justifyContent: 'center',
      }}>
        {PRESET_COLORS.map((color) => (
          <div
            key={color}
            draggable
            onDragStart={(e) => handleDragStart(e, color)}
            onDragEnd={handleDragEnd}
            onMouseEnter={(e) => setTooltip({ color, x: e.clientX, y: e.clientY })}
            onMouseLeave={() => setTooltip(null)}
            onMouseMove={(e) => {
              if (tooltip) {
                setTooltip({ color, x: e.clientX, y: e.clientY })
              }
            }}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: color,
              cursor: 'grab',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              position: 'relative',
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.1) translateY(-2px)'
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 12px ${color}66`
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
            }}
          />
        ))}
      </div>

      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x + 12,
          top: tooltip.y - 32,
          backgroundColor: '#2a2a3e',
          color: '#e0e0e0',
          padding: '4px 8px',
          borderRadius: '6px',
          fontSize: '12px',
          fontFamily: "'Cascadia Code', monospace",
          pointerEvents: 'none',
          zIndex: 9999,
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}>
          {tooltip.color}
        </div>
      )}

      <div style={{
        borderTop: '1px solid #3a3a4e',
        paddingTop: '16px',
      }}>
        <label style={{
          color: '#a0a0b0',
          fontSize: '13px',
          display: 'block',
          marginBottom: '8px',
        }}>
          自定义取色器
        </label>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <div
            draggable
            onDragStart={handleCustomDragStart}
            onDragEnd={handleDragEnd}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: customColor,
              cursor: 'grab',
              border: '2px solid #3a3a4e',
              flexShrink: 0,
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.1) translateY(-2px)'
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 12px ${customColor}66`
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
            }}
          />
          <input
            ref={colorInputRef}
            type="color"
            value={customColor}
            onChange={handleCustomColorChange}
            style={{
              position: 'absolute',
              opacity: 0,
              width: 0,
              height: 0,
              pointerEvents: 'none',
            }}
          />
          <button
            onClick={handleColorInputClick}
            style={{
              flex: 1,
              height: '40px',
              borderRadius: '8px',
              border: '1px solid #3a3a4e',
              backgroundColor: '#2a2a3e',
              color: '#e0e0e0',
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: "'Cascadia Code', monospace",
              transition: 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'
              ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#353550'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
              ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#2a2a3e'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
            }}
          >
            {customColor}
          </button>
        </div>
      </div>

      <p style={{
        color: '#6a6a80',
        fontSize: '12px',
        lineHeight: 1.6,
        marginTop: 'auto',
      }}>
        拖拽色块到右侧组件上，即可实时覆盖对应CSS变量的色值
      </p>
    </div>
  )
}
