import { useState, useCallback, useRef, useEffect } from 'react';
import { Heart, Play, Square, X } from 'lucide-react';
import * as Tone from 'tone';
import { Score, PITCH_NAMES, pitchToNoteName, DURATION_BEATS, DURATION_MAP, OCTAVE_LABELS } from '../types';
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
  const playbackRef = useRef<ReturnType<typeof setTimeout>[]>([]);

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
    playbackRef.current.forEach(clearTimeout);
    playbackRef.current = [];
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

      const seq: { note: Score['notes'][0][0]; measure: number; beat: number }[] = [];
      for (let m = 0; m < score.notes.length; m++) {
        for (let b = 0; b < score.notes[m].length; b++) {
          const n = score.notes[m][b];
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
        if (!item.note) return;
        const startOffset = offset * 1000;
        const dur = DURATION_BEATS[item.note.duration] * beatDuration;

        const playTimer = setTimeout(() => {
          const noteName = pitchToNoteName(item.note!.pitch, item.note!.octave, item.note!.sharp);
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

      const endTimer = setTimeout(() => stopPlayback(), offset * beatDuration * 1000 + 200);
      timers.push(endTimer);
      playbackRef.current = timers;
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
                  color: favorites.has(score.id) ? '#e94560' : '#8888aa',
                  transition: 'color 0.2s',
                }}
              >
                <Heart
                  size={18}
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
                    color: favorites.has(previewScore.id) ? '#e94560' : '#8888aa',
                    transition: 'color 0.2s',
                  }}
                >
                  <Heart
                    size={22}
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
                  gridTemplateColumns: `40px repeat(${previewScore.notes.length}, 1fr)`,
                  gap: 0,
                  minWidth: previewScore.notes.length * 56 + 40,
                }}
              >
                <div
                  style={{
                    padding: '6px 4px',
                    fontSize: 10,
                    color: '#8888aa',
                    textAlign: 'center',
                  }}
                >
                  拍
                </div>
                {previewScore.notes.map((_, i) => (
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

                {previewScore.notes[0].map((_, beatIdx) => [
                  <div
                    key={`bl-${beatIdx}`}
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
                  ...previewScore.notes.map((measure, measureIdx) => {
                    const note = measure[beatIdx];
                    const cellKey = `${measureIdx}-${beatIdx}`;
                    const isHighlighted = playingCell === cellKey;
                    return (
                      <div
                        key={cellKey}
                        className={isHighlighted ? 'note-highlight' : undefined}
                        style={{
                          height: 44,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderBottom:
                            beatIdx < (previewScore.notes[0]?.length || 4) - 1
                              ? '1px dashed #2a2a4e'
                              : 'none',
                          borderRight:
                            (measureIdx + 1) % 4 === 0 &&
                            measureIdx < previewScore.notes.length - 1
                              ? '2px solid #2a2a4e'
                              : measureIdx < previewScore.notes.length - 1
                              ? '1px dashed #2a2a4e'
                              : 'none',
                          position: 'relative',
                        }}
                      >
                        {note && (
                          <div
                            style={{
                              background: isHighlighted
                                ? '#e94560'
                                : 'rgba(255,255,255,0.12)',
                              border: `2px solid ${
                                isHighlighted ? '#e94560' : 'rgba(255,255,255,0.2)'
                              }`,
                              borderRadius: 6,
                              padding: '2px 6px',
                              fontSize: 13,
                              fontWeight: 600,
                              color: '#fff',
                              minWidth: 28,
                              textAlign: 'center',
                              userSelect: 'none',
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
