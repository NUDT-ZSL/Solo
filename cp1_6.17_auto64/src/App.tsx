import React, { useState, useEffect, useCallback, useRef } from 'react';
import PortfolioGrid, { Artwork } from './components/PortfolioGrid';
import ColorExtractor from './components/ColorExtractor';
import DropZone, { PresetColorBlock } from './components/DropZone';
import {
  ExtractedColor,
  Theme,
  ThemeAdjustments,
  generateTheme,
  applyThemeToDocument,
  generateThemeFromColor,
} from './themeEngine';

interface SavedTheme {
  id: string;
  colors: ExtractedColor[];
  theme: Theme;
}

const App: React.FC = () => {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [extractedColors, setExtractedColors] = useState<ExtractedColor[]>([]);
  const [currentTheme, setCurrentTheme] = useState<Theme>({
    primary: '#FFB7C5',
    secondary: '#FF69B4',
    accent: '#87CEEB',
    background: '#F9F9F9',
    surface: '#FFFFFF',
    text: '#1A1A1A',
    textSecondary: '#666666',
    border: '#E0E0E0',
    highlight: '#98FB98',
    buttonHover: '#FFD1DC',
  });
  const [adjustments, setAdjustments] = useState<ThemeAdjustments>({
    hueOffset: 0,
    saturation: 100,
    lightness: 100,
  });
  const [savedThemes, setSavedThemes] = useState<SavedTheme[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [currentArtworkTitle, setCurrentArtworkTitle] = useState<string>('春日樱花');
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('portfolio-saved-themes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSavedThemes(parsed);
      } catch (e) {
        console.error('Failed to load saved themes:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (savedThemes.length > 0) {
      localStorage.setItem('portfolio-saved-themes', JSON.stringify(savedThemes));
    }
  }, [savedThemes]);

  useEffect(() => {
    fetchArtworks();
  }, []);

  useEffect(() => {
    applyThemeToDocument(currentTheme);
  }, [currentTheme]);

  const fetchArtworks = async () => {
    try {
      const response = await fetch('/api/artworks');
      const data = await response.json();
      setArtworks(data);
      
      if (data.length > 0 && extractedColors.length === 0) {
        const firstArtwork = data[0];
        const colors: ExtractedColor[] = firstArtwork.colors.map((hex: string) => ({
          hex,
          rgb: { r: 0, g: 0, b: 0 },
        }));
        setExtractedColors(colors);
        const theme = generateTheme(colors, adjustments);
        setCurrentTheme(theme);
        setCurrentArtworkTitle(firstArtwork.title);
      }
    } catch (error) {
      console.error('Failed to fetch artworks:', error);
    }
  };

  const extractColorsFromColors = useCallback(async (
    colors: string[],
    title: string,
    thumbnailColor: string
  ) => {
    setIsExtracting(true);
    
    try {
      const startTime = performance.now();
      
      const response = await fetch('/api/extract-colors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          colors,
          title,
          thumbnailColor,
        }),
      });
      
      const data = await response.json();
      
      const elapsed = performance.now() - startTime;
      console.log(`颜色提取总耗时: ${elapsed.toFixed(2)}ms`);
      
      if (data.colors) {
        setExtractedColors(data.colors);
        
        const newTheme = generateTheme(data.colors, adjustments);
        setCurrentTheme(newTheme);
        
        await fetchArtworks();
      }
    } catch (error) {
      console.error('Failed to extract colors:', error);
    } finally {
      setIsExtracting(false);
    }
  }, [adjustments]);

  const handleArtworkClick = useCallback((artwork: Artwork) => {
    const colors: ExtractedColor[] = artwork.colors.map((hex: string) => ({
      hex,
      rgb: { r: 0, g: 0, b: 0 },
    }));
    setExtractedColors(colors);
    setCurrentArtworkTitle(artwork.title);
    
    const newTheme = generateTheme(colors, adjustments);
    setCurrentTheme(newTheme);
  }, [adjustments]);

  const handleThemeColorClick = useCallback((colorIndex: number) => {
    if (extractedColors.length === 0) return;
    
    const baseColor = extractedColors[colorIndex].hex;
    const newTheme = generateThemeFromColor(baseColor, adjustments);
    setCurrentTheme(newTheme);
  }, [extractedColors, adjustments]);

  const handleAdjustmentsChange = useCallback((newAdjustments: ThemeAdjustments) => {
    setAdjustments(newAdjustments);
    
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    
    rafIdRef.current = requestAnimationFrame(() => {
      const newTheme = generateTheme(extractedColors, newAdjustments);
      setCurrentTheme(newTheme);
    });
  }, [extractedColors]);

  const handleSaveTheme = useCallback(() => {
    if (savedThemes.length >= 6) {
      alert('最多只能保存6个主题');
      return;
    }
    
    if (extractedColors.length === 0) {
      alert('请先选择一个作品提取颜色');
      return;
    }
    
    const newSavedTheme: SavedTheme = {
      id: `theme_${Date.now()}`,
      colors: [...extractedColors],
      theme: { ...currentTheme },
    };
    
    setSavedThemes(prev => [...prev, newSavedTheme]);
  }, [savedThemes.length, extractedColors, currentTheme]);

  const handleSavedThemeClick = useCallback((index: number) => {
    const saved = savedThemes[index];
    if (saved) {
      setExtractedColors(saved.colors);
      setCurrentTheme(saved.theme);
      setAdjustments({ hueOffset: 0, saturation: 100, lightness: 100 });
    }
  }, [savedThemes]);

  const handleDeleteSavedTheme = useCallback((index: number) => {
    setSavedThemes(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleDropUpload = useCallback(async (preset: PresetColorBlock) => {
    await extractColorsFromColors(preset.colors, preset.title, preset.thumbnailColor);
    setCurrentArtworkTitle(preset.title);
  }, [extractColorsFromColors]);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-background)',
        transition: 'background-color 0.3s ease',
      }}
    >
      <header
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '40px 20px 20px',
        }}
      >
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 700,
            fontSize: '48px',
            margin: 0,
            color: 'var(--color-text)',
            transition: 'color 0.3s ease',
          }}
        >
          插画作品集
        </h1>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '16px',
            color: 'var(--color-text-secondary)',
            marginTop: '8px',
            transition: 'color 0.3s ease',
          }}
        >
          点击作品探索主题色彩，沉浸式体验艺术风格
        </p>
      </header>

      <main
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '20px',
          display: 'flex',
          gap: '32px',
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          <DropZone
            onDropUpload={handleDropUpload}
            currentThemePrimary={currentTheme.primary}
            isUploading={isExtracting}
          />
          <PortfolioGrid
            artworks={artworks}
            currentTheme={currentTheme}
            extractedColors={extractedColors}
            onArtworkClick={handleArtworkClick}
          />
        </div>

        <ColorExtractor
          extractedColors={extractedColors}
          currentTheme={currentTheme}
          adjustments={adjustments}
          savedThemes={savedThemes}
          currentArtworkTitle={currentArtworkTitle}
          onThemeColorClick={handleThemeColorClick}
          onAdjustmentsChange={handleAdjustmentsChange}
          onSaveTheme={handleSaveTheme}
          onSavedThemeClick={handleSavedThemeClick}
          onDeleteSavedTheme={handleDeleteSavedTheme}
        />
      </main>

      <footer
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '40px 20px',
          textAlign: 'center',
          fontFamily: "'Inter', sans-serif",
          fontSize: '14px',
          color: 'var(--color-text-secondary)',
        }}
      >
        <p>© 2024 插画作品集 - 主题色自适应渲染引擎</p>
      </footer>
    </div>
  );
};

export default App;
