import React, { memo } from 'react';
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined, AudioOutlined } from '@ant-design/icons';

interface AudioTrackProps {
  audioName: string;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isRecording: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (time: number) => void;
  onRecord: () => void;
  onStopRecording: () => void;
}

const AudioTrack: React.FC<AudioTrackProps> = ({
  audioName,
  currentTime,
  duration,
  isPlaying,
  isRecording,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onRecord,
  onStopRecording,
}) => {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    onSeek(percent * duration);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="audio-track">
      <div className="track-header">
        <div className="track-icon">
          <AudioOutlined />
        </div>
        <div className="track-info">
          <div className="track-name" title={audioName}>
            {audioName || '未加载音频'}
          </div>
          <div className="track-duration">
            {audioName ? (
              <>
                <span className="current-time">{formatTime(currentTime)}</span>
                <span className="separator">/</span>
                <span className="total-time">{formatTime(duration)}</span>
              </>
            ) : (
              <span className="no-audio">请上传或录制音频</span>
            )}
          </div>
        </div>
        <div className="track-actions">
          {isRecording ? (
            <button
              className={`record-btn recording ${isRecording ? 'active' : ''}`}
              onClick={onStopRecording}
              title="停止录制"
            >
              <span className="record-dot" />
              停止录制
            </button>
          ) : (
            <button className="record-btn" onClick={onRecord} title="录制音频">
              <span className="record-dot" />
              录制
            </button>
          )}
        </div>
      </div>

      <div className="track-progress" onClick={handleProgressClick}>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
          <div className="progress-handle" style={{ left: `${progress}%` }} />
        </div>
      </div>

      <div className="track-controls">
        <button
          className={`control-btn play-btn ${isPlaying ? 'playing' : ''}`}
          onClick={isPlaying ? onPause : onPlay}
          disabled={!audioName || isRecording}
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
        </button>
        <button
          className="control-btn stop-btn"
          onClick={onStop}
          disabled={!audioName}
          title="停止"
        >
          <ReloadOutlined />
        </button>
      </div>
    </div>
  );
};

export default memo(AudioTrack);
