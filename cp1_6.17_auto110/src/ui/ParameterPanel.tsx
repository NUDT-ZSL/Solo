import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../store'
import type { PhysicsParams } from '../types'

interface SliderConfig {
  key: keyof PhysicsParams
  label: string
  min: number
  max: number
  step: number
}

const sliders: SliderConfig[] = [
  { key: 'gravity', label: '重力', min: 300, max: 1200, step: 50 },
  { key: 'jumpForce', label: '跳跃力', min: 200, max: 600, step: 10 },
  { key: 'horizontalSpeed', label: '水平速度', min: 100, max: 400, step: 10 }
]

export function ParameterPanel() {
  const { params, setParams, savePreset, loadPresets, applyPreset, deletePreset } = useGameStore()
  const [showPresets, setShowPresets] = useState(false)
  const [presets, setPresets] = useState<{ id: string; name: string; params: PhysicsParams }[]>([])
  const [toast, setToast] = useState<{ msg: string; type: 'info' | 'warn' } | null>(null)
  const toastTimerRef = useRef<number | null>(null)

  const showToast = (msg: string, type: 'info' | 'warn' = 'info') => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current)
    }
    setToast({ msg, type })
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null)
      toastTimerRef.current = null
    }, 1800)
  }

  useEffect(() => {
    setPresets(loadPresets())
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current)
      }
    }
  }, [])

  const handleChange = (key: keyof PhysicsParams, value: number) => {
    setParams({ ...params, [key]: value })
  }

  const handleSavePreset = () => {
    const name = window.prompt('请输入预设名称：')
    if (name === null) {
      showToast('已取消保存预设', 'warn')
      return
    }
    const trimmed = name.trim()
    if (!trimmed) {
      showToast('预设名称不能为空', 'warn')
      return
    }
    savePreset(trimmed)
    setPresets(loadPresets())
    showToast(`预设 "${trimmed}" 已保存`, 'info')
  }

  const handleLoadPreset = () => {
    setPresets(loadPresets())
    setShowPresets((s) => !s)
  }

  const handleApplyPreset = (id: string) => {
    applyPreset(id)
    setShowPresets(false)
  }

  const handleDeletePreset = (id: string) => {
    deletePreset(id)
    setPresets(loadPresets())
  }

  return (
    <div
      style={{
        width: 300,
        backgroundColor: '#2D2D2D',
        borderRadius: 8,
        padding: 20,
        color: '#FFFFFF',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        position: 'relative'
      }}
    >
      {toast && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '6px 14px',
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 500,
            backgroundColor: toast.type === 'warn' ? 'rgba(244, 67, 54, 0.9)' : 'rgba(76, 175, 80, 0.9)',
            color: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            zIndex: 10,
            whiteSpace: 'nowrap'
          }}
        >
          {toast.msg}
        </div>
      )}
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>物理参数</h2>

      {sliders.map((slider) => (
        <div key={slider.key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: 14 }}>{slider.label}</label>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#FFB347' }}>
              {params[slider.key]}
            </span>
          </div>
          <input
            type="range"
            min={slider.min}
            max={slider.max}
            step={slider.step}
            value={params[slider.key]}
            onChange={(e) => handleChange(slider.key, Number(e.target.value))}
            style={{
              width: '100%',
              height: 6,
              WebkitAppearance: 'none',
              appearance: 'none',
              background: '#555',
              borderRadius: 3,
              outline: 'none',
              cursor: 'pointer'
            }}
          />
          <style>{`
            input[type="range"]::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 16px;
              height: 16px;
              background: #FFB347;
              border-radius: 50%;
              cursor: pointer;
            }
            input[type="range"]::-moz-range-thumb {
              width: 16px;
              height: 16px;
              background: #FFB347;
              border-radius: 50%;
              cursor: pointer;
              border: none;
            }
          `}</style>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        <button
          onClick={handleSavePreset}
          style={buttonStyle}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = lightenColor('#5C6BC0', 0.1))}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#5C6BC0')}
        >
          保存预设
        </button>
        <button
          onClick={handleLoadPreset}
          style={buttonStyle}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = lightenColor('#5C6BC0', 0.1))}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#5C6BC0')}
        >
          加载预设
        </button>
      </div>

      {showPresets && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            maxHeight: 240,
            overflowY: 'auto',
            backgroundColor: '#1E1E1E',
            borderRadius: 6,
            padding: 8
          }}
        >
          {presets.length === 0 ? (
            <div style={{ fontSize: 13, color: '#888', textAlign: 'center', padding: 12 }}>
              暂无预设
            </div>
          ) : (
            presets.map((preset) => (
              <div
                key={preset.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 10px',
                  backgroundColor: '#3A3A3A',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                <span
                  onClick={() => handleApplyPreset(preset.id)}
                  style={{ flex: 1, fontSize: 13 }}
                >
                  {preset.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeletePreset(preset.id)
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#F44336',
                    cursor: 'pointer',
                    fontSize: 12,
                    padding: '2px 6px'
                  }}
                >
                  删除
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <div
        style={{
          marginTop: 'auto',
          fontSize: 12,
          color: '#888',
          lineHeight: 1.6
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 6, color: '#AAA' }}>操作说明</div>
        <div>A / ← : 向左移动</div>
        <div>D / → : 向右移动</div>
        <div>空格 : 跳跃</div>
        <div>R : 重置位置</div>
      </div>
    </div>
  )
}

const buttonStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px 12px',
  backgroundColor: '#5C6BC0',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'background-color 0.15s ease'
}

function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + Math.round(255 * amount))
  const g = Math.min(255, ((num >> 8) & 0x00ff) + Math.round(255 * amount))
  const b = Math.min(255, (num & 0x0000ff) + Math.round(255 * amount))
  return `rgb(${r}, ${g}, ${b})`
}
