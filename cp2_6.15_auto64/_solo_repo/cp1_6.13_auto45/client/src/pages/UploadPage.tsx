import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { podcastApi } from '../utils/api';
import './UploadPage.css';

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

const MAX_FILES = 5;
const MAX_TOTAL_SIZE = 200 * 1024 * 1024; // 200MB

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback((files: File[]): { valid: boolean; error?: string } => {
    if (files.length === 0) {
      return { valid: false, error: '请选择要上传的文件' };
    }

    if (files.length > MAX_FILES) {
      return { valid: false, error: `最多只能上传 ${MAX_FILES} 个文件` };
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_TOTAL_SIZE) {
      return { valid: false, error: `总文件大小不能超过 200MB，当前大小：${(totalSize / 1024 / 1024).toFixed(1)}MB` };
    }

    for (const file of files) {
      if (file.size > MAX_TOTAL_SIZE) {
        return { valid: false, error: `单个文件大小不能超过 200MB：${file.name}` };
      }
    }

    return { valid: true };
  }, []);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validation = validateFiles(fileArray);
    
    if (!validation.valid) {
      setError(validation.error || '文件校验失败');
      return;
    }

    setError(null);

    const newItems: UploadItem[] = fileArray.map(file => ({
      id: `${Date.now()}-${file.name}`,
      file,
      progress: 0,
      status: 'pending'
    }));

    setUploadItems(prev => [...prev, ...newItems]);
    startUpload(newItems);
  }, [validateFiles]);

  const startUpload = async (items: UploadItem[]) => {
    const filesToUpload = items.map(item => item.file);
    
    items.forEach(item => {
      setUploadItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, status: 'uploading' as const } : i
      ));
    });

    try {
      const interval = setInterval(() => {
        setUploadItems(prev => prev.map(item => {
          if (item.status === 'uploading' && item.progress < 90) {
            return { ...item, progress: Math.min(90, item.progress + Math.random() * 15) };
          }
          return item;
        }));
      }, 300);

      const uploadedPodcasts = await podcastApi.upload(filesToUpload);

      clearInterval(interval);

      items.forEach(item => {
        setUploadItems(prev => prev.map(i => 
          i.id === item.id ? { ...i, status: 'completed' as const, progress: 100 } : i
        ));
      });

      setTimeout(() => {
        navigate('/');
      }, 1500);

    } catch (err) {
      items.forEach(item => {
        setUploadItems(prev => prev.map(i => 
          i.id === item.id ? { ...i, status: 'error' as const, error: '上传失败' } : i
        ));
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '等待中';
      case 'uploading': return '上传中';
      case 'completed': return '完成';
      case 'error': return '失败';
      default: return status;
    }
  };

  return (
    <div className="upload-page">
      <header className="app-header">
        <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1>PodcastVault</h1>
        </div>
        <nav className="nav-links">
          <button className="nav-btn" onClick={() => navigate('/')}>首页</button>
          <button className="nav-btn" onClick={() => navigate('/tags')}>标签搜索</button>
          <button className="nav-btn upload-btn active" onClick={() => navigate('/upload')}>上传</button>
        </nav>
      </header>

      <main className="main-content">
        <section className="upload-section">
          <h2>上传播客</h2>
          <p className="upload-desc">拖拽音频文件到下方区域，或点击选择文件</p>

          {error && (
            <div className="error-message">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <div
            className={`drop-zone ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="audio/*"
              onChange={handleInputChange}
              className="file-input"
            />
            <div className="drop-zone-content">
              <div className="upload-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
                </svg>
              </div>
              <p className="drop-text">
                {isDragging ? '释放文件开始上传' : '拖拽音频文件到这里'}
              </p>
              <p className="drop-hint">或点击选择文件</p>
              <p className="drop-limits">最多 5 个文件，总大小不超过 200MB</p>
            </div>
          </div>
        </section>

        {uploadItems.length > 0 && (
          <section className="upload-list-section">
            <h3>上传列表</h3>
            <div className="upload-list">
              {uploadItems.map(item => (
                <div key={item.id} className={`upload-item ${item.status}`}>
                  <div className="upload-item-info">
                    <svg className="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                      <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="file-details">
                      <span className="file-name">{item.file.name}</span>
                      <span className="file-size">{formatFileSize(item.file.size)}</span>
                    </div>
                  </div>
                  <div className="upload-item-progress">
                    <div className="progress-track">
                      <div 
                        className="progress-bar-fill" 
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <span className={`status-text ${item.status}`}>
                      {getStatusText(item.status)}
                      {item.status === 'uploading' && ` ${Math.round(item.progress)}%`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default UploadPage;
