import { useState, useCallback, useEffect, useRef } from 'react';
import BeatCanvas from './components/BeatCanvas';
import ControlPanel from './components/ControlPanel';
import {
  STANDARD_PATTERNS,
  getStandardBeats,
  parseUserBeat,
  calculateDeviation,
  getBeatPositions,
  type DeviationResult,
  type BeatPosition,
} from './utils/beatEngine';
import './App.css';

type InputMode = 'manual' | 'recording';

function App() {
  const [selectedPattern, setSelectedPattern] = useState('4/4');
  const [bpm, setBpm] = useState(120);
  const [inputMode, setInputMode] = useState<InputMode>('manual');
  const [isRecording, setIsRecording] = useState(false);
  const [userTimestamps, setUserTimestamps] = useState<number[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [deviationResult, setDeviationResult] = useState<DeviationResult | null>(null);
  const [pulseAnimations, setPulseAnimations] = useState<{ id: number; x: number; y: number }[]>([]);
  const [sensitivity, setSensitivity] = useState(50);
  const [fadeOpacity, setFadeOpacity] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);
  const [playTime, setPlayTime] = useState(0);
  const [beatPosition, setBeatPosition] = useState<BeatPosition | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const playAnimationRef = useRef<number | null>(null);
  const playStartTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const pulseIdCounter = useRef(0);

  const standardBeats = getStandardBeats(selectedPattern, bpm);

  const userBeats = startTime !== null ? parseUserBeat(userTimestamps, startTime) : [];

  const handlePatternChange = useCallback((patternId: string) => {
    setFadeOpacity(0);
    setTimeout(() => {
      setSelectedPattern(patternId);
      setFadeOpacity(1);
    }, 400);
  }, []);

  const handleBpmChange = useCallback((newBpm: number) => {
    setBpm(newBpm);
  }, []);

  const handleSensitivityChange = useCallback((newSensitivity: number) => {
    setSensitivity(newSensitivity);
  }, []);

  const handleInputModeChange = useCallback((mode: InputMode) => {
    setInputMode(mode);
    stopRecording();
    resetSession();
  }, []);

  const resetSession = useCallback(() => {
    setUserTimestamps([]);
    setStartTime(null);
    setDeviationResult(null);
    setIsPlaying(false);
    setPlayProgress(0);
    setPlayTime(0);
    setBeatPosition(null);
    playStartTimeRef.current = 0;
    pausedTimeRef.current = 0;
    if (playAnimationRef.current) {
      cancelAnimationFrame(playAnimationRef.current);
      playAnimationRef.current = null;
    }
  }, []);

  const addPulseAnimation = useCallback((x: number, y: number) => {
    const id = pulseIdCounter.current++;
    setPulseAnimations(prev => [...prev, { id, x, y }]);
    setTimeout(() => {
      setPulseAnimations(prev => prev.filter(p => p.id !== id));
    }, 200);
  }, []);

  const handleManualBeat = useCallback((e?: React.MouseEvent) => {
    const now = performance.now();

    if (startTime === null) {
      setStartTime(now);
    }

    setUserTimestamps(prev => [...prev, now]);

    if (e) {
      const rect = e.currentTarget.getBoundingClientRect();
      addPulseAnimation(e.clientX - rect.left, e.clientY - rect.top);
    }
  }, [startTime, addPulseAnimation]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      setIsRecording(true);
      setStartTime(null);
      setUserTimestamps([]);

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      let lastBeatTime = 0;
      const minInterval = 150;

      const detectBeat = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const threshold = (sensitivity / 100) * 150 + 30;
        const now = performance.now();

        if (average > threshold && now - lastBeatTime > minInterval) {
          lastBeatTime = now;
          if (startTime === null) {
            setStartTime(now);
          }
          setUserTimestamps(prev => [...prev, now]);
          addPulseAnimation(Math.random() * 200, Math.random() * 100);
        }

        animationFrameRef.current = requestAnimationFrame(detectBeat);
      };

      detectBeat();
    } catch (error) {
      console.error('无法访问麦克风:', error);
      alert('请允许访问麦克风以使用录音功能');
    }
  }, [sensitivity, startTime, addPulseAnimation]);

  const stopRecording = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const handleStartStop = useCallback(() => {
    if (inputMode === 'manual') {
      if (startTime === null) {
        setStartTime(performance.now());
      } else {
        finishSession();
      }
    } else {
      if (isRecording) {
        stopRecording();
        finishSession();
      } else {
        startRecording();
      }
    }
  }, [inputMode, startTime, isRecording, stopRecording, startRecording]);

  const finishSession = useCallback(() => {
    if (userTimestamps.length > 0 && startTime !== null) {
      const result = calculateDeviation(userBeats, standardBeats);
      setDeviationResult(result);
    }
  }, [userTimestamps, startTime, userBeats, standardBeats]);

  const handlePlayPause = useCallback(() => {
    if (userBeats.length === 0 && standardBeats.length === 0) return;

    const totalDuration = standardBeats.length > 0
      ? (standardBeats.length * 60000) / bpm
      : 2000;

    if (isPlaying) {
      pausedTimeRef.current = playTime;
      setIsPlaying(false);
      if (playAnimationRef.current) {
        cancelAnimationFrame(playAnimationRef.current);
        playAnimationRef.current = null;
      }
    } else {
      setIsPlaying(true);
      playStartTimeRef.current = performance.now() - pausedTimeRef.current;

      const animate = () => {
        const currentTime = performance.now() - playStartTimeRef.current;
        const clampedTime = Math.min(currentTime, totalDuration);

        setPlayTime(clampedTime);

        const progress = Math.min(1, clampedTime / totalDuration);
        setPlayProgress(progress);

        const position = getBeatPositions(standardBeats, clampedTime, bpm);
        setBeatPosition(position);

        if (progress < 1) {
          playAnimationRef.current = requestAnimationFrame(animate);
        } else {
          setIsPlaying(false);
          pausedTimeRef.current = 0;
        }
      };

      playAnimationRef.current = requestAnimationFrame(animate);
    }
  }, [userBeats, standardBeats, bpm, isPlaying, playTime]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (playAnimationRef.current) {
        cancelAnimationFrame(playAnimationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return '#2ECC71';
    if (accuracy >= 75) return '#F1C40F';
    return '#E74C3C';
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎵 节拍可视化与节奏对比工具</h1>
        <p className="subtitle">实时对比演奏节奏与标准节拍</p>
      </header>

      <div className="main-content">
        <ControlPanel
          patterns={STANDARD_PATTERNS}
          selectedPattern={selectedPattern}
          bpm={bpm}
          sensitivity={sensitivity}
          inputMode={inputMode}
          isRecording={isRecording}
          hasStarted={startTime !== null}
          onPatternChange={handlePatternChange}
          onBpmChange={handleBpmChange}
          onSensitivityChange={handleSensitivityChange}
          onInputModeChange={handleInputModeChange}
          onStartStop={handleStartStop}
          onManualBeat={handleManualBeat}
          onReset={resetSession}
          onPlayPause={handlePlayPause}
          canPlay={userBeats.length > 0 || standardBeats.length > 0}
          isPlaying={isPlaying}
          playTime={playTime}
          pulseAnimations={pulseAnimations}
        />

        <div className="canvas-section">
          <BeatCanvas
            standardBeats={standardBeats}
            userBeats={userBeats}
            fadeOpacity={fadeOpacity}
            playProgress={playProgress}
            playTime={playTime}
            isPlaying={isPlaying}
            beatPosition={beatPosition}
            deviations={deviationResult?.deviations || []}
            bpm={bpm}
          />

          {deviationResult && (
            <div className="score-section">
              <div className="score-divider"></div>
              <div className="score-container slide-up">
                <div className="accuracy-bar-container">
                  <div className="accuracy-bar-label">
                    <span>整体准确率</span>
                    <span className="accuracy-value" style={{ color: getAccuracyColor(deviationResult.accuracy) }}>
                      {deviationResult.accuracy.toFixed(1)}%
                    </span>
                  </div>
                  <div className="accuracy-bar-bg">
                    <div
                      className="accuracy-bar-fill"
                      style={{
                        width: `${deviationResult.accuracy}%`,
                        background: `linear-gradient(90deg, #2ECC71 0%, #F1C40F 50%, #E74C3C 100%)`,
                      }}
                    ></div>
                  </div>
                </div>

                <div className="grade-display">
                  <div className="grade-label">综合评定</div>
                  <div className="grade-value" style={{ color: getAccuracyColor(deviationResult.accuracy) }}>
                    {deviationResult.grade}
                  </div>
                </div>

                <div className="deviation-details">
                  <div className="details-title">各拍偏差详情</div>
                  <div className="deviation-list">
                    {deviationResult.deviations.map((dev, index) => (
                      <div key={index} className="deviation-item">
                        <span className="beat-index">第{index + 1}拍</span>
                        <span
                          className={`deviation-value ${dev > 0 ? 'late' : dev < 0 ? 'early' : 'perfect'}`}
                        >
                          {dev === 0 ? '完美' : dev > 0 ? `+${dev}ms` : `${dev}ms`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
