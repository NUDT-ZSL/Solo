import { create } from 'zustand'
import type { CloudWord } from '@/utils/cloudLayout'
import type { KeywordInfo } from '@/utils/textAnalysis'

interface AppState {
  inputText: string
  selectedPoemId: string | null
  keywords: KeywordInfo[]
  cloudWords: CloudWord[]
  activeWord: string | null
  hoveredWord: string | null
  setInputText: (text: string) => void
  setSelectedPoemId: (id: string | null) => void
  setKeywords: (keywords: KeywordInfo[]) => void
  setCloudWords: (words: CloudWord[]) => void
  setActiveWord: (word: string | null) => void
  setHoveredWord: (word: string | null) => void
}

export const useStore = create<AppState>((set) => ({
  inputText: '',
  selectedPoemId: null,
  keywords: [],
  cloudWords: [],
  activeWord: null,
  hoveredWord: null,
  setInputText: (inputText) => set({ inputText }),
  setSelectedPoemId: (selectedPoemId) => set({ selectedPoemId }),
  setKeywords: (keywords) => set({ keywords }),
  setCloudWords: (cloudWords) => set({ cloudWords }),
  setActiveWord: (activeWord) => set({ activeWord }),
  setHoveredWord: (hoveredWord) => set({ hoveredWord }),
}))
