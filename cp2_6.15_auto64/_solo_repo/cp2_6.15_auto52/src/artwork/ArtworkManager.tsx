import React, { useCallback, useRef, useState } from 'react';
import { Upload, X, ChevronDown, ChevronUp } from 'lucide-react';
import { ArtworkGrid } from './ArtworkGrid';
import { useStore } from '@/store/useStore';
import type { Artwork } from '@/types';

export const ArtworkManager: React.FC = () => {
  const uploadArtwork = useStore((state) => state.uploadArtwork);
  const isUploading = useStore((state) => state.isUploading);
  const uploadProgress = useStore((state) => state.uploadProgress);
  const isMobile = useStore((state) => state.isMobile);
  const showArtworkDrawer = useStore((state) => state.showArtworkDrawer);
  const setShowArtworkDrawer = useStore((state) => state.setShowArtworkDrawer);

  const [isDragOver, setIsDragOver] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [artworkName, setArtworkName] = useState('');
  const [artworkDescription, setArtworkDescription] = useState('');
  const [artworkTags, setArtworkTags] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (file: File) => {
      setSelectedFile(file);
      setArtworkName(file.name.replace(/\.[^/.]+$/, ''));
      setShowUploadForm(true);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    try {
      const tags = artworkTags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t);

      await uploadArtwork(
        selectedFile,
        artworkName,
        artworkDescription,
        tags
      );

      setShowUploadForm(false);
      setSelectedFile(null);
      setArtworkName('');
      setArtworkDescription('');
      setArtworkTags('');
    } catch (error) {
      console.error('Upload failed:', error);
    }
  }, [selectedFile, artworkName, artworkDescription, artworkTags, uploadArtwork]);

  const handleCancel = useCallback(() => {
    setShowUploadForm(false);
    setSelectedFile(null);
    setArtworkName('');
    setArtworkDescription('');
    setArtworkTags('');
  }, []);

  const UploadArea = () => (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => fileInputRef.current?.click()}
      className={`
        w-[260px] h-[100px] mx-auto rounded-xl cursor-pointer
        flex flex-col items-center justify-center gap-2
        border-2 border-dashed transition-all duration-300 ease-out
        ${isDragOver
          ? 'border-[#6c63ff] bg-[#e8e6ff]'
          : 'border-[#6c63ff] bg-[#f0f0ff]'
        }
        hover:border-[#6c63ff] hover:bg-[#e8e6ff]
      `}
    >
      <Upload size={24} className="text-[#6c63ff]" />
      <div className="text-sm text-[#6c63ff] font-medium">
        拖拽或点击上传
      </div>
      <div className="text-xs text-[#888]">
        支持图片和3D模型文件
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.glb,.gltf,.obj,.fbx"
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );

  const UploadForm = () => (
    <div className="w-[260px] mx-auto p-4 rounded-xl bg-[#2a2a3e] border border-[#444466]">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium text-[#e0e0ff]">上传艺术品</div>
        <button
          onClick={handleCancel}
          className="p-1 rounded-full hover:bg-[#444466] transition-colors"
        >
          <X size={16} className="text-[#a0a0c0]" />
        </button>
      </div>

      {selectedFile && (
        <div className="mb-3 p-2 rounded-lg bg-[#33334d] text-xs text-[#e0e0ff] truncate">
          {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
        </div>
      )}

      <div className="space-y-3">
        <input
          type="text"
          placeholder="作品名称"
          value={artworkName}
          onChange={(e) => setArtworkName(e.target.value)}
          className="
            w-full px-3 py-2 rounded-lg text-sm
            bg-[#33334d] border border-[#444466]
            text-[#e0e0ff] placeholder-[#a0a0c0]
            focus:outline-none focus:border-[#6c63ff]
            transition-all duration-300 ease-out
          "
        />
        <textarea
          placeholder="作品描述（可选）"
          value={artworkDescription}
          onChange={(e) => setArtworkDescription(e.target.value)}
          rows={2}
          className="
            w-full px-3 py-2 rounded-lg text-sm resize-none
            bg-[#33334d] border border-[#444466]
            text-[#e0e0ff] placeholder-[#a0a0c0]
            focus:outline-none focus:border-[#6c63ff]
            transition-all duration-300 ease-out
          "
        />
        <input
          type="text"
          placeholder="标签（用逗号分隔）"
          value={artworkTags}
          onChange={(e) => setArtworkTags(e.target.value)}
          className="
            w-full px-3 py-2 rounded-lg text-sm
            bg-[#33334d] border border-[#444466]
            text-[#e0e0ff] placeholder-[#a0a0c0]
            focus:outline-none focus:border-[#6c63ff]
            transition-all duration-300 ease-out
          "
        />
      </div>

      {isUploading && (
        <div className="mt-4">
          <div className="h-2 rounded-full bg-[#444466] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${uploadProgress}%`,
                background: `linear-gradient(90deg, #6c63ff 0%, #4caf50 100%)`,
                transition: 'width 0.15s ease-out, background 1.5s ease-out',
              }}
            />
          </div>
          <div className="text-xs text-center text-[#a0a0c0] mt-1">
            {uploadProgress}%
          </div>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={isUploading || !artworkName.trim()}
        className="
          w-full mt-4 py-2 rounded-lg text-sm font-medium
          bg-[#6c63ff] text-white
          hover:bg-[#5a52e0] active:bg-[#4a42d0]
          disabled:bg-[#444466] disabled:text-[#888]
          disabled:cursor-not-allowed
          transition-all duration-300 ease-out
        "
      >
        {isUploading ? '上传中...' : '上传'}
      </button>
    </div>
  );

  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <button
          onClick={() => setShowArtworkDrawer(!showArtworkDrawer)}
          className="
            w-full h-12 bg-[#33334d] border-t border-[#444466]
            flex items-center justify-center gap-2
            text-[#e0e0ff]
            transition-all duration-300 ease-out
          "
        >
          <span className="text-sm font-medium">艺术品</span>
          {showArtworkDrawer ? (
            <ChevronDown size={18} />
          ) : (
            <ChevronUp size={18} />
          )}
        </button>

        <div
          className={`
            bg-[#33334d] border-t border-[#444466]
            transition-all duration-300 ease-out
            overflow-hidden
            ${showArtworkDrawer ? 'h-[250px]' : 'h-0'}
          `}
        >
          <div className="h-full p-4 flex flex-col">
            {showUploadForm ? <UploadForm /> : <UploadArea />}
            <div className="flex-1 overflow-hidden mt-4">
              <ArtworkGrid />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[280px] h-full bg-[#33334d] border-l border-[#444466] flex flex-col p-4 transition-all duration-300 ease-out">
      <div className="text-lg font-semibold text-[#e0e0ff] mb-4">
        艺术品管理
      </div>

      {isUploading && !showUploadForm && (
        <div className="mb-4">
          <div className="h-2 rounded-full bg-[#444466] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${uploadProgress}%`,
                background: `linear-gradient(90deg, #6c63ff 0%, #4caf50 100%)`,
                transition: 'width 0.15s ease-out',
              }}
            />
          </div>
          <div className="text-xs text-center text-[#a0a0c0] mt-1">
            上传中 {uploadProgress}%
          </div>
        </div>
      )}

      {showUploadForm ? <UploadForm /> : <UploadArea />}

      <div className="flex-1 overflow-hidden mt-4">
        <ArtworkGrid />
      </div>
    </div>
  );
};
