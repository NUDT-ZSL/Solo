export type InstrumentType = 'piano' | 'violin' | 'cello' | 'flute' | 'percussion'

export interface EnsembleResult {
  mode: string
  totalDuration: number
  instrumentActivity: Record<InstrumentType, boolean>
}

export interface InstrumentSelectorProps {
  onSelect: (instrument: InstrumentType) => void
}

export interface RehearsalRoomProps {
  instrument: InstrumentType
  onComplete: (result: EnsembleResult) => void
}

export interface SummaryPanelProps {
  result: EnsembleResult
  onBack: () => void
}
