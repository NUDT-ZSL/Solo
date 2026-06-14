import React, { useState, useEffect, useCallback, useRef } from 'react';
import { eventBus } from './eventBus';
import { hexToHsl } from './colorEngine';

interface SavedPalette {
  id: string;
  name: string;
  colors: string[];
}

interface PaletteManagerProps {
  schemes: Record<string, string[]>;
  onColorCardClick: (hex: string) => void;
  currentHex: string;
}

const STORAGE_KEY = 'colorHarmony_palettes';

function loadPalettes(): SavedPalette[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePalettes(palettes: SavedPalette[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(palettes));
}

const SCHEME_LABELS: Record<string, string> = {
  complementary: '互补',
  analogous: '类似',
  triadic: '三角',
  tetradic: '四角',
};

const PaletteManager: React.FC<PaletteManagerProps> = ({ schemes, onColorCardClick, currentHex }) => {
  const [paletteName, setPaletteName] = useState('');
  const [savedPalettes, setSavedPalettes] = useState<SavedPalette[]>(loadPalettes);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const handleColorCardClick = useCallback((hex: string) => {
    navigator.clipboard.writeText(hex).catch(() => {});
    setCopiedHex(hex);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setCopiedHex(null), 500);
    onColorCardClick(hex);
  }, [onColorCardClick]);

  const handleSave = useCallback(() => {
    if (!paletteName.trim()) return;
    const allColors = Object.values(schemes).flat();
    const uniqueColors = [...new Set(allColors)];
    if (uniqueColors.length === 0) return;
    const newPalette: SavedPalette = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name: paletteName.trim(),
      colors: uniqueColors.slice(0, 20),
    };
    const updated = [newPalette, ...savedPalettes];
    setSavedPalettes(updated);
    savePalettes(updated);
    setPaletteName('');
  }, [paletteName, schemes, savedPalettes]);

  const handleDelete = useCallback((id: string) => {
    const updated = savedPalettes.filter((p) => p.id !== id);
    setSavedPalettes(updated);
    savePalettes(updated);
    setDeleteConfirmId(null);
  }, [savedPalettes]);

  const handleLoad = useCallback((palette: SavedPalette) => {
    eventBus.emit('paletteLoad', { id: palette.id, name: palette.name, colors: palette.colors });
    if (palette.colors.length > 0) {
      onColorCardClick(palette.colors[0]);
    }
  }, [onColorCardClick]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {Object.entries(schemes).map(([key, colors]) => (
        <div key={key}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#555', marginBottom: '8px' }}>
            {SCHEME_LABELS[key] || key}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {colors.map((hex, i) => (
              <div
                key={i}
                onClick={() => handleColorCardClick(hex)}
                style={{
                  width: 80,
                  height: 60,
                  borderRadius: 6,
                  backgroundColor: hex,
                  cursor: 'pointer',
                  border: copiedHex === hex ? '2px solid #2ecc71' : '2px solid transparent',
                  transition: 'border 0.15s ease, transform 0.15s ease',
                  position: 'relative',
                  flexShrink: 0,
                }}
                title={hex}
                onMouseEnter={(e) => { (e.currentTarget.style.transform = 'scale(1.05)'); }}
                onMouseLeave={(e) => { (e.currentTarget.style.transform = 'scale(1)'); }}
              >
                <span
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    left: 0,
                    right: 0,
                    textAlign: 'center',
                    fontSize: '10px',
                    color: '#fff',
                    textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                    fontWeight: 500,
                    userSelect: 'none',
                  }}
                >
                  {hex.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px' }}>
        <input
          type="text"
          value={paletteName}
          onChange={(e) => setPaletteName(e.target.value)}
          placeholder="命名配色方案..."
          style={{
            width: 200,
            height: 36,
            borderRadius: 4,
            border: '1px solid #cccccc',
            padding: '0 12px',
            fontSize: 14,
            outline: 'none',
            transition: 'border 0.2s ease',
            fontFamily: 'inherit',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#6c5ce7'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = '#cccccc'; }}
        />
        <button
          onClick={handleSave}
          style={{
            width: 100,
            height: 36,
            borderRadius: 6,
            border: 'none',
            backgroundColor: '#6c5ce7',
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#a29bfe'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#6c5ce7'; }}
        >
          保存
        </button>
      </div>

      {savedPalettes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#555' }}>已保存的配色方案</div>
          {savedPalettes.map((palette) => (
            <div
              key={palette.id}
              style={{
                position: 'relative',
                width: 280,
                borderRadius: 8,
                backgroundColor: '#f8f9fa',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                padding: '12px 14px',
                cursor: 'pointer',
                transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out',
              }}
              onClick={() => handleLoad(palette)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#333', marginBottom: '8px' }}>
                {palette.name}
              </div>
              <div style={{ display: 'flex', gap: 2 }}>
                {palette.colors.slice(0, 5).map((color, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: 8,
                      backgroundColor: color,
                      borderRadius: i === 0 ? '4px 0 0 4px' : i === palette.colors.slice(0, 5).length - 1 ? '0 4px 4px 0' : 0,
                    }}
                  />
                ))}
              </div>
              {deleteConfirmId === palette.id ? (
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    display: 'flex',
                    gap: 4,
                    alignItems: 'center',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span style={{ fontSize: 11, color: '#666' }}>确认删除?</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(palette.id); }}
                    style={{
                      width: 28,
                      height: 20,
                      borderRadius: 4,
                      border: 'none',
                      backgroundColor: '#e74c3c',
                      color: '#fff',
                      fontSize: 10,
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    是
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                    style={{
                      width: 28,
                      height: 20,
                      borderRadius: 4,
                      border: '1px solid #ccc',
                      backgroundColor: '#fff',
                      color: '#666',
                      fontSize: 10,
                      cursor: 'pointer',
                    }}
                  >
                    否
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(palette.id); }}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: '#e74c3c',
                    color: '#ffffff',
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background-color 0.2s ease',
                    lineHeight: 1,
                    padding: 0,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#c0392b'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#e74c3c'; }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PaletteManager;
