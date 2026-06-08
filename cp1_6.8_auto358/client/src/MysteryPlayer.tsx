import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, SkipForward, Mic, MicOff, Send, Volume2, Radio } from 'lucide-react'
import { useRadioStore } from './store'

const TYPE_BADGES: Record<string, string> = {
  lyrics: '🎵歌词',
  dream: '💭梦境',
  sound: '🔊声音',
  other: '❓其他',
}

interface Props {
  mode: 'browse' | 'guess'
  mysteryId?: string
}

export default function MysteryPlayer({ mode, mysteryId }: Props) {
  const {
    currentMystery,
    isRecording,
    isPlaying,
    fetchRandomMystery,
    submitMystery,
    submitGuess,
  } = useRadioStore()

  const [innerMode, setInnerMode] = useState(mode)
  const [guessAnswer, setGuessAnswer] = useState('')
  const [guessResult, setGuessResult] = useState<{ correct: boolean } | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [mysteryType, setMysteryType] = useState('other')
  const [mysteryAnswer, setMysteryAnswer] = useState('')
  const [mysteryKeywords, setMysteryKeywords] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioBlobRef = useRef<Blob | null>(null)

  useEffect(() => {
    if (innerMode === 'browse' && !currentMystery) {
      fetchRandomMystery()
    }
  }, [innerMode, currentMystery, fetchRandomMystery])

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    useRadioStore.setState({ isPlaying: false })
  }, [])

  const playAudio = useCallback((url: string) => {
    stopAudio()
    const audio = new Audio(url)
    audioRef.current = audio
    audio.onplay = () => useRadioStore.setState({ isPlaying: true })
    audio.onended = () => useRadioStore.setState({ isPlaying: false })
    audio.onerror = () => useRadioStore.setState({ isPlaying: false })
    audio.play().catch(() => useRadioStore.setState({ isPlaying: false }))
  }, [stopAudio])

  const togglePlay = useCallback(() => {
    if (!currentMystery?.audio_url) return
    if (isPlaying) {
      stopAudio()
    } else {
      playAudio(currentMystery.audio_url)
    }
  }, [currentMystery, isPlaying, playAudio, stopAudio])

  const handleSkip = useCallback(() => {
    stopAudio()
    setGuessResult(null)
    fetchRandomMystery()
  }, [stopAudio, fetchRandomMystery])

  const handleGuessSubmit = useCallback(async () => {
    if (!currentMystery || !guessAnswer.trim()) return
    setSubmitting(true)
    try {
      const result = await submitGuess(currentMystery.id, guessAnswer.trim())
      setGuessResult(result)
    } catch {
      setGuessResult({ correct: false })
    } finally {
      setSubmitting(false)
    }
  }, [currentMystery, guessAnswer, submitGuess])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = recorder
      recordingChunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: 'audio/webm' })
        audioBlobRef.current = blob
        stream.getTracks().forEach((t) => t.stop())
      }
      recorder.start()
      useRadioStore.setState({ isRecording: true })
      setRecordingTime(0)
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((t) => {
          if (t >= 14) {
            recorder.stop()
            useRadioStore.setState({ isRecording: false })
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
            return 15
          }
          return t + 1
        })
      }, 1000)
    } catch {
      useRadioStore.setState({ isRecording: false })
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    useRadioStore.setState({ isRecording: false })
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
  }, [])

  const handleSubmitMystery = useCallback(async () => {
    if (!audioBlobRef.current || !mysteryAnswer.trim()) return
    setSubmitting(true)
    try {
      await submitMystery(audioBlobRef.current, mysteryType, mysteryAnswer.trim(), mysteryKeywords)
      audioBlobRef.current = null
      setMysteryAnswer('')
      setMysteryKeywords('')
      setRecordingTime(0)
    } finally {
      setSubmitting(false)
    }
  }, [mysteryType, mysteryAnswer, mysteryKeywords, submitMystery])

  const recordingProgress = (recordingTime / 15) * 100
  const circumference = 2 * Math.PI * 28
  const strokeDashoffset = circumference - (recordingProgress / 100) * circumference

  if (innerMode === 'guess') {
    return (
      <div className="max-w-md mx-auto px-4 py-6">
        <button
          onClick={() => { setInnerMode('browse'); setGuessResult(null); setGuessAnswer('') }}
          className="btn-retro mb-4 text-cream/80 text-sm"
        >
          ← 返回
        </button>

        {currentMystery && (
          <div className="card-radio p-6 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-retro text-dark-gold">
                {TYPE_BADGES[currentMystery.type] || TYPE_BADGES.other}
              </span>
            </div>

            <div className="flex items-center justify-center mb-4">
              <div className="needle-container">
                <div className={isPlaying ? 'needle-animation' : ''}>
                  <Volume2 className="w-6 h-6 text-copper" />
                </div>
              </div>
              <button onClick={togglePlay} className="btn-retro ml-4 w-12 h-12 flex items-center justify-center">
                {isPlaying ? <Pause className="w-5 h-5 text-cream" /> : <Play className="w-5 h-5 text-cream" />}
              </button>
            </div>

            {!guessResult && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={guessAnswer}
                  onChange={(e) => setGuessAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGuessSubmit()}
                  placeholder="输入你的答案..."
                  className="w-full px-4 py-2 rounded bg-dark-brown/60 border border-dark-gold/40 text-cream font-retro placeholder:text-cream/30 focus:outline-none focus:border-copper"
                />
                <button
                  onClick={handleGuessSubmit}
                  disabled={!guessAnswer.trim() || submitting}
                  className="btn-retro w-full flex items-center justify-center gap-2 text-cream disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                  提交答案
                </button>
              </div>
            )}

            {guessResult && (
              <div className={`text-center py-4 animate-fade-in ${guessResult.correct ? 'text-dark-gold' : 'text-cream/60'}`}>
                <div className="text-3xl mb-2">{guessResult.correct ? '✨' : '💭'}</div>
                <p className="font-retro text-lg">
                  {guessResult.correct ? '心灵共振成功！' : '频率未对齐，再试试？'}
                </p>
                {guessResult.correct && (
                  <button onClick={handleSkip} className="btn-retro mt-4 text-cream text-sm">
                    继续收听
                  </button>
                )}
                {!guessResult.correct && (
                  <button onClick={() => setGuessResult(null)} className="btn-retro mt-4 text-cream text-sm">
                    再猜一次
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      {currentMystery ? (
        <div className="card-radio p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-retro text-dark-gold">
              {TYPE_BADGES[currentMystery.type] || TYPE_BADGES.other}
            </span>
            <span className="text-xs font-retro text-cream/40">
              {new Date(currentMystery.created_at).toLocaleDateString('zh-CN')}
            </span>
          </div>

          <div className="flex items-center justify-center py-6">
            <div className="needle-container">
              <div className={isPlaying ? 'needle-animation' : ''}>
                <Radio className="w-10 h-10 text-copper" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 mb-4">
            <button onClick={togglePlay} className="btn-retro w-14 h-14 flex items-center justify-center">
              {isPlaying ? <Pause className="w-6 h-6 text-cream" /> : <Play className="w-6 h-6 text-cream" />}
            </button>
            <button onClick={handleSkip} className="btn-retro px-4 py-2 flex items-center gap-1.5 text-cream/80 text-sm">
              <SkipForward className="w-4 h-4" />
              跳过
            </button>
          </div>

          <button
            onClick={() => { stopAudio(); setInnerMode('guess'); setGuessResult(null); setGuessAnswer('') }}
            className="btn-retro w-full py-2.5 text-cream font-retro text-center"
          >
            🎯 猜谜
          </button>
        </div>
      ) : (
        <div className="card-radio p-8 mb-6 text-center">
          <Radio className="w-12 h-12 text-copper/40 mx-auto mb-3" />
          <p className="font-retro text-cream/50">正在调频中...</p>
        </div>
      )}

      <div className="card-radio p-6">
        <h3 className="font-display text-cream text-lg mb-4 text-center">🎙️ 录音出题</h3>

        <div className="flex items-center justify-center mb-4">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className="relative w-16 h-16 flex items-center justify-center"
          >
            {isRecording && (
              <>
                <div className="absolute inset-0 rounded-full bg-copper/30 animate-pulse-ring" />
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(184,134,11,0.2)" strokeWidth="3" />
                  <circle
                    cx="32" cy="32" r="28" fill="none" stroke="#CD7F32" strokeWidth="3"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="recording-progress transition-all duration-300"
                  />
                </svg>
              </>
            )}
            <div
              className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center ${
                isRecording
                  ? 'bg-gradient-to-br from-copper to-dark-gold shadow-lg'
                  : 'bg-warm-brown border-2 border-dark-gold/50'
              }`}
            >
              {isRecording ? <MicOff className="w-5 h-5 text-cream" /> : <Mic className="w-5 h-5 text-cream" />}
            </div>
          </button>
        </div>

        {isRecording && (
          <p className="text-center font-retro text-cream/50 text-sm mb-3">{recordingTime}/15s</p>
        )}

        <div className="space-y-2">
          <select
            value={mysteryType}
            onChange={(e) => setMysteryType(e.target.value)}
            className="w-full px-3 py-1.5 rounded bg-dark-brown/60 border border-dark-gold/40 text-cream font-retro text-sm focus:outline-none focus:border-copper"
          >
            {Object.entries(TYPE_BADGES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <input
            type="text"
            value={mysteryAnswer}
            onChange={(e) => setMysteryAnswer(e.target.value)}
            placeholder="答案"
            className="w-full px-3 py-1.5 rounded bg-dark-brown/60 border border-dark-gold/40 text-cream font-retro text-sm placeholder:text-cream/30 focus:outline-none focus:border-copper"
          />
          <input
            type="text"
            value={mysteryKeywords}
            onChange={(e) => setMysteryKeywords(e.target.value)}
            placeholder="关键词（逗号分隔，可选）"
            className="w-full px-3 py-1.5 rounded bg-dark-brown/60 border border-dark-gold/40 text-cream font-retro text-sm placeholder:text-cream/30 focus:outline-none focus:border-copper"
          />
          <button
            onClick={handleSubmitMystery}
            disabled={!audioBlobRef.current || !mysteryAnswer.trim() || submitting}
            className="btn-retro w-full py-2 text-cream text-sm disabled:opacity-40"
          >
            提交谜题
          </button>
        </div>
      </div>
    </div>
  )
}
