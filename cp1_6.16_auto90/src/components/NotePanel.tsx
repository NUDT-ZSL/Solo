import { useEffect, useRef, useState } from 'react';
import { Note, calculateFallDuration } from '../modules/noteGenerator';
import { HitResult } from '../modules/scoreCalculator';
import '../App.css';

const TRACK_KEYS = ['A', 'S', 'D', 'F'];
const TRACK_COLORS = ['#FF6B6B', '#4CAF50', '#FFD93D', '#9B59B6'];
const NOTE_RADIUS = 15;
const PANEL_HEIGHT = 400;
const JUDGMENT_LINE_Y = PANEL_HEIGHT - 50;

interface NotePanelProps {
  notes: Note[];
  bpm: number;
  hitNotes: Set<string>;
  hitResults: { result: HitResult; trackIndex: number; id: number }[];
  isPlaying: boolean;
  gameStartTime: number;
}

interface NotePosition {
  id: string;
  trackIndex: number;
  y: number;
  visible: boolean;
}

function NotePanel({ notes, bpm, hitNotes, hitResults, isPlaying, gameStartTime }: NotePanelProps) {
  const [notePositions, setNotePositions] = useState<NotePosition[]>([]);
  const animationRef = useRef<number | null>(null);
  const fallDuration = calculateFallDuration(bpm);

  useEffect(() => {
    if (!isPlaying || notes.length === 0) {
      setNotePositions([]);
      return;
    }

    const animate = () => {
      const currentTime = performance.now() - gameStartTime;
      
      const positions: NotePosition[] = notes.map(note => {
        const noteStartTime = note.time;
        const elapsed = currentTime - noteStartTime;
        const progress = elapsed / fallDuration;
        const y = progress * JUDGMENT_LINE_Y;
        
        const visible = progress >= -0.1 && progress <= 1.2 && !hitNotes.has(note.id);
        
        return {
          id: note.id,
          trackIndex: note.trackIndex,
          y,
          visible
        };
      });

      setNotePositions(positions);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, notes, fallDuration, gameStartTime, hitNotes]);

  const trackWidth = 250 / 4;

  return (
    <div className="note-panel" style={{ width: 250, height: PANEL_HEIGHT }}>
      <div className="tracks">
        {TRACK_KEYS.map((key, index) => (
          <div key={index} className="track">
            <div className="track-key">{key}</div>
          </div>
        ))}
      </div>

      <div className="judgment-line" />

      {notePositions.filter(n => n.visible).map(note => (
        <div
          key={note.id}
          className="note"
          style={{
            left: note.trackIndex * trackWidth + trackWidth / 2,
            top: note.y,
            backgroundColor: TRACK_COLORS[note.trackIndex],
            color: TRACK_COLORS[note.trackIndex],
            width: NOTE_RADIUS * 2,
            height: NOTE_RADIUS * 2,
          }}
        />
      ))}

      {hitResults.map(hit => (
        <div
          key={hit.id}
          className={`hit-effect ${hit.result}`}
          style={{
            left: hit.trackIndex * trackWidth + trackWidth / 2,
            transform: 'translateX(-50%)'
          }}
        >
          {hit.result === 'perfect' && 'Perfect!'}
          {hit.result === 'good' && 'Good'}
          {hit.result === 'ok' && 'OK'}
          {hit.result === 'miss' && 'Miss'}
        </div>
      ))}
    </div>
  );
}

export default NotePanel;
