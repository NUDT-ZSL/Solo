import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  const [hoveredNote, setHoveredNote] = useState<HoveredNote | null>(null);
  const [draggingLoop, setDraggingLoop] = useState<'start' | 'end' | null>(null);
  const scrollLeftRef = useRef(0);

  const pitchRange = 36;
  const startPitch = 48;

  const getPitchName = (midiPitch: number): string => {
    const octave = Math.floor(midiPitch / 12) - 1;
    const noteName = PITCH_NAMES[midiPitch % 12];
    return `${noteName}${octave}`;
  };

  const getInstrumentColor = (trackId: string): string => {
    const track = tracks.find(t => t.id === trackId);
    return track ? INSTRUMENT_COLORS[track.instrument as InstrumentType] : '#666';
  };

  const handleGridClick = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const scrollLeft = containerRef.current.scrollLeft;
    const scrollTop = containerRef.current.scrollTop;

    const x = e.clientX - rect.left + scrollLeft - 60;
    const y = e.clientY - rect.top + scrollTop - 40;

    if (x < 0 || y < 0) return;

    const step = Math.floor(x / GRID_WIDTH);
    const trackIndex = Math.floor(y / GRID_HEIGHT);

    if (step < 0 || step >= TOTAL_STEPS || trackIndex < 0 || trackIndex >= tracks.length) return;

    const pitch = startPitch + (pitchRange - 1 - (trackIndex % pitchRange));
    const track = tracks[trackIndex];

    if (track) {
      onNoteToggle(track.id, step, pitch);
    }
  }, [tracks, onNoteToggle]);

  const handleNoteHover = useCallback((note: Note | null, e?: React.MouseEvent) => {
    if (note && e && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setHoveredNote({
        note,
        x: e.clientX - rect.left + 10,
        y: e.clientY - rect.top - 30,
      });
    } else {
      setHoveredNote(null);
    }
  }, []);

  const handleLoopDragStart = (type: 'start' | 'end', e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingLoop(type);
  };

  const handleLoopDrag = useCallback((e: MouseEvent) => {
    if (!draggingLoop || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const scrollLeft = containerRef.current.scrollLeft;
    const x = e.clientX - rect.left + scrollLeft - 60;

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
            ...styles.timelineMarker,
            left: `${60 + step * GRID_WIDTH}px`,
          }}
        >
          <div style={styles.timelineBarLine} />
          <span style={styles.timelineLabel}>{bar + 1}</span>
        </div>
      );
    }
    return markers;
  };

  const renderGrid = () => {
    const cells = [];
    for (let step = 0; step < TOTAL_STEPS; step++) {
      for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
        const isBarLine = step % STEPS_PER_BAR === 0;
        const isBeatLine = step % 4 === 0;
        cells.push(
          <div
            key={`${step}-${trackIndex}`}
            style={{
              ...styles.gridCell,
              left: `${60 + step * GRID_WIDTH}px`,
              top: `${40 + trackIndex * GRID_HEIGHT}px`,
              width: `${GRID_WIDTH}px`,
              height: `${GRID_HEIGHT}px`,
              borderLeft: isBarLine ? '1px solid #3a3a5e' : isBeatLine ? '1px solid #2a2a3e' : '1px solid #1e1e2e',
              borderTop: '1px solid #2a2a3e',
            }}
          />
        );
      }
    }
    return cells;
  };

  const renderNotes = () => {
    return notes.map((note) => {
      const trackIndex = tracks.findIndex(t => t.id === note.trackId);
      if (trackIndex === -1) return null;

      const pitchOffset = pitchRange - 1 - (note.pitch - startPitch);
      const displayTrackIndex = trackIndex;

      return (
        <div
          key={note.id}
          style={{
            ...styles.noteBlock,
            left: `${60 + note.step * GRID_WIDTH + 1}px`,
            top: `${40 + displayTrackIndex * GRID_HEIGHT + 1}px`,
            width: `${GRID_WIDTH - 2}px`,
            height: `${GRID_HEIGHT - 2}px`,
            backgroundColor: getInstrumentColor(note.trackId),
          }}
          className="note-block"
          onMouseEnter={(e) => handleNoteHover(note, e)}
          onMouseLeave={() => handleNoteHover(null)}
          onClick={(e) => {
            e.stopPropagation();
            onNoteToggle(note.trackId, note.step, note.pitch);
          }}
        />
      );
    });
  };

  const renderPlayhead = () => {
    const playheadX = 60 + currentStep * GRID_WIDTH + GRID_WIDTH / 2;
    return (
      <div
        style={{
          ...styles.playhead,
          left: `${playheadX}px`,
          height: `${40 + tracks.length * GRID_HEIGHT}px`,
        }}
        className="playhead"
      />
    );
  };

  const renderLoopMarkers = () => {
    const startX = 60 + loopStart * GRID_WIDTH;
    const endX = 60 + loopEnd * GRID_WIDTH;

    return (
      <>
        <div
          style={{
            ...styles.loopRange,
            left: `${startX}px`,
            width: `${endX - startX}px`,
            height: `${40 + tracks.length * GRID_HEIGHT}px`,
          }}
        />
        <div
          style={{
            ...styles.loopMarker,
            left: `${startX - 8}px`,
            cursor: draggingLoop === 'start' ? 'grabbing' : 'grab',
          }}
          onMouseDown={(e) => handleLoopDragStart('start', e)}
          title="循环起始"
        >
          <div style={styles.loopTriangle} />
        </div>
        <div
          style={{
            ...styles.loopMarker,
            left: `${endX - 8}px`,
            cursor: draggingLoop === 'end' ? 'grabbing' : 'grab',
          }}
          onMouseDown={(e) => handleLoopDragStart('end', e)}
          title="循环结束"
        >
          <div style={{ ...styles.loopTriangle, transform: 'rotate(180deg)' }} />
        </div>
      </>
    );
  };

  const renderPitchLabels = () => {
    const labels = [];
    for (let i = 0; i < pitchRange && i < tracks.length; i++) {
      const pitch = startPitch + (pitchRange - 1 - i);
      if (pitch % 12 === 0) {
        labels.push(
          <div
            key={i}
            style={{
              ...styles.pitchLabel,
              top: `${40 + i * GRID_HEIGHT}px`,
              height: `${GRID_HEIGHT}px`,
            }}
          >
            {getPitchName(pitch)}
          </div>
        );
      }
    }
    return labels;
  };

  return (
    <div style={styles.sequencerContainer}>
      <div
        ref={containerRef}
        style={styles.gridContainer}
        onClick={handleGridClick}
        onScroll={(e) => {
          scrollLeftRef.current = e.currentTarget.scrollLeft;
        }}
      >
        <div
          style={{
            ...styles.gridInner,
            width: `${60 + TOTAL_STEPS * GRID_WIDTH}px`,
            height: `${40 + tracks.length * GRID_HEIGHT}px`,
          }}
        >
          {renderTimeline()}
          {renderPitchLabels()}
          {renderGrid()}
          {renderLoopMarkers()}
          {renderNotes()}
          {renderPlayhead()}

          {hoveredNote && (
            <div
              style={{
                ...styles.noteTooltip,
                left: `${hoveredNote.x}px`,
                top: `${hoveredNote.y}px`,
              }}
            >
              <div style={styles.tooltipText}>
                {getPitchName(hoveredNote.note.pitch)}
              </div>
              <div style={styles.tooltipSubtext}>
                力度: {hoveredNote.note.velocity}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .note-block {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          z-index: 10;
        }
        .note-block:hover {
          transform: scale(1.1);
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
          z-index: 20;
        }
        .playhead {
          animation: playhead-glow 0.3s ease-in-out infinite alternate;
          z-index: 30;
        }
        @keyframes playhead-glow {
          from {
            box-shadow: 0 0 4px rgba(255, 255, 255, 0.5);
          }
          to {
            box-shadow: 0 0 12px rgba(255, 255, 255, 0.9);
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
          transform: scale(1.2);
        }
        select:hover {
          border-color: #667eea !important;
        }
        button:hover {
          opacity: 0.85;
          transform: scale(1.05);
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  sequencerContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#12122a',
    overflow: 'hidden',
  },
  gridContainer: {
    flex: 1,
    overflow: 'auto',
    position: 'relative',
  },
  gridInner: {
    position: 'relative',
    minWidth: '100%',
  },
  timelineMarker: {
    position: 'absolute',
    top: 0,
    height: '40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    pointerEvents: 'none',
  },
  timelineBarLine: {
    width: '1px',
    height: '8px',
    backgroundColor: '#3a3a5e',
  },
  timelineLabel: {
    color: '#888899',
    fontSize: '10px',
    padding: '2px 4px',
  },
  pitchLabel: {
    position: 'absolute',
    left: 0,
    width: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: '8px',
    color: '#666677',
    fontSize: '10px',
    borderRight: '1px solid #2a2a3e',
    boxSizing: 'border-box',
    pointerEvents: 'none',
  },
  gridCell: {
    position: 'absolute',
    boxSizing: 'border-box',
    cursor: 'crosshair',
  },
  noteBlock: {
    position: 'absolute',
    borderRadius: '3px',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  playhead: {
    position: 'absolute',
    top: 0,
    width: '2px',
    backgroundColor: '#ffffff',
    pointerEvents: 'none',
  },
  loopRange: {
    position: 'absolute',
    top: 0,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderLeft: '1px solid rgba(102, 126, 234, 0.5)',
    borderRight: '1px solid rgba(102, 126, 234, 0.5)',
    pointerEvents: 'none',
    zIndex: 5,
  },
  loopMarker: {
    position: 'absolute',
    top: '2px',
    width: '16px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 25,
  },
  loopTriangle: {
    width: 0,
    height: 0,
    borderLeft: '6px solid transparent',
    borderRight: '6px solid transparent',
    borderTop: '8px solid #667eea',
  },
  noteTooltip: {
    position: 'fixed',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: '4px',
    padding: '6px 10px',
    zIndex: 100,
    pointerEvents: 'none',
  },
  tooltipText: {
    color: '#e0e0e0',
    fontSize: '12px',
    fontWeight: 600,
  },
  tooltipSubtext: {
    color: '#888899',
    fontSize: '10px',
    marginTop: '2px',
  },
};
