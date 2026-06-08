import React, { useMemo } from 'react';
import ColorWheel from './components/ColorWheel';
import ColorPalette from './components/ColorPalette';
import ParticleBackground from './components/ParticleBackground';
import { useColorPalette } from './hooks/useColorPalette';

const App: React.FC = () => {
  const {
    hue,
    setHue,
    mood,
    setMood,
    palette,
    savedPalettes,
    savePalette,
    removePalette,
    copyColor,
    applyPalette,
    toast,
    hslToString,
    hslToHex,
  } = useColorPalette();

  const primaryStr = useMemo(() => hslToString(palette.primary), [palette.primary, hslToString]);
  const accentStr = useMemo(() => hslToString(palette.accent), [palette.accent, hslToString]);

  const gradientBg = useMemo(
    () => `linear-gradient(135deg, ${primaryStr}0d 0%, transparent 50%, ${accentStr}0d 100%)`,
    [primaryStr, accentStr],
  );

  return (
    <div style={styles.root}>
      <ParticleBackground primaryColor={palette.primary} hslToString={hslToString} />
      <div style={{ ...styles.overlay, background: gradientBg }} />

      <div style={styles.content}>
        <header style={styles.header}>
          <h1 style={styles.title}>色彩情绪板</h1>
          <p style={styles.subtitle}>旋转色环 · 选择情绪 · 发现配色灵感</p>
        </header>

        <div style={styles.mainLayout}>
          <div style={styles.wheelSection}>
            <ColorWheel
              hue={hue}
              onHueChange={setHue}
              primaryColor={primaryStr}
            />
          </div>

          <div style={styles.paletteSection}>
            <ColorPalette
              palette={palette}
              mood={mood}
              onMoodChange={setMood}
              onSave={savePalette}
              onCopy={copyColor}
              savedPalettes={savedPalettes}
              onRemove={removePalette}
              onApply={applyPalette}
              hslToString={hslToString}
              hslToHex={hslToHex}
            />
          </div>
        </div>

        <div style={styles.previewBar}>
          <div style={styles.previewLabel}>预览渐变</div>
          <div
            style={{
              ...styles.previewGradient,
              background: `linear-gradient(135deg, ${primaryStr}, ${hslToString(palette.secondary)}, ${accentStr})`,
            }}
          />
        </div>
      </div>

      {toast && (
        <div style={styles.toast}>
          {toast}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'relative',
    width: '100%',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 0,
    transition: 'background 0.6s ease',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: 960,
    padding: '40px 24px 60px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 32,
  },
  header: {
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    color: '#3a3a3a',
    letterSpacing: 2,
    fontFamily: "'Noto Sans SC', sans-serif",
  },
  subtitle: {
    fontSize: 14,
    color: '#aaa',
    fontWeight: 400,
    fontFamily: "'Noto Sans SC', sans-serif",
  },
  mainLayout: {
    display: 'flex',
    gap: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: '100%',
    flexWrap: 'wrap' as const,
  },
  wheelSection: {
    flexShrink: 0,
  },
  paletteSection: {
    flex: '1 1 360px',
    minWidth: 280,
    display: 'flex',
    justifyContent: 'center',
  },
  previewBar: {
    width: '100%',
    maxWidth: 600,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#999',
    letterSpacing: 2,
    fontFamily: "'Noto Sans SC', sans-serif",
  },
  previewGradient: {
    height: 48,
    borderRadius: 14,
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    transition: 'background 0.5s ease',
  },
  toast: {
    position: 'fixed',
    bottom: 32,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '10px 24px',
    borderRadius: 12,
    background: 'rgba(50,50,50,0.88)',
    backdropFilter: 'blur(8px)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 500,
    fontFamily: "'Noto Sans SC', sans-serif",
    zIndex: 999,
    animation: 'toastIn 0.3s ease',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
  },
};

export default App;
