import { useRef, useState } from 'react';
import type { VideoMeta } from './types';
import { ACCEPTED_FORMATS, MAX_FILE_SIZE, formatTime, formatFileSize } from './constants';
import { uploadVideo } from './api';

interface Props {
  videos: VideoMeta[];
  onUploaded: (video: VideoMeta) => void;
  onPlay: (video: VideoMeta) => void;
  onDelete: (id: string) => void;
  showToast: (msg: string) => void;
}

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
      video.load();
    };
    video.onloadedmetadata = () => {
      const d = isFinite(video.duration) ? video.duration : 0;
      cleanup();
      resolve(d);
    };
    video.onerror = () => {
      cleanup();
      resolve(0);
    };
    video.src = url;
  });
}

export default function VideoUploader({
  videos,
  onUploaded,
  onPlay,
  onDelete,
  showToast,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  const validateFile = (file: File): string | null => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ACCEPTED_FORMATS.includes(ext)) {
      return '仅支持 MP4/MOV 格式';
    }
    if (file.size > MAX_FILE_SIZE) {
      return '文件大小超过 200MB 限制';
    }
    return null;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const err = validateFile(file);
    if (err) {
      showToast(err);
      return;
    }
    setProgress(0);
    try {
      const duration = await readVideoDuration(file);
      const video = await uploadVideo(file, duration, (pct) => setProgress(pct));
      onUploaded(video);
      showToast('上传成功');
    } catch (e) {
      showToast((e as Error).message || '上传失败');
    } finally {
      setProgress(null);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = () => setDragging(false);

  const onClick = () => inputRef.current?.click();

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  return (
    <div>
      <div
        className={`uploader pressable ${dragging ? 'dragging' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={onClick}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".mp4,.mov,video/mp4,video/quicktime"
          style={{ display: 'none' }}
          onChange={onInputChange}
        />
        <div className="uploader-icon">⬆</div>
        <div className="uploader-title">拖拽视频到此处或点击上传</div>
        <div className="uploader-hint">支持 MP4 / MOV，单个文件不超过 200MB</div>
        {progress !== null && (
          <div className="uploader-progress">
            <div className="uploader-progress-bar" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <div className="section-title">素材库（{videos.length}）</div>
      {videos.length === 0 ? (
        <div className="empty">还没有视频素材，上传一个开始标记吧</div>
      ) : (
        <div className="video-grid">
          {videos.map((v) => (
            <div className="video-card pressable" key={v.id}>
              <div className="video-thumb">
                <video src={v.filePath} preload="metadata" />
                <button
                  className="play-btn pressable"
                  title="播放"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlay(v);
                  }}
                />
              </div>
              <div className="video-info">
                <div className="video-name" title={v.fileName}>
                  {v.fileName}
                </div>
                <div className="video-meta">
                  <span className="mono">{formatTime(v.duration)}</span>
                  <span>{formatFileSize(v.size)}</span>
                </div>
                <div className="video-meta">
                  <span style={{ textTransform: 'uppercase' }}>{v.format}</span>
                </div>
              </div>
              <button
                className="video-delete pressable"
                title="删除"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(v.id);
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
