import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Photo } from '../types';
import { uploadPhotos } from '../api';

interface UploadZoneProps {
  onUpload: (photos: Photo[]) => void;
}

export default function UploadZone({ onUpload }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback((files: File[]): { valid: File[]; errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 10 * 1024 * 1024;

    files.forEach((file) => {
      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: 仅支持JPG和PNG格式`);
      } else if (file.size > maxSize) {
        errors.push(`${file.name}: 文件大小超过10MB`);
      } else {
        valid.push(file);
      }
    });
    return { valid, errors };
  }, []);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const { valid, errors } = validateFiles(fileArray);

      if (errors.length > 0) {
        setError(errors.join('\n'));
        setTimeout(() => setError(null), 3000);
        if (valid.length === 0) return;
      }

      setUploading(true);
      setProgress(0);

      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          return prev + 5;
        });
      }, 100);

      try {
        const uploaded = await uploadPhotos(valid);
        setProgress(100);
        onUpload(uploaded);
      } catch (err) {
        setError('上传失败，请重试');
        setTimeout(() => setError(null), 3000);
      } finally {
        clearInterval(interval);
        setTimeout(() => {
          setUploading(false);
          setProgress(0);
        }, 500);
      }
    },
    [onUpload, validateFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleClick = () => {
    if (!uploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 800, margin: '0 auto' }}>
      <motion.div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        style={{
          position: 'relative',
          padding: 48,
          borderRadius: 16,
          border: '3px dashed',
          borderColor: isDragOver ? '#f5c518' : 'transparent',
          background: '#16213e',
          cursor: uploading ? 'progress' : 'pointer',
          textAlign: 'center',
          overflow: 'hidden',
        }}
      >
        <motion.div
          animate={{
            background: [
              'linear-gradient(90deg, rgba(245,197,24,0.3) 0%, transparent 50%, rgba(245,197,24,0.3) 100%)',
              'linear-gradient(90deg, transparent 0%, rgba(245,197,24,0.3) 50%, transparent 100%)',
              'linear-gradient(90deg, rgba(245,197,24,0.3) 0%, transparent 50%, rgba(245,197,24,0.3) 100%)',
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
          }}
        />
        <motion.div
          animate={isDragOver ? { scale: 1.1 } : { scale: 1 }}
          transition={{ type: 'spring', stiffness: 400 }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>📸</div>
          <h2 style={{ color: '#f5c518', fontSize: 24, marginBottom: 8 }}>
            {isDragOver ? '松开上传！' : '拖拽照片到此处'}
          </h2>
          <p style={{ color: '#8888aa', fontSize: 14 }}>
            或点击选择文件 · 支持JPG/PNG · 单张不超过10MB
          </p>
        </motion.div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </motion.div>

      <AnimatePresence>
        {uploading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ marginTop: 16 }}
          >
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: '#16213e',
                overflow: 'hidden',
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: 'easeOut', duration: 0.2 }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #f5c518, #ffd700)',
                }}
              />
            </div>
            <p style={{ textAlign: 'center', marginTop: 8, color: '#f5c518' }}>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{ display: 'inline-block', marginRight: 8 }}
              >
                ⏳
              </motion.span>
              正在分析中... {progress}%
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ x: 0 }}
            animate={{ x: [0, -10, 10, -10, 10, 0] }}
            transition={{ duration: 0.5 }}
            exit={{ opacity: 0 }}
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 8,
              background: 'rgba(255, 77, 79, 0.2)',
              border: '1px solid #ff4d4f',
              color: '#ff7875',
              whiteSpace: 'pre-line',
            }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
