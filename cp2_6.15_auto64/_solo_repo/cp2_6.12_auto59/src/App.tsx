import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AudioEngine } from './AudioEngine';
import { MarkerManager, Marker } from './MarkerManager';
import WaveformViewer from './WaveformViewer';
import PlaybackTest from './PlaybackTest';
import Toolbar from './Toolbar';

const App: React.FC = () => {
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const markerManagerRef = useRef<MarkerManager | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [waveformData, setWaveformData] = useState<Float32Array | null>(null);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [audioFileName, setAudioFileName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    audioEngineRef.current = new AudioEngine({
      onPlaybackUpdate: (time, dur) => {
        setCurrentTime(time);
        setDuration(dur);
      },
      onWaveformData: (data) => {
        setWaveformData(data);
      },
      onAudioLoaded: (dur) => {
        setDuration(dur);
        setCurrentTime(0);
        setIsPlaying(false);
      },
      onPlaybackEnd: () => {
        setIsPlaying(false);
        setCurrentTime(0);
      },
    });

    markerManagerRef.current = new MarkerManager();

    return () => {
      audioEngineRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (!markerManagerRef.current) return;
    const mm = markerManagerRef.current;
    setMarkers(mm.getMarkers());
    return mm.addListener(() => {
      setMarkers(mm.getMarkers());
    });
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLoadAudio = useCallback(() => {
    audioFileInputRef.current?.click();
  }, []);

  const handleAudioFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !audioEngineRef.current || !markerManagerRef.current) return;

    try {
      await audioEngineRef.current.loadAudioFile(file);
      setAudioFileName(file.name);
      markerManagerRef.current.setAudioFileName(file.name);
    } catch (err) {
      console.error('Failed to load audio:', err);
      alert('音频文件加载失败，请确保文件格式正确（MP3或WAV）');
    }

    if (e.target) {
      e.target.value = '';
    }
  }, []);

  const handlePlayPause = useCallback(() => {
    if (!audioEngineRef.current) return;
    if (isPlaying) {
      audioEngineRef.current.pause();
      setIsPlaying(false);
    } else {
      audioEngineRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleMarkerAdded = useCallback((time: number) => {
    if (!markerManagerRef.current) return;
    markerManagerRef.current.addMarker(time);
  }, []);

  const handleMarkerMoved = useCallback((id: string, time: number) => {
    if (!markerManagerRef.current) return;
    markerManagerRef.current.updateMarkerTime(id, time, true);
  }, []);

  const handleMarkerDeleted = useCallback((id: string) => {
    if (!markerManagerRef.current) return;
    markerManagerRef.current.removeMarker(id);
  }, []);

  const handleSeek = useCallback((time: number) => {
    if (!audioEngineRef.current) return;
    audioEngineRef.current.seek(time);
  }, []);

  const handleSave = useCallback(() => {
    setShowSaveModal(true);
  }, []);

  const handleConfirmSave = useCallback(() => {
    if (!markerManagerRef.current) return;
    const json = markerManagerRef.current.serialize();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rhythm_sequence_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowSaveModal(false);
  }, []);

  const handleLoad = useCallback(() => {
    jsonFileInputRef.current?.click();
  }, []);

  const handleJsonFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !markerManagerRef.current) return;

    try {
      const text = await file.text();
      const data = markerManagerRef.current.deserialize(text);

      if (data.audioFileName && audioFileName && data.audioFileName !== audioFileName) {
        alert(`注意：方案中的音频文件 "${data.audioFileName}" 与当前加载的音频 "${audioFileName}" 不匹配，可能导致节奏点位置不准确。`);
      }

      if (data.audioFileName && !audioFileName) {
        alert(`方案已加载，请加载对应的音频文件 "${data.audioFileName}" 以获得最佳效果。`);
      }
    } catch (err) {
      console.error('Failed to load sequence:', err);
      alert('节奏方案加载失败，请确保文件格式正确');
    }

    if (e.target) {
      e.target.value = '';
    }
  }, [audioFileName]);

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const getTotalSequenceDuration = (): number => {
    if (markers.length < 2) return 0;
    return markers[markers.length - 1].time - markers[0].time;
  };

  const isSmallScreen = windowWidth < 768;
  const isLargeScreen = windowWidth >= 1200;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#1a1a2e',
        color: 'white',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflow: 'hidden',
      }}
    >
      <Toolbar
        isPlaying={isPlaying}
        hasAudio={duration > 0}
        hasMarkers={markers.length > 0}
        onLoadAudio={handleLoadAudio}
        onPlayPause={handlePlayPause}
        onSave={handleSave}
        onLoad={handleLoad}
      />

      <input
        ref={audioFileInputRef}
        type="file"
        accept=".mp3,.wav,audio/mpeg,audio/wav"
        style={{ display: 'none' }}
        onChange={handleAudioFileChange}
      />
      <input
        ref={jsonFileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleJsonFileChange}
      />

      <div
        style={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          position: 'relative',
        }}
      >
        {isLargeScreen && (
          <div
            style={{
              width: '240px',
              backgroundColor: '#16213e',
              borderRight: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '16px',
              overflowY: 'auto',
              flexShrink: 0,
            }}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#e94560' }}>标记点列表</h3>
            {markers.length === 0 ? (
              <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '13px' }}>暂无标记点</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {markers.map((marker, index) => (
                  <div
                    key={marker.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '6px',
                      fontSize: '13px',
                    }}
                  >
                    <div
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: '#ffa500',
                      }}
                    />
                    <span style={{ fontFamily: 'monospace' }}>{index + 1}.</span>
                    <span style={{ fontFamily: 'monospace', flex: 1 }}>{formatTime(marker.time)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            padding: '20px',
            gap: '16px',
          }}
        >
          <div
            style={{
              flex: '0 0 60%',
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '8px',
              }}
            >
              波形显示区域 {audioFileName && <span style={{ color: '#e94560' }}>- {audioFileName}</span>}
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <WaveformViewer
                audioEngine={audioEngineRef.current}
                markerManager={markerManagerRef.current}
                currentTime={currentTime}
                duration={duration}
                waveformData={waveformData}
                onMarkerAdded={handleMarkerAdded}
                onMarkerMoved={handleMarkerMoved}
                onMarkerDeleted={handleMarkerDeleted}
                onSeek={handleSeek}
                height="100%"
              />
            </div>
          </div>

          {!isSmallScreen && (
            <div
              style={{
                flex: '0 0 20%',
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginBottom: '6px',
                }}
              >
                节奏序列时间线
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <WaveformViewer
                  audioEngine={audioEngineRef.current}
                  markerManager={markerManagerRef.current}
                  currentTime={currentTime}
                  duration={duration}
                  waveformData={waveformData}
                  isOverview={true}
                  height="100%"
                />
              </div>
            </div>
          )}
        </div>

        {isLargeScreen && (
          <div
            style={{
              width: '220px',
              backgroundColor: '#16213e',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '16px',
              flexShrink: 0,
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#e94560' }}>统计信息</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                  标记点数量
                </div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ffa500' }}>
                  {markers.length}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                  序列总时长
                </div>
                <div style={{ fontSize: '20px', fontWeight: 600, fontFamily: 'monospace' }}>
                  {formatTime(getTotalSequenceDuration())}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                  音频总时长
                </div>
                <div style={{ fontSize: '20px', fontWeight: 600, fontFamily: 'monospace' }}>
                  {formatTime(duration)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {isSmallScreen && (
        <button
          onClick={() => setShowDrawer(true)}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#e94560',
            color: 'white',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(233, 69, 96, 0.4)',
            zIndex: 50,
          }}
        >
          ≡
        </button>
      )}

      {isSmallScreen && showDrawer && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            height: '40%',
            backgroundColor: '#16213e',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            zIndex: 60,
            animation: 'slideUp 0.3s ease-out',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <span style={{ fontWeight: 600 }}>节奏序列时间线</span>
            <button
              onClick={() => setShowDrawer(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '20px',
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          </div>
          <div style={{ flex: 1, padding: '12px', minHeight: 0 }}>
            <WaveformViewer
              audioEngine={audioEngineRef.current}
              markerManager={markerManagerRef.current}
              currentTime={currentTime}
              duration={duration}
              waveformData={waveformData}
              isOverview={true}
              height="100%"
            />
          </div>
        </div>
      )}

      {showSaveModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowSaveModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              backgroundColor: '#16213e',
              borderRadius: '16px 16px 0 0',
              padding: '24px',
              boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
              animation: 'modalSlideUp 0.3s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>保存节奏方案</h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', margin: '0 0 20px 0' }}>
              将保存 {markers.length} 个节奏标记点
              {audioFileName && <span>（关联音频：{audioFileName}）</span>}
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowSaveModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                取消
              </button>
              <button
                onClick={handleConfirmSave}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#e94560',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#ff6b8a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#e94560';
                }}
              >
                确认保存
              </button>
            </div>
          </div>
        </div>
      )}

      <PlaybackTest
        audioEngine={audioEngineRef.current}
        markerManager={markerManagerRef.current}
        currentTime={currentTime}
        isPlaying={isPlaying}
      />

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes modalSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; overflow: hidden; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); }
        ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
      `}</style>
    </div>
  );
};

export default App;
