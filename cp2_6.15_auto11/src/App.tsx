import React, { useState, useRef, useEffect, useCallback } from 'react'
import { ParticleScene, ParticleParams, ColorTheme, BackgroundPreset } from './particleScene'
import { UIControls, ControlPanel, ExportModal, Visualization } from './uiControls'
import { audioProcessor, PlaybackState } from './audioProcessor'
import { getPresetMusic, generatePresetAudioBuffer, audioBufferToArrayBuffer } from './presetMusic'
import { exportManager, ExportFormat, ExportDuration } from './exportUtils'

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const [particleParams, setParticleParams] = useState<ParticleParams>({
    particleSize: 0.05,
    particleSpeed: 1.5,
    colorTheme: 'gradient',
    solidColor: '#4facfe',
    background: '#000011'
  })

  const [loopEnabled, setLoopEnabled] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingProgress, setRecordingProgress] = useState(0)
  const [recordingTargetDuration, setRecordingTargetDuration] = useState(0)
  const [fps, setFps] = useState(60)
  const [, setFrameCount] = useState(0)

  useEffect(() => {
    audioProcessor.setOnStateChange((state) => {
      setPlaybackState(state)
      if (state === 'ready' || state === 'stopped') {
        setDuration(audioProcessor.getDuration())
      }
    })

    audioProcessor.setOnProgress((progress) => {
      setUploadProgress(progress)
    })

    audioProcessor.setOnCurrentTime((time) => {
      setCurrentTime(time)
    })

    audioProcessor.setOnEnded(() => {
      setCurrentTime(0)
    })

    return () => {
      audioProcessor.destroy()
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      if (playbackState === 'playing' || playbackState === 'paused') {
        setCurrentTime(audioProcessor.getCurrentTime())
      }
    }, 100)
    return () => clearInterval(interval)
  }, [playbackState])

  useEffect(() => {
    let lastTime = performance.now()
    let frames = 0

    const measureFps = () => {
      frames++
      const now = performance.now()
      if (now - lastTime >= 1000) {
        setFps(frames)
        frames = 0
        lastTime = now
      }
      setFrameCount(f => f + 1)
      requestAnimationFrame(measureFps)
    }

    const rafId = requestAnimationFrame(measureFps)
    return () => cancelAnimationFrame(rafId)
  }, [])

  useEffect(() => {
    if (!isRecording || !canvasRef.current || !previewCanvasRef.current) return

    const previewCtx = previewCanvasRef.current.getContext('2d')
    if (!previewCtx) return

    const renderPreview = () => {
      if (!isRecording || !canvasRef.current || !previewCanvasRef.current) return

      previewCtx.drawImage(
        canvasRef.current,
        0, 0,
        previewCanvasRef.current.width,
        previewCanvasRef.current.height
      )

      requestAnimationFrame(renderPreview)
    }

    const rafId = requestAnimationFrame(renderPreview)
    return () => cancelAnimationFrame(rafId)
  }, [isRecording])

  const handleFileUpload = useCallback(async (file: File) => {
    setIsLoading(true)
    setUploadProgress(0)
    try {
      await audioProcessor.loadFromFile(file)
      setDuration(audioProcessor.getDuration())
      setCurrentTime(0)
    } catch (e) {
      console.error('Failed to load audio:', e)
      alert('音频加载失败，请检查文件格式')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handlePresetLoad = useCallback(async (index: number) => {
    setIsLoading(true)
    setUploadProgress(0)
    try {
      setUploadProgress(0.2)
      const preset = getPresetMusic(index)
      setUploadProgress(0.4)
      const audioBuffer = await generatePresetAudioBuffer(preset)
      setUploadProgress(0.7)
      const arrayBuffer = audioBufferToArrayBuffer(audioBuffer)
      setUploadProgress(0.85)
      await audioProcessor.loadFromArrayBuffer(arrayBuffer, preset.name)
      setUploadProgress(1)
      setDuration(audioProcessor.getDuration())
      setCurrentTime(0)
      setTimeout(async () => {
        await audioProcessor.play()
      }, 100)
    } catch (e) {
      console.error('Failed to load preset:', e)
      alert('预设音乐加载失败')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handlePlay = useCallback(async () => {
    await audioProcessor.play()
  }, [])

  const handlePause = useCallback(() => {
    audioProcessor.pause()
  }, [])

  const handleStop = useCallback(() => {
    audioProcessor.stop()
    setCurrentTime(0)
  }, [])

  const handleSeek = useCallback((time: number) => {
    audioProcessor.seek(time)
    setCurrentTime(time)
  }, [])

  const handleParticleSizeChange = useCallback((v: number) => {
    setParticleParams(p => ({ ...p, particleSize: v }))
  }, [])

  const handleParticleSpeedChange = useCallback((v: number) => {
    setParticleParams(p => ({ ...p, particleSpeed: v }))
  }, [])

  const handleColorThemeChange = useCallback((t: ColorTheme) => {
    setParticleParams(p => ({ ...p, colorTheme: t }))
  }, [])

  const handleSolidColorChange = useCallback((c: string) => {
    setParticleParams(p => ({ ...p, solidColor: c }))
  }, [])

  const handleBackgroundChange = useCallback((b: BackgroundPreset) => {
    setParticleParams(p => ({ ...p, background: b }))
  }, [])

  const handleLoopToggle = useCallback((enabled: boolean) => {
    setLoopEnabled(enabled)
    audioProcessor.setLoopEnabled(enabled)
  }, [])

  const handleExportClick = useCallback(() => {
    setShowExportModal(true)
  }, [])

  const handleStartExport = useCallback(async (format: ExportFormat, durationParam: ExportDuration) => {
    setShowExportModal(false)

    const totalDuration = audioProcessor.getDuration()
    let target: number
    if (durationParam === 'full') {
      target = totalDuration
    } else {
      target = Math.min(durationParam, totalDuration)
    }

    setRecordingTargetDuration(target)
    setRecordingProgress(0)

    setTimeout(async () => {
      const canvas = canvasRef.current
      if (!canvas) {
        alert('无法获取渲染画布')
        setIsRecording(false)
        return
      }

      setIsRecording(true)

      try {
        await exportManager.startExport(canvas, {
          format,
          duration: durationParam,
          onProgress: (p) => {
            setRecordingProgress(p)
            const currentT = p * target
            setCurrentTime(currentT)
          },
          onComplete: () => {
            setIsRecording(false)
            setRecordingProgress(0)
          },
          onStart: () => {
            setIsRecording(true)
          },
          onFrame: (sourceCanvas, _time) => {
            if (previewCanvasRef.current && sourceCanvas) {
              const ctx = previewCanvasRef.current.getContext('2d')
              if (ctx) {
                ctx.drawImage(
                  sourceCanvas,
                  0, 0,
                  previewCanvasRef.current.width,
                  previewCanvasRef.current.height
                )
              }
            }
          }
        })
      } catch (e) {
        console.error('Export failed:', e)
        alert('导出失败')
        setIsRecording(false)
        setRecordingProgress(0)
      }
    }, 300)
  }, [])

  const hasAudio = duration > 0

  const formatTime = (s: number): string => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const formatRemaining = (target: number, progress: number): string => {
    const remaining = Math.ceil(target * (1 - progress))
    const m = Math.floor(remaining / 60)
    const s = remaining % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="app-container">
      <UIControls
        onFileUpload={handleFileUpload}
        uploadProgress={uploadProgress}
        isLoading={isLoading}
        playbackState={playbackState}
        currentTime={currentTime}
        duration={duration}
        particleSize={particleParams.particleSize}
        particleSpeed={particleParams.particleSpeed}
        colorTheme={particleParams.colorTheme}
        solidColor={particleParams.solidColor}
        background={particleParams.background}
        loopEnabled={loopEnabled}
        isRecording={isRecording}
        recordingProgress={recordingProgress}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onSeek={handleSeek}
        onParticleSizeChange={handleParticleSizeChange}
        onParticleSpeedChange={handleParticleSpeedChange}
        onColorThemeChange={handleColorThemeChange}
        onSolidColorChange={handleSolidColorChange}
        onBackgroundChange={handleBackgroundChange}
        onLoopToggle={handleLoopToggle}
        onPresetLoad={handlePresetLoad}
        onExportClick={handleExportClick}
      />

      <div className="main-content">
        <div className={`scene-container ${isRecording ? 'recording-mode' : ''}`}>
          {!isRecording && (
            <div className="main-canvas-wrapper" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
              <ParticleScene
                params={particleParams}
                canvasRef={canvasRef}
                isExporting={false}
                exportingScale={1}
              />
            </div>
          )}

          {isRecording && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.2, filter: 'blur(4px)' }}>
              <ParticleScene
                params={particleParams}
                isExporting={true}
                exportingScale={0.5}
              />
            </div>
          )}

          <Visualization
            currentTime={currentTime}
            duration={duration}
            hasAudio={hasAudio}
          />

          <div style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: 'rgba(0,0,0,0.6)',
            padding: '6px 12px',
            borderRadius: 4,
            fontSize: 11,
            color: '#00f2fe',
            fontFamily: 'monospace',
            zIndex: 100,
          }}>
            FPS: {fps} | Particles: 100K
          </div>
        </div>

        <ControlPanel
          onFileUpload={handleFileUpload}
          uploadProgress={uploadProgress}
          isLoading={isLoading}
          particleSize={particleParams.particleSize}
          particleSpeed={particleParams.particleSpeed}
          colorTheme={particleParams.colorTheme}
          solidColor={particleParams.solidColor}
          background={particleParams.background}
          loopEnabled={loopEnabled}
          onParticleSizeChange={handleParticleSizeChange}
          onParticleSpeedChange={handleParticleSpeedChange}
          onColorThemeChange={handleColorThemeChange}
          onSolidColorChange={handleSolidColorChange}
          onBackgroundChange={handleBackgroundChange}
          onLoopToggle={handleLoopToggle}
          onPresetLoad={handlePresetLoad}
        />
      </div>

      {isRecording && (
        <div className="recording-preview-container">
          <canvas
            ref={previewCanvasRef}
            width={960}
            height={540}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
            }}
          />
        </div>
      )}

      {isRecording && (
        <div className="recording-info">
          <div style={{ marginBottom: 4 }}>
            <span className="recording-dot" />
            录制中 {Math.round(recordingProgress * 100)}%
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,71,87,0.7)' }}>
            {formatTime(currentTime)} / {formatTime(recordingTargetDuration)}
            {' · '}
            剩余 {formatRemaining(recordingTargetDuration, recordingProgress)}
          </div>
        </div>
      )}

      <ExportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        totalDuration={duration}
        onStart={handleStartExport}
      />
    </div>
  )
}

export default App
