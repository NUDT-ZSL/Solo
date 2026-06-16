import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Train } from 'lucide-react';
import { MapRenderer } from '@/map/mapRenderer';
import { lines, stations, getCurrentFlow, type Station } from '@/map/stationData';
import LineSelector from '@/components/LineSelector';
import TimeSlider from '@/components/TimeSlider';
import DetailPanel from '@/components/DetailPanel';

type SelectMode = 'single' | 'multi';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<MapRenderer | null>(null);

  const [selectedLineIds, setSelectedLineIds] = useState<string[]>(
    lines.map((l) => l.id)
  );
  const [currentTime, setCurrentTime] = useState<number>(8);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [selectMode, setSelectMode] = useState<SelectMode>('multi');

  const avgHistoryData = useMemo(() => {
    const result: number[] = new Array(24).fill(0);
    if (stations.length === 0) return result;
    for (const station of stations) {
      for (let i = 0; i < 24; i++) {
        result[i] += station.history[i];
      }
    }
    return result.map((v) => Math.floor(v / stations.length));
  }, []);

  const avgPredictionData = useMemo(() => {
    const result: number[] = new Array(60).fill(0);
    if (stations.length === 0) return result;
    for (const station of stations) {
      for (let i = 0; i < 60; i++) {
        result[i] += station.prediction[i] || 0;
      }
    }
    return result.map((v) => Math.floor(v / stations.length));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = mapContainerRef.current;
    if (!canvas || !container) return;

    const renderer = new MapRenderer(canvas, {
      onStationClick: (station) => {
        setSelectedStation(station);
      },
    });
    rendererRef.current = renderer;

    const handleResize = () => {
      renderer.resize();
    };

    const init = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
      }

      renderer.updateData(lines, selectedLineIds, currentTime);
    };

    requestAnimationFrame(init);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.destroy();
    };
  }, []);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setSelectedLineIds(selectedLineIds);
    }
  }, [selectedLineIds]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setHour(currentTime);
    }
  }, [currentTime]);

  const handleLineToggle = useCallback(
    (lineId: string) => {
      if (!lineId) {
        setSelectedLineIds([]);
        return;
      }
      if (selectMode === 'single') {
        setSelectedLineIds([lineId]);
      } else {
        setSelectedLineIds((prev) =>
          prev.includes(lineId)
            ? prev.filter((id) => id !== lineId)
            : [...prev, lineId]
        );
      }
    },
    [selectMode]
  );

  const handleStationClose = useCallback(() => {
    setSelectedStation(null);
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#1e293b] text-white overflow-hidden">
      <header className="h-14 flex-shrink-0 flex items-center justify-between px-4 lg:px-6 bg-slate-900/80 backdrop-blur border-b border-slate-700/50 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            <Train size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-base lg:text-lg font-bold text-white">
              地铁客流热力感知面板
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">
              实时客流监控与预测分析系统
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:inline">
            当前时间: {Math.floor(currentTime).toString().padStart(2, '0')}:00
          </span>
        </div>
      </header>

      <div className="main-layout">
        <aside className="sidebar-left">
          <LineSelector
            selectedLineIds={selectedLineIds}
            onLineToggle={handleLineToggle}
            currentTime={currentTime}
            mode={selectMode}
            onModeChange={setSelectMode}
          />
        </aside>

        <main className="map-container">
          <div ref={mapContainerRef} className="w-full h-full relative">
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-pointer"
            />

            <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur rounded-lg p-3 text-xs z-10">
              <div className="text-slate-400 mb-2">客流强度</div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-3 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500" />
                <span className="text-slate-500">低</span>
                <span className="text-slate-500 ml-auto">高</span>
              </div>
            </div>

            <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur rounded-lg p-3 text-xs z-10">
              <div className="text-slate-400 mb-1">在线站点</div>
              <div className="text-lg font-bold text-white">
                {
                  stations.filter((s) =>
                    selectedLineIds.length === 0
                      ? true
                      : selectedLineIds.includes(s.lineId)
                  ).length
                }
                <span className="text-xs text-slate-400 ml-1">个</span>
              </div>
            </div>
          </div>
        </main>

        <aside className="sidebar-right">
          <DetailPanel
            station={selectedStation}
            currentTime={currentTime}
            onClose={handleStationClose}
          />
        </aside>
      </div>

      <footer className="footer-bar">
        <TimeSlider
          currentTime={currentTime}
          onTimeChange={setCurrentTime}
          historyData={avgHistoryData}
          predictionData={avgPredictionData}
        />
      </footer>
    </div>
  );
}
