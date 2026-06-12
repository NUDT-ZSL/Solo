import React, { useState, useCallback, useRef } from 'react';
import { AudioAnalyzer, SpectrumData } from './audio/analyzer';
import FileUploader from './components/FileUploader';
import Visualizer from './components/Visualizer';
import ControlPanel, { VisualizerParams, ViewMode, ColorTheme } from './components/ControlPanel';

const defaultParams: VisualizerParams = {
  particleDensity: 8000,
  colorTheme: 'aurora' as ColorTheme,
  sizeMultiplier: 1.0,
  rotationSpeed: 0.5,
  viewMode: 'front' as ViewMode,
};

const App: React.FC = () => {
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [spectrumData, setSpectrumData] = useState<SpectrumData | null>(null);
  const [params, setParams] = useState<VisualizerParams>(defaultParams);
  const [fps, setFps] = useState(60);
  const analyzerRef = useRef<AudioAnalyzer | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    if (analyzerRef.current) {
      analyzerRef.current.stop();
    }
    const analyzer = new AudioAnalyzer();
    analyzerRef.current = analyzer;

    await analyzer.loadFile(file, (data: SpectrumData) => {
      setSpectrumData(data);
    });

    setAudioLoaded(true);
  }, []);

  const handleParamChange = useCallback((key: keyof VisualizerParams, value: number | string) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {!audioLoaded ? (
        <FileUploader onFileAccepted={handleFileUpload} />
      ) : (
        <>
          <Visualizer spectrumData={spectrumData} params={params} onFPSUpdate={setFps} />
          <ControlPanel params={params} onChange={handleParamChange} fps={fps} />
        </>
      )}
    </div>
  );
};

export default App;
