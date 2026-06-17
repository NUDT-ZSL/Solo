import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { parseCode, Language } from './modules/parser'
import { Renderer, Theme, CardStyle, GradientPreset } from './modules/renderer'
import { exportToPng, ExportBackground } from './modules/exporter'
import './App.css'

const defaultCode = `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Calculate and print first 10 Fibonacci numbers
for (let i = 0; i < 10; i++) {
  console.log(\`F(\${i}) = \${fibonacci(i)}\`);
}`

const languages: { value: Language; label: string }[] = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
]

const themes: { value: Theme; label: string; colors: string[] }[] = [
  { value: 'monokai', label: 'Monokai', colors: ['#272822', '#f92672', '#a6e22e', '#66d9ef'] },
  { value: 'dracula', label: 'Dracula', colors: ['#282a36', '#ff79c6', '#50fa7b', '#8be9fd'] },
  { value: 'solarized-light', label: 'Solarized Light', colors: ['#fdf6e3', '#859900', '#268bd2', '#b58900'] },
  { value: 'github-dark', label: 'GitHub Dark', colors: ['#0d1117', '#ff7b72', '#d2a8ff', '#79c0ff'] },
]

const gradients: { value: GradientPreset; label: string; preview: string }[] = [
  { value: 'none', label: '无渐变', preview: 'linear-gradient(135deg, #282c34 0%, #282c34 100%)' },
  { value: 'pink-purple', label: '粉紫渐变', preview: 'linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)' },
  { value: 'blue-cyan', label: '蓝青渐变', preview: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)' },
  { value: 'gray-white', label: '灰白渐变', preview: 'linear-gradient(135deg, #e0e0e0 0%, #ffffff 100%)' },
]

