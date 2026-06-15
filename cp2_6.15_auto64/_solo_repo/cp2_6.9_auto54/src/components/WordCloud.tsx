import { useRef, useEffect, useState, useCallback } from 'react'
import cloud from 'd3-cloud'
import throttle from 'lodash.throttle'
import type { WordItem, ColorTheme, BgColor, FontFamily } from '../App'

interface WordCloudProps {
  words: WordItem[]
  selectedWord: WordItem | null
  fontFamily: FontFamily
  colorTheme: ColorTheme
  bgColor: BgColor
  wordSpacing: number
  scale: number
  setScale: (s: number) => void
  onSelectWord: (word: WordItem) => void
  onUpdatePosition: (index: number, x: number, y: number) => void
  onUpdateColor: (index: number, color: string) => void
  onUpdateSize: (index: number, width: number, height: number) => void
}

const CANVAS_WIDTH = 600
const CANVAS_HEIGHT = 500

const getThemeColor = (theme: ColorTheme, index: number, total: number): string => {
  const t = index / Math.max(total - 1, 1)
  switch (theme) {
    case 'rainbow': {
      const hue = t * 360
      return `hsl(${hue}, 70%, 50%)`
    }
    case 'warmCool': {
      const hue = t < 0.5 ? 0 + t * 60 : 200 + (t - 0.5) * 40
      return `hsl(${hue}, 75%, 55%)`
    }
    case 'deepBlue': {
      const lightness = 30 + t * 40
      return `hsl(210, 80%, ${lightness}%)`
    }
    case 'neon': {
      const colors = ['#ff00ff', '#00ffff', '#ff0080', '#80ff00', '#ffff00', '#ff8000', '#8000ff', '#00ff80']
      return colors[index % colors.length]
    }
    default:
      return '#333333'
  }
}

const darkenColor = (color: string, amount: number = 0.2): string => {
  if (color.startsWith('hsl')) {
    const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
    if (match) {
      const h = parseInt(match[1])
      const s = parseInt(match[2])
      const l = Math.max(0, parseInt(match[3]) * (1 - amount))
      return `hsl(${h}, ${s}%, ${l}%)`
    }
  }
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    const dr = Math.max(0, Math.floor(r * (1 - amount)))
    const dg = Math.max(0, Math.floor(g * (1 - amount)))
    const db = Math.max(0, Math.floor(b * (1 - amount)))
    return `rgb(${dr}, ${dg}, ${db})`
  }
  return color
}

