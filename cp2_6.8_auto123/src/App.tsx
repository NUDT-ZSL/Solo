import React, { useState, useRef, useCallback, useEffect } from 'react';
import { toPng } from 'html-to-image';
import ColorPalette from './components/ColorPalette';
import ControlPanel from './components/ControlPanel';
import { Color, generatePalette } from './utils/colorMapper';

const App: React.FC = () => {
  const [palette, setPalette] = useState<Color[]>(() => generatePalette(''));
  const [locked, setLocked] = useState<boolean[]>([false, false, false, false, false]);
  const [isLoading, setIsLoading] = useState(false);
  const [pickingIndex, setPickingIndex] = useState<number | null>(null);
  const paletteRef = useRef<HTMLDivElement>(null);

  const handleGenerate = useCallback((text: string) => {
    setIsLoading(true);
    const lockedColors = palette.filter((_, i) => locked[i]);
    const newColors = generatePalette(text, lockedColors);

    setPalette((prev) => {
      const result: Color[] = [];
      let newIdx = 0;
      for (let i = 0; i < 5; i++) {
        if (locked[i]) {
          result.push(prev[i]);
        } else if (newIdx < newColors.length) {
          result.push(newColors[newIdx++]);
        }
      }
      while (result.length < 5) {
        result.push(newColors[result.length] || prev[result.length]);
      }
      return result;
    });

    setTimeout(() => setIsLoading(false), 500);
  }, [palette, locked]);

  const handleToggleLock = useCallback((index: number) => {
    setLocked((prev) => prev.map((v, i) => (i === index ? !v : v)));
  }, []);

  const handlePickColor = useCallback((index: number) => {
    setPickingIndex(index);
  }, []);

  const handleUpdateColor = useCallback((index: number, hex: string) => {
    setPalette((prev) => prev.map((c, i) => (i === index ? { ...c, hex } : c)));
  }, []);

  const handleClosePicker = useCallback(() => {
    setPickingIndex(null);
  }, []);

  const handleExportCSS = useCallback(() => {
    const css = `:root {\n${palette
      .map((c, i) => `  --color-${i + 1}: ${c.hex.toUpperCase()};`)
      .join('\n')}\n}`;
    navigator.clipboard.writeText(css).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = css;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    });
  }, [palette]);

  const handleExportPNG = useCallback(() => {
    if (!paletteRef.current) return;
    toPng(paletteRef.current, {
      backgroundColor: 'transparent',
      pixelRatio: 2,
    })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = 'color-palette.png';
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error('导出PNG失败:', err);
      });
  }, []);

  const lockedCount = locked.filter(Boolean).length;

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: '#F7FAFC',
        padding: '40px 24px 60px',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 48 }}>
          <ControlPanel
            onGenerate={handleGenerate}
            onExportCSS={handleExportCSS}
            onExportPNG={handleExportPNG}
            lockedCount={lockedCount}
            isLoading={isLoading}
          />
        </div>

        <ColorPalette
          palette={palette}
          locked={locked}
          onToggleLock={handleToggleLock}
          onPickColor={handlePickColor}
          paletteRef={paletteRef}
        />
      </div>

      {pickingIndex !== null && (
        <ColorPicker
          color={palette[pickingIndex].hex}
          onClose={handleClosePicker}
          onChange={(hex) => handleUpdateColor(pickingIndex, hex)}
        />
      )}

      <style>{`
        @media (max-width: 1200px) {
          div[data-palette] > div {
            width: 31.33% !important;
          }
          div[data-palette] > div:nth-last-child(-n+2) {
            width: 48% !important;
          }
        }
        @media (max-width: 600px) {
          div[data-palette] > div,
          div[data-palette] > div:nth-last-child(-n+2) {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};

interface ColorPickerProps {
  color: string;
  onChange: (hex: string) => void;
  onClose: () => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange, onClose }) => {
  const [hsv, setHsv] = useState(() => hexToHsv(color));
  const svRef = useRef<HTMLDivElement>(null);
  const hRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'sv' | 'h' | null>(null);

  useEffect(() => {
    setHsv(hexToHsv(color));
  }, [color]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!dragging) return;
      if (dragging === 'sv' && svRef.current) {
        const rect = svRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        const newHsv = { ...hsv, s: x, v: 1 - y };
        setHsv(newHsv);
        onChange(hsvToHex(newHsv.h, newHsv.s, newHsv.v));
      } else if (dragging === 'h' && hRef.current) {
        const rect = hRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const newHsv = { ...hsv, h: x * 360 };
        setHsv(newHsv);
        onChange(hsvToHex(newHsv.h, newHsv.s, newHsv.v));
      }
    };
    const handleUp = () => setDragging(null);
    if (dragging) {
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, hsv, onChange]);

  const hueBackground = `linear-gradient(to right, 
    #FF0000 0%, #FFFF00 16.66%, #00FF00 33.33%, 
    #00FFFF 50%, #0000FF 66.66%, #FF00FF 83.33%, #FF0000 100%)`;

  const preview = hsvToHex(hsv.h, hsv.s, hsv.v);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#00000040',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1A202C',
          borderRadius: 12,
          padding: 20,
          width: 320,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          animation: 'fadeIn 0.2s ease',
        }}
      >
        <div
          ref={svRef}
          onMouseDown={(e) => {
            setDragging('sv');
            const rect = svRef.current!.getBoundingClientRect();
            const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
            const newHsv = { ...hsv, s: x, v: 1 - y };
            setHsv(newHsv);
            onChange(hsvToHex(newHsv.h, newHsv.s, newHsv.v));
          }}
          style={{
            width: '100%',
            height: 200,
            borderRadius: 8,
            background: `linear-gradient(to top, #000, transparent), 
                         linear-gradient(to right, #fff, hsl(${hsv.h}, 100%, 50%))`,
            position: 'relative',
            cursor: 'crosshair',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: `${hsv.s * 100}%`,
              top: `${(1 - hsv.v) * 100}%`,
              width: 14,
              height: 14,
              border: '2px solid #fff',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.5)',
              pointerEvents: 'none',
            }}
          />
        </div>

        <div
          ref={hRef}
          onMouseDown={(e) => {
            setDragging('h');
            const rect = hRef.current!.getBoundingClientRect();
            const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const newHsv = { ...hsv, h: x * 360 };
            setHsv(newHsv);
            onChange(hsvToHex(newHsv.h, newHsv.s, newHsv.v));
          }}
          style={{
            width: '100%',
            height: 12,
            borderRadius: 6,
            background: hueBackground,
            position: 'relative',
            cursor: 'pointer',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: `${(hsv.h / 360) * 100}%`,
              top: '50%',
              width: 14,
              height: 14,
              border: '2px solid #fff',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
              pointerEvents: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              background: preview,
              border: '2px solid rgba(255,255,255,0.2)',
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#A0AEC0', marginBottom: 4 }}>十六进制</div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#fff',
                fontFamily: 'Menlo, Consolas, monospace',
                letterSpacing: 0.5,
                textTransform: 'uppercase',
              }}
            >
              {preview.toUpperCase()}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              background: '#3182CE',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              transition: 'background 0.15s ease, transform 0.1s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#2B6CB0';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#3182CE';
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
};

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const s = max === 0 ? 0 : (max - min) / max;
  const v = max;
  if (max !== min) {
    if (max === r) h = ((g - b) / (max - min) + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / (max - min) + 2) * 60;
    else h = ((r - g) / (max - min) + 4) * 60;
  }
  return { h, s, v };
}

function hsvToHex(h: number, s: number, v: number): string {
  const i = Math.floor(h / 60) % 6;
  const f = h / 60 - Math.floor(h / 60);
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r = 0;
  let g = 0;
  let b = 0;
  switch (i) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export default App;
