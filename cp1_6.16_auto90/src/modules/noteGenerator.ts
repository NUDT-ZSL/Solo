export interface Note {
  id: string;
  trackIndex: number;
  time: number;
  duration?: number;
  type?: 'normal' | 'dotted' | 'syncopated' | 'sharp' | 'flat';
}

export function generateNotes(bpm: number, duration: number, trackCount: number = 4): Note[] {
  const notes: Note[] = [];
  const beatInterval = 60000 / bpm;
  const totalBeats = Math.floor(duration / beatInterval);
  
  let noteId = 0;
  const noteTypes: Array<'normal' | 'dotted' | 'syncopated' | 'sharp' | 'flat'> = [
    'normal', 'normal', 'normal', 'normal', 'normal', 'normal',
    'dotted', 'syncopated', 'sharp', 'flat'
  ];

  for (let i = 4; i < totalBeats - 2; i++) {
    const notesPerBeat = Math.random() > 0.6 ? 2 : 1;
    
    for (let j = 0; j < notesPerBeat; j++) {
      const timeOffset = notesPerBeat > 1 ? (j * 0.5) : 0;
      const time = (i + timeOffset) * beatInterval;
      
      if (Math.random() > 0.25) {
        const trackIndex = Math.floor(Math.random() * trackCount);
        const typeIndex = Math.floor(Math.random() * noteTypes.length);
        const type = noteTypes[typeIndex];
        
        const note: Note = {
          id: `note-${noteId++}`,
          trackIndex,
          time,
          type
        };

        if (type === 'dotted') {
          note.duration = beatInterval * 1.5;
        }

        notes.push(note);
      }
    }
  }

  notes.sort((a, b) => a.time - b.time);
  return notes;
}

export function calculateFallDuration(bpm: number): number {
  return (60 / bpm) * 4 * 1000;
}
