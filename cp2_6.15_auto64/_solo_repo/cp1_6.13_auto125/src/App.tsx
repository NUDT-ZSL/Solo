import { useEffect, useRef, useState, useCallback } from 'react'
import { AudioProcessor } from './audio/AudioProcessor'
import { SceneManager } from './scene/SceneManager'

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const waveCanvasRef = useRef<HTMLCanvasElement>(null)
  const audioProcessorRef = useRef<AudioProcessor | null>(null)
  const sceneManagerRef = useRef<SceneManager | null>(null)

  const [micActive, setMicActive] = useState(false)
  const [volume, setVolume] = useState(0)
  const [waveData, setWaveData] = useState<Float32Array>(new Float32Array(256))
  const [stonesCollected, setStonesCollected] = useState(0)
  const [timeLeft, setTimeLeft] = useState(120)
  const [micRipple, setMicRipple] = useState(0)
  const [gameWon, setGameWon] = useState(false)
  const [gameOver, setGameOver] = useState(false)

  const triggerPulse = useCallback(() => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.triggerPulse()
    }
    if (audioProcessorRef.current) {
      audioProcessorRef.current.playPulseSound()
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const processor = new AudioProcessor()
    audioProcessorRef.current = processor

    processor.onVolume = (vol: number, data: Float32Array) => {
      setVolume(vol)
      setWaveData(data)
      if (vol > processor.threshold) {
        setMicRipple(Date.now())
      }
    }

    processor.onPulse = () => {
      triggerPulse()
    }

    processor.onStoneTone = (freq: number, duration: number) => {
      // 由SceneManager触发共鸣石声音
    }

    const scene = new SceneManager(canvas)
    sceneManagerRef.current = scene

    scene.onStonesChange = (count: number) => {
      setStonesCollected(count)
      processor.playStoneTone(880, 0.3)
    }

    const onStoneToneEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ frequency: number; duration: number }>
      processor.playStoneTone(customEvent.detail.frequency, customEvent.detail.duration)
    }
    window.addEventListener('stoneTone', onStoneToneEvent)

    scene.onExit = () => {
      setGameWon(true)
    }

    scene.init()

    const fetchMaze = async () => {
      try {
        const res = await fetch('/api/maze')
        if (res.ok) {
          const data = await res.json()
          if (data && data.walls) {
            scene.loadMaze(data)
          }
        }
      } catch (e) {
        console.log('使用默认随机迷宫')
      }
    }
    fetchMaze()

    return () => {
      window.removeEventListener('stoneTone', onStoneToneEvent)
      scene.dispose()
      processor.dispose()
    }
  }, [triggerPulse])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        triggerPulse()
      }
      if (sceneManagerRef.current) {
        sceneManagerRef.current.handleKey(e.code, true)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (sceneManagerRef.current) {
        sceneManagerRef.current.handleKey(e.code, false)
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [triggerPulse])

  useEffect(() => {
    if (gameWon || gameOver) return
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setGameOver(true)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [gameWon, gameOver])

  useEffect(() => {
    const waveCanvas = waveCanvasRef.current
    if (!waveCanvas) return
    const ctx = waveCanvas.getContext('2d')
    if (!ctx) return

    const w = waveCanvas.width
    const h = waveCanvas.height
    ctx.clearRect(0, 0, w, h)

    ctx.strokeStyle = '#818cf8'
    ctx.lineWidth = 2
    ctx.beginPath()
    const slice = w / waveData.length
    for (let i = 0; i < waveData.length; i++) {
      const v = (waveData[i] + 1) / 2
      const y = v * h
      if (i === 0) ctx.moveTo(i * slice, y)
      else ctx.lineTo(i * slice, y)
    }
    ctx.stroke()
  }, [waveData])

  const startMic = async () => {
    if (!audioProcessorRef.current) return
    try {
      await audioProcessorRef.current.startMicrophone()
      setMicActive(true)
    } catch (e) {
      alert('无法访问麦克风，请检查权限设置')
    }
  }

  const restart = () => {
    setGameWon(false)
    setGameOver(false)
    setStonesCollected(0)
    setTimeLeft(120)
    if (sceneManagerRef.current) {
      sceneManagerRef.current.resetGame()
    }
  }

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const ss = String(timeLeft % 60).padStart(2, '0')
  const timeBlink = timeLeft <= 30 && timeLeft % 2 === 0

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#0f172a' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '12px 24px',
          background: 'rgba(15, 23, 42, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>音量波形</span>
          <canvas
            ref={waveCanvasRef}
            width={200}
            height={40}
            style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}
          />
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>共鸣石</div>
          <div style={{ color: '#fbbf24', fontSize: 28, fontWeight: 'bold' }}>
            {stonesCollected} / 5
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>剩余时间</div>
          <div
            style={{
              color: timeLeft <= 30 ? '#ef4444' : '#e2e8f0',
              fontSize: 28,
              fontWeight: 'bold',
              opacity: timeBlink ? 0.5 : 1,
              transition: 'opacity 0.5s',
            }}
          >
            {mm}:{ss}
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: micActive ? '#22c55e' : '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 20,
            userSelect: 'none',
            transition: 'background 0.3s',
          }}
          onClick={startMic}
          title={micActive ? '麦克风已开启' : '点击开启麦克风'}
        >
          🎤
          {micActive && (
            <div
              key={micRipple}
              style={{
                position: 'absolute',
                inset: -6,
                borderRadius: '50%',
                border: `3px solid #22c55e`,
                animation: 'micRipple 1s ease-out forwards',
              }}
            />
          )}
        </div>
        <div style={{ color: '#94a3b8', fontSize: 11, textAlign: 'center', marginTop: 8 }}>
          {micActive ? `音量: ${volume.toFixed(2)} / 阈值 0.3` : '点击开启麦克风'}
        </div>
        <div style={{ color: '#64748b', fontSize: 11, textAlign: 'center', marginTop: 4 }}>
          WASD 移动 · 空格/声音 触发脉冲
        </div>
      </div>

      {(gameWon || gameOver) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20,
          }}
        >
          <div
            style={{
              background: 'rgba(15,23,42,0.95)',
              padding: 40,
              borderRadius: 16,
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ fontSize: 36, fontWeight: 'bold', marginBottom: 16, color: gameWon ? '#22c55e' : '#ef4444' }}>
              {gameWon ? '🎉 通关成功！' : '⏰ 时间到！'}
            </div>
            <div style={{ color: '#94a3b8', marginBottom: 24 }}>
              收集共鸣石: {stonesCollected} / 5
            </div>
            <button
              onClick={restart}
              style={{
                background: '#6366f1',
                color: 'white',
                border: 'none',
                padding: '12px 32px',
                borderRadius: 8,
                fontSize: 16,
                cursor: 'pointer',
              }}
            >
              再玩一次
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes micRipple {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
