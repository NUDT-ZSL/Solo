import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Thermometer, Wind, CloudRain } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

function TemperatureLegend() {
  const { showTemperature, toggleTemperature } = useAppStore();
  const gradientRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPosition(p => (p + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`rounded-lg bg-white/8 backdrop-blur-md border border-white/15 p-3
                  transition-all duration-300 cursor-pointer
                  ${showTemperature ? 'opacity-100' : 'opacity-50'}
                  hover:bg-white/12 hover:border-white/25 hover:-translate-y-px`}
      style={{ backdropFilter: 'blur(10px)' }}
      onClick={toggleTemperature}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 via-green-400 to-red-500 flex items-center justify-center">
          <Thermometer size={12} className="text-white" />
        </div>
        <span className="text-white/90 text-sm font-medium">温度</span>
        <div className="flex-1" />
        <div className={`w-8 h-4 rounded-full transition-colors ${showTemperature ? 'bg-cyan-400/60' : 'bg-white/20'}`}>
          <div
            className={`w-3 h-3 rounded-full bg-white mt-0.5 transition-all duration-300
                       ${showTemperature ? 'ml-4' : 'ml-0.5'}`}
          />
        </div>
      </div>

      <div className="relative h-4 rounded overflow-hidden" ref={gradientRef}>
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to right, #3b82f6, #06b6d4, #22c55e, #eab308, #f97316, #ef4444)',
          }}
        />
        <div
          className="absolute top-0 bottom-0 w-8 bg-white/20 blur-sm"
          style={{
            left: `${position}%`,
            transition: 'left 0.05s linear',
          }}
        />
      </div>

      <div className="flex justify-between mt-1 text-[10px] text-white/50">
        <span>-10°C</span>
        <span>45°C</span>
      </div>
    </div>
  );
}

function WindLegend() {
  const { showWind, toggleWind } = useAppStore();
  const [rotation, setRotation] = useState(0);
  const [flowPos, setFlowPos] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation(r => (r + 2) % 360);
      setFlowPos(p => (p + 5) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`rounded-lg bg-white/8 backdrop-blur-md border border-white/15 p-3
                  transition-all duration-300 cursor-pointer
                  ${showWind ? 'opacity-100' : 'opacity-50'}
                  hover:bg-white/12 hover:border-white/25 hover:-translate-y-px`}
      style={{ backdropFilter: 'blur(10px)' }}
      onClick={toggleWind}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
          <Wind size={12} className="text-white" />
        </div>
        <span className="text-white/90 text-sm font-medium">风速</span>
        <div className="flex-1" />
        <div className={`w-8 h-4 rounded-full transition-colors ${showWind ? 'bg-cyan-400/60' : 'bg-white/20'}`}>
          <div
            className={`w-3 h-3 rounded-full bg-white mt-0.5 transition-all duration-300
                       ${showWind ? 'ml-4' : 'ml-0.5'}`}
          />
        </div>
      </div>

      <div className="h-10 flex items-center justify-center gap-4">
        <div className="relative w-10 h-10">
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <svg width="30" height="30" viewBox="0 0 30 30">
              <defs>
                <marker id="arrowhead-wind" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,255,255,0.8)" />
                </marker>
              </defs>
              <line x1="5" y1="15" x2="25" y2="15" stroke="rgba(255,255,255,0.6)" strokeWidth="2" markerEnd="url(#arrowhead-wind)" />
            </svg>
          </div>
        </div>

        <div className="flex-1 space-y-1">
          <div className="relative h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="absolute top-0 bottom-0 w-6 bg-white/40 rounded-full"
              style={{ left: `${flowPos}%` }}
            />
          </div>
          <div className="text-[10px] text-white/50">
            风向 360° · 风速 0-30m/s
          </div>
        </div>
      </div>
    </div>
  );
}

