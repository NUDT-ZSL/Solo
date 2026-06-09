import { useState, useRef, useEffect, useCallback } from 'react'
import type { RecorderProps } from './types'

const MAX_RECORDING_SECONDS = 30
const SAMPLE_RATE = 22050

export default function Recorder({
  onRecordingComplete,
  isUploading,
  uploadProgress,
}: RecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [timeLeft, setTimeLeft] = useState(MAX_RECORDING_SECONDS)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setIsRecording(false)
  }, [])

  const handleRecordingComplete = useCallback(() => {
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
    audioChunksRef.current = []
    onRecordingComplete(audioBlob)
  }, [onRecordingComplete])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      streamRef.current = stream
      audioChunksRef.current = []

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        handleRecordingComplete()
      }

      startTimeRef.current = Date.now()
      setTimeLeft(MAX_RECORDING_SECONDS)
      mediaRecorder.start()
      setIsRecording(true)

      timerRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000
        const remaining = Math.max(0, Math.ceil(MAX_RECORDING_SECONDS - elapsed))
        setTimeLeft(remaining)

        if (remaining <= 0) {
          stopRecording()
        }
      }, 100)
    } catch (error) {
      console.error('Failed to start recording:', error)
      alert('无法访问麦克风，请检查权限设置')
    }
  }, [stopRecording, handleRecordingComplete])

  const handleButtonClick = () => {
    if (isUploading) return
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const formatTime = (seconds: number) => {
    const s = Math.floor(seconds)
    return `${String(s).padStart(2, '0')}s`
  }

  return (
    <div className="recorder-wrapper">
      <div className="recording-info">
        {isRecording && (
          <div className={`countdown ${isRecording ? 'recording' : ''}`}>
            ● {formatTime(timeLeft)}
          </div>
        )}
        {isUploading && (
          <>
            <div className="upload-label">正在生成琥珀...</div>
            <div className="upload-progress">
              <div
                className="upload-progress-bar"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </>
        )}
        {!isRecording && !isUploading && (
          <div className="countdown" style={{ opacity: 0.8 }}>
            最长 {MAX_RECORDING_SECONDS}s
          </div>
        )}
      </div>
      <button
        className={`mic-button ${isRecording ? 'recording' : ''}`}
        onClick={handleButtonClick}
        disabled={isUploading}
        title={isRecording ? '点击停止录音' : '点击开始录音'}
      >
        <div className="mic-icon">
          <div className="mic-icon-stand" />
        </div>
      </button>
    </div>
  )
}
