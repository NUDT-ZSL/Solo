
import { useState, useRef, useEffect, useCallback } from 'react';
import { createDefaultScents, getTotalScentsValue } from './types';
import type { ScentCard, ScentItem } from './types';

interface CreatePageProps {
  onCreated: (card: ScentCard) => void;
  onCancel: () => void;
  showToast: (msg: string) => void;
}

function CreatePage({ onCreated, onCancel, showToast }: CreatePageProps) {
  const [description, setDescription] = useState('');
  const [imageData, setImageData] = useState<string | undefined>(undefined);
  const [scents, setScents] = useState<ScentItem[]>(createDefaultScents());
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

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

    const total = getTotalScentsValue(scents);

    if (total === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#E8E0D8';
      ctx.fill();
      return;
    }

    let startAngle = -Math.PI / 2;

    scents.forEach(scent => {
      if (scent.value <= 0) return;
      const sliceAngle = (scent.value / total) * Math.PI * 2;
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
  }, [scents]);

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

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleSliderChange = (key: string, value: number) => {
    setScents(prev =>
      prev.map(s => (s.key === key ? { ...s, value: Math.round(value) } : s))
    );
  };

  const handleSubmit = async () => {
    if (submitting) return;

    if (!description.trim()) {
      showToast('请填写气味描述文字');
      return;
    }
    if (getTotalScentsValue(scents) === 0) {
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
          scents
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
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {imageData ? (
                <div className="image-preview-wrapper">
                  <img src={imageData} alt="preview" />
                </div>
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
              {scents.map(scent => (
                <div key={scent.key} className="slider-item">
                  <span className="slider-label">
                    <span className="slider-color-dot" style={{ backgroundColor: scent.color }} />
                    {scent.name}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={scent.value}
                    onChange={e => handleSliderChange(scent.key, Number(e.target.value))}
                    style={{
                      color: scent.color,
                      background: `linear-gradient(to right, ${scent.color} ${scent.value}%, #E8E0D8 ${scent.value}%)`
                    }}
                  />
                  <span className="slider-value" style={{ color: scent.color }}>
                    {scent.value}
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
              {getTotalScentsValue(scents)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreatePage;
