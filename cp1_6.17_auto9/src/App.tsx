import React, { useState, useEffect, useRef, useCallback } from 'react';
import GamepadDiagram from './components/GamepadDiagram';
import ControlPanel from './components/ControlPanel';
import JoystickView from './components/JoystickView';
import { useGamepad, type GamepadButtonEvent } from './hooks/useGamepad';
import { GamepadRecorder, type GamepadEvent } from './modules/recorder';
import './styles/global.css';

const MAX_LOG_ENTRIES = 20;

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [eventLog, setEventLog] = useState<GamepadEvent[]>([]);
  const [playbackPressed, setPlaybackPressed] = useState<Set<string>>(new Set());
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordedEventCount, setRecordedEventCount] = useState(0);

  const { state: gamepadState, onButtonEvent } = useGamepad(0);
  const recorderRef = useRef<GamepadRecorder>(new GamepadRecorder());
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setDarkMode((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const addToLog = useCallback((event: GamepadEvent) => {
    setEventLog((prev) => {
      const newLog = [...prev, event];
      if (newLog.length > MAX_LOG_ENTRIES) {
        return newLog.slice(newLog.length - MAX_LOG_ENTRIES);
      }
      return newLog;
    });
  }, []);

  useEffect(() => {
    const unsubscribe = onButtonEvent((event: GamepadButtonEvent) => {
      const logEvent: GamepadEvent = {
        timestamp: event.timestamp,
        buttonName: event.buttonName,
        isPressed: event.isPressed,
      };
      addToLog(logEvent);

      if (recorderRef.current.isRecording()) {
        recorderRef.current.recordEvent(logEvent);
        setRecordedEventCount(recorderRef.current.getEventCount());
      }
    });

    return unsubscribe;
  }, [onButtonEvent, addToLog]);

  const pressedButtons = Object.keys(gamepadState.buttons).filter(
    (btn) => gamepadState.buttons[btn]
  );

  const displayPressedButtons = isPlaying
    ? Array.from(playbackPressed)
    : pressedButtons;

  const handleStartRecord = useCallback(() => {
    recorderRef.current.startRecording();
    setIsRecording(true);
    setRecordedEventCount(0);
    setEventLog([]);
    startTimeRef.current = performance.now();
  }, []);

  const handleStopRecord = useCallback(() => {
    recorderRef.current.stopRecording();
    setIsRecording(false);
    setRecordedEventCount(recorderRef.current.getEventCount());
  }, []);

  const handlePlayback = useCallback(() => {
    if (recorderRef.current.getEventCount() === 0) return;

    setIsPlaying(true);
    setEventLog([]);
    const pressed = new Set<string>();

    recorderRef.current.playback(
      (event: GamepadEvent) => {
        addToLog(event);
        setPlaybackPressed((prev) => {
          const next = new Set(prev);
          if (event.isPressed) {
            next.add(event.buttonName);
          } else {
            next.delete(event.buttonName);
          }
          return next;
        });
      },
      () => {
        setIsPlaying(false);
        setPlaybackPressed(new Set());
      }
    );
  }, [addToLog]);

  const handleStopPlayback = useCallback(() => {
    recorderRef.current.stopPlayback();
    setIsPlaying(false);
    setPlaybackPressed(new Set());
  }, []);

  return (
    <div className="app">
      <div className="crt-screen">
        <div
          className={`connection-status ${gamepadState.connected ? 'connected' : 'disconnected'}`}
        >
          {gamepadState.connected ? `● ${gamepadState.gamepadId.slice(0, 30)}` : '○ 未连接手柄'}
        </div>

        <div className="screen-content">
          <GamepadDiagram pressedButtons={displayPressedButtons} />

          <div className="joysticks">
            <JoystickView
              x={gamepadState.axes.left.x}
              y={gamepadState.axes.left.y}
              label="左摇杆"
            />
            <JoystickView
              x={gamepadState.axes.right.x}
              y={gamepadState.axes.right.y}
              label="右摇杆"
            />
          </div>
        </div>

        <div className="theme-hint">按 F1 切换主题</div>
      </div>

      <ControlPanel
        pressedButtons={displayPressedButtons}
        eventLog={eventLog}
        isRecording={isRecording}
        isPlaying={isPlaying}
        eventCount={recordedEventCount}
        onStartRecord={handleStartRecord}
        onStopRecord={handleStopRecord}
        onPlayback={handlePlayback}
        onStopPlayback={handleStopPlayback}
      />
    </div>
  );
};

export default App;
