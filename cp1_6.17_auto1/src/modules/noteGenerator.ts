import type { Note, Song } from '../types';

interface NoteGeneratorOptions {
  bpm: number;
  duration: number;
  trackCount?: number;
  density?: number;
}

export function generateNotes(song: Song, trackCount: number = 4): Note[] {
  const options: NoteGeneratorOptions = {
    bpm: song.bpm,
    duration: song.duration,
    trackCount,
    density: song.difficulty === 'easy' ? 0.4 : song.difficulty === 'normal' ? 0.6 : 0.8
  };
  
  return generateNotesByBPM(options);
}

export function generateNotesByBPM(options: NoteGeneratorOptions): Note[] {
  const { bpm, duration, trackCount = 4, density = 0.6 } = options;
  const notes: Note[] = [];
  
  const beatInterval = 60000 / bpm;
  const sixteenthNoteInterval = beatInterval / 4;
  const totalBeats = Math.floor((duration * 1000) / beatInterval);
  
  const noteTypes: Array<'normal' | 'sharp' | 'flat' | 'dotted' | 'syncopated'> = 
    ['normal', 'normal', 'normal', 'normal', 'sharp', 'flat', 'dotted', 'syncopated'];
  
  let noteId = 0;
  
  for (let beat = 0; beat < totalBeats; beat++) {
    for (let subBeat = 0; subBeat < 4; subBeat++) {
      if (Math.random() > density) continue;
      
      const isSyncopated = subBeat === 1 || subBeat === 3;
      const timestamp = (beat * beatInterval) + (subBeat * sixteenthNoteInterval);
      
      if (timestamp >= duration * 1000) break;
      
      const trackIndex = Math.floor(Math.random() * trackCount);
      const noteType = isSyncopated && Math.random() > 0.5 
        ? 'syncopated' 
        : noteTypes[Math.floor(Math.random() * noteTypes.length)];
      
      let durationMultiplier = 1;
      if (noteType === 'dotted') {
        durationMultiplier = 1.5;
      }
      
      const keys = ['A', 'S', 'D', 'F'];
      const note: Note = {
        id: `note-${noteId++}`,
        key: keys[trackIndex],
        timestamp,
        trackIndex,
        duration: sixteenthNoteInterval * durationMultiplier,
        type: noteType
      };
      
      notes.push(note);
    }
  }
  
  return notes.sort((a, b) => a.timestamp - b.timestamp);
}

export function calculateFallDuration(bpm: number): number {
  return (60 / bpm) * 4;
}

export function getNoteColor(type: Note['type']): string {
  const colors: Record<string, string> = {
    normal: '#FFFFFF',
    sharp: '#FF6B6B',
    flat: '#4ECDC4',
    dotted: '#FFD93D',
    syncopated: '#9B59B6'
  };
  return colors[type || 'normal'];
}