const WordCloud = ({
  words,
  selectedWord,
  fontFamily,
  colorTheme,
  bgColor,
  wordSpacing,
  scale,
  setScale,
  onSelectWord,
  onUpdatePosition,
  onUpdateColor,
  onUpdateSize,
}: WordCloudProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [localWords, setLocalWords] = useState<WordItem[]>([])
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const layoutCalculatedRef = useRef(false)

  useEffect(() => {
    if (words.length === 0) {
      setLocalWords([])
      layoutCalculatedRef.current = false
      return
    }

    const needsLayout = !layoutCalculatedRef.current ||
      localWords.length !== words.length ||
      localWords.some((w, i) => w.text !== words[i].text || w.size !== words[i].size)

    if (needsLayout && !layoutCalculatedRef.current) {
      const layout = cloud()
        .size([CANVAS_WIDTH, CANVAS_HEIGHT])
        .words(words.map(w => ({ ...w })))
        .padding(wordSpacing)
        .rotate(d => d.rotate)
        .font(fontFamily)
        .fontSize(d => d.size)
        .on('end', (computedWords: WordItem[]) => {
          const colored = computedWords.map((w, i) => ({
            ...w,
            color: getThemeColor(colorTheme, i, computedWords.length),
            width: w.width || 0,
            height: w.height || 0,
          }))
          colored.forEach((w, i) => {
            onUpdateColor(i, w.color)
            if (w.width && w.height) {
              onUpdateSize(i, w.width, w.height)
            }
          })
          setLocalWords(colored)
          layoutCalculatedRef.current = true
        })
      layout.start()
    } else {
      setLocalWords(words.map((w, i) => ({
        ...w,
        color: w.color || getThemeColor(colorTheme, i, words.length),
      })))
    }
  }, [words, wordSpacing, fontFamily, colorTheme])

  useEffect(() => {
    if (localWords.length > 0) {
      const updated = localWords.map((w, i) => ({
        ...w,
        color: getThemeColor(colorTheme, i, localWords.length),
      }))
      updated.forEach((w, i) => onUpdateColor(i, w.color))
      setLocalWords(updated)
    }
  }, [colorTheme])

  const getBgStyle = useCallback((): React.CSSProperties => {
    switch (bgColor) {
      case 'white':
        return { backgroundColor: '#ffffff' }
      case 'lightGray':
        return { backgroundColor: '#f5f5f5' }
      case 'dark':
        return { backgroundColor: '#2c3e50' }
      case 'starry':
        return {
          background: 'linear-gradient(135deg, #0c0c1e 0%, #1a1a3e 50%, #2c3e50 100%)',
        }
      default:
        return { backgroundColor: '#f5f5f5' }
    }
  }, [bgColor])

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.scale(scale, scale)
    ctx.translate(-canvas.width / 2, -canvas.height / 2)

    localWords.forEach((word, index) => {
      if (!word.x && !word.y) return
      ctx.save()
      const isSelected = selectedWord && selectedWord.text === word.text
      const isHover = hoverIndex === index
      const isDragging = draggingIndex === index

      let drawColor = word.color || '#333333'
      if (isSelected) {
        drawColor = darkenColor(drawColor, 0.2)
      }

      ctx.translate(word.x + CANVAS_WIDTH / 2, word.y + CANVAS_HEIGHT / 2)
      if (word.rotate) {
        ctx.rotate((word.rotate * Math.PI) / 180)
      }

      let drawScale = 1
      if (isDragging || isHover) {
        drawScale = 1.1
      }
      ctx.scale(drawScale, drawScale)

      ctx.font = `${word.size}px "${fontFamily}"`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      if (isDragging || isHover) {
        ctx.shadowColor = 'rgba(0,0,0,0.3)'
        ctx.shadowBlur = 8
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 2
      }

      ctx.fillStyle = drawColor
      ctx.fillText(word.text, 0, 0)

      if (isSelected) {
        const metrics = ctx.measureText(word.text)
        const w = metrics.width + 10
        const h = word.size + 6
        ctx.strokeStyle = drawColor
        ctx.lineWidth = 2
        ctx.setLineDash([4, 2])
        ctx.strokeRect(-w / 2, -h / 2, w, h)
        ctx.setLineDash([])
      }

      ctx.restore()
    })

    ctx.restore()
  }, [localWords, scale, selectedWord, hoverIndex, draggingIndex, fontFamily])

  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

  const getWordAtPosition = useCallback((clientX: number, clientY: number): number => {
    const canvas = canvasRef.current
    if (!canvas || localWords.length === 0) return -1

    const rect = canvas.getBoundingClientRect()
    const x = (clientX - rect.left) * (canvas.width / rect.width)
    const y = (clientY - rect.top) * (canvas.height / rect.height)

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const relX = (x - centerX) / scale
    const relY = (y - centerY) / scale

    for (let i = localWords.length - 1; i >= 0; i--) {
      const word = localWords[i]
      if (!word.x && !word.y) continue

      const wx = word.x
      const wy = word.y
      const angle = (word.rotate || 0) * Math.PI / 180
      const cos = Math.cos(-angle)
      const sin = Math.sin(-angle)
      const dx = relX - wx
      const dy = relY - wy
      const localX = dx * cos - dy * sin
      const localY = dx * sin + dy * cos

      const halfW = Math.max(word.width, word.text.length * word.size * 0.6) / 2 + 5
      const halfH = (word.size + 6) / 2

      if (localX >= -halfW && localX <= halfW && localY >= -halfH && localY <= halfH) {
        return i
      }
    }
    return -1
  }, [localWords, scale])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const index = getWordAtPosition(e.clientX, e.clientY)
    if (index >= 0 && !localWords[index].locked) {
      setDraggingIndex(index)
      onSelectWord(localWords[index])

      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        const x = (e.clientX - rect.left) * (canvas.width / rect.width)
        const y = (e.clientY - rect.top) * (canvas.height / rect.height)
        const centerX = canvas.width / 2
        const centerY = canvas.height / 2
        const relX = (x - centerX) / scale
        const relY = (y - centerY) / scale
        dragOffsetRef.current = {
          x: relX - localWords[index].x,
          y: relY - localWords[index].y,
        }
      }
    } else if (index >= 0 && localWords[index].locked) {
      onSelectWord(localWords[index])
    }
  }, [getWordAtPosition, localWords, scale, onSelectWord])

  const handleMouseMove = useCallback(throttle((e: React.MouseEvent<HTMLCanvasElement>) => {
    const index = getWordAtPosition(e.clientX, e.clientY)
    setHoverIndex(index >= 0 ? index : null)

    if (draggingIndex !== null) {
      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        const x = (e.clientX - rect.left) * (canvas.width / rect.width)
        const y = (e.clientY - rect.top) * (canvas.height / rect.height)
        const centerX = canvas.width / 2
        const centerY = canvas.height / 2
        const relX = (x - centerX) / scale - dragOffsetRef.current.x
        const relY = (y - centerY) / scale - dragOffsetRef.current.y

        setLocalWords(prev => {
          const updated = [...prev]
          updated[draggingIndex] = { ...updated[draggingIndex], x: relX, y: relY }
          return updated
        })
      }
    }
  }, 16), [draggingIndex, getWordAtPosition, scale])

  const handleMouseUp = useCallback(() => {
    if (draggingIndex !== null) {
      const word = localWords[draggingIndex]
      onUpdatePosition(draggingIndex, word.x, word.y)
      setDraggingIndex(null)
    }
  }, [draggingIndex, localWords, onUpdatePosition])

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(null)
    if (draggingIndex !== null) {
      const word = localWords[draggingIndex]
      onUpdatePosition(draggingIndex, word.x, word.y)
      setDraggingIndex(null)
    }
  }, [draggingIndex, localWords, onUpdatePosition])

  const handleWheel = useCallback(throttle((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const newScale = Math.max(0.5, Math.min(3, scale + delta))
    setScale(newScale)
  }, 16), [scale, setScale])

  const exportPNG = useCallback(() => {
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = CANVAS_WIDTH * 2
    exportCanvas.height = CANVAS_HEIGHT * 2
    const ctx = exportCanvas.getContext('2d')
    if (!ctx) return

    ctx.scale(2, 2)
    ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)

    localWords.forEach(word => {
      if (!word.x && !word.y) return
      ctx.save()
      ctx.translate(word.x, word.y)
      if (word.rotate) {
        ctx.rotate((word.rotate * Math.PI) / 180)
      }
      ctx.font = `${word.size}px "${fontFamily}"`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = word.color || '#333333'
      ctx.fillText(word.text, 0, 0)
      ctx.restore()
    })

    const link = document.createElement('a')
    link.download = `wordcloud-${Date.now()}.png`
    link.href = exportCanvas.toDataURL('image/png')
    link.click()
  }, [localWords, fontFamily])

  useEffect(() => {
    ;(window as any).__exportWordCloudPNG = exportPNG
  }, [exportPNG])

  return (
    <div style={styles.wrapper}>
      <div style={{ ...styles.exportBar }}>
        <button onClick={exportPNG} style={styles.exportButton}>
          导出为 PNG
        </button>
      </div>
      <div
        ref={containerRef}
        style={{
          ...styles.container,
          ...getBgStyle(),
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{
            ...styles.canvas,
            cursor: draggingIndex !== null ? 'grabbing' : hoverIndex !== null ? 'grab' : 'default',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
        />
        {words.length === 0 && (
          <div style={styles.placeholder}>
            <p style={styles.placeholderText}>请在右侧输入文本，然后点击"生成词云"</p>
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    width: '100%',
    maxWidth: 640,
  },
  exportBar: {
    marginBottom: '12px',
    width: '100%',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  exportButton: {
    padding: '10px 20px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  container: {
    position: 'relative',
    borderRadius: '15px',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  canvas: {
    display: 'block',
    width: '100%',
    height: '100%',
    transition: 'transform 0.2s ease',
  },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  placeholderText: {
    color: '#999',
    fontSize: '16px',
  },
}

export default WordCloud
