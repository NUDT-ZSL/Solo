import React, { useRef, useState, useEffect, useCallback } from 'react'
import './AudioPlayer.css'

export interface Track {
  id: string
  name: string
  file: File
  url: string
  duration: number
}

interface AudioPlayerProps {
  frequencyDataRef: React.MutableRefObject<Uint8Array>
  frequencyVersionRef: React.MutableRefObject<number>
  onTrackChange?: (track: Track | null) => void
  onTimeUpdate: (currentTime: number, duration: number) => void
  onPlayStateChange: (isPlaying: boolean) => void
  volume: number
  isPlaying: boolean
  currentTrack: Track | null
  playlist: Track[]
  onPlaylistChange: (playlist: Track[]) => void
  onCurrentTrackChange: (track: Track | null) => void
  onVolumeChange: (volume: number) => void
  onIsPlayingChange: (isPlaying: boolean) => void
  onSelectTrack?: (track: Track) => void
  onUploadClick?: () => void
}

const FFT_SIZE = 256
const FREQUENCY_BIN_COUNT = FFT_SIZE / 2

type WebAudioAnalyser = {
  getByteFrequencyData(array: Uint8Array): void
  fftSize: number
  frequencyBinCount: number
  smoothingTimeConstant: number
  connect(destination: AudioNode): void
  disconnect(): void
}

