import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { toPng } from 'html-to-image'
import type { AudioAnalysisResult, ThemeConfig, HistoryItem, UploadedFile, ThemeName, PresetThemeName } from './types'
import { PRESET_THEMES } from './types'
import { analyzeAudioFile, formatTime, formatFileSize } from './audioAnalyzer'
import { generateCardSVG, hexToHSL, hslToHex, getTooltipContent, CARD_WIDTH } from './cardGenerator'

const MAX_HISTORY_ITEMS = 10
const MAX_RECORDING_SECONDS = 5 * 60
const MAX_FILE_SIZE = 50 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.ogg']

interface Toast {
  id: number
  type: 'success' | 'error' | 'info'
  message: string
}

export default function App() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AudioAnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeProgress, setAnalyzeProgress] = useState(0)

  const [activeTheme, setActiveTheme] = useState<ThemeName>('aurora')
  const [customTheme, setCustomTheme] = useState<ThemeConfig>(PRESET_THEMES.aurora)

  const [history, setHistory] = useState<HistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)

  const [isDragging, setIsDragging] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [isExporting, setIsExporting] = useState(false)

  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; content: string } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<number | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  const currentTheme = activeTheme === 'custom' ? customTheme : PRESET_THEMES[activeTheme as PresetThemeName]

  const cardSVG = useMemo(() => {
    if (!analysisResult) return ''
    return generateCardSVG(analysisResult, currentTheme, {
      fileName: uploadedFile?.fileName || 'Unknown',
      generatedAt: new Date()
    })
  }, [analysisResult, currentTheme, uploadedFile?.fileName])

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }, [])

  const handleFileValidation = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext || '')) {
      return `不支持的文件格式: ${ext || '未知'}，仅支持 mp3/wav/ogg`
    }
    if (file.size > MAX_FILE_SIZE) {
      return `文件过大: ${formatFileSize(file.size)}，最大支持 50MB`
    }
    return null
  }

  const uploadFileToServer = async (file: File): Promise<UploadedFile> => {
    const formData = new FormData()
    formData.append('audio', file)

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: '上传失败' }))
      throw new Error(err.error || `上传失败 (${response.status})`)
    }

    const data = await response.json()
    return {
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      size: data.size
    }
  }

  const analyzeAudio = async (file: File) => {
    setIsAnalyzing(true)
    setAnalyzeProgress(0)

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      }

      const arrayBuffer = await file.arrayBuffer()
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer)

      if (audioBuffer.duration > MAX_RECORDING_SECONDS) {
        addToast('error', `音频时长 ${formatTime(audioBuffer.duration)} 超过最大限制 5分钟`)
        setIsAnalyzing(false)
        return
      }

      const result = await analyzeAudioFile(audioBuffer, {
        onProgress: (p) => setAnalyzeProgress(p)
      })

      setAnalysisResult(result)
      addToast('success', '音频分析完成！')
    } catch (err) {
      console.error('Analysis error:', err)
      addToast('error', `分析失败: ${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleFileSelect = useCallback(async (file: File) => {
    const validationError = handleFileValidation(file)
    if (validationError) {
      addToast('error', validationError)
      return
    }

    try {
      const uploaded = await uploadFileToServer(file)
      setUploadedFile(uploaded)
      addToast('success', `文件上传成功: ${uploaded.fileName}`)
      await analyzeAudio(file)
    } catch (err) {
      console.error('Upload error:', err)
      addToast('error', err instanceof Error ? err.message : '上传失败')
    }
  }, [addToast])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      recordingChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordingChunksRef.current.push(e.data)
        }
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(recordingChunksRef.current, { type: 'audio/webm' })
        const fileName = `录音_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.webm`
        const file = new File([blob], fileName, { type: 'audio/webm' })

        if (recordingTime < 1) {
          addToast('error', '录音时间太短，请至少录制1秒')
          return
        }

        setUploadedFile({
          fileUrl: URL.createObjectURL(blob),
          fileName: fileName,
          size: blob.size,
          isRecording: true
        })

        await analyzeAudio(file)
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime(prev => {
          const next = prev + 1
          if (next >= MAX_RECORDING_SECONDS) {
            stopRecording()
            return MAX_RECORDING_SECONDS
          }
          return next
        })
      }, 1000)

      addToast('info', '开始录音...')
    } catch (err) {
      console.error('Recording error:', err)
      addToast('error', `无法访问麦克风: ${err instanceof Error ? err.message : '未知错误'}`)
    }
  }

  const stopRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    setIsRecording(false)
    addToast('success', '录音结束，开始分析...')
  }

  const handleThemeSelect = (name: PresetThemeName) => {
    setActiveTheme(name)
    const theme = PRESET_THEMES[name]
    setCustomTheme(theme)
  }

  const handleHueChange = (type: 'bgStart' | 'bgEnd', hue: number) => {
    setActiveTheme('custom')
    const key = type
    const { s, l } = hexToHSL(currentTheme[key])
    const newColor = hslToHex(hue, s, l)

    setCustomTheme(prev => ({
      ...prev,
      name: '自定义',
      [key]: newColor
    }))
  }

  const saveToHistory = async () => {
    if (!analysisResult || !cardSVG) return

    const thumbnail = cardSVG

    const item: HistoryItem = {
      id: Date.now().toString(36),
      timestamp: Date.now(),
      fileName: uploadedFile?.fileName || 'Unknown',
      svgString: cardSVG,
      analysisResult,
      themeConfig: { ...currentTheme },
      thumbnail
    }

    setHistory(prev => {
      const updated = [item, ...prev]
      if (updated.length > MAX_HISTORY_ITEMS) {
        return updated.slice(0, MAX_HISTORY_ITEMS)
      }
      return updated
    })

    addToast('success', '已保存到历史记录')
  }

  const loadHistoryItem = (item: HistoryItem) => {
    setAnalysisResult(item.analysisResult)
    setCustomTheme({ ...item.themeConfig })
    setActiveTheme('custom')
    setUploadedFile({
      fileUrl: '',
      fileName: item.fileName,
      size: 0
    })
    addToast('success', '已加载历史记录')
    setDrawerOpen(false)
  }

  const exportPNG = async () => {
    if (!cardRef.current || !cardSVG) return

    setIsExporting(true)
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        width: CARD_WIDTH,
        style: {
          transform: 'none',
          borderRadius: '0'
        }
      })

      const link = document.createElement('a')
      const date = new Date()
      const dateStr = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`
      link.download = `声纹摘要_${dateStr}.png`
      link.href = dataUrl
      link.click()

      await saveToHistory()
      addToast('success', 'PNG 导出成功！')
    } catch (err) {
      console.error('Export error:', err)
      addToast('error', `导出失败: ${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setIsExporting(false)
    }
  }

  const copyCardURL = async () => {
    if (!cardSVG) return

    try {
      const response = await fetch('/api/svg/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ svg: cardSVG })
      })

      const data = await response.json()
      if (data.success) {
        const url = window.location.origin + data.url
        await navigator.clipboard.writeText(url)
        addToast('success', '卡片URL已复制到剪贴板 (5分钟内有效)')
      } else {
        throw new Error(data.error || '保存失败')
      }
    } catch (err) {
      console.error('Copy URL error:', err)
      addToast('error', `复制失败: ${err instanceof Error ? err.message : '未知错误'}`)
    }
  }

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!analysisResult || !cardRef.current) return

    const rect = cardRef.current.getBoundingClientRect()
    const svgEl = cardRef.current.querySelector('svg')
    if (!svgEl) return

    const svgRect = svgEl.getBoundingClientRect()
    const relativeX = e.clientX - svgRect.left

    const content = getTooltipContent(analysisResult, relativeX, svgRect, CARD_WIDTH)
    if (content) {
      const timeStr = formatTime(content.time)
      const volPercent = Math.round(content.volume * 100)
      const emoPercent = Math.round(content.emotion * 100)

      setTooltip({
        visible: true,
        x: e.clientX - rect.left + 16,
        y: e.clientY - rect.top - 40,
        content: `⏱ ${timeStr} | 🎚 ${volPercent}% (${content.db.toFixed(1)}dB) | 🎭 ${emoPercent}%`
      })
    }
  }

  const handleCardMouseLeave = () => {
    setTooltip(null)
  }

  const themeBgStartHue = hexToHSL(currentTheme.bgStart).h
  const themeBgEndHue = hexToHSL(currentTheme.bgEnd).h

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      if (audioContextRef.current) audioContextRef.current.close()
    }
  }, [])

  const renderThemeOption = (name: PresetThemeName) => {
    const theme = PRESET_THEMES[name]
    const isActive = activeTheme === name
    return (
      <div
        key={name}
        className={`theme-option ${isActive ? 'active' : ''}`}
        style={{
          background: `linear-gradient(135deg, ${theme.bgStart}, ${theme.bgEnd})`
        }}
        onClick={() => handleThemeSelect(name)}
      >
        <div className="theme-option-label">{theme.name}</div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <aside className="history-panel">
        <h3>📚 历史记录</h3>
        {history.length === 0 ? (
          <div className="empty-history">
            暂无记录<br />
            <span style={{ fontSize: '10px', opacity: 0.7 }}>最多保留 {MAX_HISTORY_ITEMS} 条</span>
          </div>
        ) : (
          <div className="history-list">
            {history.map(item => (
              <div
                key={item.id}
                className="history-item"
                onClick={() => loadHistoryItem(item)}
              >
                <div
                  className="history-thumbnail"
                  dangerouslySetInnerHTML={{ __html: item.thumbnail }}
                />
                <div className="history-info">
                  <div className="history-name" title={item.fileName}>{item.fileName}</div>
                  <div className="history-time">
                    {new Date(item.timestamp).toLocaleString('zh-CN', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>

      <main className="main-area">
        <div className="app-header">
          <h1>🎵 声纹摘要卡 · Voiceprint Summary</h1>
          <p>上传或录制音频，自动生成可视化摘要卡片，适用于社交媒体分享</p>
        </div>

        <section
          className={`upload-section ${isDragging ? 'dragging' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <span className="upload-icon">{isRecording ? '🔴' : '📤'}</span>
          <div className="upload-text">
            {isRecording ? `正在录音中... ${formatTime(recordingTime)}` : '拖拽音频文件到此处，或点击选择'}
          </div>
          <div className="upload-hint">
            支持 MP3 / WAV / OGG 格式 · 最大 50MB · 最长 5分钟
          </div>
          <div className="button-group">
            <button
              className="btn btn-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isRecording || isAnalyzing}
            >
              <span>📁</span> 选择文件
            </button>
            {!isRecording ? (
              <button
                className="btn btn-success"
                onClick={startRecording}
                disabled={isAnalyzing}
              >
                <span>🎙</span> 开始录音
              </button>
            ) : (
              <>
                <button
                  className="btn btn-recording"
                  onClick={stopRecording}
                >
                  <span>⏹</span> 停止录音
                </button>
                <span className="recording-timer">{formatTime(recordingTime)}</span>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.ogg,audio/*"
            className="hidden-input"
            onChange={handleInputChange}
          />
        </section>

        {uploadedFile && (
          <div className="current-file">
            <div className="current-file-info">
              <span className="current-file-icon">{uploadedFile.isRecording ? '🎙' : '🎵'}</span>
              <div className="current-file-details">
                <div className="current-file-name" title={uploadedFile.fileName}>
                  {uploadedFile.fileName}
                </div>
                <div className="current-file-meta">
                  {uploadedFile.size > 0 && formatFileSize(uploadedFile.size)}
                  {analysisResult && ` · 时长 ${formatTime(analysisResult.duration)} · 采样率 ${analysisResult.sampleRate}Hz`}
                </div>
              </div>
            </div>
            {isAnalyzing && (
              <div className="analyzing">
                <div className="spinner" />
                <span>分析中 {Math.round(analyzeProgress * 100)}%</span>
              </div>
            )}
            {!isAnalyzing && analysisResult && (
              <button
                className="btn btn-primary"
                onClick={() => fileInputRef.current?.click()}
                style={{ padding: '8px 16px', fontSize: '12px' }}
              >
                🔄 重新上传
              </button>
            )}
          </div>
        )}

        <section className="preview-section">
          <div className="preview-header">
            <h2>🎨 卡片预览</h2>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
              {CARD_WIDTH} × {CARD_WIDTH * 0.525}px · 社交分享标准
            </span>
          </div>
          <div className="preview-container">
            {cardSVG ? (
              <div
                className="card-wrapper"
                ref={cardRef}
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                style={{ transition: 'all 0.4s ease' }}
                dangerouslySetInnerHTML={{ __html: cardSVG }}
              />
            ) : (
              <div className="empty-preview">
                <span className="empty-preview-icon">🎧</span>
                <div style={{ fontSize: '16px' }}>上传或录制音频后，这里会显示摘要卡片</div>
                <div style={{ fontSize: '12px', opacity: 0.7, maxWidth: '360px' }}>
                  卡片将包含三条动态曲线：音量包络、情绪曲线和波形，以及频谱峰值标注
                </div>
              </div>
            )}
            {tooltip && tooltip.visible && (
              <div
                className="card-tooltip"
                style={{
                  left: tooltip.x,
                  top: tooltip.y,
                  opacity: tooltip.visible ? 1 : 0
                }}
              >
                {tooltip.content}
              </div>
            )}
          </div>
        </section>
      </main>

      <aside className={`control-panel ${drawerOpen ? 'open' : ''}`}>
        <div className="control-section">
          <h3>🎨 主题配色</h3>
          <div className="theme-grid">
            {(Object.keys(PRESET_THEMES) as PresetThemeName[]).map(renderThemeOption)}
          </div>
        </div>

        <div className="control-section">
          <h3>🎚 自定义渐变</h3>
          <div className="custom-colors">
            <div className="color-picker-group">
              <div className="color-picker-label">
                <span>背景起始色</span>
                <div className="color-preview" style={{ background: currentTheme.bgStart }} />
              </div>
              <input
                type="range"
                className="slider hue-slider"
                min="0"
                max="360"
                value={themeBgStartHue}
                onChange={(e) => handleHueChange('bgStart', Number(e.target.value))}
              />
            </div>
            <div className="color-picker-group">
              <div className="color-picker-label">
                <span>背景结束色</span>
                <div className="color-preview" style={{ background: currentTheme.bgEnd }} />
              </div>
              <input
                type="range"
                className="slider hue-slider"
                min="0"
                max="360"
                value={themeBgEndHue}
                onChange={(e) => handleHueChange('bgEnd', Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="control-section">
          <h3>💾 导出操作</h3>
          <div className="export-buttons">
            <button
              className="btn btn-primary"
              onClick={exportPNG}
              disabled={!cardSVG || isExporting}
            >
              {isExporting ? (
                <>
                  <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                  导出中...
                </>
              ) : (
                <>
                  <span>🖼</span> 导出 PNG (2x)
                </>
              )}
            </button>
            <button
              className="btn btn-success"
              onClick={copyCardURL}
              disabled={!cardSVG}
            >
              <span>🔗</span> 复制卡片 URL
            </button>
            <button
              className="btn"
              onClick={saveToHistory}
              disabled={!cardSVG}
            >
              <span>⭐</span> 保存到历史
            </button>
          </div>
        </div>

        <div className="control-section" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
          <h3>💡 使用提示</h3>
          <div style={{ lineHeight: 1.8 }}>
            • 鼠标悬停在曲线上可查看数值<br />
            • 调整色相滑块实时预览配色<br />
            • 卡片URL有效期5分钟<br />
            • 历史记录仅本地存储
          </div>
        </div>
      </aside>

      {drawerOpen && (
        <div
          className="mobile-backdrop open"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <button
        className="mobile-drawer-toggle"
        onClick={() => setDrawerOpen(!drawerOpen)}
      >
        {drawerOpen ? '✕' : '⚙'}
      </button>

      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <span>
              {toast.type === 'success' && '✅'}
              {toast.type === 'error' && '❌'}
              {toast.type === 'info' && 'ℹ️'}
            </span>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}
