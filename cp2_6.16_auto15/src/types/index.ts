export type InstrumentType = 'piano' | 'violin' | 'cello' | 'flute' | 'percussion'

export type EnsembleMode = 'align' | 'follow' | 'free'

export interface Instrument {
  id: InstrumentType
  name: string
  color: string
  icon: string
}

export interface Note {
  id: string
  instrument: InstrumentType
  pitch: number
  beat: number
  duration: number
  x: number
  y: number
}

export interface Measure {
  measureNumber: number
  notes: Note[]
  completed: boolean
}

export interface EnsembleResult {
  sessionId: string
  totalDuration: number
  measures: Measure[]
  instrumentActivity: Record<InstrumentType, number>
  mode: EnsembleMode
  createdAt: number
}

export const INSTRUMENTS: Instrument[] = [
  { id: 'piano', name: '钢琴', color: '#ffcdd2', icon: '🎹' },
  { id: 'violin', name: '小提琴', color: '#c8e6c9', icon: '🎻' },
  { id: 'cello', name: '大提琴', color: '#bbdefb', icon: '🎻' },
  { id: 'flute', name: '长笛', color: '#fff9c4', icon: '🪈' },
  { id: 'percussion', name: '打击乐', color: '#d1c4e9', icon: '🥁' },
]

export const MODE_COLORS: Record<EnsembleMode, string> = {
  align: '#66bb6a',
  follow: '#42a5f5',
  free: '#ef5350',
}

export const TOTAL_MEASURES = 8

export interface InstrumentSelectorProps {
  onSelect: (instrument: InstrumentType) => void
}

export interface RehearsalRoomProps {
  instrument: InstrumentType
  onComplete: (result: EnsembleResult) => void
}

export interface SummaryPanelProps {
  result: EnsembleResult
  onClose: () => void
  onRestart: () => void
}
