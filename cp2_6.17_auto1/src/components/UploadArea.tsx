import { useCallback, useRef } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { usePhotoStore } from '@/store/usePhotoStore';
import { extractFeatures } from '@/modules/ImageProcessor';
import { generateTags } from '@/modules/TagManager';
import type { Photo } from '@/types';
import { cn } from '@/lib/utils';

export function UploadArea() {
  const { isDragging, setDragging, addPhoto } = usePhotoStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateId = () => `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const processFile = useCallback(async (file: File) => {
    if (!file.type.match('image/(jpeg|png)')) {
      alert('请上传 JPG 或 PNG 格式的图片');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过 10MB');
      return;
    }

    try {
      const features = await extractFeatures(file);
      const tags = generateTags(features);

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;

        const photo: Photo = {
          id: generateId(),
          dataUrl,
          fileName: file.name,
          fileSize: file.size,
          uploadTime: new Date().toISOString(),
          tags,
          features,
        };

        addPhoto(photo);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('处理图片失败:', error);
      alert('处理图片失败，请重试');
    }
  }, [addPhoto]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach(file => {
      processFile(file);
    });
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles, setDragging]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setDragging(true);
    }
  }, [isDragging, setDragging]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, [setDragging]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        'border-2 border-dashed rounded-xl p-8 mb-6 text-center cursor-pointer transition-all duration-200',
        isDragging
          ? 'border-[#4338ca] bg-[#e0e7ff]/30 border-solid'
          : 'border-gray-300 hover:border-[#4338ca]/50 hover:bg-gray-50'
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        onChange={handleInputChange}
        className="hidden"
      />

      <div className="flex flex-col items-center gap-3">
        <div className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-200',
          isDragging ? 'bg-[#4338ca]' : 'bg-[#e0e7ff]'
        )}>
          {isDragging ? (
            <ImageIcon size={32} className="text-white" />
          ) : (
            <Upload size={32} className="text-[#4338ca]" />
          )}
        </div>

        <div>
          <p className="text-lg font-medium text-[#1e293b]">
            {isDragging ? '释放以上传照片' : '拖拽照片到此处，或点击上传'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            支持 JPG、PNG 格式，单张不超过 10MB
          </p>
        </div>
      </div>
    </div>
  );
}
