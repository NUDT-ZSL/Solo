import { useState, useCallback, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import GeometryCanvas from './components/Canvas';
import {
  ShapeType,
  ColorTheme,
  GeometricConfig,
  parseShareDataURI
} from './utils/geometry';

const DEFAULT_CONFIG: GeometricConfig = {
  shapeTypes: ['triangle', 'square', 'hexagon'],
  colorTheme: 'aurora',
  density: 5
};

const App = () => {
  const [config, setConfig] = useState<GeometricConfig>(DEFAULT_CONFIG);
  const [configVersion, setConfigVersion] = useState(0);
  const [exportTrigger, setExportTrigger] = useState(0);
  const [pngDataUrl, setPngDataUrl] = useState<string | null>(null);
  const [shareDataUri, setShareDataUri] = useState<string | null>(null);

  const bumpVersion = useCallback(() => {
    setConfigVersion(v => v + 1);
  }, []);

  const handleShapeTypesChange = useCallback((types: ShapeType[]) => {
    setConfig(prev => ({ ...prev, shapeTypes: types }));
    bumpVersion();
  }, [bumpVersion]);

  const handleThemeChange = useCallback((theme: ColorTheme) => {
    setConfig(prev => ({ ...prev, colorTheme: theme }));
    bumpVersion();
  }, [bumpVersion]);

  const handleDensityChange = useCallback((density: number) => {
    setConfig(prev => ({ ...prev, density }));
    bumpVersion();
  }, [bumpVersion]);

  const handleSave = useCallback(() => {
    setExportTrigger(v => v + 1);
  }, []);

  const handleExportResult = useCallback((data: { pngDataUrl: string; shareDataUri: string }) => {
    setPngDataUrl(data.pngDataUrl);
    setShareDataUri(data.shareDataUri);
  }, []);

  const handleClearLinks = useCallback(() => {
    setPngDataUrl(null);
    setShareDataUri(null);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#s=')) {
      try {
        const encoded = decodeURIComponent(hash.slice(3));
        const parsed = parseShareDataURI(encoded);
        if (parsed) {
          const restoredCfg: GeometricConfig = {
            shapeTypes: (parsed.cfg as GeometricConfig).shapeTypes || DEFAULT_CONFIG.shapeTypes,
            colorTheme: (parsed.cfg as GeometricConfig).colorTheme || DEFAULT_CONFIG.colorTheme,
            density: (parsed.cfg as GeometricConfig).density || DEFAULT_CONFIG.density
          };
          setConfig(restoredCfg);
          if (parsed.shapes && parsed.shapes.length > 0) {
            console.log('Restored shared pattern with', parsed.shapes.length, 'shapes');
          }
          bumpVersion();
        }
      } catch (e) {
        console.warn('Failed to parse share hash', e);
      }
    }
  }, [bumpVersion]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0D0D0D', overflow: 'hidden' }}>
      <Sidebar
        config={config}
        onShapeTypesChange={handleShapeTypesChange}
        onThemeChange={handleThemeChange}
        onDensityChange={handleDensityChange}
        onSave={handleSave}
        pngDataUrl={pngDataUrl}
        shareDataUri={shareDataUri}
        onClearLinks={handleClearLinks}
      />
      <main style={{ marginLeft: 280, width: 'calc(100% - 280px)', height: '100%', position: 'relative' }}>
        <GeometryCanvas
          config={config}
          configVersion={configVersion}
          exportTriggerVersion={exportTrigger}
          onExportResult={handleExportResult}
        />
      </main>
    </div>
  );
};

export default App;
