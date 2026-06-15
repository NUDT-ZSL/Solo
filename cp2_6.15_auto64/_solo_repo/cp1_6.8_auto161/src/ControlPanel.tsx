import { useState } from 'react'
import { COLOR_PALETTES } from './CoreEngine'

interface ControlPanelProps {
  onSubmit: (text: string, palette: string, speed: number) => void
}

const PALETTE_NAMES: Record<string, string> = {
  default: '晨光',
  ink: '水墨',
  twilight: '暮霞',
}

export default function ControlPanel({ onSubmit }: ControlPanelProps) {
  const [text, setText] = useState('')
  const [palette, setPalette] = useState('default')
  const [speed, setSpeed] = useState(1)
  const [expanded, setExpanded] = useState(true)

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text.trim(), palette, speed)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 28,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        width: 'min(580px, calc(100vw - 48px))',
      }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: 20,
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          transition: 'all 0.4s cubic-bezier(0.25,0.46,0.45,0.94)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: expanded ? '14px 20px 0' : '14px 20px',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: '#666', letterSpacing: 1 }}>
            光影诗谱
          </span>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 11,
              color: '#aaa',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease',
            }}
          >
            ▼
          </span>
        </div>

        {expanded && (
          <div style={{ padding: '10px 20px 18px' }}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="在此输入一首短诗，每行一句…"
              rows={3}
              style={{
                width: '100%',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 12,
                padding: '12px 16px',
                fontSize: 14,
                lineHeight: 1.7,
                color: '#2c2c2c',
                background: 'rgba(255,255,255,0.6)',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0,0,0,0.18)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'
              }}
            />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginTop: 12,
              }}
            >
              <div style={{ display: 'flex', gap: 6 }}>
                {Object.keys(COLOR_PALETTES).map((key) => (
                  <button
                    key={key}
                    onClick={() => setPalette(key)}
                    style={{
                      padding: '5px 14px',
                      borderRadius: 10,
                      fontSize: 12,
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.25s ease',
                      background:
                        palette === key
                          ? 'rgba(0,0,0,0.08)'
                          : 'rgba(0,0,0,0.02)',
                      color: palette === key ? '#333' : '#999',
                      fontWeight: palette === key ? 600 : 400,
                    }}
                  >
                    {PALETTE_NAMES[key]}
                  </button>
                ))}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginLeft: 8,
                }}
              >
                <span style={{ fontSize: 11, color: '#aaa' }}>慢</span>
                <input
                  type="range"
                  min={0.3}
                  max={2}
                  step={0.1}
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  style={{
                    width: 80,
                    accentColor: '#999',
                    cursor: 'pointer',
                  }}
                />
                <span style={{ fontSize: 11, color: '#aaa' }}>快</span>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!text.trim()}
                style={{
                  marginLeft: 'auto',
                  padding: '7px 22px',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 500,
                  border: 'none',
                  cursor: text.trim() ? 'pointer' : 'default',
                  background: text.trim()
                    ? 'linear-gradient(135deg, #667eea, #764ba2)'
                    : 'rgba(0,0,0,0.06)',
                  color: text.trim() ? '#fff' : '#ccc',
                  transition: 'all 0.3s ease',
                  letterSpacing: 1,
                }}
              >
                生成
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
