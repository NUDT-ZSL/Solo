import { useState, useEffect, useRef, useCallback } from 'react'
import copy from 'copy-to-clipboard'
import ColorPanel from './components/ColorPanel'
import DashboardPreview from './components/DashboardPreview'
import {
  useTheme,
  getTheme,
  getCurrentColors,
  hexToHsl,
  themeNames,
  themeLabels,
  themeIcons,
} from './hooks/useTheme'
import type { ThemeVariable, ThemeColors, ThemeName } from './hooks/useTheme'
import './App.css'

const MIN_DIVIDER_PERCENT = 10
const MAX_DIVIDER_PERCENT = 90

function useFps(): number {
  const [fps, setFps] = useState(60)
  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())
  const rafRef = useRef<number>()

  useEffect(() => {
    const tick = () => {
      frameCountRef.current++
      const now = performance.now()
      const delta = now - lastTimeRef.current
      if (delta >= 1000) {
        setFps(Math.max(0, Math.round((frameCountRef.current * 1000) / delta)))
        frameCountRef.current = 0
        lastTimeRef.current = now
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return fps
}

function clampPercent(value: number): number {
  return Math.max(MIN_DIVIDER_PERCENT, Math.min(MAX_DIVIDER_PERCENT, value))
}

export default function App() {
  const theme = useTheme()
  const fps = useFps()
  const [currentThemeName, setCurrentThemeName] = useState<ThemeName>('dark')
  const [compareMode, setCompareMode] = useState(false)
  const [referenceColors, setReferenceColors] = useState<ThemeColors>(() => getTheme('light'))
  const [dividerPosition, setDividerPosition] = useState(50)
  const [showExportModal, setShowExportModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isDraggingDivider, setIsDraggingDivider] = useState(false)

  const compareContainerRef = useRef<HTMLDivElement>(null)
  const isMobile = useRef<boolean>(false)

  useEffect(() => {
    isMobile.current = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    )
  }, [])

  useEffect(() => {
    theme.applyThemeByName('dark')
  }, [theme])

  const handleThemeSwitch = useCallback((name: ThemeName) => {
    setCurrentThemeName(name)
    theme.applyThemeByName(name)
  }, [theme])

  const handleColorDrop = useCallback((variable: ThemeVariable, color: string) => {
    try {
      theme.updateVariable(variable, color)
    } catch (err) {
      console.error('[App] 更新 CSS 变量失败:', err)
    }
  }, [theme])

  const handleReferenceColorDrop = useCallback((variable: ThemeVariable, color: string) => {
    setReferenceColors((prev) => ({
      ...prev,
      [variable]: color,
    }))
  }, [])

  const handleCustomColor = useCallback((_color: string) => {
    // 自定义颜色选择器选择后可以直接拖拽使用，不需要做任何操作
  }, [])

  const toggleCompareMode = useCallback(() => {
    setCompareMode((prev) => {
      const next = !prev
      if (next) {
        setReferenceColors(getTheme('light'))
        setDividerPosition(50)
      }
      return next
    })
  }, [])

  const updateDividerFromPosition = useCallback((clientX: number, clientY: number) => {
    if (!compareContainerRef.current) return false

    const rect = compareContainerRef.current.getBoundingClientRect()

    // 检查鼠标/触摸位置是否在对比容器范围内（垂直方向）
    if (clientY < rect.top || clientY > rect.bottom) {
      // 超出垂直范围，停止更新
      return false
    }

    // 水平方向超出容器边界时，直接钳位到边界值
    let x: number
    if (clientX < rect.left) {
      x = 0
    } else if (clientX > rect.right) {
      x = rect.width
    } else {
      x = clientX - rect.left
    }

    const percent = clampPercent((x / rect.width) * 100)
    setDividerPosition(percent)
    return true
  }, [])

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDraggingDivider(true)
  }, [])

  const handleDividerTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0) return
    e.preventDefault()
    setIsDraggingDivider(true)
    const touch = e.touches[0]
    updateDividerFromPosition(touch.clientX, touch.clientY)
  }, [updateDividerFromPosition])

  useEffect(() => {
    if (!isDraggingDivider) return

    const handleMouseMove = (e: MouseEvent) => {
      updateDividerFromPosition(e.clientX, e.clientY)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return
      e.preventDefault()
      const touch = e.touches[0]
      updateDividerFromPosition(touch.clientX, touch.clientY)
    }

    const handleMouseUp = () => {
      setIsDraggingDivider(false)
    }

    const handleTouchEnd = () => {
      setIsDraggingDivider(false)
    }

    const handleTouchCancel = () => {
      setIsDraggingDivider(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)
    window.addEventListener('touchcancel', handleTouchCancel)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('touchcancel', handleTouchCancel)
    }
  }, [isDraggingDivider, updateDividerFromPosition])

  const generateExportCSS = useCallback(() => {
    const colors = getCurrentColors()
    const entries = Object.entries(colors) as [ThemeVariable, string][]
    const hexLines = entries.map(([key, val]) => `  ${key}: ${val};`).join('\n')
    const hslLines = entries
      .filter(([, val]) => !val.startsWith('rgba') && !val.startsWith('rgb') && !val.startsWith('hsl'))
      .map(([key, val]) => `  ${key}: ${hexToHsl(val)};`)
      .join('\n')

    return `/* 十六进制格式 */
:root {
${hexLines}
}

/* HSL 格式 */
:root {
${hslLines}
}`
  }, [])

  const handleCopy = useCallback(() => {
    const css = generateExportCSS()
    const succeeded = copy(css)
    if (succeeded) {
      setCopied(true)
      setTimeout(() => setCopied(false), 300)
    }
  }, [generateExportCSS])

  const handleExportClick = useCallback(() => {
    setShowExportModal(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setShowExportModal(false)
    setCopied(false)
  }, [])

  return (
    <div className="app-container">
      <ColorPanel
        onColorDrop={handleColorDrop}
        onCustomColor={handleCustomColor}
      />

      <div className="main-content">
        <div className="top-toolbar">
          <div className="theme-switcher">
            {themeNames.map((name) => (
              <button
                key={name}
                className={`theme-btn ${currentThemeName === name ? 'active' : ''}`}
                onClick={() => handleThemeSwitch(name)}
                title={themeLabels[name]}
              >
                <span className="theme-icon">{themeIcons[name]}</span>
                <span className="theme-name">{themeLabels[name]}</span>
              </button>
            ))}
          </div>

          <div className="toolbar-actions">
            <button
              className={`compare-btn ${compareMode ? 'active' : ''}`}
              onClick={toggleCompareMode}
            >
              {compareMode ? '退出对比' : '对比模式'}
            </button>
            <button className="export-btn" onClick={handleExportClick}>
              导出
            </button>
          </div>
        </div>

        <div
          ref={compareContainerRef}
          className={`preview-area ${compareMode ? 'compare-mode' : ''}`}
          style={{ cursor: isDraggingDivider ? (isMobile.current ? 'default' : 'col-resize') : 'default' }}
        >
          {compareMode ? (
            <>
              <div
                className="preview-side reference-side"
                style={{ width: `${dividerPosition}%` }}
              >
                <DashboardPreview
                  scopeId="reference-preview"
                  customColors={referenceColors}
                  title="参考方案"
                  onDrop={handleReferenceColorDrop}
                />
              </div>

              <div
                className="compare-divider"
                onMouseDown={handleDividerMouseDown}
                onTouchStart={handleDividerTouchStart}
                style={{ left: `${dividerPosition}%` }}
              >
                <div className="divider-handle" />
              </div>

              <div
                className="preview-side current-side"
                style={{ width: `${100 - dividerPosition}%` }}
              >
                <DashboardPreview
                  scopeId="current-preview"
                  title="当前方案"
                  onDrop={handleColorDrop}
                />
              </div>
            </>
          ) : (
            <DashboardPreview onDrop={handleColorDrop} />
          )}
        </div>

        <div className="fps-counter">
          <span className="fps-dot" style={{
            backgroundColor: fps >= 45 ? '#2ecc71' : fps >= 30 ? '#f39c12' : '#e74c3c',
            boxShadow: `0 0 6px ${fps >= 45 ? '#2ecc71' : fps >= 30 ? '#f39c12' : '#e74c3c'}`,
          }} />
          <span className="fps-value">{fps}</span>
          <span className="fps-label"> FPS</span>
        </div>
      </div>

      {showExportModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>导出 CSS 变量</h3>
              <div className="modal-actions">
                <button
                  className={`copy-btn ${copied ? 'copied' : ''}`}
                  onClick={handleCopy}
                >
                  {copied ? (
                    <span className="checkmark">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      已复制
                    </span>
                  ) : (
                    <span>复制</span>
                  )}
                </button>
                <button className="close-btn" onClick={handleCloseModal}>
                  关闭
                </button>
              </div>
            </div>
            <pre className="code-preview">
              <code>{generateExportCSS()}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
