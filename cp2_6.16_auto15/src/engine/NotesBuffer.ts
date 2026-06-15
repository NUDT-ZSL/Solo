import type { Note, Measure, InstrumentType } from '../types'

export class NotesBuffer {
  private measures: Map<number, Note[]> = new Map()
  private completedMeasures: Set<number> = new Set()
  private currentMeasure: number = 1
  private instrument: InstrumentType

  constructor(instrument: InstrumentType) {
    this.instrument = instrument
  }

  addNote(note: Note, measureNumber?: number): void {
    const target = measureNumber ?? this.currentMeasure
    const existing = this.measures.get(target) ?? []
    this.measures.set(target, [...existing, { ...note, instrument: this.instrument }])
  }

  removeNote(noteId: string, measureNumber?: number): void {
    if (measureNumber !== undefined) {
      const existing = this.measures.get(measureNumber) ?? []
      this.measures.set(measureNumber, existing.filter((n) => n.id !== noteId))
      return
    }
    for (const [num, notes] of this.measures.entries()) {
      const filtered = notes.filter((n) => n.id !== noteId)
      if (filtered.length !== notes.length) {
        this.measures.set(num, filtered)
        return
      }
    }
  }

  updateNote(noteId: string, updates: Partial<Note>): void {
    for (const [num, notes] of this.measures.entries()) {
      const idx = notes.findIndex((n) => n.id === noteId)
      if (idx !== -1) {
        const updated = [...notes]
        updated[idx] = { ...updated[idx], ...updates }
        this.measures.set(num, updated)
        return
      }
    }
  }

  getMeasureNotes(measureNumber: number): Note[] {
    return this.measures.get(measureNumber) ?? []
  }

  getAllNotes(): Note[] {
    const all: Note[] = []
    for (const notes of this.measures.values()) {
      all.push(...notes)
    }
    return all
  }

  getAllMeasures(): Measure[] {
    const measures: Measure[] = []
    const sorted = Array.from(this.measures.keys()).sort((a, b) => a - b)
    for (const num of sorted) {
      measures.push({
        measureNumber: num,
        notes: this.measures.get(num) ?? [],
        completed: this.completedMeasures.has(num),
      })
    }
    return measures
  }

  completeMeasure(measureNumber: number): void {
    this.completedMeasures.add(measureNumber)
    if (measureNumber >= this.currentMeasure) {
      this.currentMeasure = measureNumber + 1
    }
  }

  clearMeasure(measureNumber: number): void {
    this.measures.delete(measureNumber)
    this.completedMeasures.delete(measureNumber)
  }

  reset(): void {
    this.measures.clear()
    this.completedMeasures.clear()
    this.currentMeasure = 1
  }

  isMeasureComplete(measureNumber: number): boolean {
    return this.completedMeasures.has(measureNumber)
  }

  getInstrument(): InstrumentType {
    return this.instrument
  }

  getCurrentMeasure(): number {
    return this.currentMeasure
  }

  getNoteCount(): number {
    let count = 0
    for (const notes of this.measures.values()) {
      count += notes.length
    }
    return count
  }
}
