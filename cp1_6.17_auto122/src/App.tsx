import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { RecorderManager } from './recorder/RecorderManager';
import { WaveformRenderer } from './waveform/WaveformRenderer';
import { AudioMixer } from './mixer/AudioMixer';
import './App.css';

interface TrackState {
  id: 'A' | 'B' | 'C' | 'D';
  label: string;
  labelColor: string;
  isRecording: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  isSolo: boolean;
  volumeDb: number;
  fadeInSec: number;
  fadeOutSec: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  audioId: string | null;
  durationSec: number;
}

type TrackId = 'A' | 'B' | 'C' | 'D';

const TRACK_DEFS: Array<{ id: TrackId; label: string; labelColor: string }> = [
  { id: 'A', label: '音轨 A', labelColor: '#FF6B6B' },
  { id: 'B', label: '音轨 B', labelColor: '#4ECDC4' },
  { id: 'C', label: '音轨 C', labelColor: '#FFE66D' },
  { id: 'D', label: '音轨 D', labelColor: '#95E1D3' },
];

const createInitialTracks = (): TrackState[] =>
  TRACK_DEFS.map((def) => ({
    ...def,
    isRecording: false,
    isPlaying: false,
    isMuted: false,
    isSolo: false,
    volumeDb: 0,
    fadeInSec: 0.5,
    fadeOutSec: 0.5,
    audioBlob: null,
    audioUrl: null,
    audioId: null,
    durationSec: 0,
  }));

const uploadAudioBlob = async (blob: Blob): Promise<string | null> => {
  try {
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { success: boolean; id?: string };
    return data.success && data.id ? data.id : null;
  } catch {
    return null;
  }
};

