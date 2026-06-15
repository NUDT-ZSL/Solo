import { useState, useEffect, useRef, useCallback } from 'react'
import { saveAs } from 'file-saver'

interface EditorPanelProps {
  imageDataUrl: string
  onClose: () => void
}

type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'

interface DownloadFormat {
  id: string
  name: string
  type: string
  quality: number
  icon: string
}

const PRESET_COLORS = [
  '#f44336', '#e91e63', '#9c27b0', '#673ab7',
  '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
  '#009688', '#4caf50', '#8bc34a', '#cddc39',
  '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'
]

const DOWNLOAD_FORMATS: DownloadFormat[] = [
  { id: 'png', name: 'PNG 400%', type: 'image/png', quality: 1, icon: '🖼️' },
  { id: 'jpg', name: 'JPG 400%', type: 'image/jpeg', quality: 0.95, icon: '📷' },
  { id: 'webp', name: 'WebP 400%', type: 'image/webp', quality: 0.95, icon: '🎨' }
]

function EditorPanel({ imageDataUrl, onClose }: EditorPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [imageLoaded, setImageLoaded] = useState(false)
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 })
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 })
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [previewBounce, setPreviewBounce] = useState(false)

  const [watermarkText, setWatermarkText] = useState('')
  const [watermarkPosition, setWatermarkPosition] = useState<WatermarkPosition>('bottom-right')
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.5)
  const [borderWidth, setBorderWidth] = useState(0)
  const [borderColor, setBorderColor] = useState('#2196f3')
  const [borderRadius, setBorderRadius] = useState(0)
  const [customColorInput, setCustomColorInput] = useState(false)

  const paramsRef = useRef({
    watermarkText: '',
    watermarkPosition: 'bottom-right' as WatermarkPosition,
    watermarkOpacity: 0.5,
    borderWidth: 0,
    borderColor: '#2196f3',
    borderRadius: 0,
    originalWidth: 0,
    originalHeight: 0,
    imageLoaded: false
  })

  const updateParams = useCallback(() => {
    paramsRef.current = {
      watermarkText,
      watermarkPosition,
      watermarkOpacity,
      borderWidth,
      borderColor,
      borderRadius,
      originalWidth: originalSize.width,
      originalHeight: originalSize.height,
      imageLoaded
    }
  }, [watermarkText, watermarkPosition, watermarkOpacity, borderWidth, borderColor, borderRadius, originalSize, imageLoaded])

  updateParams()

  const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    const r = Math.min(radius, width / 2, height / 2)
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + width - r, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + r)
    ctx.lineTo(x + width, y + height - r)
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
    ctx.lineTo(x + r, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const img = imageRef.current
    const p = paramsRef.current
    if (!canvas || !img || !p.imageLoaded) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const totalBorderWidth = p.borderWidth * 2
    const outputWidth = p.originalWidth + totalBorderWidth
    const outputHeight = p.originalHeight + totalBorderWidth

    canvas.width = outputWidth
    canvas.height = outputHeight

    ctx.clearRect(0, 0, outputWidth, outputHeight)

    if (p.borderWidth > 0 && p.borderRadius > 0) {
      ctx.save()
      ctx.fillStyle = p.borderColor
      roundRect(ctx, 0, 0, outputWidth, outputHeight, p.borderRadius + p.borderWidth / 2)
      ctx.fill()
      ctx.restore()

      ctx.save()
      ctx.beginPath()
      roundRect(ctx, p.borderWidth, p.borderWidth, p.originalWidth, p.originalHeight, p.borderRadius)
      ctx.clip()
      ctx.drawImage(img, p.borderWidth, p.borderWidth, p.originalWidth, p.originalHeight)
      ctx.restore()
    } else if (p.borderWidth > 0) {
      ctx.fillStyle = p.borderColor
      ctx.fillRect(0, 0, outputWidth, outputHeight)
      ctx.drawImage(img, p.borderWidth, p.borderWidth, p.originalWidth, p.originalHeight)
    } else {
      ctx.drawImage(img, 0, 0, p.originalWidth, p.originalHeight)
    }

    if (p.watermarkText.trim()) {
      ctx.save()
      ctx.globalAlpha = p.watermarkOpacity
      ctx.font = `${Math.max(14, p.originalWidth * 0.03)}px Arial, sans-serif`
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.lineWidth = Math.max(2, p.originalWidth * 0.004)
      ctx.textBaseline = 'top'

      const text = p.watermarkText
      const textWidth = ctx.measureText(text).width
      const textHeight = parseInt(ctx.font) * 1.2
      const padding = Math.max(10, p.originalWidth * 0.02)

      let x = padding
      let y = padding

      switch (p.watermarkPosition) {
        case 'top-left':
          x = padding
          y = padding
          break
        case 'top-right':
          x = outputWidth - textWidth - padding
          y = padding
          break
        case 'bottom-left':
          x = padding
          y = outputHeight - textHeight - padding
          break
        case 'bottom-right':
          x = outputWidth - textWidth - padding
          y = outputHeight - textHeight - padding
          break
        case 'center':
          x = (outputWidth - textWidth) / 2
          y = (outputHeight - textHeight) / 2
          break
      }

      if (p.borderWidth > 0) {
        if (p.watermarkPosition === 'top-left' || p.watermarkPosition === 'bottom-left') {
          x += p.borderWidth
        }
        if (p.watermarkPosition === 'top-right' || p.watermarkPosition === 'bottom-right') {
          x -= p.borderWidth
        }
        if (p.watermarkPosition === 'top-left' || p.watermarkPosition === 'top-right') {
          y += p.borderWidth
        }
        if (p.watermarkPosition === 'bottom-left' || p.watermarkPosition === 'bottom-right') {
          y -= p.borderWidth
        }
      }

      ctx.strokeText(text, x, y)
      ctx.fillText(text, x, y)
      ctx.restore()
    }

    const canvasContainer = canvas.parentElement
    if (canvasContainer) {
      const maxWidth = 420
      const maxHeight = 380
      const scale = Math.min(maxWidth / outputWidth, maxHeight / outputHeight, 1)
      setDisplaySize({
        width: Math.round(outputWidth * scale),
        height: Math.round(outputHeight * scale)
      })
    }

    rafRef.current = null
  }, [])

  const triggerRedraw = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      rafRef.current = requestAnimationFrame(() => {
        const startTime = performance.now()
        drawCanvas()
        const elapsed = performance.now() - startTime
        if (elapsed > 200) {
          console.warn(`Canvas redraw took ${elapsed.toFixed(2)}ms, exceeds 200ms target`)
        }
      })
      setPreviewBounce(true)
      if (bounceTimeoutRef.current) {
        clearTimeout(bounceTimeoutRef.current)
      }
      bounceTimeoutRef.current = setTimeout(() => {
        setPreviewBounce(false)
      }, 150)
    }, 12)
  }, [drawCanvas])

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageRef.current = img
      setOriginalSize({ width: img.width, height: img.height })
      setImageLoaded(true)
    }
    img.src = imageDataUrl
  }, [imageDataUrl])

  useEffect(() => {
    if (imageLoaded) {
      triggerRedraw()
    }
  }, [imageLoaded, watermarkText, watermarkPosition, watermarkOpacity, borderWidth, borderColor, borderRadius, triggerRedraw])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDownloadModal) {
          setShowDownloadModal(false)
        } else {
          onClose()
        }
      }
      if (e.key === 'Enter' && !showDownloadModal) {
        e.preventDefault()
        setShowDownloadModal(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, showDownloadModal])

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      if (bounceTimeoutRef.current) {
        clearTimeout(bounceTimeoutRef.current)
      }
    }
  }, [])

  const handleReset = () => {
    setWatermarkText('')
    setWatermarkPosition('bottom-right')
    setWatermarkOpacity(0.5)
    setBorderWidth(0)
    setBorderColor('#2196f3')
    setBorderRadius(0)
  }

  const handleDownload = async (format: DownloadFormat) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const startTime = performance.now()

    const outputCanvas = document.createElement('canvas')
    const outputCtx = outputCanvas.getContext('2d')
    if (!outputCtx) return

    const scale = 4
    const srcWidth = canvas.width
    const srcHeight = canvas.height

    outputCanvas.width = srcWidth * scale
    outputCanvas.height = srcHeight * scale

    outputCtx.imageSmoothingEnabled = true
    outputCtx.imageSmoothingQuality = 'high'
    outputCtx.drawImage(canvas, 0, 0, outputCanvas.width, outputCanvas.height)

    const blob = await new Promise<Blob | null>((resolve) => {
      outputCanvas.toBlob(resolve, format.type, format.quality)
    })

    if (blob) {
      const fileName = `screenshot_${Date.now()}.${format.id}`
      saveAs(blob, fileName)
    }

    const elapsed = performance.now() - startTime
    console.log(`Download generation took: ${elapsed.toFixed(2)}ms`)

    setShowDownloadModal(false)
  }

  const positionOptions: { value: WatermarkPosition; label: string; icon: string }[] = [
    { value: 'top-left', label: '左上', icon: '↖' },
    { value: 'top-right', label: '右上', icon: '↗' },
    { value: 'bottom-left', label: '左下', icon: '↙' },
    { value: 'bottom-right', label: '右下', icon: '↘' },
    { value: 'center', label: '居中', icon: '●' }
  ]

  return (
    <>
      {/* 背景覆盖层 */}
      <div
        className="overlay-fade-in"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10000
        }}
        onClick={onClose}
      />

      {/* 编辑器面板 - 严格720x500 */}
      <div
        className="editor-slide-in"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '720px',
          height: '500px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          zIndex: 10001,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 主内容区 */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* 左侧画布区域 */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: '16px',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* 画布容器 */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'repeating-conic-gradient(#f0f0f0 0% 25%, #ffffff 0% 50%) 50% / 20px 20px',
                borderRadius: '8px',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              {imageLoaded ? (
                <canvas
                  ref={canvasRef}
                  className={previewBounce ? 'preview-bounce' : ''}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    display: 'block'
                  }}
                />
              ) : (
                <div style={{ color: '#999', fontSize: '14px' }}>加载中...</div>
              )}
            </div>

            {/* 尺寸信息 */}
            <div
              style={{
                paddingTop: '8px',
                fontSize: '12px',
                color: '#666',
                fontFamily: 'monospace'
              }}
            >
              原始: {originalSize.width} × {originalSize.height} px
              <span style={{ margin: '0 8px', color: '#ccc' }}>|</span>
              显示: {displaySize.width} × {displaySize.height} px
            </div>
          </div>

          {/* 右侧工具栏 - 200px宽 */}
          <div
            className="custom-scrollbar"
            style={{
              width: '200px',
              backgroundColor: '#f5f5f5',
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}
          >
            {/* 水印设置 */}
            <div>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#333',
                marginBottom: '12px'
              }}>
                💧 水印文字
              </h3>
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value.slice(0, 30))}
                placeholder="输入水印文字（最多30字）"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '13px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  outline: 'none',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  marginBottom: '8px'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2196f3'
                  e.target.style.boxShadow = '0 0 0 3px rgba(33, 150, 243, 0.15)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#ddd'
                  e.target.style.boxShadow = 'none'
                }}
              />
              <div style={{ fontSize: '11px', color: '#999', textAlign: 'right' }}>
                {watermarkText.length}/30
              </div>
            </div>

            {/* 水印位置 */}
            <div>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#333',
                marginBottom: '12px'
              }}>
                📍 水印位置
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '6px'
              }}>
                {positionOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setWatermarkPosition(option.value)}
                    title={option.label}
                    style={{
                      aspectRatio: '1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      border: watermarkPosition === option.value
                        ? '2px solid #2196f3'
                        : '1px solid #ddd',
                      borderRadius: '6px',
                      backgroundColor: watermarkPosition === option.value
                        ? '#e3f2fd'
                        : '#ffffff',
                      color: watermarkPosition === option.value ? '#2196f3' : '#666',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (watermarkPosition !== option.value) {
                        e.currentTarget.style.borderColor = '#bbb'
                        e.currentTarget.style.transform = 'scale(1.05)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (watermarkPosition !== option.value) {
                        e.currentTarget.style.borderColor = '#ddd'
                        e.currentTarget.style.transform = 'scale(1)'
                      }
                    }}
                  >
                    {option.icon}
                  </button>
                ))}
              </div>
            </div>

            {/* 水印透明度 */}
            <div>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#333',
                marginBottom: '12px'
              }}>
                👁️ 透明度
                <span style={{
                  float: 'right',
                  fontSize: '12px',
                  color: '#2196f3',
                  fontWeight: 500
                }}>
                  {watermarkOpacity.toFixed(1)}
                </span>
              </h3>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={watermarkOpacity}
                onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* 分隔线 */}
            <div style={{
              height: '1px',
              backgroundColor: '#e0e0e0',
              margin: '4px 0'
            }} />

            {/* 边框宽度 */}
            <div>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#333',
                marginBottom: '12px'
              }}>
                📏 边框宽度
                <span style={{
                  float: 'right',
                  fontSize: '12px',
                  color: '#2196f3',
                  fontWeight: 500
                }}>
                  {borderWidth}px
                </span>
              </h3>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={borderWidth}
                onChange={(e) => setBorderWidth(parseInt(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* 边框颜色 */}
            <div>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#333',
                marginBottom: '12px'
              }}>
                🎨 边框颜色
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
                marginBottom: '10px'
              }}>
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      setBorderColor(color)
                      setCustomColorInput(false)
                    }}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: color,
                      border: 'none',
                      outline: borderColor === color && !customColorInput
                        ? '2px solid #000000'
                        : '1px solid rgba(0,0,0,0.15)',
                      outlineOffset: borderColor === color && !customColorInput
                        ? '2px'
                        : '0px',
                      cursor: 'pointer',
                      padding: 0,
                      justifySelf: 'center',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)'
                      e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.25)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  />
                ))}
              </div>
              {/* 自定义颜色 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 8px',
                backgroundColor: '#ffffff',
                borderRadius: '6px',
                border: customColorInput ? '2px solid #2196f3' : '1px solid #e0e0e0',
                transition: 'border-color 0.15s ease'
              }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '4px',
                    backgroundColor: borderColor,
                    border: '1px solid #ddd',
                    flexShrink: 0
                  }}
                />
                <input
                  type="text"
                  value={borderColor}
                  onChange={(e) => {
                    setBorderColor(e.target.value)
                    setCustomColorInput(true)
                  }}
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    background: 'transparent',
                    color: '#333',
                    padding: 0
                  }}
                />
              </div>
            </div>

            {/* 边框圆角 */}
            <div>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#333',
                marginBottom: '12px'
              }}>
                ⭕ 边框圆角
                <span style={{
                  float: 'right',
                  fontSize: '12px',
                  color: '#2196f3',
                  fontWeight: 500
                }}>
                  {borderRadius}px
                </span>
              </h3>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={borderRadius}
                onChange={(e) => setBorderRadius(parseInt(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

        {/* 底部按钮栏 */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderTop: '1px solid #e0e0e0',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <button
            onClick={handleReset}
            style={{
              padding: '8px 20px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#333',
              backgroundColor: '#e0e0e0',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#bdbdbd'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#e0e0e0'
            }}
          >
            重置
          </button>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#f44336',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                textDecoration: 'none',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none'
              }}
            >
              取消
            </button>
            <button
              onClick={() => setShowDownloadModal(true)}
              style={{
                padding: '8px 24px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#ffffff',
                backgroundColor: '#4caf50',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#388e3c'
                e.currentTarget.style.transform = 'scale(1.05)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#4caf50'
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(76, 175, 80, 0.3)'
              }}
            >
              下载
            </button>
          </div>
        </div>
      </div>

      {/* 下载格式选择弹窗 */}
      {showDownloadModal && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(4px)',
              zIndex: 10002
            }}
            onClick={() => setShowDownloadModal(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '24px',
              zIndex: 10003,
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#333',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              选择下载格式
            </h3>
            <div style={{
              display: 'flex',
              gap: '16px'
            }}>
              {DOWNLOAD_FORMATS.map((format) => (
                <button
                  key={format.id}
                  onClick={() => handleDownload(format)}
                  style={{
                    width: '120px',
                    padding: '20px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                    backgroundColor: '#f8f9fa',
                    border: '2px solid transparent',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#2196f3'
                    e.currentTarget.style.backgroundColor = '#e3f2fd'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(33, 150, 243, 0.2)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'transparent'
                    e.currentTarget.style.backgroundColor = '#f8f9fa'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <span style={{ fontSize: '36px' }}>{format.icon}</span>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#333'
                  }}>
                    {format.name}
                  </span>
                </button>
              ))}
            </div>
            <div style={{
              marginTop: '16px',
              textAlign: 'center',
              fontSize: '12px',
              color: '#999'
            }}>
              4倍分辨率高清导出
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default EditorPanel
