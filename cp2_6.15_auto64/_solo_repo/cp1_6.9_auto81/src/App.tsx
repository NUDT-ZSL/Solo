import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import {
  useAnimationLoop,
  useParticleSystem,
  useCanvasRenderer,
  useTextInput
} from './hooks'

const EXPORT_WIDTH = 1920
const EXPORT_HEIGHT = 1080

export default function App() {
  const canvasWrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const particleCountRef = useRef<HTMLSpanElement | null>(null)

  const dimensions = useResponsiveDimensions()
  const isMobile = dimensions.width < 768

  const { text, onChange: onTextChange, reset: resetText } = useTextInput('')
  const particleSystem = useParticleSystem(dimensions.canvasWidth, dimensions.canvasHeight)
  const canvasRenderer = useCanvasRenderer()

  const setCanvasElRef = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      canvasRef.current = canvas
      if (canvas) {
        canvas.width = dimensions.canvasWidth
        canvas.height = dimensions.canvasHeight
        canvasRenderer.setCanvas(canvas)
        particleSystem.ensureEngine(dimensions.canvasWidth, dimensions.canvasHeight)
      } else {
        canvasRenderer.setCanvas(null)
      }
    },
    [canvasRenderer, particleSystem, dimensions.canvasWidth, dimensions.canvasHeight]
  )

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = dimensions.canvasWidth
      canvasRef.current.height = dimensions.canvasHeight
      canvasRenderer.resize(dimensions.canvasWidth, dimensions.canvasHeight)
      particleSystem.resize(dimensions.canvasWidth, dimensions.canvasHeight)
    }
  }, [dimensions.canvasWidth, dimensions.canvasHeight, canvasRenderer, particleSystem])

  const prevTextRef = useRef('')

  useEffect(() => {
    if (text !== prevTextRef.current) {
      particleSystem.ensureEngine(dimensions.canvasWidth, dimensions.canvasHeight)
      particleSystem.updateText(text)
      prevTextRef.current = text
    }
  }, [text, particleSystem, dimensions.canvasWidth, dimensions.canvasHeight])

  const setParticleCountElRef = useCallback((el: HTMLSpanElement | null) => {
    particleCountRef.current = el
  }, [])

  useAnimationLoop(
    useCallback(
      (deltaMs, totalMs) => {
        const engine = particleSystem.getEngine()
        const renderer = canvasRenderer.getRenderer()
        if (!engine || !renderer) return

        engine.update(deltaMs)
        const particles = engine.getParticles()
        renderer.render(particles, deltaMs, totalMs)

        if (particleCountRef.current) {
          particleCountRef.current.textContent = String(particles.length)
        }
      },
      [particleSystem, canvasRenderer]
    ),
    true
  )

  const handleExport = useCallback(() => {
    const sourceCanvas = canvasRef.current
    if (!sourceCanvas) return

    let offscreen = offscreenCanvasRef.current
    if (!offscreen) {
      offscreen = document.createElement('canvas')
      offscreenCanvasRef.current = offscreen
    }
    offscreen.width = EXPORT_WIDTH
    offscreen.height = EXPORT_HEIGHT
    const ctx = offscreen.getContext('2d')
    if (!ctx) return

    const scaleX = EXPORT_WIDTH / sourceCanvas.width
    const scaleY = EXPORT_HEIGHT / sourceCanvas.height
    ctx.save()
    ctx.scale(scaleX, scaleY)
    ctx.drawImage(sourceCanvas, 0, 0)
    ctx.restore()

    const dataUrl = offscreen.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `stardust-${Date.now()}.png`
    link.href = dataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])

  const handleReset = useCallback(() => {
    prevTextRef.current = ''
    resetText()
    particleSystem.clear()
  }, [resetText, particleSystem])

  const canvasHeightVH = useMemo(() => (isMobile ? '60vh' : '70vh'), [isMobile])
  const controlHeightVH = useMemo(() => (isMobile ? '40vh' : '30vh'), [isMobile])

  return (
    <div style={styles.app}>
      <div ref={canvasWrapperRef} style={{ ...styles.canvasWrapper, height: canvasHeightVH }}>
        <canvas
          ref={setCanvasElRef}
          style={styles.canvas}
          width={dimensions.canvasWidth}
          height={dimensions.canvasHeight}
        />
        <div style={styles.canvasTitle}>
          <span className="title-icon" style={styles.titleIcon}>✦</span>
          <span style={styles.titleText}>星尘写作台</span>
        </div>
      </div>

      <div
        style={{
          ...styles.controlBar,
          height: controlHeightVH,
          ...(isMobile ? styles.controlBarMobile : {})
        }}
      >
        <div style={{ ...styles.controlInner, ...(isMobile ? styles.controlInnerMobile : {}) }}>
          <div style={{ ...styles.inputWrap, ...(isMobile ? styles.inputWrapMobile : {}) }}>
            <div style={styles.inputLabel}>在此输入文字，让字符化为星尘飘散…</div>
            <textarea
              value={text}
              onChange={onTextChange}
              placeholder="开始书写你的星尘故事…"
              className="stardust-textarea"
              style={{
                ...styles.textarea,
                ...(isMobile ? styles.textareaMobile : {})
              }}
            />
          </div>

          <div style={{ ...styles.buttons, ...(isMobile ? styles.buttonsMobile : {}) }}>
            <button
              onClick={handleExport}
              style={styles.button}
              onMouseEnter={hoverIn}
              onMouseLeave={hoverOut}
            >
              <span style={styles.btnIcon}>⬇</span>
              <span>导出 PNG</span>
            </button>
            <button
              onClick={handleReset}
              style={{ ...styles.button, ...styles.buttonReset }}
              onMouseEnter={hoverIn}
              onMouseLeave={hoverOut}
            >
              <span style={styles.btnIcon}>↻</span>
              <span>重置</span>
            </button>
          </div>
        </div>

        <div style={styles.footerTip}>
          活跃粒子：
          <span ref={setParticleCountElRef} style={styles.particleCount}>
            0
          </span>
          <span style={styles.tipDivider}>|</span>
          支持中文 · 英文 · 标点符号
        </div>
      </div>
    </div>
  )
}

