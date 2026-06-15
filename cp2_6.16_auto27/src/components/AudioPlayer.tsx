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

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  frequencyDataRef,
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
  const frequencyBufferRef = useRef<Uint8Array | null>(null)

  const initAudioContext = useCallback(() => {
    if (!audioRef.current || audioContextRef.current) return

    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    const audioContext = new AudioContext()
    const analyser = audioContext.createAnalyser()
    const gainNode = audioContext.createGain()

    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.8

    const source = audioContext.createMediaElementSource(audioRef.current)
    source.connect(analyser)
    analyser.connect(gainNode)
    gainNode.connect(audioContext.destination)

    audioContextRef.current = audioContext
    analyserRef.current = analyser
    sourceRef.current = source
    gainNodeRef.current = gainNode

    frequencyBufferRef.current = new Uint8Array(analyser.frequencyBinCount)
  }, [])

  const analyze = useCallback(() => {
    if (!analyserRef.current || !frequencyBufferRef.current) return

    analyserRef.current.getByteFrequencyData(frequencyBufferRef.current as any)

    if (frequencyDataRef.current && frequencyBufferRef.current) {
      for (let i = 0; i < frequencyBufferRef.current.length; i++) {
        frequencyDataRef.current[i] = frequencyBufferRef.current[i]
      }
    }

    animationFrameRef.current = requestAnimationFrame(analyze)
  }, [frequencyDataRef])

  useEffect(() => {
    if (isPlaying) {
      initAudioContext()
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume()
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
      }
    }
  }, [isPlaying, analyze, initAudioContext])

  useEffect(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setValueAtTime(volume, audioContextRef.current.currentTime)
    }
  }, [volume])

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

  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault()
      if (dragIndex === null || dragIndex === dropIndex) {
        setDragIndex(null)
        setDragOverIndex(null)
        return
      }

      const newPlaylist = [...playlist]
      const [draggedItem] = newPlaylist.splice(dragIndex, 1)
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
                }`}
                onClick={() => handleSelectTrack(track)}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
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
