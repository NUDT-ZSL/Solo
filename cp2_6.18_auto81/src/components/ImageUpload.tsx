import React, { useRef, useState, useCallback } from 'react';
import { validateImage, compressImage } from '../utils/imageUtils';

interface ImageUploadProps {
  onChange: (value: string) => void;
  value?: string;
  error?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onChange, value, error }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [localError, setLocalError] = useState<string>('');

  const displayError = error || localError;

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLocalError('');

    const validation = validateImage(file);
    if (!validation.valid) {
      setLocalError(validation.error || '图片验证失败');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 100);

      const compressedImage = await compressImage(file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      onChange(compressedImage);

      setTimeout(() => {
        setUploadProgress(0);
        setIsUploading(false);
      }, 300);
    } catch (err) {
      setLocalError('图片处理失败，请重试');
      setIsUploading(false);
      setUploadProgress(0);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onChange]);

  const handleDelete = useCallback(() => {
    onChange('');
    setLocalError('');
    setUploadProgress(0);
  }, [onChange]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={containerStyle}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg"
        onChange={handleFileChange}
        style={inputStyle}
      />

      {value ? (
        <div style={previewContainerStyle}>
          <img src={value} alt="预览" style={previewImageStyle} />
          <button
            type="button"
            onClick={handleDelete}
            style={deleteButtonStyle}
            disabled={isUploading}
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          style={{
            ...uploadButtonStyle,
            ...(displayError ? uploadButtonErrorStyle : {}),
          }}
          disabled={isUploading}
        >
          <div style={uploadIconStyle}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 16V4m0 0l-4 4m4-4l4 4" />
              <rect x="4" y="16" width="16" height="4" rx="1" />
            </svg>
          </div>
          <div style={uploadTextStyle}>点击上传图片</div>
          <div style={uploadHintStyle}>支持 JPG/PNG，最大 3MB</div>
        </button>
      )}

      {isUploading && uploadProgress > 0 && (
        <div style={progressContainerStyle}>
          <div className="progress-bar" style={{ marginTop: 8 }}>
            <div
              className="progress-bar-fill"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <div style={progressTextStyle}>上传中... {uploadProgress}%</div>
        </div>
      )}

      {displayError && (
        <div style={errorStyle} className="shake">
          {displayError}
        </div>
      )}
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  width: '100%',
};

const inputStyle: React.CSSProperties = {
  display: 'none',
};

const uploadButtonStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '200px',
  border: '2px dashed #d9d9d9',
  borderRadius: '8px',
  backgroundColor: '#fafafa',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
  transition: 'all 0.3s ease',
  padding: '24px',
};

const uploadButtonErrorStyle: React.CSSProperties = {
  borderColor: '#ff4d4f',
  backgroundColor: '#fff1f0',
};

const uploadIconStyle: React.CSSProperties = {
  color: '#8c8c8c',
  marginBottom: '8px',
};

const uploadTextStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#262626',
  fontWeight: 500,
};

const uploadHintStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#8c8c8c',
};

const previewContainerStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  borderRadius: '8px',
  overflow: 'hidden',
};

const previewImageStyle: React.CSSProperties = {
  width: '100%',
  maxHeight: '300px',
  objectFit: 'cover',
  display: 'block',
};

const deleteButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: '8px',
  right: '8px',
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  color: '#ffffff',
  border: 'none',
  fontSize: '20px',
  lineHeight: 1,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.2s ease',
};

const progressContainerStyle: React.CSSProperties = {
  marginTop: '12px',
};

const progressTextStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#8c8c8c',
  marginTop: '4px',
  textAlign: 'center',
};

const errorStyle: React.CSSProperties = {
  marginTop: '8px',
  fontSize: '12px',
  color: '#ff4d4f',
};
