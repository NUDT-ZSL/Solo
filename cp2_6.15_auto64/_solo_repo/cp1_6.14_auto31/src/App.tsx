import React, { useState, useCallback, useEffect } from 'react';
import { Star, Download, Palette } from 'lucide-react';
import ColorWheel from './components/ColorWheel';
import SchemePanel from './components/SchemePanel';
import ColorDetail from './components/ColorDetail';
import FavoritesBar from './components/FavoritesBar';
import ExportModal from './components/ExportModal';
import type { HSL, ColorScheme, FavoriteEntry } from './utils/colorUtils';
import {
  generateAllSchemes,
  hslToHex,
  getContrastColor,
  generateId,
} from './utils/colorUtils';

const STORAGE_KEY = 'colorharmony.favorites';
const DEFAULT_PRIMARY: HSL = { h: 238, s: 78, l: 55 };

const App: React.FC = () => {
  const [primary, setPrimary] = useState<HSL>(DEFAULT_PRIMARY);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setFavorites(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // ignore
    }
  }, [favorites]);

  const schemes: ColorScheme[] = React.useMemo(
    () => generateAllSchemes(primary),
    [primary]
  );

  const handlePrimaryChange = useCallback((hsl: HSL) => {
    setPrimary(hsl);
  }, []);

  const hex = hslToHex(primary);

  const handleToggleFavorite = useCallback(() => {
    if (!favoritesOpen) {
      setFavoritesOpen(true);
      return;
    }
    const entry: FavoriteEntry = {
      id: generateId(),
      timestamp: Date.now(),
      primary: { ...primary },
      schemes: schemes.map((s) => ({
        ...s,
        colors: s.colors.map((c) => ({ ...c })),
      })),
    };
    setFavorites((prev) => [entry, ...prev].slice(0, 50));
  }, [favoritesOpen, primary, schemes]);

  const handleSelectFavorite = useCallback((p: HSL) => {
    setPrimary(p);
  }, []);

  const handleClearFavorites = useCallback(() => {
    if (window.confirm('确定清空所有收藏的配色方案吗？')) {
      setFavorites([]);
    }
  }, []);

  const copyPrimaryHex = useCallback(async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(hex);
      }
    } catch {
      // ignore
    }
  }, [hex]);

  const hasFavoritedCurrent = React.useMemo(() => {
    return favorites.some(
      (f) =>
        f.primary.h === primary.h &&
        f.primary.s === primary.s &&
        f.primary.l === primary.l
    );
  }, [favorites, primary]);

  return (
    <div className="app">
      <FavoritesBar
        isOpen={favoritesOpen}
        favorites={favorites}
        onSelect={handleSelectFavorite}
        onClear={handleClearFavorites}
      />

      <div className="main-content">
        <header className="app-header">
          <div className="app-title">
            <div className="app-title-icon" />
            <span>ColorHarmony</span>
          </div>
          <div className="header-actions">
            <button
              className={`icon-btn ${hasFavoritedCurrent ? 'active' : ''}`}
              onClick={handleToggleFavorite}
              title={favoritesOpen ? '收藏当前方案' : '展开收藏栏'}
              style={
                hasFavoritedCurrent && favoritesOpen
                  ? { background: '#f59e0b', color: '#fff' }
                  : undefined
              }
            >
              <Star
                size={18}
                fill={
                  favoritesOpen ? (hasFavoritedCurrent ? '#fff' : 'none') : 'none'
                }
              />
            </button>
          </div>
        </header>

        <div className="workspace">
          <main className="center-area">
            <section className="color-wheel-section">
              <ColorWheel primary={primary} onChange={handlePrimaryChange} />

              <div className="color-preview-row">
                <div
                  className="color-preview-box"
                  style={{ backgroundColor: hex }}
                  title={hex}
                />
                <Palette size={16} color="#6b7280" />
                <span
                  className="color-preview-hex"
                  onClick={copyPrimaryHex}
                  style={{ color: getContrastColor(hex).includes('111') ? '#f9fafb' : '#c7d2fe' }}
                  title="点击复制色值"
                >
                  {hex}
                </span>
              </div>
            </section>

            <SchemePanel schemes={schemes} primary={primary} />
          </main>

          <ColorDetail primary={primary} onChange={handlePrimaryChange} />
        </div>
      </div>

      <button
        className="export-btn"
        onClick={() => setExportOpen(true)}
        title="导出色板"
      >
        <Download size={16} />
        导出色板
      </button>

      <ExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        primary={primary}
        schemes={schemes}
      />
    </div>
  );
};

export default App;
