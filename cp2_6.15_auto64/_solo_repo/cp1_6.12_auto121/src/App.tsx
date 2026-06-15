import { useState, useCallback, useEffect, useRef } from 'react';
import type { GradientConfig, SavedPalette, HistoryItem } from './types';
import { DEFAULT_GRADIENT } from './constants/colors';
import { generateId, isGradientEqual } from './utils/gradient';
import GradientPreview from './components/GradientPreview';
import ColorPickerPanel from './components/ColorPickerPanel';
import ColorPalette from './components/ColorPalette';

const STORAGE_KEY = 'colorflow_palettes';

const App = () => {
  const [gradient, setGradient] = useState<GradientConfig>(DEFAULT_GRADIENT);
  const [palettes, setPalettes] = useState<SavedPalette[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const lastGradientRef = useRef<GradientConfig | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setPalettes(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load palettes:', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(palettes));
  }, [palettes]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const last = lastGradientRef.current;
      if (!last || !isGradientEqual(last, gradient)) {
        const historyItem: HistoryItem = {
          ...gradient,
          id: generateId(),
          timestamp: Date.now(),
        };
        setHistory(prev => {
          const filtered = prev.filter(h => !isGradientEqual(h, gradient));
          const updated = [historyItem, ...filtered];
          return updated.slice(0, 10);
        });
        lastGradientRef.current = { ...gradient };
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [gradient]);

  const isFavorited = palettes.some(p => isGradientEqual(p, gradient));

  const handleGradientChange = useCallback((updates: Partial<GradientConfig>) => {
    setGradient(prev => ({ ...prev, ...updates }));
  }, []);

  const handleToggleFavorite = useCallback(() => {
    if (isFavorited) {
      setPalettes(prev => prev.filter(p => !isGradientEqual(p, gradient)));
    } else {
      const newPalette: SavedPalette = {
        ...gradient,
        id: generateId(),
        createdAt: Date.now(),
      };
      setPalettes(prev => [newPalette, ...prev]);
    }
  }, [gradient, isFavorited]);

  const handleDeletePalette = useCallback((id: string) => {
    setPalettes(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleApplyPalette = useCallback((config: GradientConfig) => {
    setGradient(config);
  }, []);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.title}>ColorFlow</h1>
        <p style={styles.subtitle}>渐变背景实时生成与调色板保存</p>
      </header>

      <main style={styles.main} className="app-main">
        <div style={styles.leftSection} className="left-section">
          <GradientPreview
            gradient={gradient}
            isFavorited={isFavorited}
            onToggleFavorite={handleToggleFavorite}
          />
          <ColorPickerPanel
            gradient={gradient}
            onChange={handleGradientChange}
          />
        </div>

        <div style={styles.sidebar} className="sidebar-section">
          <ColorPalette
            palettes={palettes}
            history={history}
            onApply={handleApplyPalette}
            onDelete={handleDeletePalette}
            onClearHistory={handleClearHistory}
          />
        </div>
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#1a1a2e',
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  title: {
    fontSize: '36px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: '8px',
  },
  subtitle: {
    color: '#888',
    fontSize: '14px',
  },
  main: {
    display: 'flex',
    gap: '20px',
    alignItems: 'flex-start',
  },
  leftSection: {
    flex: '0 0 70%',
    width: '70%',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  sidebar: {
    flex: '0 0 300px',
    width: '300px',
  },
};

export default App;
