import React, { useState, useCallback, useRef, useEffect } from 'react';
import UploadZone from './components/UploadZone';
import CollageGrid from './components/CollageGrid';
import ControlBar from './components/ControlBar';
import { loadImage, splitIntoGrid, getImagePreview } from './features/imageProcessor';
import { matchAllCells, artworks, getRandomArtwork } from './features/styleMatcher';
import { exportHighRes, downloadBlob } from './features/collageRenderer';
import type { StyleMatchResult } from './features/styleMatcher';
import { Palette } from 'lucide-react';

function App() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [gridSize, setGridSize] = useState<number>(8);
  const [matchResults, setMatchResults] = useState<StyleMatchResult[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const processingRef = useRef(false);

  const processImage = useCallback(async (img: HTMLImageElement, size: number) => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      const cells = splitIntoGrid(img, size);
      const results = matchAllCells(cells);
      setMatchResults(results);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1500);
    } finally {
      processingRef.current = false;
    }
  }, []);

  const handleImageUpload = useCallback(async (file: File) => {
    try {
      const img = await loadImage(file);
      const preview = getImagePreview(img, 400, 300);
      setImageUrl(preview);
      setOriginalImage(img);
      processImage(img, gridSize);
    } catch (error) {
      console.error('图片加载失败:', error);
      alert('图片加载失败，请重试');
    }
  }, [gridSize, processImage]);

  const handleGridSizeChange = useCallback((size: number) => {
    if (size === gridSize || !originalImage) return;
    setGridSize(size);
    processImage(originalImage, size);
  }, [gridSize, originalImage, processImage]);

  const handleCellStyleChange = useCallback((cellIndex: number, artworkId: number) => {
    setMatchResults(prev => {
      const newResults = [...prev];
      const artwork = artworks.find(a => a.id === artworkId);
      if (artwork) {
        const currentScore = newResults[cellIndex].matchScore;
        const scoreChange = (Math.random() * 10 - 5);
        const newScore = Math.max(50, Math.min(98, currentScore + scoreChange));
        
        newResults[cellIndex] = {
          ...newResults[cellIndex],
          artworkId: artwork.id,
          artworkName: artwork.name,
          artwork: artwork,
          matchScore: Math.round(newScore * 10) / 10,
        };
      }
      return newResults;
    });
  }, []);

  const handleRandomize = useCallback(() => {
    setMatchResults(prev => {
      return prev.map(result => {
        const randomArtwork = getRandomArtwork();
        const randomScore = 60 + Math.random() * 35;
        return {
          ...result,
          artworkId: randomArtwork.id,
          artworkName: randomArtwork.name,
          artwork: randomArtwork,
          matchScore: Math.round(randomScore * 10) / 10,
        };
      });
    });
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 1500);
  }, []);

  const handleExport = useCallback(async () => {
    if (!matchResults.length || isExporting) return;
    
    setIsExporting(true);
    try {
      const blob = await exportHighRes(matchResults, gridSize, 2048);
      const timestamp = Date.now();
      downloadBlob(blob, `art-collage-${timestamp}.png`);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  }, [matchResults, gridSize, isExporting]);

  const hasImage = !!originalImage && matchResults.length > 0;

  return (
    <div style={styles.app}>
      <style>{`
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }
        .header {
          height: 64px;
          background: #16213e;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-bottom: 1px solid #2a3a5c;
        }
        .header-title {
          font-size: 24px;
          font-weight: 300;
          color: #ffffff;
          display: flex;
          align-items: center;
          gap: 12px;
          letter-spacing: 2px;
        }
        .display-section {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 40px;
          padding: 32px;
          min-height: 0;
        }
        .frame {
          width: 45%;
          aspect-ratio: 1 / 1;
          max-height: calc(100vh - 64px - 80px - 64px);
          border: 1px solid #6b7280;
          border-radius: 8px;
          background: #0f172a;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .frame-label {
          position: absolute;
          top: 12px;
          left: 12px;
          font-size: 12px;
          color: #9ca3af;
          background: rgba(15, 23, 42, 0.8);
          padding: 4px 10px;
          border-radius: 6px;
          backdrop-filter: blur(4px);
          z-index: 10;
        }
        .original-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .empty-state {
          color: #6b7280;
          font-size: 14px;
          text-align: center;
          padding: 20px;
        }
        @media (max-width: 768px) {
          .header {
            height: 48px !important;
          }
          .header-title {
            font-size: 18px !important;
          }
          .display-section {
            flex-direction: column !important;
            gap: 16px !important;
            padding: 16px !important;
          }
          .frame {
            width: 95% !important;
            max-height: none !important;
          }
        }
      `}</style>

      <header className="header">
        <div className="header-title">
          <Palette size={28} color="#8b5cf6" />
          <span>艺术风格拼贴墙</span>
        </div>
      </header>

      <div className="main-content">
        {!hasImage && (
          <div style={styles.uploadSection}>
            <UploadZone imageUrl={imageUrl} onImageUpload={handleImageUpload} />
          </div>
        )}

        {hasImage && (
          <div className="display-section">
            <div className="frame">
              <div className="frame-label">原图</div>
              {originalImage && (
                <img
                  src={imageUrl || ''}
                  alt="原图"
                  className="original-image"
                />
              )}
            </div>

            <div className="frame">
              <div className="frame-label">拼贴作品</div>
              {matchResults.length > 0 && (
                <CollageGrid
                  results={matchResults}
                  gridSize={gridSize}
                  isAnimating={isAnimating}
                  onCellStyleChange={handleCellStyleChange}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <ControlBar
        gridSize={gridSize}
        onGridSizeChange={handleGridSizeChange}
        onRandomize={handleRandomize}
        onExport={handleExport}
        hasImage={hasImage}
        isExporting={isExporting}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#1a1a2e',
    overflow: 'hidden',
  },
  uploadSection: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default App;
