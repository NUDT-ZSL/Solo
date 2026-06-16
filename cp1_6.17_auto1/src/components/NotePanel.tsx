import { useMemo } from 'react';
import type { Note, StagePosition, HitResult } from '../types';
import { JUDGEMENT_COLORS } from '../modules/scoreCalculator';

interface NotePanelProps {
  notes: Note[];
  currentTime: number;
  fallDuration: number;
  positions: StagePosition[];
  hitEffects: Array<{ id: string; judgement: HitResult['judgement']; trackIndex: number }>;
}

export default function NotePanel({ notes, currentTime, fallDuration, positions, hitEffects }: NotePanelProps) {
  const trackHeight = 400;
  const trackWidth = 50;
  const noteRadius = 15;
  const fallTime = fallDuration * 1000;

  const trackColors = useMemo(() => {
    return positions.map(p => p.character?.color || ['#FF6B6B', '#4CAF50', '#FFD93D', '#9B59B6'][positions.indexOf(p)]);
  }, [positions]);

  const visibleNotes = useMemo(() => {
    return notes.filter(note => {
      if (note.hit || note.missed) return false;
      const timeUntilHit = note.timestamp - currentTime;
      return timeUntilHit <= fallTime && timeUntilHit >= -200;
    });
  }, [notes, currentTime, fallTime]);

  const getNotePosition = (note: Note) => {
    const timeUntilHit = note.timestamp - currentTime;
    const progress = 1 - (timeUntilHit / fallTime);
    return Math.max(0, Math.min(1, progress)) * trackHeight;
  };

  return (
    <div style={{
      display: 'flex',
      gap: '10px',
      padding: '10px',
      backgroundColor: '#1E1E2E',
      borderRadius: '12px',
      position: 'relative',
      marginTop: '20px'
    }}>
      {[0, 1, 2, 3].map(trackIndex => (
        <div
          key={trackIndex}
          style={{
            width: `${trackWidth}px`,
            height: `${trackHeight}px`,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(to bottom, transparent 0%, ${trackColors[trackIndex]}10 100%)`,
            pointerEvents: 'none'
          }} />
          
          {visibleNotes
            .filter(note => note.trackIndex === trackIndex)
            .map(note => {
              const y = getNotePosition(note) - noteRadius;
              const noteColor = trackColors[trackIndex];
              
              return (
                <div
                  key={note.id}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: `${y}px`,
                    transform: 'translateX(-50%)',
                    width: `${noteRadius * 2}px`,
                    height: `${noteRadius * 2}px`,
                    borderRadius: '50%',
                    backgroundColor: noteColor,
                    boxShadow: `0 0 15px ${noteColor}, 0 0 30px ${noteColor}50`,
                    transition: 'opacity 0.1s ease-out',
                    willChange: 'top'
                  }}
                />
              );
            })}
          
          {hitEffects
            .filter(effect => effect.trackIndex === trackIndex)
            .map(effect => (
              <div
                key={effect.id}
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: '30px',
                  transform: 'translateX(-50%)',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: JUDGEMENT_COLORS[effect.judgement],
                  textShadow: `0 0 10px ${JUDGEMENT_COLORS[effect.judgement]}`,
                  animation: 'judgementPop 0.5s ease-out forwards',
                  pointerEvents: 'none',
                  zIndex: 10
                }}
              >
                {effect.judgement}
              </div>
            ))}
        </div>
      ))}
      
      <div style={{
        position: 'absolute',
        left: '10px',
        right: '10px',
        bottom: '40px',
        height: '2px',
        background: 'repeating-linear-gradient(90deg, #FFFFFF 0px, #FFFFFF 10px, transparent 10px, transparent 20px)',
        pointerEvents: 'none',
        boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)'
      }} />
      
      <div style={{
        position: 'absolute',
        left: '10px',
        right: '10px',
        bottom: '30px',
        height: '30px',
        background: 'linear-gradient(to top, rgba(255, 255, 255, 0.05), transparent)',
        pointerEvents: 'none'
      }} />
      
      <div style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: '5px',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '0 10px'
      }}>
        {['A', 'S', 'D', 'F'].map((key) => (
          <div key={key} style={{
            width: `${trackWidth}px`,
            textAlign: 'center',
            fontSize: '11px',
            color: '#95A5A6'
          }}>
            {key}
          </div>
        ))}
      </div>
    </div>
  );
}
