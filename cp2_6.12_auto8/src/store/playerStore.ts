import { create } from 'zustand'

export interface Song {
  id: string
  title: string
  artist: string
  album: string
  coverUrl: string
  duration: number
  frequencies: number[]
  oscTypes: OscillatorType[]
}

const SONGS: Song[] = [
  {
    id: '1',
    title: 'Neon Dreams',
    artist: 'Synthwave Collective',
    album: 'Digital Horizons',
    coverUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=neon%20city%20skyline%20at%20night%20synthwave%20retro%20futuristic%20album%20cover%20art%20digital%20painting&image_size=square',
    duration: 234,
    frequencies: [130.81, 164.81, 196.00, 261.63, 329.63],
    oscTypes: ['sine', 'triangle', 'sine', 'sine', 'triangle'],
  },
  {
    id: '2',
    title: 'Cyber Pulse',
    artist: 'Digital Echo',
    album: 'Circuit Breaker',
    coverUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cyberpunk%20digital%20pulse%20circuit%20board%20electronic%20music%20album%20cover%20glowing%20blue&image_size=square',
    duration: 198,
    frequencies: [146.83, 185.00, 220.00, 293.66, 369.99],
    oscTypes: ['sawtooth', 'square', 'sine', 'triangle', 'sine'],
  },
  {
    id: '3',
    title: 'Midnight Cascade',
    artist: 'Lunar Drift',
    album: 'Stellar Echoes',
    coverUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=dark%20blue%20midnight%20waterfall%20cosmic%20space%20stars%20album%20cover%20art&image_size=square',
    duration: 276,
    frequencies: [110.00, 138.59, 164.81, 220.00, 277.18],
    oscTypes: ['sine', 'triangle', 'sine', 'sine', 'triangle'],
  },
  {
    id: '4',
    title: 'Solar Winds',
    artist: 'Cosmic Array',
    album: 'Interstellar',
    coverUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=golden%20solar%20wind%20cosmic%20space%20nebula%20warm%20album%20cover%20art&image_size=square',
    duration: 312,
    frequencies: [174.61, 220.00, 261.63, 349.23, 440.00],
    oscTypes: ['sine', 'sine', 'triangle', 'sine', 'triangle'],
  },
  {
    id: '5',
    title: 'Electric Rain',
    artist: 'Neon Circuit',
    album: 'Voltage',
    coverUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=electric%20blue%20rain%20neon%20lights%20city%20night%20reflection%20album%20cover&image_size=square',
    duration: 245,
    frequencies: [196.00, 246.94, 293.66, 392.00, 493.88],
    oscTypes: ['sawtooth', 'sine', 'square', 'sine', 'triangle'],
  },
  {
    id: '6',
    title: 'Deep Horizon',
    artist: 'Abyss Walker',
    album: 'Oceanic',
    coverUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=deep%20ocean%20horizon%20dark%20abyss%20underwater%20bioluminescent%20album%20cover&image_size=square',
    duration: 289,
    frequencies: [98.00, 123.47, 146.83, 196.00, 246.94],
    oscTypes: ['sine', 'triangle', 'sine', 'sine', 'triangle'],
  },
]

interface PlayerStore {
  playlist: Song[]
  currentSongIndex: number
  isPlaying: boolean
  currentTime: number
  volume: number
  isFading: boolean
  isMobileExpanded: boolean

  setCurrentSongIndex: (index: number) => void
  setIsPlaying: (playing: boolean) => void
  setCurrentTime: (time: number | ((prev: number) => number)) => void
  setVolume: (volume: number) => void
  setIsFading: (fading: boolean) => void
  setIsMobileExpanded: (expanded: boolean) => void
  nextSong: () => void
  prevSong: () => void
  reorderPlaylist: (fromIndex: number, toIndex: number) => void
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  playlist: SONGS,
  currentSongIndex: 0,
  isPlaying: false,
  currentTime: 0,
  volume: 0.7,
  isFading: false,
  isMobileExpanded: false,

  setCurrentSongIndex: (index) => set({ currentSongIndex: index }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time) =>
    set((state) => ({
      currentTime: typeof time === 'function' ? time(state.currentTime) : time,
    })),
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  setIsFading: (fading) => set({ isFading: fading }),
  setIsMobileExpanded: (expanded) => set({ isMobileExpanded: expanded }),

  nextSong: () => {
    const { playlist, currentSongIndex } = get()
    const nextIndex = (currentSongIndex + 1) % playlist.length
    set({ currentSongIndex: nextIndex, currentTime: 0 })
  },

  prevSong: () => {
    const { playlist, currentSongIndex, currentTime } = get()
    if (currentTime > 3) {
      set({ currentTime: 0 })
    } else {
      const prevIndex = (currentSongIndex - 1 + playlist.length) % playlist.length
      set({ currentSongIndex: prevIndex, currentTime: 0 })
    }
  },

  reorderPlaylist: (fromIndex, toIndex) => {
    const { playlist, currentSongIndex } = get()
    const newPlaylist = [...playlist]
    const [movedSong] = newPlaylist.splice(fromIndex, 1)
    newPlaylist.splice(toIndex, 0, movedSong)

    let newIndex = currentSongIndex
    if (fromIndex === currentSongIndex) {
      newIndex = toIndex
    } else if (fromIndex < currentSongIndex && toIndex >= currentSongIndex) {
      newIndex = currentSongIndex - 1
    } else if (fromIndex > currentSongIndex && toIndex <= currentSongIndex) {
      newIndex = currentSongIndex + 1
    }

    set({ playlist: newPlaylist, currentSongIndex: newIndex })
  },
}))
