import { useState, useRef } from 'react';
import type { Score } from '../types';

interface UploadFormProps {
  onUploadComplete: (score: Score) => void;
}

export default function UploadForm({ onUploadComplete }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (selectedFile: File | null) => {
    setError(null);
    if (!selectedFile) return;

    if (!['image/jpeg', 'image/png'].includes(selectedFile.type)) {
      setError('仅支持 JPG 和 PNG 格式');
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('文件大小不能超过 5MB');
      return;
    }
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 80);
          setProgress(pct);
        }
      });

      const responsePromise = new Promise<Score>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setProgress(100);
            setTimeout(() => {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch (e) {
                reject(e);
              }
            }, 600);
          } else {
            reject(new Error('上传失败'));
          }
        };
        xhr.onerror = () => reject(new Error('网络错误'));
      });

      xhr.open('POST', '/api/upload');
      xhr.send(formData);

      const result = await responsePromise;
      onUploadComplete(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败');
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}
    >
      <h3 style={{ fontSize: '18px', marginBottom: '16px', color: '#333' }}>
        上传乐谱照片
      </h3>

      {error && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#fff5f5',
            color: '#d9534f',
            borderRadius: '8px',
            fontSize: '14px',
            marginBottom: '16px',
          }}
        >
          {error}
        </div>
      )}

      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const droppedFile = e.dataTransfer.files[0];
          handleFileChange(droppedFile);
        }}
        style={{
          border: `2px dashed ${dragging ? '#b8860b' : '#d4c5a9'}`,
          borderRadius: '12px',
          padding: '40px 20px',
          textAlign: 'center',
          cursor: uploading ? 'default' : 'pointer',
          backgroundColor: dragging ? '#faf6f0' : 'transparent',
          transition: 'all 0.2s',
          marginBottom: '16px',
        }}
      >
        {file ? (
          <div>
            <div style={{ color: '#333', fontSize: '14px', fontWeight: 500 }}>
              {file.name}
            </div>
            <div style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>
        ) : (
          <div>
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#d4c5a9"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ margin: '0 auto 12px' }}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p style={{ color: '#666', fontSize: '14px' }}>
              点击或拖拽上传 JPG/PNG 图片
            </p>
            <p style={{ color: '#999', fontSize: '12px', marginTop: '6px' }}>
              最大 5MB
            </p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          style={{ display: 'none' }}
          onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
        />
      </div>

      {uploading && (
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#e0e0e0',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: '#b8860b',
                transition: 'width 0.5s ease',
              }}
            />
          </div>
          <p style={{ color: '#666', fontSize: '13px', marginTop: '8px', textAlign: 'center' }}>
            {progress < 100 ? '正在识别乐谱信息...' : '上传完成！'}
          </p>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: !file || uploading ? '#ccc' : '#b8860b',
          color: '#fff',
          border: 'none',
          fontSize: '15px',
          fontWeight: 500,
          cursor: !file || uploading ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          if (file && !uploading) e.currentTarget.style.backgroundColor = '#8b6914';
        }}
        onMouseLeave={(e) => {
          if (file && !uploading) e.currentTarget.style.backgroundColor = '#b8860b';
        }}
      >
        {uploading ? '上传中...' : '开始上传'}
      </button>
    </div>
  );
}
