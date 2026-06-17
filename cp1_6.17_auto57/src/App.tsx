import React, { useState, useEffect, useCallback } from 'react';
import InstrumentPanel from './InstrumentPanel';
import {
  InstrumentType,
  ChordType,
  NoteRecord,
  ChordData,
  eventBus,
  audioEngine,
  generateChords
} from './AudioEngine';

const INSTRUMENTS: { type: InstrumentType; label: string }[] = [
  { type: 'guitar', label: '吉他' },
  { type: 'piano', label: '钢琴' },
  { type: 'violin', label: '小提琴' }
];

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const App: React.FC = () => {
  const [instrument, setInstrument] = useState<InstrumentType>('piano');
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordedNotes, setRecordedNotes] = useState<NoteRecord[]>([]);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string>('C');
  const [chords, setChords] = useState<ChordData[]>([]);
  const [playingChord, setPlayingChord] = useState<number | null>(null);

  useEffect(() => {
    const handleRecordingStarted = () => {
      setIsRecording(true);
      setRecordedNotes([]);
    };

    const handleRecordingStopped = (notes: NoteRecord[]) => {
      setIsRecording(false);
      setRecordedNotes(notes);
    };

    const handlePlaybackStarted = (notes: NoteRecord[]) => {
      setIsPlaying(true);
      setPlaybackProgress(0);
      if (notes.length > 0) {
        const totalDuration = notes[notes.length - 1].timestamp + 500;
        const startTime = Date.now();
        const updateProgress = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(100, (elapsed / totalDuration) * 100);
          setPlaybackProgress(progress);
          if (progress < 100 && !audioEngine.isPlaybackActive()) {
            setPlaybackProgress(100);
            return;
          }
          if (progress < 100) {
            requestAnimationFrame(updateProgress);
          }
        };
        requestAnimationFrame(updateProgress);
      }
    };

    const handlePlaybackFinished = () => {
      setIsPlaying(false);
      setTimeout(() => setPlaybackProgress(0), 500);
    };

    const handlePlaybackStopped = () => {
      setIsPlaying(false);
      setPlaybackProgress(0);
    };

    const handleRecordingCleared = () => {
      setRecordedNotes([]);
      setPlaybackProgress(0);
    };

    eventBus.on('recordingStarted', handleRecordingStarted);
    eventBus.on('recordingStopped', handleRecordingStopped);
    eventBus.on('playbackStarted', handlePlaybackStarted);
    eventBus.on('playbackFinished', handlePlaybackFinished);
    eventBus.on('playbackStopped', handlePlaybackStopped);
    eventBus.on('recordingCleared', handleRecordingCleared);

    return () => {
      eventBus.off('recordingStarted', handleRecordingStarted);
      eventBus.off('recordingStopped', handleRecordingStopped);
      eventBus.off('playbackStarted', handlePlaybackStarted);
      eventBus.off('playbackFinished', handlePlaybackFinished);
      eventBus.off('playbackStopped', handlePlaybackStopped);
      eventBus.off('recordingCleared', handleRecordingCleared);
    };
  }, []);

  useEffect(() => {
    const generated = generateChords(selectedKey);
    setChords(generated);
  }, [selectedKey]);

  const handleNotePlay = useCallback((note: string, inst: InstrumentType) => {
    audioEngine.playNote(note, inst);
  }, []);

  const handleChordPlay = useCallback((rootNote: string, inst: InstrumentType, chordType: ChordType) => {
    audioEngine.playChord(rootNote, inst, chordType);
  }, []);

  const handleInstrumentChange = (newInstrument: InstrumentType) => {
    setInstrument(newInstrument);
    audioEngine.clearRecording();
    setRecordedNotes([]);
  };

  const handleStartRecording = () => {
    eventBus.emit('startRecording');
  };

  const handleStopRecording = () => {
    eventBus.emit('stopRecording');
  };

  const handlePlayRecording = () => {
    if (!isPlaying && recordedNotes.length > 0) {
      eventBus.emit('playRecording');
    }
  };

  const handleClearRecording = () => {
    eventBus.emit('clearRecording');
  };

  const handleGenerateChords = () => {
    const generated = generateChords(selectedKey);
    setChords(generated);
  };

  const handlePlayChord = (chord: ChordData, index: number) => {
    if (playingChord !== null) return;
    setPlayingChord(index);
    audioEngine.playChordNotes(chord.notes, instrument);
    setTimeout(() => {
      setPlayingChord(null);
    }, chord.notes.length * 300 + 800);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">调音工坊</h1>
        <p className="app-subtitle">虚拟乐器 · 和弦生成 · 旋律录制</p>
      </header>

      <div className="main-layout">
        <div className="main-panel">
          <section>
            <h2 className="section-title">选择乐器</h2>
            <div className="instrument-selector">
              {INSTRUMENTS.map(({ type, label }) => (
                <button
                  key={type}
                  className={`btn ${instrument === type ? 'active' : ''}`}
                  onClick={() => handleInstrumentChange(type)}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="section-title">音高面板</h2>
            <InstrumentPanel
              instrument={instrument}
              onNotePlay={handleNotePlay}
              onChordPlay={handleChordPlay}
            />
          </section>

          <section>
            <h2 className="section-title">录制与回放</h2>
            <div className="recording-controls">
              {!isRecording ? (
                <button
                  className="btn btn-danger"
                  onClick={handleStartRecording}
                  disabled={isPlaying}
                >
                  开始录制
                </button>
              ) : (
                <>
                  <div className="recording-status">
                    <div className="recording-dot" />
                    <span>录制中...</span>
                  </div>
                  <button
                    className="btn"
                    onClick={handleStopRecording}
                  >
                    停止录制
                  </button>
                </>
              )}
              <button
                className="btn btn-success"
                onClick={handlePlayRecording}
                disabled={isRecording || isPlaying || recordedNotes.length === 0}
              >
                {isPlaying ? '播放中...' : '播放录制'}
              </button>
              <button
                className="btn"
                onClick={handleClearRecording}
                disabled={isRecording || isPlaying}
              >
                清空
              </button>
            </div>

            {playbackProgress > 0 && (
              <div className="progress-container">
                <div
                  className="progress-bar"
                  style={{ width: `${playbackProgress}%` }}
                />
              </div>
            )}

            <div className="recorded-notes">
              {recordedNotes.length > 0 ? (
                recordedNotes.map((record, index) => (
                  <span key={index} className="recorded-note">
                    {record.note}
                  </span>
                ))
              ) : (
                <span className="empty-state">暂无录制的音符</span>
              )}
            </div>
          </section>
        </div>

        <div className="side-panel">
          <section className="chord-panel">
            <h2 className="section-title">和弦生成</h2>
            <div>
              <label className="section-title" style={{ fontSize: '0.95rem', opacity: 0.8 }}>
                选择调式
              </label>
              <div className="key-selector" style={{ marginTop: '8px' }}>
                {KEYS.map((key) => (
                  <button
                    key={key}
                    className={`btn key-btn ${selectedKey === key ? 'active' : ''}`}
                    onClick={() => setSelectedKey(key)}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="btn"
              onClick={handleGenerateChords}
            >
              生成三和弦
            </button>

            <div className="chord-list">
              {chords.length > 0 ? (
                chords.map((chord, index) => (
                  <div
                    key={index}
                    className={`chord-card ${playingChord === index ? 'playing' : ''}`}
                    onClick={() => handlePlayChord(chord, index)}
                  >
                    <div className="chord-name">{chord.name}</div>
                    <div className="chord-notes">
                      {chord.notes.map((note, i) => (
                        <span key={i} className="chord-note">
                          {note}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <span className="empty-state">点击"生成三和弦"以生成和弦</span>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default App;
