import type { NotesBuffer } from './NotesBuffer';
import type { EnsembleMode, EnsembleResult, Note, Measure, InstrumentType } from '../types';

export function mergeEnsemble(
  buffers: NotesBuffer[],
  mode: EnsembleMode,
  totalMeasures: number
): EnsembleResult {
  const allMeasures: Map<number, Note[]> = new Map();
  const beatDelay = mode === 'follow' ? 0.5 : 0;

  for (let i = 0; i < buffers.length; i++) {
    const buffer = buffers[i];
    const bufferMeasures = buffer.getAllMeasures();
    const delay = i * beatDelay;

    for (const measure of bufferMeasures) {
      const measureNumber = measure.measureNumber;
      const existingNotes = allMeasures.get(measureNumber) ?? [];
      
      const adjustedNotes = measure.notes.map(note => {
        let adjustedBeat = note.beat;
        if (mode === 'align') {
          adjustedBeat = 0;
        } else if (mode === 'follow') {
          adjustedBeat = note.beat + delay;
        }
        return { ...note, beat: adjustedBeat };
      });

      allMeasures.set(measureNumber, [...existingNotes, ...adjustedNotes]);
    }
  }

  const measures: Measure[] = [];
  for (let i = 1; i <= totalMeasures; i++) {
    measures.push({
      measureNumber: i,
      notes: allMeasures.get(i) ?? [],
      completed: allMeasures.has(i)
    });
  }

  const totalDuration = calculateTotalDuration(measures);
  const instrumentActivity: Record<InstrumentType, number> = {
    piano: 0,
    violin: 0,
    cello: 0,
    flute: 0,
    percussion: 0
  };

  const allNotes = measures.flatMap(m => m.notes);
  for (const instrument of Object.keys(instrumentActivity) as InstrumentType[]) {
    instrumentActivity[instrument] = calculateActivity(allNotes, instrument);
  }

  return {
    sessionId: crypto.randomUUID(),
    totalDuration,
    measures,
    instrumentActivity,
    mode,
    createdAt: new Date()
  };
}

export function calculateActivity(notes: Note[], instrument: InstrumentType): number {
  if (notes.length === 0) return 0;
  const instrumentNotes = notes.filter(n => n.instrument === instrument);
  return (instrumentNotes.length / notes.length) * 100;
}

export function calculateTotalDuration(measures: Measure[]): number {
  return measures.length * 4 * 0.5;
}
