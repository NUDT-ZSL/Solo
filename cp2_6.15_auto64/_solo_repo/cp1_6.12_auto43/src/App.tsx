import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { PitchTracker, PitchData } from './PitchTracker';
import { Metronome, BeatEvent, TimeSignature } from './Metronome';
import Visualizer, { VisualizerHandle } from './Visualizer';

const SCALES: { name: string; notes: number[] }[] = [
  { name: 'C Major', notes: [0, 2, 4, 5, 7, 9, 11] },
  { name: 'A Minor', notes: [9, 11, 0, 2, 4, 5, 7] },
  { name: 'G Major', notes: [7, 9, 11, 0, 2, 4, 6] },
  { name: 'D Major', notes: [2, 4, 6, 7, 9, 11, 1] },
  { name: 'Chromatic', notes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }
];

const TIME_SIGNATURES: TimeSignature[] = ['2/4', '3/4', '4/4'];
const MAX_RECORD_SECONDS = 30;
const MAX_PITCH_HISTORY_SECONDS = 10;
const PLAYBACK_SYNC_INTERVAL_MS = 100;

interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface RecordingSync {
  audioStartTime: number;
  audioStartPerformanceTime: number;
  pitchStartPerformanceTime: number;
}

function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingBack, setIsPlayingBack] = useState(false);
  const [pitchData, setPitchData] = useState<PitchData[]>([]);
  const [activeBeats, setActiveBeats] = useState<BeatEvent[]>([]);
  const [selectedScaleIdx, setSelectedScaleIdx] = useState(0);
  const [bpm, setBpm] = useState(100);
  const [timeSignature, setTimeSignature] = useState<TimeSignature>('4/4');
  const [isMetronomeRunning, setIsMetronomeRunning] = useState(false);
  const [recordedData, setRecordedData] = useState<PitchData[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });

  const pitchTrackerRef = useRef<PitchTracker | null>(null);
  const metronomeRef = useRef<Metronome | null>(null);
  const visualizerRef = useRef<VisualizerHandle | null>(null);
  const recordingStartRef = useRef<number>(0);
  const recordingTimerRef = useRef<number | null>(null);
  const rippleIdRef = useRef(0);
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);
  const recordedMediaRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingSyncRef = useRef<RecordingSync | null>(null);
  const playbackSyncIntervalRef = useRef<number | null>(null);
  const livePitchBufferRef = useRef<PitchData[]>([]);

  const selectedScale = SCALES[selectedScaleIdx];

  const responsiveSizes = useMemo(() => {
    const w = viewportSize.w;
    const h = viewportSize.h;

    if (w >= 768) {
      return {
        bpmFontSize: '24px',
        sectionPadding: '0 20px',
        sectionGap: '16px',
        metronomePadding: '16px 20px',
        metronomeMargin: '0 16px',
        buttonPadding: '14px 20px',
        buttonFontSize: '14px',
        scaleButtonPadding: '10px 12px',
        scaleButtonFontSize: '12px',
        recButtonPadding: '12px 16px',
        recButtonFontSize: '13px',
        titleFontSize: '20px',
        panelPadding: undefined,
        headerPaddingTop: '16px',
        headerPaddingX: '0 20px',
        timeSigButtonPadding: '8px 12px',
        timeSigButtonFontSize: '13px',
        canvasHeight: undefined,
        panelMaxHeight: undefined
      };
    }

    if (w >= 480) {
      return {
        bpmFontSize: '20px',
        sectionPadding: '0 8px',
        sectionGap: '12px',
        metronomePadding: '12px',
        metronomeMargin: '0 6px',
        buttonPadding: '12px 16px',
        buttonFontSize: '13px',
        scaleButtonPadding: '8px 10px',
        scaleButtonFontSize: '11px',
        recButtonPadding: '10px 14px',
        recButtonFontSize: '12px',
        titleFontSize: '17px',
        panelPadding: '12px',
        headerPaddingTop: '4px',
        headerPaddingX: '0 4px',
        timeSigButtonPadding: '7px 10px',
        timeSigButtonFontSize: '12px',
        canvasHeight: h > 0 ? `${Math.min(h * 0.5, 360)}px` : '280px',
        panelMaxHeight: h > 0 ? `${h * 0.5}px` : '300px'
      };
    }

    return {
      bpmFontSize: '18px',
      sectionPadding: '0 4px',
      sectionGap: '10px',
      metronomePadding: '10px',
      metronomeMargin: '0 4px',
      buttonPadding: '10px 12px',
      buttonFontSize: '12px',
      scaleButtonPadding: '7px 8px',
      scaleButtonFontSize: '10px',
      recButtonPadding: '9px 12px',
      recButtonFontSize: '11px',
      titleFontSize: '15px',
      panelPadding: '10px',
      headerPaddingTop: '2px',
      headerPaddingX: '0 2px',
      timeSigButtonPadding: '6px 8px',
      timeSigButtonFontSize: '11px',
      canvasHeight: h > 0 ? `${Math.min(h * 0.45, 300)}px` : '240px',
      panelMaxHeight: h > 0 ? `${h * 0.55}px` : '320px'
    };
  }, [viewportSize.w, viewportSize.h]);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setIsMobile(w < 768);
      setViewportSize({ w, h });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const trimData = useCallback((data: PitchData[], maxSeconds: number): PitchData[] => {
    if (data.length === 0) return data;
    const latestTime = data[data.length - 1].time;
    const threshold = latestTime - maxSeconds;
    let left = 0;
    let right = data.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (data[mid].time < threshold) left = mid + 1;
      else right = mid - 1;
    }
    return data.slice(Math.max(0, left - 1));
  }, []);

  const handlePitchData = useCallback((data: PitchData) => {
    livePitchBufferRef.current.push(data);

    if (livePitchBufferRef.current.length > 3) {
      const batch = [...livePitchBufferRef.current];
      livePitchBufferRef.current = [];

      setPitchData(prev => {
        const updated = [...prev, ...batch];
        return trimData(updated, MAX_PITCH_HISTORY_SECONDS);
      });

      if (isRecording && recordingSyncRef.current) {
        const sync = recordingSyncRef.current;
        const performanceNow = performance.now() / 1000;
        const pitchElapsed = performanceNow - sync.pitchStartPerformanceTime;
        const adjustedData = batch.map(d => ({
          ...d,
          time: pitchElapsed + (d.time - livePitchBufferRef.current.length > 0
            ? livePitchBufferRef.current[livePitchBufferRef.current.length - 1].time
            : d.time)
        }));

        setRecordedData(prev => {
          const combined = [...prev, ...adjustedData];
          return combined.slice(-10000);
        });
      }
    }
  }, [trimData, isRecording]);

  const handleBeat = useCallback((beat: BeatEvent) => {
    visualizerRef.current?.addBeat(beat);
    setActiveBeats(prev => {
      const updated = [...prev, beat];
      const now = performance.now() / 1000;
      return updated.filter(b => now - b.time < 3);
    });
  }, []);

  const startDetection = useCallback(async () => {
    setError(null);
    try {
      const tracker = new PitchTracker();
      pitchTrackerRef.current = tracker;
      await tracker.start(handlePitchData);
      setIsRunning(true);

      if (typeof (import.meta as unknown as { env?: { DEV?: boolean } }).env !== 'undefined' &&
          (import.meta as unknown as { env: { DEV?: boolean } }).env.DEV) {
        (window as unknown as { __PITCH_TRACKER__: unknown }).__PITCH_TRACKER__ = tracker;
      }
    } catch (e) {
      setError('无法访问麦克风，请检查权限设置');
      console.error(e);
    }
  }, [handlePitchData]);

  const stopDetection = useCallback(() => {
    if (pitchTrackerRef.current) {
      pitchTrackerRef.current.stop();
      pitchTrackerRef.current = null;
    }

    if (typeof (import.meta as unknown as { env?: { DEV?: boolean } }).env !== 'undefined' &&
        (import.meta as unknown as { env: { DEV?: boolean } }).env.DEV) {
      delete (window as unknown as { __PITCH_TRACKER__?: unknown }).__PITCH_TRACKER__;
    }

    livePitchBufferRef.current = [];
    setIsRunning(false);
    stopRecording();
    setPitchData([]);
  }, []);

  const startRecording = useCallback(async () => {
    if (!isRunning || isRecording) return;

    try {
      recordedChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      mediaStreamRef.current = stream;

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
        audioBitsPerSecond: 128000
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
      };

      const nowPerf = performance.now() / 1000;
      recorder.start(100);
      recordedMediaRef.current = recorder;

      recordingSyncRef.current = {
        audioStartTime: nowPerf + 0.05,
        audioStartPerformanceTime: nowPerf + 0.05,
        pitchStartPerformanceTime: nowPerf
      };

      setIsRecording(true);
      recordingStartRef.current = nowPerf;
      setRecordedData([]);
      setRecordingTime(0);

      recordingTimerRef.current = window.setInterval(() => {
        const elapsed = performance.now() / 1000 - recordingStartRef.current;
        setRecordingTime(elapsed);
        if (elapsed >= MAX_RECORD_SECONDS) {
          stopRecording();
        }
      }, 50);

    } catch (e) {
      setError('录音失败：' + (e as Error).message);
    }
  }, [isRunning, isRecording]);

  const stopRecording = useCallback(() => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (recordedMediaRef.current && recordedMediaRef.current.state !== 'inactive') {
      try {
        recordedMediaRef.current.stop();
      } catch (e) {
        console.warn('MediaRecorder stop failed:', e);
      }
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    recordingSyncRef.current = null;
    livePitchBufferRef.current = [];
    setIsRecording(false);
  }, []);

  const startPlayback = useCallback(() => {
    if (recordedData.length === 0) return;

    stopPlayback();

    const duration = recordedData[recordedData.length - 1].time;
    let audioOffset = 0;

    if (recordedChunksRef.current.length > 0) {
      const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      audioPlaybackRef.current = new Audio(url);
      audioPlaybackRef.current.preload = 'auto';

      audioPlaybackRef.current.oncanplay = () => {
        if (!audioPlaybackRef.current) return;

        const audioStartPerf = performance.now() / 1000;
        audioPlaybackRef.current!.play().then(() => {
          const actualStartTime = performance.now() / 1000;
          audioOffset = actualStartTime - audioStartPerf + 0.02;

          visualizerRef.current?.startPlayback(recordedData, audioOffset);

          playbackSyncIntervalRef.current = window.setInterval(() => {
            if (audioPlaybackRef.current && visualizerRef.current) {
              const currentAudioTime = audioPlaybackRef.current.currentTime;
              visualizerRef.current.syncPlaybackTime(currentAudioTime);
            }
          }, PLAYBACK_SYNC_INTERVAL_MS);
        }).catch(() => {});
      };

      audioPlaybackRef.current.onended = () => {
        setIsPlayingBack(false);
        visualizerRef.current?.stopPlayback();
        if (playbackSyncIntervalRef.current) {
          window.clearInterval(playbackSyncIntervalRef.current);
          playbackSyncIntervalRef.current = null;
        }
      };

      audioPlaybackRef.current.load();
    } else {
      visualizerRef.current?.startPlayback(recordedData, 0);
    }

    setIsPlayingBack(true);

    window.setTimeout(() => {
      stopPlayback();
    }, (duration + 1) * 1000);
  }, [recordedData]);

  const stopPlayback = useCallback(() => {
    if (audioPlaybackRef.current) {
      audioPlaybackRef.current.pause();
      audioPlaybackRef.current = null;
    }
    if (playbackSyncIntervalRef.current) {
      window.clearInterval(playbackSyncIntervalRef.current);
      playbackSyncIntervalRef.current = null;
    }
    visualizerRef.current?.stopPlayback();
    setIsPlayingBack(false);
  }, []);

  const toggleMetronome = useCallback(() => {
    if (!metronomeRef.current) {
      metronomeRef.current = new Metronome();
    }
    const metro = metronomeRef.current;

    if (isMetronomeRunning) {
      metro.stop();
      setIsMetronomeRunning(false);
    } else {
      metro.setBPM(bpm);
      metro.setTimeSignature(timeSignature);
      metro.start(handleBeat);
      setIsMetronomeRunning(true);
    }
  }, [isMetronomeRunning, bpm, timeSignature, handleBeat]);

  useEffect(() => {
    if (metronomeRef.current && isMetronomeRunning) {
      metronomeRef.current.setBPM(bpm);
      metronomeRef.current.setTimeSignature(timeSignature);
    }
  }, [bpm, timeSignature, isMetronomeRunning]);

  const addRipple = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ripple: Ripple = {
      id: rippleIdRef.current++,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    setRipples(prev => [...prev, ripple]);
    window.setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== ripple.id));
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      pitchTrackerRef.current?.destroy();
      metronomeRef.current?.destroy();
      if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
      if (playbackSyncIntervalRef.current) window.clearInterval(playbackSyncIntervalRef.current);
      stopPlayback();
    };
  }, [stopPlayback]);

  const bpmGradient = useMemo(() => {
    const t = (bpm - 40) / (200 - 40);
    const coolHue = 200;
    const warmHue = 20;
    const hue = coolHue - t * (coolHue - warmHue);
    const sat = 75 + t * 10;
    const light = 55 - t * 5;
    return `linear-gradient(to right,
      hsl(${hue - 30}, ${sat}%, ${light + 5}%),
      hsl(${hue}, ${sat + 5}%, ${light}%),
      hsl(${hue + 20}, ${sat}%, ${light - 5}%))`;
  }, [bpm]);

  const bpmTextColor = useMemo(() => {
    const t = (bpm - 40) / (200 - 40);
    const coolHue = 200;
    const warmHue = 20;
    const hue = coolHue - t * (coolHue - warmHue);
    return `hsl(${hue}, 85%, 65%)`;
  }, [bpm]);

  const layoutStyle = useMemo(() => {
    if (isMobile) {
      return {
        flexDirection: 'column' as const,
        padding: '0',
        gap: '0'
      };
    }
    return {
      flexDirection: 'row' as const,
      padding: '16px',
      gap: '16px'
    };
  }, [isMobile]);

  const canvasContainerStyle = useMemo(() => {
    if (isMobile) {
      return {
        flex: '0 0 auto',
        height: responsiveSizes.canvasHeight || (viewportSize.h > 0 ? `${Math.min(viewportSize.h * 0.55, 400)}px` : '300px'),
        padding: viewportSize.w < 480 ? '4px 4px 0 4px' : '8px 8px 0 8px',
        minHeight: 0
      };
    }
    return {
      flex: '7',
      minHeight: 0,
      maxHeight: '100%'
    };
  }, [isMobile, viewportSize.h, viewportSize.w, responsiveSizes.canvasHeight]);

  const panelStyle = useMemo(() => {
    if (isMobile) {
      return {
        flex: '1 1 auto',
        maxHeight: responsiveSizes.panelMaxHeight || (viewportSize.h > 0 ? `${viewportSize.h * 0.45}px` : '300px'),
        margin: viewportSize.w < 480 ? '4px' : '8px',
        padding: responsiveSizes.panelPadding || '12px',
        overflowY: 'auto' as const
      };
    }
    return {
      flex: '3',
      maxWidth: '380px',
      minWidth: '300px'
    };
  }, [isMobile, viewportSize.h, responsiveSizes.panelMaxHeight, responsiveSizes.panelPadding, viewportSize.w]);

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        background: '#0d0d1a',
        color: '#fff',
        ...layoutStyle
      }}
    >
      <div style={{ display: 'flex', ...canvasContainerStyle }}>
        <Visualizer
          ref={visualizerRef}
          pitchData={pitchData}
          scaleName={selectedScale.name}
          scaleNotes={selectedScale.notes}
          activeBeats={activeBeats}
          isRecording={isRecording}
          recordedData={recordedData}
          isPlayingBack={isPlayingBack}
        />
      </div>

      <div
        style={{
          background: 'rgba(15, 52, 96, 0.4)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: isMobile ? '12px' : '16px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: responsiveSizes.sectionGap,
          ...panelStyle
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: responsiveSizes.headerPaddingX,
          paddingTop: responsiveSizes.headerPaddingTop
        }}>
          <h1 style={{
            fontSize: responsiveSizes.titleFontSize,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #e94560, #16c79a)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.5px',
            margin: 0
          }}>
            PitchTrainer
          </h1>
          <div style={{
            fontSize: '10px',
            padding: '3px 8px',
            borderRadius: '8px',
            background: isRunning ? 'rgba(22, 199, 154, 0.15)' : 'rgba(128,128,128,0.1)',
            color: isRunning ? '#16c79a' : 'rgba(255,255,255,0.5)',
            whiteSpace: 'nowrap'
          }}>
            {isRunning ? '● LIVE' : '○ IDLE'}
          </div>
        </div>

        {error && (
          <div style={{
            margin: responsiveSizes.sectionPadding,
            padding: viewportSize.w < 480 ? '8px 10px' : '10px 14px',
            borderRadius: '10px',
            background: 'rgba(233, 69, 96, 0.15)',
            color: '#e94560',
            fontSize: viewportSize.w < 480 ? '12px' : '13px',
            border: '1px solid rgba(233, 69, 96, 0.3)'
          }}>
            {error}
          </div>
        )}

        <section style={{ padding: responsiveSizes.sectionPadding }}>
          <div style={{ display: 'flex', gap: viewportSize.w < 480 ? '6px' : '10px' }}>
            <button
              onClick={(e) => { addRipple(e); isRunning ? stopDetection() : startDetection(); }}
              style={{
                flex: 1,
                position: 'relative',
                overflow: 'hidden',
                padding: responsiveSizes.buttonPadding,
                borderRadius: viewportSize.w < 480 ? '10px' : '12px',
                border: 'none',
                fontSize: responsiveSizes.buttonFontSize,
                fontWeight: 600,
                cursor: 'pointer',
                color: '#fff',
                background: isRunning
                  ? 'linear-gradient(135deg, #e94560, #c73650)'
                  : 'linear-gradient(135deg, #16c79a, #0f9b75)',
                boxShadow: isRunning
                  ? '0 4px 20px rgba(233, 69, 96, 0.4)'
                  : '0 4px 20px rgba(22, 199, 154, 0.4)',
                transition: 'transform 0.1s, box-shadow 0.2s',
                animation: isRunning ? 'pulse 1.5s ease-in-out infinite' : 'none',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              {isRunning ? '⏹ 停止检测' : '▶ 开始检测'}
              {ripples.map(ripple => (
                <span
                  key={ripple.id}
                  style={{
                    position: 'absolute',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.4)',
                    width: '100px',
                    height: '100px',
                    left: ripple.x - 50,
                    top: ripple.y - 50,
                    animation: 'ripple 0.3s ease-out forwards',
                    pointerEvents: 'none'
                  }}
                />
              ))}
            </button>
          </div>
        </section>

        <section style={{
          padding: responsiveSizes.sectionPadding,
          display: 'flex',
          flexDirection: 'column',
          gap: viewportSize.w < 480 ? '6px' : '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: viewportSize.w < 480 ? '12px' : '13px', fontWeight: 600, opacity: 0.8 }}>🎵 目标音阶</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: viewportSize.w < 360 ? '1fr' : '1fr 1fr', gap: viewportSize.w < 480 ? '4px' : '6px' }}>
            {SCALES.map((scale, idx) => (
              <button
                key={scale.name}
                onClick={(e) => { addRipple(e); setSelectedScaleIdx(idx); }}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  padding: responsiveSizes.scaleButtonPadding,
                  borderRadius: viewportSize.w < 480 ? '8px' : '10px',
                  border: selectedScaleIdx === idx
                    ? '2px solid #e94560'
                    : '1px solid rgba(255,255,255,0.1)',
                  background: selectedScaleIdx === idx
                    ? 'rgba(233, 69, 96, 0.15)'
                    : 'rgba(255,255,255,0.03)',
                  color: selectedScaleIdx === idx ? '#e94560' : 'rgba(255,255,255,0.7)',
                  fontSize: responsiveSizes.scaleButtonFontSize,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  touchAction: 'manipulation'
                }}
              >
                {scale.name}
              </button>
            ))}
          </div>
        </section>

        <section style={{
          padding: responsiveSizes.metronomePadding,
          margin: responsiveSizes.metronomeMargin,
          borderRadius: '12px',
          background: 'rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: viewportSize.w < 480 ? '8px' : '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: viewportSize.w < 480 ? '12px' : '13px', fontWeight: 600, opacity: 0.8 }}>🥁 节拍器</span>
            <button
              onClick={(e) => { addRipple(e); toggleMetronome(); }}
              style={{
                position: 'relative',
                overflow: 'hidden',
                padding: viewportSize.w < 480 ? '5px 10px' : '6px 14px',
                borderRadius: '8px',
                border: 'none',
                fontSize: viewportSize.w < 480 ? '11px' : '12px',
                fontWeight: 600,
                cursor: 'pointer',
                color: '#fff',
                background: isMetronomeRunning
                  ? 'linear-gradient(135deg, #e94560, #c73650)'
                  : 'rgba(15, 52, 96, 0.8)',
                boxShadow: isMetronomeRunning
                  ? '0 2px 12px rgba(233, 69, 96, 0.4)'
                  : 'none',
                transition: 'all 0.15s',
                touchAction: 'manipulation'
              }}
            >
              {isMetronomeRunning ? '⏸ 暂停' : '▶ 播放'}
            </button>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: viewportSize.w < 480 ? '4px' : '8px' }}>
              <span style={{ fontSize: viewportSize.w < 480 ? '10px' : '11px', opacity: 0.6 }}>速度 BPM</span>
              <span style={{
                fontSize: responsiveSizes.bpmFontSize,
                fontWeight: 700,
                color: bpmTextColor,
                transition: 'color 0.1s',
                fontFamily: 'monospace',
                minWidth: viewportSize.w < 480 ? '45px' : '60px',
                textAlign: 'right'
              }}>
                {bpm}
              </span>
            </div>
            <div style={{
              position: 'relative',
              height: '8px',
              borderRadius: '4px',
              background: 'rgba(255,255,255,0.08)',
              overflow: 'visible'
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                width: `${((bpm - 40) / 160) * 100}%`,
                borderRadius: '4px',
                background: bpmGradient,
                transition: 'width 0.05s linear, background 0.1s',
                boxShadow: `0 0 10px ${bpmTextColor}50`
              }} />
              <input
                type="range"
                min={40}
                max={200}
                step={1}
                value={bpm}
                onChange={(e) => setBpm(parseInt(e.target.value))}
                style={{
                  position: 'absolute',
                  top: '-8px',
                  left: 0,
                  width: '100%',
                  height: '24px',
                  opacity: 0,
                  cursor: 'pointer',
                  touchAction: 'none'
                }}
              />
              <div style={{
                position: 'absolute',
                top: '-8px',
                left: `calc(${((bpm - 40) / 160) * 100}% - 10px)`,
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#fff',
                boxShadow: `0 2px 8px rgba(0,0,0,0.3), 0 0 12px ${bpmTextColor}80`,
                pointerEvents: 'none',
                transition: 'left 0.05s linear',
                border: `2px solid ${bpmTextColor}`
              }} />
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '10px',
              opacity: 0.4,
              marginTop: '4px'
            }}>
              <span>40 慢</span>
              <span style={{ color: bpm >= 110 && bpm <= 130 ? bpmTextColor : 'inherit' }}>120</span>
              <span>200 快</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '8px' }}>拍号</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {TIME_SIGNATURES.map(sig => (
                <button
                  key={sig}
                  onClick={(e) => { addRipple(e); setTimeSignature(sig); }}
                  style={{
                    flex: 1,
                    padding: responsiveSizes.timeSigButtonPadding,
                    borderRadius: '8px',
                    border: timeSignature === sig
                      ? '2px solid #16c79a'
                      : '1px solid rgba(255,255,255,0.08)',
                    background: timeSignature === sig
                      ? 'rgba(22, 199, 154, 0.15)'
                      : 'rgba(255,255,255,0.02)',
                    color: timeSignature === sig ? '#16c79a' : 'rgba(255,255,255,0.6)',
                    fontSize: responsiveSizes.timeSigButtonFontSize,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    transition: 'all 0.15s',
                    touchAction: 'manipulation'
                  }}
                >
                  {sig}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section style={{
          padding: responsiveSizes.sectionPadding,
          display: 'flex',
          flexDirection: 'column',
          gap: viewportSize.w < 480 ? '6px' : '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: viewportSize.w < 480 ? '12px' : '13px', fontWeight: 600, opacity: 0.8 }}>🎙 录音练习</span>
            {isRecording && (
              <span style={{
                fontSize: viewportSize.w < 480 ? '11px' : '12px',
                fontWeight: 600,
                color: '#e94560',
                fontFamily: 'monospace'
              }}>
                {recordingTime.toFixed(1)}s / {MAX_RECORD_SECONDS}s
              </span>
            )}
            {!isRecording && recordedData.length > 0 && !isPlayingBack && (
              <span style={{
                fontSize: viewportSize.w < 480 ? '10px' : '11px',
                opacity: 0.6,
                fontFamily: 'monospace'
              }}>
                已录制 {(recordedData[recordedData.length - 1]?.time || 0).toFixed(1)}s
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: viewportSize.w < 480 ? '6px' : '8px' }}>
            <button
              onClick={(e) => { addRipple(e); isRecording ? stopRecording() : startRecording(); }}
              disabled={!isRunning || isPlayingBack}
              style={{
                flex: 1,
                position: 'relative',
                overflow: 'hidden',
                padding: responsiveSizes.recButtonPadding,
                borderRadius: viewportSize.w < 480 ? '8px' : '10px',
                border: 'none',
                fontSize: responsiveSizes.recButtonFontSize,
                fontWeight: 600,
                cursor: (!isRunning || isPlayingBack) ? 'not-allowed' : 'pointer',
                color: '#fff',
                opacity: (!isRunning || isPlayingBack) ? 0.4 : 1,
                background: isRecording
                  ? 'linear-gradient(135deg, #e94560, #a02040)'
                  : 'linear-gradient(135deg, #0f3460, #16213e)',
                boxShadow: isRecording ? '0 4px 20px rgba(233, 69, 96, 0.4)' : 'none',
                animation: isRecording ? 'pulse 1.5s ease-in-out infinite' : 'none',
                touchAction: 'manipulation'
              }}
            >
              {isRecording ? '⏹ 停止录音' : '● 开始录音'}
            </button>
            <button
              onClick={(e) => { addRipple(e); isPlayingBack ? stopPlayback() : startPlayback(); }}
              disabled={recordedData.length === 0}
              style={{
                flex: 1,
                position: 'relative',
                overflow: 'hidden',
                padding: responsiveSizes.recButtonPadding,
                borderRadius: viewportSize.w < 480 ? '8px' : '10px',
                border: 'none',
                fontSize: responsiveSizes.recButtonFontSize,
                fontWeight: 600,
                cursor: recordedData.length === 0 ? 'not-allowed' : 'pointer',
                color: '#fff',
                opacity: recordedData.length === 0 ? 0.4 : 1,
                background: isPlayingBack
                  ? 'linear-gradient(135deg, #f39c12, #d68910)'
                  : 'linear-gradient(135deg, #16c79a, #0f9b75)',
                boxShadow: isPlayingBack ? '0 4px 20px rgba(243, 156, 18, 0.4)' : 'none',
                touchAction: 'manipulation'
              }}
            >
              {isPlayingBack ? '⏸ 停止回放' : '▶ 回放'}
            </button>
          </div>
        </section>

        {!isMobile && (
          <section style={{
            padding: '0 20px 20px 20px',
            marginTop: 'auto'
          }}>
            <div style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                opacity: 0.7,
                marginBottom: '8px'
              }}>
                🎼 使用提示
              </div>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                fontSize: '11px',
                opacity: 0.55,
                lineHeight: 1.7,
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}>
                <li>• 点击「开始检测」后对着麦克风发声</li>
                <li>• 绿色=准确 黄色=一般 红色=偏差大</li>
                <li>• 开启节拍器辅助练习节奏感</li>
                <li>• 录音30秒可回放检查进步</li>
              </ul>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default App;
