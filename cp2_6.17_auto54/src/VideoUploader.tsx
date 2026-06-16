import React, { useCallback, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { useStore, formatTime, formatFileSize } from './store';
import type { Video } from './types';

interface VideoUploaderProps {
  onPlayVideo: (video: Video) => void;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ onPlayVideo }) => {
  const { videos, uploadVideo, removeVideo } = useStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validTypes = ['video/mp4', 'video/quicktime'];
      if (!validTypes.includes(file.type)) {
        alert(`文件 ${file.name} 格式不支持，仅支持 MP4 和 MOV 格式`);
        continue;
      }
      if (file.size > 200 * 1024 * 1024) {
        alert(`文件 ${file.name} 超过 200MB 限制`);
        continue;
      }
      
      setUploading(true);
      await uploadVideo(file);
      setUploading(false);
    }
  }, [uploadVideo]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('确定要删除这个视频吗？相关的标记也会被删除。')) {
      removeVideo(id);
    }
  };

  return (
    <div className="w-full">
      <div
        className={`upload-zone mb-8 ${isDragOver ? 'drag-over' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <Upload className="mx-auto mb-4 text-gray-400" size={48} />
        <p className="text-lg mb-2">拖拽视频文件到此处</p>
        <p className="text-sm text-gray-500">或点击选择文件</p>
        <p className="text-xs text-gray-600 mt-2">支持 MP4、MOV 格式，单个文件不超过 200MB</p>
        {uploading && (
          <p className="text-sm text-orange-500 mt-4 animate-pulse">上传中...</p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp4,.mov,video/mp4,video/quicktime"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <h2 className="text-xl font-semibold mb-4">视频素材</h2>
      
      {videos.length === 0 ? (
        <p className="text-gray-500 text-center py-12">暂无视频，请上传视频素材</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map((video) => (
            <div key={video.id} className="video-card animate-slideUp">
              <div className="absolute top-2 right-2 z-10">
                <button
                  onClick={(e) => handleDelete(e, video.id)}
                  className="w-8 h-8 rounded-full bg-black/60 hover:bg-red-500 flex items-center justify-center text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                <video
                  src={video.filePath}
                  className="w-full h-full object-cover"
                  muted
                  preload="metadata"
                />
              </div>
              
              <div
                className="play-button"
                onClick={() => onPlayVideo(video)}
              >
                <div className="play-triangle" />
              </div>
              
              <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black/80 to-transparent p-3 flex flex-col justify-between">
                <div className="text-right">
                  <p className="text-xs font-medium truncate" title={video.originalName}>
                    {video.originalName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">
                    {formatTime(video.duration || 0)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(video.fileSize)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoUploader;
