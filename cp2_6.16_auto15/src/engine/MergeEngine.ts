import type { NotesBuffer } from './NotesBuffer'
import type { EnsembleMode, EnsembleResult, Note, Measure, InstrumentType } from '../types'

export function mergeEnsemble(
  buffers: NotesBuffer[],
  mode: EnsembleMode,
  totalMeasures: number
): EnsembleResult {
  const mergedMeasures: Map<number, Note[]> = new Map()

  for (let bufIdx = 0; bufIdx < buffers.length; bufIdx++) {
    const buffer = buffers[bufIdx]
    const bufMeasures = buffer.getAllMeasures()
    const instrument = buffer.getInstrument()

    for (const measure of bufMeasures) {
      const existing = mergedMeasures.get(measure.measureNumber) ?? []

      const adjustedNotes = measure.notes.map((note) => {
        let adjustedBeat = note.beat

        if (mode === 'align') {
          adjustedBeat = 0
        } else if (mode === 'follow') {
          adjustedBeat = note.beat + bufIdx * 0.5
          if (adjustedBeat > 3.5) adjustedBeat = 3.5
        }

        return {
          ...note,
          instrument,
          beat: adjustedBeat,
        }
      })

      mergedMeasures.set(measure.measureNumber, [...existing, ...adjustedNotes])
    }
  }

  const measures: Measure[] = []
  for (let i = 1; i <= totalMeasures; i++) {
    measures.push({
      measureNumber: i,
      notes: mergedMeasures.get(i) ?? [],
      completed: mergedMeasures.has(i),
    })
  }

  const allNotes = measures.flatMap((m) => m.notes)
  const instrumentActivity: Record<InstrumentType, number> = {
    piano: 0,
    violin: 0,
    cello: 0,
    flute: 0,
    percussion: 0,
  }

  for (const inst of Object.keys(instrumentActivity) as InstrumentType[]) {
    instrumentActivity[inst] = calculateActivity(allNotes, inst)
  }

  return {
    sessionId: generateId(),
    totalDuration: calculateTotalDuration(measures),
    measures,
    instrumentActivity,
    mode,
    createdAt: Date.now(),
  }
}

export function calculateActivity(notes: Note[], instrument: InstrumentType): number {
  if (notes.length === 0) return 0
  const count = notes.filter((n) => n.instrument === instrument).length
  return Math.round((count / notes.length) * 100)
}

export function calculateTotalDuration(measures: Measure[]): number {
  const completedMeasures = measures.filter((m) => m.completed || m.notes.length > 0)
  return completedMeasures.length * 4 * 0.5
}

function generateId(): string {
  return 'xxxx-xxxx-xxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  )
}
