import React, { useCallback, useRef, useState } from 'react';
import { Upload, Play, Pause, Volume2 } from 'lucide-react';

interface ControlPanelProps {
  onFileUpload: (file: File) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  volume: number;
  onVolumeChange: (v: number) => void;
  isLoading: boolean;
  hasAudio: boolean;
  fileName: string;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  onFileUpload,
  isPlaying,
  onTogglePlay,
  volume,
  onVolumeChange,
  isLoading,
  hasAudio,
  fileName,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'audio/mpeg' || file.type === 'audio/wav' || file.name.endsWith('.mp3') || file.name.endsWith('.wav'))) {
      onFileUpload(file);
    }
  }, [onFileUpload]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileUpload(file);
  }, [onFileUpload]);

  return (
    <div className="control-panel">
      <div className="control-panel-inner">
        <div
          className={`upload-area ${isDragOver ? 'drag-over' : ''} ${isLoading ? 'loading' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,audio/mpeg,audio/wav"
            onChange={handleFileChange}
            className="file-input"
          />
          {isLoading ? (
            <div className="loading-indicator">
              <div className="loading-spinner" />
              <span>解码中...</span>
            </div>
          ) : (
            <>
              <Upload size={20} className="upload-icon" />
              <span className="upload-text">
                {hasAudio ? fileName : '拖拽或点击上传音频'}
              </span>
              <span className="upload-hint">.mp3 / .wav</span>
            </>
          )}
        </div>

        <button
          className={`play-btn ${isPlaying ? 'playing' : ''}`}
          onClick={onTogglePlay}
          disabled={!hasAudio || isLoading}
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? <Pause size={22} /> : <Play size={22} />}
        </button>

        <div className="volume-control">
          <Volume2 size={16} className="volume-icon" />
          <div className="volume-slider-wrapper">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="volume-slider"
            />
            <div
              className="volume-track-fill"
              style={{ width: `${volume * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
