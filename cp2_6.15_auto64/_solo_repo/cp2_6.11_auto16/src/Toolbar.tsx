import { useRef, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useCanvasStore } from './store';
import { TextElement, FONT_FAMILIES, COLOR_PALETTE, CollageElement } from './types';

interface ToolbarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Toolbar({ mobileOpen, onCloseMobile }: ToolbarProps) {
  const {
    uploadedImages, addUploadedImage, addElement, clearAll,
    elements, bgColor, selectedId, updateElement,
  } = useCanvasStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedElement = elements.find((el) => el.id === selectedId);
  const isTextSelected = selectedElement?.type === 'text';

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '上传失败');
      }

      addUploadedImage({
        id: data.id,
        url: data.url,
        name: data.name,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [addUploadedImage]);

  const handleThumbnailDragStart = useCallback((e: React.DragEvent, url: string) => {
    e.dataTransfer.setData('application/collage-image', JSON.stringify({ src: url }));
    e.dataTransfer.effectAllowed = 'copy';
    onCloseMobile();
  }, [onCloseMobile]);

  const handleAddText = useCallback(() => {
    const state = useCanvasStore.getState();
    const viewport = document.querySelector('.canvas-viewport');
    const rect = viewport?.getBoundingClientRect();
    const centerX = rect ? (rect.width / 2 - state.panX) / state.zoom - 100 : 100;
    const centerY = rect ? (rect.height / 2 - state.panY) / state.zoom - 20 : 100;

    const newText: TextElement = {
      id: uuidv4(),
      type: 'text',
      x: centerX,
      y: centerY,
      width: 200,
      height: 48,
      rotation: 0,
      zIndex: state.elements.length,
      content: '双击编辑',
      fontFamily: 'Playfair Display, serif',
      fontSize: 32,
      color: '#3D3D3D',
    };

    addElement(newText);
    useCanvasStore.getState().setSelectedId(newText.id);
    onCloseMobile();
  }, [addElement, onCloseMobile]);

  const handleClear = useCallback(() => {
    if (elements.length === 0) return;
    if (confirm('确定要清空画布吗？')) {
      clearAll();
    }
    onCloseMobile();
  }, [elements.length, clearAll, onCloseMobile]);

  const handleExport = useCallback(async () => {
    const state = useCanvasStore.getState();
    const exportWidth = 1920;
    const exportHeight = 1080;

    const canvas = document.createElement('canvas');
    canvas.width = exportWidth;
    canvas.height = exportHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, exportWidth, exportHeight);

    const scaleX = exportWidth / 1920;
    const scaleY = exportHeight / 1080;
    const baseScale = Math.min(scaleX, scaleY) * 1;
    const offsetX = (exportWidth - 1920 * baseScale) / 2;
    const offsetY = (exportHeight - 1080 * baseScale) / 2;

    const sortedElements = [...state.elements].sort((a, b) => a.zIndex - b.zIndex);

    for (const el of sortedElements) {
      ctx.save();

      const cx = offsetX + (el.x + el.width / 2) * baseScale;
      const cy = offsetY + (el.y + el.height / 2) * baseScale;
      ctx.translate(cx, cy);
      ctx.rotate((el.rotation || 0) * (Math.PI / 180));
      ctx.translate(-(el.width * baseScale) / 2, -(el.height * baseScale) / 2);

      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 4 * baseScale;
      ctx.shadowOffsetX = 2 * baseScale;
      ctx.shadowOffsetY = 2 * baseScale;

      if (el.type === 'image') {
        const imgEl = el as { src: string };
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              ctx.drawImage(img, 0, 0, el.width * baseScale, el.height * baseScale);
            } catch { /* ignore */ }
            resolve();
          };
          img.onerror = () => resolve();
          img.src = imgEl.src;
        });
      } else if (el.type === 'text') {
        const textEl = el as TextElement;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 4 * baseScale;
        ctx.shadowOffsetX = 2 * baseScale;
        ctx.shadowOffsetY = 2 * baseScale;
        ctx.fillStyle = textEl.color;
        ctx.font = `${textEl.fontSize * baseScale}px ${textEl.fontFamily}`;
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';

        const lines = textEl.content.split('\n');
        const lineHeight = textEl.fontSize * 1.3 * baseScale;
        lines.forEach((line, i) => {
          ctx.fillText(line, 0, i * lineHeight);
        });
      }

      ctx.restore();
    }

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `灵感拼贴_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');

    onCloseMobile();
  }, [bgColor, onCloseMobile]);

  const handleFontChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    if (selectedId && isTextSelected) {
      updateElement(selectedId, { fontFamily: e.target.value });
    }
  }, [selectedId, isTextSelected, updateElement]);

  const handleFontSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedId && isTextSelected) {
      const size = Math.max(12, Math.min(72, parseInt(e.target.value) || 12));
      updateElement(selectedId, { fontSize: size });
    }
  }, [selectedId, isTextSelected, updateElement]);

  const handleColorChange = useCallback((color: string) => {
    if (selectedId && isTextSelected) {
      updateElement(selectedId, { color });
    }
  }, [selectedId, isTextSelected, updateElement]);

  return (
    <div
      className={`toolbar-container ${mobileOpen ? 'open' : ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 20px',
        background: '#E8DDD3',
        borderBottom: '1px solid #D1C7B8',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        borderRadius: '0 0 12px 12px',
        zIndex: 50,
        flexWrap: 'wrap',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginRight: '8px',
        }}
      >
        <span
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#3D3D3D',
            fontFamily: 'Playfair Display, serif',
          }}
        >
          ✨ 灵感拼贴板
        </span>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button className="toolbar-btn" onClick={handleUploadClick} disabled={uploading}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          {uploading ? '上传中...' : '上传图片'}
        </button>

        <button className="toolbar-btn" onClick={handleAddText}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7V4h16v3" />
            <path d="M9 20h6" />
            <path d="M12 4v16" />
          </svg>
          添加文字
        </button>

        <button className="toolbar-btn" onClick={handleClear}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
            <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
          清空
        </button>

        <button
          className="toolbar-btn"
          onClick={handleExport}
          style={{ background: '#FF6B6B', color: '#fff' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          导出 PNG
        </button>
      </div>

      {error && (
        <span style={{ color: '#FF6B6B', fontSize: '12px' }}>{error}</span>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/svg+xml"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {uploadedImages.length > 0 && (
        <div
          className="thumbnail-strip"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginLeft: 'auto',
            paddingLeft: '12px',
            borderLeft: '1px solid #D1C7B8',
            maxWidth: '50%',
            overflowX: 'auto',
          }}
        >
          <span style={{ fontSize: '12px', color: '#3D3D3D', flexShrink: 0 }}>
            拖拽到画布:
          </span>
          {uploadedImages.map((img) => (
            <div
              key={img.id}
              className="thumbnail-item"
              draggable
              onDragStart={(e) => handleThumbnailDragStart(e, img.url)}
              title={img.name}
            >
              <img src={img.url} alt={img.name} />
            </div>
          ))}
        </div>
      )}

      {isTextSelected && selectedElement && (
        <div
          className="text-props-panel"
          style={{
            width: '100%',
            marginTop: '4px',
            justifyContent: 'center',
            padding: '8px',
            background: 'rgba(255,255,255,0.4)',
          }}
        >
          <span style={{ fontWeight: 600, marginRight: '4px' }}>文字设置:</span>

          <select
            value={(selectedElement as TextElement).fontFamily}
            onChange={handleFontChange}
            style={{ minWidth: '120px' }}
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.name}
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>大小:</span>
            <input
              type="number"
              min={12}
              max={72}
              value={(selectedElement as TextElement).fontSize}
              onChange={handleFontSizeChange}
              style={{ width: '56px' }}
            />
            <span style={{ fontSize: '10px' }}>px</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>颜色:</span>
            <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', maxWidth: '180px' }}>
              {COLOR_PALETTE.map((color) => (
                <div
                  key={color}
                  className={`color-swatch ${(selectedElement as TextElement).color === color ? 'active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorChange(color)}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
