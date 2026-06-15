import { useEffect, useRef } from 'react'
import type { MixResult, SelectedAroma } from '@/types'
import { playLiquidSound } from '@/utils/audio'
import './PerfumeCard.css'

interface PerfumeCardProps {
  mixResult: MixResult | null
  showModal: boolean
  onClose: () => void
  selectedAromas: SelectedAroma[]
}

function LiquidCanvas({ rgb }: { rgb: [number, number, number] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    let phase = 0
    let frameCount = 0
    let startTime = performance.now()
    let lastFrameTime = startTime

    const draw = (currentTime: number) => {
      const deltaTime = currentTime - lastFrameTime
      lastFrameTime = currentTime

      if (deltaTime < 16) {
        animRef.current = requestAnimationFrame(draw)
        return
      }

      ctx.clearRect(0, 0, w, h)

      const tubeWidth = 40
      const tubeX = w / 2 - tubeWidth / 2
      const tubeTop = 10
      const tubeBottom = h - 10
      const tubeHeight = tubeBottom - tubeTop
      const liquidHeight = tubeHeight * 0.7
      const liquidTop = tubeBottom - liquidHeight

      ctx.beginPath()
      ctx.roundRect(tubeX - 2, tubeTop, tubeWidth + 4, tubeHeight, 6)
      ctx.strokeStyle = 'rgba(200,180,150,0.5)'
      ctx.lineWidth = 2
      ctx.stroke()

      const grad = ctx.createLinearGradient(0, tubeBottom, 0, liquidTop)
      grad.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.95)`)
      grad.addColorStop(0.7, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.7)`)
      grad.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`)
      ctx.fillStyle = grad

      ctx.beginPath()
      const waveAmplitude = 3
      const waveFreq = 0.08
      ctx.moveTo(tubeX, tubeBottom)
      ctx.lineTo(tubeX + tubeWidth, tubeBottom)
      ctx.lineTo(tubeX + tubeWidth, liquidTop)
      for (let x = tubeX + tubeWidth; x >= tubeX; x -= 1) {
        const wave = Math.sin(x * waveFreq + phase) * waveAmplitude
        ctx.lineTo(x, liquidTop + wave)
      }
      ctx.closePath()
      ctx.fill()

      const bubbleCount = 5
      for (let i = 0; i < bubbleCount; i++) {
        const bx = tubeX + 8 + Math.sin(phase * 0.5 + i * 1.5) * (tubeWidth - 16)
        const baseY = tubeBottom - 10
        const by = baseY - ((phase * 20 + i * 40) % liquidHeight)
        if (by > liquidTop) {
          const radius = Math.max(1, 1.5 + Math.sin(i) * 0.8)
          ctx.beginPath()
          ctx.arc(bx, by, radius, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(255,255,255,0.4)'
          ctx.fill()
        }
      }

      const highlightGrad = ctx.createLinearGradient(tubeX, 0, tubeX + tubeWidth, 0)
      highlightGrad.addColorStop(0, 'rgba(255,255,255,0.15)')
      highlightGrad.addColorStop(0.3, 'rgba(255,255,255,0.05)')
      highlightGrad.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = highlightGrad
      ctx.fillRect(tubeX, liquidTop, tubeWidth, liquidHeight)

      phase += 0.06
      frameCount++

      if (frameCount % 60 === 0) {
        const elapsed = (currentTime - startTime) / 1000
        const fps = frameCount / elapsed
        if (fps < 50) {
          phase += 0.01
        }
      }

      animRef.current = requestAnimationFrame(draw)
    }

    draw(performance.now())
    return () => cancelAnimationFrame(animRef.current)
  }, [rgb])

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={200}
      className="perfume-liquid-canvas"
    />
  )
}

function PerfumeLabelCard({
  color,
  name,
  rgb,
}: {
  color: string
  name: string
  rgb: [number, number, number]
}) {
  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div
      className="perfume-label-card"
      style={{
        width: 200,
        height: 300,
        borderRadius: 8,
        background: `linear-gradient(180deg, ${color} 0%, #ffffff 100%)`,
      }}
    >
      <div className="perfume-label-top">
        <h3 className="perfume-label-name">{name}</h3>
        <p className="perfume-label-date">{today}</p>
      </div>

      <div className="perfume-label-bottom">
        <svg
          width="32"
          height="40"
          viewBox="0 0 32 40"
          fill="none"
          className="perfume-bottle-icon"
        >
          <path
            d="M12 4h8v6l4 4v20a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V14l4-4V4z"
            fill={color}
            stroke="#e0c8a0"
            strokeWidth="1"
          />
          <rect x="11" y="2" width="10" height="3" rx="1" fill="#e0c8a0" />
          <rect x="14" y="0" width="4" height="3" rx="1" fill="#d4a373" />
        </svg>
      </div>
    </div>
  )
}

export default function PerfumeCard({
  mixResult,
  showModal,
  onClose,
  selectedAromas,
}: PerfumeCardProps) {
  useEffect(() => {
    if (showModal && mixResult) {
      playLiquidSound()
    }
  }, [showModal, mixResult])

  if (!showModal || !mixResult) return null

  const handleSave = async () => {
    try {
      await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: mixResult.name,
          aromas: selectedAromas.map((s) => ({
            aromaId: s.aroma.id,
            ratio: s.ratio,
          })),
        }),
      })
      alert('配方保存成功！')
    } catch {
      alert('保存失败，请重试')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="关闭">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h3 className="modal-title">调香完成</h3>

        <div className="modal-body">
          <LiquidCanvas rgb={mixResult.rgb} />
          <div className="modal-info">
            <div className="perfume-generated-name">「{mixResult.name}」</div>
            <PerfumeLabelCard
              color={mixResult.color}
              name={mixResult.name}
              rgb={mixResult.rgb}
            />
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={handleSave} className="modal-btn-primary">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            保存配方
          </button>
          <button onClick={onClose} className="modal-btn-secondary">
            继续调香
          </button>
        </div>
      </div>
    </div>
  )
}
