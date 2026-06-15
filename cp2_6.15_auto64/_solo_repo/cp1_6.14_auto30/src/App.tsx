import { useEffect, useRef, useCallback, useState } from 'react'
import { Play, Pause, Mic, MicOff, Send } from 'lucide-react'
import AudioTrack from '@/components/AudioTrack'
import { useStudioStore } from '@/store'
import { fetchTracks, fetchMessages, updateTrack, postMessage, reorderTracks } from '@/api'
import type { Track, Message, ReorderItem } from '@/api'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface VoiceBubbleProps {
  message: Message
}

function VoiceBubble({ message }: VoiceBubbleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [playing, setPlaying] = useState(false)
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [playProgress, setPlayProgress] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !message.waveformData) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = 180 * dpr
    canvas.height = 32 * dpr
    ctx.scale(dpr, dpr)

    const data = message.waveformData
    const barWidth = Math.max(1, 180 / data.length - 1)
    const centerY = 16

    ctx.clearRect(0, 0, 180, 32)
    for (let i = 0; i < data.length; i++) {
      const x = (i / data.length) * 180
      const h = data[i] * centerY * 0.8
      const played = i / data.length < playProgress
      ctx.fillStyle = played ? '#1db954' : '#8b8baa'
      ctx.fillRect(x, centerY - h, barWidth, h * 2)
    }
  }, [message.waveformData, playProgress])

  useEffect(() => {
    if (playing && message.duration) {
      const startTime = Date.now() - playProgress * message.duration * 1000
      playIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000
        const p = Math.min(elapsed / message.duration!, 1)
        setPlayProgress(p)
        if (p >= 1) {
          setPlaying(false)
          setPlayProgress(0)
        }
      }, 50)
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current)
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current)
    }
  }, [playing, message.duration, playProgress])

  const handleTogglePlay = () => {
    if (playing) {
      setPlaying(false)
    } else {
      setPlayProgress(0)
      setPlaying(true)
    }
  }

  return (
    <div className="flex items-center gap-2" style={{ width: 220, height: 48 }}>
      <button
        onClick={handleTogglePlay}
        className="flex items-center justify-center rounded-full shrink-0 hover:scale-105 transition-transform"
        style={{ width: 28, height: 28, backgroundColor: playing ? '#1db954' : '#6366f1' }}
      >
        {playing ? <Pause size={12} color="#fff" /> : <Play size={12} color="#fff" />}
      </button>
      <canvas ref={canvasRef} style={{ width: 180, height: 32 }} />
      {message.duration !== undefined && (
        <span className="text-[10px] text-gray-500 shrink-0 tabular-nums">
          {playing ? formatTime(playProgress * message.duration) : `${message.duration}s`}
        </span>
      )}
    </div>
  )
}

