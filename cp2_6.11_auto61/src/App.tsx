import React, { useState, useRef, useCallback } from 'react';
import ParticleCanvas from './components/ParticleCanvas';
import ControlPanel from './components/ControlPanel';
import AudioInput from './components/AudioInput';
import Snapshots from './components/Snapshots';
import type { AudioFeature, ParticlePreset } from './types';

export interface Snapshot {
  id: string;
  dataUrl: string;
  timestamp: number;
}

const App: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(75);
  const [preset, setPreset] = useState<ParticlePreset>('nebula');
  const [currentFeature, setCurrentFeature] = useState<AudioFeature | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [activeSnapshot, setActiveSnapshot] = useState<string | null>(null);
  const [snapshotOpacity, setSnapshotOpacity] = useState(30);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particleCanvasRef = useRef<any>(null);

  const handlePlayToggle = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleVolumeChange = useCallback((value: number) => {
    setVolume(value);
  }, []);

  const handlePresetChange = useCallback((newPreset: ParticlePreset) => {
    setPreset(newPreset);
  }, []);

  const handleAudioLoaded = useCallback(() => {
    setHasAudio(true);
    setIsPlaying(true);
  }, []);

  const handleFeatureUpdate = useCallback((feature: AudioFeature) => {
    setCurrentFeature(feature);
  }, []);

  const handleCapture = useCallback(() => {
    if (!canvasRef.current) return;
    
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const newSnapshot: Snapshot = {
      id: `snapshot-${Date.now()}`,
      dataUrl,
      timestamp: Date.now(),
    };
    
    setSnapshots(prev => [...prev, newSnapshot]);
  }, []);

  const handleSnapshotClick = useCallback((id: string) => {
    setActiveSnapshot(prev => prev === id ? null : id);
  }, []);

  const handleSnapshotDelete = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSnapshots(prev => prev.filter(s => s.id !== id));
    if (activeSnapshot === id) {
      setActiveSnapshot(null);
    }
  }, [activeSnapshot]);

  const handleToggleMobilePanel = useCallback(() => {
    setMobilePanelOpen(prev => !prev);
  }, []);

  const activeSnapshotData = snapshots.find(s => s.id === activeSnapshot);

  return (
    <div className="app-container">
      <div className="canvas-container">
        <ParticleCanvas
          canvasRef={canvasRef}
          particleCanvasRef={particleCanvasRef}
          isPlaying={isPlaying}
          volume={volume}
          preset={preset}
          hasAudio={hasAudio}
          onFeatureUpdate={handleFeatureUpdate}
          snapshotOverlay={activeSnapshotData?.dataUrl || null}
          snapshotOpacity={snapshotOpacity}
        />
      </div>
      
      <button
        className={`hamburger-btn ${mobilePanelOpen ? 'open' : ''}`}
        onClick={handleToggleMobilePanel}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      
      <div className={`control-panel ${mobilePanelOpen ? 'mobile-open' : ''}`}>
        <div className="panel-section">
          <h2 className="panel-title">音乐色彩流</h2>
        </div>
        
        <AudioInput onAudioLoaded={handleAudioLoaded} />
        
        <div className="panel-section">
          <label className="section-label">播放控制</label>
          <button
            className="play-button"
            onClick={handlePlayToggle}
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? (
              <div className="pause-icon"></div>
            ) : (
              <div className="play-icon"></div>
            )}
          </button>
        </div>
        
        <div className="panel-section volume-container">
          <label className="section-label">音量 {volume}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            className="volume-slider"
          />
        </div>
        
        <ControlPanel
          preset={preset}
          onPresetChange={handlePresetChange}
          onCapture={handleCapture}
        />
      </div>
      
      {activeSnapshot && (
        <div className="opacity-slider-container">
          叠加透明度
          <input
            type="range"
            min="0"
            max="100"
            value={snapshotOpacity}
            onChange={(e) => setSnapshotOpacity(Number(e.target.value))}
          />
        </div>
      )}
      
      <Snapshots
        snapshots={snapshots}
        activeSnapshot={activeSnapshot}
        onSnapshotClick={handleSnapshotClick}
        onSnapshotDelete={handleSnapshotDelete}
      />
    </div>
  );
};

export default App;
