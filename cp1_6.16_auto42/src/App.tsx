import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import Timeline from './Timeline'
import { epsData, moodTagColors } from './data'
import './styles.css'

const App: React.FC = () => {
  const [selectedEpId, setSelectedEpId] = useState<string | null>(null)
  const [activeMoodTag, setActiveMoodTag] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [displayLyrics, setDisplayLyrics] = useState('')

  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const typewriterIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const fullLyricsRef = useRef('')
  const lyricsIndexRef = useRef(0)

  const allMoodTags = useMemo(() => {
    const tags = new Set<string>()
    epsData.forEach(ep => ep.moodTags.forEach(tag => tags.add(tag)))
    return Array.from(tags)
  }, [])

  const filteredEps = useMemo(() => {
    return epsData.filter(ep => {
      const matchesSearch = searchQuery === '' ||
        ep.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ep.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesTag = activeMoodTag === null || ep.moodTags.includes(activeMoodTag)
      return matchesSearch && matchesTag
    })
  }, [searchQuery, activeMoodTag])

  const clearProgress = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    if (typewriterIntervalRef.current) {
      clearInterval(typewriterIntervalRef.current)
      typewriterIntervalRef.current = null
    }
  }, [])

  const startTypewriter = useCallback((lyrics: string) => {
    if (typewriterIntervalRef.current) {
      clearInterval(typewriterIntervalRef.current)
    }

    fullLyricsRef.current = lyrics
    lyricsIndexRef.current = 0
    setDisplayLyrics('')

    typewriterIntervalRef.current = setInterval(() => {
      if (lyricsIndexRef.current < fullLyricsRef.current.length) {
        setDisplayLyrics(fullLyricsRef.current.slice(0, lyricsIndexRef.current + 1))
        lyricsIndexRef.current++
      } else {
        if (typewriterIntervalRef.current) {
          clearInterval(typewriterIntervalRef.current)
          typewriterIntervalRef.current = null
        }
      }
    }, 50)
  }, [])

  const handlePlayTrack = useCallback((epId: string, trackId: string) => {
    clearProgress()

    const ep = epsData.find(e => e.id === epId)
    if (!ep) return

    const track = ep.tracks.find(t => t.id === trackId)
    if (!track) return

    setCurrentTrackId(trackId)
    setProgress(0)
    setIsPlaying(true)
    startTypewriter(track.lyricSnippet)

    const totalDuration = 5000
    const interval = 50
    const increment = (100 / totalDuration) * interval

    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current)
            progressIntervalRef.current = null
          }
          setIsPlaying(false)
          return 100
        }
        return prev + increment
      })
    }, interval)
  }, [clearProgress, startTypewriter])

  const handleSelectEp = useCallback((epId: string | null) => {
    if (epId === null) {
      clearProgress()
      setIsPlaying(false)
      setProgress(0)
      setCurrentTrackId(null)
      setDisplayLyrics('')
    }
    setSelectedEpId(epId)
  }, [clearProgress])

  const handleTagClick = useCallback((tag: string) => {
    setActiveMoodTag(prev => prev === tag ? null : tag)
  }, [])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }, [])

  const handleFilterTagClick = useCallback((tag: string) => {
    setActiveMoodTag(prev => prev === tag ? null : tag)
  }, [])

  useEffect(() => {
    return () => {
      clearProgress()
    }
  }, [clearProgress])

  return (
    <div className="app">
      <header className="header">
        <div className="artist-info">
          <div className="avatar">🎤</div>
          <div className="artist-name">独立音乐人作品展示</div>
        </div>
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="搜索EP名称"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </header>

      <div className="tag-filter-bar">
        {allMoodTags.map(tag => (
          <span
            key={tag}
            className={`filter-tag ${activeMoodTag === tag ? 'active' : ''}`}
            style={{
              borderColor: activeMoodTag === tag ? moodTagColors[tag] : 'transparent'
            }}
            onClick={() => handleFilterTagClick(tag)}
          >
            {tag}
          </span>
        ))}
      </div>

      <Timeline
        eps={filteredEps}
        selectedEpId={selectedEpId}
        onSelectEp={handleSelectEp}
        currentTrackId={currentTrackId}
        onPlayTrack={handlePlayTrack}
        progress={progress}
        displayLyrics={displayLyrics}
        isPlaying={isPlaying}
        onTagClick={handleTagClick}
        activeMoodTag={activeMoodTag}
      />
    </div>
  )
}

export default App