export default function App() {
  const [code, setCode] = useState(defaultCode)
  const [language, setLanguage] = useState<Language>('javascript')
  const [theme, setTheme] = useState<Theme>('monokai')
  const [cardStyle, setCardStyle] = useState<CardStyle>({
    borderRadius: 16,
    shadowOffsetX: 5,
    shadowOffsetY: 10,
    gradient: 'none',
    fontSize: 16,
  })
  const [highlightedHtml, setHighlightedHtml] = useState('')
  const [exportBg, setExportBg] = useState<ExportBackground>('white')
  const [isExporting, setIsExporting] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const cardRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const updateHighlight = useCallback((newCode: string, newLanguage: Language) => {
    const result = parseCode(newCode, newLanguage)
    setHighlightedHtml(result.html)
  }, [])

  useEffect(() => {
    updateHighlight(code, language)
  }, [])

  const debouncedUpdateHighlight = useCallback((newCode: string, newLanguage: Language) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    debounceTimer.current = setTimeout(() => {
      updateHighlight(newCode, newLanguage)
    }, 300)
  }, [updateHighlight])

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value
    setCode(newCode)
    debouncedUpdateHighlight(newCode, language)
  }

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value as Language
    setLanguage(newLanguage)
    updateHighlight(code, newLanguage)
  }

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme)
  }

  const handleStyleChange = <K extends keyof CardStyle>(key: K, value: CardStyle[K]) => {
    setCardStyle(prev => ({ ...prev, [key]: value }))
  }

  const handleExport = async () => {
    if (!cardRef.current || isExporting) return

    setIsExporting(true)
    try {
      await exportToPng(cardRef.current, {
        background: exportBg,
        pixelRatio: 2,
      })
    } catch (error) {
      console.error('导出失败:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setIsCopied(true)
      setTimeout(() => {
        setIsCopied(false)
      }, 1500)
    } catch (error) {
      console.error('复制失败:', error)
    }
  }

  const lineNumbers = useMemo(() => {
    return code.split('\n').map((_, i) => i + 1).join('\n')
  }, [code])

  const codeStats = useMemo(() => {
    const lines = code.split('\n').length
    const chars = code.length
    const nonEmptyLines = code.split('\n').filter(line => line.trim().length > 0).length
    return { lines, chars, nonEmptyLines }
  }, [code])

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">代码卡片工坊</h1>
        <div className="header-actions">
          <div className="export-bg-select">
            <span className="export-bg-label">导出背景:</span>
            <button
              className={`bg-option ${exportBg === 'white' ? 'active' : ''}`}
              onClick={() => setExportBg('white')}
            >
              白色
            </button>
            <button
              className={`bg-option ${exportBg === 'transparent' ? 'active' : ''}`}
              onClick={() => setExportBg('transparent')}
            >
              透明
            </button>
          </div>
          <button
            className={`export-btn ${isExporting ? 'exporting' : ''}`}
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? '导出中...' : '导出图片'}
          </button>
        </div>
      </header>

      <div className={`main-content ${isMobile ? 'mobile' : ''}`}>
        <div className="control-panel">
          <div className="panel-section">
            <h3 className="section-title">代码输入</h3>
            <div className="language-select">
              <label htmlFor="language">语言选择</label>
              <select
                id="language"
                value={language}
                onChange={handleLanguageChange}
                className="language-dropdown"
              >
                {languages.map(lang => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="code-input-container">
              <div className="line-numbers" ref={lineNumbersRef}>
                {lineNumbers}
              </div>
              <textarea
                ref={textareaRef}
                value={code}
                onChange={handleCodeChange}
                onScroll={handleScroll}
                className="code-textarea"
                spellCheck={false}
                placeholder="在此粘贴代码..."
              />
            </div>
          </div>

          <div className="panel-section">
            <h3 className="section-title">主题选择</h3>
            <div className="theme-selector">
              {themes.map(t => (
                <button
                  key={t.value}
                  className={`theme-btn ${theme === t.value ? 'active' : ''}`}
                  onClick={() => handleThemeChange(t.value)}
                  title={t.label}
                >
                  <div className="theme-preview">
                    {t.colors.map((color, i) => (
                      <div
                        key={i}
                        className="theme-color-block"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </button>
              ))}
            </div>
            <div className="theme-label">{themes.find(t => t.value === theme)?.label}</div>
          </div>

          <div className="panel-section">
            <h3 className="section-title">卡片样式</h3>

            <div className="slider-group">
              <label>圆角: {cardStyle.borderRadius}px</label>
              <input
                type="range"
                min="12"
                max="24"
                step="2"
                value={cardStyle.borderRadius}
                onChange={(e) => handleStyleChange('borderRadius', Number(e.target.value))}
                className="style-slider"
              />
            </div>

            <div className="slider-group">
              <label>阴影 X 偏移: {cardStyle.shadowOffsetX}px</label>
              <input
                type="range"
                min="0"
                max="20"
                step="5"
                value={cardStyle.shadowOffsetX}
                onChange={(e) => handleStyleChange('shadowOffsetX', Number(e.target.value))}
                className="style-slider"
              />
            </div>

            <div className="slider-group">
              <label>阴影 Y 偏移: {cardStyle.shadowOffsetY}px</label>
              <input
                type="range"
                min="0"
                max="20"
                step="5"
                value={cardStyle.shadowOffsetY}
                onChange={(e) => handleStyleChange('shadowOffsetY', Number(e.target.value))}
                className="style-slider"
              />
            </div>

            <div className="gradient-group">
              <label>背景渐变</label>
              <div className="gradient-options">
                {gradients.map(g => (
                  <button
                    key={g.value}
                    className={`gradient-btn ${cardStyle.gradient === g.value ? 'active' : ''}`}
                    onClick={() => handleStyleChange('gradient', g.value)}
                    title={g.label}
                  >
                    <div
                      className="gradient-preview"
                      style={{ background: g.preview }}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="slider-group">
              <label>字体大小: {cardStyle.fontSize}px</label>
              <input
                type="range"
                min="14"
                max="20"
                step="2"
                value={cardStyle.fontSize}
                onChange={(e) => handleStyleChange('fontSize', Number(e.target.value))}
                className="style-slider"
              />
            </div>
          </div>
        </div>

        <div className="preview-panel">
          <div className="preview-wrapper">
            <button
              className={`copy-btn ${isCopied ? 'copied' : ''}`}
              onClick={handleCopyCode}
              title="复制代码"
            >
              <span className="copy-icon">
                {isCopied ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                )}
              </span>
              <span className="copy-text">{isCopied ? '已复制' : '复制代码'}</span>
            </button>
            <Renderer
              ref={cardRef}
              highlightedHtml={highlightedHtml}
              theme={theme}
              cardStyle={cardStyle}
              language={language}
            />
            <div className="code-stats">
              <div className="stat-item">
                <span className="stat-icon">📏</span>
                <span className="stat-label">行数</span>
                <span className="stat-value">{codeStats.lines}</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-icon">📝</span>
                <span className="stat-label">有效行</span>
                <span className="stat-value">{codeStats.nonEmptyLines}</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-icon">🔤</span>
                <span className="stat-label">字符数</span>
                <span className="stat-value">{codeStats.chars}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
