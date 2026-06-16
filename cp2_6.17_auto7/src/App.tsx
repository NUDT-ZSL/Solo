import { useState, useCallback } from 'react';
import { Train, Layers } from 'lucide-react';
import MapRenderer from '@/map/MapRenderer';
import LineSelector from '@/components/LineSelector';
import TimeSlider from '@/components/TimeSlider';
import DetailPanel from '@/components/DetailPanel';
import { lines, type Station } from '@/map/stationData';

type SelectionMode = 'station' | 'line';

export default function App() {
  const [selectedLineIds, setSelectedLineIds] = useState<string[]>(
    lines.map((l) => l.id)
  );
  const [currentTime, setCurrentTime] = useState<number>(8);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('station');

  const handleLineToggle = useCallback((lineId: string) => {
    setSelectedLineIds((prev) =>
      prev.includes(lineId)
        ? prev.filter((id) => id !== lineId)
        : [...prev, lineId]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedLineIds(lines.map((l) => l.id));
  }, []);

  const handleClearAll = useCallback(() => {
    setSelectedLineIds([]);
  }, []);

  const handleStationClick = useCallback((station: Station) => {
    setSelectedStation(station);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedStation(null);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1e293b] text-white overflow-hidden">
      <header className="h-14 flex-shrink-0 flex items-center justify-between px-4 md:px-6 bg-slate-900/80 backdrop-blur border-b border-slate-700/50 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            <Train size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold text-white">地铁客流热力图</h1>
            <p className="text-xs text-slate-400 hidden sm:block">实时客流监控分析系统</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setSelectionMode('station')}
              className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                selectionMode === 'station'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              站点模式
            </button>
            <button
              onClick={() => setSelectionMode('line')}
              className={`px-3 py-1.5 text-xs rounded-md transition-all flex items-center gap-1 ${
                selectionMode === 'line'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers size={12} />
              线路模式
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        <aside className="w-full md:w-[200px] flex-shrink-0 bg-slate-900/50 border-b md:border-b-0 md:border-r border-slate-700/50 overflow-y-auto order-2 md:order-1">
          <LineSelector
            selectedLineIds={selectedLineIds}
            onLineToggle={handleLineToggle}
            onSelectAll={handleSelectAll}
            onClearAll={handleClearAll}
          />
        </aside>

        <main className="flex-1 min-h-0 relative order-1 md:order-2 h-64 md:h-auto">
          <MapRenderer
            selectedLineIds={selectedLineIds}
            currentTime={currentTime}
            selectedStation={selectedStation}
            onStationClick={handleStationClick}
            selectionMode={selectionMode}
          />

          <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur rounded-lg p-3 text-xs">
            <div className="text-slate-400 mb-2">客流强度</div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-3 rounded-full bg-gradient-to-r from-blue-600 via-green-500 to-yellow-500" />
              <span className="text-slate-500">低</span>
              <span className="text-slate-500 ml-auto">高</span>
            </div>
          </div>
        </main>

        <aside className="w-full xl:w-[320px] flex-shrink-0 bg-slate-900/50 border-t xl:border-t-0 xl:border-l border-slate-700/50 overflow-y-auto order-3">
          <DetailPanel
            station={selectedStation}
            currentTime={currentTime}
            onClose={handleCloseDetail}
          />
        </aside>
      </div>

      <footer className="flex-shrink-0 bg-slate-900/80 backdrop-blur border-t border-slate-700/50">
        <TimeSlider currentTime={currentTime} onTimeChange={setCurrentTime} />
      </footer>
    </div>
  );
}
