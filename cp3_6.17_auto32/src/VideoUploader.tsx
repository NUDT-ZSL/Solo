import { useRef, useState, useCallback, DragEvent } from 'react';
import type { Video } from './types';
import { formatFileSize } from './types';

interface VideoUploaderProps {
  videos: Video[];
  onVideoUploaded: (video: Video) => void;
  onVideoDeleted: (videoId: string) => void;
  onPlayVideo: (video: Video) => void;
  onDurationUpdate: (videoId: string, duration: number) => void;
}

function VideoUploader({
  videos,
  onVideoUploaded,
  onVideoDeleted,
  onPlayVideo,
  onDurationUpdate,
}: VideoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);
      if (file.size > 200 * 1024 * 1024) {
        setError('文件大小不能超过 200MB');
        return;
      }
      const ext = file.name.toLowerCase().split('.').pop();
      if (ext !== 'mp4' && ext !== 'mov') {
        setError('只支持 MP4 和 MOV 格式');
        return;
      }
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('video', file);
        const res = await fetch('/api/videos', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || '上传失败');
        }
        const video: Video = await res.json();

        const tempVideo = document.createElement('video');
        tempVideo.preload = 'metadata';
        tempVideo.onloadedmetadata = async () => {
          const duration = tempVideo.duration;
          URL.revokeObjectURL(tempVideo.src);
          try {
            await fetch(`/api/videos/${video.id}/duration`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ duration }),
            });
            onDurationUpdate(video.id, duration);
          } catch {
            // ignore
          }
        };
        tempVideo.src = URL.createObjectURL(file);

        onVideoUploaded(video);
      } catch (err) {
        setError(err instanceof Error ? err.message : '上传失败');
      } finally {
        setUploading(false);
      }
    },
    [onVideoUploaded, onDurationUpdate]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleUpload(files[0]);
    }
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDelete = async (videoId: string) => {
    try {
      const res = await fetch(`/api/videos/${videoId}`, { method: 'DELETE' });
      if (res.ok) {
        onVideoDeleted(videoId);
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClickUpload}
        style={{
          padding: '40px',
          border: `2px dashed ${isDragging ? '#ff5722' : '#555'}`,
          borderRadius: '8px',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: isDragging ? 'rgba(255, 87, 34, 0.05)' : 'transparent',
          transition: 'all 0.2s ease',
          marginBottom: '24px',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp4,.mov,video/mp4,video/quicktime"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <div
          style={{
            width: '48px',
            height: '48px',
            margin: '0 auto 12px',
            borderRadius: '50%',
            backgroundColor: '#ff5722',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <p style={{ fontSize: '16px', color: '#e0e0e0', marginBottom: '8px' }}>
          {uploading ? '上传中...' : '拖拽视频文件到这里，或点击上传'}
        </p>
        <p style={{ fontSize: '13px', color: '#888' }}>
          支持 MP4 / MOV 格式，单个文件不超过 200MB
        </p>
        {error && (
          <p style={{ fontSize: '13px', color: '#e53935', marginTop: '12px' }}>{error}</p>
        )}
      </div>

      {videos.length > 0 && (
        <div>
          <h2
            style={{
              fontSize: '18px',
              fontWeight: 600,
              marginBottom: '16px',
              color: '#e0e0e0',
            }}
          >
            已上传视频 ({videos.length})
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px',
            }}
          >
            {videos.map((video) => (
              <div
                key={video.id}
                style={{
                  width: '100%',
                  maxWidth: '320px',
                  height: '180px',
                  backgroundColor: '#1e1e1e',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                }}
              >
                <div
                  style={{
                    flex: 1,
                    position: 'relative',
                    background: `linear-gradient(135deg, #2a2a2a 0%, #1e1e1e 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayVideo(video);
                    }}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: '#ff5722',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'absolute',
                      left: '12px',
                      bottom: '12px',
                      padding: 0,
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="white"
                      style={{ marginLeft: '2px' }}
                    >
                      <polygon points="6,3 20,12 6,21" />
                    </svg>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('确定要删除这个视频吗？')) {
                        handleDelete(video.id);
                      }
                    }}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#e0e0e0',
                      fontSize: '14px',
                      padding: 0,
                    }}
                    title="删除视频"
                  >
                    ×
                  </button>
                </div>

                <div
                  style={{
                    width: '140px',
                    padding: '12px',
                    backgroundColor: '#1e1e1e',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    overflow: 'hidden',
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#e0e0e0',
                        marginBottom: '8px',
                        wordBreak: 'break-all',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: '1.3',
                      }}
                      title={video.originalName}
                    >
                      {video.originalName}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>
                      时长：{video.durationFormatted}
                    </p>
                    <p style={{ fontSize: '12px', color: '#888' }}>
                      大小：{formatFileSize(video.size)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoUploader;