function useResponsiveDimensions() {
  const getDims = () => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1920
    const h = typeof window !== 'undefined' ? window.innerHeight : 1080
    const mobile = w < 768
    const canvasVH = mobile ? 0.6 : 0.7
    return {
      width: w,
      height: h,
      canvasWidth: w,
      canvasHeight: Math.round(h * canvasVH)
    }
  }

  const [dims, setDims] = useState(getDims)

  useEffect(() => {
    const handle = () => setDims(getDims())
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  return dims
}

function hoverIn(e: React.MouseEvent<HTMLButtonElement>) {
  const t = e.currentTarget
  t.style.filter = 'brightness(1.2)'
  t.style.boxShadow = '0 0 15px rgba(0,212,255,0.6), 0 0 30px rgba(123,47,247,0.3)'
  t.style.transform = 'translateY(-1px)'
}

function hoverOut(e: React.MouseEvent<HTMLButtonElement>) {
  const t = e.currentTarget
  t.style.filter = ''
  t.style.boxShadow = ''
  t.style.transform = ''
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100vw',
    height: '100vh',
    background: '#0A0A2E',
    color: '#FFFFFF',
    fontFamily:
      '"PingFang SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },

  canvasWrapper: {
    position: 'relative',
    width: '100%',
    background: '#0A0A2E',
    overflow: 'hidden'
  },

  canvas: {
    display: 'block',
    width: '100%',
    height: '100%'
  },

  canvasTitle: {
    position: 'absolute',
    top: 24,
    left: 32,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    pointerEvents: 'none',
    textShadow: '0 0 12px rgba(0,212,255,0.6)'
  },

  titleIcon: {
    fontSize: 22,
    color: '#00D4FF'
  },

  titleText: {
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: 4,
    color: '#FFFFFF',
    opacity: 0.9
  },

  controlBar: {
    width: '100%',
    background: 'linear-gradient(180deg, #0A0A2E 0%, #1A1A4E 100%)',
    borderTop: '1px solid rgba(0,212,255,0.15)',
    padding: '20px 32px 12px 32px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    position: 'relative',
    boxShadow: '0 -2px 30px rgba(0,212,255,0.08)',
    minHeight: 0
  },

  controlBarMobile: {
    padding: '14px 16px 10px 16px',
    gap: 10
  },

  controlInner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 24,
    flex: 1,
    minHeight: 0
  },

  controlInnerMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 14
  },

  inputWrap: {
    flex: '0 0 60%',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minWidth: 0
  },

  inputWrapMobile: {
    flex: 'none',
    width: '100%'
  },

  inputLabel: {
    fontSize: 12,
    color: '#B0B0D0',
    letterSpacing: 1,
    paddingLeft: 4
  },

  textarea: {
    width: '100%',
    minHeight: 100,
    padding: '14px 18px',
    background: 'rgba(10,10,46,0.7)',
    backdropFilter: 'blur(5px)',
    WebkitBackdropFilter: 'blur(5px)',
    border: '1px solid rgba(0,212,255,0.25)',
    borderRadius: 12,
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 1.6,
    fontFamily: 'inherit',
    resize: 'none',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.25s, box-shadow 0.25s'
  },

  textareaMobile: {
    minHeight: 70,
    fontSize: 14,
    padding: '12px 14px'
  },

  buttons: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 14,
    paddingTop: 26
  },

  buttonsMobile: {
    justifyContent: 'center',
    paddingTop: 0,
    flexWrap: 'wrap'
  },

  button: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 26px',
    background: 'linear-gradient(135deg, #00D4FF 0%, #7B2FF7 100%)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: 1,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'transform 0.2s, box-shadow 0.25s, filter 0.2s',
    overflow: 'hidden',
    whiteSpace: 'nowrap'
  },

  buttonReset: {
    background: 'linear-gradient(135deg, #7B2FF7 0%, #00D4FF 100%)'
  },

  btnIcon: {
    fontSize: 16,
    opacity: 0.9
  },

  footerTip: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 12,
    color: '#B0B0D0',
    padding: '4px 4px 0 4px',
    borderTop: '1px solid rgba(255,255,255,0.04)',
    paddingTop: 8
  },

  particleCount: {
    color: '#00D4FF',
    fontWeight: 600,
    minWidth: 32,
    display: 'inline-block',
    textAlign: 'left'
  },

  tipDivider: {
    opacity: 0.3
  }
}
