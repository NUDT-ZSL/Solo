import React, { useCallback, useRef, useState } from 'react';
import { UploadCloud, FileAudio2, CheckCircle2, AlertCircle } from 'lucide-react';

interface AudioUploaderProps {
  onUpload: (file: File, onProgress?: (p: number) => void) => Promise<void>;
  uploadedFile?: { fileName: string; duration: number; sizeText?: string; durationText?: string } | null;
}

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPT_EXT = ['.mp3', '.wav', '.wave'];
const ACCEPT_MIME = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav'];

const AudioUploader: React.FC<AudioUploaderProps> = ({ onUpload, uploadedFile }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const validateFile = (file: File): string | null => {
    const name = file.name.toLowerCase();
    const extOk = ACCEPT_EXT.some(ext => name.endsWith(ext));
    const mimeOk = ACCEPT_MIME.includes(file.type) || file.type.includes('audio/');
    if (!extOk && !mimeOk) return '仅支持 mp3 / wav 格式';
    if (file.size > MAX_SIZE) return '文件超过 10MB 限制';
    return null;
  };

  const processFile = useCallback(async (file: File) => {
    const err = validateFile(file);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setProgress(0);
    setIsUploading(true);
    try {
      await onUpload(file, (p) => setProgress(p));
      setProgress(100);
      setTimeout(() => setProgress(null), 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败');
      setProgress(null);
    } finally {
      setIsUploading(false);
    }
  }, [onUpload]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const onClick = () => {
    if (!isUploading) inputRef.current?.click();
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <div className="card-title standard-title">
        <FileAudio2 size={22} />
        标准音频
      </div>
      <div className="card-desc">上传教师标准读音音频（mp3 / wav）</div>

      <div
        className={`upload-dropzone ${dragging ? 'dragging' : ''}`}
        onClick={onClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".mp3,.wav,.wave,audio/*"
          style={{ display: 'none' }}
          onChange={onChange}
        />
        <div className="upload-icon">
          <UploadCloud size={48} strokeWidth={1.5} />
        </div>
        <div className="upload-text-main">
          {dragging ? '释放以上传文件' : isUploading ? '正在上传分析...' : '拖拽文件到此处 或 点击选择'}
        </div>
        <div className="upload-text-sub">支持 .mp3 / .wav，最大 10MB</div>

        {progress !== null && (
          <div className="upload-progress">
            <div className="upload-progress-bar" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      {uploadedFile && (
        <div className="upload-fileinfo">
          <CheckCircle2 size={22} color="#4ECDC4" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="upload-fileinfo-name" title={uploadedFile.fileName}>
              {uploadedFile.fileName}
            </div>
            <div className="upload-fileinfo-meta">
              {uploadedFile.durationText || `${uploadedFile.duration.toFixed(1)}s`}
              {uploadedFile.sizeText ? ` · ${uploadedFile.sizeText}` : ''}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="upload-error">
          <AlertCircle size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
          {error}
        </div>
      )}
    </div>
  );
};

export default AudioUploader;
