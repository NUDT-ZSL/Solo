import React, { useState, useCallback, useRef } from 'react'
import AudioPlayer, { Track } from './components/AudioPlayer'
import Visualizer from './components/Visualizer'
import ParticleField from './components/ParticleField'
import GestureControls from './components/GestureControls'
import './App.css'

const App: React.FC = () => {
  const frequencyDataRef = useRef<Uint8Array>(new Uint8Array(128))
  const [playlist, setPlaylist] = useState<Track[]>([])
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.7)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [gestureName, setGestureName] = useState('')
  const [showGestureLabel, setShowGestureLabel] = useState(false)
  const gestureTimerRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFrequencyData = useCallback((data: Uint8Array) => {
    frequencyDataRef.current = data
  }, [])

  const handleTimeUpdate = useCallback((time: number, dur: number) => {
    setCurrentTime(time)
    setDuration(dur)
  }, [])

  const handlePlayStateChange = useCallback((playing: boolean) => {
    setIsPlaying(playing)
  }, [])

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '00:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(Math.max(0, Math.min(1, newVolume)))
  }, [])

  const handleFilesSelected = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return

      const newTracks: Track[] = []

      Array.from(files).forEach((file) => {
        if (file.type.startsWith('audio/') || /\.(mp3|wav|ogg)$/i.test(file.name)) {
          const url = URL.createObjectURL(file)
          const track: Track = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            file,
            url,
            duration: 0,
          }
          newTracks.push(track)
        }
      })

      setPlaylist((prev) => {
        const updated = [...prev, ...newTracks]
        return updated
      })

      if (!currentTrack && newTracks.length > 0) {
        setCurrentTrack(newTracks[0])
        setIsPlaying(true)
      }
    },
    [currentTrack]
  )

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFilesSelected(e.target.files)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [handleFilesSelected]
  )

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleGesture = useCallback(
    (gesture: string) => {
      setGestureName(gesture)
      setShowGestureLabel(true)

      if (gestureTimerRef.current) {
        clearTimeout(gestureTimerRef.current)
      }

      gestureTimerRef.current = window.setTimeout(() => {
        setShowGestureLabel(false)
      }, 2000)

      switch (gesture) {
        case 'fist':
          setIsPlaying((prev) => !prev)
          break
        case 'swipe-left':
          if (playlist.length > 0) {
            const currentIndex = playlist.findIndex((t) => t.id === currentTrack?.id)
            const prevIndex =
              currentIndex === -1 ? 0 : (currentIndex - 1 + playlist.length) % playlist.length
            setCurrentTrack(playlist[prevIndex])
            setIsPlaying(true)
          }
          break
        case 'swipe-right':
          if (playlist.length > 0) {
            const currentIndex = playlist.findIndex((t) => t.id === currentTrack?.id)
            const nextIndex = (currentIndex + 1) % playlist.length
            setCurrentTrack(playlist[nextIndex])
            setIsPlaying(true)
          }
          break
        case 'volume-up':
          setVolume((prev) => Math.min(1, prev + 0.05))
          break
        case 'volume-down':
          setVolume((prev) => Math.max(0, prev - 0.05))
          break
      }
    },
    [playlist, currentTrack]
  )

  const handleSelectTrack = useCallback((track: Track) => {
    setCurrentTrack(track)
    setIsPlaying(true)
  }, [])

  const handlePlaylistReorder = useCallback((newPlaylist: Track[]) => {
    setPlaylist(newPlaylist)
  }, [])

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!duration || !currentTrack) return
      const rect = e.currentTarget.getBoundingClientRect()
      const percent = (e.clientX - rect.left) / rect.width
      const audio = document.querySelector('audio')
      if (audio) {
        audio.currentTime = percent * duration
      }
    },
    [duration, currentTrack]
  )

  const handleVolumeSlider = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const percent = 1 - (e.clientY - rect.top) / rect.height
      setVolume(Math.max(0, Math.min(1, percent)))
    },
    []
  )

  const hasSongs = playlist.length > 0

  return (
    <div className="app-container">
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.wav,.ogg,audio/*"
        multiple
        onChange={handleFileInputChange}
        className="global-file-input"
      />

      <div className="logo">WaveSync</div>

      {!hasSongs && (
        <div className="welcome-overlay">
          <div className="welcome-content">
            <button className="central-upload-btn" onClick={handleUploadClick}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <h2 className="welcome-title">上传音乐开始体验</h2>
            <p className="welcome-subtitle">支持 MP3、WAV、OGG 格式</p>
          </div>
        </div>
      )}

      <div className={`main-content ${!hasSongs ? 'dimmed' : ''}`}>
        <div className="playlist-sidebar">
          <AudioPlayer
            frequencyDataRef={frequencyDataRef}
            onTimeUpdate={handleTimeUpdate}
            onPlayStateChange={handlePlayStateChange}
            volume={volume}
            isPlaying={isPlaying}
            currentTrack={currentTrack}
            playlist={playlist}
            onPlaylistChange={handlePlaylistReorder}
            onCurrentTrackChange={setCurrentTrack}
            onVolumeChange={handleVolumeChange}
            onIsPlayingChange={setIsPlaying}
            onSelectTrack={handleSelectTrack}
            onUploadClick={handleUploadClick}
          />
        </div>

        <div className="visualization-area">
          <div className="particle-section">
            <ParticleField frequencyDataRef={frequencyDataRef} />
          </div>
          <div className="visualizer-section">
            <Visualizer frequencyDataRef={frequencyDataRef} />
          </div>
        </div>
      </div>

      <div className="bottom-controls">
        <div className="song-info">
          <div className="song-title">{currentTrack?.name || '未选择歌曲'}</div>
          {currentTrack && (
            <div className="song-artist">WaveSync Music</div>
          )}
        </div>

        <div className="playback-controls">
          <button
            className="control-btn prev-btn"
            onClick={() => {
              if (playlist.length === 0) return
              const currentIndex = playlist.findIndex((t) => t.id === currentTrack?.id)
              const prevIndex =
                currentIndex === -1 ? 0 : (currentIndex - 1 + playlist.length) % playlist.length
              setCurrentTrack(playlist[prevIndex])
              setIsPlaying(true)
            }}
            disabled={!currentTrack}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          <button
            className="control-btn play-btn"
            onClick={() => {
              if (!currentTrack) {
                handleUploadClick()
              } else {
                setIsPlaying(!isPlaying)
              }
            }}
          >
            {!currentTrack ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            ) : isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            className="control-btn next-btn"
            onClick={() => {
              if (playlist.length === 0) return
              const currentIndex = playlist.findIndex((t) => t.id === currentTrack?.id)
              const nextIndex = (currentIndex + 1) % playlist.length
              setCurrentTrack(playlist[nextIndex])
              setIsPlaying(true)
            }}
            disabled={!currentTrack}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </div>

        <div className="progress-section">
          <span className="time-text">{formatTime(currentTime)}</span>
          <div className="progress-bar" onClick={handleProgressClick}>
            <div
              className="progress-fill"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
            <div
              className="progress-thumb"
              style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          <span className="time-text">{formatTime(duration)}</span>
        </div>

        <div className="volume-section">
          <div className="volume-percentage">{Math.round(volume * 100)}%</div>
          <div className="volume-slider" onClick={handleVolumeSlider}>
            <div className="volume-fill" style={{ height: `${volume * 100}%` }} />
            <div
              className="volume-thumb"
              style={{ bottom: `calc(${volume * 100}% - 8px)` }}
            />
          </div>
        </div>
      </div>

      {showGestureLabel && (
        <div className="gesture-label">
          {gestureName === 'fist' && '✊ 握拳 - 播放/暂停'}
          {gestureName === 'swipe-left' && '👈 向左滑 - 上一首'}
          {gestureName === 'swipe-right' && '👉 向右滑 - 下一首'}
          {gestureName === 'volume-up' && '☝️ 食指上移 - 音量增加'}
          {gestureName === 'volume-down' && '👇 食指下移 - 音量减少'}
        </div>
      )}

      <GestureControls onGesture={handleGesture} />
    </div>
  )
}

export default App
