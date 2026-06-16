import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MapData, TileType, GameStats, HeatmapData, ExportData, createEmptyMap } from './types';
import { EditorCanvas } from './modules/editor/EditorCanvas';
import { EditorToolbar } from './modules/editor/EditorToolbar';
import { GameCanvas } from './modules/game/GameCanvas';

const App: React.FC = () => {
  const [mapData, setMapData] = useState<MapData>(createEmptyMap());
  const [mapLibrary, setMapLibrary] = useState<MapData[]>([]);
  const [selectedTile, setSelectedTile] = useState<TileType>(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameStats, setGameStats] = useState<GameStats>({
    fps: 0,
    deaths: 0,
    coins: 0,
    playTime: 0,
    isGameOver: false,
  });
  const [heatmapData, setHeatmapData] = useState<HeatmapData>({
    positions: [],
    densityMatrix: [],
  });
  const [splitRatio, setSplitRatio] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentMapDataRef = useRef<MapData>(mapData);

  useEffect(() => {
    currentMapDataRef.current = mapData;
  }, [mapData]);

  const handleMapChange = useCallback((newMap: MapData) => {
    setMapData(newMap);
  }, []);

  const handleClear = useCallback(() => {
    setMapData(createEmptyMap());
    setIsPlaying(false);
  }, []);

  const handleExport = useCallback(() => {
    const mapCopy = mapData.map(row => [...row]);
    setMapLibrary(prev => [...prev, mapCopy]);
    setIsPlaying(true);
  }, [mapData]);

  const handleStatsUpdate = useCallback((stats: GameStats) => {
    setGameStats(stats);
  }, []);

  const handleHeatmapUpdate = useCallback((data: HeatmapData) => {
    setHeatmapData(data);
  }, []);

  const handleGameOver = useCallback(() => {
  }, []);

  const handleReplay = useCallback(() => {
    setIsPlaying(false);
    setTimeout(() => {
      setIsPlaying(true);
    }, 50);
  }, []);

  const handleExportData = useCallback(() => {
    const exportData: ExportData = {
      mapData: currentMapDataRef.current,
      heatmapData: heatmapData,
      gameStats: {
        deaths: gameStats.deaths,
        coins: gameStats.coins,
        playTime: gameStats.playTime,
      },
      timestamp: new Date().toISOString(),
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `level-data-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [heatmapData, gameStats]);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = (x / rect.width) * 100;
      setSplitRatio(Math.max(20, Math.min(80, ratio)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#0D1117',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <header style={{
        height: '48px',
        background: '#161B22',
        borderBottom: '1px solid #30363D',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: '12px',
        flexShrink: 0,
      }}>
        <div style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: '16px',
          fontWeight: 900,
          background: 'linear-gradient(135deg, #4FC3F7, #81D4FA)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '2px',
        }}>
          LEVEL WORKSHOP
        </div>
        <div style={{
          fontFamily: "'Noto Sans SC', sans-serif",
          fontSize: '12px',
          color: '#6E7681',
          borderLeft: '1px solid #30363D',
          paddingLeft: '12px',
        }}>
          平台跳跃原型测试器
        </div>
        <div style={{ flex: 1 }} />
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          color: '#6E7681',
        }}>
          地图库: {mapLibrary.length}
        </div>
      </header>

      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          cursor: isDragging ? 'col-resize' : 'default',
        }}
      >
        <div style={{
          width: `${splitRatio}%`,
          background: '#0D1117',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
          padding: '16px',
          boxSizing: 'border-box',
          userSelect: isDragging ? 'none' : 'auto',
        }}>
          <div style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '12px',
            color: '#4FC3F7',
            letterSpacing: '2px',
            marginBottom: '12px',
            textTransform: 'uppercase',
          }}>
            关卡编辑器
          </div>
          <div style={{
            background: '#161B22',
            border: '1px solid #30363D',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}>
            <EditorToolbar
              selectedTile={selectedTile}
              onTileSelect={setSelectedTile}
              onClear={handleClear}
              onExport={handleExport}
            />
            <EditorCanvas
              mapData={mapData}
              selectedTile={selectedTile}
              onMapChange={handleMapChange}
            />
          </div>
        </div>

        <div
          onMouseDown={handleMouseDown}
          style={{
            width: '2px',
            background: '#30363D',
            cursor: 'col-resize',
            flexShrink: 0,
            position: 'relative',
            zIndex: 10,
            transition: isDragging ? 'none' : 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!isDragging) {
              (e.target as HTMLElement).style.background = '#4FC3F7';
            }
          }}
          onMouseLeave={(e) => {
            if (!isDragging) {
              (e.target as HTMLElement).style.background = '#30363D';
            }
          }}
        >
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '-6px',
            width: '14px',
            height: '40px',
            transform: 'translateY(-50%)',
            cursor: 'col-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              width: '4px',
              height: '20px',
              background: isDragging ? '#4FC3F7' : '#6E7681',
              borderRadius: '2px',
            }} />
          </div>
        </div>

        <div style={{
          width: `${100 - splitRatio}%`,
          background: '#0D1117',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
          padding: '16px',
          boxSizing: 'border-box',
          position: 'relative',
          userSelect: isDragging ? 'none' : 'auto',
        }}>
          <div style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '12px',
            color: '#4FC3F7',
            letterSpacing: '2px',
            marginBottom: '12px',
            textTransform: 'uppercase',
          }}>
            游戏测试
          </div>
          <div style={{
            background: '#161B22',
            border: '1px solid #30363D',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <GameCanvas
              mapData={mapData}
              onStatsUpdate={handleStatsUpdate}
              onHeatmapUpdate={handleHeatmapUpdate}
              onGameOver={handleGameOver}
              isPlaying={isPlaying}
              onReplay={handleReplay}
            />
          </div>

          <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            width: '200px',
            background: 'rgba(30, 30, 46, 0.9)',
            borderRadius: '8px',
            border: '1px solid #30363D',
            padding: '12px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px',
            color: '#C9D1D9',
            zIndex: 20,
          }}>
            <div style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '10px',
              color: '#4FC3F7',
              marginBottom: '8px',
              letterSpacing: '1px',
            }}>
              实时数据
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6E7681' }}>FPS</span>
                <span style={{
                  color: gameStats.fps >= 55 ? '#3FB950' : gameStats.fps >= 30 ? '#D29922' : '#F85149',
                }}>
                  {gameStats.fps}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6E7681' }}>死亡</span>
                <span style={{ color: '#F85149' }}>{gameStats.deaths}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6E7681' }}>金币</span>
                <span style={{ color: '#FFD700' }}>{gameStats.coins}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6E7681' }}>时间</span>
                <span>{formatTime(gameStats.playTime)}</span>
              </div>
            </div>

            {gameStats.isGameOver && (
              <div style={{
                marginTop: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                animation: 'fadeIn 0.3s ease',
              }}>
                <button
                  onClick={handleReplay}
                  style={{
                    padding: '6px 0',
                    background: '#238636',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontFamily: "'Noto Sans SC', sans-serif",
                    fontWeight: 700,
                    transition: 'all 0.1s ease',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.background = '#2EA043';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.background = '#238636';
                  }}
                  onMouseDown={(e) => {
                    (e.target as HTMLElement).style.transform = 'scale(0.95) translateY(1px)';
                  }}
                  onMouseUp={(e) => {
                    (e.target as HTMLElement).style.transform = 'scale(1)';
                  }}
                >
                  重玩
                </button>
                <button
                  onClick={handleExportData}
                  style={{
                    padding: '6px 0',
                    background: '#238636',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontFamily: "'Noto Sans SC', sans-serif",
                    fontWeight: 700,
                    transition: 'all 0.1s ease',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.background = '#2EA043';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.background = '#238636';
                  }}
                  onMouseDown={(e) => {
                    (e.target as HTMLElement).style.transform = 'scale(0.95) translateY(1px)';
                  }}
                  onMouseUp={(e) => {
                    (e.target as HTMLElement).style.transform = 'scale(1)';
                  }}
                >
                  导出数据
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
