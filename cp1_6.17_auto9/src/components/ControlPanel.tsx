import React, { useMemo } from 'react';
import type { GamepadEvent } from '../modules/recorder';

interface ControlPanelProps {
  pressedButtons: string[];
  eventLog: GamepadEvent[];
  isRecording: boolean;
  isPlaying: boolean;
  eventCount: number;
  onStartRecord: () => void;
  onStopRecord: () => void;
  onPlayback: () => void;
  onStopPlayback: () => void;
}

const ALL_BUTTONS = [
  'A', 'B', 'X', 'Y',
  'LB', 'RB', 'LT', 'RT',
  'Up', 'Down', 'Left', 'Right',
  'Start', 'Back', 'Home',
  'LS', 'RS',
];

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor(ms % 1000);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  pressedButtons,
  eventLog,
  isRecording,
  isPlaying,
  eventCount,
  onStartRecord,
  onStopRecord,
  onPlayback,
  onStopPlayback,
}) => {
  const sortedLog = useMemo(() => {
    return [...eventLog].reverse();
  }, [eventLog]);

  return (
    <div className="control-panel">
      <div className="panel-section">
        <div className="panel-title">当前按键</div>
        <div className="button-list">
          {ALL_BUTTONS.map((btn) => (
            <div
              key={btn}
              className={`button-tag ${pressedButtons.includes(btn) ? 'pressed' : ''}`}
            >
              {btn}
            </div>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-title">输入日志</div>
        <div className="event-log">
          {sortedLog.length === 0 ? (
            <div className="log-entry">等待按键输入...</div>
          ) : (
            sortedLog.map((event, index) => (
              <div
                key={`${event.timestamp}-${event.buttonName}-${event.isPressed}-${index}`}
                className={`log-entry ${event.isPressed ? 'press' : 'release'}`}
              >
                [{formatTimestamp(event.timestamp)}] {event.buttonName} {event.isPressed ? '按下' : '释放'}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-title">录制控制</div>
        <div className="record-panel">
          {!isRecording ? (
            <button
              className="record-btn"
              onClick={onStartRecord}
              disabled={isPlaying}
            >
              开始录制
            </button>
          ) : (
            <button
              className="record-btn recording"
              onClick={onStopRecord}
            >
              停止录制
            </button>
          )}

          {!isPlaying ? (
            <button
              className="record-btn"
              onClick={onPlayback}
              disabled={isRecording || eventCount === 0}
            >
              回放
            </button>
          ) : (
            <button
              className="record-btn"
              onClick={onStopPlayback}
            >
              停止回放
            </button>
          )}

          <div className="record-stats">
            已记录 {eventCount} 个事件
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ControlPanel);
