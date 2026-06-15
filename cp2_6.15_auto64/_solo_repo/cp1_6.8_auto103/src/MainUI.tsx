import React, { useState, useEffect, useRef, useCallback } from 'react';
import SoundEngine, { PALETTE_COLORS, RecordedEvent } from './SoundEngine';
import CollaborationHub from './CollaborationHub';
import SoundCanvas from './SoundCanvas';

const soundEngine = new SoundEngine();
const hub = new CollaborationHub();

type RecordingState = 'idle' | 'recording' | 'done';

const MainUI: React.FC = () => {
  const [selectedColor, setSelectedColor] = useState(PALETTE_COLORS[0]);
  const [lineWidth, setLineWidth] = useState(4);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [onlineCount, setOnlineCount] = useState(1);
  const [wsConnected, setWsConnected] = useState(false);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedEvents, setRecordedEvents] = useState<RecordedEvent[]>([]);
  const [timelineVisible, setTimelineVisible] = useState(false);
  const timelineCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    hub.on({
      onUserCount: (count) => setOnlineCount(count),
      onConnectionChange: (connected) => setWsConnected(connected),
    });
    hub.connect();
    return () => {
      hub.disconnect();
      soundEngine.destroy();
    };
  }, []);

  useEffect(() => {
    if (!timelineVisible || !timelineCanvasRef.current || recordedEvents.length === 0) return;
    const canvas = timelineCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, displayWidth, displayHeight);

    const maxTime = Math.max(recordedEvents[recordedEvents.length - 1]?.timestamp || 1, 1);

    const gradient = ctx.createLinearGradient(0, 0, displayWidth, 0);
    gradient.addColorStop(0, 'rgba(0, 200, 255, 0.3)');
    gradient.addColorStop(0.5, 'rgba(0, 255, 150, 0.3)');
    gradient.addColorStop(1, 'rgba(200, 0, 255, 0.3)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    recordedEvents.forEach((evt) => {
      if (evt.type === 'start') {
        const x = (evt.timestamp / maxTime) * displayWidth;
        const y = (evt.y / Math.max(evt.canvasHeight, 1)) * displayHeight;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = evt.color || '#00ff88';
        ctx.fill();
      } else if (evt.type === 'move') {
        const x = (evt.timestamp / maxTime) * displayWidth;
        const y = (evt.y / Math.max(evt.canvasHeight, 1)) * displayHeight;
        ctx.fillStyle = evt.color || '#00ff88';
        ctx.globalAlpha = 0.4;
        ctx.fillRect(x - 1, y - 1, 2, 2);
        ctx.globalAlpha = 1;
      }
    });

    for (let i = 0; i < 5; i++) {
      const y = (displayHeight / 5) * (i + 0.5);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(displayWidth, y);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }, [timelineVisible, recordedEvents]);

  const currentScale = soundEngine.getScaleForColor(selectedColor);
  const currentNoteInfo = soundEngine.getNoteInfoForColor(selectedColor);

  const handleToggleRecording = useCallback(async () => {
    if (recordingState === 'idle') {
      soundEngine.startRecording();
      setRecordingState('recording');
      setRecordedAudioUrl(null);
      setRecordedEvents([]);
      setTimelineVisible(false);
    } else if (recordingState === 'recording') {
      const result = await soundEngine.stopRecordingAsync();
      setRecordingState('done');
      setRecordedEvents(result.events);
      if (result.audioBlob) {
        const url = URL.createObjectURL(result.audioBlob);
        setRecordedAudioUrl(url);
      }
      setTimelineVisible(true);
    } else {
      setRecordingState('idle');
      setTimelineVisible(false);
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
        setRecordedAudioUrl(null);
      }
    }
  }, [recordingState, recordedAudioUrl]);

  const handleClear = useCallback(() => {
    hub.sendClear();
  }, [hub]);

  const glassPanel: React.CSSProperties = {
    background: 'rgba(15, 20, 40, 0.75)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(100, 180, 255, 0.15)',
    borderRadius: '12px',
  };

  const neonGlow = (color: string): React.CSSProperties => ({
    boxShadow: `0 0 8px ${color}40, 0 0 20px ${color}20, inset 0 0 8px ${color}10`,
    borderColor: color,
  });

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        color: '#e0e8ff',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          ...glassPanel,
          margin: '8px 12px',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          minHeight: '52px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {PALETTE_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                setSelectedColor(c);
                if (tool === 'eraser') setTool('brush');
              }}
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                border: selectedColor === c && tool === 'brush' ? '2px solid #fff' : '2px solid transparent',
                background: c,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow:
                  selectedColor === c && tool === 'brush'
                    ? `0 0 12px ${c}80, 0 0 24px ${c}40`
                    : `0 0 4px ${c}30`,
                transform: selectedColor === c && tool === 'brush' ? 'scale(1.2)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        <div
          style={{
            width: '1px',
            height: '28px',
            background: 'rgba(100, 180, 255, 0.2)',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', opacity: 0.7, whiteSpace: 'nowrap' }}>粗细</span>
          <input
            type="range"
            min="1"
            max="20"
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            style={{
              width: '80px',
              accentColor: selectedColor,
              cursor: 'pointer',
            }}
          />
          <span style={{ fontSize: '12px', opacity: 0.8, minWidth: '24px' }}>{lineWidth}px</span>
        </div>

        <div
          style={{
            width: '1px',
            height: '28px',
            background: 'rgba(100, 180, 255, 0.2)',
          }}
        />

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setTool('brush')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              ...(tool === 'brush'
                ? {
                    background: 'rgba(0, 200, 255, 0.2)',
                    color: '#00e5ff',
                    ...neonGlow('#00e5ff'),
                  }
                : {
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'rgba(255, 255, 255, 0.5)',
                    borderColor: 'transparent',
                  }),
            }}
          >
            🖌️ 画笔
          </button>
          <button
            onClick={() => setTool('eraser')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              ...(tool === 'eraser'
                ? {
                    background: 'rgba(255, 100, 100, 0.2)',
                    color: '#ff6b6b',
                    ...neonGlow('#ff6b6b'),
                  }
                : {
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'rgba(255, 255, 255, 0.5)',
                    borderColor: 'transparent',
                  }),
            }}
          >
            🧹 橡皮
          </button>
          <button
            onClick={handleClear}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 100, 100, 0.3)',
              background: 'rgba(255, 50, 50, 0.1)',
              color: '#ff6b6b',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            🗑️ 清空
          </button>
        </div>

        <div
          style={{
            width: '1px',
            height: '28px',
            background: 'rgba(100, 180, 255, 0.2)',
          }}
        />

        <button
          onClick={handleToggleRecording}
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            border: '1px solid',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            ...(recordingState === 'recording'
              ? {
                  background: 'rgba(255, 50, 50, 0.3)',
                  color: '#ff4444',
                  ...neonGlow('#ff4444'),
                  animation: 'pulse 1s infinite',
                }
              : recordingState === 'done'
              ? {
                  background: 'rgba(0, 255, 150, 0.2)',
                  color: '#00ff96',
                  ...neonGlow('#00ff96'),
                }
              : {
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                }),
          }}
        >
          {recordingState === 'recording'
            ? '⏹️ 停止录音'
            : recordingState === 'done'
            ? '🔄 重置录音'
            : '⏺️ 录音'}
        </button>
      </div>

      <div
        style={{
          flex: 1,
          margin: '0 12px',
          position: 'relative',
          minHeight: 0,
        }}
      >
        <SoundCanvas
          color={selectedColor}
          lineWidth={lineWidth}
          tool={tool}
          soundEngine={soundEngine}
          hub={hub}
        />
      </div>

      {timelineVisible && (
        <div
          style={{
            ...glassPanel,
            margin: '8px 12px',
            padding: '8px 16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '6px',
            }}
          >
            <span style={{ fontSize: '12px', opacity: 0.7 }}>🎵 录音时间轴</span>
            {recordedAudioUrl && (
              <audio
                controls
                src={recordedAudioUrl}
                style={{ height: '28px', flex: 1, maxWidth: '400px' }}
              />
            )}
          </div>
          <canvas
            ref={timelineCanvasRef}
            style={{
              width: '100%',
              height: '48px',
              borderRadius: '6px',
              border: '1px solid rgba(100, 180, 255, 0.1)',
            }}
          />
        </div>
      )}

      <div
        style={{
          ...glassPanel,
          margin: '0 12px 8px 12px',
          padding: '6px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          opacity: 0.8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span>
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: wsConnected ? '#00ff88' : '#ff4444',
                marginRight: '6px',
                boxShadow: wsConnected
                  ? '0 0 6px #00ff8880'
                  : '0 0 6px #ff444480',
              }}
            />
            {wsConnected ? '已连接' : '未连接'}
          </span>
          <span>👥 在线: {onlineCount}人</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span>
            🎹 {currentScale} · {currentNoteInfo?.name || '—'}
          </span>
          <span>
            🎨{' '}
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: selectedColor,
                boxShadow: `0 0 6px ${selectedColor}80`,
                verticalAlign: 'middle',
                marginRight: '4px',
              }}
            />
            {tool === 'eraser' ? '橡皮擦' : '画笔'}
          </span>
          {recordingState === 'recording' && (
            <span style={{ color: '#ff4444' }}>● REC</span>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        input[type="range"] {
          -webkit-appearance: none;
          height: 4px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.15);
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: ${selectedColor};
          box-shadow: 0 0 8px ${selectedColor}60;
          cursor: pointer;
        }
        button:hover {
          filter: brightness(1.2);
        }
        button:active {
          transform: scale(0.96);
        }
      `}</style>
    </div>
  );
};

export default MainUI;
