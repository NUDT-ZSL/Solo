import React, { useState, useRef, useEffect, useCallback } from 'react';
import { InstrumentType, EnsembleMode, Note, EnsembleResult, Measure, INSTRUMENTS, MODE_COLORS } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface RehearsalRoomProps {
  instrument: InstrumentType;
  onComplete: (result: EnsembleResult) => void;
}

const TOTAL_MEASURES = 8;

export default function RehearsalRoom({ instrument, onComplete }: RehearsalRoomProps) {
  const [mode, setMode] = useState<EnsembleMode>('align');
  const [currentMeasure, setCurrentMeasure] = useState(1);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [draggingNote, setDraggingNote] = useState<Note | null>(null);
  const [dragPath, setDragPath] = useState<{ x: number; y: number }[]>([]);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [measures, setMeasures] = useState<Measure[]>([]);
  const [startTime, setStartTime] = useState(Date.now());
  const staffRef = useRef<HTMLDivElement>(null);
  const velocityRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const instrumentConfig = INSTRUMENTS.find((i) => i.id === instrument)!;
  const modeColor = MODE_COLORS[mode];

  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      .mode-dropdown {
        transition: height 0.3s ease-out, opacity 0.3s ease-out;
        overflow: hidden;
      }
      .mode-dropdown.collapsed {
        height: 0 !important;
        opacity: 0 !important;
      }
      .mode-dropdown.expanded {
        height: 36px !important;
        opacity: 1 !important;
      }
      .note-dragging {
        transform: scale(1.2) !important;
        z-index: 100 !important;
      }
      .staff-line {
        position: absolute;
        left: 0;
        right: 0;
        height: 1px;
        background-color: rgba(255,255,255,0.3);
      }
      .progress-bar-fill {
        transition: width 0.1s linear;
      }
      .note-deleting {
        animation: noteDelete 0.3s ease-out forwards;
      }
      @keyframes noteDelete {
        0% { opacity: 1; transform: scale(1); }
        100% { opacity: 0; transform: scale(0.5) translateX(50px); }
      }
    `;
    document.head.appendChild(styleSheet);
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  const playBeep = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 880;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch (e) {
      console.log('Audio not supported');
    }
  }, []);

  const handleStaffClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!staffRef.current || draggingNote) return;
      const rect = staffRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const pitch = Math.floor((1 - y / rect.height) * 12);
      const beat = Math.floor((x / rect.width) * 4);
      const newNote: Note = {
        id: uuidv4(),
        instrument,
        pitch: Math.max(0, Math.min(11, pitch)),
        beat: Math.max(0, Math.min(3, beat)),
        duration: 1,
        x,
        y,
      };
      setNotes((prev) => [...prev, newNote]);
    },
    [instrument, draggingNote]
  );

  const handleNoteMouseDown = useCallback(
    (e: React.MouseEvent, note: Note) => {
      e.stopPropagation();
      setDraggingNote(note);
      setDragPath([{ x: e.clientX, y: e.clientY }]);
      velocityRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingNote || !staffRef.current) return;
      const rect = staffRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      setDragPath((prev) => [...prev, { x: e.clientX, y: e.clientY }]);
      const now = Date.now();
      velocityRef.current = { x: e.clientX, y: e.clientY, time: now };
      setNotes((prev) =>
        prev.map((n) =>
          n.id === draggingNote.id
            ? {
                ...n,
                x,
                y,
                pitch: Math.max(0, Math.min(11, Math.floor((1 - y / rect.height) * 12))),
                beat: Math.max(0, Math.min(3, Math.floor((x / rect.width) * 4))),
              }
            : n
        )
      );
    },
    [draggingNote]
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!draggingNote) return;
      if (velocityRef.current) {
        const dt = (Date.now() - velocityRef.current.time) / 1000;
        if (dt > 0 && dt < 0.1) {
          const dx = e.clientX - velocityRef.current.x;
          const dy = e.clientY - velocityRef.current.y;
          const speed = Math.sqrt(dx * dx + dy * dy) / dt;
          if (speed > 500) {
            setNotes((prev) => prev.filter((n) => n.id !== draggingNote.id));
            setDraggingNote(null);
            setDragPath([]);
            return;
          }
        }
      }
      setDraggingNote(null);
      setDragPath([]);
    },
    [draggingNote]
  );

  const handleNoteDoubleClick = useCallback(
    (e: React.MouseEvent, noteId: string) => {
      e.stopPropagation();
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    },
    []
  );

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleCompleteMeasure = useCallback(() => {
    playBeep();
    const newMeasure: Measure = {
      measureNumber: currentMeasure,
      notes: [...notes],
      completed: true,
    };
    const updatedMeasures = [...measures, newMeasure];
    setMeasures(updatedMeasures);

    if (currentMeasure >= TOTAL_MEASURES) {
      const instrumentActivity: Record<InstrumentType, number> = {
        piano: 0,
        violin: 0,
        cello: 0,
        flute: 0,
        percussion: 0,
      };
      updatedMeasures.forEach((m) => {
        m.notes.forEach((n) => {
          instrumentActivity[n.instrument]++;
        });
      });
      const result: EnsembleResult = {
        sessionId: uuidv4(),
        totalDuration: Math.floor((Date.now() - startTime) / 1000),
        measures: updatedMeasures,
        instrumentActivity,
        mode,
        createdAt: Date.now(),
      };
      onComplete(result);
    } else {
      setCurrentMeasure((prev) => prev + 1);
      setNotes([]);
    }
  }, [currentMeasure, notes, measures, mode, startTime, onComplete, playBeep]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsPlaying(false);
          return 100;
        }
        return prev + 2;
      });
    }, 50);
  }, []);

  const renderStaffLines = () => {
    const lines = [];
    for (let i = 0; i < 5; i++) {
      lines.push(
        <div
          key={i}
          className="staff-line"
          style={{ top: `${20 + i * 15}%` }}
        />
      );
    }
    return lines;
  };

  const renderDragPath = () => {
    if (dragPath.length < 2 || !staffRef.current) return null;
    const rect = staffRef.current.getBoundingClientRect();
    const pathData = dragPath
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x - rect.left} ${p.y - rect.top}`)
      .join(' ');
    return (
      <svg style={styles.dragPathSvg}>
        <path
          d={pathData}
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="2"
          strokeDasharray="5,5"
          fill="none"
        />
      </svg>
    );
  };

  const modes: { id: EnsembleMode; name: string }[] = [
    { id: 'align', name: '对齐模式' },
    { id: 'follow', name: '跟随模式' },
    { id: 'free', name: '自由模式' },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.measureCounter}>
          小节 {String(currentMeasure).padStart(3, '0')} / {String(TOTAL_MEASURES).padStart(3, '0')}
        </div>
        <div style={styles.modeSelector}>
          <button
            style={{ ...styles.modeToggle, background: `linear-gradient(135deg, ${modeColor}, ${modeColor}99)` }}
            onClick={() => setShowModeDropdown(!showModeDropdown)}
          >
            {modes.find((m) => m.id === mode)?.name} ▼
          </button>
          <div className={`mode-dropdown ${showModeDropdown ? 'expanded' : 'collapsed'}`} style={styles.modeDropdown}>
            {modes.map((m) => (
              <button
                key={m.id}
                style={{
                  ...styles.modeButton,
                  background: `linear-gradient(135deg, ${MODE_COLORS[m.id]}, ${MODE_COLORS[m.id]}99)`,
                }}
                onClick={() => {
                  setMode(m.id);
                  setShowModeDropdown(false);
                }}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        ref={staffRef}
        style={styles.staffArea}
        onClick={handleStaffClick}
      >
        {renderStaffLines()}
        {renderDragPath()}
        {notes.map((note) => (
          <div
            key={note.id}
            className={draggingNote?.id === note.id ? 'note-dragging' : ''}
            style={{
              ...styles.note,
              backgroundColor: instrumentConfig.color + 'cc',
              left: note.x - 20,
              top: note.y - 14,
              transform: draggingNote?.id === note.id ? 'scale(1.2)' : 'scale(1)',
              transition: draggingNote?.id === note.id ? 'none' : 'transform 0.2s ease-out',
            }}
            onMouseDown={(e) => handleNoteMouseDown(e, note)}
            onDoubleClick={(e) => handleNoteDoubleClick(e, note.id)}
          />
        ))}
      </div>

      <div style={styles.footer}>
        <div style={styles.progressBar}>
          <div
            className="progress-bar-fill"
            style={{
              ...styles.progressFill,
              width: `${progress}%`,
              backgroundColor: modeColor,
            }}
          />
        </div>
        <div style={styles.buttonGroup}>
          <button
            style={{ ...styles.playButton, backgroundColor: modeColor }}
            onClick={handlePlay}
            disabled={isPlaying}
          >
            {isPlaying ? '播放中...' : '播放预览'}
          </button>
          <button
            style={{ ...styles.completeButton, backgroundColor: modeColor }}
            onClick={handleCompleteMeasure}
          >
            完成当前小节
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: '100vh',
    padding: '20px',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    boxSizing: 'border-box',
  },
  header: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  measureCounter: {
    color: '#ffffff',
    fontSize: '24px',
    fontWeight: 'bold',
    fontFamily: "'Playfair Display', serif",
  },
  modeSelector: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  modeToggle: {
    padding: '8px 20px',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s ease-out',
  },
  modeDropdown: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
  },
  modeButton: {
    padding: '6px 16px',
    border: 'none',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'transform 0.2s ease-out',
  },
  staffArea: {
    width: '85%',
    height: '60%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: '24px',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'crosshair',
  },
  note: {
    position: 'absolute',
    width: '40px',
    height: '28px',
    borderRadius: '50%',
    cursor: 'grab',
    transition: 'transform 0.2s ease-out',
    zIndex: 10,
  },
  dragPathSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  footer: {
    width: '100%',
    marginTop: '20px',
  },
  progressBar: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    backgroundColor: '#4a4a5a',
    overflow: 'hidden',
    marginBottom: '20px',
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
  },
  playButton: {
    padding: '12px 32px',
    border: 'none',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s ease-out, opacity 0.2s ease-out',
  },
  completeButton: {
    padding: '12px 32px',
    border: 'none',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s ease-out',
  },
};
