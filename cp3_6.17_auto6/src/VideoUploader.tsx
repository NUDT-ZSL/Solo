import { useRef, useState, useCallback } from 'react';
import { Play, Upload, X, FileVideo } from 'lucide-react';
import { api } from './api';
import { useAppStore } from './store';
import { formatDuration, formatFileSize } from './types';
import type { Video } from './types';

interface VideoUploaderProps {
  onPlay: (video: Video) => void;
}

export function VideoUploader({ onPlay }: VideoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const videos = useAppStore(s => s.videos);
  const addVideo = useAppStore(s => s.addVideo);
  const removeVideo = useAppStore(s => s.removeVideo);
  const updateVideo = useAppStore(s => s.updateVideo);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files).filter(f =>
      /\.(mp4|mov)$/i.test(f.name) && f.size <= 200 * 1024 * 1024
    );
    for (const file of fileArr) {
      setUploading(true);
      try {
        const video = await api.uploadVideo(file);
        const tempVid = document.createElement('video');
        tempVid.preload = 'metadata';
        tempVid.onloadedmetadata = () => {
          api.updateMarker;
          updateVideo(video.id, {
            duration: tempVid.duration,
            width: tempVid.videoWidth,
            height: tempVid.videoHeight
          });
          URL.revokeObjectURL(tempVid.src);
        };
        tempVid.src = URL.createObjectURL(file);
        addVideo(video);
      } catch (e) {
        console.error('上传失败', e);
      }
    }
    setUploading(false);
  }, [addVideo, updateVideo]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await api.deleteVideo(id);
    removeVideo(id);
  };

  return (
    <div className="p-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition-all ${
          dragOver ? 'border-[#ff5722] bg-[#1e1e1e]' : 'border-[#444] hover:border-[#666] bg-[#1a1a1a]'
        }`}
      >
        <Upload className="mx-auto mb-3" size={40} color="#ff5722" />
        <p className="text-lg mb-1">拖拽视频文件到此处，或点击上传</p>
        <p className="text-sm text-gray-400">支持 MP4 / MOV 格式，单个文件不超过 200MB</p>
        <input
          ref={inputRef}
          type="file"
          accept=".mp4,.mov,video/mp4,video/quicktime"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {uploading && (
        <div className="mt-4 text-center text-[#ff5722]">正在上传视频...</div>
      )}

      <div className="mt-6 flex flex-wrap gap-4">
        {videos.length === 0 && !uploading && (
          <div className="w-full text-center py-12 text-gray-500">
            <FileVideo className="mx-auto mb-3" size={48} />
            <p>暂无视频，请上传</p>
          </div>
        )}
        {videos.map((video) => (
          <div
            key={video.id}
            className="relative rounded-lg overflow-hidden bg-[#1e1e1e] flex"
            style={{ width: 320, height: 180 }}
          >
            <video
              className="w-1/2 object-cover bg-black"
              src={video.path}
              muted
              preload="metadata"
            />
            <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
              <div>
                <p className="text-sm font-medium truncate" title={video.originalName}>
                  {video.originalName}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  时长: {formatDuration(video.duration || 0)}
                </p>
                <p className="text-xs text-gray-400">
                  大小: {formatFileSize(video.size)}
                </p>
              </div>
            </div>
            <button
              onClick={() => onPlay(video)}
              className="absolute bottom-3 left-3 rounded-full flex items-center justify-center shadow-lg hover:brightness-110"
              style={{ width: 36, height: 36, background: '#ff5722' }}
            >
              <Play size={16} color="white" fill="white" className="ml-0.5" />
            </button>
            <button
              onClick={(e) => handleDelete(video.id, e)}
              className="absolute top-2 right-2 rounded-full bg-black/50 p-1 hover:bg-black/80"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
