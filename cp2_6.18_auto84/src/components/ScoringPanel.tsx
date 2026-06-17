import { useState, useRef, useEffect } from 'react'
import type { Member, ScoreFormData } from '../types'
import { PRESET_SONGS } from '../types'
import { clamp } from '../utils/dataHelper'

interface ScoringPanelProps {
  open: boolean
  member: Member | null
  onClose: () => void
  onSubmit: (memberId: string, data: ScoreFormData) => Promise<boolean>
}

export default function ScoringPanel({ open, member, onClose, onSubmit }: ScoringPanelProps) {
  const [pitch, setPitch] = useState(60)
  const [rhythm, setRhythm] = useState(60)
  const [expression, setExpression] = useState(60)
  const [note, setNote] = useState('')
  const [songs, setSongs] = useState<string[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState('')
  const [recordingTime, setRecordingTime] = useState(0)
  const [waveform, setWaveform] = useState<number[]>(Array(20).fill(10))
  const [submitting, setSubmitting] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const waveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (open) {
      setPitch(60)
      setRhythm(60)
      setExpression(60)
      setNote('')
      setSongs([])
      setAudioUrl('')
      setRecordingTime(0)
      setIsRecording(false)
    }
  }, [open, member])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (waveTimerRef.current) clearInterval(waveTimerRef.current)
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []
      recorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        if (blob.size > 500 * 1024) {
          alert('录音文件超过500KB限制')
          stream.getTracks().forEach(t => t.stop())
          return
        }
        const reader = new FileReader()
        reader.onload = () => {
          setAudioUrl(reader.result as string)
        }
        reader.readAsDataURL(blob)
        stream.getTracks().forEach(t => t.stop())
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime(t => {
          if (t >= 30) {
            stopRecording()
            return 30
          }
          return t + 1
        })
      }, 1000)

      waveTimerRef.current = setInterval(() => {
        setWaveform(prev => prev.map(() => Math.random() * 40 + 10))
      }, 100)
    } catch (err) {
      alert('无法访问麦克风：' + (err as Error).message)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
    if (waveTimerRef.current) clearInterval(waveTimerRef.current)
    setWaveform(Array(20).fill(10))
  }

  const toggleSong = (song: string) => {
    setSongs(prev =>
      prev.includes(song) ? prev.filter(s => s !== song) : [...prev, song]
    )
  }

  const handleSubmit = async () => {
    if (!member) return
    setSubmitting(true)
    const data: ScoreFormData = {
      pitch: clamp(pitch, 0, 100),
      rhythm: clamp(rhythm, 0, 100),
      expression: clamp(expression, 0, 100),
      note: note.slice(0, 150),
      audioUrl,
      songs
    }
    const ok = await onSubmit(member.id, data)
    setSubmitting(false)
    if (!ok) alert('提交失败')
  }

  const renderSlider = (
    label: string,
    value: number,
    setter: (n: number) => void,
    color: string
  ) => (
    <div className="slider-row">
      <div className="slider-header">
        <span className="slider-label">{label}</span>
        <span className="slider-value" style={{ color }}>{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={e => setter(Number(e.target.value))}
        className="gradient-slider"
      />
    </div>
  )

  return (
    <>
      <div
        className={`panel-overlay ${open ? 'visible' : ''}`}
        onClick={onClose}
      />
      <aside className={`scoring-panel ${open ? 'open' : ''}`}>
        <div className="panel-header">
          <div>
            <div className="panel-title">评分面板</div>
            {member && <div className="panel-subtitle">{member.name} · {member.voicePart}</div>}
          </div>
          <button className="panel-close" onClick={onClose}>✕</button>
        </div>

        <div className="panel-body">
          {renderSlider('音准', pitch, setPitch, '#42a5f5')}
          {renderSlider('节奏', rhythm, setRhythm, '#66bb6a')}
          {renderSlider('表现力', expression, setExpression, '#ab47bc')}

          <div className="recording-section">
            <div className="section-label">语音点评（最多30秒）</div>
            <div className="waveform-container">
              {waveform.map((h, i) => (
                <div
                  key={i}
                  className="waveform-bar"
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
            <div className="recording-controls">
              <button
                className={`record-btn ${isRecording ? 'recording' : ''}`}
                onClick={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? '⏹ 停止' : '🎙 录音'}
              </button>
              <span className="recording-time">{recordingTime}s / 30s</span>
              {audioUrl && !isRecording && (
                <>
                  <button className="btn btn-secondary btn-sm" onClick={() => setAudioUrl('')}>
                    重录
                  </button>
                  <audio src={audioUrl} controls className="audio-preview" />
                </>
              )}
            </div>
          </div>

          <div className="note-section">
            <div className="section-label">文字备注（限150字）</div>
            <textarea
              className="note-textarea"
              value={note}
              onChange={e => setNote(e.target.value.slice(0, 150))}
              placeholder="输入点评文字..."
              rows={3}
            />
            <div className="note-counter">{note.length}/150</div>
          </div>

          <div className="songs-section">
            <div className="section-label">曲目标签（多选）</div>
            <div className="song-chips">
              {PRESET_SONGS.map(song => (
                <button
                  key={song}
                  className={`song-chip-panel ${songs.includes(song) ? 'active' : ''}`}
                  onClick={() => toggleSong(song)}
                >
                  {song}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="panel-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            取消
          </button>
          <button className="btn btn-primary ripple-parent" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '提交中...' : '提交评分'}
          </button>
        </div>
      </aside>
    </>
  )
}
