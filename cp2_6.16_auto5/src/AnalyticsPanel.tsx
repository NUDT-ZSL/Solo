import React, { useRef, useEffect } from 'react'
import { FrequencyBin, INSTRUMENTS, frequencyToColor, hexToRgb } from './utils'
import { PlacedInstrument } from './Simulation'

interface AnalyticsPanelProps {
  spectrum: FrequencyBin[]
  placedInstruments: PlacedInstrument[]
  volume: number
  reverb: number
  onVolumeChange: (v: number) => void
  onReverbChange: (r: number) => void
}

const CANVAS_WIDTH = 248
const CANVAS_HEIGHT = 180
const MIN_FREQ = 20
const MAX_FREQ = 4000

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({
  spectrum,
  placedInstruments,
  volume,
  reverb,
  onVolumeChange,
  onReverbChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const peakHoldRef = useRef<number[]>(new Array(64).fill(0))
  const peakDecayRef = useRef<number[]>(new Array(64).fill(0))
  const smoothedBinsRef = useRef<number[]>(new Array(64).fill(0))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const displayWidth = canvas.width
    const displayHeight = canvas.height

    ctx.fillStyle = '#0a1628'
    ctx.fillRect(0, 0, displayWidth, displayHeight)

    drawGridLines(ctx, displayWidth, displayHeight)

    const binCount = 64
    const logMin = Math.log10(MIN_FREQ)
    const logMax = Math.log10(MAX_FREQ)

    const barAmplitudes = new Array(binCount).fill(0)

    spectrum.forEach(bin => {
      if (bin.frequency < MIN_FREQ || bin.frequency > MAX_FREQ) return
      const logFreq = Math.log10(bin.frequency)
      const normalizedX = (logFreq - logMin) / (logMax - logMin)
      const binIndex = Math.min(binCount - 1, Math.max(0, Math.floor(normalizedX * binCount)))
      barAmplitudes[binIndex] = Math.max(barAmplitudes[binIndex], bin.amplitude)
    })

    for (let i = 0; i < binCount; i++) {
      smoothedBinsRef.current[i] = smoothedBinsRef.current[i] * 0.6 + barAmplitudes[i] * 0.4
    }

    for (let i = 0; i < binCount; i++) {
      const x = (i / binCount) * displayWidth
      const barWidth = (displayWidth / binCount) - 2

      if (smoothedBinsRef.current[i] > peakHoldRef.current[i]) {
        peakHoldRef.current[i] = smoothedBinsRef.current[i]
        peakDecayRef.current[i] = 0
      } else {
        peakDecayRef.current[i] += 1
        if (peakDecayRef.current[i] > 15) {
          peakHoldRef.current[i] = Math.max(0, peakHoldRef.current[i] - 0.02)
        }
      }

      const displayAmp = smoothedBinsRef.current[i]
      const barHeight = displayAmp * (displayHeight - 25)
      const peakY = displayHeight - 15 - peakHoldRef.current[i] * (displayHeight - 25)

      const freq = MIN_FREQ * Math.pow(10, (i / binCount) * (logMax - logMin))
      const color = frequencyToColor(freq)
      const { r, g, b } = hexToRgb(color)

      if (barHeight > 1) {
        const gradient = ctx.createLinearGradient(x, displayHeight - 15, x, displayHeight - 15 - barHeight)
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.95)`)
        gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.6)`)
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.25)`)

        ctx.fillStyle = gradient
        const bw = Math.max(1, barWidth)
        roundRect(ctx, x + 1, displayHeight - 15 - barHeight, bw, barHeight, 1)
        ctx.fill()
      }

      if (peakHoldRef.current[i] > 0.05) {
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`
        ctx.fillRect(x + 1, peakY, Math.max(1, barWidth), 2)
      }
    }

    drawFrequencyLabels(ctx, displayWidth, displayHeight)
    drawAxis(ctx, displayWidth, displayHeight)
  }, [spectrum])

  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    if (h <= 0) return
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h)
    ctx.lineTo(x, y + h)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  const drawGridLines = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)'
    ctx.lineWidth = 1

    for (let i = 1; i <= 4; i++) {
      const y = h - 15 - (i / 5) * (h - 25)
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'
    const vMarkers = [50, 100, 200, 500, 1000, 2000, 4000]
    const logMin = Math.log10(MIN_FREQ)
    const logMax = Math.log10(MAX_FREQ)
    vMarkers.forEach(freq => {
      const logFreq = Math.log10(freq)
      const x = ((logFreq - logMin) / (logMax - logMin)) * w
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h - 15)
      ctx.stroke()
    })
  }

  const drawAxis = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.strokeStyle = 'rgba(72, 219, 251, 0.3)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, h - 15)
    ctx.lineTo(w, h - 15)
    ctx.stroke()

    const gradient = ctx.createLinearGradient(0, h - 15, 0, 0)
    gradient.addColorStop(0, 'rgba(72, 219, 251, 0.1)')
    gradient.addColorStop(1, 'rgba(72, 219, 251, 0.02)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h - 15)
  }

  const drawFrequencyLabels = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const labels = [
      { freq: 50, label: '50' },
      { freq: 200, label: '200' },
      { freq: 1000, label: '1K' },
      { freq: 4000, label: '4K' }
    ]
    const logMin = Math.log10(MIN_FREQ)
    const logMax = Math.log10(MAX_FREQ)

    ctx.fillStyle = 'rgba(224, 224, 255, 0.5)'
    ctx.font = '9px -apple-system, sans-serif'
    ctx.textAlign = 'center'

    labels.forEach(({ freq, label }) => {
      const logFreq = Math.log10(freq)
      const x = ((logFreq - logMin) / (logMax - logMin)) * w
      ctx.fillText(label, x, h - 3)
    })

    ctx.save()
    ctx.translate(8, h / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(224, 224, 255, 0.4)'
    ctx.font = '8px -apple-system, sans-serif'
    ctx.fillText('振幅', 0, 0)
    ctx.restore()
  }

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>声学分析面板</h2>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#48dbfb', boxShadow: '0 0 8px #48dbfb' }} />
      </div>

      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <span style={sectionTitleStyle}>实时频谱图</span>
          <span style={sectionSubtitleStyle}>20Hz - 4000Hz</span>
        </div>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{
            width: '100%',
            height: CANVAS_HEIGHT,
            borderRadius: 8,
            background: '#0a1628',
            border: '1px solid rgba(72, 219, 251, 0.2)'
          }}
        />
        <div style={legendStyle}>
          <span style={{ ...legendItemStyle, color: '#ff6b6b' }}>● 低频</span>
          <span style={{ ...legendItemStyle, color: '#48dbfb' }}>● 中频</span>
          <span style={{ ...legendItemStyle, color: '#feca57' }}>● 高频</span>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <span style={sectionTitleStyle}>乐器状态</span>
          <span style={sectionSubtitleStyle}>{placedInstruments.filter(i => i.isPlaying).length} 演奏中</span>
        </div>
        <div style={instrumentListStyle}>
          {INSTRUMENTS.map((inst, idx) => {
            const placed = placedInstruments.find(p => p.instrumentIndex === idx)
            return (
              <div key={inst.id} style={instrumentItemStyle}>
                <div style={{ ...instrumentDotStyle, backgroundColor: inst.color }} />
                <span style={instrumentNameStyle}>{inst.name}</span>
                <span style={instrumentFreqStyle}>{inst.frequency.toFixed(0)}Hz</span>
                {placed?.isPlaying ? (
                  <div style={playingIndicatorStyle}>
                    <span style={playingBarStyle(0.3)} />
                    <span style={playingBarStyle(0.6)} />
                    <span style={playingBarStyle(0.4)} />
                    <span style={playingBarStyle(0.8)} />
                  </div>
                ) : (
                  <span style={inactiveStyle}>—</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <span style={sectionTitleStyle}>参数控制</span>
        </div>

        <div style={controlGroupStyle}>
          <div style={controlLabelRowStyle}>
            <span style={controlLabelStyle}>🔊 整体音量</span>
            <span style={controlValueStyle}>{volume}%</span>
          </div>
          <div style={sliderContainerStyle}>
            <div style={{
              ...sliderTrackStyle,
              background: `linear-gradient(to right, #e94560 0%, #e94560 ${volume}%, rgba(255,255,255,0.1) ${volume}%, rgba(255,255,255,0.1) 100%)`
            }}>
              <div style={{
                ...sliderThumbStyle,
                left: `calc(${volume}% - 8px)`
              }} />
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={volume}
              onChange={(e) => onVolumeChange(parseInt(e.target.value))}
              style={sliderInputStyle}
            />
          </div>
        </div>

        <div style={controlGroupStyle}>
          <div style={controlLabelRowStyle}>
            <span style={controlLabelStyle}>🌊 混响强度</span>
            <span style={controlValueStyle}>{reverb}%</span>
          </div>
          <div style={sliderContainerStyle}>
            <div style={{
              ...sliderTrackStyle,
              background: `linear-gradient(to right, #48dbfb 0%, #48dbfb ${reverb}%, rgba(255,255,255,0.1) ${reverb}%, rgba(255,255,255,0.1) 100%)`
            }}>
              <div style={{
                ...sliderThumbStyle,
                left: `calc(${reverb}% - 8px)`
              }} />
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={reverb}
              onChange={(e) => onReverbChange(parseInt(e.target.value))}
              style={sliderInputStyle}
            />
          </div>
        </div>
      </div>

      <div style={tipStyle}>
        <p style={tipTextStyle}>💡 提示：点击乐器播放音色，拖拽乐器改变位置以观察干涉变化</p>
      </div>
    </div>
  )
}

const panelStyle: React.CSSProperties = {
  width: 280,
  minWidth: 280,
  height: '100%',
  background: 'rgba(15, 52, 96, 0.82)',
  backdropFilter: 'blur(12px)',
  borderTopLeftRadius: 12,
  borderBottomLeftRadius: 12,
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  borderLeft: '1px solid rgba(72, 219, 251, 0.15)',
  overflowY: 'auto'
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingBottom: 12,
  borderBottom: '1px solid rgba(72, 219, 251, 0.15)'
}

const titleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: '#e0e0ff',
  margin: 0,
  letterSpacing: 0.5
}

const sectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10
}

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between'
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#e0e0ff',
  textTransform: 'uppercase',
  letterSpacing: 1
}

const sectionSubtitleStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'rgba(224, 224, 255, 0.5)'
}

const legendStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-around',
  marginTop: 4
}

const legendItemStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 500
}

const instrumentListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  background: 'rgba(10, 22, 40, 0.5)',
  borderRadius: 8,
  padding: 8
}

const instrumentItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '4px 6px',
  borderRadius: 4
}

const instrumentDotStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: '50%',
  flexShrink: 0
}

const instrumentNameStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#e0e0ff',
  fontWeight: 500,
  flex: 1
}

const instrumentFreqStyle: React.CSSProperties = {
  fontSize: 10,
  color: 'rgba(224, 224, 255, 0.5)',
  fontFamily: 'monospace'
}

const playingIndicatorStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: 2,
  height: 16
}

const playingBarStyle = (delay: number): React.CSSProperties => ({
  width: 3,
  background: '#48dbfb',
  borderRadius: 1,
  animation: `soundBar 0.8s ease-in-out ${delay}s infinite alternate`,
  height: '30%'
})

const inactiveStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'rgba(224, 224, 255, 0.2)'
}

const controlGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: '8px 0'
}

const controlLabelRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
}

const controlLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#e0e0ff',
  fontWeight: 500
}

const controlValueStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#48dbfb',
  fontWeight: 600,
  fontFamily: 'monospace',
  background: 'rgba(72, 219, 251, 0.1)',
  padding: '2px 8px',
  borderRadius: 4
}

const sliderContainerStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: 24,
  display: 'flex',
  alignItems: 'center'
}

const sliderTrackStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  width: '100%',
  height: 6,
  borderRadius: 3,
  pointerEvents: 'none'
}

const sliderThumbStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  width: 16,
  height: 16,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #ffffff 0%, #e0e0ff 100%)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.5)',
  pointerEvents: 'none',
  transition: 'left 0.1s ease-out'
}

const sliderInputStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  opacity: 0,
  cursor: 'pointer',
  margin: 0
}

const tipStyle: React.CSSProperties = {
  marginTop: 'auto',
  padding: 10,
  background: 'rgba(10, 22, 40, 0.6)',
  borderRadius: 8,
  border: '1px solid rgba(72, 219, 251, 0.1)'
}

const tipTextStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'rgba(224, 224, 255, 0.6)',
  lineHeight: 1.5,
  margin: 0
}

export default AnalyticsPanel
