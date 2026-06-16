import { useState, useCallback } from 'react';
import type { Region } from './modules/imageProcessor/types';
import { ColorFiller } from './modules/imageProcessor/colorFiller';
import CanvasArea from './modules/ui/CanvasArea';
import ColorPalettePanel from './modules/ui/ColorPalettePanel';

export default function App() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [colorFiller, setColorFiller] = useState<ColorFiller | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activePaletteName, setActivePaletteName] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const handleRegionsChange = useCallback((newRegions: Region[]) => {
    setRegions([...newRegions]);
  }, []);

  const handleSelectedRegionChange = useCallback((region: Region | null) => {
    setSelectedRegion(region);
  }, []);

  const handleImageLoaded = useCallback(() => {
    setIsImageLoaded(true);
  }, []);

  const handleFillerReady = useCallback((filler: ColorFiller | null) => {
    setColorFiller(filler);
  }, []);

  const handleShowToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const handlePaletteApply = useCallback((name: string | null) => {
    setActivePaletteName(name);
  }, []);

  return (
    <div className="app-container">
      <CanvasArea
        onRegionsChange={handleRegionsChange}
        onSelectedRegionChange={handleSelectedRegionChange}
        selectedRegionId={selectedRegion?.id ?? null}
        onImageLoaded={handleImageLoaded}
        isImageLoaded={isImageLoaded}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        onFillerReady={handleFillerReady}
      />
      <ColorPalettePanel
        regions={regions}
        selectedRegion={selectedRegion}
        colorFiller={colorFiller}
        onShowToast={handleShowToast}
        isImageLoaded={isImageLoaded}
        activePaletteName={activePaletteName}
        onPaletteApply={handlePaletteApply}
      />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
