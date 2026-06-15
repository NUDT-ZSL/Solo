import { useState, useRef, useCallback, useEffect } from 'react';
import type { Artwork, ApiResponse } from './types';

interface UploaderProps {
  onUploadSuccess: (artwork: Artwork) => void;
}

const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];

const Uploader = ({ onUploadSuccess }: UploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPreviewTooltip, setShowPreviewTooltip] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, []);

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return '只支持 JPG/PNG 格式的图片';
    }
    if (file.size > MAX_SIZE) {
      return '图片大小不能超过 5MB';
    }
    return null;
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setTimeout(() => setError(null), 3000);
        return;
      }

      setError(null);
      setIsUploading(true);

      const tempPreview = URL.createObjectURL(file);
      setPreviewUrl(tempPreview);

      try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('title', file.name.replace(/\.[^/.]+$/, ''));

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        const json: ApiResponse<Artwork> = await res.json();

        if (json.success && json.data) {
          onUploadSuccess(json.data);
          setShowPreviewTooltip(true);
          if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
          previewTimerRef.current = setTimeout(() => {
            setShowPreviewTooltip(false);
          }, 4000);
        } else {
          setError(json.error || '上传失败');
          URL.revokeObjectURL(tempPreview);
          setPreviewUrl(null);
          setTimeout(() => setError(null), 3000);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '网络错误');
        URL.revokeObjectURL(tempPreview);
        setPreviewUrl(null);
        setTimeout(() => setError(null), 3000);
      } finally {
        setIsUploading(false);
      }
    },
    [onUploadSuccess, validateFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleClick = useCallback(() => {
    if (!isUploading) inputRef.current?.click();
  }, [isUploading]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      if (inputRef.current) inputRef.current.value = '';
    },
    [handleFile]
  );

  return (
    <>
      <div style={styles.wrapper}>
        <div
          style={{
            ...styles.uploader,
            ...(isDragging ? styles.uploaderDragging : {}),
            ...(isUploading ? styles.uploaderDisabled : {})
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            style={{ display: 'none' }}
            onChange={handleInputChange}
          />
          <span style={styles.icon}>{isUploading ? '⏳' : '📤'}</span>
          <span style={styles.text}>
            {isUploading ? '上传中...' : isDragging ? '松开上传' : '上传作品'}
          </span>
        </div>
        {error && <div style={styles.error}>{error}</div>}
      </div>

      {previewUrl && (
        <div
          style={{
            ...styles.previewContainer,
            opacity: showPreviewTooltip ? 1 : 0,
            transform: showPreviewTooltip ? 'translateY(0)' : 'translateY(-12px)',
            pointerEvents: showPreviewTooltip ? 'auto' : 'none',
            transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
          onClick={() => {
            setShowPreviewTooltip(false);
          }}
        >
          <div style={styles.previewBadge}>✨ 上传成功！</div>
          <img src={previewUrl} alt="预览" style={styles.previewImage} />
        </div>
      )}
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' },
  uploader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #e94560 0%, #c73659 100%)',
    borderRadius: 12,
    cursor: 'pointer',
    color: '#fff',
    fontWeight: 600,
    fontSize: 15,
    boxShadow: '0 4px 16px rgba(233,69,96,0.4)',
    transition: 'all 0.25s ease',
    userSelect: 'none',
    border: '2px solid transparent'
  },
  uploaderDragging: {
    background: 'linear-gradient(135deg, #ff5e7e 0%, #e94560 100%)',
    borderColor: '#ffb3c1',
    transform: 'scale(1.05)',
    boxShadow: '0 6px 24px rgba(233,69,96,0.6)'
  },
  uploaderDisabled: { cursor: 'not-allowed', opacity: 0.7 },
  icon: { fontSize: 18 },
  text: { fontSize: 15 },
  error: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    padding: '8px 12px',
    background: 'rgba(233,69,96,0.15)',
    border: '1px solid #e94560',
    color: '#ff8fa3',
    borderRadius: 8,
    fontSize: 13,
    whiteSpace: 'nowrap'
  },
  previewContainer: {
    position: 'fixed',
    top: 24,
    right: 24,
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    background: 'rgba(26,26,46,0.95)',
    borderRadius: 16,
    border: '1px solid rgba(233,69,96,0.3)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    cursor: 'pointer'
  },
  previewBadge: {
    fontSize: 13,
    fontWeight: 600,
    color: '#e94560'
  },
  previewImage: {
    width: 120,
    height: 90,
    objectFit: 'cover',
    borderRadius: 10
  }
};

export default Uploader;
