import React from 'react';
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Images,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { renderCollageToImage } from '@/utils/collageEngine';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import type { GalleryItem } from '@/types';

export const Toolbar: React.FC = () => {
  const navigate = useNavigate();
  const {
    fragments,
    sourceImage,
    currentStyle,
    renderProgress,
    selectedIds,
    updateFragment,
    addGalleryItem,
  } = useStore();

  const handleExport = async () => {
    if (!sourceImage || fragments.length === 0) return;

    const dataUrl = renderCollageToImage(fragments, sourceImage, currentStyle, 1920, 1080);

    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 440;
    thumbCanvas.height = 320;
    const tctx = thumbCanvas.getContext('2d')!;

    const tmpImg = new Image();
    tmpImg.onload = async () => {
      tctx.drawImage(tmpImg, 0, 0, 440, 320);
      const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.8);

      const item: GalleryItem = {
        id: uuidv4(),
        title: `拼贴作品 ${new Date().toLocaleDateString('zh-CN')}`,
        style: currentStyle,
        thumbnail,
        dataUrl,
        createdAt: Date.now(),
      };

      try {
        await fetch('/api/gallery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
      } catch {
        /* silently ignore network errors */
      }

      addGalleryItem(item);

      const link = document.createElement('a');
      link.download = `imprint-workshop-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    };
    tmpImg.src = dataUrl;
  };

  const handleRotateSelection = (deg: number) => {
    selectedIds.forEach((id) => {
      const frag = fragments.find((f) => f.id === id);
      if (frag) {
        updateFragment(id, {
          rotation: ((frag.rotation + deg) % 360 + 360) % 360,
        });
      }
    });
  };

  const handleScaleSelection = (delta: number) => {
    selectedIds.forEach((id) => {
      const frag = fragments.find((f) => f.id === id);
      if (frag) {
        const newScale = Math.max(0.5, Math.min(3, frag.scale + delta));
        updateFragment(id, { scale: parseFloat(newScale.toFixed(2)) });
      }
    });
  };

  const canInteract = sourceImage && fragments.length > 0;
  const hasSelection = selectedIds.length > 0;

  return (
    <div
      className="glass"
      style={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '8px 12px',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        zIndex: 60,
        minWidth: 520,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingRight: 12,
          marginRight: 4,
          borderRight: '1px solid rgba(74,63,53,0.12)',
        }}
      >
        <span
          style={{
            fontFamily: "'Playfair Display', 'Noto Serif SC', serif",
            fontSize: 17,
            fontWeight: 700,
            color: '#4A3F35',
            letterSpacing: 0.5,
          }}
        >
          印记工坊
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <button
          className="toolbar-icon hover-lift"
          title="撤销"
          disabled={!canInteract}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: canInteract ? 1 : 0.35,
            cursor: canInteract ? 'pointer' : 'not-allowed',
          }}
        >
          <Undo2 size={17} />
        </button>
        <button
          className="toolbar-icon hover-lift"
          title="重做"
          disabled={!canInteract}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: canInteract ? 1 : 0.35,
            cursor: canInteract ? 'pointer' : 'not-allowed',
          }}
        >
          <Redo2 size={17} />
        </button>
      </div>

      <div
        style={{
          width: 1,
          height: 20,
          background: 'rgba(74,63,53,0.12)',
          margin: '0 4px',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <button
          className="toolbar-icon hover-lift"
          title="缩小选中"
          disabled={!hasSelection}
          onClick={() => handleScaleSelection(-0.1)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: hasSelection ? 1 : 0.35,
            cursor: hasSelection ? 'pointer' : 'not-allowed',
          }}
        >
          <ZoomOut size={17} />
        </button>
        <button
          className="toolbar-icon hover-lift"
          title="放大选中"
          disabled={!hasSelection}
          onClick={() => handleScaleSelection(0.1)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: hasSelection ? 1 : 0.35,
            cursor: hasSelection ? 'pointer' : 'not-allowed',
          }}
        >
          <ZoomIn size={17} />
        </button>
        <button
          className="toolbar-icon hover-lift"
          title="重置旋转"
          disabled={!hasSelection}
          onClick={() =>
            selectedIds.forEach((id) => updateFragment(id, { rotation: 0 }))
          }
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: hasSelection ? 1 : 0.35,
            cursor: hasSelection ? 'pointer' : 'not-allowed',
          }}
        >
          <RotateCcw size={17} />
        </button>
        <button
          className="toolbar-icon hover-lift"
          title="左旋15°"
          disabled={!hasSelection}
          onClick={() => handleRotateSelection(-15)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: hasSelection ? 1 : 0.35,
            cursor: hasSelection ? 'pointer' : 'not-allowed',
          }}
        >
          <RotateCcw size={17} style={{ transform: 'scaleX(-1)' }} />
        </button>
      </div>

      <div
        style={{
          width: 1,
          height: 20,
          background: 'rgba(74,63,53,0.12)',
          margin: '0 4px',
        }}
      />

      <button
        className="toolbar-icon hover-lift"
        title="我的画廊"
        onClick={() => navigate('/gallery')}
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Images size={17} />
      </button>

      <div style={{ flex: 1 }} />

      {renderProgress > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 12 }}>
          <div className="progress-bar" style={{ width: 80 }}>
            <div className="progress-fill" style={{ width: `${renderProgress}%` }} />
          </div>
          <span style={{ fontSize: 11, color: '#6B5B4F', fontFamily: 'monospace' }}>
            {renderProgress}%
          </span>
        </div>
      )}

      <button
        className="btn-export"
        onClick={handleExport}
        disabled={!canInteract}
        style={{
          opacity: canInteract ? 1 : 0.5,
          cursor: canInteract ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 14,
        }}
      >
        <Download size={15} />
        导出
      </button>
    </div>
  );
};
