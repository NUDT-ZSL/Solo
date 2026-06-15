import { useState, useEffect, useRef, useCallback } from 'react'
import GardenView, { GardenData, BandKey, playBandSound } from './components/GardenView'
import { useAudioCapture, LiveFrame } from './hooks/useAudioCapture'

type ViewMode = 'recording' | 'playing' | 'browsing'

interface HistoryItem {
  id: string
  createdAt: number
  dateLabel: string
  totalEnergy: { low: number; mid: number; high: number }
}

const CSS = `
.app-root {
  display: flex;
  width: 100vw;
  height: 100vh;
  background: #0D0D1A;
  position: relative;
  overflow: hidden;
}
.canvas-area {
  flex: 1;
  position: relative;
  min-width: 0;
  overflow: hidden;
}
.canvas-area canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
.panel {
  width: 20%;
  min-width: 260px;
  max-width: 380px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 10;
}
.panel-header {
  padding: 20px 20px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.panel-title {
  font-size: 18px;
  font-weight: 600;
  background: linear-gradient(135deg, #00B4D8, #B088D6, #F7C948);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 4px;
}
.panel-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
}
.record-section {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}
.record-btn {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  position: relative;
  transition: transform 0.15s ease, filter 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.5px;
}
.record-btn.idle {
  background: linear-gradient(135deg, #FF6B35, #FF0066);
  box-shadow: 0 4px 24px rgba(255, 107, 53, 0.35), inset 0 0 20px rgba(255, 255, 255, 0.1);
}
.record-btn.recording {
  background: linear-gradient(135deg, #FF0066, #FF6B35);
  box-shadow: 0 0 0 0 rgba(255, 0, 102, 0.5);
  animation: breathe 1.5s ease-in-out infinite;
}
.record-btn:active {
  filter: brightness(1.3);
  transform: scale(0.95);
}
.record-btn.flash {
  animation: flashBtn 0.15s ease;
}
@keyframes breathe {
  0%, 100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(255, 0, 102, 0.6); }
  50% { transform: scale(1.1); box-shadow: 0 0 0 20px rgba(255, 0, 102, 0); }
}
@keyframes flashBtn {
  0% { filter: brightness(1); }
  50% { filter: brightness(2); background: #fff !important; }
  100% { filter: brightness(1); }
}
.progress-track {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00FF88, #FF0066);
  border-radius: 2px;
  transition: width 0.05s linear;
}
.waveform-canvas {
  width: 100%;
  height: 60px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.25);
  display: block;
}
.status-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  text-align: center;
}
.history-section {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.history-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.75);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.history-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}
.history-card:hover {
  transform: translateY(-2px);
  border-color: rgba(0, 180, 216, 0.3);
  box-shadow: 0 6px 24px rgba(0, 180, 216, 0.3);
  background: rgba(255, 255, 255, 0.07);
}
.history-card.active {
  border-color: rgba(0, 180, 216, 0.6);
  background: rgba(0, 180, 216, 0.1);
  box-shadow: 0 4px 16px rgba(0, 180, 216, 0.25);
}
.history-card:active {
  transform: translateY(0);
}
.card-date {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);
  margin-bottom: 8px;
  font-weight: 500;
}
.card-bars {
  display: flex;
  gap: 6px;
  height: 18px;
  align-items: flex-end;
}
.bar {
  flex: 1;
  border-radius: 3px 3px 1px 1px;
  transition: height 0.4s ease;
  min-height: 3px;
}
.bar.low { background: linear-gradient(to top, #FF6B35, #F7C948); }
.bar.mid { background: linear-gradient(to top, #6B5B95, #B088D6); }
.bar.high { background: linear-gradient(to top, #00B4D8, #90E0EF); }
.bar-labels {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}
.bar-label {
  flex: 1;
  text-align: center;
  font-size: 9px;
  color: rgba(255, 255, 255, 0.35);
  letter-spacing: 0.5px;
}
.card-total {
  margin-top: 8px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.35);
  padding: 40px 20px;
  text-align: center;
}
.empty-icon {
  font-size: 48px;
  margin-bottom: 14px;
  opacity: 0.5;
}
.empty-text {
  font-size: 13px;
  line-height: 1.6;
}
.view-mode-badge {
  position: absolute;
  top: 16px;
  left: 16px;
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  z-index: 5;
  backdrop-filter: blur(8px);
  pointer-events: none;
}
.hint-text {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 18px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  z-index: 5;
  pointer-events: none;
}
.mobile-toggle {
  display: none;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 36px;
  background: rgba(255, 255, 255, 0.05);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px 16px 0 0;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 15;
}
.mobile-toggle-bar {
  width: 40px;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}
@media (max-width: 768px) {
  .app-root {
    flex-direction: column;
  }
  .canvas-area {
    flex: 1;
    width: 100%;
    height: auto;
    min-height: 0;
  }
  .panel {
    width: 100% !important;
    max-width: none;
    min-width: 0;
    height: 300px;
    border-left: none;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    transition: height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
  }
  .panel.expanded {
    height: calc(100vh - 200px);
  }
  .mobile-toggle {
    display: flex;
    top: -36px;
    bottom: auto;
  }
  .history-section {
    max-height: none;
  }
}
.upload-status {
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12px;
  animation: fadeIn 0.3s ease;
}
.upload-status.success {
  background: rgba(0, 255, 136, 0.1);
  color: #00FF88;
  border: 1px solid rgba(0, 255, 136, 0.2);
}
.upload-status.error {
  background: rgba(255, 0, 102, 0.1);
  color: #FF6B88;
  border: 1px solid rgba(255, 0, 102, 0.2);
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
.play-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.play-btn:hover {
  background: rgba(0, 180, 216, 0.15);
  border-color: rgba(0, 180, 216, 0.4);
  color: #90E0EF;
}
.play-btn:active {
  background: #fff;
  color: #0D0D1A;
}
.history-section::-webkit-scrollbar {
  width: 6px;
}
.history-section::-webkit-scrollbar-track {
  background: transparent;
}
.history-section::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}
.history-section::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}
`

