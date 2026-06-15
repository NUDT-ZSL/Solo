import React, { useState, useRef, useCallback } from 'react';
import ParticleCanvas, { ParticleCanvasHandle } from './components/ParticleCanvas';
import ControlPanel from './components/ControlPanel';
import AudioInput from './components/AudioInput';
import Snapshots from './components/Snapshots';
import { AudioAnalyzer } from './utils/audioAnalyzer';
import type { AudioFeature, ParticlePreset, CanvasSnapshotState } from './types';

export interface Snapshot {
  id: string;
  dataUrl: string;
  stateData: string;
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
  
  const particleCanvasRef = useRef<ParticleCanvasHandle>(null);
  const audioAnalyzerRef = useRef<AudioAnalyzer | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayToggle = useCallback(() => {
    setIsPlaying(prev => {
      const newState = !prev;
      
      const audio = audioElementRef.current;
      if (audio) {
        if (newState) {
          audio.play().catch(err => console.warn('Playback failed:', err));
        } else {
          audio.pause();
        }
      }
      
      const analyzer = audioAnalyzerRef.current;
      if (analyzer) {
        if (newState) {
          analyzer.start();
        } else {
          analyzer.stop();
        }
      }
      
      return newState;
    });
  }, []);

  const handleVolumeChange = useCallback((value: number) => {
    setVolume(value);
    if (audioElementRef.current) {
      audioElementRef.current.volume = value / 100;
    }
  }, []);

  const handlePresetChange = useCallback((newPreset: ParticlePreset) => {
    setPreset(newPreset);
  }, []);

  const handleAudioElementCreated = useCallback((audio: HTMLAudioElement) => {
    audioElementRef.current = audio;
    audio.volume = volume / 100;
  }, [volume]);

  const handleAnalyzerCreated = useCallback((analyzer: AudioAnalyzer) => {
    audioAnalyzerRef.current = analyzer;
    if (particleCanvasRef.current) {
      particleCanvasRef.current.setAnalyzer(analyzer);
    }
  }, []);

  const handleAudioLoaded = useCallback(() => {
    setHasAudio(true);
    setIsPlaying(true);
    if (audioAnalyzerRef.current) {
      audioAnalyzerRef.current.start();
    }
  }, []);

  const handleFeatureUpdate = useCallback((feature: AudioFeature) => {
    setCurrentFeature(feature);
  }, []);

  const handleCapture = useCallback(() => {
    if (!particleCanvasRef.current) return;
    
    const canvas = document.querySelector('canvas.particle-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    
    const dataUrl = canvas.toDataURL('image/png');
    const state = particleCanvasRef.current.captureState();
    const stateData = JSON.stringify(state);
    
    const newSnapshot: Snapshot = {
      id: `snapshot-${Date.now()}`,
      dataUrl,
      stateData,
      timestamp: Date.now(),
    };
    
    setSnapshots(prev => [...prev, newSnapshot]);
  }, []);

  const handleSnapshotClick = useCallback((id: string) => {
    setActiveSnapshot(prev => {
      const isCurrentlyActive = prev === id;
      
      if (isCurrentlyActive) {
        return null;
      }
      
      const snapshot = snapshots.find(s => s.id === id);
      if (snapshot && particleCanvasRef.current) {
        try {
          const state: CanvasSnapshotState = JSON.parse(snapshot.stateData);
          particleCanvasRef.current.restoreState(state);
          
          if (state.preset) {
            setPreset(state.preset);
          }
          if (typeof state.overlayOpacity === 'number') {
            setSnapshotOpacity(state.overlayOpacity);
          }
        } catch (err) {
          console.warn('Failed to restore snapshot state:', err);
        }
      }
      
      return id;
    });
  }, [snapshots]);

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
          ref={particleCanvasRef}
          isPlaying={isPlaying}
          volume={volume}
          preset={preset}
          hasAudio={hasAudio}
          onFeatureUpdate={handleFeatureUpdate}
          snapshotOverlay={activeSnapshotData?.dataUrl || null}
          snapshotOpacity={snapshotOpacity}
          audioAnalyzerRef={audioAnalyzerRef}
          onAnalyzerCreated={handleAnalyzerCreated}
        />
      </div>
      
      <button
        className={`hamburger-btn ${mobilePanelOpen ? 'open' : ''}`}
        onClick={handleToggleMobilePanel}
        aria-label="切换控制面板"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      
      <div className={`control-panel ${mobilePanelOpen ? 'mobile-open' : ''}`}>
        <div className="panel-section">
          <h2 className="panel-title">音乐情感色彩流</h2>
          {currentFeature && (
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
              BPM: {Math.round(currentFeature.bpm)} | 能量: {Math.round(currentFeature.energy * 100)}%
            </div>
          )}
        </div>
        
        <AudioInput
          onAudioLoaded={handleAudioLoaded}
          onAudioElementCreated={handleAudioElementCreated}
          onAnalyzerCreated={handleAnalyzerCreated}
        />
        
        <div className="panel-section">
          <label className="section-label">播放控制</label>
          <button
            className="play-button"
            onClick={handlePlayToggle}
            title={isPlaying ? '暂停' : '播放'}
            disabled={!hasAudio && !isPlaying ? false : false}
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
