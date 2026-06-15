import { useState, useCallback, useMemo, useEffect } from 'react'
import FrameEditor from './FrameEditor'
import AnimationPreview from './AnimationPreview'
import { PALETTE } from './palette'
import {
  FrameData,
  createStandingFrame,
  createWalkFrames,
  cloneFrame,
  createEmptyFrame,
  downloadSpriteSheet,
  generateCSSCode
} from './utils'

export default function App() {
  const [frames, setFrames] = useState<FrameData[]>(() => {
    const standing = createStandingFrame()
    const walkFrames = createWalkFrames()
    return [standing, ...walkFrames]
  })
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1.0)
  const [frameDuration, setFrameDuration] = useState(200)
  const [selectedColor, setSelectedColor] = useState(PALETTE[12])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (currentFrame >= frames.length) {
      setCurrentFrame(0)
    }
  }, [frames.length, currentFrame])

  const handlePixelChange = useCallback((x: number, y: number, color: string) => {
    setFrames(prev => {
      const next = [...prev]
      const frame = cloneFrame(next[currentFrame])
      frame[y][x] = color
      next[currentFrame] = frame
      return next
    })
  }, [currentFrame])

  const handleFrameChange = useCallback((index: number) => {
    setCurrentFrame(index)
  }, [])

  const handleTogglePlay = useCallback(() => {
    setIsPlaying(prev => !prev)
  }, [])

  const handleAddFrame = useCallback(() => {
    setFrames(prev => {
      const lastFrame = prev.length > 0 ? cloneFrame(prev[prev.length - 1]) : createEmptyFrame()
      return [...prev, lastFrame]
    })
  }, [])

  const handleDuplicateFrame = useCallback(() => {
    setFrames(prev => {
      const duplicated = cloneFrame(prev[currentFrame])
      const next = [...prev]
      next.splice(currentFrame + 1, 0, duplicated)
      return next
    })
    setCurrentFrame(prev => prev + 1)
  }, [currentFrame])

  const handleDeleteFrame = useCallback(() => {
    setFrames(prev => {
      if (prev.length <= 1) return prev
      const next = [...prev]
      next.splice(currentFrame, 1)
      return next
    })
  }, [currentFrame])

  const handleClearFrame = useCallback(() => {
    setFrames(prev => {
      const next = [...prev]
      next[currentFrame] = createEmptyFrame()
      return next
    })
  }, [currentFrame])

  const cssCode = useMemo(() => generateCSSCode(frames, frameDuration), [frames, frameDuration])

  const handleExportPNG = useCallback(() => {
    downloadSpriteSheet(frames, 'spritesheet.png')
  }, [frames])

  const handleCopyCSS = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(cssCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = cssCode
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [cssCode])

  const cardStyle: React.CSSProperties = {
    background: '#2a2a3e',
    borderRadius: 10,
    padding: 16,
    boxShadow: '0 4px 16px rgba(0,0,0,0.25)'
  }

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 700,
    color: '#cdd6f4',
    marginBottom: 12,
    letterSpacing: 0.5
  }

  const buttonStyle: React.CSSProperties = {
    background: '#45475a',
    color: '#cdd6f4',
    border: 'none',
    borderRadius: 6,
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    transition: 'background 0.15s'
  }

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: 6,
    borderRadius: 3,
    background: '#45475a',
    outline: 'none',
    cursor: 'pointer',
    accentColor: '#89b4fa'
  }

  return (
    <div style={{
      minHeight: '100vh',
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      minWidth: 600
    }}>
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 4px'
      }}>
        <h1 style={{
          fontSize: 22,
          fontWeight: 700,
          color: '#cdd6f4'
        }}>
          🎨 像素精灵动画编辑器
        </h1>
        <div style={{ fontSize: 12, color: '#a6adc8' }}>
          32×32 像素精灵表工具
        </div>
      </header>

      <style>{`
        .app-layout {
          display: grid;
          grid-template-columns: 260px 1fr 300px;
          gap: 16px;
          align-items: start;
        }
        @media (max-width: 1100px) {
          .app-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="app-layout">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={cardStyle}>
              <div style={sectionTitleStyle}>🎨 调色板</div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 8
              }}>
                {PALETTE.map((color, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedColor(color)}
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      background: color,
                      border: selectedColor === color ? '3px solid #ffffff' : '3px solid transparent',
                      borderRadius: 6,
                      cursor: 'pointer',
                      padding: 0,
                      boxShadow: selectedColor === color ? '0 0 0 2px #89b4fa, 0 2px 8px rgba(0,0,0,0.4)' : 'none',
                      transition: 'all 0.1s'
                    }}
                    title={color}
                  />
                ))}
              </div>
              <div style={{
                marginTop: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                color: '#a6adc8'
              }}>
                <div style={{
                  width: 24,
                  height: 24,
                  background: selectedColor,
                  borderRadius: 4,
                  border: '2px solid #45475a'
                }} />
                <span>当前: {selectedColor}</span>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={sectionTitleStyle}>🖼️ 帧管理</div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 6,
                marginBottom: 12,
                maxHeight: 120,
                overflowY: 'auto',
                padding: 4
              }}>
                {frames.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCurrentFrame(idx)
                      setIsPlaying(false)
                    }}
                    style={{
                      aspectRatio: '1',
                      background: currentFrame === idx ? '#89b4fa' : '#45475a',
                      color: currentFrame === idx ? '#1e1e2e' : '#cdd6f4',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                      transition: 'all 0.15s'
                    }}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <button style={buttonStyle} onClick={handleAddFrame}>+ 新建帧</button>
                <button style={buttonStyle} onClick={handleDuplicateFrame}>复制帧</button>
                <button style={{...buttonStyle, background: '#f38ba8', color: '#1e1e2e'}} onClick={handleDeleteFrame}>删除帧</button>
                <button style={buttonStyle} onClick={handleClearFrame}>清空帧</button>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={sectionTitleStyle}>⚙️ 动画设置</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: '#a6adc8' }}>
                    <span>播放速度</span>
                    <span style={{ color: '#89b4fa', fontWeight: 600 }}>{speed.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    style={sliderStyle}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: '#a6adc8' }}>
                    <span>帧间隔</span>
                    <span style={{ color: '#89b4fa', fontWeight: 600 }}>{frameDuration}ms</span>
                  </div>
                  <input
                    type="range"
                    min={100}
                    max={500}
                    step={10}
                    value={frameDuration}
                    onChange={(e) => setFrameDuration(parseInt(e.target.value))}
                    style={sliderStyle}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            minWidth: 0
          }}>
            <div style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#cdd6f4'
            }}>
              当前编辑: 第 {currentFrame + 1} 帧
            </div>
            {frames[currentFrame] && (
              <FrameEditor
                key={currentFrame}
                frame={frames[currentFrame]}
                selectedColor={selectedColor}
                onPixelChange={handlePixelChange}
              />
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={cardStyle}>
              <div style={sectionTitleStyle}>▶️ 动画预览</div>
              <AnimationPreview
                frames={frames}
                currentFrame={currentFrame}
                isPlaying={isPlaying}
                speed={speed}
                frameDuration={frameDuration}
                onFrameChange={handleFrameChange}
                onTogglePlay={handleTogglePlay}
              />
            </div>

            <div style={cardStyle}>
              <div style={sectionTitleStyle}>💾 导出</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={handleExportPNG}
                  style={{
                    ...buttonStyle,
                    background: '#a6e3a1',
                    color: '#1e1e2e',
                    padding: '12px',
                    fontSize: 14,
                    fontWeight: 700
                  }}
                >
                  📥 导出精灵表 PNG
                </button>
              </div>
            </div>
          </div>
      </div>

      <div style={cardStyle}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12
        }}>
          <div style={sectionTitleStyle}>📝 CSS 代码片段</div>
          <button
            onClick={handleCopyCSS}
            style={{
              ...buttonStyle,
              background: copied ? '#a6e3a1' : '#89b4fa',
              color: '#1e1e2e',
              fontWeight: 600
            }}
          >
            {copied ? '✓ 已复制' : '📋 复制代码'}
          </button>
        </div>
        <pre style={{
          background: '#1a1a26',
          borderRadius: 8,
          padding: 16,
          margin: 0,
          overflowX: 'auto',
          fontSize: 12,
          lineHeight: 1.6,
          color: '#cdd6f4',
          fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace"
        }}>
          <code>{cssCode}</code>
        </pre>
      </div>
    </div>
  )
}
