import React, { useState, useRef, useCallback } from 'react';
import { Upload } from 'lucide-react';

interface ImageUploaderProps {
  onUpload: (imageDataUrl: string, width: number, height: number) => void;
  isProcessing?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onUpload, isProcessing = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndProcessFile = useCallback((file: File) => {
    setError(null);

    if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
      setError('仅支持 PNG 或 JPEG 格式的图片');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const width = img.width;
        const height = img.height;

        if (width < 1200 || height < 800) {
          setError(`图片分辨率过低 (${width}×${height}px)，要求至少 1200×800px`);
          return;
        }

        setImageDataUrl(dataUrl);
        onUpload(dataUrl, width, height);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [onUpload]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isProcessing) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndProcessFile(files[0]);
    }
  }, [isProcessing, validateAndProcessFile]);

  const handleClick = useCallback(() => {
    if (isProcessing) return;
    fileInputRef.current?.click();
  }, [isProcessing]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndProcessFile(files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [validateAndProcessFile]);

  return (
    <div className="w-full">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          backgroundColor: isDragging ? '#1F1F30' : '#2A2A3E',
          borderColor: '#4A90D9',
          transition: 'all 200ms ease-out',
        }}
        className={`
          w-full min-h-[240px] rounded-lg cursor-pointer
          flex flex-col items-center justify-center
          border-2 border-dashed p-6
          relative overflow-hidden
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleFileChange}
          className="hidden"
        />

        {imageDataUrl && !error ? (
          <div
            style={{
              borderRadius: '8px',
              border: '1px solid #ddd',
              transition: 'all 200ms ease-out',
            }}
            className="max-w-full max-h-[300px] overflow-hidden"
          >
            <img
              src={imageDataUrl}
              alt="上传预览"
              className="max-w-full max-h-[300px] object-contain block"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center">
            {isProcessing ? (
              <div
                style={{
                  color: '#4A90D9',
                  transition: 'all 200ms ease-out',
                }}
                className="animate-spin mb-4"
              >
                <Upload size={48} />
              </div>
            ) : (
              <div
                style={{
                  color: '#4A90D9',
                  transition: 'all 200ms ease-out',
                }}
                className="mb-4"
              >
                <Upload size={48} />
              </div>
            )}
            <p
              style={{
                color: '#E0E0E0',
                transition: 'all 200ms ease-out',
              }}
              className="text-base mb-2"
            >
              {isProcessing ? '正在处理...' : '点击或拖拽上传线框图截图'}
            </p>
            <p
              style={{
                color: '#888',
                fontSize: '12px',
                transition: 'all 200ms ease-out',
              }}
            >
              支持 PNG / JPEG 格式，分辨率 ≥ 1200×800px
            </p>
          </div>
        )}

        {isProcessing && imageDataUrl && (
          <div
            style={{
              backgroundColor: 'rgba(42, 42, 62, 0.85)',
              transition: 'all 200ms ease-out',
            }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div
              style={{
                color: '#4A90D9',
              }}
              className="animate-spin"
            >
              <Upload size={48} />
            </div>
          </div>
        )}
      </div>

      {error && (
        <p
          style={{
            color: '#EF4444',
            fontSize: '12px',
            transition: 'all 200ms ease-out',
          }}
          className="mt-2"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default ImageUploader;
