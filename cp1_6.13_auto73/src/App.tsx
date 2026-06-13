import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate
} from 'react-router-dom';
import Gallery from './pages/Gallery';
import PhotoDetail from './pages/PhotoDetail';
import { createPhoto, categoryColors, categoryNames } from './apiClient';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#1f2937',
          color: '#f9fafb',
          fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
        }}
      >
        <style>{`
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 0;
            overflow: hidden;
          }
          a {
            text-decoration: none;
            color: inherit;
          }
        `}</style>
        <Navbar />
        <main style={{ paddingTop: 56 }}>
          <Routes>
            <Route path="/" element={<Gallery />} />
            <Route path="/photo/:id" element={<PhotoDetail />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadScale, setUploadScale] = useState(false);

  const handleUploadClick = () => {
    setUploadScale(true);
    setTimeout(() => {
      setUploadScale(false);
      setShowUploadModal(true);
    }, 150);
  };

  return (
    <>
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          backgroundColor: 'rgba(31, 41, 55, 0.8)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          borderBottom: '1px solid rgba(75, 85, 99, 0.3)'
        }}
      >
        <Link
          to="/"
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: '0.5px',
            background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'pulse-glow 2s infinite alternate',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <span style={{ fontSize: 20 }}>✨</span>
          Spotlight
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={handleUploadClick}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              transform: uploadScale ? 'scale(0.95)' : 'scale(1)',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.boxShadow =
                '0 4px 16px rgba(139, 92, 246, 0.4)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            <span>📷</span>
            上传作品
          </button>

          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: '2px solid #8b5cf6',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
            }}
          >
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=current"
              alt="用户头像"
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>
      </nav>

      <style>{`
        @keyframes pulse-glow {
          from {
            filter: drop-shadow(0 0 4px rgba(99, 102, 241, 0.5));
          }
          to {
            filter: drop-shadow(0 0 16px rgba(167, 139, 250, 0.8));
          }
        }
      `}</style>

      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            navigate('/');
          }}
        />
      )}
    </>
  );
};

const UploadModal: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('portrait');
  const [description, setDescription] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      const result = e.target?.result as string;
      setImageBase64(result);
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert('请输入作品标题');
      return;
    }
    if (title.length > 30) {
      alert('标题不能超过30字');
      return;
    }
    if (!imageBase64) {
      alert('请选择上传的图片');
      return;
    }

    setSubmitting(true);
    try {
      await createPhoto({
        title: title.trim(),
        category,
        description: description.trim(),
        imageBase64,
        author: '当前用户',
        authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=current'
      });
      alert('上传成功！');
      onSuccess();
    } catch (error) {
      console.error('上传失败:', error);
      alert('上传失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    { id: 'portrait', name: '人像' },
    { id: 'landscape', name: '风光' },
    { id: 'street', name: '街拍' },
    { id: 'still', name: '静物' }
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fade-in 0.2s ease'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 560,
          maxHeight: '90vh',
          backgroundColor: '#1f2937',
          borderRadius: 16,
          border: '1px solid #374151',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slide-up 0.3s ease'
        }}
      >
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #374151',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              color: '#f9fafb'
            }}
          >
            📷 上传作品
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#9ca3af',
              fontSize: 20,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#374151';
              (e.currentTarget as HTMLElement).style.color = '#f9fafb';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLElement).style.color = '#9ca3af';
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            padding: 24,
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 500,
                color: '#d1d5db',
                marginBottom: 8
              }}
            >
              作品图片
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                width: '100%',
                height: 200,
                borderRadius: 12,
                border: `2px dashed ${dragOver ? '#8b5cf6' : '#4b5563'}`,
                backgroundColor: dragOver ? 'rgba(139, 92, 246, 0.1)' : '#111827',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              {imagePreview ? (
                <>
                  <img
                    src={imagePreview}
                    alt="预览"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain'
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 8,
                      right: 8,
                      padding: '4px 10px',
                      borderRadius: 6,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      color: '#ffffff',
                      fontSize: 12
                    }}
                  >
                    点击更换
                  </div>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 40, marginBottom: 8 }}>📁</span>
                  <span style={{ fontSize: 14, color: '#9ca3af' }}>
                    点击或拖拽图片到此处上传
                  </span>
                  <span style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    支持 JPG、PNG 等格式
                  </span>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 500,
                color: '#d1d5db',
                marginBottom: 8
              }}
            >
              作品标题
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 12,
                  color: title.length > 30 ? '#ef4444' : '#6b7280'
                }}
              >
                {title.length}/30
              </span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value.slice(0, 30))}
              placeholder="请输入作品标题（最多30字）"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #4b5563',
                backgroundColor: '#111827',
                color: '#f9fafb',
                fontSize: 14,
                outline: 'none',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={e => {
                e.target.style.borderColor = '#8b5cf6';
                e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.2)';
              }}
              onBlur={e => {
                e.target.style.borderColor = '#4b5563';
                e.target.style.boxShadow = 'none';
              }}
            />
            {title.length >= 30 && (
              <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
                标题已达上限
              </div>
            )}
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 500,
                color: '#d1d5db',
                marginBottom: 8
              }}
            >
              作品分类
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: `2px solid ${
                      category === cat.id ? categoryColors[cat.id] : '#4b5563'
                    }`,
                    backgroundColor:
                      category === cat.id
                        ? `${categoryColors[cat.id]}20`
                        : 'transparent',
                    color: category === cat.id ? categoryColors[cat.id] : '#d1d5db',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => {
                    if (category !== cat.id) {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        categoryColors[cat.id];
                    }
                  }}
                  onMouseLeave={e => {
                    if (category !== cat.id) {
                      (e.currentTarget as HTMLElement).style.borderColor = '#4b5563';
                    }
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 500,
                color: '#d1d5db',
                marginBottom: 8
              }}
            >
              作品描述（选填）
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="简单描述一下这张作品..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #4b5563',
                backgroundColor: '#111827',
                color: '#f9fafb',
                fontSize: 14,
                outline: 'none',
                resize: 'vertical',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
              onFocus={e => {
                e.target.style.borderColor = '#8b5cf6';
                e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.2)';
              }}
              onBlur={e => {
                e.target.style.borderColor = '#4b5563';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>

        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #374151',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: '1px solid #4b5563',
              backgroundColor: 'transparent',
              color: '#d1d5db',
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#374151';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !imageBase64 || !title.trim()}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              cursor:
                submitting || !imageBase64 || !title.trim()
                  ? 'not-allowed'
                  : 'pointer',
              opacity: submitting || !imageBase64 || !title.trim() ? 0.6 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            {submitting ? '上传中...' : '立即上传'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

export default App;
