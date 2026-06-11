import { useCallback, useState, useRef } from 'react'
import { usePlayerStore } from '@/store/playerStore'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
  ChevronUp,
  ChevronDown,
  Music,
} from 'lucide-react'

interface PlayerProps {
  togglePlay: () => void
  next: () => void
  prev: () => void
  seek: (time: number) => void
  setVolume: (vol: number) => void
  getFrequencyData: () => Uint8Array
  isMobileExpanded: boolean
  setIsMobileExpanded: (v: boolean) => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function Player({
  togglePlay,
  next,
  prev,
  seek,
  setVolume,
  getFrequencyData,
  isMobileExpanded,
  setIsMobileExpanded,
}: PlayerProps) {
  const currentSongIndex = usePlayerStore((s) => s.currentSongIndex)
  const playlist = usePlayerStore((s) => s.playlist)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const volume = usePlayerStore((s) => s.volume)

  const song = playlist[currentSongIndex]
  const progress = song ? (currentTime / song.duration) * 100 : 0
  const [isHoveringCover, setIsHoveringCover] = useState(false)
  const progressRef = useRef<HTMLDivElement>(null)
  const volumeRef = useRef<HTMLDivElement>(null)

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      if (song) seek(ratio * song.duration)
    },
    [seek, song]
  )

  const handleVolumeClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      setVolume(ratio)
    },
    [setVolume]
  )

  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2
  const coverUrl = song?.coverUrl || ''

  return (
    <>
      <div className="player-main">
        <div className="player-cover-section">
          <div
            className={`cover-3d-container ${isPlaying ? 'spinning' : ''} ${isHoveringCover ? 'hovered' : ''}`}
            onMouseEnter={() => setIsHoveringCover(true)}
            onMouseLeave={() => setIsHoveringCover(false)}
          >
            <div className="cover-3d-card">
              <img src={coverUrl} alt={song?.title} className="cover-image" />
            </div>
            {isHoveringCover && (
              <div className="cover-detail-overlay">
                <h3 className="cover-detail-title">{song?.title}</h3>
                <p className="cover-detail-artist">{song?.artist}</p>
                <p className="cover-detail-album">{song?.album}</p>
              </div>
            )}
          </div>
        </div>

        <div className="player-info">
          <h2 className="player-song-title">{song?.title}</h2>
          <p className="player-song-artist">{song?.artist}</p>
        </div>

        <div className="player-progress-section">
          <div className="progress-bar-container" ref={progressRef} onClick={handleProgressClick}>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              <div className="progress-bar-thumb" style={{ left: `${progress}%` }} />
            </div>
          </div>
          <div className="progress-time">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(song?.duration || 0)}</span>
          </div>
        </div>

        <div className="player-controls">
          <button className="control-btn" onClick={prev} title="上一首">
            <SkipBack size={20} />
          </button>
          <button className="control-btn play-btn" onClick={togglePlay} title={isPlaying ? '暂停' : '播放'}>
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>
          <button className="control-btn" onClick={next} title="下一首">
            <SkipForward size={20} />
          </button>
        </div>

        <div className="player-volume-section">
          <VolumeIcon size={18} className="volume-icon" onClick={() => setVolume(volume === 0 ? 0.7 : 0)} />
          <div className="volume-bar-container" ref={volumeRef} onClick={handleVolumeClick}>
            <div className="volume-bar-track">
              <div className="volume-bar-fill" style={{ width: `${volume * 100}%` }} />
              <div className="volume-bar-thumb" style={{ left: `${volume * 100}%` }} />
            </div>
          </div>
          <span className="volume-label">{Math.round(volume * 100)}%</span>
        </div>
      </div>

      <div
        className={`mobile-mini-player ${isMobileExpanded ? 'hidden' : ''}`}
        onClick={() => setIsMobileExpanded(true)}
      >
        <img src={coverUrl} alt={song?.title} className="mini-cover" />
        <div className="mini-info">
          <span className="mini-title">{song?.title}</span>
          <span className="mini-artist">{song?.artist}</span>
        </div>
        <button
          className="mini-play-btn"
          onClick={(e) => {
            e.stopPropagation()
            togglePlay()
          }}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button
          className="mini-expand-btn"
          onClick={(e) => {
            e.stopPropagation()
            setIsMobileExpanded(true)
          }}
        >
          <ChevronUp size={20} />
        </button>
      </div>

      <div className={`mobile-fullscreen ${isMobileExpanded ? 'visible' : ''}`}>
        <div className="mobile-fullscreen-header">
          <button className="mobile-collapse-btn" onClick={() => setIsMobileExpanded(false)}>
            <ChevronDown size={24} />
          </button>
          <span>正在播放</span>
        </div>
        <div className="mobile-fullscreen-cover">
          <div className={`cover-3d-container mobile ${isPlaying ? 'spinning' : ''}`}>
            <div className="cover-3d-card">
              <img src={coverUrl} alt={song?.title} className="cover-image" />
            </div>
          </div>
          <div className="player-info mobile-info">
            <h2 className="player-song-title">{song?.title}</h2>
            <p className="player-song-artist">{song?.artist}</p>
          </div>
        </div>
        <div className="mobile-fullscreen-controls">
          <div className="player-progress-section">
            <div className="progress-bar-container" ref={progressRef} onClick={handleProgressClick}>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                <div className="progress-bar-thumb" style={{ left: `${progress}%` }} />
              </div>
            </div>
            <div className="progress-time">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(song?.duration || 0)}</span>
            </div>
          </div>
          <div className="player-controls">
            <button className="control-btn" onClick={prev}>
              <SkipBack size={20} />
            </button>
            <button className="control-btn play-btn" onClick={togglePlay}>
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
            <button className="control-btn" onClick={next}>
              <SkipForward size={20} />
            </button>
          </div>
          <div className="player-volume-section mobile-volume">
            <VolumeIcon size={18} className="volume-icon" onClick={() => setVolume(volume === 0 ? 0.7 : 0)} />
            <div className="volume-bar-container" onClick={handleVolumeClick}>
              <div className="volume-bar-track">
                <div className="volume-bar-fill" style={{ width: `${volume * 100}%` }} />
                <div className="volume-bar-thumb" style={{ left: `${volume * 100}%` }} />
              </div>
            </div>
            <span className="volume-label">{Math.round(volume * 100)}%</span>
          </div>
        </div>
      </div>

      {!isMobileExpanded && (
        <div className="mobile-placeholder">
          <Music size={48} className="placeholder-icon" />
        </div>
      )}
    </>
  )
}
