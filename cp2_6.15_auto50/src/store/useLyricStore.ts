import { create } from 'zustand'

export interface LyricLine {
  id: string
  text: string
  startTime: number
  endTime: number
  index: number
}

interface LyricStyle {
  fontSize: number
  fontFamily: string
  color: string
}

interface LyricState {
  lyrics: LyricLine[]
  currentTime: number
  isPlaying: boolean
  selectedLyricId: string | null
  style: LyricStyle
  totalDuration: number
  setLyrics: (lyrics: LyricLine[]) => void
  setCurrentTime: (time: number) => void
  setIsPlaying: (playing: boolean) => void
  setSelectedLyricId: (id: string | null) => void
  setFontSize: (size: number) => void
  updateLyricTime: (id: string, startTime: number, endTime: number) => void
  setTotalDuration: (duration: number) => void
}

const generateId = () => {
  return Math.random().toString(36).substring(2, 11)
}

export const parseLyrics = (text: string): LyricLine[] => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const defaultDuration = 5

  return lines.map((line, index) => {
    return {
      id: generateId(),
      text: line,
      startTime: index * defaultDuration,
      endTime: (index + 1) * defaultDuration,
      index: index,
    }
  })
}

export const useLyricStore = create<LyricState>(function (set) {
  return {
    lyrics: [],
    currentTime: 0,
    isPlaying: false,
    selectedLyricId: null,
    style: {
      fontSize: 24,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#ffcc80',
    },
    totalDuration: 60,

    setLyrics: function (lyrics) {
      return set({ lyrics: lyrics })
    },
    setCurrentTime: function (time) {
      return set({ currentTime: time })
    },
    setIsPlaying: function (playing) {
      return set({ isPlaying: playing })
    },
    setSelectedLyricId: function (id) {
      return set({ selectedLyricId: id })
    },
    setFontSize: function (size) {
      return set(function (state) {
        return { style: { ...state.style, fontSize: size } }
      })
    },
    updateLyricTime: function (id, startTime, endTime) {
      return set(function (state) {
        return {
          lyrics: state.lyrics.map(function (lyric) {
            return lyric.id === id ? { ...lyric, startTime, endTime } : lyric
          }),
        }
      })
    },
    setTotalDuration: function (duration) {
      return set({ totalDuration: duration })
    },
  }
})
