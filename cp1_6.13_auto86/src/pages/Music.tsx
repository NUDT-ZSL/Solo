import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface MusicItem {
  _id: string;
  title: string;
  filePath: string;
  thumbnailPath: string;
  mimeType: string;
}

const containerStyle: React.CSSProperties = {
  maxWidth: 1400,
  margin: '0 auto',
  padding: '40px 24px',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-end',
  marginBottom: 40,
  flexWrap: 'wrap',
  gap: 16,
};

const titleStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  background: 'linear-gradient(135deg, #a78bfa, #38bdf8)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};

const uploadBtnStyle: React.CSSProperties = {
  padding: '10px 24px',
  background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
  color: 'white',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 24,
};

const thumbStyle: React.CSSProperties = {
  width: 200,
  height: 280,
  borderRadius: 8,
  overflow: 'hidden',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  cursor: 'pointer',
  transition: 'all 0.2s ease-in-out',
  background: '#1e1b4b',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#e2e8f0',
  fontSize: 13,
  margin: '0 auto',
};

const thumbWrapperStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 12,
};

const titleLabelStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#e2e8f0',
  textAlign: 'center',
};

const modalStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  backdropFilter: 'blur(30px)',
  WebkitBackdropFilter: 'blur(30px)',
  background: 'rgba(15, 14, 23, 0.7)',
  display: 'flex',
  alignItems: 'center',
  padding: 40,
};

const closeBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: 24,
  right: 24,
  width: 44,
  height: 44,
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.1)',
  color: 'white',
  fontSize: 20,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10000,
};

const pdfViewerStyle: React.CSSProperties = {
  width: '60%',
  height: '85vh',
  background: 'white',
  borderRadius: 12,
  border: 'none',
  marginRight: 40,
};

const responsiveStyle = `
  @media (max-width: 1024px) {
    .music-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  }
  @media (max-width: 768px) {
    .music-grid { grid-template-columns: 1fr !important; }
  }
`;

function Music() {
  const [musicList, setMusicList] = useState<MusicItem[]>([]);
  const [selected, setSelected] = useState<MusicItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [scale, setScale] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    axios.get('/api/music').then((res) => setMusicList(res.data));
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handlePinch = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale((s) => Math.min(Math.max(s + delta, 0.5), 3));
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('文件大小不能超过10MB');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMusicList((prev) => [res.data, ...prev]);
    } catch (err) {
      alert('上传失败');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>乐谱库</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 8 }}>PDF 或图片格式乐谱，支持上传</p>
        </div>
        <div>
          <button style={uploadBtnStyle} onClick={() => fileInputRef.current?.click()}>
            {uploading ? '上传中...' : '📤 上传乐谱'}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="application/pdf,image/*"
            onChange={handleUpload}
          />
        </div>
      </div>

      <div style={gridStyle} className="music-grid">
        {musicList.map((item) => (
          <div style={thumbWrapperStyle} key={item._id}>
            <div
              style={thumbStyle}
              onClick={() => {
                setSelected(item);
                setScale(1);
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.05)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 16px 48px rgba(167, 139, 250, 0.3)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)';
              }}
            >
              {item.thumbnailPath ? (
                <img
                  src={item.thumbnailPath}
                  alt={item.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ padding: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
                  <div>{item.title}</div>
                </div>
              )}
            </div>
            <div style={titleLabelStyle}>{item.title}</div>
          </div>
        ))}
        {musicList.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 60, color: '#64748b' }}>
            暂无乐谱，点击右上角上传按钮添加
          </div>
        )}
      </div>

      {selected && (
        <div style={modalStyle} onClick={() => setSelected(null)} onWheel={handlePinch}>
          <button style={closeBtnStyle} onClick={() => setSelected(null)}>
            ✕
          </button>
          <div
            ref={modalContentRef}
            style={{ display: 'flex', alignItems: 'center', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            {selected.mimeType === 'application/pdf' ? (
              <iframe src={selected.filePath} style={pdfViewerStyle} title={selected.title} />
            ) : (
              <div style={{ marginRight: 40 }}>
                <img
                  src={selected.filePath}
                  alt={selected.title}
                  style={{
                    maxHeight: '85vh',
                    maxWidth: '60%',
                    borderRadius: 12,
                    transform: `scale(${scale})`,
                    transition: 'transform 0.1s ease-out',
                    transformOrigin: 'left center',
                  }}
                />
              </div>
            )}
            <div style={{ color: '#e2e8f0' }}>
              <h2 style={{ fontSize: 22, marginBottom: 12 }}>{selected.title}</h2>
              <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 24 }}>
                格式: {selected.mimeType}
              </p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  style={{
                    padding: '8px 16px',
                    background: '#334155',
                    color: 'white',
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                  onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
                >
                  －
                </button>
                <span style={{ fontSize: 14, width: 60, textAlign: 'center' }}>
                  {Math.round(scale * 100)}%
                </span>
                <button
                  style={{
                    padding: '8px 16px',
                    background: '#334155',
                    color: 'white',
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                  onClick={() => setScale((s) => Math.min(3, s + 0.2))}
                >
                  ＋
                </button>
              </div>
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 16 }}>
                提示: Ctrl + 滚轮可缩放
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{responsiveStyle}</style>
    </div>
  );
}

export default Music;
