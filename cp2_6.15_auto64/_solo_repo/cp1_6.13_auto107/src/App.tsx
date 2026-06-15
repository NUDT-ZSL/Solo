import React, { useEffect, useState, useRef } from 'react'
import { Waves, Settings, Maximize2 } from 'lucide-react'
import AudioController from './components/AudioController'
import Visualizer from './components/Visualizer'
import Playlist from './components/Playlist'
import { useAudioStore } from './store/audioStore'
import { useAudioEngine } from './hooks/useAudioEngine'

const App: React.FC = () => {
  const { tracks, reverb, isPlaying, selectedTrackId, loadFromStorage, updateTrack, setPlaying, setCurrentTime } = useAudioStore()
  const engine = useAudioEngine()
  const [freqData, setFreqData] = useState({ low: 0, mid: 0, high: 0 })
  const rafRef = useRef<number>(0)
  const engineRef = useRef(engine)
  engineRef.current = engine

  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  useEffect(() => {
    const stored = engineRef.current
    if (!stored) return
    stored.updateReverb(reverb)
  }, [reverb])

  useEffect(() => {
    tracks.forEach((track) => {
      engineRef.current.updateTrackParams(track.id, {
        volume: track.volume,
        pan: track.pan,
        lowPass: track.lowPass,
        highPass: track.highPass,
        muted: track.muted,
      })
      if (track.audioUrl) {
        engineRef.current.loadTrack(track.id, track.audioUrl).catch(() => {})
      }
    })
  }, [tracks])

  useEffect(() => {
    const loop = () => {
      const fd = engineRef.current.getFrequencyData()
      setFreqData(fd)
      if (isPlaying) {
        setCurrentTime(engineRef.current.getCurrentTime())
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isPlaying, setCurrentTime])

  const handlePlayToggle = async () => {
    if (isPlaying) {
      engine.stop()
      setPlaying(false)
    } else {
      await engine.start()
      setPlaying(true)
    }
  }

  return (
    <div className="w-full h-full flex flex-col bg-primary overflow-hidden">
      <header className="flex items-center justify-between px-5 py-3 bg-primary border-b border-surface-light">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-accent/50 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)]">
            <Waves size={18} className="text-white" />
          </div>
          <div>
            <div className="text-base font-bold text-white tracking-wide">WavStudio</div>
            <div className="text-[11px] text-slate-400">多轨音频混音与可视化</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePlayToggle}
            className={`btn-ripple px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all
              ${isPlaying
                ? 'bg-gradient-to-r from-accent to-accent2 text-white shadow-[0_0_24px_rgba(139,92,246,0.5)]'
                : 'bg-surface-light text-slate-200 hover:bg-accent/30 hover:text-accent2'
              }`}
          >
            {isPlaying ? '■ 停止' : '▶ 开始'}
          </button>
          <button className="btn-ripple w-9 h-9 rounded-xl bg-surface-light text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors">
            <Settings size={16} />
          </button>
          <button className="btn-ripple w-9 h-9 rounded-xl bg-surface-light text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors">
            <Maximize2 size={16} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden
        flex-col lg:flex-row
      ">
        <aside
          className="border-b lg:border-b-0 lg:border-r border-surface-light overflow-hidden"
          style={{ width: '100%', maxWidth: '100%', height: '50%', minHeight: '320px' }}
        >
          <div
            className="w-full h-full"
            style={{ maxWidth: '100%' }}
          >
            <div className="lg:hidden w-full h-12 bg-surface flex items-center px-4 border-b border-surface-light">
              <span className="text-sm font-medium text-slate-300">音轨列表</span>
            </div>
            <div className="w-full h-full lg:h-full" style={{ width: '100%' }}>
              <div className="lg:w-[480px] h-full">
                <Playlist />
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col bg-primary relative" style={{ minWidth: 0 }}>
          <div className="hidden lg:block absolute top-0 left-0 w-[2px] h-full bg-gradient-to-b from-transparent via-accent/30 to-transparent opacity-50 pointer-events-none" />

          <div className="lg:hidden h-10 flex items-center px-4 bg-surface border-b border-surface-light">
            <span className="text-sm font-medium text-slate-300">可视化</span>
          </div>

          <div className="flex-1 relative overflow-hidden">
            <Visualizer freqData={freqData} />

            <div className="absolute top-4 right-4 flex gap-3 text-[11px] font-mono">
              <div className="px-3 py-1.5 rounded-lg bg-surface/80 backdrop-blur-sm border border-surface-light">
                <span className="text-slate-400">LOW </span>
                <span className="text-accent2 font-semibold">{Math.round(freqData.low * 100)}</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-surface/80 backdrop-blur-sm border border-surface-light">
                <span className="text-slate-400">MID </span>
                <span className="text-pink-400 font-semibold">{Math.round(freqData.mid * 100)}</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-surface/80 backdrop-blur-sm border border-surface-light">
                <span className="text-slate-400">HIGH </span>
                <span className="text-cyan-400 font-semibold">{Math.round(freqData.high * 100)}</span>
              </div>
            </div>

            <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-surface/70 backdrop-blur-sm border border-surface-light">
              <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
              <span className="text-xs text-slate-300">{isPlaying ? '播放中' : '已停止'}</span>
              {reverb.enabled && (
                <>
                  <div className="w-px h-4 bg-surface-light" />
                  <span className="text-xs text-accent2">混响 {reverb.roomSize.toUpperCase()} {Math.round(reverb.wet * 100)}%</span>
                </>
              )}
              {selectedTrackId && (
                <>
                  <div className="w-px h-4 bg-surface-light" />
                  <span className="text-xs text-slate-400">
                    {tracks.find(t => t.id === selectedTrackId)?.name || ''}
                  </span>
                </>
              )}
            </div>
          </div>

          <AudioController />
        </main>
      </div>
    </div>
  )
}

export default App
