import { useState, useRef, useEffect, useCallback } from 'react'
import axios from 'axios'
import { Template, TemplateElement, PRESET_COLORS } from './mockData'

interface EditorProps {
  template: Template
  onBack: () => void
  onPublished: (shortId: string) => void
}

interface GuideLine {
  id: string
  type: 'horizontal' | 'vertical'
  position: number
  fading: boolean
}

const THUMBNAIL_WIDTH = 400
const THUMBNAIL_HEIGHT = 600
const SNAP_THRESHOLD = 8
const CANVAS_W = 600
const CANVAS_H = 900

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = THUMBNAIL_WIDTH
        let h = THUMBNAIL_HEIGHT
        const ratio = Math.min(w / img.width, h / img.height)
        w = Math.round(img.width * ratio)
        h = Math.round(img.height * ratio)
        canvas.width = THUMBNAIL_WIDTH
        canvas.height = THUMBNAIL_HEIGHT
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas error')); return }
        ctx.fillStyle = '#f9fafb'
        ctx.fillRect(0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT)
        const offsetX = (THUMBNAIL_WIDTH - w) / 2
        const offsetY = (THUMBNAIL_HEIGHT - h) / 2
        ctx.drawImage(img, offsetX, offsetY, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = () => reject(new Error('Image load error'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('File read error'))
    reader.readAsDataURL(file)
  })
}

