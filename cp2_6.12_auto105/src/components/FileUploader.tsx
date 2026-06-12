import React, { useState, useRef, useCallback } from 'react';

interface FileUploaderProps {
  onFileAccepted: (file: File) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileAccepted }) => {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const allowed = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav'];
    if (!allowed.includes(file.type) && !file.name.match(/\.(mp3|wav)$/i)) {
      return '仅支持 MP3 和 WAV 格式';
    }
    if (file.size > 20 * 1024 * 1024) {
      return '文件大小不能超过 20MB';
    }
    return null;
  };

  const processFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('audio', file);

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'http://localhost:3001/api/upload');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setProgress(pct);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          setProgress(100);
          setTimeout(() => {
            setUploading(false);
            onFileAccepted(file);
          }, 500);
        } else {
          setError('上传失败，请重试');
          setUploading(false);
        }
      };

      xhr.onerror = () => {
        setError('网络错误，请重试');
        setUploading(false);
      };

      xhr.send(formData);
    } catch {
      setError('上传失败');
      setUploading(false);
    }
  }, [onFileAccepted]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at center, #0a0a2e, #2e1065)',
      }}
    >
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        style={{
          width: '80%',
          maxWidth: 600,
          padding: '60px 40px',
          border: `2px dashed ${dragging ? '#ffd700' : 'rgba(255,255,255,0.4)'}`,
          borderRadius: 16,
          background: dragging
            ? 'rgba(255,215,0,0.05)'
            : 'rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: uploading ? 'wait' : 'pointer',
          transition: 'all 0.3s ease',
        }}
      >
        {uploading ? (
          <>
            <div
              style={{
                width: 48,
                height: 48,
                border: '3px solid rgba(255,255,255,0.3)',
                borderTop: '3px solid #ffd700',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ marginTop: 16, color: '#fff', fontSize: 14 }}>
              上传中... {progress}%
            </div>
            <div
              style={{
                marginTop: 8,
                width: '60%',
                height: 4,
                background: 'rgba(255,255,255,0.2)',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #ffd700, #ff8c00)',
                  borderRadius: 2,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </>
        ) : (
          <>
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.6)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <div style={{ marginTop: 16, color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>
              拖拽或点击上传音频文件
            </div>
            <div style={{ marginTop: 8, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
              支持 MP3、WAV 格式，最大 20MB
            </div>
          </>
        )}
        {error && (
          <div style={{ marginTop: 12, color: '#ff6b6b', fontSize: 13 }}>
            {error}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".mp3,.wav,audio/mpeg,audio/wav"
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
};

export default FileUploader;
