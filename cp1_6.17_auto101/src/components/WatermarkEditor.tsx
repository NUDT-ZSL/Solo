import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface WatermarkParams {
  text: string;
  fontSize: number;
  color: string;
  opacity: number;
  angle: number;
}

interface WatermarkEditorProps {
  imageFile: File | null;
  onParamsChange: (params: WatermarkParams) => void;
}

const DEFAULT_PARAMS: WatermarkParams = {
  text: '版权归作者所有',
  fontSize: 18,
  color: '#999999',
  opacity: 0.33,
  angle: 30,
};

export default function WatermarkEditor({ imageFile, onParamsChange }: WatermarkEditorProps) {
  const [params, setParams] = useState<WatermarkParams>(DEFAULT_PARAMS);
  const [originalUrl, setOriginalUrl] = useState<string>('');
  const [watermarkedUrl, setWatermarkedUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setOriginalUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setOriginalUrl('');
      setWatermarkedUrl('');
    }
  }, [imageFile]);

  const renderWatermark = useCallback(() => {
    if (!originalUrl || !canvasRef.current) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current!;
      const maxW = 800;
      const maxH = 800;
      let w = img.width;
      let h = img.height;

      if (w > maxW) { h = (maxW / w) * h; w = maxW; }
      if (h > maxH) { w = (maxH / h) * w; h = maxH; }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#F5F5F5';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      ctx.save();
      ctx.font = `italic ${params.fontSize}px sans-serif`;
      ctx.fillStyle = params.color;
      ctx.globalAlpha = params.opacity;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const spacingX = params.fontSize * 8;
      const spacingY = params.fontSize * 5;
      const cols = Math.ceil(w / spacingX) + 2;
      const rows = Math.ceil(h / spacingY) + 2;

      for (let row = -1; row < rows; row++) {
        for (let col = -1; col < cols; col++) {
          const x = col * spacingX + spacingX / 2;
          const y = row * spacingY + spacingY / 2;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate((params.angle * Math.PI) / 180);
          ctx.fillText(params.text, 0, 0);
          ctx.restore();
        }
      }
      ctx.restore();

      const dataUrl = canvas.toDataURL('image/png');
      setWatermarkedUrl(dataUrl);
    };
    img.src = originalUrl;
  }, [originalUrl, params]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(renderWatermark, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [renderWatermark]);

  useEffect(() => {
    onParamsChange(params);
  }, [params, onParamsChange]);

  const updateParam = <K extends keyof WatermarkParams>(key: K, value: WatermarkParams[K]) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      <div className="preview-container">
        {originalUrl && (
          <>
            <div>
              <p style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>原图缩略图</p>
              <img
                src={originalUrl}
                alt="原图"
                className="preview-original"
                style={{ maxWidth: 300, maxHeight: 300, objectFit: 'contain' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>水印预览</p>
              {watermarkedUrl && (
                <img
                  src={watermarkedUrl}
                  alt="水印预览"
                  className="preview-watermarked"
                  style={{ maxWidth: '100%', maxHeight: 800, objectFit: 'contain' }}
                />
              )}
            </div>
          </>
        )}
      </div>

      <div className="watermark-editor">
        <h3>水印编辑器</h3>
        <div className="watermark-controls">
          <div className="full-width">
            <label>水印文字</label>
            <input
              type="text"
              value={params.text}
              onChange={(e) => updateParam('text', e.target.value)}
            />
          </div>
          <div>
            <label>字号 ({params.fontSize}px)</label>
            <input
              type="number"
              min={12}
              max={24}
              value={params.fontSize}
              onChange={(e) => updateParam('fontSize', Math.max(12, Math.min(24, parseInt(e.target.value) || 12)))}
            />
          </div>
          <div>
            <label>颜色</label>
            <div className="color-input-group">
              <input
                type="color"
                value={params.color}
                onChange={(e) => updateParam('color', e.target.value)}
              />
              <input
                type="text"
                value={params.color}
                onChange={(e) => updateParam('color', e.target.value)}
                placeholder="#999999"
              />
            </div>
          </div>
          <div className="full-width">
            <label>旋转角度 ({params.angle}°)</label>
            <input
              type="range"
              min={0}
              max={45}
              value={params.angle}
              onChange={(e) => updateParam('angle', parseInt(e.target.value))}
            />
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
