
import { useState, useRef, useEffect, useCallback } from 'react';
import { BASE_SCENTS } from './types';
import type { ScentCard, ScentRatio } from './types';

interface CreatePageProps {
  onCreated: (card: ScentCard) => void;
  onCancel: () => void;
  showToast: (msg: string) => void;
}

const DEFAULT_RATIOS: ScentRatio = {
  rose: 0,
  sandalwood: 0,
  seaSalt: 0,
  pine: 0,
  incense: 0
};

function getTotalRatio(r: ScentRatio) {
  return r.rose + r.sandalwood + r.seaSalt + r.pine + r.incense;
}

function CreatePage({ onCreated, onCancel, showToast }: CreatePageProps) {
  const [description, setDescription] = useState('');
  const [imageData, setImageData] = useState<string | undefined>(undefined);
  const [ratios, setRatios] = useState<ScentRatio>({ ...DEFAULT_RATIOS });
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const drawPalette = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(cx, cy) - 2;

    ctx.clearRect(0, 0, w, h);

    const total = getTotalRatio(ratios);

    if (total === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#E8E0D8';
      ctx.fill();
      return;
    }

    let startAngle = -Math.PI / 2;

    BASE_SCENTS.forEach(scent => {
      const val = ratios[scent.key];
      if (val <= 0) return;
      const sliceAngle = (val / total) * Math.PI * 2;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = scent.color;
      ctx.fill();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.stroke();

      startAngle = endAngle;
    });
  }, [ratios]);

  useEffect(() => {
    drawPalette();
  }, [drawPalette]);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('请上传图片文件');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        setImageData(result);
      }
    };
    reader.readAsDataURL(file);
  }, [showToast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleSliderChange = (key: keyof ScentRatio, value: number) => {
    setRatios(prev => ({ ...prev, [key]: Math.round(value) }));
  };

  const handleSubmit = async () => {
    if (submitting) return;

    if (!description.trim()) {
      showToast('请填写气味描述文字');
      return;
    }
    if (getTotalRatio(ratios) === 0) {
      showToast('请至少调整一个气味比例');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          imageData,
          scentRatios: ratios
        })
      });
      const data = await res.json();
      if (data.success) {
        onCreated(data.data);
      } else {
        showToast(data.error || '创建失败');
      }
    } catch (e) {
      showToast('网络错误，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-page">
      <header className="page-header">
        <h1>创建气味卡片</h1>
        <button className="btn btn-secondary" onClick={onCancel}>
          返回
        </button>
      </header>

      <div className="create-layout">
        <div className="create-form">
          <div className="form-group">
            <label>气味描述（最多200字）</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, 200))}
              placeholder="描述一下这种气味带给你的感受、记忆或想象..."
              rows={5}
            />
            <span className="char-count">{description.length}/200</span>
          </div>

          <div className="form-group">
            <label>氛围图片（可选）</label>
            <div
              className={`upload-area ${isDragging ? 'dragging' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              {imageData ? (
                <img src={imageData} alt="preview" className="image-preview" />
              ) : (
                <>
                  <div style={{ fontSize: 32, color: '#D4A574' }}>📷</div>
                  <p>点击或拖拽图片到此处上传</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
            {imageData && (
              <button
                className="btn btn-secondary"
                style={{ alignSelf: 'flex-start', padding: '6px 14px', fontSize: 12 }}
                onClick={() => setImageData(undefined)}
              >
                移除图片
              </button>
            )}
          </div>

          <div className="form-group">
            <label>气味调色盘</label>
            <div className="slider-group">
              {BASE_SCENTS.map(scent => (
                <div key={scent.key} className="slider-item">
                  <span className="slider-label">
                    <span className="slider-color-dot" style={{ backgroundColor: scent.color }} />
                    {scent.name}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={ratios[scent.key]}
                    onChange={e => handleSliderChange(scent.key, Number(e.target.value))}
                    style={{
                      color: scent.color,
                      background: `linear-gradient(to right, ${scent.color} ${ratios[scent.key]}%, #E8E0D8 ${ratios[scent.key]}%)`
                    }}
                  />
                  <span className="slider-value" style={{ color: scent.color }}>
                    {ratios[scent.key]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            className="btn"
            onClick={handleSubmit}
            disabled={submitting}
            style={{ alignSelf: 'flex-start', padding: '12px 32px', fontSize: 15 }}
          >
            {submitting ? '创建中...' : '创建卡片'}
          </button>
        </div>

        <div className="preview-section">
          <div style={{ fontSize: 14, fontWeight: 500, color: '#3E2723' }}>实时预览</div>
          <div className="palette-canvas-wrapper">
            <canvas ref={canvasRef} width={120} height={120} />
          </div>
          <div style={{ fontSize: 12, color: 'rgba(62,39,35,0.6)', textAlign: 'center' }}>
            当前气味比例总和<br />
            <span style={{ fontSize: 20, fontWeight: 600, color: '#D4A574' }}>
              {getTotalRatio(ratios)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreatePage;
