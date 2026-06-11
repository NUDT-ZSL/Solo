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

interface Ripple {
  id: number;
  x: number;
  y: number;
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

  const selectedScale = SCALES[selectedScaleIdx];

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const trimData = useCallback((data: PitchData[], maxSeconds: number = 10): PitchData[] => {
    if (data.length === 0) return data;
    const latestTime = data[data.length - 1].time;
    const threshold = latestTime - maxSeconds;
    return data.filter(d => d.time >= threshold);
  }, []);

  const handlePitchData = useCallback((data: PitchData) => {
    setPitchData(prev => {
      const updated = [...prev, data];
      return trimData(updated, 10);
    });
  }, [trimData]);

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
    setIsRunning(false);
    stopRecording();
    setPitchData([]);
  }, []);

  const startRecording = useCallback(async () => {
    if (!isRunning || isRecording) return;

    try {
      recordedChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      recordedMediaRef.current = recorder;

      setIsRecording(true);
      recordingStartRef.current = performance.now() / 1000;
      setRecordedData([]);
      setRecordingTime(0);

      recordingTimerRef.current = window.setInterval(() => {
        const elapsed = performance.now() / 1000 - recordingStartRef.current;
        setRecordingTime(elapsed);
        if (elapsed >= MAX_RECORD_SECONDS) {
          stopRecording();
        }
      }, 100);

      const captureStart = performance.now() / 1000;
      const captureInterval = window.setInterval(() => {
        if (!isRecording) {
          window.clearInterval(captureInterval);
          return;
        }
        setPitchData(prev => {
          const segment = prev.filter(d => d.time >= captureStart).map(d => ({
            ...d,
            time: d.time - recordingStartRef.current
          }));
          if (segment.length > 0) {
            setRecordedData(rd => {
              const combined = [...rd, ...segment];
              const unique = combined.filter((d, i, arr) =>
                i === 0 || d.time - arr[i - 1].time > 0.005
              );
              return unique.slice(-5000);
            });
          }
          return prev;
        });
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
      recordedMediaRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const startPlayback = useCallback(() => {
    if (recordedData.length === 0) return;

    if (recordedChunksRef.current.length > 0) {
      const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      audioPlaybackRef.current = new Audio(url);
      audioPlaybackRef.current.onended = () => {
        setIsPlayingBack(false);
        visualizerRef.current?.stopPlayback();
      };
      audioPlaybackRef.current.play().catch(() => {});
    }

    visualizerRef.current?.startPlayback(recordedData);
    setIsPlayingBack(true);

    const duration = recordedData[recordedData.length - 1].time * 1000;
    window.setTimeout(() => {
      setIsPlayingBack(false);
      visualizerRef.current?.stopPlayback();
    }, duration + 500);
  }, [recordedData]);

  const stopPlayback = useCallback(() => {
    if (audioPlaybackRef.current) {
      audioPlaybackRef.current.pause();
      audioPlaybackRef.current = null;
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
      stopPlayback();
    };
  }, [stopPlayback]);

  const getBpmGradient = useMemo(() => {
    const t = (bpm - 40) / (200 - 40);
    const hue = 200 - t * 180;
    return `linear-gradient(to right, hsl(${hue}, 80%, 60%), hsl(${hue + 40}, 80%, 50%))`;
  }, [bpm]);

  const appLayout = isMobile ? 'flex flex-col h-full w-full' : 'flex flex-row h-full w-full p-4 gap-4';
  const canvasStyle = isMobile ? 'flex-1 p-2 pb-0' : 'flex-[7]';
  const panelStyle = isMobile
    ? 'h-auto p-3 mx-2 mb-2'
    : 'flex-[3] max-w-[380px]';

  return (
    <div className={appLayout} style={{ background: '#0d0d1a', color: '#fff' }}>
      <div className={canvasStyle} style={{ display: 'flex', minHeight: 0 }}>
        <Visualizer
          ref={visualizerRef}
          pitchData={pitchData}
          scaleName={selectedScale.name}
          scaleNotes={selectedScale.notes}
          activeBeats={activeBeats}
          isRecording={isRecording}
          recordedData={isPlayingBack ? recordedData : []}
          isPlayingBack={isPlayingBack}
        />
      </div>

      <div
        className={panelStyle}
        style={{
          background: 'rgba(15, 52, 96, 0.4)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px 0 20px'
        }}>
          <h1 style={{
            fontSize: '20px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #e94560, #16c79a)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.5px'
          }}>
            PitchTrainer
          </h1>
          <div style={{
            fontSize: '10px',
            padding: '3px 8px',
            borderRadius: '8px',
            background: isRunning ? 'rgba(22, 199, 154, 0.15)' : 'rgba(128,128,128,0.1)',
            color: isRunning ? '#16c79a' : 'rgba(255,255,255,0.5)'
          }}>
            {isRunning ? '● LIVE' : '○ IDLE'}
          </div>
        </div>

        {error && (
          <div style={{
            margin: '0 20px',
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'rgba(233, 69, 96, 0.15)',
            color: '#e94560',
            fontSize: '13px',
            border: '1px solid rgba(233, 69, 96, 0.3)'
          }}>
            {error}
          </div>
        )}

        <section style={{ padding: '0 20px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={(e) => { addRipple(e); isRunning ? stopDetection() : startDetection(); }}
              style={{
                flex: 1,
                position: 'relative',
                overflow: 'hidden',
                padding: '14px 20px',
                borderRadius: '12px',
                border: 'none',
                fontSize: '14px',
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
                animation: isRunning ? 'pulse 1.5s ease-in-out infinite' : 'none'
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

        <section style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, opacity: 0.8 }}>🎵 目标音阶</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {SCALES.map((scale, idx) => (
              <button
                key={scale.name}
                onClick={(e) => { addRipple(e); setSelectedScaleIdx(idx); }}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: selectedScaleIdx === idx
                    ? '2px solid #e94560'
                    : '1px solid rgba(255,255,255,0.1)',
                  background: selectedScaleIdx === idx
                    ? 'rgba(233, 69, 96, 0.15)'
                    : 'rgba(255,255,255,0.03)',
                  color: selectedScaleIdx === idx ? '#e94560' : 'rgba(255,255,255,0.7)',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {scale.name}
              </button>
            ))}
          </div>
        </section>

        <section style={{
          padding: '16px 20px',
          margin: '0 16px',
          borderRadius: '12px',
          background: 'rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, opacity: 0.8 }}>🥁 节拍器</span>
            <button
              onClick={(e) => { addRipple(e); toggleMetronome(); }}
              style={{
                position: 'relative',
                overflow: 'hidden',
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                color: '#fff',
                background: isMetronomeRunning
                  ? 'linear-gradient(135deg, #e94560, #c73650)'
                  : 'rgba(15, 52, 96, 0.8)',
                boxShadow: isMetronomeRunning
                  ? '0 2px 12px rgba(233, 69, 96, 0.4)'
                  : 'none',
                transition: 'all 0.15s'
              }}
            >
              {isMetronomeRunning ? '⏸ 暂停' : '▶ 播放'}
            </button>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', opacity: 0.6 }}>速度 BPM</span>
              <span style={{
                fontSize: '24px',
                fontWeight: 700,
                background: getBpmGradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                {bpm}
              </span>
            </div>
            <div style={{
              position: 'relative',
              height: '6px',
              borderRadius: '3px',
              background: 'rgba(255,255,255,0.08)',
              overflow: 'visible'
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                width: `${((bpm - 40) / 160) * 100}%`,
                borderRadius: '3px',
                background: getBpmGradient
              }} />
              <input
                type="range"
                min={40}
                max={200}
                value={bpm}
                onChange={(e) => setBpm(parseInt(e.target.value))}
                style={{
                  position: 'absolute',
                  top: '-6px',
                  left: 0,
                  width: '100%',
                  height: '18px',
                  opacity: 0,
                  cursor: 'pointer'
                }}
              />
              <div style={{
                position: 'absolute',
                top: '-6px',
                left: `calc(${((bpm - 40) / 160) * 100}% - 9px)`,
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                pointerEvents: 'none'
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
              <span>120</span>
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
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: timeSignature === sig
                      ? '2px solid #16c79a'
                      : '1px solid rgba(255,255,255,0.08)',
                    background: timeSignature === sig
                      ? 'rgba(22, 199, 154, 0.15)'
                      : 'rgba(255,255,255,0.02)',
                    color: timeSignature === sig ? '#16c79a' : 'rgba(255,255,255,0.6)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    transition: 'all 0.15s'
                  }}
                >
                  {sig}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, opacity: 0.8 }}>🎙 录音练习</span>
            {isRecording && (
              <span style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#e94560',
                fontFamily: 'monospace'
              }}>
                {recordingTime.toFixed(1)}s / {MAX_RECORD_SECONDS}s
              </span>
            )}
            {!isRecording && recordedData.length > 0 && !isPlayingBack && (
              <span style={{
                fontSize: '11px',
                opacity: 0.6,
                fontFamily: 'monospace'
              }}>
                已录制 {(recordedData[recordedData.length - 1]?.time || 0).toFixed(1)}s
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={(e) => { addRipple(e); isRecording ? stopRecording() : startRecording(); }}
              disabled={!isRunning || isPlayingBack}
              style={{
                flex: 1,
                position: 'relative',
                overflow: 'hidden',
                padding: '12px 16px',
                borderRadius: '10px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: (!isRunning || isPlayingBack) ? 'not-allowed' : 'pointer',
                color: '#fff',
                opacity: (!isRunning || isPlayingBack) ? 0.4 : 1,
                background: isRecording
                  ? 'linear-gradient(135deg, #e94560, #a02040)'
                  : 'linear-gradient(135deg, #0f3460, #16213e)',
                boxShadow: isRecording ? '0 4px 20px rgba(233, 69, 96, 0.4)' : 'none',
                animation: isRecording ? 'pulse 1.5s ease-in-out infinite' : 'none'
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
                padding: '12px 16px',
                borderRadius: '10px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: recordedData.length === 0 ? 'not-allowed' : 'pointer',
                color: '#fff',
                opacity: recordedData.length === 0 ? 0.4 : 1,
                background: isPlayingBack
                  ? 'linear-gradient(135deg, #f39c12, #d68910)'
                  : 'linear-gradient(135deg, #16c79a, #0f9b75)',
                boxShadow: isPlayingBack ? '0 4px 20px rgba(243, 156, 18, 0.4)' : 'none'
              }}
            >
              {isPlayingBack ? '⏸ 停止回放' : '▶ 回放'}
            </button>
          </div>
        </section>

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
      </div>
    </div>
  );
}

export default App;
