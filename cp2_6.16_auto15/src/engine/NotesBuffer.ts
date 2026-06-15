import type { Note, Measure, InstrumentType } from '../types';

export class NotesBuffer {
  private measures: Map<number, Note[]> = new Map();
  private currentMeasure: number = 1;
  private instrument: InstrumentType;

  constructor(instrument: InstrumentType) {
    this.instrument = instrument;
  }

  addNote(note: Note, measureNumber?: number): void {
    const targetMeasure = measureNumber ?? this.currentMeasure;
    const existingNotes = this.measures.get(targetMeasure) ?? [];
    this.measures.set(targetMeasure, [...existingNotes, note]);
  }

  getMeasureNotes(measureNumber: number): Note[] {
    return this.measures.get(measureNumber) ?? [];
  }

  getAllNotes(): Note[] {
    const allNotes: Note[] = [];
    for (const notes of this.measures.values()) {
      allNotes.push(...notes);
    }
    return allNotes;
  }

  getAllMeasures(): Measure[] {
    const measures: Measure[] = [];
    const sortedMeasureNumbers = Array.from(this.measures.keys()).sort((a, b) => a - b);
    for (const measureNumber of sortedMeasureNumbers) {
      measures.push({
        measureNumber,
        notes: this.measures.get(measureNumber) ?? [],
        completed: false
      });
    }
    return measures;
  }

  completeMeasure(measureNumber: number): void {
    this.currentMeasure = Math.max(this.currentMeasure, measureNumber + 1);
  }

  clearMeasure(measureNumber: number): void {
    this.measures.delete(measureNumber);
  }

  reset(): void {
    this.measures.clear();
    this.currentMeasure = 1;
  }

  isMeasureComplete(measureNumber: number): boolean {
    return measureNumber < this.currentMeasure;
  }
}
