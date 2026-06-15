import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { Note, Track, InstrumentType } from './types';
import { INSTRUMENT_COLORS, PITCH_NAMES, STEPS_PER_BAR, TOTAL_BARS, TOTAL_STEPS, GRID_WIDTH, GRID_HEIGHT } from './types';

interface SequencerProps {
  tracks: Track[];
  notes: Note[];
  currentStep: number;
  loopStart: number;
  loopEnd: number;
  onNoteToggle: (trackId: string, step: number, pitch: number) => void;
  onLoopChange: (start: number, end: number) => void;
}

interface HoveredNote {
  note: Note;
  x: number;
  y: number;
}

const DEFAULT_PITCHES: Record<InstrumentType, number[]> = {
  piano: [72, 71, 69, 67, 65, 64, 62, 60, 59, 57, 55, 53],
  drums: [38, 37, 36, 35, 34, 33, 32, 31, 30, 29, 28, 27],
  bass: [48, 47, 45, 43, 41, 40, 38, 36, 35, 33, 31, 29],
};

export const Sequencer: React.FC<SequencerProps> = ({
  tracks,
  notes,
  currentStep,
  loopStart,
  loopEnd,
  onNoteToggle,
  onLoopChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hoveredNote, setHoveredNote] = useState<HoveredNote | null>(null);
  const [draggingLoop, setDraggingLoop] = useState<'start' | 'end' | null>(null);
  const [isDraggingNote, setIsDraggingNote] = useState(false);
  const dragStartRef = useRef<{ step: number; trackIndex: number; x: number; y: number } | null>(null);

  const totalGridWidth = useMemo(() => TOTAL_STEPS * GRID_WIDTH, []);
  const totalGridHeight = useMemo(() => tracks.length * GRID_HEIGHT, [tracks.length]);

  const getPitchName = (midiPitch: number): string => {
    const octave = Math.floor(midiPitch / 12) - 1;
    const noteName = PITCH_NAMES[midiPitch % 12];
    return `${noteName}${octave}`;
  };

  const getDefaultPitchForTrack = (trackIndex: number): number => {
    const track = tracks[trackIndex];
    if (!track) return 60;
    const pitches = DEFAULT_PITCHES[track.instrument] || DEFAULT_PITCHES.piano;
    const idx = trackIndex % pitches.length;
    return pitches[idx];
  };

  const getInstrumentColor = (trackId: string): string => {
    const track = tracks.find(t => t.id === trackId);
    return track ? INSTRUMENT_COLORS[track.instrument] : '#666';
  };

  const snapToGrid = (x: number): number => {
    return Math.round(x / GRID_WIDTH) * GRID_WIDTH;
  };

  const handleGridMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;

    const rect = scrollContainerRef.current.getBoundingClientRect();
    const scrollLeft = scrollContainerRef.current.scrollLeft;
    const scrollTop = scrollContainerRef.current.scrollTop;

    const x = e.clientX - rect.left + scrollLeft;
    const y = e.clientY - rect.top + scrollTop;

    if (x < 0 || y < 0) return;

    const step = Math.floor(x / GRID_WIDTH);
    const trackIndex = Math.floor(y / GRID_HEIGHT);

    if (step < 0 || step >= TOTAL_STEPS || trackIndex < 0 || trackIndex >= tracks.length) return;

    setIsDraggingNote(true);
    dragStartRef.current = { step, trackIndex, x, y };

    const pitch = getDefaultPitchForTrack(trackIndex);
    onNoteToggle(tracks[trackIndex].id, step, pitch);
  }, [tracks, onNoteToggle]);

  const handleGridMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingNote || !scrollContainerRef.current) return;

    const rect = scrollContainerRef.current.getBoundingClientRect();
    const scrollLeft = scrollContainerRef.current.scrollLeft;
    const scrollTop = scrollContainerRef.current.scrollTop;

    const x = e.clientX - rect.left + scrollLeft;
    const y = e.clientY - rect.top + scrollTop;

    const step = Math.floor(x / GRID_WIDTH);
    const trackIndex = Math.floor(y / GRID_HEIGHT);

    if (step < 0 || step >= TOTAL_STEPS || trackIndex < 0 || trackIndex >= tracks.length) return;

    const start = dragStartRef.current;
    if (start && (start.step !== step || start.trackIndex !== trackIndex)) {
      const pitch = getDefaultPitchForTrack(trackIndex);
      onNoteToggle(tracks[trackIndex].id, step, pitch);
      dragStartRef.current = { step, trackIndex, x, y };
    }
  }, [isDraggingNote, tracks, onNoteToggle]);

  const handleGridMouseUp = useCallback(() => {
    setIsDraggingNote(false);
    dragStartRef.current = null;
  }, []);

  useEffect(() => {
    if (isDraggingNote) {
      const handleUp = () => {
        setIsDraggingNote(false);
        dragStartRef.current = null;
      };
      window.addEventListener('mouseup', handleUp);
      return () => window.removeEventListener('mouseup', handleUp);
    }
  }, [isDraggingNote]);

  const handleLoopDragStart = useCallback((type: 'start' | 'end', e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingLoop(type);
  }, []);

  const handleLoopDrag = useCallback((e: MouseEvent) => {
    if (!draggingLoop || !scrollContainerRef.current) return;

    const rect = scrollContainerRef.current.getBoundingClientRect();
    const scrollLeft = scrollContainerRef.current.scrollLeft;
    const x = e.clientX - rect.left + scrollLeft;

    let step = Math.round(x / GRID_WIDTH);
    step = Math.max(0, Math.min(TOTAL_STEPS - 1, step));

    if (draggingLoop === 'start') {
      onLoopChange(Math.min(step, loopEnd - 1), loopEnd);
    } else {
      onLoopChange(loopStart, Math.max(step, loopStart + 1));
    }
  }, [draggingLoop, loopStart, loopEnd, onLoopChange]);

  const handleLoopDragEnd = useCallback(() => {
    setDraggingLoop(null);
  }, []);

  useEffect(() => {
    if (draggingLoop) {
      window.addEventListener('mousemove', handleLoopDrag);
      window.addEventListener('mouseup', handleLoopDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleLoopDrag);
      window.removeEventListener('mouseup', handleLoopDragEnd);
    };
  }, [draggingLoop, handleLoopDrag, handleLoopDragEnd]);

  const renderTimeline = () => {
    const markers = [];
    for (let bar = 0; bar <= TOTAL_BARS; bar++) {
      const step = bar * STEPS_PER_BAR;
      markers.push(
        <div
          key={bar}
          style={{
            position: 'absolute',
            left: `${step * GRID_WIDTH}px`,
            top: 0,
            height: '40px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            pointerEvents: 'none',
          }}
        >
          <div style={{ width: '1px', height: '10px', backgroundColor: '#3a3a5e' }} />
          <span style={{ color: '#888899', fontSize: '10px', padding: '2px 6px', fontWeight: 600 }}>
            {bar + 1}
          </span>
        </div>
      );
    }
    for (let beat = 0; beat < TOTAL_STEPS; beat += 4) {
      if (beat % STEPS_PER_BAR !== 0) {
        markers.push(
          <div
            key={`beat-${beat}`}
            style={{
              position: 'absolute',
              left: `${beat * GRID_WIDTH}px`,
              top: 0,
              width: '1px',
              height: '6px',
              backgroundColor: '#2a2a3e',
              pointerEvents: 'none',
            }}
          />
        );
      }
    }
    return markers;
  };

  const renderTrackLabels = () => {
    return tracks.map((track, idx) => (
      <div
        key={track.id}
        style={{
          position: 'absolute',
          left: 0,
          top: `${idx * GRID_HEIGHT}px`,
          height: `${GRID_HEIGHT}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: '8px',
          color: '#666677',
          fontSize: '10px',
          pointerEvents: 'none',
        }}
      >
        <span style={{
          width: '3px',
          height: '60%',
          backgroundColor: INSTRUMENT_COLORS[track.instrument],
          marginRight: '6px',
          borderRadius: '2px',
        }} />
        <span style={{ maxWidth: '50px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {track.name}
        </span>
      </div>
    ));
  };

  const renderGrid = () => {
    const cells = [];
    for (let step = 0; step < TOTAL_STEPS; step++) {
      const isBarLine = step % STEPS_PER_BAR === 0;
      const isBeatLine = step % 4 === 0;
      for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
        cells.push(
          <div
            key={`cell-${step}-${trackIndex}`}
            style={{
              position: 'absolute',
              left: `${step * GRID_WIDTH}px`,
              top: `${trackIndex * GRID_HEIGHT}px`,
              width: `${GRID_WIDTH}px`,
              height: `${GRID_HEIGHT}px`,
              boxSizing: 'border-box',
              borderLeft: isBarLine ? '1px solid #3a3a5e' : isBeatLine ? '1px solid #2a2a3e' : '1px solid #1a1a2a',
              borderTop: '1px solid #1e1e2e',
            }}
          />
        );
      }
    }
    return cells;
  };

  const renderNotes = () => {
    const notesByStep: Record<string, Note> = {};
    notes.forEach(note => {
      notesByStep[`${note.trackId}-${note.step}`] = note;
    });

    return notes.map((note) => {
      const trackIndex = tracks.findIndex(t => t.id === note.trackId);
      if (trackIndex === -1) return null;

      const color = getInstrumentColor(note.trackId);

      return (
        <div
          key={note.id}
          className="note-block"
          style={{
            position: 'absolute',
            left: `${note.step * GRID_WIDTH + 2}px`,
            top: `${trackIndex * GRID_HEIGHT + 2}px`,
            width: `${GRID_WIDTH - 4}px`,
            height: `${GRID_HEIGHT - 4}px`,
            backgroundColor: color,
            borderRadius: '4px',
            cursor: 'pointer',
            zIndex: 10,
            boxShadow: `inset 0 -2px 0 rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.2)`,
          }}
          onMouseEnter={(e) => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
              setHoveredNote({
                note,
                x: e.clientX - rect.left + 12,
                y: e.clientY - rect.top - 32,
              });
            }
          }}
          onMouseLeave={() => setHoveredNote(null)}
          onClick={(e) => {
            e.stopPropagation();
            onNoteToggle(note.trackId, note.step, note.pitch);
          }}
        />
      );
    });
  };

  const renderPlayhead = () => {
    const playheadX = currentStep * GRID_WIDTH + GRID_WIDTH / 2;
    return (
      <div
        className="playhead-line"
        style={{
          position: 'absolute',
          left: `${playheadX}px`,
          top: 0,
          width: '2px',
          height: `40px + ${totalGridHeight}px`,
          backgroundColor: '#ffffff',
          pointerEvents: 'none',
          zIndex: 30,
        }}
      >
        <div style={{
          position: 'absolute',
          top: '-6px',
          left: '-5px',
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '8px solid #ffffff',
        }} />
      </div>
    );
  };

  const renderLoopMarkers = () => {
    const startX = loopStart * GRID_WIDTH;
    const endX = loopEnd * GRID_WIDTH;
    const height = `calc(40px + ${totalGridHeight}px)`;

    return (
      <>
        <div
          style={{
            position: 'absolute',
            left: `${startX}px`,
            top: 0,
            width: `${endX - startX}px`,
            height,
            backgroundColor: 'rgba(102, 126, 234, 0.08)',
            borderLeft: '2px solid rgba(102, 126, 234, 0.5)',
            borderRight: '2px solid rgba(102, 126, 234, 0.5)',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `${startX - 10}px`,
            top: '2px',
            width: '20px',
            height: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 25,
            cursor: draggingLoop === 'start' ? 'grabbing' : 'grab',
            backgroundColor: 'rgba(102, 126, 234, 0.9)',
            borderRadius: '4px 4px 0 0',
            userSelect: 'none',
          }}
          onMouseDown={(e) => handleLoopDragStart('start', e)}
          title="循环起始 - 拖拽调整"
        >
          <div style={{
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '7px solid #ffffff',
          }} />
        </div>
        <div
          style={{
            position: 'absolute',
            left: `${endX - 10}px`,
            top: '2px',
            width: '20px',
            height: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 25,
            cursor: draggingLoop === 'end' ? 'grabbing' : 'grab',
            backgroundColor: 'rgba(102, 126, 234, 0.9)',
            borderRadius: '4px 4px 0 0',
            userSelect: 'none',
          }}
          onMouseDown={(e) => handleLoopDragStart('end', e)}
          title="循环结束 - 拖拽调整"
        >
          <div style={{
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderBottom: '7px solid #ffffff',
          }} />
        </div>
      </>
    );
  };

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#12122a',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        ref={scrollContainerRef}
        style={{
          flex: 1,
          overflow: 'auto',
          position: 'relative',
          cursor: isDraggingNote ? 'crosshair' : 'default',
        }}
        onMouseDown={handleGridMouseDown}
        onMouseMove={handleGridMouseMove}
        onMouseUp={handleGridMouseUp}
      >
        <div
          style={{
            position: 'relative',
            width: `${totalGridWidth}px`,
            height: `calc(40px + ${totalGridHeight}px)`,
            minWidth: '100%',
            paddingLeft: '60px',
          }}
        >
          {renderTimeline()}
          {renderLoopMarkers()}
          {renderGrid()}
          {renderNotes()}
          {renderPlayhead()}
        </div>

        <div style={{
          position: 'sticky',
          left: 0,
          top: 0,
          width: '60px',
          zIndex: 40,
          pointerEvents: 'none',
          marginTop: `-${40 + totalGridHeight}px`,
        }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: '60px' }}>
            <div style={{ height: '40px', backgroundColor: '#12122a', borderBottom: '1px solid #2a2a3e' }} />
            {renderTrackLabels()}
          </div>
        </div>
      </div>

      {hoveredNote && (
        <div
          style={{
            position: 'fixed',
            left: `${hoveredNote.x}px`,
            top: `${hoveredNote.y}px`,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            color: '#e0e0e0',
            borderRadius: '4px',
            padding: '6px 10px',
            zIndex: 1000,
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            border: '1px solid #2a2a45',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '2px' }}>
            🎵 {getPitchName(hoveredNote.note.pitch)}
          </div>
          <div style={{ fontSize: '10px', color: '#888899' }}>
            力度: {hoveredNote.note.velocity} · 步长: {hoveredNote.note.step}
          </div>
        </div>
      )}

      <style>{`
        .note-block {
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), 
                      box-shadow 0.2s ease;
          animation: breathe 2s ease-in-out infinite;
        }
        .note-block:hover {
          transform: scale(1.15);
          box-shadow: inset 0 -2px 0 rgba(0,0,0,0.25), 
                      0 0 16px rgba(255, 255, 255, 0.25),
                      0 4px 8px rgba(0,0,0,0.3);
          z-index: 20;
          animation: none;
        }
        @keyframes breathe {
          0%, 100% { 
            transform: scale(1); 
            opacity: 1;
          }
          50% { 
            transform: scale(1.04); 
            opacity: 0.92;
          }
        }
        .playhead-line {
          animation: playhead-glow 0.3s ease-in-out infinite alternate;
        }
        @keyframes playhead-glow {
          from {
            box-shadow: 0 0 3px rgba(255, 255, 255, 0.4),
                        0 0 6px rgba(255, 255, 255, 0.2);
          }
          to {
            box-shadow: 0 0 8px rgba(255, 255, 255, 0.9),
                        0 0 16px rgba(255, 255, 255, 0.5),
                        0 0 24px rgba(102, 126, 234, 0.3);
          }
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          cursor: pointer;
          transition: transform 0.2s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.25);
        }
      `}</style>
    </div>
  );
};
