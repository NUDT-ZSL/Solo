import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TrackPanel } from './TrackPanel';
import { Sequencer } from './Sequencer';
import { MixerPanel } from './MixerPanel';
import { audioEngine } from './AudioEngine';
import type { Track, Note, TimeSignature, LevelData, EffectType, Effect } from './types';
import { STEPS_PER_BAR, TOTAL_BARS, TOTAL_STEPS, INSTRUMENT_COLORS } from './types';

const DEFAULT_TRACKS: Track[] = [
  {
    id: 'track-1',
    name: '钢琴',
    instrument: 'piano',
    volume: 80,
    muted: false,
    solo: false,
    transpose: 0,
    speedMultiplier: 1,
    mixer: { pan: 0, level: 0.8 },
    effects: [],
  },
  {
    id: 'track-2',
    name: '鼓',
    instrument: 'drums',
    volume: 75,
    muted: false,
    solo: false,
    transpose: 0,
    speedMultiplier: 1,
    mixer: { pan: 0, level: 0.75 },
    effects: [],
  },
  {
    id: 'track-3',
    name: '贝司',
    instrument: 'bass',
    volume: 70,
    muted: false,
    solo: false,
    transpose: 0,
    speedMultiplier: 1,
    mixer: { pan: -0.2, level: 0.7 },
    effects: [],
  },
  {
    id: 'track-4',
    name: '钢琴2',
    instrument: 'piano',
    volume: 65,
    muted: false,
    solo: false,
    transpose: 12,
    speedMultiplier: 1,
    mixer: { pan: 0.3, level: 0.65 },
    effects: [],
  },
  {
    id: 'track-5',
    name: '鼓2',
    instrument: 'drums',
    volume: 60,
    muted: false,
    solo: false,
    transpose: 0,
    speedMultiplier: 1,
    mixer: { pan: -0.3, level: 0.6 },
    effects: [],
  },
  {
    id: 'track-6',
    name: '贝司2',
    instrument: 'bass',
    volume: 55,
    muted: false,
    solo: false,
    transpose: -12,
    speedMultiplier: 1,
    mixer: { pan: 0.1, level: 0.55 },
    effects: [],
  },
  {
    id: 'track-7',
    name: '和弦',
    instrument: 'piano',
    volume: 50,
    muted: false,
    solo: false,
    transpose: 0,
    speedMultiplier: 0.5,
    mixer: { pan: -0.1, level: 0.5 },
    effects: [],
  },
  {
    id: 'track-8',
    name: '打击垫',
    instrument: 'drums',
    volume: 45,
    muted: false,
    solo: false,
    transpose: 7,
    speedMultiplier: 2,
    mixer: { pan: 0.2, level: 0.45 },
    effects: [],
  },
];

const generateInitialNotes = (): Note[] => {
  const notes: Note[] = [];
  let idCounter = 0;

  const createNote = (trackId: string, step: number, pitch: number): Note => ({
    id: `note-${idCounter++}`,
    trackId,
    step,
    pitch,
    velocity: 100,
    duration: 1,
  });

  const patterns: Record<string, [number, number][]> = {
    'track-1': [
      [0, 60], [4, 64], [8, 67], [12, 72],
      [16, 60], [20, 64], [24, 67], [28, 72],
      [32, 59], [36, 62], [40, 67], [44, 71],
      [48, 57], [52, 60], [56, 65], [60, 69],
    ],
    'track-2': [
      [0, 36], [8, 36], [16, 36], [24, 36],
      [32, 36], [40, 36], [48, 36], [56, 36],
      [4, 38], [12, 38], [20, 38], [28, 38],
      [36, 38], [44, 38], [52, 38], [60, 38],
    ],
    'track-3': [
      [0, 36], [4, 43], [8, 48], [12, 43],
      [16, 36], [20, 43], [24, 48], [28, 43],
      [32, 35], [36, 41], [40, 47], [44, 41],
      [48, 33], [52, 40], [56, 45], [60, 40],
    ],
  };

  Object.entries(patterns).forEach(([trackId, pattern]) => {
    pattern.forEach(([step, pitch]) => {
      notes.push(createNote(trackId, step, pitch));
    });
  });

  return notes;
};