export default function App() {
  const {
    tracks,
    messages,
    isPlaying,
    currentTime,
    duration,
    selectedTrackId,
    isRecording,
    setTracks,
    updateTrackInList,
    setMessages,
    addMessage,
    setIsPlaying,
    setCurrentTime,
    setSelectedTrackId,
    setIsRecording,
    reorderTracks: storeReorder,
  } = useStudioStore()

  const [inputText, setInputText] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [isDraggingProgress, setIsDraggingProgress] = useState(false)
  const [displayTime, setDisplayTime] = useState(0)
  const progressRef = useRef<HTMLDivElement>(null)
  const messageEndRef = useRef<HTMLDivElement>(null)
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recordingStartTimeRef = useRef<number>(0)
  const displayTimeRef = useRef(0)

  useEffect(() => {
    fetchTracks().then(setTracks).catch(console.error)
    fetchMessages().then(setMessages).catch(console.error)
  }, [setTracks, setMessages])

  useEffect(() => {
    if (isPlaying && !isDraggingProgress) {
      playIntervalRef.current = setInterval(() => {
        setCurrentTime((prev) => Math.min(prev + 1 / 30, duration))
      }, 1000 / 30)
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current)
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current)
    }
  }, [isPlaying, isDraggingProgress, duration, setCurrentTime])

  useEffect(() => {
    if (!isDraggingProgress) {
      setDisplayTime(currentTime)
      displayTimeRef.current = currentTime
    }
  }, [currentTime, isDraggingProgress])

  useEffect(() => {
    displayTimeRef.current = displayTime
  }, [displayTime])

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (currentTime >= duration) {
      setIsPlaying(false)
      setCurrentTime(0)
    }
  }, [currentTime, duration, setIsPlaying, setCurrentTime])

  const handleTrackUpdate = useCallback(
    async (id: string, data: Partial<Track>) => {
      updateTrackInList(id, data)
      try {
        await updateTrack(id, data)
      } catch (e) {
        console.error(e)
      }
    },
    [updateTrackInList]
  )

  const getTimeFromEvent = useCallback(
    (clientX: number): number => {
      const rect = progressRef.current?.getBoundingClientRect()
      if (!rect) return 0
      const x = clientX - rect.left
      const pct = Math.max(0, Math.min(1, x / rect.width))
      return pct * duration
    },
    [duration]
  )

  const handleProgressMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDraggingProgress(true)
      const time = getTimeFromEvent(e.clientX)
      setDisplayTime(time)
      displayTimeRef.current = time
    },
    [getTimeFromEvent]
  )

  const handleProgressMouseLeave = useCallback(() => {
    if (!isDraggingProgress) return
  }, [isDraggingProgress])

  useEffect(() => {
    if (!isDraggingProgress) return

    const handleMouseMove = (e: MouseEvent) => {
      const time = getTimeFromEvent(e.clientX)
      setDisplayTime(time)
      displayTimeRef.current = time
    }

    const handleMouseUp = () => {
      setIsDraggingProgress(false)
      setCurrentTime(displayTimeRef.current)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingProgress, getTimeFromEvent, setCurrentTime])

  const handleSend = useCallback(async () => {
    if (!inputText.trim()) return
    const msg = {
      type: 'text' as const,
      content: inputText.trim(),
      sender: '我',
    }
    try {
      const saved = await postMessage(msg)
      addMessage(saved)
      setInputText('')
    } catch (e) {
      console.error(e)
    }
  }, [inputText, addMessage])

  const startRecording = useCallback(() => {
    if (isRecording) return
    setIsRecording(true)
    recordingStartTimeRef.current = Date.now()

    recordingTimerRef.current = setTimeout(async () => {
      if (recordingTimerRef.current) {
        recordingTimerRef.current = null
      }
      const recordedDuration = 10
      const waveform = Array.from({ length: 60 }, () => Math.random() * 0.6 + 0.1)
      const msg: Omit<Message, '_id' | 'timestamp'> = {
        type: 'voice',
        content: '',
        sender: '我',
        duration: recordedDuration,
        waveformData: waveform,
      }
      setIsRecording(false)
      try {
        const saved = await postMessage(msg)
        addMessage(saved)
      } catch (e) {
        console.error(e)
      }
    }, 10000)
  }, [isRecording, setIsRecording, addMessage])

  const stopRecording = useCallback(async () => {
    if (!isRecording) return

    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current)
      recordingTimerRef.current = null
    }

    const recordedDuration = Math.min(
      10,
      Math.max(1, Math.round((Date.now() - recordingStartTimeRef.current) / 1000))
    )

    const waveform = Array.from({ length: 60 }, () => Math.random() * 0.6 + 0.1)
    const msg: Omit<Message, '_id' | 'timestamp'> = {
      type: 'voice',
      content: '',
      sender: '我',
      duration: recordedDuration,
      waveformData: waveform,
    }

    setIsRecording(false)

    try {
      const saved = await postMessage(msg)
      addMessage(saved)
    } catch (e) {
      console.error(e)
    }
  }, [isRecording, setIsRecording, addMessage])

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  const handleDragStart = useCallback((index: number) => setDragIndex(index), [])
  const handleDragOver = useCallback((index: number) => setDragOverIndex(index), [])
  const handleDragEnd = useCallback(async () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      storeReorder(dragIndex, dragOverIndex)
      const newTracks = [...tracks]
      const [removed] = newTracks.splice(dragIndex, 1)
      newTracks.splice(dragOverIndex, 0, removed)
      const orders: ReorderItem[] = newTracks.map((t, i) => ({ id: t._id, order: i }))
      try {
        const updated = await reorderTracks(orders)
        setTracks(updated)
      } catch (e) {
        console.error(e)
      }
    }
    setDragIndex(null)
    setDragOverIndex(null)
  }, [dragIndex, dragOverIndex, tracks, storeReorder, setTracks])

  const displayProgress = duration > 0 ? (isDraggingProgress ? displayTime : currentTime) / duration : 0
  const hasSolo = tracks.some((t) => t.solo)

  return (
    <div className="flex flex-col h-screen bg-[#121212] font-sans">
      <header className="shrink-0 border-b border-[#2a2a2a] px-4 md:px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white tracking-wide">
          TuneBite
          <span className="ml-2 text-sm font-normal text-gray-400">排练室</span>
        </h1>
        <span className="text-xs text-gray-500">{tracks.length} 条音轨</span>
      </header>

      <div className="shrink-0 px-4 md:px-6 py-4 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-3 md:gap-4">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center justify-center rounded-full hover:scale-105 transition-transform shrink-0"
            style={{ width: 40, height: 40, backgroundColor: '#1db954' }}
          >
            {isPlaying ? (
              <Pause size={18} color="#fff" />
            ) : (
              <Play size={18} color="#fff" style={{ marginLeft: 2 }} />
            )}
          </button>

          <span className="text-xs text-gray-400 w-10 text-right tabular-nums hidden md:inline">
            {formatTime(isDraggingProgress ? displayTime : currentTime)}
          </span>

          <div
            ref={progressRef}
            className="flex-1 relative h-6 flex items-center cursor-pointer select-none"
            style={{ maxWidth: '80%' }}
            onMouseDown={handleProgressMouseDown}
            onMouseLeave={handleProgressMouseLeave}
          >
            <div className="w-full h-1 rounded-full bg-[#404040] relative overflow-visible">
              <div
                className="absolute top-0 left-0 h-full rounded-full"
                style={{
                  width: `${displayProgress * 100}%`,
                  backgroundColor: '#1db95433',
                  transition: isDraggingProgress ? 'none' : 'width 0.1s ease-out',
                }}
              />
              <div
                className="absolute top-0 left-0 h-full rounded-full"
                style={{
                  width: `${displayProgress * 100}%`,
                  backgroundColor: '#1db954',
                  transition: isDraggingProgress ? 'none' : 'width 0.1s ease-out',
                }}
              />
              <div
                className="absolute top-1/2 rounded-full shadow-md"
                style={{
                  width: 12,
                  height: 12,
                  backgroundColor: '#fff',
                  left: `${displayProgress * 100}%`,
                  transform: 'translateX(-50%) translateY(-50%)',
                  transition: isDraggingProgress ? 'none' : 'left 0.1s ease-out',
                }}
              />
            </div>
          </div>

          <span className="text-xs text-gray-400 w-10 tabular-nums hidden md:inline">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 md:px-4 py-3 space-y-2">
        <div className="space-y-1.5">
          {tracks.map((track, index) => {
            const shouldMute = hasSolo ? !track.solo : track.muted
            return (
              <AudioTrack
                key={track._id}
                track={{ ...track, muted: shouldMute }}
                isSelected={selectedTrackId === track._id}
                isPlaying={isPlaying}
                currentTime={isDraggingProgress ? displayTime : currentTime}
                onSelect={setSelectedTrackId}
                onUpdate={handleTrackUpdate}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                index={index}
              />
            )
          })}
        </div>

        {tracks.length > 0 && <div className="h-3" />}

        <div className="border-t border-[#2a2a2a] pt-3">
          <h3 className="text-sm font-medium text-gray-400 mb-2">排练讨论</h3>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {messages.map((msg) => (
              <div key={msg._id} className="flex flex-col">
                <span className="text-[10px] text-gray-500 mb-1">{msg.sender}</span>
                {msg.type === 'text' ? (
                  <div
                    className="inline-block rounded-xl px-3 py-1.5 text-sm text-gray-200 max-w-[80%]"
                    style={{ backgroundColor: '#2a2a3a' }}
                  >
                    {msg.content}
                  </div>
                ) : (
                  <div
                    className="inline-flex items-center rounded-xl px-2 py-1.5"
                    style={{ backgroundColor: '#2a2a3a' }}
                  >
                    <VoiceBubble message={msg} />
                  </div>
                )}
              </div>
            ))}
            <div ref={messageEndRef} />
          </div>
        </div>
      </div>

      <div
        className="shrink-0 border-t border-[#2a2a2a] px-3 md:px-4 flex items-center gap-2 md:gap-3"
        style={{ height: 60, backgroundColor: '#1e1e1e' }}
      >
        <button
          onClick={toggleRecording}
          className="flex items-center justify-center rounded-full shrink-0 hover:scale-105 transition-transform"
          style={{
            width: 36,
            height: 36,
            backgroundColor: isRecording ? '#ef4444' : '#6366f1',
          }}
        >
          {isRecording ? <MicOff size={16} color="#fff" /> : <Mic size={16} color="#fff" />}
        </button>
        {isRecording && (
          <span className="text-xs text-red-400 animate-pulse shrink-0">录制中...</span>
        )}
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="输入排练讨论..."
          className="flex-1 px-3 md:px-4 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none"
          style={{
            borderRadius: 12,
            backgroundColor: '#2a2a3a',
          }}
        />
        <button
          onClick={handleSend}
          className="flex items-center justify-center rounded-full shrink-0 hover:scale-105 transition-transform"
          style={{ width: 36, height: 36, backgroundColor: '#1db954' }}
        >
          <Send size={16} color="#fff" />
        </button>
      </div>
    </div>
  )
}
