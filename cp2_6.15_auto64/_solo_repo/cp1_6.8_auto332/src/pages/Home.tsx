import { useState, useCallback, useRef, useEffect } from 'react'
import { Play, Pause, Heart, Wind, Link2, Radio } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useAudioVisualizer } from '@/hooks/useAudioVisualizer'
import { VoiceMessage } from '@/types'
import VoiceRecorder from '@/components/VoiceRecorder'
import ResponsePanel from '@/components/ResponsePanel'
import ConnectionList from '@/components/ConnectionList'
import WaveBackground from '@/components/WaveBackground'

async function fetchRandomVoice(excludeId: string): Promise<VoiceMessage> {
  const res = await fetch(`/api/voices/random?exclude_id=${excludeId}`)
  return res.json()
}

async function uploadVoice(blob: Blob, anonymousId: string): Promise<VoiceMessage> {
  const formData = new FormData()
  formData.append('audio', blob, 'voice.webm')
  formData.append('anonymous_id', anonymousId)
  const res = await fetch('/api/voices', { method: 'POST', body: formData })
  return res.json()
}

async function respondToVoice(voiceId: string, responderId: string, text: string, audioBlob?: Blob) {
  if (audioBlob) {
    const formData = new FormData()
    formData.append('responder_id', responderId)
    formData.append('text', text)
    formData.append('audio', audioBlob, 'response.webm')
    const res = await fetch(`/api/voices/${voiceId}/respond-with-audio`, { method: 'POST', body: formData })
    return res.json()
  }
  const res = await fetch(`/api/voices/${voiceId}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ responder_id: responderId, text }),
  })
  return res.json()
}

async function fetchConnections(userId: string) {
  const res = await fetch(`/api/connections?user_id=${userId}`)
  return res.json()
}

export default function Home() {
  const {
    anonymousId,
    currentVoice,
    connections,
    isPlaying,
    showResponsePanel,
    showConnectionList,
    setCurrentVoice,
    setConnections,
    addConnection,
    setIsPlaying,
    setShowResponsePanel,
    setShowConnectionList,
  } = useStore()

  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { canvasRef, connectAudio, startVisualization, stopVisualization } = useAudioVisualizer()

  const loadRandomVoice = useCallback(async () => {
    setIsLoading(true)
    stopVisualization()
    setIsPlaying(false)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    try {
      const voice = await fetchRandomVoice(anonymousId)
      setCurrentVoice(voice.id ? voice : null)
    } catch {
      setCurrentVoice(null)
    }
    setIsLoading(false)
  }, [anonymousId, setCurrentVoice, setIsPlaying, stopVisualization])

  useEffect(() => {
    loadRandomVoice()
  }, [])

  useEffect(() => {
    fetchConnections(anonymousId).then((conns) => {
      if (Array.isArray(conns)) setConnections(conns)
    }).catch(() => {})
  }, [anonymousId, setConnections])

  const handlePlay = useCallback(async () => {
    if (!currentVoice?.audio_url) return

    if (isPlaying) {
      audioRef.current?.pause()
      setIsPlaying(false)
      stopVisualization()
      return
    }

    if (!audioRef.current || audioRef.current.src !== currentVoice.audio_url) {
      const audio = new Audio(currentVoice.audio_url)
      audio.crossOrigin = 'anonymous'
      audioRef.current = audio

      audio.addEventListener('canplaythrough', () => {
        connectAudio(audio)
        audio.play()
        setIsPlaying(true)
        startVisualization()
      }, { once: true })

      audio.addEventListener('ended', () => {
        setIsPlaying(false)
        stopVisualization()
      })

      audio.load()
    } else {
      audioRef.current.play()
      setIsPlaying(true)
      startVisualization()
    }
  }, [currentVoice, isPlaying, setIsPlaying, connectAudio, startVisualization, stopVisualization])

  const handleRelease = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsPlaying(false)
    stopVisualization()
    loadRandomVoice()
  }, [loadRandomVoice, setIsPlaying, stopVisualization])

  const handleRecordingComplete = useCallback(async (blob: Blob) => {
    setIsUploading(true)
    try {
      await uploadVoice(blob, anonymousId)
    } catch {
      console.error('Upload failed')
    }
    setIsUploading(false)
  }, [anonymousId])

  const handleResponse = useCallback(async (text: string, audioBlob?: Blob) => {
    if (!currentVoice?.id) return
    try {
      const connection = await respondToVoice(currentVoice.id, anonymousId, text, audioBlob)
      addConnection(connection)
      setShowResponsePanel(false)
      loadRandomVoice()
    } catch {
      console.error('Response failed')
    }
  }, [currentVoice, anonymousId, addConnection, setShowResponsePanel, loadRandomVoice])

  const formatTime = (isoString: string) => {
    const d = new Date(isoString)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}小时前`
    return `${Math.floor(hours / 24)}天前`
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-ocean-300 via-ocean-600 to-ocean-900 overflow-hidden">
      <WaveBackground />

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-8 pb-32">
        <header className="text-center mb-8">
          <h1 className="font-display text-4xl text-ocean-50 drop-shadow-[0_2px_10px_rgba(125,211,252,0.3)]">
            回声驿站
          </h1>
          <p className="font-body text-ocean-200/60 text-sm mt-1">匿名语音漂流，倾听远方的回声</p>
        </header>

        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowConnectionList(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ocean-800/30 backdrop-blur-sm border border-ocean-400/20 text-ocean-200 text-xs font-body hover:bg-ocean-700/30 hover:border-ocean-300/30 transition-all"
          >
            <Link2 className="w-3.5 h-3.5" />
            回声连接
            {connections.length > 0 && (
              <span className="ml-0.5 w-4 h-4 rounded-full bg-ocean-400/30 text-ocean-100 text-[10px] flex items-center justify-center">
                {connections.length}
              </span>
            )}
          </button>
        </div>

        <div className="relative">
          <div className={`
            bg-ocean-800/20 backdrop-blur-xl border border-ocean-300/20 rounded-2xl p-6
            shadow-[0_8px_32px_rgba(0,0,0,0.2)]
            transition-all duration-500
            ${isPlaying ? 'shadow-[0_8px_40px_rgba(125,211,252,0.15)] border-ocean-300/30' : ''}
          `}>
            {isLoading ? (
              <div className="flex flex-col items-center py-12">
                <Radio className="w-8 h-8 text-ocean-300/50 animate-pulse mb-3" />
                <p className="text-ocean-300/50 font-body text-sm">正在从漂流海拾取...</p>
              </div>
            ) : currentVoice ? (
              <>
                <div className="text-center mb-5">
                  <p className="font-display text-ocean-100 text-xl mb-1">
                    {currentVoice.blur_title}
                  </p>
                  <p className="text-ocean-300/50 font-body text-xs">
                    {formatTime(currentVoice.created_at)}
                  </p>
                </div>

                <div className="flex justify-center mb-5">
                  <div className="relative w-40 h-40">
                    <canvas
                      ref={canvasRef}
                      width={160}
                      height={160}
                      className="absolute inset-0 w-full h-full"
                    />
                    <button
                      onClick={handlePlay}
                      className={`
                        absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-14 h-14 rounded-full flex items-center justify-center z-10
                        transition-all duration-300
                        ${isPlaying
                          ? 'bg-ocean-300/30 backdrop-blur-sm animate-glow-pulse'
                          : 'bg-ocean-300/20 backdrop-blur-sm hover:bg-ocean-300/30 hover:shadow-[0_0_30px_rgba(125,211,252,0.5)]'
                        }
                      `}
                    >
                      {isPlaying ? (
                        <Pause className="w-6 h-6 text-ocean-50 fill-ocean-50" />
                      ) : (
                        <Play className="w-6 h-6 text-ocean-50 fill-ocean-50 ml-0.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowResponsePanel(true)}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-ocean-400/80 to-ocean-500/80 text-white font-body text-sm backdrop-blur-sm hover:from-ocean-400 hover:to-ocean-500 shadow-[0_0_20px_rgba(56,189,248,0.2)] hover:shadow-[0_0_30px_rgba(56,189,248,0.4)] transition-all"
                  >
                    <Heart className="w-4 h-4" />
                    回应
                  </button>
                  <button
                    onClick={handleRelease}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-ocean-800/30 backdrop-blur-sm border border-ocean-400/20 text-ocean-200 font-body text-sm hover:bg-ocean-700/30 hover:border-ocean-300/30 transition-all"
                  >
                    <Wind className="w-4 h-4" />
                    放生
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center py-12">
                <Radio className="w-8 h-8 text-ocean-300/50 mb-3" />
                <p className="text-ocean-300/50 font-body text-sm">漂流海空空如也</p>
                <p className="text-ocean-300/30 font-body text-xs mt-1">投一条语音来开启漂流吧</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center mt-8">
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-ocean-300/20 backdrop-blur-sm flex items-center justify-center animate-pulse">
                <Radio className="w-5 h-5 text-ocean-300" />
              </div>
              <p className="text-ocean-200/60 text-xs font-body">正在投递到漂流海...</p>
            </div>
          ) : (
            <VoiceRecorder onRecordingComplete={handleRecordingComplete} maxDuration={30} />
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-ocean-400/30 font-body text-[10px]">
            匿名ID: {anonymousId.slice(0, 12)}...
          </p>
        </div>
      </div>

      {showResponsePanel && currentVoice && (
        <ResponsePanel
          onSubmit={handleResponse}
          onClose={() => setShowResponsePanel(false)}
        />
      )}

      {showConnectionList && (
        <ConnectionList
          connections={connections}
          userId={anonymousId}
          onClose={() => setShowConnectionList(false)}
        />
      )}
    </div>
  )
}