function drawWaveform(canvas: HTMLCanvasElement, frames: LiveFrame[]) {
  const ctx = canvas.getContext('2d')!
  const dpr = window.devicePixelRatio || 1
  canvas.width = canvas.clientWidth * dpr
  canvas.height = canvas.clientHeight * dpr
  ctx.scale(dpr, dpr)
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  ctx.clearRect(0, 0, w, h)
  if (frames.length < 2) {
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, h / 2)
    ctx.lineTo(w, h / 2)
    ctx.stroke()
    return
  }
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const n = frames.length
  for (let i = 0; i < n - 1; i++) {
    const x1 = (i / (n - 1)) * w
    const x2 = ((i + 1) / (n - 1)) * w
    const frame = frames[i]
    const nextFrame = frames[i + 1]
    const energy = (frame.low + frame.mid + frame.high) / 3
    const t = Math.min(1, energy)
    const r1 = Math.round(0 + (255 - 0) * t)
    const g1 = Math.round(255 + (0 - 255) * t)
    const b1 = Math.round(136 + (102 - 136) * t)
    const color = `rgb(${r1}, ${g1}, ${b1})`
    const amp1 = 0.5 * (frame.low * 0.6 + frame.mid * 1.0 + frame.high * 1.3)
    const amp2 = 0.5 * (nextFrame.low * 0.6 + nextFrame.mid * 1.0 + nextFrame.high * 1.3)
    const y1 = h / 2 - amp1 * h * 0.9
    const y2 = h / 2 - amp2 * h * 0.9
    const y1b = h / 2 + amp1 * h * 0.9
    const y2b = h / 2 + amp2 * h * 0.9
    ctx.strokeStyle = color
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x1, y1b)
    ctx.lineTo(x2, y2b)
    ctx.stroke()
  }
}

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('browsing')
  const [currentData, setCurrentData] = useState<GardenData | null>(null)
  const [historyList, setHistoryList] = useState<HistoryItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [panelExpanded, setPanelExpanded] = useState(false)
  const [btnFlash, setBtnFlash] = useState(false)

  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const audioElRef = useRef<HTMLAudioElement | null>(null)

  const { isRecording, liveFrames, progress, startRecording, stopRecording } = useAudioCapture()

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
    return audioCtxRef.current
  }, [])

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/list')
      const data = await res.json()
      setHistoryList(data.list || [])
    } catch (e) {
      console.error('获取历史记录失败:', e)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  useEffect(() => {
    if (waveCanvasRef.current) {
      drawWaveform(waveCanvasRef.current, liveFrames)
    }
  }, [liveFrames])

  useEffect(() => {
    if (!isRecording) return
    if (progress >= 1) {
      handleStop()
    }
  }, [progress, isRecording])

  useEffect(() => {
    if (isRecording) setViewMode('recording')
  }, [isRecording])

  const handleStop = async () => {
    const result = await stopRecording()
    if (!result) return
    const { bands, energyRates, audioBase64 } = result
    const gardenData: GardenData = { bands, energyRates, audioBase64 }
    setCurrentData(gardenData)
    setViewMode('playing')
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64, bands, energyRates })
      })
      const json = await res.json()
      if (json.success) {
        setActiveId(json.id)
        setUploadStatus({ type: 'success', msg: '录制已保存至画廊' })
        setTimeout(() => setUploadStatus(null), 2500)
        fetchHistory()
      } else {
        setUploadStatus({ type: 'error', msg: json.error || '上传失败' })
        setTimeout(() => setUploadStatus(null), 2500)
      }
    } catch (e) {
      console.error('上传错误:', e)
      setUploadStatus({ type: 'error', msg: '网络错误，未能保存' })
      setTimeout(() => setUploadStatus(null), 2500)
    }
  }

  const handleRecordClick = async () => {
    setBtnFlash(true)
    setTimeout(() => setBtnFlash(false), 150)
    if (isRecording) {
      await handleStop()
    } else {
      await startRecording()
    }
  }

  const handleHistoryClick = async (item: HistoryItem) => {
    try {
      setActiveId(item.id)
      const res = await fetch(`/api/data/${item.id}`)
      const json = await res.json()
      if (json.record) {
        const { bands, energyRates, audioBase64 } = json.record
        setCurrentData({ bands, energyRates, audioBase64 })
        setViewMode('playing')
        playOriginalAudio(audioBase64)
      }
    } catch (e) {
      console.error('加载记录失败:', e)
    }
  }

  const playOriginalAudio = (base64: string) => {
    try {
      if (!audioElRef.current) {
        audioElRef.current = new Audio()
      }
      audioElRef.current.src = base64
      audioElRef.current.play().catch(() => {})
    } catch (_) {}
  }

  const handlePlayOriginal = () => {
    if (currentData?.audioBase64) {
      playOriginalAudio(currentData.audioBase64)
    }
  }

  const handleBandPick = useCallback(
    (band: BandKey, nodeIndex: number, _audioBase64: string | undefined, bands: GardenData['bands']) => {
      const ctx = getAudioCtx()
      playBandSound(band, bands, nodeIndex, ctx)
    },
    [getAudioCtx]
  )

  useEffect(() => {
    if (viewMode === 'recording') setViewMode('recording')
  }, [isRecording, viewMode])

  const maxEnergy = Math.max(
    1,
    ...historyList.map(h => h.totalEnergy.low + h.totalEnergy.mid + h.totalEnergy.high)
  )

  const viewModeText: Record<ViewMode, string> = {
    recording: '🎙️ 录制中',
    playing: '🌸 波形花园',
    browsing: '🖼️ 浏览模式'
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="app-root">
        <div className="canvas-area">
          <div className="view-mode-badge">{viewModeText[viewMode]}</div>
          <GardenView data={currentData} onBandPick={handleBandPick} />
          {currentData && (
            <div className="hint-text">
              💡 拖拽旋转视角 · 滚轮缩放 · 点击波形管试听频段
            </div>
          )}
        </div>

        <div className={`panel ${panelExpanded ? 'expanded' : ''}`}>
          <div className="mobile-toggle" onClick={() => setPanelExpanded(e => !e)}>
            <div className="mobile-toggle-bar"></div>
          </div>

          <div className="panel-header">
            <div className="panel-title">波形花园</div>
            <div className="panel-subtitle">哼唱一段旋律，绽放一片花园</div>
          </div>

          <div className="record-section">
            <button
              className={`record-btn ${isRecording ? 'recording' : 'idle'} ${btnFlash ? 'flash' : ''}`}
              onClick={handleRecordClick}
            >
              {isRecording ? '停止' : '录制'}
            </button>
            <div style={{ width: '100%' }}>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progress * 100}%` }}></div>
              </div>
            </div>
            <canvas ref={waveCanvasRef} className="waveform-canvas"></canvas>
            <div className="status-text">
              {isRecording
                ? `录制中 ${Math.round(progress * 100)}% · 最长10秒`
                : '点击按钮录制5-10秒哼唱'}
            </div>
            {uploadStatus && (
              <div className={`upload-status ${uploadStatus.type}`}>{uploadStatus.msg}</div>
            )}
            {currentData && viewMode === 'playing' && (
              <button className="play-btn" onClick={handlePlayOriginal}>
                ▶ 播放原始录音
              </button>
            )}
          </div>

          <div className="history-section">
            <div className="history-title">历史画廊</div>
            {historyList.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🌱</div>
                <div className="empty-text">
                  还没有录制记录<br />在上方点击录制按钮<br />开始创建你的第一片花园
                </div>
              </div>
            ) : (
              historyList.map(item => {
                const total = item.totalEnergy.low + item.totalEnergy.mid + item.totalEnergy.high
                const ratio = total / maxEnergy
                return (
                  <div
                    key={item.id}
                    className={`history-card ${activeId === item.id ? 'active' : ''}`}
                    onClick={() => handleHistoryClick(item)}
                  >
                    <div className="card-date">{item.dateLabel}</div>
                    <div className="card-bars">
                      <div
                        className="bar low"
                        style={{ height: `${Math.max(3, (item.totalEnergy.low / maxEnergy) * 100 * 3)}px` }}
                      />
                      <div
                        className="bar mid"
                        style={{ height: `${Math.max(3, (item.totalEnergy.mid / maxEnergy) * 100 * 3)}px` }}
                      />
                      <div
                        className="bar high"
                        style={{ height: `${Math.max(3, (item.totalEnergy.high / maxEnergy) * 100 * 3)}px` }}
                      />
                    </div>
                    <div className="bar-labels">
                      <div className="bar-label">LOW</div>
                      <div className="bar-label">MID</div>
                      <div className="bar-label">HIGH</div>
                    </div>
                    <div className="card-total">总能量：{total.toFixed(1)}（{(ratio * 100).toFixed(0)}%）</div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </>
  )
}

import { createRoot } from 'react-dom/client'
const root = document.getElementById('root')
if (root) {
  createRoot(root).render(<App />)
}

export default App
