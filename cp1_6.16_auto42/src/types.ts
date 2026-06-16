export interface Track {
  id: string
  title: string
  duration: number
  lyricSnippet: string
}

export interface EP {
  id: string
  title: string
  releaseDate: string
  year: number
  coverColor: {
    primary: string
    secondary: string
    text: string
  }
  tracks: Track[]
  moodTags: string[]
  description: string
}

export type MoodTagColorMap = Record<string, string>

export interface AppState {
  eps: EP[]
  selectedEpId: string | null
  activeMoodTag: string | null
  searchQuery: string
  isPlaying: boolean
  currentTrackId: string | null
  progress: number
  displayLyrics: string
}
