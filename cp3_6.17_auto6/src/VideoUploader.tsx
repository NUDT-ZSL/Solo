import { useState, useRef, useCallback } from 'react';
import type { Video } from './types';
import './VideoUploader.css';

interface VideoUploaderProps {
  videos: Video[];
  onVideoUploaded: (video: Video) => void;
  onPlayVideo: (video: Video) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function VideoUploader({ videos, onVideoUploaded, onPlayVideo }: VideoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleFiles = async (files: File[]) => {
    const validFiles = files.filter(file => {
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      return (ext === '.mp4' || ext === '.mov') && file.size <= 200 * 1024 * 1024;
    });

    if (validFiles.length === 0 && files.length > 0) {
      alert('请上传 MP4 或 MOV 格式的视频，单个文件不超过 200MB');
      return;
    }

    setUploading(true);
    for (const file of validFiles) {
      try {
        const formData = new FormData();
        formData.append('video', file);

        const res = await fetch('/api/videos/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const video = await res.json();
          onVideoUploaded(video);
        }
      } catch (err) {
        console.error('上传失败:', err);
      }
    }
    setUploading(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleVideoLoaded = (e: React.SyntheticEvent<HTMLVideoElement>, videoId: string) => {
    const videoEl = e.currentTarget;
    const duration = videoEl.duration;
    if (duration && isFinite(duration)) {
      fetch(`/api/videos/${videoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration }),
      }).catch(() => {});
    }
  };

  return (
    <div className="video-uploader">
      <div className="upload-section">
        <h2 className="section-title">视频素材</h2>
        <div
          className={`upload-zone ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp4,.mov"
            multiple
            onChange={handleFileSelect}
            className="file-input"
          />
          <div className="upload-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className="upload-text">
            {uploading ? '上传中...' : '拖拽视频文件到这里，或点击上传'}
          </p>
          <p className="upload-hint">支持 MP4 / MOV 格式，单个文件不超过 200MB</p>
        </div>
      </div>

      <div className="video-grid">
        {videos.map(video => (
          <div key={video.id} className="video-card">
            <div className="video-thumbnail">
              <video
                src={video.path}
                preload="metadata"
                muted
                playsInline
                onLoadedMetadata={(e) => handleVideoLoaded(e, video.id)}
              />
              <button
                className="play-button"
                onClick={() => onPlayVideo(video)}
                title="播放"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </button>
            </div>
            <div className="video-info">
              <h3 className="video-name" title={video.name}>{video.name}</h3>
              <div className="video-meta">
                <span className="video-duration">
                  {video.duration > 0 ? formatDuration(video.duration) : '--:--'}
                </span>
                <span className="video-size">{formatFileSize(video.size)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {videos.length === 0 && !uploading && (
        <div className="empty-state">
          <p>还没有上传视频</p>
          <p className="empty-hint">上传第一个视频开始标记素材吧</p>
        </div>
      )}
    </div>
  );
}

export default VideoUploader;
