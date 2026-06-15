import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { io, Socket } from 'socket.io-client';
import MemorySphere from './MemorySphere';

export interface PhotoData {
  id: string;
  imageData: string;
  originalImage: string;
  dominantColor: string;
  lat: number;
  lng: number;
  position: { x: number; y: number; z: number };
  title: string;
  description: string;
}

interface PendingPhoto {
  id: string;
  originalImage: string;
  imageData: string;
  dominantColor: string;
  title: string;
  description: string;
}

const API_BASE = 'http://localhost:3001';

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function processImage(file: File): Promise<PendingPhoto> {
  const reader = new FileReader();
  const originalData = await new Promise<string>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await loadImage(originalData);

  const circularCanvas = document.createElement('canvas');
  const DIAMETER = 100;
  circularCanvas.width = DIAMETER;
  circularCanvas.height = DIAMETER;
  const ctx = circularCanvas.getContext('2d')!;
  ctx.clearRect(0, 0, DIAMETER, DIAMETER);
  ctx.save();
  ctx.beginPath();
  ctx.arc(DIAMETER / 2, DIAMETER / 2, DIAMETER / 2, 0, Math.PI * 2);
  ctx.clip();
  const minDim = Math.min(img.width, img.height);
  const sx = (img.width - minDim) / 2;
  const sy = (img.height - minDim) / 2;
  ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, DIAMETER, DIAMETER);
  ctx.restore();
  const imageData = circularCanvas.toDataURL('image/png');

  const sampleCanvas = document.createElement('canvas');
  const SAMPLE_SIZE = 100;
  sampleCanvas.width = SAMPLE_SIZE;
  sampleCanvas.height = SAMPLE_SIZE;
  const sctx = sampleCanvas.getContext('2d')!;
  const cxS = (img.width - SAMPLE_SIZE) / 2;
  const cyS = (img.height - SAMPLE_SIZE) / 2;
  if (cxS > 0 && cyS > 0) {
    sctx.drawImage(img, cxS, cyS, SAMPLE_SIZE, SAMPLE_SIZE, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  } else {
    sctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  }
  const pixelData = sctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
  let r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i < pixelData.length; i += 4) {
    r += pixelData[i];
    g += pixelData[i + 1];
    b += pixelData[i + 2];
    count++;
  }
  r = Math.round(r / count);
  g = Math.round(g / count);
  b = Math.round(b / count);
  const dominantColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

  return {
    id: `pending-${Date.now()}-${Math.random()}`,
    originalImage: originalData,
    imageData,
    dominantColor,
    title: '',
    description: '',
  };
}

