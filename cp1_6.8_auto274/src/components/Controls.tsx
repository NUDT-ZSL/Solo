import { useCallback } from 'react'
import { exportCanvas } from '../utils/drawUtils'

interface ControlsProps {
  color: string
  setColor: (c: string) => void
  width: number
  setWidth: (w: number) => void
  onClear: () => void
  onExport: () => void
}

const PRESET_COLORS = [
  '#00c8ff',
  '#00ffcc',
  '#7b61ff',
  '#ff00ff',
  '#ff3366',
  '#ffaa00',
  '#00ff66',
  '#ffffff',
]

export default function Controls({
  color,
  setColor,
  width,
  setWidth,
  onClear,
  onExport,
}: ControlsProps) {
  const handleExport = useCallback(() => {
    onExport()
  }, [onExport])

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(15, 5, 30, 0.65)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '18px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 60px rgba(120,0,255,0.1), inset 0 1px 0 rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.08)',
        zIndex: 10,
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '12px',
            fontWeight: 500,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}
        >
          颜色
        </span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: color === c ? '2px solid #fff' : '2px solid rgba(255,255,255,0.15)',
                background: c,
                cursor: 'pointer',
                boxShadow:
                  color === c
                    ? `0 0 12px ${c}, 0 0 24px ${c}40`
                    : `0 0 6px ${c}40`,
                transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                transform: color === c ? 'scale(1.2)' : 'scale(1)',
                padding: 0,
                outline: 'none',
              }}
            />
          ))}
          <label
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              border: '2px dashed rgba(255,255,255,0.3)',
              background: `conic-gradient(red, yellow, lime, aqua, blue, magenta, red)`,
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0,
                cursor: 'pointer',
                width: '100%',
                height: '100%',
              }}
            />
          </label>
        </div>
      </div>

      <div
        style={{
          width: '1px',
          height: '28px',
          background: 'rgba(255,255,255,0.1)',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '12px',
            fontWeight: 500,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}
        >
          粗细
        </span>
        <input
          type="range"
          min={2}
          max={20}
          step={1}
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
          style={{
            width: '100px',
            accentColor: color,
            cursor: 'pointer',
          }}
        />
        <span
          style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '12px',
            fontFamily: 'monospace',
            minWidth: '30px',
            textAlign: 'center',
          }}
        >
          {width}px
        </span>
      </div>

      <div
        style={{
          width: '1px',
          height: '28px',
          background: 'rgba(255,255,255,0.1)',
        }}
      />

      <button
        onClick={onClear}
        style={{
          background: 'rgba(255,50,80,0.15)',
          border: '1px solid rgba(255,50,80,0.3)',
          borderRadius: '10px',
          color: '#ff5070',
          padding: '8px 16px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
          outline: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,50,80,0.3)'
          e.currentTarget.style.boxShadow = '0 0 16px rgba(255,50,80,0.3)'
          e.currentTarget.style.transform = 'scale(1.05)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,50,80,0.15)'
          e.currentTarget.style.boxShadow = 'none'
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        清空画布
      </button>

      <button
        onClick={handleExport}
        style={{
          background: 'rgba(0,200,255,0.15)',
          border: '1px solid rgba(0,200,255,0.3)',
          borderRadius: '10px',
          color: '#00c8ff',
          padding: '8px 16px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
          outline: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(0,200,255,0.3)'
          e.currentTarget.style.boxShadow = '0 0 16px rgba(0,200,255,0.3)'
          e.currentTarget.style.transform = 'scale(1.05)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(0,200,255,0.15)'
          e.currentTarget.style.boxShadow = 'none'
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        导出图片
      </button>
    </div>
  )
}
