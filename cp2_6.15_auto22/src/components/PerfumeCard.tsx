import { useEffect, useRef } from 'react'
import { usePerfumeStore } from '@/stores/perfumeStore'
import { Droplets, Save, X } from 'lucide-react'

function playLiquidSound() {
  try {
    const ctx = new AudioContext()
    const duration = 1.5

    const bufferSize = ctx.sampleRate * duration
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate
      const envelope = Math.exp(-t * 2.5)
      const noise = (Math.random() * 2 - 1) * 0.15
      const bubble = Math.sin(2 * Math.PI * (200 + Math.sin(t * 8) * 100) * t) * 0.1
      const pour = Math.sin(2 * Math.PI * 120 * t) * 0.08 * (1 - t / duration)
      data[i] = (noise + bubble + pour) * envelope
    }

    const source = ctx.createBufferSource()
    source.buffer = buffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 800

    const gain = ctx.createGain()
    gain.gain.value = 0.4

    source.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    source.start()
    source.onended = () => ctx.close()
  } catch {
    // Web Audio not available
  }
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

    const draw = () => {
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

      const grad = ctx.createLinearGradient(0, liquidTop, 0, tubeBottom)
      grad.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.3)`)
      grad.addColorStop(0.3, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.7)`)
      grad.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.95)`)
      ctx.fillStyle = grad

      ctx.beginPath()
      const waveAmplitude = 3
      const waveFreq = 0.08
      ctx.moveTo(tubeX, tubeBottom)
      ctx.lineTo(tubeX + tubeWidth, tubeBottom)
      ctx.lineTo(tubeX + tubeWidth, liquidTop)
      for (let x = tubeX + tubeWidth; x >= tubeX; x -= 1) {
        const wave = Math.sin((x * waveFreq) + phase) * waveAmplitude
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
          ctx.fillStyle = `rgba(255,255,255,0.4)`
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
      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [rgb])

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={200}
      className="mx-auto"
    />
  )
}

function PerfumeLabelCard({ color, name, rgb }: { color: string; name: string; rgb: [number, number, number] }) {
  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div
      className="flex flex-col items-center justify-between p-4"
      style={{
        width: 200,
        height: 300,
        borderRadius: 8,
        background: `linear-gradient(180deg, ${color}33 0%, #fff 60%)`,
        border: '1px solid #e0c8a0',
        boxShadow: '0 4px 16px rgba(224,200,160,0.2)',
      }}
    >
      <div className="text-center">
        <div
          className="w-10 h-10 rounded-full mx-auto mb-2"
          style={{
            background: `linear-gradient(135deg, ${color}, rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.5))`,
            boxShadow: `0 2px 8px ${color}44`,
          }}
        />
        <h3 className="font-serif text-amber-900 text-base font-medium leading-tight">
          {name}
        </h3>
      </div>

      <div className="flex items-center gap-1 text-amber-600/60 text-xs">
        <Droplets size={12} />
        <span>虚拟调香师</span>
      </div>

      <div className="text-center">
        <div className="text-xs text-amber-500 mb-2">{today}</div>
        <svg
          width="32"
          height="40"
          viewBox="0 0 32 40"
          fill="none"
          className="mx-auto opacity-60"
        >
          <path
            d="M12 4h8v6l4 4v20a2 2 0 01-2 2H10a2 2 0 01-2-2V14l4-4V4z"
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

export default function PerfumeCard() {
  const { mixResult, showModal, closeModal, selectedAromas } = usePerfumeStore()

  useEffect(() => {
    if (showModal) {
      playLiquidSound()
    }
  }, [showModal])

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={closeModal}
    >
      <div
        className="flex flex-col items-center p-8 relative"
        style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e0c8a0',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          maxWidth: 480,
          width: '90%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 text-amber-400 hover:text-amber-600 transition-colors"
        >
          <X size={20} />
        </button>

        <h3 className="font-serif text-xl text-amber-800 mb-6 tracking-wider">调香完成</h3>

        <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
          <LiquidCanvas rgb={mixResult.rgb} />
          <div className="flex flex-col items-center gap-4">
            <div
              className="text-2xl font-serif font-medium text-amber-900 text-center leading-snug"
              style={{ maxWidth: 160 }}
            >
              「{mixResult.name}」
            </div>
            <PerfumeLabelCard
              color={mixResult.color}
              name={mixResult.name}
              rgb={mixResult.rgb}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className="perfume-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium transition-all duration-200 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #ff9933, #ff6600)',
              boxShadow: '0 4px 12px rgba(255,102,0,0.3)',
            }}
          >
            <Save size={16} />
            保存配方
          </button>
          <button
            onClick={closeModal}
            className="px-5 py-2.5 rounded-xl text-amber-600 transition-all duration-200 hover:bg-amber-50"
            style={{ border: '1px solid #e0c8a0' }}
          >
            继续调香
          </button>
        </div>
      </div>
    </div>
  )
}
