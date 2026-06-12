import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Upload, FileImage, FileVideo } from 'lucide-react';
import { apiClient } from '@/api';
import { useStore } from '@/store';
import TagInput from './TagInput';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMaterial = useStore((state) => state.addMaterial);
  const loadMoreMaterials = useStore((state) => state.loadMoreMaterials);

  const handleClose = useCallback(() => {
    if (!isUploading) {
      setSelectedFile(null);
      setTitle('');
      setTags([]);
      setUploadProgress(0);
      onClose();
    }
  }, [isUploading, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleClose]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !title.trim()) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', title.trim());
      formData.append('tags', JSON.stringify(tags));

      const material = await apiClient.createMaterial(formData, (progress) => {
        if (progress.total) {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          setUploadProgress(percent);
        }
      });

      addMaterial(material);
      loadMoreMaterials(true);
      handleClose();
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fadeIn">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      ></div>

      <div className="relative bg-white rounded-16 w-[500px] max-w-[90vw] max-h-[90vh] overflow-y-auto animate-scaleIn shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 font-display">
            上传素材
          </h2>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div
            className={`relative border-2 border-dashed rounded-12 p-10 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-brand bg-brand/5'
                : 'border-gray-200 bg-[#e9ecef] hover:border-gray-300'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleInputChange}
              className="hidden"
            />

            {!selectedFile ? (
              <div className="space-y-3">
                <div className="flex justify-center">
                  {isDragging ? (
                    <Upload size={48} className="text-brand" />
                  ) : (
                    <Upload size={48} className="text-gray-400" />
                  )}
                </div>
                <p className="text-gray-600">
                  拖拽文件到此处，或点击选择文件
                </p>
                <p className="text-sm text-gray-400">支持图片和视频格式</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-center">
                  {selectedFile.type.startsWith('image/') ? (
                    <FileImage size={48} className="text-brand" />
                  ) : (
                    <FileVideo size={48} className="text-brand" />
                  )}
                </div>
                <p className="text-gray-800 font-medium truncate">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </p>
                <button
                  className="text-sm text-brand hover:text-brand-hover"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    fileInputRef.current!.value = '';
                  }}
                >
                  重新选择
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入素材标题"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              标签
            </label>
            <TagInput
              value={tags}
              onChange={setTags}
              placeholder="添加标签，最多5个"
            />
          </div>

          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>上传中...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand to-brand-hover transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!selectedFile || !title.trim() || isUploading}
            className="w-full py-3 bg-brand text-white rounded-lg font-medium hover:bg-brand-hover transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isUploading ? '上传中...' : '确认上传'}
          </button>
        </div>
      </div>
    </div>
  );
}
