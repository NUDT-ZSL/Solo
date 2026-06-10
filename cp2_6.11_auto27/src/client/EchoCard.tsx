import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Echo,
  formatTime,
  formatDuration,
  getInitials,
  updateEcho as apiUpdateEcho,
  deleteEcho as apiDeleteEcho,
  createEcho as apiCreateEcho,
  reverseGeocode
} from './utils'

interface BubbleCardProps {
  latitude: number
  longitude: number
  currentUserId: string
  currentUsername: string
  initialContentType?: 'audio' | 'text'
  initialAudioData?: { base64: string; duration: number; waveform: number[] } | null
  onSave: (echo: Echo) => void
  onCancel: () => void
  editingEcho?: Echo | null
}

export const BubbleEchoCard: React.FC<BubbleCardProps> = ({
  latitude,
  longitude,
  currentUserId,
  currentUsername,
  initialContentType = 'text',
  initialAudioData = null,
  onSave,
  onCancel,
  editingEcho = null
}) => {
  const [contentType, setContentType] = useState<'audio' | 'text'>(
    editingEcho ? editingEcho.contentType : initialContentType
  )
  const [textContent, setTextContent] = useState<string>(
    editingEcho && editingEcho.contentType === 'text' ? editingEcho.content : ''
  )
  const [audioData, setAudioData] = useState<{
    base64: string
    duration: number
    waveform: number[]
  } | null>(editingEcho && editingEcho.contentType === 'audio'
    ? { base64: editingEcho.content, duration: editingEcho.duration || 0, waveform: editingEcho.waveformData || [] }
    : initialAudioData
  )

  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [liveWaveform, setLiveWaveform] = useState<number[]>(Array(24).fill(0.2))
  const [isPlaying, setIsPlaying] = useState(false)
  const [saving, setSaving] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const startTimeRef = useRef<number>(0)
  const recordedDurationRef = useRef<number>(0)

  const animateWaveform = useCallback(() => {
    if (!analyserRef.current) return
    const analyser = analyserRef.current
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(dataArray)
    const step = Math.floor(dataArray.length / 24)
    const bars: number[] = []
    for (let i = 0; i < 24; i++) {
      let sum = 0
      for (let j = 0; j < step; j++) sum += dataArray[i * step + j]
      bars.push((sum / step) / 255)
    }
    setLiveWaveform(bars)
    animationRef.current = requestAnimationFrame(animateWaveform)
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const audioCtx = new AudioContext()
      audioContextRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 128
      source.connect(analyser)
      analyserRef.current = analyser

      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.readAsDataURL(blob)
        reader.onloadend = () => {
          const base64 = reader.result as string
          const waveform = Array.from({ length: 32 }, () => 0.3 + Math.random() * 0.7)
          setAudioData({
            base64,
            duration: recordedDurationRef.current,
            waveform
          })
          setContentType('audio')
        }
        stream.getTracks().forEach(t => t.stop())
        if (audioContextRef.current) audioContextRef.current.close()
      }

      startTimeRef.current = Date.now()
      setRecordingTime(0)
      recorder.start()
      setIsRecording(true)
      animateWaveform()

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        recordedDurationRef.current = elapsed
        setRecordingTime(elapsed)
      }, 500)
    } catch (err) {
      console.error('录音失败:', err)
      alert('无法访问麦克风，请检查权限设置')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) clearInterval(timerRef.current)
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    setIsRecording(false)
  }

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (timerRef.current) clearInterval(timerRef.current)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      if (audioContextRef.current) audioContextRef.current.close()
    }
  }, [])

  const handlePlayAudio = () => {
    if (!audioData) return
    if (!audioElRef.current) {
      audioElRef.current = new Audio(audioData.base64)
      audioElRef.current.onended = () => setIsPlaying(false)
    }
    if (isPlaying) {
      audioElRef.current.pause()
      audioElRef.current.currentTime = 0
      setIsPlaying(false)
    } else {
      audioElRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleSave = async () => {
    if (contentType === 'text' && !textContent.trim()) {
      alert('请输入文字内容')
      return
    }
    if (contentType === 'audio' && !audioData) {
      alert('请录制语音')
      return
    }
    setSaving(true)
    try {
      const locationName = reverseGeocode(latitude, longitude)
      const payload = {
        userId: currentUserId,
        username: currentUsername,
        latitude,
        longitude,
        locationName,
        contentType,
        content: contentType === 'text' ? textContent.trim() : audioData!.base64,
        duration: audioData?.duration,
        waveformData: audioData?.waveform
      }
      let saved: Echo
      if (editingEcho) {
        saved = await apiUpdateEcho(editingEcho.id, payload)
      } else {
        saved = await apiCreateEcho(payload as any)
      }
      onSave(saved)
    } catch (err) {
      console.error(err)
      alert('保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bubble-card">
      <div className="switch-group">
        <button
          className={`switch-btn ${contentType === 'text' ? 'active' : ''}`}
          onClick={() => setContentType('text')}
        >
          ✏️ 文字
        </button>
        <button
          className={`switch-btn ${contentType === 'audio' ? 'active' : ''}`}
          onClick={() => setContentType('audio')}
        >
          🎙️ 语音
        </button>
      </div>

      {contentType === 'audio' && (
        <div>
          {isRecording ? (
            <div>
              <div className="recording-status">
                <div className="rec-dot" />
                <span className="rec-text">正在录制...</span>
                <span className="rec-time">{formatDuration(recordingTime)}</span>
              </div>
              <div className="waveform-container">
                {liveWaveform.map((v, i) => (
                  <div
                    key={i}
                    className="wave-bar"
                    style={{
                      height: `${Math.max(4, v * 40)}px`,
                      animationDelay: `${i * 0.03}s`
                    }}
                  />
                ))}
              </div>
              <button className="btn btn-danger" style={{ width: '100%', marginTop: 12, justifyContent: 'center' }} onClick={stopRecording}>
                ⏹ 停止录音
              </button>
            </div>
          ) : audioData ? (
            <div>
              <div className="echo-card-audio" style={{ marginBottom: 12 }}>
                <button className="play-btn" onClick={handlePlayAudio}>
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <div className="static-waveform">
                  {(audioData.waveform.length ? audioData.waveform : Array(32).fill(0.4)).map((h, i) => (
                    <div
                      key={i}
                      className="static-bar"
                      style={{ height: `${Math.max(3, h * 36)}px`, opacity: 0.7 + h * 0.3 }}
                    />
                  ))}
                </div>
                <span style={{ fontSize: 12, color: 'var(--glass-text-muted)', minWidth: 40, textAlign: 'right' }}>
                  {formatDuration(audioData.duration)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={startRecording}>
                  🔄 重新录制
                </button>
              </div>
            </div>
          ) : (
            <button className="btn" style={{ width: '100%', justifyContent: 'center', padding: '16px' }} onClick={startRecording}>
              🎙️ 点击开始录音
            </button>
          )}
        </div>
      )}

      {contentType === 'text' && (
        <textarea
          className="glass-input"
          rows={4}
          placeholder="留下你的回声音..."
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          style={{ marginBottom: 4 }}
        />
      )}

      <div style={{ fontSize: 11, color: 'var(--glass-text-muted)', margin: '4px 0 14px', display: 'flex', gap: 12 }}>
        <span>📍 {reverseGeocode(latitude, longitude)}</span>
        {contentType === 'text' && <span style={{ marginLeft: 'auto' }}>{textContent.length}/500</span>}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={onCancel} disabled={saving}>
          取消
        </button>
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : (editingEcho ? '更新回声' : '保存回声')}
        </button>
      </div>
    </div>
  )
}

interface ViewEchoCardProps {
  echo: Echo
  onClose?: () => void
  showEditDelete?: boolean
  onEdit?: (echo: Echo) => void
  onDelete?: (echo: Echo) => void
  animationDelay?: number
  isOwner?: boolean
}

export const ProfileEchoCard: React.FC<ViewEchoCardProps> = ({
  echo,
  showEditDelete = true,
  onEdit,
  onDelete,
  animationDelay = 0,
  isOwner = true
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const handlePlay = () => {
    if (echo.contentType !== 'audio') return
    if (!audioElRef.current) {
      audioElRef.current = new Audio(echo.content)
      audioElRef.current.onended = () => setIsPlaying(false)
    }
    if (isPlaying) {
      audioElRef.current.pause()
      audioElRef.current.currentTime = 0
      setIsPlaying(false)
    } else {
      audioElRef.current.play()
      setIsPlaying(true)
    }
  }

  if (isEditing) {
    return (
      <div style={{ animationDelay: `${animationDelay}ms` }} className="waterfall-item">
        <BubbleEchoCard
          latitude={echo.latitude}
          longitude={echo.longitude}
          currentUserId={echo.userId}
          currentUsername={echo.username}
          initialContentType={echo.contentType}
          editingEcho={echo}
          onSave={(updated) => {
            setIsEditing(false)
            if (onEdit) onEdit(updated)
          }}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    )
  }

  return (
    <div style={{ animationDelay: `${animationDelay}ms` }} className="waterfall-item">
      <div className="echo-card-profile">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div className="user-avatar" style={{ width: 36, height: 36, fontSize: 14 }}>
            {getInitials(echo.username)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{echo.username}</div>
            <div className="echo-time">{formatTime(echo.createdAt)}</div>
          </div>
        </div>

        {echo.contentType === 'audio' ? (
          <div className="echo-card-audio">
            <button className="play-btn" onClick={handlePlay}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <div className="static-waveform">
              {(echo.waveformData?.length ? echo.waveformData : Array(32).fill(0.4)).map((h, i) => (
                <div
                  key={i}
                  className="static-bar"
                  style={{ height: `${Math.max(3, h * 36)}px`, opacity: 0.7 + h * 0.3 }}
                />
              ))}
            </div>
            <span style={{ fontSize: 12, color: 'var(--glass-text-muted)', minWidth: 40, textAlign: 'right' }}>
              {formatDuration(echo.duration || 0)}
            </span>
          </div>
        ) : (
          <div className="echo-text-preview">{echo.content}</div>
        )}

        <div className="echo-card-footer">
          <div className="echo-meta">
            <div className="echo-location">📍 {echo.locationName}</div>
            <div className="echo-time">{formatTime(echo.createdAt)}</div>
          </div>
          {showEditDelete && isOwner && (
            <div className="echo-actions">
              <button className="icon-btn" onClick={() => setIsEditing(true)} title="编辑">✏️</button>
              <button className="icon-btn delete" onClick={() => {
                if (confirm('确定删除这条回声吗？')) onDelete?.(echo)
              }} title="删除">🗑️</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BubbleEchoCard
