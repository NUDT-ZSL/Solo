import { useState, useRef, useCallback } from 'react'
import ColorThief from 'colorthief'
import { createVersion } from '../api'
import { rgbToHex, rgbToHsl, isLightColor } from '../utils/colorUtils'
import { ColorValue, PaletteVersion } from '../types'

interface ColorPaletteProps {
  onVersionCreated: (version: PaletteVersion) => void
}

export default function ColorPalette({ onVersionCreated }: ColorPaletteProps) {
  const [colors, setColors] = useState<ColorValue[]>([])
  const [imageUrl, setImageUrl] = useState<string>('')
  const [progress, setProgress] = useState(0)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [versionName, setVersionName] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

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
    setProgress(0)
    setIsExtracting(true)
    setVersionName(file.name.replace(/\.[^/.]+$/, ''))

    const reader = new FileReader()
    
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 50)
        setProgress(percent)
      }
    }

    reader.onload = (e) => {
      const result = e.target?.result as string
      setImageUrl(result)
      setProgress(50)
    }

    reader.readAsDataURL(file)
  }, [])

  const handleImageLoad = useCallback(() => {
    if (!imgRef.current) return

    setProgress(60)

    setTimeout(() => {
      try {
        const colorThief = new ColorThief()
        const palette = colorThief.getPalette(imgRef.current, 5)
        
        const colorValues: ColorValue[] = palette.map(([r, g, b]) => {
          const hex = rgbToHex(r, g, b)
          const hsl = rgbToHsl(r, g, b)
          return {
            hex,
            rgb: { r, g, b },
            hsl
          }
        })

        setColors(colorValues)
        
        let currentProgress = 60
        const interval = setInterval(() => {
          currentProgress += 5
          setProgress(Math.min(currentProgress, 100))
          if (currentProgress >= 100) {
            clearInterval(interval)
            setIsExtracting(false)
          }
        }, 50)
      } catch (error) {
        console.error('Error extracting colors:', error)
        alert('提取色值失败，请重试')
        setIsExtracting(false)
      }
    }, 200)
  }, [])

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
      setProgress(0)
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

      {(isExtracting || progress > 0) && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
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
