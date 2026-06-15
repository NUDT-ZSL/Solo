import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Heart, Play, Square, X } from 'lucide-react';
import * as Tone from 'tone';
import {
  Score,
  PITCH_NAMES,
  pitchToNoteName,
  DURATION_BEATS,
  DURATION_MAP,
  OCTAVE_LABELS,
} from '../types';
import { mockScores } from '../mockData';

function ScoreThumbnail({ notes }: { notes: Score['notes'] }) {
  const measures = notes.slice(0, 8);
  return (
    <div style={{ display: 'flex', gap: 2, padding: '6px 4px', overflow: 'hidden' }}>
      {measures.map((measure, mi) => (
        <div
          key={mi}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            minWidth: 24,
            borderRight: mi < 7 ? '1px solid #2a2a4e' : 'none',
            paddingRight: 2,
          }}
        >
          {measure.map((note, bi) => (
            <div
              key={bi}
              style={{
                width: 20,
                height: 8,
                borderRadius: 2,
                background: note ? 'rgba(233,69,96,0.6)' : 'rgba(255,255,255,0.05)',
              }}
            >
              {note && (
                <span style={{ fontSize: 6, color: '#fff', lineHeight: '8px', paddingLeft: 2 }}>
                  {PITCH_NAMES[note.pitch - 1]}
                  {note.sharp ? '#' : ''}
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function CommunityPage() {
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('score-mark-favorites');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [previewScore, setPreviewScore] = useState<Score | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingCell, setPlayingCell] = useState<string | null>(null);
  const [heartAnim, setHeartAnim] = useState<string | null>(null);
  const synthRef = useRef<Tone.Synth | null>(null);
  const partRef = useRef<Tone.Part | null>(null);

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

  useEffect(() => {
    try {
      localStorage.setItem('score-mark-favorites', JSON.stringify([...favorites]));
    } catch { /* ignore */ }
  }, [favorites]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        setHeartAnim(id);
        setTimeout(() => setHeartAnim(null), 250);
      }
      return next;
    });
  }, []);

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

  const handlePlay = useCallback(
    async (score: Score) => {
      if (isPlaying) {
        stopPlayback();
        return;
      }
      await Tone.start();
      if (!synthRef.current) return;
      setIsPlaying(true);

      const events: { time: number; note: Score['notes'][0][0]; measure: number; beat: number }[] = [];
      let currentTime = 0;
      const bpm = 120;
      const beatSeconds = 60 / bpm;

      for (let m = 0; m < score.notes.length; m++) {
        for (let b = 0; b < score.notes[m].length; b++) {
          const note = score.notes[m][b];
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

      const partEvents = events.map(ev => ({
        time: ev.time,
        note: ev.note,
        measure: ev.measure,
        beat: ev.beat,
      }));

      partRef.current = new Tone.Part((time, value) => {
        if (!value.note) return;
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
    },
    [isPlaying, stopPlayback]
  );

  const renderNoteLabel = (note: Score['notes'][0][0]) => {
    if (!note) return '';
    const base = PITCH_NAMES[note.pitch - 1];
    const sharpStr = note.sharp ? '#' : '';
    let octaveStr = '';
    if (note.octave === 0) octaveStr = '̇';
    if (note.octave === 2) octaveStr = '̣';
    return `${sharpStr}${base}${octaveStr}`;
  };

  const getNoteAtCell = useCallback(
    (octave: number, pitch: number, measure: number, beat: number, notes: Score['notes']) => {
      const n = notes[measure]?.[beat];
      if (n && n.octave === octave && n.pitch === pitch) return n;
      return null;
    },
    []
  );

  const gridRows = useMemo(() => {
    const rows: { octave: number; pitch: number; octaveLabel: string }[] = [];
    for (let o = 2; o >= 0; o--) {
      for (let p = 7; p >= 1; p--) {
        rows.push({ octave: o, pitch: p, octaveLabel: OCTAVE_LABELS[o] });
      }
    }
    return rows;
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 14, color: '#8888aa' }}>
        社区精选乐谱 · {mockScores.length} 首
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {mockScores.map(score => (
          <div
            key={score.id}
            onClick={() => setPreviewScore(score)}
            style={{
              background: '#16213e',
              borderRadius: 12,
              padding: 16,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'pointer',
              position: 'relative',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLElement).style.boxShadow =
                '0 8px 20px rgba(0,0,0,0.5)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLElement).style.boxShadow =
                '0 4px 12px rgba(0,0,0,0.3)';
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 8,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 15, color: '#e0e0e0' }}>
                {score.title}
              </div>
              <button
                onClick={e => {
                  e.stopPropagation();
                  toggleFavorite(score.id);
                }}
                className={heartAnim === score.id ? 'heart-bounce' : undefined}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  color: 'transparent',
                  transition: 'transform 0.2s',
                }}
              >
                <Heart
                  size={18}
                  color={favorites.has(score.id) ? '#e94560' : '#8888aa'}
                  fill={favorites.has(score.id) ? '#e94560' : 'none'}
                />
              </button>
            </div>

            <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 8 }}>
              {new Date(score.createdAt).toLocaleString('zh-CN')}
            </div>

            <div
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              <ScoreThumbnail notes={score.notes} />
            </div>
          </div>
        ))}
      </div>

      {previewScore && (
        <div
          className="overlay-fade-in"
          onClick={() => {
            stopPlayback();
            setPreviewScore(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="fade-in"
            style={{
              background: '#16213e',
              borderRadius: 14,
              padding: 24,
              boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
              maxWidth: 900,
              width: '95%',
              maxHeight: '85vh',
              overflow: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 20, color: '#e0e0e0' }}>
                {previewScore.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => toggleFavorite(previewScore.id)}
                  className={heartAnim === previewScore.id ? 'heart-bounce' : undefined}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 4,
                    color: 'transparent',
                    transition: 'transform 0.2s',
                  }}
                >
                  <Heart
                    size={22}
                    color={favorites.has(previewScore.id) ? '#e94560' : '#8888aa'}
                    fill={favorites.has(previewScore.id) ? '#e94560' : 'none'}
                  />
                </button>
                <button
                  onClick={() => {
                    stopPlayback();
                    setPreviewScore(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 4,
                    color: '#8888aa',
                  }}
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            <div
              onContextMenu={e => e.preventDefault()}
              style={{
                overflow: 'auto',
                maxHeight: '55vh',
                borderRadius: 10,
                border: '1px solid #2a2a4e',
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `70px repeat(${previewScore.notes.length * 4}, 1fr)`,
                  gap: 0,
                  minWidth: previewScore.notes.length * 4 * 24 + 70,
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
                {previewScore.notes.map((_, mi) =>
                  [0, 1, 2, 3].map(bi => (
                    <div
                      key={`h-${mi}-${bi}`}
                      style={{
                        padding: '4px 2px',
                        fontSize: 9,
                        color: '#8888aa',
                        textAlign: 'center',
                        borderBottom: '1px solid #2a2a4e',
                        borderRight:
                          bi === 3 && mi < previewScore.notes.length - 1
                            ? '2px solid #2a2a4e'
                            : '1px dashed #2a2a4e',
                        background: bi === 0 ? 'rgba(15,52,96,0.3)' : 'transparent',
                      }}
                    >
                      {bi === 0 ? mi + 1 : ''}
                    </div>
                  ))
                )}

                {gridRows.map(row => {
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
                          row.octave > 0 && row.pitch === 1
                            ? '2px solid #2a2a4e'
                            : '1px dashed #2a2a4e',
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
                    ...previewScore.notes.map((measure, mi) =>
                      [0, 1, 2, 3].map(bi => {
                        const note = getNoteAtCell(row.octave, row.pitch, mi, bi, previewScore.notes);
                        const cellKey = `${mi}-${bi}`;
                        const isHighlighted = playingCell === cellKey && note !== null;
                        const cellId = `${row.octave}-${row.pitch}-${mi}-${bi}`;
                        return (
                          <div
                            key={cellId}
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
                                bi === 3 && mi < previewScore.notes.length - 1
                                  ? '2px solid #2a2a4e'
                                  : '1px dashed #2a2a4e',
                              background:
                                bi === 0
                                  ? 'rgba(15,52,96,0.15)'
                                  : isFirstOfOctave
                                  ? 'rgba(22,33,62,0.5)'
                                  : 'transparent',
                            }}
                          >
                            {note && (
                              <div
                                style={{
                                  background: isHighlighted
                                    ? '#ff9500'
                                    : 'rgba(255,255,255,0.15)',
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

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => handlePlay(previewScore)}
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
                }}
              >
                {isPlaying ? <Square size={16} /> : <Play size={16} />}
                {isPlaying ? '停止' : '播放'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
