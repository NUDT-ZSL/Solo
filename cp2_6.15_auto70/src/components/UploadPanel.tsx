import React, { useState, useRef, useCallback } from 'react';
import { useOcr } from '../composables/useOcr';
import type { Recipe } from '../types/recipe';
import './UploadPanel.css';

interface UploadPanelProps {
  onRecipeRecognized: (recipe: Recipe) => void;
}

export const UploadPanel: React.FC<UploadPanelProps> = ({ onRecipeRecognized }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isRecognizing, progress, error, recognizeImage } = useOcr();

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
      alert('请上传 JPG 或 PNG 格式的图片');
      return;
    }

    setFileName(file.name);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    try {
      const recipe = await recognizeImage(file);
      onRecipeRecognized(recipe);
    } catch (err) {
      console.error('识别失败:', err);
    }
  }, [recognizeImage, onRecipeRecognized]);

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
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleClick = useCallback(() => {
    if (!isRecognizing) {
      fileInputRef.current?.click();
    }
  }, [isRecognizing]);

  const handleReset = useCallback(() => {
    setPreviewUrl(null);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className="upload-panel">
      <h2 className="upload-panel__title">食谱图片识别</h2>
      <p className="upload-panel__subtitle">上传食谱图片，AI自动识别生成步骤</p>

      <div
        className={`upload-zone ${isDragging ? 'upload-zone--dragging' : ''} ${isRecognizing ? 'upload-zone--processing' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png"
          onChange={handleInputChange}
          className="upload-zone__input"
        />

        {previewUrl ? (
          <div className="upload-zone__preview">
            <img src={previewUrl} alt="预览" className="upload-zone__preview-image" />
            {!isRecognizing && (
              <button
                className="upload-zone__reset-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReset();
                }}
              >
                重新上传
              </button>
            )}
          </div>
        ) : (
          <div className="upload-zone__content">
            <div className="upload-zone__icon">📷</div>
            <p className="upload-zone__text">点击或拖拽上传图片</p>
            <p className="upload-zone__hint">支持 JPG、PNG 格式</p>
          </div>
        )}

        {isRecognizing && (
          <div className="upload-zone__overlay">
            <div className="upload-zone__progress-container">
              <div className="upload-zone__progress-bar">
                <div
                  className="upload-zone__progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="upload-zone__progress-text">
                识别中... {Math.round(progress)}%
              </p>
            </div>
          </div>
        )}
      </div>

      {error && <p className="upload-panel__error">{error}</p>}

      {fileName && !isRecognizing && (
        <p className="upload-panel__filename">已选择: {fileName}</p>
      )}

      <div className="upload-panel__tips">
        <h3 className="upload-panel__tips-title">💡 使用小贴士</h3>
        <ul className="upload-panel__tips-list">
          <li>确保图片清晰、光线充足</li>
          <li>拍摄时保持菜谱平放</li>
          <li>手写文字需工整易读</li>
        </ul>
      </div>
    </div>
  );
};
