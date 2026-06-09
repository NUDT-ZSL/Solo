import { useState, useCallback, useRef, useEffect } from 'react'
import Recorder from './Recorder'
import Arena from './Arena'
import type { Amber, ParticleLayer } from './types'

const MAX_VISIBLE_AMBERS = 10

interface BackendAmberResponse {
  id: string
  audio_url: string
  duration: number
  layers: {
    freq_band: 'low' | 'mid' | 'high'
    radius: number
    speed: number
    color: string
    energy_data: number[]
  }[]
}

function generateId(): string {
  return `amber_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function getDominantColor(amber: Amber): string {
  const bands = amber.layers.map(l => {
    const avg = l.energyData.reduce((s, v) => s + v, 0) / (l.energyData.length || 1)
    return { band: l.freqBand, color: l.color, avg }
  })
  bands.sort((a, b) => b.avg - a.avg)
  return bands[0]?.color || '#ffd700'
}

function computeAmberPosition(index: number, total: number) {
  if (total === 0) return { x: 0, y: 0, z: 0 }
  const phi = Math.acos(1 - 2 * (index + 0.5) / Math.max(total, 1))
  const theta = Math.PI * (1 + Math.sqrt(5)) * index
  const radius = 9
  return {
    x: radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.sin(phi) * Math.sin(theta) * 0.6,
    z: radius * Math.cos(phi),
  }
}

export default function App() {
  const [ambers, setAmbers] = useState<Amber[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [focusedAmberId, setFocusedAmberId] = useState<string | null>(null)
  const [newAmberId, setNewAmberId] = useState<string | null>(null)
  const [flyParticles, setFlyParticles] = useState<{ id: string; x: number; y: number }[]>([])
  const navbarRef = useRef<HTMLDivElement>(null)
  const flyParticleId = useRef(0)

  const triggerFlyEffect = useCallback(() => {
    if (!navbarRef.current) return
    const rect = navbarRef.current.getBoundingClientRect()
    const px = rect.right - 60
    const py = rect.top + 36
    const particles = Array.from({ length: 12 }, () => ({
      id: `fly_${flyParticleId.current++}_${Math.random()}`,
      x: px + (Math.random() - 0.5) * 20,
      y: py + (Math.random() - 0.5) * 20,
    }))
    setFlyParticles(particles)
    setTimeout(() => setFlyParticles([]), 900)
  }, [])

  const handleRecordingComplete = useCallback(async (audioBlob: Blob) => {
    if (audioBlob.size > 1024 * 1024) {
      alert('音频文件过大（超过1MB），请重新录制')
      return
    }

    setIsUploading(true)
    setUploadProgress(5)

    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.webm')

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/amber/create', true)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const pct = Math.round((event.loaded / event.total) * 70)
        setUploadProgress(5 + pct)
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const resp: BackendAmberResponse = JSON.parse(xhr.responseText)
          setUploadProgress(95)

          const layers: ParticleLayer[] = resp.layers.map(l => ({
            freqBand: l.freq_band,
            radius: l.radius,
            speed: l.speed,
            color: l.color,
            particleCount: 120,
            energyData: l.energy_data,
          }))

          const newIndex = ambers.length
          const position = computeAmberPosition(newIndex, newIndex + 1)

          const amber: Amber = {
            id: resp.id,
            audio: resp.audio_url,
            audioDuration: resp.duration,
            layers,
            createdAt: Date.now(),
            position,
          }

          setAmbers(prev => {
            const next = [...prev, amber]
            next.forEach((a, i) => {
              a.position = computeAmberPosition(i, next.length)
            })
            return next
          })

          setNewAmberId(amber.id)
          triggerFlyEffect()
          setTimeout(() => setNewAmberId(null), 1000)
          setUploadProgress(100)
        } catch (e) {
          console.error('Parse error:', e)
          alert('琥珀生成失败，请重试')
        }
      } else {
        console.error('Upload error:', xhr.status, xhr.statusText)
        alert('上传失败，请检查后端服务是否启动')
      }
      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(0)
      }, 600)
    }

    xhr.onerror = () => {
      console.error('Network error')
      alert('网络错误，请检查连接')
      setIsUploading(false)
      setUploadProgress(0)
    }

    xhr.send(formData)
  }, [ambers.length, triggerFlyEffect])

  const handleAmberClick = useCallback((amber: Amber) => {
    setFocusedAmberId(prev => prev === amber.id ? null : amber.id)
  }, [])

  const handleFocusAmber = useCallback((id: string | null) => {
    setFocusedAmberId(id)
  }, [])

  const handleThumbnailClick = useCallback((amber: Amber) => {
    setFocusedAmberId(prev => prev === amber.id ? null : amber.id)
  }, [])

  useEffect(() => {
    ambers.forEach((a, i) => {
      a.position = computeAmberPosition(i, ambers.length)
    })
  }, [ambers.length])

  const visibleAmbers = ambers.slice(-MAX_VISIBLE_AMBERS)

  return (
    <div className="app-container">
      <nav className="navbar" ref={navbarRef}>
        <div className="navbar-title">回声琥珀</div>
        <Recorder
          onRecordingComplete={handleRecordingComplete}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />
      </nav>

      <div className="main-content">
        <aside className="sidebar">
          <div className="sidebar-title">
            琥珀画廊 {ambers.length > 0 && <span style={{ opacity: 0.5 }}>({ambers.length})</span>}
          </div>
          {ambers.length === 0 && (
            <div style={{
              padding: '16px 8px',
              fontSize: 12,
              color: 'rgba(255,255,255,0.3)',
              textAlign: 'center',
              lineHeight: 1.6,
            }}>
              暂无琥珀<br />点击右上角麦克风<br />开始录制你的第一段声音
            </div>
          )}
          {[...ambers].reverse().map(amber => {
            const color = getDominantColor(amber)
            const isActive = focusedAmberId === amber.id
            return (
              <div
                key={amber.id}
                className={`amber-thumbnail ${isActive ? 'active' : ''}`}
                onClick={() => handleThumbnailClick(amber)}
              >
                <div
                  className="amber-thumb-sphere"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${color} 0%, rgba(10,10,30,0.9) 70%)`,
                  }}
                />
                <div className="amber-thumb-info">
                  <div className="amber-thumb-name">
                    琥珀 #{String(ambers.indexOf(amber) + 1).padStart(3, '0')}
                  </div>
                  <div className="amber-thumb-time">
                    {formatDate(amber.createdAt)} · {amber.audioDuration.toFixed(1)}s
                  </div>
                </div>
              </div>
            )
          })}
        </aside>

        <div style={{ flex: 1, position: 'relative' }}>
          <Arena
            ambers={ambers}
            maxVisibleAmbers={MAX_VISIBLE_AMBERS}
            onAmberClick={handleAmberClick}
            focusedAmberId={focusedAmberId}
            onFocusAmber={handleFocusAmber}
            newAmberId={newAmberId}
          />
          {flyParticles.map(p => (
            <div
              key={p.id}
              className="fly-particle"
              style={{
                left: p.x,
                top: p.y,
                animation: 'flyToCenter 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes flyToCenter {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(calc(50vw - 100% - 120px), calc(50vh - 100% - 36px)) scale(0.2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