const App: React.FC = () => {
  const [tracks, setTracks] = useState<TrackState[]>(createInitialTracks);
  const [masterVolumeDb, setMasterVolumeDb] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [exportProgress, setExportProgress] = useState<number>(0);

  const recorderRefs = useRef<Map<TrackId, RecorderManager>>(new Map());
  const canvasRefs = useRef<Map<TrackId, HTMLCanvasElement>>(new Map());
  const rendererRefs = useRef<Map<TrackId, WaveformRenderer>>(new Map());
  const decodedDataRefs = useRef<Map<TrackId, Float32Array>>(new Map());
  const audioElementRefs = useRef<Map<TrackId, HTMLAudioElement>>(new Map());

  const hasSoloTrack = useMemo(() => tracks.some((t) => t.isSolo), [tracks]);

  const getTrack = useCallback((id: TrackId): TrackState => {
    return tracks.find((t) => t.id === id) as TrackState;
  }, [tracks]);

  const updateTrack = useCallback(<K extends keyof TrackState>(
    id: TrackId,
    updates: Partial<Pick<TrackState, K>> | ((prev: TrackState) => Partial<Pick<TrackState, K>>)
  ): void => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const patch = typeof updates === 'function' ? updates(t) : updates;
        return { ...t, ...patch };
      })
    );
  }, []);

  useEffect(() => {
    TRACK_DEFS.forEach(({ id }) => {
      if (!recorderRefs.current.has(id)) {
        const recorder = new RecorderManager({ sampleRate: 44100, maxDurationSec: 120 });

        recorder.onRealtimeData = (dataArray) => {
          const renderer = rendererRefs.current.get(id);
          const track = getTrack(id);
          if (renderer && track) {
            renderer.renderRealtime(dataArray, track.labelColor);
          }
        };

        recorder.onDurationUpdate = (duration) => {
          updateTrack(id, { durationSec: duration });
        };

        recorder.onError = (err) => {
          console.error(`Track ${id} recorder error:`, err);
          setErrorMessage(`音轨 ${id} 错误: ${err.message}`);
          setTimeout(() => setErrorMessage(''), 4000);
          updateTrack(id, { isRecording: false });
        };

        recorderRefs.current.set(id, recorder);
      }
    });

    return () => {
      recorderRefs.current.forEach((r) => r.destroy());
      recorderRefs.current.clear();
    };
  }, [getTrack, updateTrack]);

  const setCanvasRef = useCallback((id: TrackId) => (el: HTMLCanvasElement | null): void => {
    if (el) {
      canvasRefs.current.set(id, el);
      if (!rendererRefs.current.has(id)) {
        const track = getTrack(id);
        const renderer = new WaveformRenderer(el, { waveColor: track.labelColor });
        rendererRefs.current.set(id, renderer);
        if (track.audioBlob) {
          void renderer.renderStatic(track.audioBlob, {
            waveColor: track.labelColor,
            fadeInSec: track.fadeInSec,
            fadeOutSec: track.fadeOutSec,
            totalDurationSec: track.durationSec,
            isMuted: track.isMuted,
            isSoloStripe: hasSoloTrack && !track.isSolo,
          });
        } else {
          renderer.renderStaticEmpty({ waveColor: track.labelColor });
        }
      } else {
        const renderer = rendererRefs.current.get(id);
        if (renderer) {
          const track = getTrack(id);
          renderer.clear();
          if (track.audioBlob) {
            void renderer.renderStatic(track.audioBlob, {
              waveColor: track.labelColor,
              fadeInSec: track.fadeInSec,
              fadeOutSec: track.fadeOutSec,
              totalDurationSec: track.durationSec,
              isMuted: track.isMuted,
              isSoloStripe: hasSoloTrack && !track.isSolo,
            });
          } else {
            renderer.renderStaticEmpty({ waveColor: track.labelColor });
          }
        }
      }
    }
  }, [getTrack, hasSoloTrack]);

  const redrawTrackWaveform = useCallback((id: TrackId): void => {
    const renderer = rendererRefs.current.get(id);
    const track = getTrack(id);
    if (!renderer) return;

    if (track.audioBlob) {
      const channelData = decodedDataRefs.current.get(id);
      if (channelData) {
        renderer.updateFadeAndEffects({
          waveColor: track.labelColor,
          fadeInSec: track.fadeInSec,
          fadeOutSec: track.fadeOutSec,
          totalDurationSec: track.durationSec,
          isMuted: track.isMuted,
          isSoloStripe: hasSoloTrack && !track.isSolo,
          hasAudio: true,
          channelData,
        });
      } else {
        void renderer.renderStatic(track.audioBlob, {
          waveColor: track.labelColor,
          fadeInSec: track.fadeInSec,
          fadeOutSec: track.fadeOutSec,
          totalDurationSec: track.durationSec,
          isMuted: track.isMuted,
          isSoloStripe: hasSoloTrack && !track.isSolo,
        }).then(async () => {
          try {
            const ab = await track.audioBlob!.arrayBuffer();
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            const ctx = new AudioCtx({ sampleRate: 44100 });
            const buf = await ctx.decodeAudioData(ab.slice(0));
            await ctx.close();
            decodedDataRefs.current.set(id, buf.getChannelData(0));
          } catch {
            /* ignore */
          }
        });
      }
    } else {
      renderer.renderStaticEmpty({
        waveColor: track.labelColor,
        isMuted: track.isMuted,
        isSoloStripe: hasSoloTrack && !track.isSolo,
      });
    }
  }, [getTrack, hasSoloTrack]);

  useEffect(() => {
    tracks.forEach((t) => redrawTrackWaveform(t.id));
  }, [tracks.map((t) => `${t.id}-${t.isMuted}-${t.isSolo}-${t.fadeInSec}-${t.fadeOutSec}`).join('|'), redrawTrackWaveform]);

  useEffect(() => {
    tracks.forEach((t) => redrawTrackWaveform(t.id));
  }, [hasSoloTrack, redrawTrackWaveform]);

  const handleRecordClick = useCallback(async (id: TrackId): Promise<void> => {
    const track = getTrack(id);
    const recorder = recorderRefs.current.get(id);
    if (!recorder) return;

    if (track.isRecording) {
      try {
        const blob = await recorder.stop();
        const url = URL.createObjectURL(blob);
        if (track.audioUrl) URL.revokeObjectURL(track.audioUrl);

        const audioId = await uploadAudioBlob(blob);

        updateTrack(id, {
          isRecording: false,
          audioBlob: blob,
          audioUrl: url,
          audioId: audioId,
        });

        decodedDataRefs.current.delete(id);
        void redrawTrackWaveform(id);
      } catch (err) {
        console.error('Stop recording failed:', err);
        updateTrack(id, { isRecording: false });
      }
    } else {
      try {
        if (track.audioUrl) {
          URL.revokeObjectURL(track.audioUrl);
        }
        updateTrack(id, {
          isRecording: true,
          audioBlob: null,
          audioUrl: null,
          audioId: null,
          durationSec: 0,
        });
        decodedDataRefs.current.delete(id);
        await recorder.start();
      } catch (err) {
        console.error('Start recording failed:', err);
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(`无法启动录音: ${msg}。请检查麦克风权限。`);
        setTimeout(() => setErrorMessage(''), 5000);
        updateTrack(id, { isRecording: false });
      }
    }
  }, [getTrack, updateTrack, redrawTrackWaveform]);

  const handlePlayClick = useCallback((id: TrackId): void => {
    const track = getTrack(id);
    if (!track.audioUrl) return;

    let audioEl = audioElementRefs.current.get(id);
    if (!audioEl) {
      audioEl = new Audio(track.audioUrl);
      audioElementRefs.current.set(id, audioEl);
    } else if (audioEl.src !== track.audioUrl) {
      audioEl.src = track.audioUrl;
    }

    if (track.isPlaying) {
      audioEl.pause();
      audioEl.currentTime = 0;
      updateTrack(id, { isPlaying: false });
    } else {
      const shouldMute = hasSoloTrack ? !track.isSolo || track.isMuted : track.isMuted;
      audioEl.muted = shouldMute;
      audioEl.volume = Math.min(1, AudioMixer.dbToLinear(track.volumeDb));
      audioEl.onended = () => updateTrack(id, { isPlaying: false });
      void audioEl.play().catch((err) => {
        console.warn('Play failed:', err);
        updateTrack(id, { isPlaying: false });
      });
      updateTrack(id, { isPlaying: true });
    }
  }, [getTrack, updateTrack, hasSoloTrack]);

  const handleMuteClick = useCallback((id: TrackId): void => {
    updateTrack(id, (prev) => ({ isMuted: !prev.isMuted }));
  }, [updateTrack]);

  const handleSoloClick = useCallback((id: TrackId): void => {
    updateTrack(id, (prev) => ({ isSolo: !prev.isSolo }));
  }, [updateTrack]);

  const handleVolumeChange = useCallback((id: TrackId, valueDb: number): void => {
    updateTrack(id, { volumeDb: valueDb });
  }, [updateTrack]);

  const handleFadeInChange = useCallback((id: TrackId, value: number): void => {
    updateTrack(id, { fadeInSec: Math.max(0, Math.min(5, value)) });
  }, [updateTrack]);

  const handleFadeOutChange = useCallback((id: TrackId, value: number): void => {
    updateTrack(id, { fadeOutSec: Math.max(0, Math.min(5, value)) });
  }, [updateTrack]);

  const handleClearAll = useCallback((): void => {
    if (tracks.some((t) => t.audioBlob || t.isRecording || t.isPlaying)) {
      const confirmed = window.confirm('确定要清空所有录音吗？此操作不可撤销。');
      if (!confirmed) return;
    }

    tracks.forEach((t) => {
      if (t.isRecording) {
        const r = recorderRefs.current.get(t.id);
        if (r && r.isRecording()) void r.stop().catch(() => undefined);
      }
      if (t.isPlaying) {
        const el = audioElementRefs.current.get(t.id);
        if (el) { el.pause(); el.currentTime = 0; }
      }
      if (t.audioUrl) URL.revokeObjectURL(t.audioUrl);
    });

    audioElementRefs.current.clear();
    decodedDataRefs.current.clear();
    setTracks(createInitialTracks());
    setErrorMessage('');
  }, [tracks]);

  const handleExport = useCallback(async (): Promise<void> => {
    const hasAnyAudio = tracks.some((t) => t.audioBlob);
    if (!hasAnyAudio) {
      setErrorMessage('请至少录制一条音轨后再导出。');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    const validForPlay = hasSoloTrack
      ? tracks.some((t) => t.isSolo && !t.isMuted && t.audioBlob)
      : tracks.some((t) => !t.isMuted && t.audioBlob);

    if (!validForPlay) {
      setErrorMessage('没有可播放的音轨。请取消静音或检查独奏设置。');
      setTimeout(() => setErrorMessage(''), 3500);
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setErrorMessage('');

    try {
      const trackOptions = tracks.map((t) => ({
        blobOrUrl: t.audioBlob ?? (t.audioId ? `/api/audio/${t.audioId}` : null),
        gainDb: t.volumeDb,
        fadeInSec: t.fadeInSec,
        fadeOutSec: t.fadeOutSec,
        isMuted: t.isMuted,
        isSolo: t.isSolo,
      }));

      await AudioMixer.processAndExport({
        tracks: trackOptions,
        masterGainDb: masterVolumeDb,
        targetSampleRate: 44100,
        onProgress: (p) => setExportProgress(p),
      });

      setExportProgress(100);
    } catch (err) {
      console.error('Export failed:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`导出失败: ${msg}`);
      setTimeout(() => setErrorMessage(''), 6000);
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportProgress(0), 1500);
    }
  }, [tracks, hasSoloTrack, masterVolumeDb]);

  useEffect(() => {
    return () => {
      tracks.forEach((t) => {
        if (t.audioUrl) URL.revokeObjectURL(t.audioUrl);
      });
      audioElementRefs.current.forEach((el) => { try { el.pause(); } catch { /* ignore */ } });
      rendererRefs.current.forEach((r) => r.destroy());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDuration = (sec: number): string => {
    if (sec <= 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const anyRecording = tracks.some((t) => t.isRecording);

  return (
    <div className="app-root">
      <header className="app-header">
        <button
          className="back-button"
          onClick={handleClearAll}
          title="清空所有录音"
          aria-label="清空所有录音"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="app-title">多轨录音混音器</h1>
        <div className="header-spacer" />
      </header>

      <main className="app-main">
        <section className="tracks-container" aria-label="音轨列表">
          {tracks.map((track) => {
            const soloStripeActive = hasSoloTrack && !track.isSolo;
            return (
              <div
                key={track.id}
                className={`track-card ${track.isMuted ? 'track-muted' : ''} ${soloStripeActive ? 'track-solo-dimmed' : ''}`}
                style={{ '--track-color': track.labelColor } as React.CSSProperties}
              >
                <div className="track-header">
                  <div className="track-label" style={{ backgroundColor: track.labelColor }}>
                    {track.label}
                  </div>
                  <div className="track-duration" title={track.isRecording ? '录音中...' : '时长'}>
                    <span className={track.isRecording ? 'recording-indicator' : ''}>●</span>
                    {formatDuration(track.durationSec)} / 02:00
                  </div>
                </div>

                <div className="track-waveform-wrapper">
                  <canvas
                    ref={setCanvasRef(track.id)}
                    className="track-waveform"
                    aria-label={`音轨 ${track.id} 波形`}
                  />
                </div>

                <div className="track-controls">
                  <button
                    className={`ctrl-btn record-btn ${track.isRecording ? 'recording' : ''}`}
                    onClick={() => handleRecordClick(track.id)}
                    disabled={anyRecording && !track.isRecording}
                    title={track.isRecording ? '停止录音' : '开始录音'}
                  >
                    <span className="record-dot" />
                    <span className="btn-text">{track.isRecording ? '停止' : '录音'}</span>
                  </button>

                  <button
                    className={`ctrl-btn play-btn ${track.isPlaying ? 'playing' : ''}`}
                    onClick={() => handlePlayClick(track.id)}
                    disabled={!track.audioBlob || track.isRecording}
                    title={track.isPlaying ? '停止播放' : '播放音轨'}
                  >
                    {track.isPlaying ? (
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    )}
                    <span className="btn-text">{track.isPlaying ? '停止' : '播放'}</span>
                  </button>

                  <button
                    className={`ctrl-btn mute-btn ${track.isMuted ? 'active' : ''}`}
                    onClick={() => handleMuteClick(track.id)}
                    title={track.isMuted ? '取消静音' : '静音'}
                  >
                    {track.isMuted ? (
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <line x1="23" y1="9" x2="17" y2="15" />
                        <line x1="17" y1="9" x2="23" y2="15" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                      </svg>
                    )}
                    <span className="btn-text">{track.isMuted ? '已静音' : '静音'}</span>
                  </button>

                  <button
                    className={`ctrl-btn solo-btn ${track.isSolo ? 'active' : ''}`}
                    onClick={() => handleSoloClick(track.id)}
                    title={track.isSolo ? '取消独奏' : '独奏'}
                  >
                    <span className="solo-letter">S</span>
                    <span className="btn-text">独奏</span>
                  </button>
                </div>
              </div>
            );
          })}

          <button
            className="mobile-panel-toggle"
            onClick={() => setIsMobilePanelOpen((v) => !v)}
            aria-label={isMobilePanelOpen ? '关闭控制面板' : '打开控制面板'}
          >
            {isMobilePanelOpen ? '隐藏控制面板 ▲' : '显示控制面板 ▼'}
          </button>
        </section>

        <aside className={`control-panel ${isMobilePanelOpen ? 'mobile-open' : ''}`} aria-label="音轨控制面板">
          <div className="panel-title">音轨控制面板</div>

          {tracks.map((track) => (
            <div key={`ctrl-${track.id}`} className="control-track-group" style={{ '--track-color': track.labelColor } as React.CSSProperties}>
              <div className="control-track-header">
                <span className="control-track-dot" style={{ backgroundColor: track.labelColor }} />
                <span className="control-track-name">{track.label}</span>
                <span className="control-track-volume-readout">{track.volumeDb > 0 ? '+' : ''}{track.volumeDb.toFixed(1)} dB</span>
              </div>

              <div className="control-row">
                <label className="control-label">音量</label>
                <div className="slider-wrapper">
                  <input
                    type="range"
                    className="volume-slider"
                    min={-20}
                    max={6}
                    step={0.5}
                    value={track.volumeDb}
                    onChange={(e) => handleVolumeChange(track.id, parseFloat(e.target.value))}
                    style={{ '--thumb-color': track.labelColor } as React.CSSProperties}
                  />
                  <div className="slider-ticks">
                    <span>-20</span><span>-10</span><span>0</span><span>+6</span>
                  </div>
                </div>
              </div>

              <div className="control-row fade-row">
                <div className="fade-input-group">
                  <label className="control-label">淡入(秒)</label>
                  <input
                    type="number"
                    className="fade-input"
                    min={0}
                    max={5}
                    step={0.1}
                    value={track.fadeInSec}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v)) handleFadeInChange(track.id, v);
                    }}
                  />
                </div>
                <div className="fade-input-group">
                  <label className="control-label">淡出(秒)</label>
                  <input
                    type="number"
                    className="fade-input"
                    min={0}
                    max={5}
                    step={0.1}
                    value={track.fadeOutSec}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v)) handleFadeOutChange(track.id, v);
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </aside>
      </main>

      <footer className="export-bar" aria-label="混音导出栏">
        <div className="master-volume-group">
          <label className="master-label">
            主音量
            <span className="master-volume-readout">
              {masterVolumeDb > 0 ? '+' : ''}{masterVolumeDb.toFixed(1)} dB
            </span>
          </label>
          <input
            type="range"
            className="master-slider"
            min={-10}
            max={3}
            step={0.5}
            value={masterVolumeDb}
            onChange={(e) => setMasterVolumeDb(parseFloat(e.target.value))}
          />
          <div className="master-ticks">
            <span>-10</span><span>-5</span><span>0</span><span>+3</span>
          </div>
        </div>

        <div className="export-progress-wrap" style={{ opacity: isExporting || exportProgress > 0 ? 1 : 0 }}>
          <div className="export-progress-bar">
            <div className="export-progress-fill" style={{ width: `${exportProgress}%` }} />
          </div>
          <span className="export-progress-text">{Math.round(exportProgress)}%</span>
        </div>

        <button
          className="export-button"
          onClick={handleExport}
          disabled={isExporting || anyRecording}
        >
          {isExporting ? (
            <>
              <span className="export-spinner" />
              导出中...
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              导出混音 (WAV)
            </>
          )}
        </button>
      </footer>

      {errorMessage && (
        <div className="error-toast" role="alert">
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default App;
