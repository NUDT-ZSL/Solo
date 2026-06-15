import React, { useState, useRef, useEffect, useCallback } from 'react';
import VideoPanel from './components/VideoPanel';
import NoteMatrix from './components/NoteMatrix';
import { HandDetector, FrameData, GestureType, LandmarkPoint } from './HandDetector';
import { SoundEngine, InstrumentType, TimbreType } from './SoundEngine';

const TIMBRE_OPTIONS: { value: TimbreType; label: string }[] = [
  { value: 'warm', label: '温暖' },
  { value: 'bright', label: '明亮' },
  { value: 'soft', label: '柔和' },
  { value: 'sharp', label: '锐利' }
];

const GESTURE_NAMES: Record<GestureType, string> = {
  fist: '✊ 握拳 (鼓)',
  open: '🖐 张开 (吉他)',
  point: '☝ 指向 (长笛)',
  none: '无手势'
};

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const handDetectorRef = useRef<HandDetector | null>(null);
  const soundEngineRef = useRef<SoundEngine | null>(null);

  const [landmarks, setLandmarks] = useState<LandmarkPoint[]>([]);
  const [connections, setConnections] = useState<[number, number][]>([]);
  const [currentGesture, setCurrentGesture] = useState<GestureType>('none');
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timbre, setTimbre] = useState<TimbreType>('warm');
  const [highlightedCells, setHighlightedCells] = useState<{ row: number; col: number; color: string }[]>([]);
  const [pulseCells, setPulseCells] = useState<{ row: number; col: number; color: string }[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [statusMessage, setStatusMessage] = useState('正在启动摄像头...');

  const lastGestureRef = useRef<GestureType>('none');
  const lastGestureTimeRef = useRef<number>(0);
  const lastIndexXRef = useRef<number>(-1);
  const currentPointColRef = useRef<number>(2);
  const currentPointRowRef = useRef<number>(2);
  const lastFlutePlayRef = useRef<number>(0);

  const matrixRows = isMobile ? 3 : 5;
  const matrixCols = isMobile ? 3 : 5;
  const cellSize = 50;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    handDetectorRef.current = new HandDetector();
    soundEngineRef.current = new SoundEngine();
    setConnections(handDetectorRef.current.getConnections());

    initCamera();

    return () => {
      if (handDetectorRef.current) {
        handDetectorRef.current.stop();
      }
    };
  }, []);

  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play();
            if (handDetectorRef.current) {
              handDetectorRef.current.attachVideo(videoRef.current);
              handDetectorRef.current.onFrame(handleFrame);
              handDetectorRef.current.start();
            }
            setCameraReady(true);
            setStatusMessage('摄像头已就绪，请做出手势');
          }
        };
      }
    } catch (err) {
      setStatusMessage('无法访问摄像头: ' + (err as Error).message);
    }
  };

  const handleFrame = useCallback((data: FrameData) => {
    setLandmarks(data.landmarks);

    const now = performance.now();
    const gestureDebounce = 300;
    const fluteDebounce = 150;

    if (data.gesture !== lastGestureRef.current || now - lastGestureTimeRef.current > gestureDebounce) {
      if (data.gesture !== lastGestureRef.current) {
        lastGestureTimeRef.current = now;
        lastGestureRef.current = data.gesture;
        setCurrentGesture(data.gesture);

        if (data.gesture === 'fist') {
          triggerFistGesture();
        } else if (data.gesture === 'open') {
          triggerOpenGesture();
        }
      }
    }

    if (data.gesture === 'point' && data.indexFingerTip) {
      if (lastIndexXRef.current === -1) {
        lastIndexXRef.current = data.indexFingerTip.x;
      }

      const deltaX = (lastIndexXRef.current - data.indexFingerTip.x) * 480;

      if (Math.abs(deltaX) > 50) {
        const moveSteps = Math.trunc(deltaX / 50);
        currentPointColRef.current = Math.max(0, Math.min(matrixCols - 1, currentPointColRef.current + moveSteps));
        lastIndexXRef.current = data.indexFingerTip.x;
      }

      const rowY = data.indexFingerTip.y;
      currentPointRowRef.current = Math.max(0, Math.min(matrixRows - 1, Math.floor(rowY * matrixRows)));

      if (now - lastFlutePlayRef.current > fluteDebounce) {
        triggerPointGesture(currentPointRowRef.current, currentPointColRef.current);
        lastFlutePlayRef.current = now;
      }
    } else {
      lastIndexXRef.current = -1;
    }
  }, [matrixRows, matrixCols]);

  const triggerFistGesture = async () => {
    if (!soundEngineRef.current) return;
    await soundEngineRef.current.init();

    const positions: { row: number; col: number }[] = [];
    const chosen = new Set<string>();
    while (positions.length < 3) {
      const r = Math.floor(Math.random() * matrixRows);
      const c = Math.floor(Math.random() * matrixCols);
      const key = `${r}-${c}`;
      if (!chosen.has(key)) {
        chosen.add(key);
        positions.push({ row: r, col: c });
      }
    }

    setPulseCells(positions.map(p => ({ ...p, color: '#FF4500' })));

    for (const pos of positions) {
      await soundEngineRef.current.playNote(pos.row, pos.col, 'drum', matrixCols, '8n');
    }

    setTimeout(() => {
      setPulseCells([]);
    }, 400);
  };

  const triggerOpenGesture = async () => {
    if (!soundEngineRef.current) return;
    await soundEngineRef.current.init();

    const row = Math.floor(Math.random() * matrixRows);
    const positions: { row: number; col: number }[] = [];
    for (let i = 0; i < Math.min(5, matrixCols); i++) {
      positions.push({ row, col: i });
    }

    for (let i = 0; i < positions.length; i++) {
      setTimeout(() => {
        setHighlightedCells([{ ...positions[i], color: '#00FF7F' }]);
        soundEngineRef.current?.playNote(positions[i].row, positions[i].col, 'guitar', matrixCols, '4n');

        setTimeout(() => {
          setHighlightedCells(prev => prev.filter(c => !(c.row === positions[i].row && c.col === positions[i].col)));
        }, 200);
      }, i * 200);
    }
  };

  const triggerPointGesture = async (row: number, col: number) => {
    if (!soundEngineRef.current) return;
    await soundEngineRef.current.init();

    setHighlightedCells([{ row, col, color: '#FFD700' }]);
    await soundEngineRef.current.playNote(row, col, 'flute', matrixCols, '8n');
  };

  const handleCellClick = async (row: number, col: number, instrument: InstrumentType) => {
    if (!soundEngineRef.current) return;
    await soundEngineRef.current.init();
    await soundEngineRef.current.playNote(row, col, instrument, matrixCols, '8n');
  };

  const getNoteName = (row: number, col: number): string => {
    if (soundEngineRef.current) {
      return soundEngineRef.current.getNoteAt(row, col, matrixCols);
    }
    const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const octave = 4 + Math.floor((row * matrixCols + col) / 7);
    return notes[(row * matrixCols + col) % 7] + octave;
  };

  const handleStartRecording = async () => {
    if (!soundEngineRef.current) return;
    await soundEngineRef.current.init();
    soundEngineRef.current.startRecording();
    setIsRecording(true);
  };

  const handleStopRecording = async () => {
    if (!soundEngineRef.current) return;
    const notes = soundEngineRef.current.stopRecording();
    setIsRecording(false);

    if (notes.length > 0) {
      setIsPlaying(true);
      await soundEngineRef.current.playRecording(notes);
      const maxTime = Math.max(...notes.map(n => n.time + n.duration));
      setTimeout(() => setIsPlaying(false), maxTime + 500);
    }
  };

  const handleClearTrack = () => {
    if (soundEngineRef.current) {
      soundEngineRef.current.clearRecording();
    }
    setIsRecording(false);
    setIsPlaying(false);
  };

  const handleTimbreChange = (value: TimbreType) => {
    setTimbre(value);
    if (soundEngineRef.current) {
      soundEngineRef.current.setTimbre(value);
    }
  };

  const buttonStyle: React.CSSProperties = {
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.3s ease',
    color: '#fff',
    background: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.2)'
  };

  const selectStyle: React.CSSProperties = {
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
    outline: 'none'
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto'
      }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: '16px 24px',
          background: 'rgba(26, 26, 46, 0.7)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          transition: 'opacity 0.3s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <h1 style={{ color: '#fff', fontSize: isMobile ? '18px' : '22px', margin: 0 }}>
            🎵 手势音乐工作室
          </h1>
          <span
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              background: 'rgba(78, 205, 196, 0.2)',
              color: '#4ECDC4',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            {GESTURE_NAMES[currentGesture]}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleStartRecording}
            disabled={isRecording}
            style={{
              ...buttonStyle,
              background: isRecording ? 'rgba(255, 71, 87, 0.3)' : 'rgba(255, 71, 87, 0.8)',
              opacity: isRecording ? 0.6 : 1,
              cursor: isRecording ? 'not-allowed' : 'pointer'
            }}
          >
            {isRecording ? '⏺ 录制中...' : '⏺ 开始录制'}
          </button>

          <button
            onClick={handleStopRecording}
            disabled={!isRecording && !isPlaying}
            style={{
              ...buttonStyle,
              background: 'rgba(78, 205, 196, 0.8)',
              opacity: !isRecording && !isPlaying ? 0.6 : 1,
              cursor: !isRecording && !isPlaying ? 'not-allowed' : 'pointer'
            }}
          >
            {isPlaying ? '▶ 播放中...' : '■ 停止/播放'}
          </button>

          <button
            onClick={handleClearTrack}
            style={{
              ...buttonStyle,
              background: 'rgba(255, 159, 67, 0.8)'
            }}
          >
            ✕ 清除轨道
          </button>

          <select
            value={timbre}
            onChange={(e) => handleTimbreChange(e.target.value as TimbreType)}
            style={selectStyle}
          >
            {TIMBRE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value} style={{ background: '#1a1a2e' }}>
                🎨 {opt.label}音色
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isMobile ? '24px' : '40px',
          padding: isMobile ? '20px 16px' : '40px',
          transition: 'all 0.3s ease'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <VideoPanel
            videoRef={videoRef as React.RefObject<HTMLVideoElement>}
            landmarks={landmarks}
            connections={connections}
            isMobile={isMobile}
          />
          <span
            style={{
              color: cameraReady ? '#4ECDC4' : '#FF6B6B',
              fontSize: '13px',
              opacity: 0.8
            }}
          >
            {statusMessage}
          </span>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.7)',
              maxWidth: isMobile ? '300px' : '480px'
            }}
          >
            <span>✊ 握拳 = 鼓声 (随机3格)</span>
            <span>🖐 五指张开 = 吉他扫弦 (左→右)</span>
            <span>☝ 食指指向 = 笛声 (移动切换)</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ color: '#fff', fontSize: '16px', margin: 0, fontWeight: 500 }}>
            🎹 音阶矩阵 ({matrixRows}×{matrixCols})
          </h2>
          <NoteMatrix
            rows={matrixRows}
            cols={matrixCols}
            isMobile={isMobile}
            cellSize={cellSize}
            onCellClick={handleCellClick}
            highlightedCells={highlightedCells}
            pulseCells={pulseCells}
            getNoteName={getNoteName}
          />
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
            悬停显示音名 · 点击切换音色 · 拖拽交换位置
          </span>
        </div>
      </div>
    </div>
  );
};

export default App;
