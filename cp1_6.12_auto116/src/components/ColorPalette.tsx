import { useState, useRef, useCallback } from 'react'
import ColorThief from 'colorthief'
import { createVersion } from '../api'
import { rgbToHex, rgbToHsl, isLightColor } from '../utils/colorUtils'
import { ColorValue, PaletteVersion } from '../types'

interface ColorPaletteProps {
  onVersionCreated: (version: PaletteVersion) => void
}

type ProgressPhase = 'idle' | 'reading' | 'loading' | 'extracting' | 'converting' | 'done'

export default function ColorPalette({ onVersionCreated }: ColorPaletteProps) {
  const [colors, setColors] = useState<ColorValue[]>([])
  const [imageUrl, setImageUrl] = useState<string>('')
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<ProgressPhase>('idle')
  const [isSaving, setIsSaving] = useState(false)
  const [versionName, setVersionName] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const progressRef = useRef<number>(0)

  const animateProgress = useCallback((target: number, duration: number) => {
    const start = progressRef.current
    const diff = target - start
    const startTime = performance.now()

    const step = (now: number) => {
      const elapsed = now - startTime
      const fraction = Math.min(elapsed / duration, 1)
      const current = start + diff * fraction
      progressRef.current = current
      setProgress(Math.round(current))
      if (fraction < 1) {
        requestAnimationFrame(step)
      }
    }

    requestAnimationFrame(step)
  }, [])

  const handleFileSelect = useCallback((file: File) => {
    if (!file) return

    if (!file.type.match('image/png') && !file.type.match('image/jpeg')) {
      alert('请上传PNG或JPG格式的图片')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过5MB')
      return
    }

    setColors([])
    progressRef.current = 0
    setProgress(0)
    setPhase('reading')
    setVersionName(file.name.replace(/\.[^/.]+$/, ''))

    const reader = new FileReader()
    const readStart = performance.now()

    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const filePercent = (e.loaded / e.total) * 45
        progressRef.current = filePercent
        setProgress(Math.round(filePercent))
      }
    }

    reader.onload = (e) => {
      const readDuration = performance.now() - readStart
      console.log(`[PaletteFlow] 文件读取耗时: ${readDuration.toFixed(1)}ms`)

      const result = e.target?.result as string
      setImageUrl(result)
      setPhase('loading')
      animateProgress(50, 200)
    }

    reader.onerror = () => {
      alert('文件读取失败')
      setPhase('idle')
      progressRef.current = 0
      setProgress(0)
    }

    reader.readAsDataURL(file)
  }, [animateProgress])

  const handleImageLoad = useCallback(() => {
    if (!imgRef.current) return

    setPhase('extracting')
    animateProgress(55, 100)

    requestAnimationFrame(() => {
      try {
        const extractStart = performance.now()
        const colorThief = new ColorThief()
        const palette = colorThief.getPalette(imgRef.current!, 5)
        const extractDuration = performance.now() - extractStart
        console.log(`[PaletteFlow] colorthief提取耗时: ${extractDuration.toFixed(1)}ms`)

        const extractProgress = Math.min(55 + (extractDuration / 1000) * 25, 80)
        progressRef.current = extractProgress
        setProgress(Math.round(extractProgress))
        setPhase('converting')

        const convertStart = performance.now()
        const colorValues: ColorValue[] = palette.map(([r, g, b]) => {
          const hex = rgbToHex(r, g, b)
          const hsl = rgbToHsl(r, g, b)
          return {
            hex,
            rgb: { r, g, b },
            hsl
          }
        })
        const convertDuration = performance.now() - convertStart
        console.log(`[PaletteFlow] 色值转换耗时: ${convertDuration.toFixed(1)}ms`)

        progressRef.current = 92
        setProgress(92)
        setColors(colorValues)

        requestAnimationFrame(() => {
          progressRef.current = 100
          setProgress(100)
          setPhase('done')
          setTimeout(() => {
            setPhase('idle')
          }, 300)
        })
      } catch (error) {
        console.error('Error extracting colors:', error)
        alert('提取色值失败，请重试')
        setPhase('idle')
        progressRef.current = 0
        setProgress(0)
      }
    })
  }, [animateProgress])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelect(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleSave = async () => {
    if (colors.length !== 5 || !versionName.trim()) return

    setIsSaving(true)
    try {
      const newVersion = await createVersion(
        versionName.trim(),
        colors.map(c => c.rgb)
      )
      onVersionCreated(newVersion)
      setColors([])
      setImageUrl('')
      setVersionName('')
      progressRef.current = 0
      setProgress(0)
      setPhase('idle')
    } catch (error) {
      console.error('Error saving version:', error)
      alert('保存失败，请重试')
    } finally {
      setIsSaving(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getProgressColor = () => {
    if (progress < 30) return '#9CA3AF'
    if (progress < 60) return '#F59E0B'
    if (progress < 90) return '#3B82F6'
    return '#10B981'
  }

  const getPhaseLabel = () => {
    switch (phase) {
      case 'reading': return '读取文件中...'
      case 'loading': return '加载图片中...'
      case 'extracting': return '提取主色调中...'
      case 'converting': return '转换色值中...'
      case 'done': return '提取完成！'
      default: return ''
    }
  }

  return (
    <div className="upload-section">
      <h2 className="section-title">上传设计稿 & 提取配色</h2>
      
      <div
        className={`upload-area ${dragOver ? 'dragover' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg"
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />
        <div className="upload-icon">🎨</div>
        <div className="upload-text">点击或拖拽图片到此处上传</div>
        <div className="upload-hint">支持PNG/JPG格式，不超过5MB</div>
      </div>

      {phase !== 'idle' && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', color: getProgressColor(), fontWeight: 600 }}>
              {getPhaseLabel()}
            </span>
            <span style={{ fontSize: '13px', color: getProgressColor(), fontWeight: 600 }}>
              {progress}%
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, #9CA3AF, ${getProgressColor()})`
              }}
            />
          </div>
        </div>
      )}

      {imageUrl && (
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Uploaded design"
          style={{ display: 'none' }}
          onLoad={handleImageLoad}
          crossOrigin="anonymous"
        />
      )}

      {colors.length > 0 && (
        <>
          <div className="color-palette-section" style={{ marginTop: '24px' }}>
            <h3 className="section-title">提取的主色调</h3>
            <div className="colors-row">
              {colors.map((color, index) => (
                <div key={index} className="color-swatch">
                  <div
                    className="color-block"
                    style={{
                      backgroundColor: color.hex,
                      '--glow-color': color.hex + '66'
                    } as React.CSSProperties}
                    onClick={() => copyToClipboard(color.hex)}
                    title="点击复制HEX值"
                  />
                  <span className="color-hex">{color.hex.toUpperCase()}</span>
                  <div className="color-detail">
                    <div>RGB({color.rgb.r}, {color.rgb.g}, {color.rgb.b})</div>
                    <div>HSL({color.hsl.h}, {color.hsl.s}%, {color.hsl.l}%)</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <input
            type="text"
            className="name-input"
            placeholder="输入版本名称..."
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
          />

          <button
            className="save-btn"
            onClick={handleSave}
            disabled={isSaving || !versionName.trim() || colors.length !== 5}
          >
            {isSaving ? '保存中...' : '保存为配色方案版本'}
          </button>
        </>
      )}
    </div>
  )
}
