import { useEffect, useCallback } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { usePlayerStore } from '@/store/playerStore'
import { useAudio } from '@/hooks/useAudio'
import Player from '@/components/Player'
import Playlist from '@/components/Playlist'
import Visualizer from '@/components/Visualizer'

function MusicPlayer() {
  const {
    togglePlay,
    next,
    prev,
    seek,
    setVolume,
    switchSong,
    getFrequencyData,
  } = useAudio()

  const isMobileExpanded = usePlayerStore((s) => s.isMobileExpanded)
  const setIsMobileExpanded = usePlayerStore((s) => s.setIsMobileExpanded)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
          e.preventDefault()
          seek(Math.max(0, usePlayerStore.getState().currentTime - 5))
          break
        case 'ArrowRight':
          e.preventDefault()
          const state = usePlayerStore.getState()
          seek(Math.min(state.playlist[state.currentSongIndex].duration, state.currentTime + 5))
          break
        case 'ArrowUp':
          e.preventDefault()
          setVolume(usePlayerStore.getState().volume + 0.05)
          break
        case 'ArrowDown':
          e.preventDefault()
          setVolume(usePlayerStore.getState().volume - 0.05)
          break
      }
    },
    [togglePlay, seek, setVolume]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="app-layout">
      <div className="app-layout-desktop">
        <div className="player-section">
          <Player
            togglePlay={togglePlay}
            next={next}
            prev={prev}
            seek={seek}
            setVolume={setVolume}
            getFrequencyData={getFrequencyData}
            isMobileExpanded={isMobileExpanded}
            setIsMobileExpanded={setIsMobileExpanded}
          />
          <div className="visualizer-section">
            <Visualizer getFrequencyData={getFrequencyData} />
          </div>
        </div>
        <div className="playlist-section">
          <Playlist switchSong={switchSong} />
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MusicPlayer />} />
      </Routes>
    </Router>
  )
}
