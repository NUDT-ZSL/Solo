import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadImage } from '../api';

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

export default function Upload() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [title, setTitle] = useState('');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string>('');

  const handleFileSelect = (selectedFile: File) => {
    setError('');
    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setError('只支持 JPG 和 PNG 格式的图片');
      return;
    }
    if (selectedFile.size > MAX_SIZE) {
      setError('文件大小不能超过 5MB');
      return;
    }
    setFile(selectedFile);
    if (!title) {
      const nameWithoutExt = selectedFile.name.replace(/\.[^.]+$/, '');
      setTitle(nameWithoutExt);
    }
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFileSelect(selectedFile);
  };

  const handleClick = () => {
    if (!uploading) fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || uploading) return;
    if (!title.trim()) {
      setError('请输入作品标题');
      return;
    }
    try {
      setUploading(true);
      setProgress(0);
      setError('');
      const result = await uploadImage(file, title.trim(), (p) => {
        setProgress(p);
      });
      setProgress(100);
      setAnalyzing(true);
      await new Promise((r) => setTimeout(r, 800));
      navigate(`/detail/${result.id}`, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || '上传失败');
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const uploadingOrAnalyzing = uploading || analyzing;

  return (
    <div className="upload-page">
      <h1 className="upload-title glow-text">上传作品</h1>
      <p className="upload-subtitle">将你的AI灵感加入流光画廊，自动生成灵感关联网络</p>

      <div
        className={`upload-area ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {preview && <img src={preview} alt="" className="upload-preview" />}
        <div className="upload-content" style={{ opacity: file && preview ? 1 : 1 }}>
          {!preview ? (
            <>
              <div className="upload-big-icon">📤</div>
              <div className="upload-hint">
                {dragging ? '松开鼠标上传图片' : '点击选择，或拖拽图片到此处'}
              </div>
              <div className="upload-formats">支持 JPG / PNG，最大 5MB</div>
            </>
          ) : (
            <div style={{
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(6px)',
              padding: '14px 22px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.12)',
              cursor: 'pointer'
            }}>
              <div style={{ fontWeight: 600, color: '#fff', marginBottom: 4 }}>
                ✔ 已选择图片
              </div>
              <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                {(file!.size / 1024 / 1024).toFixed(2)} MB · 点击更换
              </div>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="upload-input"
          onChange={handleInputChange}
        />
      </div>

      {(progress > 0 || analyzing) && (
        <div className="progress-section glass-card" style={{ padding: 20 }}>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: analyzing ? '100%' : `${progress}%`
              }}
            />
          </div>
          <div className="progress-info">
            <span>
              {analyzing ? (
                <span className="analyzing-text">
                  <span className="loading-spinner" />
                  正在计算色彩特征与构图相似度...
                </span>
              ) : (
                `上传中...`
              )}
            </span>
            <span>{analyzing ? '分析特征' : `${progress}%`}</span>
          </div>
        </div>
      )}

      {error && (
        <div style={{
          marginTop: 20,
          padding: '14px 20px',
          borderRadius: 12,
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          color: '#fca5a5',
          fontSize: 14,
          maxWidth: 640,
          width: '100%'
        }}>
          ⚠ {error}
        </div>
      )}

      <form className="upload-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">作品标题</label>
          <input
            type="text"
            className="form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="为你的AI灵感起一个名字..."
            disabled={uploadingOrAnalyzing}
            maxLength={50}
          />
        </div>
        <button
          type="submit"
          className="submit-btn"
          disabled={!file || uploadingOrAnalyzing || !title.trim()}
        >
          {uploadingOrAnalyzing ? (
            <>
              <span className="loading-spinner" />
              {analyzing ? '分析中...' : '上传中...'}
            </>
          ) : (
            <>
              <span>✨</span>
              上传并生成灵感网络
            </>
          )}
        </button>
      </form>
    </div>
  );
}
