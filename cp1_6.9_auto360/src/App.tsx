import { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import Scene from './Scene';
import {
  PhotoData,
  uploadPhoto,
  getPhotos,
  updateDescription,
  formatFileSize,
  formatDate,
} from './api';

export default function App() {
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState(false);
  const [tempDescription, setTempDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getPhotos();
        setPhotos(data);
      } catch (e) {
        console.error('Failed to load photos:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (editingDescription && descriptionRef.current) {
      descriptionRef.current.focus();
      descriptionRef.current.select();
    }
  }, [editingDescription]);

  const selectedPhoto = photos.find((p) => p.id === selectedId) || null;

  const handleSelect = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      setEditingDescription(false);
      if (id) {
        const photo = photos.find((p) => p.id === id);
        if (photo) setTempDescription(photo.description);
      }
    },
    [photos]
  );

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const description = descriptionRef.current?.value || '';

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const result = await uploadPhoto(file, description, (p) => setUploadProgress(p));
      setPhotos((prev) => [...prev, result]);
      setShowUploadPanel(false);
      if (descriptionRef.current) descriptionRef.current.value = '';
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : '上传失败');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveDescription = async () => {
    if (!selectedPhoto) return;
    try {
      const updated = await updateDescription(selectedPhoto.id, tempDescription);
      setPhotos((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
      setEditingDescription(false);
    } catch (e) {
      console.error('Failed to update:', e);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedId(null);
      setShowUploadPanel(false);
    }
  };

  return (
    <div className="app-root" onClick={handleBackdropClick}>
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">🖼️</span>
          <h1>记忆回廊</h1>
        </div>
        <div className="header-actions">
          <span className="photo-count">
            {photos.length > 0 ? `共 ${photos.length} 张照片` : '空展厅'}
          </span>
          <button
            className="btn-primary"
            onClick={(e) => {
              e.stopPropagation();
              setShowUploadPanel(true);
            }}
          >
            <span className="btn-icon">+</span>
            上传照片
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="canvas-container">
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>正在加载记忆回廊...</p>
            </div>
          ) : (
            <>
              {photos.length === 0 ? (
                <div className="empty-hall">
                  <div className="empty-bg" />
                  <button
                    className="empty-add-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowUploadPanel(true);
                    }}
                  >
                    +
                  </button>
                  <p className="empty-hint">点击添加你的第一张照片</p>
                </div>
              ) : (
                <Canvas
                  camera={{ fov: 50, near: 0.1, far: 1000, position: [0, 5, 60] }}
                  gl={{ antialias: true, alpha: false }}
                  onPointerMissed={() => setSelectedId(null)}
                  style={{ cursor: 'grab' }}
                >
                  <color attach="background" args={['#121212']} />
                  <fog attach="fog" args={['#121212', 40, 120]} />
                  <Scene photos={photos} selectedId={selectedId} onSelect={handleSelect} />
                </Canvas>
              )}
            </>
          )}
        </div>

        {selectedPhoto && (
          <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
            <div className="detail-thumb-wrapper">
              <img src={selectedPhoto.thumbnail} alt="" className="detail-thumb" />
              <div className="detail-colors">
                {selectedPhoto.dominant_colors_hex.map((c, i) => (
                  <div
                    key={i}
                    className="color-dot"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>

            <div className="detail-info">
              <h3 className="detail-title">{selectedPhoto.original_name}</h3>

              <div className="detail-row">
                <span className="detail-label">文件大小</span>
                <span className="detail-value">{formatFileSize(selectedPhoto.file_size)}</span>
              </div>

              {selectedPhoto.shot_time && (
                <div className="detail-row">
                  <span className="detail-label">拍摄时间</span>
                  <span className="detail-value">{selectedPhoto.shot_time}</span>
                </div>
              )}

              <div className="detail-row">
                <span className="detail-label">上传时间</span>
                <span className="detail-value">{formatDate(selectedPhoto.upload_time)}</span>
              </div>

              <div className="detail-desc-section">
                <div className="detail-desc-header">
                  <span className="detail-label">照片描述</span>
                  {!editingDescription ? (
                    <button
                      className="btn-edit"
                      onClick={() => setEditingDescription(true)}
                    >
                      编辑
                    </button>
                  ) : (
                    <div className="edit-actions">
                      <button className="btn-cancel" onClick={() => setEditingDescription(false)}>
                        取消
                      </button>
                      <button className="btn-save" onClick={handleSaveDescription}>
                        保存
                      </button>
                    </div>
                  )}
                </div>
                {editingDescription ? (
                  <textarea
                    ref={descriptionRef}
                    className="desc-textarea"
                    value={tempDescription}
                    onChange={(e) => setTempDescription(e.target.value)}
                    placeholder="为这张照片写点什么吧..."
                    rows={4}
                  />
                ) : (
                  <p className="detail-desc">
                    {selectedPhoto.description || '暂无描述，点击编辑添加'}
                  </p>
                )}
              </div>
            </div>

            <button
              className="detail-close"
              onClick={() => setSelectedId(null)}
              aria-label="关闭"
            >
              ×
            </button>
          </div>
        )}
      </main>

      {showUploadPanel && (
        <div className="upload-panel-overlay" onClick={(e) => e.stopPropagation()}>
          <div className={`upload-panel ${showUploadPanel ? 'slide-up' : ''}`}>
            <div className="upload-panel-header">
              <h2>上传照片</h2>
              <button
                className="panel-close"
                onClick={() => setShowUploadPanel(false)}
                aria-label="关闭"
              >
                ×
              </button>
            </div>

            <div className="upload-panel-body">
              <label
                className="file-drop-zone"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => handleFileSelect(e.target.files)}
                  disabled={uploading}
                />
                <div className="file-drop-icon">📷</div>
                <p className="file-drop-text">
                  {uploading ? '正在上传...' : '点击或拖拽图片到此处上传'}
                </p>
                <p className="file-drop-hint">支持 JPG、PNG、GIF、WebP 等常见图片格式</p>

                {uploading && (
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${uploadProgress}%` }}
                    />
                    <span className="progress-text">{uploadProgress}%</span>
                  </div>
                )}
              </label>

              <div className="upload-form">
                <label className="form-label">
                  <span>照片描述</span>
                  <textarea
                    ref={descriptionRef}
                    className="form-textarea"
                    placeholder="为这张照片写点什么吧...（可选）"
                    rows={3}
                    disabled={uploading}
                  />
                </label>

                {uploadError && (
                  <div className="form-error">⚠️ {uploadError}</div>
                )}

                <div className="form-actions">
                  <button
                    className="btn-secondary"
                    disabled={uploading}
                    onClick={() => setShowUploadPanel(false)}
                  >
                    取消
                  </button>
                  <button
                    className="btn-primary"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? '上传中...' : '选择并上传'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
