import { useState, useCallback, useEffect, useRef } from 'react';
import { Play, Square, Save, Undo2, Redo2, RotateCcw } from 'lucide-react';
import * as Tone from 'tone';
import { v4 as uuidv4 } from 'uuid';
import {
  Note,
  Score,
  Duration,
  createEmptyNotes,
  pitchToNoteName,
  MAX_MEASURES,
  BEATS_PER_MEASURE,
  PITCH_NAMES,
  OCTAVE_LABELS,
  DURATION_MAP,
  DURATION_BEATS,
} from '../types';

const STORAGE_KEY = 'score-mark-scores';

interface HistoryState {
  past: (Note | null)[][][];
  future: (Note | null)[][][];
}

export default function ScoreEditor({
  showToast,
  triggerRefresh,
}: {
  showToast: (msg: string) => void;
  triggerRefresh: () => void;
}) {
  const [title, setTitle] = useState('未命名乐谱');
  const [notes, setNotes] = useState<(Note | null)[][]>(createEmptyNotes);
  const [selectedPitch, setSelectedPitch] = useState(1);
  const [selectedOctave, setSelectedOctave] = useState(1);
  const [selectedSharp, setSelectedSharp] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<Duration>('quarter');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingCell, setPlayingCell] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryState>({ past: [], future: [] });
  const [flashKey, setFlashKey] = useState(0);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    measure: number;
    beat: number;
  } | null>(null);
  const [longPressNote, setLongPressNote] = useState<{
    measure: number;
    beat: number;
    x: number;
    y: number;
  } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const synthRef = useRef<Tone.Synth | null>(null);
  const playbackRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isDragging = useRef(false);

  useEffect(() => {
    synthRef.current = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.2 },
    }).toDestination();
    return () => {
      synthRef.current?.dispose();
      playbackRef.current.forEach(clearTimeout);
    };
  }, []);

  const pushHistory = useCallback(
    (newNotes: (Note | null)[][]) => {
      setHistory(prev => ({
        past: [...prev.past.slice(-(19)), notes.map(m => [...m])],
        future: [],
      }));
    },
    [notes]
  );

  const doUndo = useCallback(() => {
    setHistory(prev => {
      if (prev.past.length === 0) return prev;
      const newPast = [...prev.past];
      const snapshot = newPast.pop()!;
      setNotes(snapshot);
      setFlashKey(k => k + 1);
      return { past: newPast, future: [notes.map(m => [...m]), ...prev.future] };
    });
  }, [notes]);

  const doRedo = useCallback(() => {
    setHistory(prev => {
      if (prev.future.length === 0) return prev;
      const newFuture = [...prev.future];
      const snapshot = newFuture.shift()!;
      setNotes(snapshot);
      setFlashKey(k => k + 1);
      return { past: [...prev.past, notes.map(m => [...m])], future: newFuture };
    });
  }, [notes]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        doUndo();
      }
      if (e.ctrlKey && e.shiftKey && (e.key === 'Z' || e.key === 'z')) {
        e.preventDefault();
        doRedo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [doUndo, doRedo]);

  const placeNote = useCallback(
    (measure: number, beat: number) => {
      const existing = notes[measure][beat];
      if (
        existing &&
        existing.pitch === selectedPitch &&
        existing.octave === selectedOctave &&
        existing.sharp === selectedSharp &&
        existing.duration === selectedDuration
      ) {
        return;
      }
      pushHistory(notes);
      setNotes(prev => {
        const next = prev.map(m => [...m]);
        next[measure][beat] = {
          pitch: selectedPitch,
          octave: selectedOctave,
          sharp: selectedSharp,
          duration: selectedDuration,
        };
        return next;
      });
    },
    [notes, selectedPitch, selectedOctave, selectedSharp, selectedDuration, pushHistory]
  );

  const removeNote = useCallback(
    (measure: number, beat: number) => {
      if (!notes[measure][beat]) return;
      pushHistory(notes);
      setNotes(prev => {
        const next = prev.map(m => [...m]);
        next[measure][beat] = null;
        return next;
      });
    },
    [notes, pushHistory]
  );

  const handleMouseDown = useCallback(
    (measure: number, beat: number, e: React.MouseEvent) => {
      if (e.button === 2) {
        e.preventDefault();
        removeNote(measure, beat);
        return;
      }
      if (e.button === 0) {
        isDragging.current = true;
        placeNote(measure, beat);
      }
    },
    [placeNote, removeNote]
  );

  const handleMouseEnter = useCallback(
    (measure: number, beat: number) => {
      if (isDragging.current) {
        placeNote(measure, beat);
      }
    },
    [placeNote]
  );

  useEffect(() => {
    const up = () => {
      isDragging.current = false;
    };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  const handleLongPressStart = useCallback(
    (measure: number, beat: number, e: React.MouseEvent | React.TouchEvent) => {
      if (!notes[measure][beat]) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      longPressTimer.current = setTimeout(() => {
        setLongPressNote({ measure, beat, x: rect.right + 4, y: rect.top });
      }, 500);
    },
    [notes]
  );

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const updateLongPressNote = useCallback(
    (field: 'duration' | 'octave', value: Duration | number) => {
      if (!longPressNote) return;
      const { measure, beat } = longPressNote;
      pushHistory(notes);
      setNotes(prev => {
        const next = prev.map(m => [...m]);
        const n = next[measure][beat];
        if (n) {
          next[measure][beat] = { ...n, [field]: value };
        }
        return next;
      });
      setLongPressNote(null);
    },
    [longPressNote, notes, pushHistory]
  );

  const handleSave = useCallback(() => {
    const score: Score = {
      id: uuidv4(),
      title,
      notes: notes.map(m => m.map(n => (n ? { ...n } : null))),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const scores: Score[] = stored ? JSON.parse(stored) : [];
      scores.unshift(score);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
      showToast('乐谱保存成功！');
      triggerRefresh();
    } catch {
      showToast('保存失败，请重试');
    }
  }, [title, notes, showToast, triggerRefresh]);

  const stopPlayback = useCallback(() => {
    playbackRef.current.forEach(clearTimeout);
    playbackRef.current = [];
    setIsPlaying(false);
    setPlayingCell(null);
  }, []);

  const handlePlay = useCallback(async () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }
    await Tone.start();
    if (!synthRef.current) return;
    setIsPlaying(true);

    const seq: { note: Note; measure: number; beat: number }[] = [];
    for (let m = 0; m < MAX_MEASURES; m++) {
      for (let b = 0; b < BEATS_PER_MEASURE; b++) {
        const n = notes[m][b];
        if (n) seq.push({ note: n, measure: m, beat: b });
      }
    }

    if (seq.length === 0) {
      stopPlayback();
      return;
    }

    const bpm = 120;
    const beatDuration = 60 / bpm;
    let offset = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    seq.forEach(item => {
      const startOffset = offset * 1000;
      const dur = DURATION_BEATS[item.note.duration] * beatDuration;

      const playTimer = setTimeout(() => {
        const noteName = pitchToNoteName(item.note.pitch, item.note.octave, item.note.sharp);
        try {
          synthRef.current?.triggerAttackRelease(noteName, dur * 0.9);
        } catch { /* ignore */ }
        setPlayingCell(`${item.measure}-${item.beat}`);
      }, startOffset);

      const clearTimer = setTimeout(() => {
        setPlayingCell(prev => (prev === `${item.measure}-${item.beat}` ? null : prev));
      }, startOffset + dur * 1000);

      timers.push(playTimer, clearTimer);
      offset += DURATION_BEATS[item.note.duration];
    });

    const endTimer = setTimeout(() => {
      stopPlayback();
    }, offset * beatDuration * 1000 + 200);
    timers.push(endTimer);

    playbackRef.current = timers;
  }, [isPlaying, notes, stopPlayback]);

  const handleClear = useCallback(() => {
    pushHistory(notes);
    setNotes(createEmptyNotes());
  }, [notes, pushHistory]);

  const renderNoteLabel = (note: Note) => {
    const base = PITCH_NAMES[note.pitch - 1];
    const sharpStr = note.sharp ? '#' : '';
    let octaveStr = '';
    if (note.octave === 0) octaveStr = '̇';
    if (note.octave === 2) octaveStr = '̣';
    return `${sharpStr}${base}${octaveStr}`;
  };

  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => {
      setContextMenu(null);
      setLongPressNote(null);
    };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{
            background: '#16213e',
            border: '1px solid #2a2a4e',
            borderRadius: 8,
            padding: '8px 14px',
            color: '#e0e0e0',
            fontSize: 15,
            fontWeight: 600,
            flex: '0 1 260px',
            outline: 'none',
            fontFamily: 'inherit',
          }}
          placeholder="乐谱标题"
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          <span
            style={{
              fontSize: 11,
              color: '#8888aa',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
            title={`可撤销 ${history.past.length} 步`}
          >
            <Undo2 size={13} /> {history.past.length}
          </span>
          <span style={{ color: '#2a2a4e', margin: '0 2px' }}>|</span>
          <span
            style={{
              fontSize: 11,
              color: '#8888aa',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
            title={`可重做 ${history.future.length} 步`}
          >
            <Redo2 size={13} /> {history.future.length}
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          alignItems: 'center',
          padding: '10px 14px',
          background: '#16213e',
          borderRadius: 10,
          border: '1px solid #2a2a4e',
        }}
      >
        <span style={{ fontSize: 12, color: '#8888aa', marginRight: 4 }}>音符:</span>
        {PITCH_NAMES.map((name, i) => (
          <button
            key={i}
            onClick={() => setSelectedPitch(i + 1)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              border: selectedPitch === i + 1 ? '2px solid #e94560' : '1px solid #2a2a4e',
              background: selectedPitch === i + 1 ? 'rgba(233,69,96,0.15)' : '#1a1a2e',
              color: selectedPitch === i + 1 ? '#e94560' : '#e0e0e0',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              fontFamily: 'inherit',
            }}
          >
            {name}
          </button>
        ))}

        <span style={{ fontSize: 12, color: '#8888aa', marginLeft: 12, marginRight: 4 }}>升号:</span>
        <button
          onClick={() => setSelectedSharp(!selectedSharp)}
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            border: selectedSharp ? '2px solid #e94560' : '1px solid #2a2a4e',
            background: selectedSharp ? 'rgba(233,69,96,0.15)' : '#1a1a2e',
            color: selectedSharp ? '#e94560' : '#e0e0e0',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
            fontFamily: 'inherit',
          }}
        >
          #
        </button>

        <span style={{ fontSize: 12, color: '#8888aa', marginLeft: 12, marginRight: 4 }}>八度:</span>
        {OCTAVE_LABELS.map((label, i) => (
          <button
            key={i}
            onClick={() => setSelectedOctave(i)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: selectedOctave === i ? '2px solid #e94560' : '1px solid #2a2a4e',
              background: selectedOctave === i ? 'rgba(233,69,96,0.15)' : '#1a1a2e',
              color: selectedOctave === i ? '#e94560' : '#e0e0e0',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: 12,
              fontFamily: 'inherit',
            }}
          >
            {label}
          </button>
        ))}

        <span style={{ fontSize: 12, color: '#8888aa', marginLeft: 12, marginRight: 4 }}>音长:</span>
        {(['whole', 'half', 'quarter', 'eighth'] as Duration[]).map(d => (
          <button
            key={d}
            onClick={() => setSelectedDuration(d)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: selectedDuration === d ? '2px solid #e94560' : '1px solid #2a2a4e',
              background: selectedDuration === d ? 'rgba(233,69,96,0.15)' : '#1a1a2e',
              color: selectedDuration === d ? '#e94560' : '#e0e0e0',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: 12,
              fontFamily: 'inherit',
            }}
          >
            {DURATION_MAP[d]}
          </button>
        ))}
      </div>

      <div
        ref={gridRef}
        key={flashKey}
        className={flashKey > 0 ? 'flash-transition' : undefined}
        onContextMenu={e => e.preventDefault()}
        style={{
          overflow: 'auto',
          maxHeight: 'calc(100vh - 300px)',
          borderRadius: 10,
          border: '1px solid #2a2a4e',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `40px repeat(${MAX_MEASURES}, 1fr)`,
            gap: 0,
            minWidth: MAX_MEASURES * 56 + 40,
          }}
        >
          <div style={{ padding: '6px 4px', fontSize: 10, color: '#8888aa', textAlign: 'center' }}>
            拍
          </div>
          {Array.from({ length: MAX_MEASURES }, (_, i) => (
            <div
              key={i}
              style={{
                padding: '6px 2px',
                fontSize: 10,
                color: '#8888aa',
                textAlign: 'center',
                borderBottom: '1px dashed #2a2a4e',
              }}
            >
              {i + 1}
            </div>
          ))}

          {Array.from({ length: BEATS_PER_MEASURE }, (_, beatIdx) => [
            <div
              key={`beat-label-${beatIdx}`}
              style={{
                padding: '6px 4px',
                fontSize: 11,
                color: '#8888aa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRight: '1px dashed #2a2a4e',
              }}
            >
              {beatIdx + 1}
            </div>,
            ...Array.from({ length: MAX_MEASURES }, (_, measureIdx) => {
              const note = notes[measureIdx][beatIdx];
              const cellKey = `${measureIdx}-${beatIdx}`;
              const isHighlighted = playingCell === cellKey;
              return (
                <div
                  key={cellKey}
                  onMouseDown={e => handleMouseDown(measureIdx, beatIdx, e)}
                  onMouseEnter={() => handleMouseEnter(measureIdx, beatIdx)}
                  onMouseDownCapture={e => handleLongPressStart(measureIdx, beatIdx, e)}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  className={isHighlighted ? 'note-highlight' : undefined}
                  style={{
                    height: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderBottom: beatIdx < BEATS_PER_MEASURE - 1 ? '1px dashed #2a2a4e' : 'none',
                    borderRight:
                      (measureIdx + 1) % 4 === 0 && measureIdx < MAX_MEASURES - 1
                        ? '2px solid #2a2a4e'
                        : measureIdx < MAX_MEASURES - 1
                        ? '1px dashed #2a2a4e'
                        : 'none',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                    position: 'relative',
                  }}
                >
                  {note && (
                    <div
                      style={{
                        background: isHighlighted ? '#e94560' : 'rgba(255,255,255,0.12)',
                        border: `2px solid ${isHighlighted ? '#e94560' : 'rgba(255,255,255,0.2)'}`,
                        borderRadius: 6,
                        padding: '2px 6px',
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#fff',
                        minWidth: 28,
                        textAlign: 'center',
                        userSelect: 'none',
                        transition: 'all 0.1s',
                      }}
                    >
                      {renderNoteLabel(note)}
                    </div>
                  )}
                </div>
              );
            }),
          ])}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onClick={handlePlay}
          className="glow-expand"
          style={{
            background: 'linear-gradient(90deg, #e94560, #0f3460)',
            border: 'none',
            borderRadius: 8,
            padding: '10px 20px',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 600,
            fontSize: 14,
            fontFamily: 'inherit',
            transition: 'transform 0.15s',
          }}
        >
          {isPlaying ? <Square size={16} /> : <Play size={16} />}
          {isPlaying ? '停止' : '播放'}
        </button>

        <button
          onClick={handleSave}
          style={{
            background: '#16213e',
            border: '1px solid #2a2a4e',
            borderRadius: 8,
            padding: '10px 20px',
            color: '#e0e0e0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 500,
            fontSize: 14,
            fontFamily: 'inherit',
            transition: 'all 0.2s',
          }}
        >
          <Save size={16} />
          保存
        </button>

        <button
          onClick={handleClear}
          style={{
            background: '#16213e',
            border: '1px solid #2a2a4e',
            borderRadius: 8,
            padding: '10px 16px',
            color: '#8888aa',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 500,
            fontSize: 14,
            fontFamily: 'inherit',
            transition: 'all 0.2s',
          }}
        >
          <RotateCcw size={14} />
          清空
        </button>
      </div>

      {longPressNote && (
        <div
          onClick={e => e.stopPropagation()}
          className="fade-in"
          style={{
            position: 'fixed',
            left: longPressNote.x,
            top: longPressNote.y,
            background: '#16213e',
            border: '1px solid #e94560',
            borderRadius: 10,
            padding: 12,
            zIndex: 200,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            minWidth: 140,
          }}
        >
          <div style={{ fontSize: 12, color: '#8888aa' }}>音长</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {(['whole', 'half', 'quarter', 'eighth'] as Duration[]).map(d => (
              <button
                key={d}
                onClick={() => updateLongPressNote('duration', d)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: '1px solid #2a2a4e',
                  background: '#1a1a2e',
                  color: '#e0e0e0',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontFamily: 'inherit',
                }}
              >
                {DURATION_MAP[d]}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#8888aa' }}>八度</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {OCTAVE_LABELS.map((label, i) => (
              <button
                key={i}
                onClick={() => updateLongPressNote('octave', i)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: '1px solid #2a2a4e',
                  background: '#1a1a2e',
                  color: '#e0e0e0',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontFamily: 'inherit',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
