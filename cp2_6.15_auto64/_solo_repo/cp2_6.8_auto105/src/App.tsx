import { useState, useEffect, useRef, useCallback } from 'react';
import { nanoid } from 'nanoid';
import Canvas from './Canvas';
import Toolbar from './Toolbar';
import Playback from './Playback';

export interface Point {
  x: number;
  y: number;
  timestamp: number;
}

export interface Stroke {
  id: string;
  userId: string;
  color: string;
  thickness: number;
  points: Point[];
  startTime: number;
  endTime: number;
}

const COLORS = ['#FF6B6B', '#339AF0', '#51CF66', '#FF922B', '#CC5DE8', '#212529'];
const THICKNESSES = [2, 5, 10];
const ROOM_ID = 'default-room';

function App() {
  const [userId] = useState(() => nanoid());
  const [color, setColor] = useState(COLORS[0]);
  const [thickness, setThickness] = useState(THICKNESSES[1]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [connected, setConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  const sendMessage = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'join', roomId: ROOM_ID, userId }));
    };

    ws.onclose = () => setConnected(false);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'init-strokes':
          setStrokes(message.strokes || []);
          break;
        case 'stroke-start':
          setStrokes(prev => [...prev, message.stroke]);
          break;
        case 'stroke-point':
          setStrokes(prev => prev.map(s => {
            if (s.id === message.strokeId) {
              return {
                ...s,
                points: [...s.points, message.point],
                endTime: message.point.timestamp,
              };
            }
            return s;
          }));
          break;
        case 'stroke-end':
          break;
        case 'clear-canvas':
          setStrokes([]);
          break;
      }
    };

    return () => ws.close();
  }, [userId]);

  const handleClear = () => {
    setShowClearConfirm(false);
    setStrokes([]);
    sendMessage({ type: 'clear-canvas', roomId: ROOM_ID });
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#F0F0F0' }}>
      <Toolbar
        colors={COLORS}
        thicknesses={THICKNESSES}
        selectedColor={color}
        selectedThickness={thickness}
        onColorChange={setColor}
        onThicknessChange={setThickness}
        onClear={() => setShowClearConfirm(true)}
        connected={connected}
      />

      <Canvas
        userId={userId}
        color={color}
        thickness={thickness}
        strokes={strokes}
        onStrokeStart={(stroke) => sendMessage({ type: 'stroke-start', stroke })}
        onStrokePoint={(strokeId, point) => sendMessage({ type: 'stroke-point', strokeId, point })}
        onStrokeEnd={(strokeId) => sendMessage({ type: 'stroke-end', strokeId })}
        isPlaying={isPlaying}
        playbackProgress={playbackProgress}
      />

      <Playback
        strokes={strokes}
        isPlaying={isPlaying}
        onPlayStateChange={setIsPlaying}
        onProgressChange={setPlaybackProgress}
      />

      {showClearConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            minWidth: 280,
          }}>
            <h3 style={{ marginBottom: 12, fontSize: 18, color: '#212529' }}>确认清空画布？</h3>
            <p style={{ marginBottom: 20, fontSize: 14, color: '#6C757D' }}>
              清空后所有笔迹将被删除，且无法恢复。房间内所有成员的画布都会被清空。
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #DEE2E6',
                  background: '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: 14,
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.background = '#F8F9FA';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.background = '#FFFFFF';
                }}
              >
                取消
              </button>
              <button
                onClick={handleClear}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#FF6B6B',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: 14,
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                  (e.target as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                  (e.target as HTMLButtonElement).style.boxShadow = 'none';
                }}
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
