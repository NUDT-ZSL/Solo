import { useEffect, useRef, useCallback, useState } from 'react'
import { Play, Pause, Mic, MicOff, Send } from 'lucide-react'
import AudioTrack from '@/components/AudioTrack'
import { useStudioStore } from '@/store'
import { fetchTracks, fetchMessages, updateTrack, postMessage, reorderTracks } from '@/api'
import type { Track, Message } from '@/api'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function VoiceBubble({ message }: { message: Message }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [playing, setPlaying] = useState(false)

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
      ctx.fillStyle = playing ? '#1db954' : '#8b8baa'
      ctx.fillRect(x, centerY - h, barWidth, h * 2)
    }
  }, [message.waveformData, playing])

  return (
    <div className="flex items-center gap-2" style={{ width: 220, height: 48 }}>
      <button
        onClick={() => setPlaying(!playing)}
        className="flex items-center justify-center rounded-full shrink-0"
        style={{ width: 28, height: 28, backgroundColor: playing ? '#1db954' : '#6366f1' }}
      >
        {playing ? <Pause size={12} color="#fff" /> : <Play size={12} color="#fff" />}
      </button>
      <canvas ref={canvasRef} style={{ width: 180, height: 32 }} />
      {message.duration && (
        <span className="text-[10px] text-gray-500 shrink-0">{message.duration}s</span>
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
  const progressRef = useRef<HTMLDivElement>(null)
  const messageEndRef = useRef<HTMLDivElement>(null)
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetchTracks().then(setTracks).catch(console.error)
    fetchMessages().then(setMessages).catch(console.error)
  }, [setTracks, setMessages])

  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentTime(Math.min(currentTime + 1 / 30, duration))
      }, 1000 / 30)
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current)
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current)
    }
  }, [isPlaying, currentTime, duration, setCurrentTime])

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

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const pct = x / rect.width
      setCurrentTime(pct * duration)
    },
    [duration, setCurrentTime]
  )

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

  const handleVoiceRecord = useCallback(async () => {
    if (isRecording) return
    setIsRecording(true)

    setTimeout(async () => {
      setIsRecording(false)
      const waveform = Array.from({ length: 60 }, () => Math.random() * 0.6 + 0.1)
      const msg = {
        type: 'voice' as const,
        content: '',
        sender: '我',
        duration: 10,
        waveformData: waveform,
      }
      try {
        const saved = await postMessage(msg)
        addMessage(saved)
      } catch (e) {
        console.error(e)
      }
    }, 10000)
  }, [isRecording, setIsRecording, addMessage])

  const handleDragStart = useCallback((index: number) => setDragIndex(index), [])
  const handleDragOver = useCallback((index: number) => setDragOverIndex(index), [])
  const handleDragEnd = useCallback(async () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      storeReorder(dragIndex, dragOverIndex)
      const orders = tracks.map((_t, i) => {
        const newTracks = [...tracks]
        const [removed] = newTracks.splice(dragIndex, 1)
        newTracks.splice(dragOverIndex, 0, removed)
        return { id: newTracks[i]._id, order: i }
      })
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

  const progress = duration > 0 ? currentTime / duration : 0

  const hasSolo = tracks.some((t) => t.solo)

  return (
    <div className="flex flex-col h-screen bg-[#121212]">
      <header className="shrink-0 border-b border-[#2a2a2a] px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white tracking-wide">
          TuneBite
          <span className="ml-2 text-sm font-normal text-gray-400">排练室</span>
        </h1>
        <span className="text-xs text-gray-500">{tracks.length} 条音轨</span>
      </header>

      <div className="shrink-0 px-6 py-4 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center justify-center rounded-full hover:scale-105 transition-transform"
            style={{ width: 40, height: 40, backgroundColor: '#1db954' }}
          >
            {isPlaying ? (
              <Pause size={18} color="#fff" />
            ) : (
              <Play size={18} color="#fff" style={{ marginLeft: 2 }} />
            )}
          </button>

          <span className="text-xs text-gray-400 w-10 text-right tabular-nums">
            {formatTime(currentTime)}
          </span>

          <div
            ref={progressRef}
            className="flex-1 relative h-6 flex items-center cursor-pointer"
            style={{ maxWidth: '80%' }}
            onClick={handleProgressClick}
          >
            <div className="w-full h-1 rounded-full bg-[#404040] relative">
              <div
                className="absolute top-0 left-0 h-full rounded-full"
                style={{
                  width: `${progress * 100}%`,
                  backgroundColor: '#1db95433',
                }}
              />
              <div
                className="absolute top-0 left-0 h-full rounded-full"
                style={{
                  width: `${progress * 100}%`,
                  backgroundColor: '#1db954',
                }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 rounded-full"
                style={{
                  width: 12,
                  height: 12,
                  backgroundColor: '#fff',
                  left: `${progress * 100}%`,
                  transform: `translateX(-50%) translateY(-50%)`,
                  transition: 'left 0.033s linear',
                }}
              />
            </div>
          </div>

          <span className="text-xs text-gray-400 w-10 tabular-nums">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5 md:space-y-1.5">
        <div className="hidden md:block space-y-1.5">
          {tracks.map((track, index) => {
            const shouldMute = hasSolo ? !track.solo : track.muted
            return (
              <AudioTrack
                key={track._id}
                track={{ ...track, muted: shouldMute }}
                isSelected={selectedTrackId === track._id}
                isPlaying={isPlaying}
                currentTime={currentTime}
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

        <div className="md:hidden grid grid-cols-1 gap-2">
          {tracks.map((track, index) => {
            const shouldMute = hasSolo ? !track.solo : track.muted
            return (
              <AudioTrack
                key={track._id}
                track={{ ...track, muted: shouldMute }}
                isSelected={selectedTrackId === track._id}
                isPlaying={isPlaying}
                currentTime={currentTime}
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

        {tracks.length > 0 && <div className="h-2" />}

        <div className="border-t border-[#2a2a2a] pt-3">
          <h3 className="text-sm font-medium text-gray-400 mb-2">排练讨论</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {messages.map((msg) => (
              <div key={msg._id} className="flex flex-col">
                <span className="text-[10px] text-gray-500 mb-0.5">{msg.sender}</span>
                {msg.type === 'text' ? (
                  <div
                    className="inline-block rounded-xl px-3 py-1.5 text-sm text-gray-200 max-w-[70%]"
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
        className="shrink-0 border-t border-[#2a2a2a] px-4 flex items-center gap-3"
        style={{ height: 60, backgroundColor: '#1e1e1e' }}
      >
        <button
          onClick={handleVoiceRecord}
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
          <span className="text-xs text-red-400 animate-pulse">录制中 10s...</span>
        )}
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="输入排练讨论..."
          className="flex-1 px-4 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none"
          style={{
            borderRadius: 12,
            backgroundColor: '#2a2a3a',
          }}
        />
        <button
          onClick={handleSend}
          className="flex items-center justify-center rounded-full hover:scale-105 transition-transform"
          style={{ width: 36, height: 36, backgroundColor: '#1db954' }}
        >
          <Send size={16} color="#fff" />
        </button>
      </div>
    </div>
  )
}
