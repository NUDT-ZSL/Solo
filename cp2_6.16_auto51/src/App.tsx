import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AudioEngine, type AudioTrack } from './audio/AudioEngine';
import { MixerChannel } from './components/MixerChannel';
import { MasterPanel } from './components/MasterPanel';
import { performMixdown, downloadBlob } from './utils/mixdown';

const App: React.FC = () => {
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  const refreshTracks = useCallback(() => {
    if (audioEngineRef.current) {
      setTracks([...audioEngineRef.current.getTracks()]);
    }
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const init = async () => {
      const engine = new AudioEngine();
      await engine.init();
      audioEngineRef.current = engine;
      setTracks(engine.getTracks());
      setIsLoading(false);
    };

    init();

    return () => {
      audioEngineRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.setMasterVolume(masterVolume);
    }
  }, [masterVolume]);

  useEffect(() => {
    let intervalId: number;
    if (audioEngineRef.current && !isLoading) {
      intervalId = window.setInterval(() => {
        setForceUpdate(prev => prev + 1);
      }, 100);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isLoading]);

  const handleTogglePlay = useCallback(async (trackId: string) => {
    if (!audioEngineRef.current) return;
    await audioEngineRef.current.toggleTrack(trackId);
    refreshTracks();
  }, [refreshTracks]);

  const handleVolumeChange = useCallback((trackId: string, value: number) => {
    if (!audioEngineRef.current) return;
    audioEngineRef.current.setVolume(trackId, value);
    refreshTracks();
  }, [refreshTracks]);

  const handlePanChange = useCallback((trackId: string, value: number) => {
    if (!audioEngineRef.current) return;
    audioEngineRef.current.setPan(trackId, value);
    refreshTracks();
  }, [refreshTracks]);

  const handleMuteToggle = useCallback((trackId: string) => {
    if (!audioEngineRef.current) return;
    const track = audioEngineRef.current.getTrack(trackId);
    if (track) {
      audioEngineRef.current.setMuted(trackId, !track.state.muted);
      refreshTracks();
    }
  }, [refreshTracks]);

  const handleSoloToggle = useCallback((trackId: string) => {
    if (!audioEngineRef.current) return;
    const track = audioEngineRef.current.getTrack(trackId);
    if (track) {
      audioEngineRef.current.setSolo(trackId, !track.state.solo);
      refreshTracks();
    }
  }, [refreshTracks]);

  const handleEffectToggle = useCallback((trackId: string) => {
    if (!audioEngineRef.current) return;
    const track = audioEngineRef.current.getTrack(trackId);
    if (track) {
      audioEngineRef.current.setEffectEnabled(trackId, !track.state.effectEnabled);
      refreshTracks();
    }
  }, [refreshTracks]);

  const handleMasterVolumeChange = useCallback((value: number) => {
    setMasterVolume(value);
  }, []);

  const handleMixdown = useCallback(async () => {
    if (!audioEngineRef.current || isExporting) return;

    const playingTracks = audioEngineRef.current.getTracks().filter(t => t.state.playing);
    if (playingTracks.length === 0) {
      alert('请先播放至少一个轨道再进行混音导出');
      return;
    }

    setIsExporting(true);

    try {
      const sampleRate = audioEngineRef.current.getAudioContext()?.sampleRate ?? 44100;
      const result = await performMixdown(
        audioEngineRef.current.getTracks(),
        sampleRate,
        masterVolume
      );

      downloadBlob(result.blob, result.fileName);
    } catch (error) {
      console.error('Mixdown failed:', error);
      alert('混音导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, masterVolume]);

  const masterAnalyser = audioEngineRef.current?.getMasterAnalyser() ?? null;

  if (isLoading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#121212',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: '18px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(108, 99, 255, 0.3)',
              borderTop: '3px solid #6c63ff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
          <span>正在加载音频引擎...</span>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#121212',
        padding: '20px',
        boxSizing: 'border-box',
        fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif'
      }}
    >
      <header
        style={{
          marginBottom: '20px',
          textAlign: 'center'
        }}
      >
        <h1
          style={{
            color: '#fff',
            fontSize: '28px',
            fontWeight: 700,
            margin: 0,
            background: 'linear-gradient(90deg, #6c63ff, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          虚拟乐器混音台
        </h1>
        <p style={{ color: '#888', fontSize: '13px', margin: '8px 0 0 0' }}>
          调节各轨道参数，创建属于你的音乐混音
        </p>
      </header>

      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '20px',
          alignItems: isMobile ? 'center' : 'flex-start',
          justifyContent: 'center'
        }}
      >
        <div
          style={{
            background: '#121212',
            padding: '20px',
            borderRadius: '12px',
            overflowX: 'auto',
            overflowY: 'hidden',
            width: isMobile ? '100%' : 'auto',
            maxWidth: isMobile ? '100%' : 'calc(100% - 240px)'
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '16px',
              minWidth: 'min-content'
            }}
          >
            {tracks.map((track) => (
              <MixerChannel
                key={track.state.id + '_' + forceUpdate}
                track={track}
                onTogglePlay={handleTogglePlay}
                onVolumeChange={handleVolumeChange}
                onPanChange={handlePanChange}
                onMuteToggle={handleMuteToggle}
                onSoloToggle={handleSoloToggle}
                onEffectToggle={handleEffectToggle}
              />
            ))}
          </div>
        </div>

        <MasterPanel
          masterVolume={masterVolume}
          onMasterVolumeChange={handleMasterVolumeChange}
          onMixdown={handleMixdown}
          analyser={masterAnalyser}
          isExporting={isExporting}
        />
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
          background: #121212;
        }
        ::-webkit-scrollbar {
          height: 8px;
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #1a1a2e;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background: #3e4a6e;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #6c63ff;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #6c63ff;
          cursor: pointer;
          transition: background 0.2s ease-in-out;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          background: #8b5cf6;
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #6c63ff;
          cursor: pointer;
          border: none;
          transition: background 0.2s ease-in-out;
        }
        input[type="range"]::-moz-range-thumb:hover {
          background: #8b5cf6;
        }
        button:hover {
          transform: scale(1.05);
        }
        button:active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  );
};

export default App;