function isAnalyserNode(node: unknown): node is AnalyserNode {
  return (
    typeof node === 'object' &&
    node !== null &&
    'getByteFrequencyData' in node &&
    typeof (node as AnalyserNode).getByteFrequencyData === 'function'
  )
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  frequencyDataRef,
  frequencyVersionRef,
  volume,
  isPlaying,
  currentTrack,
  playlist,
  onPlaylistChange,
  onCurrentTrackChange,
  onIsPlayingChange,
  onTimeUpdate,
  onSelectTrack,
  onUploadClick,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const buffer0Ref = useRef<Uint8Array | null>(null)
  const buffer1Ref = useRef<Uint8Array | null>(null)
  const activeIndexRef = useRef<0 | 1>(0)

  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const initAudioContext = useCallback(() => {
    if (!audioRef.current || audioContextRef.current) return

    const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) {
      console.error('Web Audio API is not supported in this browser')
      return
    }

    const audioContext = new AudioContextCtor()
    const analyser = audioContext.createAnalyser()
    const gainNode = audioContext.createGain()

    analyser.fftSize = FFT_SIZE
    analyser.smoothingTimeConstant = 0.8

    const source = audioContext.createMediaElementSource(audioRef.current)
    source.connect(analyser)
    analyser.connect(gainNode)
    gainNode.connect(audioContext.destination)

    audioContextRef.current = audioContext
    analyserRef.current = analyser
    sourceRef.current = source
    gainNodeRef.current = gainNode

    buffer0Ref.current = new Uint8Array(FREQUENCY_BIN_COUNT)
    buffer1Ref.current = new Uint8Array(FREQUENCY_BIN_COUNT)
    activeIndexRef.current = 0

    if (!frequencyDataRef.current || frequencyDataRef.current.length !== FREQUENCY_BIN_COUNT) {
      frequencyDataRef.current = buffer0Ref.current
    }
  }, [frequencyDataRef])

  const analyze = useCallback(() => {
    const analyser = analyserRef.current
    const buffer0 = buffer0Ref.current
    const buffer1 = buffer1Ref.current

    if (!isAnalyserNode(analyser) || !buffer0 || !buffer1) {
      animationFrameRef.current = requestAnimationFrame(analyze)
      return
    }

    const writeIndex = (1 - activeIndexRef.current) as 0 | 1
    const writeBuffer = writeIndex === 0 ? buffer0 : buffer1

    analyser.getByteFrequencyData(writeBuffer)

    activeIndexRef.current = writeIndex
    frequencyDataRef.current = writeBuffer
    frequencyVersionRef.current += 1

    animationFrameRef.current = requestAnimationFrame(analyze)
  }, [frequencyDataRef, frequencyVersionRef])

  useEffect(() => {
    if (isPlaying) {
      initAudioContext()

      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {})
      }

      if (audioRef.current) {
        audioRef.current.play().catch(() => {})
      }

      animationFrameRef.current = requestAnimationFrame(analyze)
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [isPlaying, analyze, initAudioContext])

  useEffect(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      try {
        gainNodeRef.current.gain.setValueAtTime(volume, audioContextRef.current.currentTime)
      } catch {
      }
    }
  }, [volume])

  useEffect(() => {
    return () => {
      if (sourceRef.current) {
        try { sourceRef.current.disconnect() } catch {}
      }
      if (analyserRef.current) {
        try { analyserRef.current.disconnect() } catch {}
      }
      if (gainNodeRef.current) {
        try { gainNodeRef.current.disconnect() } catch {}
      }
      if (audioContextRef.current) {
        try { audioContextRef.current.close() } catch {}
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      onTimeUpdate(audioRef.current.currentTime, audioRef.current.duration || 0)
    }
  }, [onTimeUpdate])

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current && currentTrack) {
      const updatedPlaylist = playlist.map((t) =>
        t.id === currentTrack.id ? { ...t, duration: audioRef.current!.duration } : t
      )
      onPlaylistChange(updatedPlaylist)
    }
  }, [currentTrack, playlist, onPlaylistChange])

  const handleEnded = useCallback(() => {
    if (playlist.length > 0) {
      const currentIndex = playlist.findIndex((t) => t.id === currentTrack?.id)
      const nextIndex = (currentIndex + 1) % playlist.length
      onCurrentTrackChange(playlist[nextIndex])
      onIsPlayingChange(true)
    }
  }, [playlist, currentTrack, onCurrentTrackChange, onIsPlayingChange])

  const handleSelectTrack = useCallback(
    (track: Track) => {
      if (onSelectTrack) {
        onSelectTrack(track)
      } else {
        onCurrentTrackChange(track)
        onIsPlayingChange(true)
      }
    },
    [onSelectTrack, onCurrentTrackChange, onIsPlayingChange]
  )

  const handleDragStart = useCallback((index: number, e: React.DragEvent) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverIndex !== index) {
      setDragOverIndex(index)
    }
  }, [dragOverIndex])

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault()
      e.stopPropagation()

      const rawIndex = e.dataTransfer.getData('text/plain')
      const srcIndex = rawIndex !== '' ? parseInt(rawIndex, 10) : dragIndex

      if (srcIndex === null || isNaN(srcIndex) || srcIndex === dropIndex) {
        setDragIndex(null)
        setDragOverIndex(null)
        return
      }

      const newPlaylist = [...playlist]
      const [draggedItem] = newPlaylist.splice(srcIndex, 1)
      newPlaylist.splice(dropIndex, 0, draggedItem)

      onPlaylistChange(newPlaylist)
      setDragIndex(null)
      setDragOverIndex(null)
    },
    [playlist, dragIndex, onPlaylistChange]
  )

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
    setDragOverIndex(null)
  }, [])

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '00:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="audio-player">
      <audio
        ref={audioRef}
        src={currentTrack?.url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        crossOrigin="anonymous"
        preload="metadata"
      />

      <div className="upload-section">
        <button className="upload-btn" onClick={onUploadClick} title="添加音乐">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <div className="upload-hint">点击上传音乐</div>
      </div>

      <div className="playlist-panel">
        <div className="playlist-header">
          <span className="playlist-title">播放列表</span>
          <span className="playlist-count">{playlist.length} 首</span>
        </div>
        <div className="playlist-list">
          {playlist.length === 0 ? (
            <div className="empty-playlist">暂无歌曲</div>
          ) : (
            playlist.map((track, index) => (
              <div
                key={track.id}
                className={`playlist-item ${currentTrack?.id === track.id ? 'active' : ''} ${
                  dragOverIndex === index ? 'drag-over' : ''
                } ${dragIndex === index ? 'dragging' : ''}`}
                onClick={() => handleSelectTrack(track)}
                draggable
                onDragStart={(e) => handleDragStart(index, e)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                <div className="drag-handle" onMouseDown={(e) => e.stopPropagation()}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="9" cy="6" r="1.5" />
                    <circle cx="9" cy="12" r="1.5" />
                    <circle cx="9" cy="18" r="1.5" />
                    <circle cx="15" cy="6" r="1.5" />
                    <circle cx="15" cy="12" r="1.5" />
                    <circle cx="15" cy="18" r="1.5" />
                  </svg>
                </div>
                <div className="track-index">{index + 1}</div>
                <div className="track-info">
                  <div className="track-name">{track.name}</div>
                  <div className="track-duration">{formatTime(track.duration)}</div>
                </div>
                {currentTrack?.id === track.id && isPlaying && (
                  <div className="playing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default AudioPlayer