const App: React.FC = () => {
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null);
  const [showUploadPanel, setShowUploadPanel] = useState(true);
  const [showPendingEditor, setShowPendingEditor] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/photos`)
      .then(r => r.json())
      .then(d => setPhotos(d.photos || []))
      .catch(e => console.error('Fetch error:', e));

    const socket = io(API_BASE, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('photos:updated', (data: { photos: PhotoData[] }) => setPhotos(data.photos || []));
    socket.on('photo:added', () => {});
    socket.on('photo:clicked', (data: { photoId: string }) => {
      const p = photos.find(x => x.id === data.photoId);
      if (p) setSelectedPhoto(p);
    });
    return () => { socket.disconnect(); };
  }, []);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    const maxSize = 8 * 1024 * 1024;
    const errors: string[] = [];
    const validFiles: File[] = [];

    for (const f of fileArr) {
      if (!validTypes.includes(f.type)) errors.push(`${f.name}: 不支持的格式`);
      else if (f.size > maxSize) errors.push(`${f.name}: 文件超过8MB`);
      else validFiles.push(f);
    }

    if (errors.length) setErrorMsg(errors.join('\n'));
    if (!validFiles.length) return;

    const allowed = 15 - photos.length - pendingPhotos.length;
    if (allowed <= 0) {
      setErrorMsg('最多只能上传15张照片');
      return;
    }
    const toProcess = validFiles.slice(0, allowed);

    setIsLoading(true);
    setLoadingProgress(0);
    try {
      const pending: PendingPhoto[] = [];
      for (let i = 0; i < toProcess.length; i++) {
        const p = await processImage(toProcess[i]);
        pending.push(p);
        setLoadingProgress(Math.round(((i + 1) / toProcess.length) * 100));
      }
      setPendingPhotos(prev => [...prev, ...pending]);
      setShowPendingEditor(true);
    } catch (e) {
      console.error(e);
      setErrorMsg('图片处理失败');
    } finally {
      setIsLoading(false);
      setLoadingProgress(0);
    }
  }, [photos.length, pendingPhotos.length]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  const submitPending = async () => {
    if (!pendingPhotos.length) {
      setShowPendingEditor(false);
      return;
    }
    setIsLoading(true);
    try {
      for (let i = 0; i < pendingPhotos.length; i++) {
        const p = pendingPhotos[i];
        const response = await fetch(`${API_BASE}/api/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageData: p.imageData,
            originalImage: p.originalImage,
            dominantColor: p.dominantColor,
            title: p.title || `照片 ${photos.length + i + 1}`,
            description: p.description,
          }),
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Upload failed');
        }
      }
      setPendingPhotos([]);
      setShowPendingEditor(false);
    } catch (e: any) {
      setErrorMsg(e.message || '上传失败');
    } finally {
      setIsLoading(false);
    }
  };

  const updatePending = (id: string, field: 'title' | 'description', value: string) => {
    setPendingPhotos(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removePending = (id: string) => {
    setPendingPhotos(prev => prev.filter(p => p.id !== id));
  };

  const deletePhoto = async (id: string) => {
    await fetch(`${API_BASE}/api/photos/${id}`, { method: 'DELETE' });
    if (selectedPhoto?.id === id) setSelectedPhoto(null);
  };

  const clearAll = async () => {
    await fetch(`${API_BASE}/api/photos`, { method: 'DELETE' });
    setSelectedPhoto(null);
  };

  const canUpload = photos.length + pendingPhotos.length < 15;

  return (
    <div style={styles.container}>
      <div style={styles.canvasWrapper}>
        <Canvas
          camera={{ position: [0, 0, 10], fov: 60 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: 'transparent' }}
        >
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <MemorySphere
            photos={photos}
            onPhotoClick={(p) => {
              setSelectedPhoto(p);
              socketRef.current?.emit('photo:click', { photoId: p.id });
            }}
            selectedPhotoId={selectedPhoto?.id || null}
          />
        </Canvas>
      </div>

      <div style={styles.header}>
        <h1 style={styles.title}>✦ 记忆星球 ✦</h1>
        <p style={styles.subtitle}>共 {photos.length}/15 张记忆</p>
      </div>

      <div style={{ ...styles.uploadToggle, transform: showUploadPanel ? 'rotate(45deg)' : 'rotate(0deg)' }}
        onClick={() => { if (canUpload) setShowUploadPanel(!showUploadPanel); }}>
        {showUploadPanel ? '×' : '+'}
      </div>

      {showUploadPanel && canUpload && (
        <div style={styles.uploadPanel}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={onDrop}
        >
          <div style={{
            ...styles.dropZone,
            borderColor: isDragOver ? '#7c5cff' : 'rgba(255,255,255,0.2)',
            background: isDragOver ? 'rgba(124, 92, 255, 0.15)' : 'rgba(255,255,255,0.03)',
            transform: isDragOver ? 'scale(1.02)' : 'scale(1)',
            transition: 'all 0.3s ease-out',
          }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={styles.dropIcon}>⬆</div>
            <div style={styles.dropText}>点击或拖拽照片到此处上传</div>
            <div style={styles.dropHint}>支持 JPG/PNG，单张最大 8MB，最多 15 张</div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          {errorMsg && (
            <div style={styles.errorMsg} onClick={() => setErrorMsg('')}>{errorMsg}</div>
          )}
          {photos.length > 0 && (
            <button style={styles.clearBtn} onClick={clearAll}>清空所有照片</button>
          )}
        </div>
      )}

      {showPendingEditor && (
        <div style={styles.modalOverlay} onClick={() => !isLoading && setShowPendingEditor(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>为记忆添加标题和描述</h2>
            <div style={styles.pendingList}>
              {pendingPhotos.map((p, idx) => (
                <div key={p.id} style={styles.pendingItem}>
                  <img src={p.imageData} style={{
                    width: 80, height: 80, borderRadius: '50%',
                    border: `3px solid ${p.dominantColor}`,
                    boxShadow: `0 0 20px ${p.dominantColor}50`,
                  }} />
                  <div style={{ flex: 1 }}>
                    <input
                      style={styles.pendingInput}
                      placeholder={`照片 ${idx + 1} 的标题`}
                      value={p.title}
                      onChange={e => updatePending(p.id, 'title', e.target.value)}
                    />
                    <textarea
                      style={{ ...styles.pendingInput, minHeight: 60, resize: 'vertical' }}
                      placeholder="描述这张照片的故事..."
                      value={p.description}
                      onChange={e => updatePending(p.id, 'description', e.target.value)}
                    />
                  </div>
                  <button style={styles.removeBtn} onClick={() => removePending(p.id)}>×</button>
                </div>
              ))}
            </div>
            <div style={styles.modalActions}>
              <button style={{ ...styles.btn, ...styles.btnSecondary }}
                onClick={() => setShowPendingEditor(false)} disabled={isLoading}>
                取消
              </button>
              <button style={{ ...styles.btn, ...styles.btnPrimary }}
                onClick={submitPending} disabled={isLoading || !pendingPhotos.length}>
                {isLoading ? '上传中...' : `确认上传 ${pendingPhotos.length} 张`}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingSpinner}>
            <div style={styles.spinnerRing}></div>
          </div>
          <div style={styles.loadingText}>加载中 {loadingProgress}%</div>
        </div>
      )}

      {selectedPhoto && (
        <div style={styles.modalOverlay} onClick={() => setSelectedPhoto(null)}>
          <div style={{ ...styles.detailCard, borderColor: selectedPhoto.dominantColor }}
            onClick={e => e.stopPropagation()}>
            <button style={styles.closeBtn} onClick={() => setSelectedPhoto(null)}>×</button>
            <div style={{
              ...styles.detailImageWrapper,
              boxShadow: `0 0 60px ${selectedPhoto.dominantColor}80`,
            }}>
              <img src={selectedPhoto.originalImage} style={styles.detailImage} />
            </div>
            <h3 style={styles.detailTitle}>{selectedPhoto.title}</h3>
            <p style={styles.detailDesc}>{selectedPhoto.description || '暂无描述'}</p>
            <div style={styles.detailMeta}>
              <span>📍 {selectedPhoto.lat.toFixed(1)}°, {selectedPhoto.lng.toFixed(1)}°</span>
              <span style={{ color: selectedPhoto.dominantColor }}>● 主色调 {selectedPhoto.dominantColor}</span>
            </div>
            <button style={{ ...styles.btn, width: '100%' }}
              onClick={() => deletePhoto(selectedPhoto.id)}>
              删除这张记忆
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    inset: 0,
    overflow: 'hidden',
    minWidth: 380,
  },
  canvasWrapper: {
    position: 'absolute',
    inset: 0,
  },
  header: {
    position: 'absolute',
    top: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    textAlign: 'center',
    pointerEvents: 'none',
    zIndex: 10,
  },
  title: {
    fontSize: 'clamp(20px, 4vw, 32px)',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #a78bfa, #f472b6, #60a5fa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: 2,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 'clamp(12px, 2vw, 14px)',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
  },
  uploadToggle: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'rgba(124, 92, 255, 0.3)',
    border: '1px solid rgba(124, 92, 255, 0.5)',
    color: '#fff',
    fontSize: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease-out',
    backdropFilter: 'blur(10px)',
    zIndex: 20,
  },
  uploadPanel: {
    position: 'absolute',
    top: 80,
    right: 20,
    width: 'min(320px, calc(100vw - 40px))',
    zIndex: 15,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  dropZone: {
    padding: '28px 20px',
    border: '2px dashed rgba(255,255,255,0.2)',
    borderRadius: 16,
    background: 'rgba(255,255,255,0.03)',
    textAlign: 'center',
    cursor: 'pointer',
    backdropFilter: 'blur(20px)',
  },
  dropIcon: {
    fontSize: 40,
    color: '#a78bfa',
    marginBottom: 8,
  },
  dropText: {
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    marginBottom: 4,
  },
  dropHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  errorMsg: {
    padding: 10,
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    borderRadius: 8,
    fontSize: 12,
    color: '#fca5a5',
    whiteSpace: 'pre-wrap',
    cursor: 'pointer',
  },
  clearBtn: {
    padding: '8px 16px',
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    color: '#fca5a5',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.3s ease-out',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(10, 14, 39, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    padding: 20,
  },
  modal: {
    width: 'min(560px, 100%)',
    maxHeight: '85vh',
    background: 'linear-gradient(145deg, rgba(30, 30, 70, 0.95), rgba(20, 20, 50, 0.95))',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 24,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: '#fff',
  },
  pendingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  pendingItem: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
    padding: 12,
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  pendingInput: {
    width: '100%',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: '#fff',
    fontSize: 13,
    marginBottom: 6,
    outline: 'none',
    fontFamily: 'inherit',
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'rgba(239, 68, 68, 0.2)',
    border: 'none',
    color: '#fca5a5',
    fontSize: 20,
    cursor: 'pointer',
  },
  modalActions: {
    display: 'flex',
    gap: 12,
    marginTop: 8,
  },
  btn: {
    padding: '12px 20px',
    borderRadius: 10,
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease-out',
    fontFamily: 'inherit',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #7c5cff, #5b8def)',
    color: '#fff',
    flex: 1,
  },
  btnSecondary: {
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
  },
  loadingOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(10, 14, 39, 0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    zIndex: 100,
  },
  loadingSpinner: {
    width: 64,
    height: 64,
  },
  spinnerRing: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    border: '3px solid transparent',
    borderTopColor: '#7c5cff',
    borderRightColor: '#f472b6',
    borderBottomColor: '#60a5fa',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    letterSpacing: 1,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: '#fff',
    fontSize: 22,
    cursor: 'pointer',
    zIndex: 5,
  },
  detailCard: {
    position: 'relative',
    width: 'min(420px, 100%)',
    background: 'linear-gradient(145deg, rgba(40, 40, 80, 0.95), rgba(25, 25, 60, 0.95))',
    border: '2px solid',
    borderRadius: 20,
    padding: 24,
    textAlign: 'center',
    backdropFilter: 'blur(20px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  detailImageWrapper: {
    width: 300,
    height: 300,
    margin: '0 auto',
    borderRadius: 20,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.3)',
  },
  detailImage: {
    maxWidth: 300,
    maxHeight: 300,
    objectFit: 'contain',
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#fff',
  },
  detailDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 1.6,
  },
  detailMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
::-webkit-scrollbar-thumb { background: rgba(124, 92, 255, 0.4); border-radius: 3px; }
`;
document.head.appendChild(styleSheet);

export default App;
