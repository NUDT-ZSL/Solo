import React, { useState, useEffect, useRef, useCallback } from 'react'
import { EP, Track } from './types'
import { moodTagColors } from './data'

interface TimelineProps {
  eps: EP[]
  selectedEpId: string | null
  onSelectEp: (epId: string | null) => void
  currentTrackId: string | null
  currentPlayingEpId: string | null
  onPlayTrack: (epId: string, trackId: string) => void
  progress: number
  displayLyrics: string
  isPlaying: boolean
  onTagClick: (tag: string) => void
  activeMoodTag: string | null
  progressBarColor: string | null
  autoPlayProgress: number
  isAutoPlaying: boolean
  onToggleAutoPlay: () => void
}

const PlayIcon = () => (
  <svg className="play-icon" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
)

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const createRipple = (e: React.MouseEvent<HTMLElement>) => {
  const element = e.currentTarget
  const ripple = document.createElement('span')
  const rect = element.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  const x = e.clientX - rect.left - size / 2
  const y = e.clientY - rect.top - size / 2

  ripple.style.width = ripple.style.height = `${size}px`
  ripple.style.left = `${x}px`
  ripple.style.top = `${y}px`
  ripple.className = 'ripple'

  element.appendChild(ripple)

  setTimeout(() => {
    ripple.remove()
  }, 600)
}

