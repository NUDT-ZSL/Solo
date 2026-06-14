import { useState, useEffect, useRef, useCallback } from 'react'
import ColorPanel from './components/ColorPanel'
import DashboardPreview from './components/DashboardPreview'
import {
  useTheme,
  getTheme,
  getCurrentColors,
  hexToHsl,
  applyTheme,
  themeNames,
  themeLabels,
  themeIcons,
} from './hooks/useTheme'
import type { ThemeVariable, ThemeColors, ThemeName } from './hooks/useTheme'
import './App.css'

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
        setFps(Math.round((frameCountRef.current * 1000) / delta))
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

  useEffect(() => {
    theme.applyThemeByName('dark')
  }, [theme])

  const handleThemeSwitch = useCallback((name: ThemeName) => {
    setCurrentThemeName(name)
    theme.applyThemeByName(name)
  }, [theme])

  const handleColorDrop = useCallback((variable: ThemeVariable, color: string) => {
    theme.updateVariable(variable, color)
  }, [theme])

  const handleReferenceColorDrop = useCallback((variable: ThemeVariable, color: string) => {
    setReferenceColors((prev) => ({
      ...prev,
      [variable]: color,
    }))
  }, [])

  const handleCustomColor = useCallback((color: string) => {
    // 自定义颜色选择器选择后可以直接拖拽使用，不需要做任何操作
  }, [])

  const toggleCompareMode = useCallback(() => {
    setCompareMode((prev) => {
      const next = !prev
      if (next) {
        setReferenceColors(getTheme('light'))
      }
      return next
    })
  }, [])

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDraggingDivider(true)
  }, [])

  useEffect(() => {
    if (!isDraggingDivider) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!compareContainerRef.current) return
      const rect = compareContainerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percent = Math.max(10, Math.min(90, (x / rect.width) * 100))
      setDividerPosition(percent)
    }

    const handleMouseUp = () => {
      setIsDraggingDivider(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingDivider])

  const generateExportCSS = useCallback(() => {
    const colors = getCurrentColors()
    const entries = Object.entries(colors) as [ThemeVariable, string][]
    const hexLines = entries.map(([key, val]) => `  ${key}: ${val};`).join('\n')
    const hslLines = entries
      .filter(([, val]) => !val.startsWith('rgba') && !val.startsWith('rgb'))
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

  const handleCopy = useCallback(async () => {
    const css = generateExportCSS()
    try {
      await navigator.clipboard.writeText(css)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = css
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 300)
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
          style={{ cursor: isDraggingDivider ? 'col-resize' : 'default' }}
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
          <span className="fps-dot" />
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