export default function App() {
  const [tracks, setTracks] = useState<Track[]>(DEFAULT_TRACKS);
  const [notes, setNotes] = useState<Note[]>(generateInitialNotes);
  const [bpm, setBpm] = useState<number>(140);
  const [timeSignature, setTimeSignature] = useState<TimeSignature>('4/4');
  const [loopStart, setLoopStart] = useState<number>(0);
  const [loopEnd, setLoopEnd] = useState<number>(STEPS_PER_BAR * 4);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [levels, setLevels] = useState<LevelData[]>([]);
  const [mixerCollapsed, setMixerCollapsed] = useState<boolean>(false);
  const [audioInitialized, setAudioInitialized] = useState<boolean>(false);

  const playStartTimeRef = useRef<number>(0);
  const playStartStepRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastScheduledStepRef = useRef<number>(-1);

  const stepDuration = useMemo(() => 60 / bpm / 4, [bpm]);
  const loopLength = useMemo(() => loopEnd - loopStart, [loopStart, loopEnd]);

  const initAudio = useCallback(async () => {
    if (!audioInitialized) {
      await audioEngine.init();
      DEFAULT_TRACKS.forEach((track) => {
        audioEngine.initTrack(track);
      });
      audioEngine.setBPM(bpm);
      audioEngine.setLevelCallback((newLevels) => {
        setLevels(newLevels);
      });
      setAudioInitialized(true);
    }
    await audioEngine.resume();
  }, [audioInitialized, bpm]);

  const scheduleLoopNotes = useCallback((currentAudioTime: number) => {
    const loopRelativeTime = currentAudioTime - playStartTimeRef.current;
    const totalStepsPlayed = Math.floor(loopRelativeTime / stepDuration);
    const currentLoopStep = loopStart + (totalStepsPlayed % loopLength);
    const absoluteStep = playStartStepRef.current + totalStepsPlayed;

    if (currentLoopStep !== lastScheduledStepRef.current) {
      const stepsToSchedule = [currentLoopStep];
      const nextStep = loopStart + ((totalStepsPlayed + 1) % loopLength);
      stepsToSchedule.push(nextStep);

      stepsToSchedule.forEach((step, offset) => {
        const scheduleOffset = (step - currentLoopStep + offset * loopLength) * stepDuration;
        if (scheduleOffset >= 0) {
          const stepNotes = notes.filter((n) => n.step === step);
          stepNotes.forEach((note) => {
            const track = tracks.find((t) => t.id === note.trackId);
            if (!track) return;
            const hasSolo = tracks.some((t) => t.solo);
            if (track.muted || (hasSolo && !track.solo)) return;

            audioEngine.playNote(
              track.id,
              track.instrument,
              note.pitch,
              note.velocity,
              scheduleOffset,
              note.duration,
              track.transpose,
              track.speedMultiplier
            );
          });
        }
      });

      lastScheduledStepRef.current = currentLoopStep;
    }

    return { currentLoopStep, absoluteStep };
  }, [notes, tracks, loopStart, loopLength, stepDuration]);

  const playLoop = useCallback(() => {
    const tick = () => {
      const now = audioEngine['audioContext']?.currentTime || performance.now() / 1000;
      const { currentLoopStep, absoluteStep } = scheduleLoopNotes(now);

      const loopProgress = ((now - playStartTimeRef.current) / stepDuration) % loopLength;
      const displayStep = loopStart + loopProgress;

      setCurrentStep(displayStep);

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  }, [scheduleLoopNotes, loopStart, loopLength, stepDuration]);

  const handlePlayToggle = useCallback(async () => {
    await initAudio();

    if (isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      audioEngine.stop();
      setIsPlaying(false);
      lastScheduledStepRef.current = -1;
    } else {
      const ctx = audioEngine['audioContext'];
      playStartTimeRef.current = ctx ? ctx.currentTime + 0.05 : performance.now() / 1000 + 0.05;
      playStartStepRef.current = currentStep;
      lastScheduledStepRef.current = -1;
      setIsPlaying(true);
      playLoop();
    }
  }, [isPlaying, currentStep, initAudio, playLoop]);

  useEffect(() => {
    if (audioInitialized) {
      audioEngine.setBPM(bpm);
    }
  }, [bpm, audioInitialized]);

  useEffect(() => {
    if (audioInitialized) {
      tracks.forEach((track) => {
        audioEngine.updateTrackVolume(track.id, track.volume, track.muted);
      });
    }
  }, [tracks, audioInitialized]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const handleNoteToggle = useCallback((trackId: string, step: number, pitch: number) => {
    setNotes((prev) => {
      const existingIndex = prev.findIndex(
        (n) => n.trackId === trackId && n.step === step && Math.abs(n.pitch - pitch) <= 6
      );
      if (existingIndex >= 0) {
        return prev.filter((_, i) => i !== existingIndex);
      } else {
        return [
          ...prev,
          {
            id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            trackId,
            step,
            pitch,
            velocity: 100,
            duration: 1,
          },
        ];
      }
    });

    if (audioInitialized && isPlaying) {
      const track = tracks.find((t) => t.id === trackId);
      if (track && !track.muted) {
        const hasSolo = tracks.some((t) => t.solo);
        if (!hasSolo || track.solo) {
          audioEngine.playNote(
            trackId,
            track.instrument,
            pitch,
            100,
            0,
            1,
            track.transpose,
            track.speedMultiplier
          );
        }
      }
    }
  }, [audioInitialized, isPlaying, tracks]);

  const handleVolumeChange = useCallback((trackId: string, volume: number) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, volume } : t))
    );
  }, []);

  const handleMuteToggle = useCallback((trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, muted: !t.muted } : t))
    );
  }, []);

  const handleSoloToggle = useCallback((trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, solo: !t.solo } : t))
    );
  }, []);

  const handleTransposeChange = useCallback((trackId: string, transpose: number) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, transpose } : t))
    );
  }, []);

  const handleSpeedChange = useCallback((trackId: string, speedMultiplier: number) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, speedMultiplier } : t))
    );
  }, []);

  const handleLoopChange = useCallback((start: number, end: number) => {
    setLoopStart(start);
    setLoopEnd(end);
  }, []);

  const handlePanChange = useCallback((trackId: string, pan: number) => {
    setTracks((prev) =>
      prev.map((t) =>
        t.id === trackId ? { ...t, mixer: { ...t.mixer, pan } } : t
      )
    );
    if (audioInitialized) {
      audioEngine.updateTrackPan(trackId, pan);
    }
  }, [audioInitialized]);

  const handleEffectAdd = useCallback((trackId: string, slotIndex: number, effectType: EffectType) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== trackId) return t;
        const newEffects = [...t.effects];
        const defaultParams: Record<string, number> = {};
        if (effectType === 'reverb') defaultParams.wet = 0.3;
        if (effectType === 'delay') {
          defaultParams.time = 0.3;
          defaultParams.feedback = 0.4;
          defaultParams.wet = 0.3;
        }
        if (effectType === 'chorus') {
          defaultParams.delay = 0.015;
          defaultParams.wet = 0.3;
        }
        const newEffect: Effect = { type: effectType, params: defaultParams, enabled: true };
        if (slotIndex < newEffects.length) {
          newEffects[slotIndex] = newEffect;
        } else {
          newEffects.push(newEffect);
        }
        const updated = { ...t, effects: newEffects };
        if (audioInitialized) audioEngine.updateTrackEffects(updated);
        return updated;
      })
    );
  }, [audioInitialized]);

  const handleEffectRemove = useCallback((trackId: string, slotIndex: number) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== trackId) return t;
        const newEffects = t.effects.filter((_, i) => i !== slotIndex);
        const updated = { ...t, effects: newEffects };
        if (audioInitialized) audioEngine.updateTrackEffects(updated);
        return updated;
      })
    );
  }, [audioInitialized]);

  const handleEffectParamChange = useCallback((trackId: string, slotIndex: number, param: string, value: number) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== trackId) return t;
        const newEffects = t.effects.map((e, i) =>
          i === slotIndex ? { ...e, params: { ...e.params, [param]: value } } : e
        );
        const updated = { ...t, effects: newEffects };
        if (audioInitialized) audioEngine.updateTrackEffects(updated);
        return updated;
      })
    );
  }, [audioInitialized]);

  const handleEffectToggle = useCallback((trackId: string, slotIndex: number) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== trackId) return t;
        const newEffects = t.effects.map((e, i) =>
          i === slotIndex ? { ...e, enabled: !e.enabled } : e
        );
        const updated = { ...t, effects: newEffects };
        if (audioInitialized) audioEngine.updateTrackEffects(updated);
        return updated;
      })
    );
  }, [audioInitialized]);

  return (
    <div style={styles.app}>
      <div style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>🎛️</span>
            <span style={styles.logoText}>CollabDAW</span>
          </div>
        </div>

        <div style={styles.toolbarCenter}>
          <button
            style={{
              ...styles.playButton,
              background: isPlaying
                ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5253 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
            onClick={handlePlayToggle}
            title={isPlaying ? '停止' : '播放'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
        </div>

        <div style={styles.toolbarRight}>
          <div style={styles.bpmContainer}>
            <label style={styles.bpmLabel}>BPM</label>
            <input
              type="number"
              min={140}
              max={220}
              step={1}
              value={bpm}
              onChange={(e) => setBpm(Math.max(140, Math.min(220, parseInt(e.target.value, 10) || 140)))}
              style={styles.bpmInput}
            />
          </div>

          <select
            value={timeSignature}
            onChange={(e) => setTimeSignature(e.target.value as TimeSignature)}
            style={styles.timeSigSelect}
          >
            <option value="4/4">4/4</option>
            <option value="3/4">3/4</option>
            <option value="6/8">6/8</option>
          </select>

          <div style={styles.loopInfo}>
            <span style={styles.loopLabel}>循环:</span>
            <span style={styles.loopValue}>
              {Math.floor(loopStart / STEPS_PER_BAR) + 1} - {Math.floor(loopEnd / STEPS_PER_BAR) + 1} 小节
            </span>
          </div>
        </div>
      </div>

      <div style={styles.mainContent}>
        <TrackPanel
          tracks={tracks}
          onVolumeChange={handleVolumeChange}
          onMuteToggle={handleMuteToggle}
          onSoloToggle={handleSoloToggle}
          onTransposeChange={handleTransposeChange}
          onSpeedChange={handleSpeedChange}
        />
        <Sequencer
          tracks={tracks}
          notes={notes}
          currentStep={currentStep}
          loopStart={loopStart}
          loopEnd={loopEnd}
          onNoteToggle={handleNoteToggle}
          onLoopChange={handleLoopChange}
        />
      </div>

      <MixerPanel
        tracks={tracks}
        levels={levels}
        collapsed={mixerCollapsed}
        onToggleCollapse={() => setMixerCollapsed(!mixerCollapsed)}
        onPanChange={handlePanChange}
        onEffectAdd={handleEffectAdd}
        onEffectRemove={handleEffectRemove}
        onEffectParamChange={handleEffectParamChange}
        onEffectToggle={handleEffectToggle}
      />

      <style>{`
        * {
          box-sizing: border-box;
        }
        body, html, #root {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background-color: #0b0b1a;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #e0e0e0;
          min-width: 1280px;
          min-height: 720px;
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          opacity: 1;
        }
        select:hover, button:hover {
          transition: all 0.2s ease;
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#0b0b1a',
    minWidth: '1280px',
    minHeight: '720px',
    overflow: 'auto',
  },
  toolbar: {
    height: '60px',
    minHeight: '60px',
    backgroundColor: '#0b0b1a',
    borderBottom: '1px solid #2a2a3e',
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    gap: '20px',
  },
  toolbarLeft: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
  },
  toolbarCenter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarRight: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '16px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logoIcon: {
    fontSize: '24px',
  },
  logoText: {
    fontSize: '18px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  playButton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: 'none',
    color: '#fff',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)',
    transition: 'box-shadow 0.2s ease, transform 0.15s ease',
  },
  bpmContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  bpmLabel: {
    color: '#888899',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  bpmInput: {
    width: '64px',
    height: '32px',
    backgroundColor: '#1a1a2e',
    border: '1px solid #2a2a3e',
    borderRadius: '6px',
    color: '#e0e0e0',
    fontSize: '24px',
    fontWeight: 700,
    textAlign: 'center',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  timeSigSelect: {
    height: '32px',
    padding: '0 12px',
    backgroundColor: '#1a1a2e',
    border: '1px solid #2a2a3e',
    borderRadius: '6px',
    color: '#e0e0e0',
    fontSize: '14px',
    cursor: 'pointer',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  loopInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: '#1a1a2e',
    borderRadius: '6px',
    border: '1px solid #2a2a3e',
  },
  loopLabel: {
    color: '#888899',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  loopValue: {
    color: '#e0e0e0',
    fontSize: '12px',
    fontWeight: 600,
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    minHeight: 0,
  },
};
