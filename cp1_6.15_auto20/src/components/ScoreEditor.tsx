import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
const MAX_HISTORY = 20;

interface HistoryState {
  past: (Note | null)[][][];
  future: (Note | null)[][][];
}

interface CellCoord {
  octave: number;
  pitch: number;
  measure: number;
  beat: number;
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
  const [selectedSharp, setSelectedSharp] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<Duration>('quarter');
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingCell, setPlayingCell] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryState>({ past: [], future: [] });
  const [flashKey, setFlashKey] = useState(0);
  const [longPressNote, setLongPressNote] = useState<{
    measure: number;
    beat: number;
    x: number;
    y: number;
  } | null>(null);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const synthRef = useRef<Tone.Synth | null>(null);
  const partRef = useRef<Tone.Part | null>(null);
  const isDragging = useRef(false);
  const dragMode = useRef<'place' | 'remove' | 'select' | null>(null);

  useEffect(() => {
    synthRef.current = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.3 },
    }).toDestination();
    return () => {
      synthRef.current?.dispose();
      if (partRef.current) {
        partRef.current.dispose();
      }
      Tone.Transport.stop();
      Tone.Transport.cancel();
    };
  }, []);

  const deepCloneNotes = useCallback(
    (n: (Note | null)[][]) => n.map(m => m.map(x => (x ? { ...x } : null))),
    []
  );

  const pushHistory = useCallback(() => {
    setHistory(prev => ({
      past: [...prev.past.slice(-(MAX_HISTORY - 1)), deepCloneNotes(notes)],
      future: [],
    }));
  }, [notes, deepCloneNotes]);

  const doUndo = useCallback(() => {
    setHistory(prev => {
      if (prev.past.length === 0) return prev;
      const newPast = [...prev.past];
      const snapshot = newPast.pop()!;
      setNotes(snapshot);
      setFlashKey(k => k + 1);
      return { past: newPast, future: [deepCloneNotes(notes), ...prev.future] };
    });
  }, [notes, deepCloneNotes]);

  const doRedo = useCallback(() => {
    setHistory(prev => {
      if (prev.future.length === 0) return prev;
      const newFuture = [...prev.future];
      const snapshot = newFuture.shift()!;
      setNotes(snapshot);
      setFlashKey(k => k + 1);
      return { past: [...prev.past, deepCloneNotes(notes)], future: newFuture };
    });
  }, [notes, deepCloneNotes]);

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
      if (e.key === 'Escape') {
        setSelection(new Set());
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [doUndo, doRedo]);

  const findNoteAt = useCallback(
    (measure: number, beat: number): { octave: number; pitch: number } | null => {
      for (let o = 0; o < 3; o++) {
        for (let p = 1; p <= 7; p++) {
          const n = notes[measure][beat];
          if (n && n.octave === o && n.pitch === p) {
            return { octave: o, pitch: p };
          }
        }
      }
      return null;
    },
    [notes]
  );

  const getNoteAtCell = useCallback(
    (octave: number, pitch: number, measure: number, beat: number): Note | null => {
      const n = notes[measure][beat];
      if (n && n.octave === octave && n.pitch === pitch) return n;
      return null;
    },
    [notes]
  );

  const placeNoteAt = useCallback(
    (octave: number, pitch: number, measure: number, beat: number) => {
      pushHistory();
      setNotes(prev => {
        const next = deepCloneNotes(prev);
        next[measure][beat] = {
          pitch,
          octave,
          sharp: selectedSharp,
          duration: selectedDuration,
        };
        return next;
      });
    },
    [selectedSharp, selectedDuration, pushHistory, deepCloneNotes]
  );

  const removeNoteAt = useCallback(
    (measure: number, beat: number) => {
      if (!notes[measure][beat]) return;
      pushHistory();
      setNotes(prev => {
        const next = deepCloneNotes(prev);
        next[measure][beat] = null;
        return next;
      });
    },
    [notes, pushHistory, deepCloneNotes]
  );

  const handleCellMouseDown = useCallback(
    (octave: number, pitch: number, measure: number, beat: number, e: React.MouseEvent) => {
      e.preventDefault();
      if (e.button === 2) {
        removeNoteAt(measure, beat);
        return;
      }
      if (e.button === 0) {
        isDragging.current = true;
        const existing = getNoteAtCell(octave, pitch, measure, beat);
        if (existing) {
          dragMode.current = 'remove';
          removeNoteAt(measure, beat);
        } else {
          dragMode.current = 'place';
          placeNoteAt(octave, pitch, measure, beat);
        }
      }
    },
    [getNoteAtCell, placeNoteAt, removeNoteAt]
  );

  const handleCellMouseEnter = useCallback(
    (octave: number, pitch: number, measure: number, beat: number) => {
      if (!isDragging.current) return;
      if (dragMode.current === 'place') {
        placeNoteAt(octave, pitch, measure, beat);
      } else if (dragMode.current === 'remove') {
        removeNoteAt(measure, beat);
      }
    },
    [placeNoteAt, removeNoteAt]
  );

  useEffect(() => {
    const up = () => {
      isDragging.current = false;
      dragMode.current = null;
    };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  const handleLongPressStart = useCallback(
    (measure: number, beat: number, e: React.MouseEvent) => {
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
    (field: 'duration' | 'sharp', value: Duration | boolean) => {
      if (!longPressNote) return;
      const { measure, beat } = longPressNote;
      pushHistory();
      setNotes(prev => {
        const next = deepCloneNotes(prev);
        const n = next[measure][beat];
        if (n) {
          next[measure][beat] = { ...n, [field]: value };
        }
        return next;
      });
      setLongPressNote(null);
    },
    [longPressNote, pushHistory, deepCloneNotes]
  );

  const bulkChangeDuration = useCallback(
    (duration: Duration) => {
      if (selection.size === 0) return;
      pushHistory();
      setNotes(prev => {
        const next = deepCloneNotes(prev);
        selection.forEach(key => {
          const [measure, beat] = key.split('-').map(Number);
          if (next[measure][beat]) {
            next[measure][beat]!.duration = duration;
          }
        });
        return next;
      });
      setSelection(new Set());
    },
    [selection, pushHistory, deepCloneNotes]
  );

  const handleSave = useCallback(() => {
    const score: Score = {
      id: uuidv4(),
      title,
      notes: deepCloneNotes(notes),
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
  }, [title, notes, deepCloneNotes, showToast, triggerRefresh]);

  const stopPlayback = useCallback(() => {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    if (partRef.current) {
      partRef.current.dispose();
      partRef.current = null;
    }
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

    const events: { time: number; note: Note; measure: number; beat: number }[] = [];
    let currentTime = 0;
    const bpm = 120;
    const beatSeconds = 60 / bpm;

    for (let m = 0; m < MAX_MEASURES; m++) {
      for (let b = 0; b < BEATS_PER_MEASURE; b++) {
        const note = notes[m][b];
        if (note) {
          const durBeats = DURATION_BEATS[note.duration];
          events.push({
            time: currentTime,
            note,
            measure: m,
            beat: b,
          });
          currentTime += durBeats * beatSeconds;
        }
      }
    }

    if (events.length === 0) {
      stopPlayback();
      return;
    }

    Tone.Transport.bpm.value = bpm;
    setIsPlaying(true);

    const partEvents = events.map(ev => ({
      time: ev.time,
      note: ev.note,
      measure: ev.measure,
      beat: ev.beat,
    }));

    partRef.current = new Tone.Part((time, value) => {
      const noteName = pitchToNoteName(value.note.pitch, value.note.octave, value.note.sharp);
      const durBeats = DURATION_BEATS[value.note.duration];
      Tone.Draw.schedule(() => {
        setPlayingCell(`${value.measure}-${value.beat}`);
      }, time);
      Tone.Draw.schedule(() => {
        setPlayingCell(prev => (prev === `${value.measure}-${value.beat}` ? null : prev));
      }, time + durBeats * beatSeconds * 0.95);
      try {
        synthRef.current?.triggerAttackRelease(noteName, durBeats * beatSeconds * 0.9, time);
      } catch { /* ignore */ }
    }, partEvents);

    partRef.current.start(0);
    Tone.Transport.start();

    const totalDuration = currentTime + 0.5;
    Tone.Transport.schedule(() => {
      stopPlayback();
    }, totalDuration);
  }, [isPlaying, notes, stopPlayback]);

  const handleClear = useCallback(() => {
    pushHistory();
    setNotes(createEmptyNotes());
    setSelection(new Set());
  }, [pushHistory]);

  const renderNoteLabel = (note: Note) => {
    const base = PITCH_NAMES[note.pitch - 1];
    const sharpStr = note.sharp ? '#' : '';
    let octaveStr = '';
    if (note.octave === 0) octaveStr = '̇';
    if (note.octave === 2) octaveStr = '̣';
    return `${sharpStr}${base}${octaveStr}`;
  };

  useEffect(() => {
    const handler = () => {
      setLongPressNote(null);
    };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  const gridRows = useMemo(() => {
    const rows: { octave: number; pitch: number; octaveLabel: string }[] = [];
    for (let o = 2; o >= 0; o--) {
      for (let p = 7; p >= 1; p--) {
        rows.push({ octave: o, pitch: p, octaveLabel: OCTAVE_LABELS[o] });
      }
    }
    return rows;
  }, []);

  const totalCols = MAX_MEASURES * BEATS_PER_MEASURE;

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

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginLeft: 'auto',
            background: '#16213e',
            padding: '4px 10px',
            borderRadius: 8,
            border: '1px solid #2a2a4e',
          }}
          title={`可撤销 ${history.past.length} 步 / 可重做 ${history.future.length} 步`}
        >
          <button
            onClick={doUndo}
            disabled={history.past.length === 0}
            style={{
              background: 'none',
              border: 'none',
              cursor: history.past.length > 0 ? 'pointer' : 'not-allowed',
              color: history.past.length > 0 ? '#e0e0e0' : '#44445a',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              fontSize: 11,
              fontFamily: 'inherit',
            }}
          >
            <Undo2 size={13} /> {history.past.length}
          </button>
          <span style={{ color: '#2a2a4e' }}>|</span>
          <button
            onClick={doRedo}
            disabled={history.future.length === 0}
            style={{
              background: 'none',
              border: 'none',
              cursor: history.future.length > 0 ? 'pointer' : 'not-allowed',
              color: history.future.length > 0 ? '#e0e0e0' : '#44445a',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              fontSize: 11,
              fontFamily: 'inherit',
            }}
          >
            <Redo2 size={13} /> {history.future.length}
          </button>
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
        <span style={{ fontSize: 12, color: '#8888aa', marginRight: 4 }}>升号:</span>
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

        <span style={{ fontSize: 12, color: '#8888aa', marginLeft: 12, marginRight: 4 }}>音长:</span>
        {(['whole', 'half', 'quarter', 'eighth'] as Duration[]).map(d => (
          <button
            key={d}
            onClick={() => {
              if (selection.size > 0) {
                bulkChangeDuration(d);
              } else {
                setSelectedDuration(d);
              }
            }}
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
            title={selection.size > 0 ? '修改选中音符音长' : '设置新音符音长'}
          >
            {DURATION_MAP[d]}
          </button>
        ))}

        {selection.size > 0 && (
          <span style={{ fontSize: 11, color: '#e94560', marginLeft: 8 }}>
            已选中 {selection.size} 个音符
          </span>
        )}
      </div>

      <div
        key={flashKey}
        className={flashKey > 0 ? 'flash-transition' : undefined}
        onContextMenu={e => e.preventDefault()}
        style={{
          overflow: 'auto',
          maxHeight: 'calc(100vh - 320px)',
          borderRadius: 10,
          border: '1px solid #2a2a4e',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `70px repeat(${totalCols}, 1fr)`,
            gap: 0,
            minWidth: totalCols * 24 + 70,
          }}
        >
          <div
            style={{
              padding: '6px 4px',
              fontSize: 10,
              color: '#8888aa',
              textAlign: 'center',
              borderRight: '1px solid #2a2a4e',
              borderBottom: '1px solid #2a2a4e',
              background: '#16213e',
              position: 'sticky',
              left: 0,
              zIndex: 2,
            }}
          >
            音高
          </div>
          {Array.from({ length: MAX_MEASURES }, (_, mi) =>
            Array.from({ length: BEATS_PER_MEASURE }, (_, bi) => (
              <div
                key={`h-${mi}-${bi}`}
                style={{
                  padding: '4px 2px',
                  fontSize: 9,
                  color: '#8888aa',
                  textAlign: 'center',
                  borderBottom: '1px solid #2a2a4e',
                  borderRight:
                    bi === BEATS_PER_MEASURE - 1 && mi < MAX_MEASURES - 1
                      ? '2px solid #2a2a4e'
                      : '1px dashed #2a2a4e',
                  background: bi === 0 ? 'rgba(15,52,96,0.3)' : 'transparent',
                }}
              >
                {bi === 0 ? mi + 1 : ''}
              </div>
            ))
          )}

          {gridRows.map((row, rowIdx) => {
            const isFirstOfOctave = row.pitch === 7;
            return [
              <div
                key={`label-${row.octave}-${row.pitch}`}
                style={{
                  padding: '2px 4px',
                  fontSize: 11,
                  color: '#8888aa',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRight: '1px solid #2a2a4e',
                  borderBottom:
                    row.octave > 0 && row.pitch === 1 ? '2px solid #2a2a4e' : '1px dashed #2a2a4e',
                  background: isFirstOfOctave ? 'rgba(15,52,96,0.4)' : '#16213e',
                  position: 'sticky',
                  left: 0,
                  zIndex: 2,
                  fontWeight: row.pitch === 1 ? 600 : 400,
                }}
              >
                <span style={{ fontSize: 9, opacity: 0.7 }}>
                  {row.pitch === 7 ? row.octaveLabel : ''}
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    color:
                      row.octave === 2
                        ? '#e94560'
                        : row.octave === 1
                        ? '#e0e0e0'
                        : '#00bcd4',
                  }}
                >
                  {PITCH_NAMES[row.pitch - 1]}
                  {row.octave === 0 ? '̇' : row.octave === 2 ? '̣' : ''}
                </span>
              </div>,
              ...Array.from({ length: MAX_MEASURES }, (_, mi) =>
                Array.from({ length: BEATS_PER_MEASURE }, (_, bi) => {
                  const note = getNoteAtCell(row.octave, row.pitch, mi, bi);
                  const cellKey = `${mi}-${bi}`;
                  const isHighlighted = playingCell === cellKey && note !== null;
                  const hasAnyNote = notes[mi][bi] !== null;
                  const cellId = `${row.octave}-${row.pitch}-${mi}-${bi}`;
                  return (
                    <div
                      key={cellId}
                      onMouseDown={e => handleCellMouseDown(row.octave, row.pitch, mi, bi, e)}
                      onMouseEnter={() => handleCellMouseEnter(row.octave, row.pitch, mi, bi)}
                      onMouseDownCapture={e => handleLongPressStart(mi, bi, e)}
                      onMouseUp={handleLongPressEnd}
                      onMouseLeave={handleLongPressEnd}
                      className={isHighlighted ? 'note-highlight' : undefined}
                      style={{
                        height: 22,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderBottom:
                          row.octave > 0 && row.pitch === 1
                            ? '2px solid #2a2a4e'
                            : '1px dashed #2a2a4e',
                        borderRight:
                          bi === BEATS_PER_MEASURE - 1 && mi < MAX_MEASURES - 1
                            ? '2px solid #2a2a4e'
                            : '1px dashed #2a2a4e',
                        background:
                          bi === 0
                            ? 'rgba(15,52,96,0.15)'
                            : isFirstOfOctave
                            ? 'rgba(22,33,62,0.5)'
                            : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.08s',
                      }}
                    >
                      {note && (
                        <div
                          style={{
                            background: isHighlighted
                              ? '#ff9500'
                              : hasAnyNote
                              ? 'rgba(255,255,255,0.15)'
                              : 'transparent',
                            border: `2px solid ${
                              isHighlighted
                                ? '#ff9500'
                                : note
                                ? 'rgba(233,69,96,0.8)'
                                : 'transparent'
                            }`,
                            borderRadius: 4,
                            padding: '0 2px',
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#fff',
                            minWidth: 14,
                            lineHeight: '14px',
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
                })
              ).flat(),
            ];
          })}
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
          <div style={{ fontSize: 12, color: '#8888aa' }}>升号</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => updateLongPressNote('sharp', true)}
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                border: '1px solid #2a2a4e',
                background: '#1a1a2e',
                color: '#e0e0e0',
                cursor: 'pointer',
                fontSize: 11,
                fontFamily: 'inherit',
              }}
            >
              加#
            </button>
            <button
              onClick={() => updateLongPressNote('sharp', false)}
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                border: '1px solid #2a2a4e',
                background: '#1a1a2e',
                color: '#e0e0e0',
                cursor: 'pointer',
                fontSize: 11,
                fontFamily: 'inherit',
              }}
            >
              去#
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