function PrecipitationLegend() {
  const { showPrecipitation, togglePrecipitation } = useAppStore();
  const particlesRef = useRef<HTMLDivElement>(null);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; speed: number }[]>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      speed: 1 + Math.random() * 2,
    }));
    setParticles(newParticles);
  }, []);

  useEffect(() => {
    if (!showPrecipitation) return;

    const interval = setInterval(() => {
      setParticles(prev => prev.map(p => ({
        ...p,
        y: p.y + p.speed > 100 ? -10 : p.y + p.speed,
      })));
    }, 50);

    return () => clearInterval(interval);
  }, [showPrecipitation]);

  const densityLevels = [
    { label: '小雨', value: 20, opacity: 0.3 },
    { label: '中雨', value: 50, opacity: 0.6 },
    { label: '大雨', value: 100, opacity: 1 },
  ];

  return (
    <div
      className={`rounded-lg bg-white/8 backdrop-blur-md border border-white/15 p-3
                  transition-all duration-300 cursor-pointer
                  ${showPrecipitation ? 'opacity-100' : 'opacity-50'}
                  hover:bg-white/12 hover:border-white/25 hover:-translate-y-px`}
      style={{ backdropFilter: 'blur(10px)' }}
      onClick={togglePrecipitation}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full bg-blue-500/30 flex items-center justify-center">
          <CloudRain size={12} className="text-blue-300" />
        </div>
        <span className="text-white/90 text-sm font-medium">降水</span>
        <div className="flex-1" />
        <div className={`w-8 h-4 rounded-full transition-colors ${showPrecipitation ? 'bg-cyan-400/60' : 'bg-white/20'}`}>
          <div
            className={`w-3 h-3 rounded-full bg-white mt-0.5 transition-all duration-300
                       ${showPrecipitation ? 'ml-4' : 'ml-0.5'}`}
          />
        </div>
      </div>

      <div className="h-12 relative overflow-hidden rounded bg-white/5" ref={particlesRef}>
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute w-0.5 h-2 bg-blue-400 rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              opacity: showPrecipitation ? 0.6 : 0.2,
              transition: 'opacity 0.3s',
            }}
          />
        ))}
      </div>

      <div className="flex justify-between mt-2">
        {densityLevels.map(level => (
          <div key={level.label} className="text-center">
            <div
              className="w-4 h-6 mx-auto bg-blue-400/50 rounded-sm"
              style={{ opacity: level.opacity * 0.5 }}
            />
            <span className="text-[9px] text-white/50 block mt-1">{level.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LegendPanel() {
  const { legendPanelCollapsed, toggleLegendPanel } = useAppStore();

  return (
    <>
      <div
        className={`fixed top-1/2 right-0 -translate-y-1/2 z-30
                    transition-all duration-500 ease-out
                    ${legendPanelCollapsed ? 'translate-x-full' : 'translate-x-0'}`}
      >
        <div className="w-72 pr-2">
          <div className="rounded-l-xl bg-white/8 backdrop-blur-md border border-r-0 border-white/15 p-4
                          shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white/90 font-semibold text-base">气象图例</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLegendPanel();
                }}
                className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center
                           text-white/60 hover:bg-white/20 hover:text-white
                           transition-all hover:brightness-110 active:scale-95"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <TemperatureLegend />
              <WindLegend />
              <PrecipitationLegend />
            </div>

            <div className="mt-4 pt-3 border-t border-white/10">
              <p className="text-[10px] text-white/30">
                点击图例卡片可切换显示/隐藏
              </p>
            </div>
          </div>
        </div>
      </div>

      {legendPanelCollapsed && (
        <button
          onClick={toggleLegendPanel}
          className="fixed top-1/2 right-0 -translate-y-1/2 z-30
                     w-6 h-24 bg-white/15 backdrop-blur-md
                     rounded-l-lg border border-r-0 border-white/20
                     flex items-center justify-center
                     text-white/60 hover:bg-white/25 hover:text-white
                     transition-all duration-300 group"
          style={{ backdropFilter: 'blur(10px)' }}
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-px transition-transform" />
        </button>
      )}
    </>
  );
}
