import React, { useState, useRef, useCallback, useEffect } from 'react';
import CanvasView from './components/CanvasView';
import ResultPanel from './components/ResultPanel';
import DetailPopup from './components/DetailPopup';
import HistoryPanel from './components/HistoryPanel';
import { type CSSRegion } from './modules/imageAnalyzer';
import { saveRecord, generateRecordId, type HistoryRecord } from './modules/historyManager';

const App: React.FC = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string>('');
  const [regions, setRegions] = useState<CSSRegion[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<CSSRegion | null>(null);
  const [selectedRegionPos, setSelectedRegionPos] = useState<{ x: number; y: number } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastSavedRef = useRef<number>(0);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const generateThumbnail = useCallback((dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, 64, 64);
          const scale = Math.min(64 / img.width, 64 / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          ctx.drawImage(img, (64 - w) / 2, (64 - h) / 2, w, h);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }, []);

  const autoSaveHistory = useCallback(async (dataUrl: string, detectedRegions: CSSRegion[]) => {
    if (!dataUrl || detectedRegions.length === 0) return;
    const now = Date.now();
    if (now - lastSavedRef.current < 5000) return;
    lastSavedRef.current = now;

    try {
      const thumbnail = await generateThumbnail(dataUrl);
      const record: HistoryRecord = {
        id: generateRecordId(),
        timestamp: now,
        thumbnail,
        imageDataUrl: dataUrl,
        regions: detectedRegions,
        regionCount: detectedRegions.length,
      };
      await saveRecord(record);
    } catch (e) {
      console.error('Save history failed:', e);
    }
  }, [generateThumbnail]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorMsg('图片大小不能超过 2MB');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('仅支持 PNG 和 JPG 格式');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        setImageSrc(dataUrl);
        setSelectedRegion(null);
        setSelectedRegionPos(null);
      }
    };
    reader.onerror = () => {
      setErrorMsg('图片读取失败');
      setTimeout(() => setErrorMsg(''), 3000);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleImageLoaded = useCallback((dataUrl: string) => {
    setImageDataUrl(dataUrl);
  }, []);

  const handleRegionsDetected = useCallback((detected: CSSRegion[]) => {
    setRegions(detected);
    if (detected.length > 0 && imageDataUrl) {
      autoSaveHistory(imageDataUrl, detected);
    }
  }, [imageDataUrl, autoSaveHistory]);

  const handleRegionClick = useCallback((region: CSSRegion, pos: { x: number; y: number }) => {
    setSelectedRegion(region);
    setSelectedRegionPos(pos);
  }, []);

  const handleClosePopup = useCallback(() => {
    setSelectedRegion(null);
    setSelectedRegionPos(null);
  }, []);

  const handleRestoreRecord = useCallback((record: HistoryRecord) => {
    setImageSrc(record.imageDataUrl);
    setImageDataUrl(record.imageDataUrl);
    setRegions(record.regions);
    setSelectedRegion(null);
    setSelectedRegionPos(null);
    lastSavedRef.current = Date.now();

    if ((window as any).__cssnapperRestoreCanvas) {
      setTimeout(() => {
        (window as any).__cssnapperRestoreCanvas(record.imageDataUrl, record.regions);
      }, 50);
    }
  }, []);

  const handleSelectRegionFromPanel = useCallback((region: CSSRegion) => {
    setSelectedRegion(region);
  }, []);

  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(''), 3000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  return (
    <div style={appStyle}>
      <nav style={navStyle}>
        <div style={logoStyle}>CSSnapper</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={handleUploadClick}
            className="action-btn"
            style={primaryBtnStyle}
          >
            📷 导入截图
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className="action-btn"
            style={secondaryBtnStyle}
          >
            📋 历史记录
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </nav>

      <div style={mainStyle}>
        <div style={canvasWrapStyle}>
          <CanvasView
            imageSrc={imageSrc}
            onImageLoaded={handleImageLoaded}
            onRegionsDetected={handleRegionsDetected}
            onRegionClick={handleRegionClick}
            selectedRegionId={selectedRegion?.id || null}
          />
        </div>
        <div style={panelGapStyle} />
        <div style={panelContainerStyle}>
          <ResultPanel
            regions={regions}
            selectedRegion={selectedRegion}
            onSelectRegion={handleSelectRegionFromPanel}
          />
        </div>
      </div>

      <DetailPopup
        region={selectedRegion}
        position={selectedRegionPos}
        onClose={handleClosePopup}
      />

      <HistoryPanel
        visible={showHistory}
        onClose={() => setShowHistory(false)}
        onRestore={handleRestoreRecord}
      />

      {errorMsg && (
        <div style={errorStyle}>
          {errorMsg}
        </div>
      )}
    </div>
  );
};

const appStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--color-bg-primary)',
};

const navStyle: React.CSSProperties = {
  height: 'var(--nav-height)',
  flexShrink: 0,
  background: 'var(--color-bg-secondary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 24px',
  boxShadow: 'var(--shadow-md)',
  zIndex: 100,
  borderBottom: '1px solid var(--color-border)',
};

const logoStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  letterSpacing: 0.5,
};

const btnBase: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: 'var(--radius-sm)',
  border: 'none',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const primaryBtnStyle: React.CSSProperties = {
  ...btnBase,
  background: 'var(--color-accent-blue)',
  color: '#fff',
  transition: 'all var(--transition-base)',
};

const secondaryBtnStyle: React.CSSProperties = {
  ...btnBase,
  background: 'var(--color-bg-tertiary)',
  color: 'var(--color-text-primary)',
  transition: 'all var(--transition-base)',
};

const mainStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  minHeight: 0,
  padding: '12px 0 12px 12px',
  gap: 0,
};

const canvasWrapStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  background: 'var(--color-bg-primary)',
  borderRadius: 'var(--radius-lg)',
  overflow: 'hidden',
  boxShadow: 'var(--shadow-md)',
};

const panelGapStyle: React.CSSProperties = {
  width: 'var(--panel-gap)',
  flexShrink: 0,
};

const panelContainerStyle: React.CSSProperties = {
  width: 'var(--panel-width)',
  height: '100%',
  marginRight: 'var(--panel-gap)',
  borderRadius: 'var(--radius-lg)',
  overflow: 'hidden',
  flexShrink: 0,
  boxShadow: 'var(--shadow-md)',
};

const errorStyle: React.CSSProperties = {
  position: 'fixed',
  top: 84,
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'var(--color-accent-red)',
  color: '#fff',
  padding: '10px 20px',
  borderRadius: 'var(--radius-sm)',
  fontSize: 14,
  boxShadow: 'var(--shadow-md)',
  zIndex: 2000,
  animation: 'popupIn var(--transition-slow)',
};

export default App;
