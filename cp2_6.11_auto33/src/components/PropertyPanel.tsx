import React from 'react';
import { X, Minus, Plus, RotateCw } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { FilterType } from '@/types';

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'none', label: '原图' },
  { value: 'vintage', label: '复古' },
  { value: 'faded', label: '褪色' },
  { value: 'warm', label: '暖阳' },
  { value: 'cool', label: '冷蓝' },
  { value: 'mono', label: '单色' },
  { value: 'pencil', label: '素描' },
];

const getFilterPreviewStyle = (filter: FilterType): React.CSSProperties => {
  switch (filter) {
    case 'vintage':
      return { filter: 'sepia(0.3) contrast(0.9)' };
    case 'faded':
      return { filter: 'contrast(0.85) brightness(1.1)' };
    case 'warm':
      return { filter: 'sepia(0.2) saturate(1.2)' };
    case 'cool':
      return { filter: 'hue-rotate(180deg) saturate(0.8)' };
    case 'mono':
      return { filter: 'grayscale(1)' };
    case 'pencil':
      return { filter: 'grayscale(1) contrast(1.2)' };
    default:
      return {};
  }
};

export const PropertyPanel: React.FC = () => {
  const {
    fragments,
    selectedIds,
    propertyPanelOpen,
    setPropertyPanelOpen,
    updateFragment,
  } = useStore();

  if (!propertyPanelOpen || selectedIds.length === 0) return null;

  const firstSelected = fragments.find((f) => f.id === selectedIds[0]);
  if (!firstSelected) return null;

  const handleScaleChange = (delta: number) => {
    selectedIds.forEach((id) => {
      const frag = fragments.find((f) => f.id === id);
      if (frag) {
        const newScale = Math.max(0.5, Math.min(3, frag.scale + delta));
        updateFragment(id, { scale: parseFloat(newScale.toFixed(2)) });
      }
    });
  };

  const handleScaleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newScale = parseFloat(e.target.value);
    selectedIds.forEach((id) => {
      updateFragment(id, { scale: newScale });
    });
  };

  const handleRotate = (delta: number) => {
    selectedIds.forEach((id) => {
      const frag = fragments.find((f) => f.id === id);
      if (frag) {
        const newRot = ((frag.rotation + delta) % 360 + 360) % 360;
        updateFragment(id, { rotation: newRot });
      }
    });
  };

  const handleFilterSelect = (filter: FilterType) => {
    selectedIds.forEach((id) => {
      updateFragment(id, { filter });
    });
  };

  const handleTextChange = (content: string) => {
    selectedIds.forEach((id) => {
      const frag = fragments.find((f) => f.id === id);
      if (frag) {
        updateFragment(id, {
          textOverlay: {
            content,
            fontFamily: frag.textOverlay?.fontFamily || 'serif',
            fontSize: frag.textOverlay?.fontSize || 24,
          },
        });
      }
    });
  };

  const handleFontFamily = (family: 'serif' | 'sans-serif') => {
    selectedIds.forEach((id) => {
      const frag = fragments.find((f) => f.id === id);
      if (frag) {
        updateFragment(id, {
          textOverlay: {
            content: frag.textOverlay?.content || '',
            fontFamily: family,
            fontSize: frag.textOverlay?.fontSize || 24,
          },
        });
      }
    });
  };

  const handleFontSize = (size: number) => {
    selectedIds.forEach((id) => {
      const frag = fragments.find((f) => f.id === id);
      if (frag) {
        updateFragment(id, {
          textOverlay: {
            content: frag.textOverlay?.content || '',
            fontFamily: frag.textOverlay?.fontFamily || 'serif',
            fontSize: Math.max(10, Math.min(48, size)),
          },
        });
      }
    });
  };

  return (
    <div
      className="glass transition-all-smooth"
      style={{
        position: 'fixed',
        right: 24,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 280,
        borderRadius: 16,
        padding: 20,
        boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
        zIndex: 100,
        maxHeight: '80vh',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <h3
          style={{
            fontFamily: "'Playfair Display', 'Noto Serif SC', serif",
            fontSize: 18,
            fontWeight: 700,
            color: '#4A3F35',
          }}
        >
          碎片属性
        </h3>
        <button
          onClick={() => setPropertyPanelOpen(false)}
          className="toolbar-icon hover-lift"
          style={{ padding: 4, borderRadius: 6 }}
        >
          <X size={18} />
        </button>
      </div>

      {selectedIds.length > 1 && (
        <div
          style={{
            color: '#6B5B4F',
            fontSize: 13,
            textAlign: 'center',
            padding: '12px 16px',
            background: 'rgba(212, 139, 96, 0.08)',
            borderRadius: 10,
            marginBottom: 16,
            border: '1px solid rgba(212, 139, 96, 0.15)',
          }}
        >
          已选择 <strong style={{ color: '#D48B60' }}>{selectedIds.length}</strong> 个碎片
          <br />
          可统一调整缩放和旋转
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <label style={{ fontSize: 13, fontWeight: 600, color: '#4A3F35' }}>缩放</label>
          <span style={{ fontSize: 13, color: '#6B5B4F', fontFamily: 'monospace' }}>
            {firstSelected.scale.toFixed(1)}x
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => handleScaleChange(-0.1)}
            className="hover-lift toolbar-icon"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid rgba(74,63,53,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.5)',
            }}
          >
            <Minus size={14} />
          </button>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={firstSelected.scale}
            onChange={handleScaleSlider}
            style={{ flex: 1 }}
          />
          <button
            onClick={() => handleScaleChange(0.1)}
            className="hover-lift toolbar-icon"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid rgba(74,63,53,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.5)',
            }}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#4A3F35',
            display: 'block',
            marginBottom: 10,
          }}
        >
          旋转 ({firstSelected.rotation}°)
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[-45, -15, 15, 45].map((deg) => (
            <button
              key={deg}
              onClick={() => handleRotate(deg)}
              className="hover-lift"
              style={{
                flex: 1,
                padding: '8px 4px',
                borderRadius: 8,
                border: '1px solid rgba(74,63,53,0.2)',
                background: 'rgba(255,255,255,0.5)',
                fontSize: 12,
                fontWeight: 500,
                color: '#4A3F35',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <RotateCw
                size={12}
                style={{ transform: deg < 0 ? 'scaleX(-1)' : undefined }}
              />
              {deg > 0 ? '+' : ''}
              {deg}°
            </button>
          ))}
        </div>
      </div>

      {selectedIds.length === 1 && (
        <>
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#4A3F35',
                display: 'block',
                marginBottom: 10,
              }}
            >
              滤镜效果
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleFilterSelect(opt.value)}
                  className="hover-lift"
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                    border:
                      firstSelected.filter === opt.value
                        ? '1px solid #D48B60'
                        : '1px solid rgba(74,63,53,0.15)',
                    background:
                      firstSelected.filter === opt.value
                        ? 'rgba(212, 139, 96, 0.15)'
                        : 'rgba(255,255,255,0.5)',
                    color: firstSelected.filter === opt.value ? '#D48B60' : '#4A3F35',
                    transition: 'all 0.3s ease-in-out',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      background:
                        'linear-gradient(135deg, #E8DDD0 0%, #D48B60 50%, #4A3F35 100%)',
                      ...getFilterPreviewStyle(opt.value),
                    }}
                  />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#4A3F35',
                display: 'block',
                marginBottom: 10,
              }}
            >
              叠加文字
            </label>
            <textarea
              value={firstSelected.textOverlay?.content || ''}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="输入要叠加的文字..."
              rows={2}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 8,
                border: '1px solid rgba(74,63,53,0.2)',
                background: 'rgba(255,255,255,0.6)',
                fontSize: 13,
                fontFamily: 'inherit',
                color: '#4A3F35',
                outline: 'none',
                resize: 'none',
                transition: 'border-color 0.3s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#D48B60')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(74,63,53,0.2)')}
            />
            {firstSelected.textOverlay?.content && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <select
                  value={firstSelected.textOverlay.fontFamily}
                  onChange={(e) => handleFontFamily(e.target.value as 'serif' | 'sans-serif')}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: 6,
                    border: '1px solid rgba(74,63,53,0.2)',
                    background: 'rgba(255,255,255,0.6)',
                    fontSize: 12,
                    color: '#4A3F35',
                    outline: 'none',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  <option value="serif">衬线体</option>
                  <option value="sans-serif">无衬线</option>
                </select>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="number"
                    min={10}
                    max={48}
                    value={firstSelected.textOverlay.fontSize}
                    onChange={(e) => handleFontSize(parseInt(e.target.value) || 24)}
                    style={{
                      width: 56,
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: '1px solid rgba(74,63,53,0.2)',
                      background: 'rgba(255,255,255,0.6)',
                      fontSize: 12,
                      color: '#4A3F35',
                      outline: 'none',
                      fontFamily: 'monospace',
                    }}
                  />
                  <span style={{ fontSize: 12, color: '#6B5B4F' }}>px</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {selectedIds.length === 1 && firstSelected.filter !== 'none' && (
        <div
          style={{
            fontSize: 11,
            color: '#8B7D6F',
            fontStyle: 'italic',
            textAlign: 'center',
            padding: '8px 12px',
            background: 'rgba(74,63,53,0.04)',
            borderRadius: 8,
            marginTop: 8,
          }}
        >
          滤镜效果通过 Canvas 像素处理实时应用
        </div>
      )}
    </div>
  );
};