export default function Editor({ template, onBack, onPublished }: EditorProps) {
  const [elements, setElements] = useState<TemplateElement[]>(
    () => JSON.parse(JSON.stringify(template.elements))
  )
  const [gradient, setGradient] = useState(template.gradient)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [guideLines, setGuideLines] = useState<GuideLine[]>([])
  const [showToolbar, setShowToolbar] = useState<{x: number; y: number} | null>(null)

  const canvasRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef<{
    id: string
    startX: number
    startY: number
    origX: number
    origY: number
  } | null>(null)
  const rafRef = useRef<number | null>(null)
  const pendingGuidesRef = useRef<GuideLine[]>([])
  const guideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedEl = elements.find((e) => e.id === selectedId) || null

  const updateElement = useCallback((id: string, patch: Partial<TemplateElement>) => {
    setElements((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }, [])

  const bringToFront = useCallback((id: string) => {
    setElements((prev) => {
      const maxZ = Math.max(...prev.map((e) => e.zIndex))
      return prev.map((e) => (e.id === id ? { ...e, zIndex: maxZ + 1 } : e))
    })
  }, [])

  const deleteElement = useCallback((id: string) => {
    setElements((prev) => prev.filter((e) => e.id !== id))
    setSelectedId(null)
    setShowToolbar(null)
  }, [])

  // 图片上传压缩
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageLoading(true)
    try {
      const compressed = await compressImage(file)
      if (selectedEl?.type === 'image') {
        updateElement(selectedEl.id, { src: compressed })
      } else {
        const imgEl = elements.find((el) => el.type === 'image')
        if (imgEl) {
          updateElement(imgEl.id, { src: compressed })
        } else {
          const maxZ = Math.max(...elements.map((e) => e.zIndex))
          setElements((prev) => [
            ...prev,
            {
              id: 'el-image-' + Date.now(),
              type: 'image',
              src: compressed,
              x: 100,
              y: 230,
              width: 400,
              height: 300,
              opacity: 1,
              zIndex: maxZ + 1
            }
          ])
        }
      }
    } catch (err) {
      console.error('图片压缩失败:', err)
    } finally {
      setImageLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // 参考线计算
  const calculateGuides = useCallback((dragEl: TemplateElement, newX: number, newY: number) => {
    const guides: GuideLine[] = []
    const dragCenterX = newX + dragEl.width / 2
    const dragCenterY = newY + dragEl.height / 2
    const dragRight = newX + dragEl.width
    const dragBottom = newY + dragEl.height
    let snapX = newX
    let snapY = newY
    let snappedX = false
    let snappedY = false

    // 画布参考线
    const canvasLines = {
      vertical: [0, CANVAS_W / 2, CANVAS_W, newX, dragCenterX, dragRight],
      horizontal: [0, CANVAS_H / 2, CANVAS_H, newY, dragCenterY, dragBottom]
    }

    // 画布中线参考
    if (Math.abs(newX - 0) < SNAP_THRESHOLD) { snapX = 0; snappedX = true }
    if (Math.abs(dragRight - CANVAS_W) < SNAP_THRESHOLD) { snapX = CANVAS_W - dragEl.width; snappedX = true }
    if (Math.abs(dragCenterX - CANVAS_W / 2) < SNAP_THRESHOLD) {
      snapX = CANVAS_W / 2 - dragEl.width / 2
      snappedX = true
      guides.push({ id: 'cv', type: 'vertical', position: CANVAS_W / 2, fading: false })
    }

    if (Math.abs(newY - 0) < SNAP_THRESHOLD) { snapY = 0; snappedY = true }
    if (Math.abs(dragBottom - CANVAS_H) < SNAP_THRESHOLD) { snapY = CANVAS_H - dragEl.height; snappedY = true }
    if (Math.abs(dragCenterY - CANVAS_H / 2) < SNAP_THRESHOLD) {
      snapY = CANVAS_H / 2 - dragEl.height / 2
      snappedY = true
      guides.push({ id: 'ch', type: 'horizontal', position: CANVAS_H / 2, fading: false })
    }

    // 其他元素参考线
    elements.forEach((el) => {
      if (el.id === dragEl.id) return
      const otherLines = {
        left: el.x,
        centerX: el.x + el.width / 2,
        right: el.x + el.width,
        top: el.y,
        centerY: el.y + el.height / 2,
        bottom: el.y + el.height
      }

      // 垂直对齐
      const vChecks = [
        { drag: newX, other: otherLines.left, label: 'left' },
        { drag: newX, other: otherLines.centerX, label: 'cx' },
        { drag: newX, other: otherLines.right, label: 'right' },
        { drag: dragCenterX, other: otherLines.left, label: 'dcl' },
        { drag: dragCenterX, other: otherLines.centerX, label: 'dccx' },
        { drag: dragCenterX, other: otherLines.right, label: 'dcr' },
        { drag: dragRight, other: otherLines.left, label: 'drl' },
        { drag: dragRight, other: otherLines.centerX, label: 'drcx' },
        { drag: dragRight, other: otherLines.right, label: 'drr' }
      ]
      vChecks.forEach((c) => {
        if (Math.abs(c.drag - c.other) < SNAP_THRESHOLD) {
          const offset = c.drag - newX
          if (!snappedX || Math.abs(offset) < Math.abs(snapX - newX)) {
            snapX = c.other - offset
            snappedX = true
          }
          if (!guides.find((g) => g.type === 'vertical' && g.position === c.other)) {
            guides.push({ id: `v-${c.label}-${el.id}`, type: 'vertical', position: c.other, fading: false })
          }
        }
      })

      // 水平对齐
      const hChecks = [
        { drag: newY, other: otherLines.top, label: 'top' },
        { drag: newY, other: otherLines.centerY, label: 'cy' },
        { drag: newY, other: otherLines.bottom, label: 'bottom' },
        { drag: dragCenterY, other: otherLines.top, label: 'dct' },
        { drag: dragCenterY, other: otherLines.centerY, label: 'dccy' },
        { drag: dragCenterY, other: otherLines.bottom, label: 'dcb' },
        { drag: dragBottom, other: otherLines.top, label: 'dbt' },
        { drag: dragBottom, other: otherLines.centerY, label: 'dbcy' },
        { drag: dragBottom, other: otherLines.bottom, label: 'dbb' }
      ]
      hChecks.forEach((c) => {
        if (Math.abs(c.drag - c.other) < SNAP_THRESHOLD) {
          const offset = c.drag - newY
          if (!snappedY || Math.abs(offset) < Math.abs(snapY - newY)) {
            snapY = c.other - offset
            snappedY = true
          }
          if (!guides.find((g) => g.type === 'horizontal' && g.position === c.other)) {
            guides.push({ id: `h-${c.label}-${el.id}`, type: 'horizontal', position: c.other, fading: false })
          }
        }
      })
    })

    return { snapX, snapY, guides }
  }, [elements])

  const fadeGuidesAfter = useCallback(() => {
    if (guideTimerRef.current) clearTimeout(guideTimerRef.current)
    guideTimerRef.current = setTimeout(() => {
      setGuideLines((prev) => prev.map((g) => ({ ...g, fading: true })))
      setTimeout(() => setGuideLines([]), 320)
    }, 300)
  }, [])

  // 拖拽事件
  const onMouseDown = (e: React.MouseEvent, el: TemplateElement) => {
    e.stopPropagation()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const scale = rect.width / CANVAS_W
    setSelectedId(el.id)
    draggingRef.current = {
      id: el.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: el.x,
      origY: el.y
    }
  }

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const info = draggingRef.current
      if (!info) return
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const scale = rect.width / CANVAS_W
      const dx = (e.clientX - info.startX) / scale
      const dy = (e.clientY - info.startY) / scale

      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        setElements((prev) => {
          const idx = prev.findIndex((e) => e.id === info.id)
          if (idx === -1) return prev
          const dragEl = prev[idx]
          let newX = info.origX + dx
          let newY = info.origY + dy
          newX = Math.max(0, Math.min(CANVAS_W - dragEl.width, newX))
          newY = Math.max(0, Math.min(CANVAS_H - dragEl.height, newY))

          const { snapX, snapY, guides } = calculateGuides(dragEl, newX, newY)
          pendingGuidesRef.current = guides
          setGuideLines(guides)

          const next = [...prev]
          next[idx] = { ...dragEl, x: snapX, y: snapY }
          return next
        })
      })
    }

    const onMouseUp = () => {
      if (!draggingRef.current) return
      draggingRef.current = null
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      // 更新浮动工具栏位置
      const info = draggingRef.current
      if (info) {
        const el = elements.find((e) => e.id === info.id)
        if (el) {
          setShowToolbar({ x: el.x + el.width / 2, y: el.y - 50 })
        }
      }
      fadeGuidesAfter()
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [elements, calculateGuides, fadeGuidesAfter])

  // 点击画布空白取消选中
  const onCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('canvas-inner')) {
      setSelectedId(null)
      setShowToolbar(null)
      setShowColorPicker(false)
    }
  }

  // 点击元素时显示浮动工具栏
  const onElementClick = (e: React.MouseEvent, el: TemplateElement) => {
    e.stopPropagation()
    setSelectedId(el.id)
    const rect = canvasRef.current?.getBoundingClientRect()
    const scale = rect ? rect.width / CANVAS_W : 1
    setShowToolbar({
      x: el.x + el.width / 2,
      y: el.y - 10
    })
  }

  // 发布
  const handlePublish = async () => {
    setPublishing(true)
    try {
      const res = await axios.post('/api/save', {
        templateId: template.id,
        elements,
        gradient
      })
      if (res.data.success) {
        onPublished(res.data.data.shortId)
      }
    } catch (err) {
      console.error('发布失败:', err)
    } finally {
      setPublishing(false)
    }
  }

  // 文字元素快速映射
  const textFieldMap = [
    { key: 'title', label: '标题', hint: '活动名称' },
    { key: 'subtitle', label: '副标题', hint: '活动描述' },
    { key: 'date', label: '日期', hint: '举办时间' },
    { key: 'location', label: '地点', hint: '活动地点' }
  ]

  const findTextElement = (key: string) => {
    return elements.find((e) => e.id.includes(key)) || null
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      padding: '20px',
      gap: '20px',
      position: 'relative',
      flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
    }}>
      {/* 左侧工具栏 */}
      <aside style={{
        width: window.innerWidth <= 768 ? '100%' : 220,
        flexShrink: 0,
        background: '#ffffff',
        borderRadius: 16,
        padding: 20,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto',
        position: window.innerWidth <= 768 ? 'relative' : 'sticky',
        top: window.innerWidth <= 768 ? undefined : 20,
        zIndex: 10
      }}>
        <div style={{ marginBottom: 18 }}>
          <button
            onClick={onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              color: '#64748b',
              fontSize: 13,
              padding: '4px 8px',
              borderRadius: 8
            }}
          >
            ← 返回选择
          </button>
        </div>

        <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 20 }}>
          ✏️ 编辑海报
        </div>

        {/* 文字编辑区 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📝</span> 文字内容
          </div>
          {textFieldMap.map((f) => {
            const el = findTextElement(f.key)
            return (
              <div key={f.key} style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                  {f.label}
                </label>
                <input
                  type="text"
                  value={el?.content || ''}
                  placeholder={f.hint}
                  onChange={(e) => el && updateElement(el.id, { content: e.target.value })}
                  onFocus={() => el && setSelectedId(el.id)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    fontSize: 13,
                    transition: 'all ease-out 0.3s',
                    background: selectedId === el?.id ? '#f0f9ff' : '#ffffff'
                  }}
                  onFocusCapture={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
                  onBlurCapture={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                />
              </div>
            )
          })}
        </div>

        {/* 选中元素编辑 */}
        {selectedEl && (
          <div style={{ marginBottom: 24, padding: 12, background: '#f8fafc', borderRadius: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 12 }}>
              🎛️ {selectedEl.type === 'text' ? '文字样式' : '图片设置'}
            </div>
            {selectedEl.type === 'text' && (
              <>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                    字号: {selectedEl.fontSize}px
                  </label>
                  <input
                    type="range"
                    min={12}
                    max={60}
                    value={selectedEl.fontSize || 20}
                    onChange={(e) => updateElement(selectedEl.id, { fontSize: Number(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                    字重
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[400, 500, 700].map((w) => (
                      <button
                        key={w}
                        onClick={() => updateElement(selectedEl.id, { fontWeight: w })}
                        style={{
                          flex: 1,
                          padding: '6px 0',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: w as 400,
                          background: selectedEl.fontWeight === w ? '#3b82f6' : '#ffffff',
                          color: selectedEl.fontWeight === w ? '#fff' : '#475569',
                          border: '1px solid #e2e8f0'
                        }}
                      >
                        {w === 400 ? '常规' : w === 500 ? '中等' : '加粗'}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                透明度: {Math.round((selectedEl.opacity || 1) * 100)}%
              </label>
              <input
                type="range"
                min={10}
                max={100}
                value={(selectedEl.opacity || 1) * 100}
                onChange={(e) => updateElement(selectedEl.id, { opacity: Number(e.target.value) / 100 })}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        )}

        {/* 图片上传 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🖼️</span> 图片上传
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={imageLoading}
            style={{
              width: '100%',
              padding: '12px',
              background: 'linear-gradient(135deg, #dbeafe, #ede9fe)',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
              color: '#1e40af',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            {imageLoading ? <div className="spinner" /> : '📷 选择图片'}
          </button>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6, textAlign: 'center' }}>
            自动压缩为 400×600 缩略图
          </div>
        </div>

        {/* 颜色选择器 */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#475569',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
            onClick={() => setShowColorPicker((v) => !v)}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🎨</span> 文字颜色
            </span>
            <span style={{ fontSize: 14 }}>{showColorPicker ? '−' : '+'}</span>
          </div>
          {showColorPicker && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {PRESET_COLORS.map((c) => (
                <div
                  key={c}
                  className={`color-circle ${selectedEl?.color === c ? 'selected' : ''}`}
                  style={{
                    background: c,
                    border: c === '#ffffff' ? '2px solid #e5e7eb' : '2px solid transparent'
                  }}
                  onClick={() => {
                    if (selectedEl?.type === 'text') {
                      updateElement(selectedEl.id, { color: c })
                    }
                  }}
                  title={c}
                />
              ))}
            </div>
          )}
        </div>

        {/* 背景渐变 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 12 }}>
            🌈 背景渐变色
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, color: '#94a3b8', display: 'block', marginBottom: 4 }}>起始色</label>
              <input
                type="color"
                value={gradient.from}
                onChange={(e) => setGradient({ ...gradient, from: e.target.value })}
                style={{ width: '100%', height: 32, border: 'none', borderRadius: 8, cursor: 'pointer' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, color: '#94a3b8', display: 'block', marginBottom: 4 }}>结束色</label>
              <input
                type="color"
                value={gradient.to}
                onChange={(e) => setGradient({ ...gradient, to: e.target.value })}
                style={{ width: '100%', height: 32, border: 'none', borderRadius: 8, cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

        {/* 发布按钮 */}
        <button
          onClick={handlePublish}
          disabled={publishing}
          style={{
            width: '100%',
            padding: '14px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            color: '#ffffff',
            boxShadow: '0 4px 16px rgba(59,130,246,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}
        >
          {publishing ? <div className="spinner" /> : '🚀 发布海报'}
        </button>
      </aside>

      {/* 右侧预览区 */}
      <main style={{
        flex: 1,
        background: '#f3f4f6',
        borderRadius: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: window.innerWidth <= 768 ? 10 : 30,
        minHeight: window.innerWidth <= 768 ? 'auto' : 'calc(100vh - 40px)',
        overflow: 'auto'
      }}>
        <div
          style={{
            position: 'relative'
          }}
        >
          <div
            ref={canvasRef}
            className="canvas-wrapper"
            onClick={onCanvasClick}
            style={{
              width: 600,
              maxWidth: window.innerWidth <= 768 ? '100%' : 600,
              height: window.innerWidth <= 768 ? 'auto' : 900,
              aspectRatio: window.innerWidth <= 768 ? `${CANVAS_W} / ${CANVAS_H}` : undefined,
              background: `linear-gradient(160deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              borderRadius: 16
            }}
          >
            <div className="canvas-inner" style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%'
            }}>
              {/* 渲染元素 - 使用百分比定位实现响应式 */}
              {[...elements].sort((a, b) => a.zIndex - b.zIndex).map((el) => {
                const isSelected = selectedId === el.id
                return (
                  <div
                    key={el.id}
                    className={`${isSelected ? 'element-selected' : 'element-hover'}`}
                    onMouseDown={(e) => onMouseDown(e, el)}
                    onClick={(e) => onElementClick(e, el)}
                    style={{
                      position: 'absolute',
                      left: `${(el.x / CANVAS_W) * 100}%`,
                      top: `${(el.y / CANVAS_H) * 100}%`,
                      width: `${(el.width / CANVAS_W) * 100}%`,
                      height: `${(el.height / CANVAS_H) * 100}%`,
                      opacity: el.opacity,
                      zIndex: el.zIndex,
                      userSelect: 'none',
                      cursor: 'move'
                    }}
                  >
                    {el.type === 'text' && (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        fontSize: `${(el.fontSize || 20) / CANVAS_W * 600}px`,
                        fontWeight: el.fontWeight || 400,
                        color: el.color || '#1f2937',
                        lineHeight: 1.3,
                        display: 'flex',
                        alignItems: 'center',
                        overflow: 'hidden',
                        wordBreak: 'break-word'
                      }}>
                        {el.content || ''}
                      </div>
                    )}
                    {el.type === 'image' && el.src && (
                      <img
                        src={el.src}
                        alt=""
                        draggable={false}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: 8,
                          pointerEvents: 'none'
                        }}
                      />
                    )}
                    {el.type === 'image' && !el.src && (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        background: 'rgba(255,255,255,0.4)',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(0,0,0,0.25)',
                        fontSize: `${40 / CANVAS_W * 600}px`,
                        border: '2px dashed rgba(0,0,0,0.1)'
                      }}>
                        📷
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* 参考线 */}
            {guideLines.map((g) => (
              <div
                key={g.id}
                className={`guide-line ${g.type} ${g.fading ? 'fading' : ''}`}
                style={{
                  [g.type === 'horizontal' ? 'top' : 'left']: `${(g.position / (g.type === 'horizontal' ? CANVAS_H : CANVAS_W)) * 100}%`
                }}
              />
            ))}

            {/* 浮动工具栏 */}
            {showToolbar && selectedId && (() => {
              const el = elements.find((e) => e.id === selectedId)
              if (!el) return null
              return (
                <div
                  className="float-toolbar"
                  style={{
                    left: `${(el.x / CANVAS_W) * 100}%`,
                    top: `${((el.y - 50) / CANVAS_H) * 100}%`,
                    transform: `translateX(calc(${(el.width / CANVAS_W) * 50}% - 50%))`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button title="置顶" onClick={() => bringToFront(selectedId)}>⬆</button>
                  <button title="删除" onClick={() => deleteElement(selectedId)}>🗑</button>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '0 6px', gap: 4, borderLeft: '1px solid #e5e7eb' }}>
                    <span style={{ fontSize: 10, color: '#64748b' }}>透明</span>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={(el.opacity || 1) * 100}
                      onChange={(e) => updateElement(selectedId, { opacity: Number(e.target.value) / 100 })}
                      style={{ width: 60, cursor: 'pointer' }}
                    />
                  </div>
                </div>
              )
            })()}
          </div>

          {/* 画布尺寸标签 */}
          <div style={{
            position: 'absolute',
            bottom: -28,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 11,
            color: '#94a3b8',
            background: 'rgba(255,255,255,0.8)',
            padding: '3px 10px',
            borderRadius: 10
          }}>
            600 × 900 px
          </div>
        </div>
      </main>
    </div>
  )
}
