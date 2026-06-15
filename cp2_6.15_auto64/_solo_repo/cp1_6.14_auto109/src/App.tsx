import React, { useState, useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import WheelComponent from './wheelComponent';
import PaletteManager from './paletteManager';
import { eventBus } from './eventBus';
import { generateAllSchemes, hslToHex, hexToHsl } from './colorEngine';

const App: React.FC = () => {
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(0.8);
  const [lightness, setLightness] = useState(0.5);
  const [schemes, setSchemes] = useState<Record<string, string[]>>(() =>
    generateAllSchemes(0, 0.8, 0.5)
  );
  const [showHelp, setShowHelp] = useState(false);

  const currentHex = hslToHex(hue, saturation, lightness);

  const updateFromColor = useCallback((h: number, s: number, l: number, hex: string) => {
    setHue(h);
    setSaturation(s);
    setLightness(l);
    setSchemes(generateAllSchemes(h, s, l));
  }, []);

  const handleColorCardClick = useCallback((hex: string) => {
    const [h, s, l] = hexToHsl(hex);
    setHue(h);
    setSaturation(s);
    setLightness(l);
    setSchemes(generateAllSchemes(h, s, l));
  }, []);

  useEffect(() => {
    const unsub = eventBus.on('colorSelected', (data) => {
      const d = data as { hue: number; saturation: number; lightness: number; hex: string };
      setHue(d.hue);
      setSaturation(d.saturation);
      setLightness(d.lightness);
      setSchemes(generateAllSchemes(d.hue, d.saturation, d.lightness));
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = eventBus.on('paletteLoad', (data) => {
      const d = data as { colors: string[] };
      if (d.colors && d.colors.length > 0) {
        const [h, s, l] = hexToHsl(d.colors[0]);
        setHue(h);
        setSaturation(s);
        setLightness(l);
        setSchemes(generateAllSchemes(h, s, l));
      }
    });
    return unsub;
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
      }}
    >
      <nav
        style={{
          height: 56,
          backgroundColor: '#2d3436',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 20, fontFamily: 'Georgia, serif', color: '#ffffff', fontWeight: 700 }}>
          ColorHarmony
        </span>
        <button
          onClick={() => setShowHelp(!showHelp)}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: '#636e72',
            border: 'none',
            color: '#fff',
            fontSize: 18,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#b2bec3'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#636e72'; }}
        >
          ?
        </button>
      </nav>

      {showHelp && (
        <div
          style={{
            backgroundColor: '#2d3436',
            color: '#dfe6e9',
            padding: '12px 24px',
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          点击或拖拽色轮选取颜色，自动生成4种配色方案。点击颜色卡片复制十六进制值并设为主色。为方案命名后点击保存，可随时加载已保存的方案。
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div
          style={{
            flex: 1,
            backgroundColor: '#f0f0f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 30,
            overflow: 'auto',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <WheelComponent
              hue={hue}
              saturation={saturation}
              lightness={lightness}
              onColorChange={updateFromColor}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  backgroundColor: currentHex,
                  border: '2px solid #ddd',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              />
              <div style={{ fontSize: 16, fontWeight: 600, color: '#333', fontFamily: 'monospace' }}>
                {currentHex.toUpperCase()}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 200 }}>
              <label style={{ fontSize: 12, color: '#666', fontWeight: 500 }}>
                明度: {Math.round(lightness * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(lightness * 100)}
                onChange={(e) => {
                  const l = parseInt(e.target.value) / 100;
                  setLightness(l);
                  setSchemes(generateAllSchemes(hue, saturation, l));
                }}
                style={{ width: '100%', accentColor: '#6c5ce7' }}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            width: 400,
            backgroundColor: '#ffffff',
            padding: 24,
            overflowY: 'auto',
            borderLeft: '1px solid #eee',
          }}
        >
          <PaletteManager
            schemes={schemes}
            onColorCardClick={handleColorCardClick}
            currentHex={currentHex}
          />
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
