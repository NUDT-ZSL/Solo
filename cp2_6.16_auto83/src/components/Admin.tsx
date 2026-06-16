import React, { useState, useRef } from 'react';
import { useGalleryContext } from '../context/GalleryContext';
import type { Painting } from '../types';

const ADMIN_PASSWORD = 'gallery2024';

const Admin: React.FC = () => {
  const { paintings, loading, error, deletePainting, uploadPainting } = useGalleryContext();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [title, setTitle] = useState('');
  const [series, setSeries] = useState('');
  const [description, setDescription] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError('');
    } else {
      setPasswordError('密码错误，请重试');
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过5MB');
      return;
    }

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('请选择jpg或png格式的图片');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImageData(result);
      setPreviewImage(result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !series || !description || !imageData) {
      alert('请填写完整信息并选择图片');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 100);

    try {
      const result = await uploadPainting({ title, series, description, imageData });

      setUploadProgress(100);

      if (result) {
        setTitle('');
        setSeries('');
        setDescription('');
        setImageData('');
        setPreviewImage(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        alert('上传成功！');
      } else {
        alert('上传失败，请重试');
      }
    } catch {
      alert('上传失败，请重试');
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deletePainting(id);
    if (success) {
      setDeleteConfirmId(null);
      alert('删除成功');
    } else {
      alert('删除失败，请重试');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <form className="login-form" onSubmit={handlePasswordSubmit}>
          <h2 className="login-title">管理员登录</h2>
          <input
            type="password"
            className="password-input"
            placeholder="请输入管理密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {passwordError && <div className="password-error">{passwordError}</div>}
          <button type="submit" className="login-button">
            登录
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <h1 className="admin-title">后台管理</h1>

      <form className="upload-form" onSubmit={handleUpload}>
        <h2 className="form-title">上传新作品</h2>

        <div className="form-group">
          <label className="form-label">画作标题</label>
          <input
            type="text"
            className="form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="请输入画作标题"
          />
        </div>

        <div className="form-group">
          <label className="form-label">所属系列</label>
          <input
            type="text"
            className="form-input"
            value={series}
            onChange={(e) => setSeries(e.target.value)}
            placeholder="请输入所属系列"
          />
        </div>

        <div className="form-group">
          <label className="form-label">详细描述</label>
          <textarea
            className="form-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="请输入详细描述"
          />
        </div>

        <div className="form-group">
          <label className="form-label">选择图片</label>
          <div className="image-upload-section">
            <input
              type="file"
              ref={fileInputRef}
              accept=".jpg,.jpeg,.png"
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="select-image-button"
              onClick={() => fileInputRef.current?.click()}
            >
              选择图片
            </button>
            {previewImage && (
              <div className="preview-container">
                <img src={previewImage} alt="预览" className="preview-image" />
              </div>
            )}
          </div>
        </div>

        {isUploading && (
          <div className="progress-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="progress-text">上传中... {uploadProgress}%</span>
          </div>
        )}

        <button
          type="submit"
          className="upload-button"
          disabled={isUploading}
        >
          {isUploading ? '上传中...' : '上传'}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      <div className="paintings-list-section">
        <h2 className="form-title">已有作品</h2>
        {loading ? (
          <div className="loading-text">加载中...</div>
        ) : paintings.length === 0 ? (
          <div className="empty-text">暂无作品</div>
        ) : (
          <div className="paintings-list">
            {paintings.map(painting => (
              <div key={painting.id} className="painting-list-item">
                <img
                  src={painting.imageData}
                  alt={painting.title}
                  className="list-thumbnail"
                />
                <div className="list-info">
                  <div className="list-title">{painting.title}</div>
                  <div className="list-series">{painting.series}</div>
                </div>
                <button
                  className="delete-button"
                  onClick={() => setDeleteConfirmId(painting.id)}
                >
                  ×
                </button>

                {deleteConfirmId === painting.id && (
                  <div className="confirm-dialog-overlay">
                    <div className="confirm-dialog">
                      <p className="confirm-text">确定要删除这幅作品吗？</p>
                      <div className="confirm-buttons">
                        <button
                          className="confirm-cancel"
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          取消
                        </button>
                        <button
                          className="confirm-ok"
                          onClick={() => handleDelete(painting.id)}
                        >
                          确定
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
