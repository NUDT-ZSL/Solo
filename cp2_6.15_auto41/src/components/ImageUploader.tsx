import React, { useRef, useState, useCallback } from 'react';

interface ImageUploaderProps {
  onImageUpload: (file: File, imageData: ImageData) => void;
  onReset: () => void;
  imageUrl: string | null;
  fileName: string;
  fileSize: number;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageUpload,
  onReset,
  imageUrl,
  fileName,
  fileSize
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const maxSize = 800;
        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        onImageUpload(file, imageData);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [onImageUpload]);

  const handleClick = () => {
    if (!imageUrl && inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!imageUrl) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!imageUrl) {
      const file = e.dataTransfer.files?.[0];
      if (file) {
        processFile(file);
      }
    }
  };

  return (
    <div className="upload-section">
      <h3 className="section-title">上传图片</h3>
      <div
        className={`upload-area ${isDragOver ? 'drag-over' : ''} ${imageUrl ? 'has-image' : ''}`}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="上传的图片" className="thumbnail" />
        ) : (
          <div className="upload-placeholder">
            <div className="upload-icon">🖼️</div>
            <div className="upload-text">点击或拖拽上传图片</div>
            <div className="upload-hint">支持 JPG、PNG、GIF 格式</div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden-input"
        />
      </div>
      {fileName && (
        <div className="file-info">
          <div className="file-details">
            <div className="file-name">{fileName}</div>
            <div className="file-size">{formatFileSize(fileSize)}</div>
          </div>
          <button className="btn-reset-small" onClick={onReset}>
            重置
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