const Timeline: React.FC<TimelineProps> = ({
  eps,
  selectedEpId,
  onSelectEp,
  currentTrackId,
  currentPlayingEpId,
  onPlayTrack,
  progress,
  displayLyrics,
  isPlaying,
  onTagClick,
  activeMoodTag,
  progressBarColor,
  autoPlayProgress,
  isAutoPlaying,
  onToggleAutoPlay
}) => {
  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set())
  const horizontalRef = useRef<HTMLDivElement>(null)
  const verticalRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const isScrollingRef = useRef(false)

  useEffect(() => {
    const timers: NodeJS.Timeout[] = []
    eps.forEach((ep, index) => {
      const timer = setTimeout(() => {
        setVisibleCards(prev => new Set(prev).add(ep.id))
      }, index * 150)
      timers.push(timer)
    })
    return () => timers.forEach(clearTimeout)
  }, [eps])

  useEffect(() => {
    const CARD_STEP = 280
    const isMobile = window.innerWidth < 768
    const container = isMobile ? verticalRef.current : horizontalRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      if (selectedEpId) return

      e.preventDefault()

      if (isScrollingRef.current) return
      isScrollingRef.current = true

      const delta = e.deltaY > 0 ? CARD_STEP : -CARD_STEP

      if (isMobile) {
        const targetScroll = container.scrollTop + delta
        container.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        })
      } else {
        const targetScroll = container.scrollLeft + delta
        container.scrollTo({
          left: targetScroll,
          behavior: 'smooth'
        })
      }

      setTimeout(() => {
        isScrollingRef.current = false
      }, 300)
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [selectedEpId])

  const handleCardClick = useCallback((e: React.MouseEvent<HTMLDivElement>, epId: string) => {
    e.stopPropagation()
    if (selectedEpId !== epId) {
      onSelectEp(epId)
    }
  }, [selectedEpId, onSelectEp])

  const handleTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>, epId: string, trackId: string) => {
    e.stopPropagation()
    createRipple(e)
    onPlayTrack(epId, trackId)
  }, [onPlayTrack])

  const handleTagClick = useCallback((e: React.MouseEvent<HTMLSpanElement>, tag: string) => {
    e.stopPropagation()
    createRipple(e)
    onTagClick(tag)
  }, [onTagClick])

  const handleCloseClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    createRipple(e)
    onSelectEp(null)
  }, [onSelectEp])

  const getComplementaryColor = (hexColor: string): string => {
    const r = parseInt(hexColor.slice(1, 3), 16)
    const g = parseInt(hexColor.slice(3, 5), 16)
    const b = parseInt(hexColor.slice(5, 7), 16)
    return `#${(255 - r).toString(16).padStart(2, '0')}${(255 - g).toString(16).padStart(2, '0')}${(255 - b).toString(16).padStart(2, '0')}`
  }

  const lightenColor = (hexColor: string, percent: number): string => {
    const num = parseInt(hexColor.slice(1), 16)
    const amt = Math.round(2.55 * percent)
    const R = Math.min(255, (num >> 16) + amt)
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt)
    const B = Math.min(255, (num & 0x0000FF) + amt)
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`
  }

  const renderCard = (ep: EP) => {
    const isSelected = selectedEpId === ep.id
    const isBlurred = selectedEpId !== null && !isSelected
    const isVisible = visibleCards.has(ep.id)
    const isCurrentPlayingEp = currentPlayingEpId === ep.id
    const showProgress = isCurrentPlayingEp && (isPlaying || progress >= 100)

    const cardStyle: React.CSSProperties = {
      background: `linear-gradient(135deg, ${ep.coverColor.primary} 0%, ${ep.coverColor.secondary} 100%)`,
      '--card-text': ep.coverColor.text
    } as React.CSSProperties

    const wrapperClasses = [
      'ep-card-wrapper',
      isVisible ? 'visible' : '',
      activeMoodTag && !ep.moodTags.includes(activeMoodTag) ? 'filtered-out' : ''
    ].filter(Boolean).join(' ')

    const cardClasses = [
      'ep-card',
      isSelected ? 'expanded' : '',
      isBlurred ? 'blurred' : ''
    ].filter(Boolean).join(' ')

    const selectedTrack = ep.tracks.find(t => t.id === currentTrackId)

    const progressFillStyle: React.CSSProperties = {
      width: `${showProgress ? progress : 0}%`,
      background: progressBarColor
        ? `linear-gradient(90deg, ${progressBarColor}, ${lightenColor(progressBarColor, 30)})`
        : `linear-gradient(90deg, #8E44AD, #F1C40F)`
    }

    return (
      <div
        key={ep.id}
        className={wrapperClasses}
        ref={el => {
          if (el) cardRefs.current.set(ep.id, el)
        }}
      >
        <div
          className={cardClasses}
          style={cardStyle}
          onClick={(e) => handleCardClick(e, ep.id)}
        >
          {isSelected && (
            <button
              className="close-btn"
              onClick={handleCloseClick}
              aria-label="关闭"
            >
              ×
            </button>
          )}

          <div className="ep-card-header">
            <div className="year-badge">{ep.year}</div>
            <h3 className="ep-title">{ep.title}</h3>
            <div className="ep-date">{ep.releaseDate}</div>
          </div>

          <div className="ep-card-body">
            <p className="ep-description">{ep.description}</p>
            <div className="ep-tags">
              {ep.moodTags.slice(0, 5).map(tag => {
                const isTagActive = activeMoodTag === tag
                const tagColor = moodTagColors[tag] || getComplementaryColor(ep.coverColor.primary)
                return (
                  <span
                    key={tag}
                    className={`mood-tag ${isTagActive ? 'active' : ''}`}
                    style={{
                      backgroundColor: isTagActive ? tagColor : tagColor,
                      color: '#1A1A2E',
                      boxShadow: isTagActive ? `0 0 10px ${tagColor}, 0 0 20px ${tagColor}` : 'none',
                      border: isTagActive ? `2px solid #ffffff` : '2px solid transparent',
                      transform: isTagActive ? 'scale(1.1)' : 'scale(1)'
                    }}
                    onClick={(e) => handleTagClick(e, tag)}
                  >
                    {tag}
                  </span>
                )
              })}
            </div>
          </div>

          <div className="ep-expanded-content">
            <div className="track-list">
              {ep.tracks.map((track: Track, trackIndex: number) => (
                <div
                  key={track.id}
                  className={`track-item ${currentTrackId === track.id ? 'active' : ''}`}
                  onClick={(e) => handleTrackClick(e, ep.id, track.id)}
                >
                  <div className="track-number">{trackIndex + 1}</div>
                  <div className="track-info">
                    <div className="track-title">{track.title}</div>
                    <div className="track-duration">{formatDuration(track.duration)}</div>
                  </div>
                  <PlayIcon />
                </div>
              ))}
            </div>

            <div className="progress-container">
              <div
                className="progress-bar"
                onClick={(e) => {
                  e.stopPropagation()
                  if (selectedTrack) {
                    onPlayTrack(ep.id, selectedTrack.id)
                  }
                }}
              >
                <div
                  className="progress-fill"
                  style={progressFillStyle}
                />
              </div>
            </div>

            <div className="lyrics-display">
              {displayLyrics}
              {isPlaying && <span className="cursor" />}
            </div>

            <div className="auto-play-section">
              <button
                className="auto-play-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  createRipple(e)
                  onToggleAutoPlay()
                }}
                aria-label={isAutoPlaying ? '暂停' : '播放'}
              >
                {isAutoPlaying ? (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <div className="auto-progress-bar">
                <div
                  className="auto-progress-fill"
                  style={{
                    width: `${autoPlayProgress}%`,
                    background: `linear-gradient(90deg, ${ep.coverColor.primary}, ${lightenColor(ep.coverColor.primary, 40)})`
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (eps.length === 0) {
    return (
      <div className="timeline-container">
        <div className="empty-state">
          <div className="empty-state-icon">🎵</div>
          <div className="empty-state-text">没有找到匹配的EP</div>
        </div>
      </div>
    )
  }

  return (
    <div className="timeline-container">
      <div className="timeline-horizontal" ref={horizontalRef}>
        <div className="timeline-line" />
        {eps.map((ep) => renderCard(ep))}
      </div>

      <div className="timeline-vertical" ref={verticalRef}>
        <div className="timeline-line-vertical" />
        {eps.map((ep) => renderCard(ep))}
      </div>

      <div
        className={`overlay ${selectedEpId ? 'active' : ''}`}
        onClick={() => onSelectEp(null)}
      />
    </div>
  )
}

export default Timeline
