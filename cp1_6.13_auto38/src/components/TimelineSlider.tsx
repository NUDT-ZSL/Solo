import { Clock } from 'lucide-react';
import { useStrataStore } from '@/store/useStrataStore';
import type { AnimationSpeed } from '@/types';
import { useMemo } from 'react';

export default function TimelineSlider() {
  const timeline = useStrataStore((s) => s.timeline);
  const setTimeline = useStrataStore((s) => s.setTimeline);
  const animationSpeed = useStrataStore((s) => s.animationSpeed);
  const setAnimationSpeed = useStrataStore((s) => s.setAnimationSpeed);
  const layers = useStrataStore((s) => s.layers);
  const isMobile = useStrataStore((s) => s.isMobile);

  const currentEra = useMemo(() => {
    if (layers.length === 0) return '—';
    const sortedLayers = [...layers].sort((a, b) => a.order - b.order);
    const totalLayers = sortedLayers.length;
    for (let i = sortedLayers.length - 1; i >= 0; i--) {
      const layer = sortedLayers[i];
      const layerThreshold = ((layer.order - 1) / totalLayers) * 100;
      if (timeline >= layerThreshold) {
        return layer.era || layer.name;
      }
    }
    return sortedLayers[0]?.era || sortedLayers[0]?.name || '—';
  }, [timeline, layers]);

  const speeds: AnimationSpeed[] = [0.5, 1, 2];

  return (
    <div
      className={`${
        isMobile
          ? 'fixed bottom-0 left-0 right-0 w-full z-40'
          : 'absolute bottom-6 left-1/2 -translate-x-1/2 z-40 w-[480px]'
      }`}
    >
      <div
        className="rounded-2xl p-5 border border-slate-700 shadow-[0_4px_30px_rgba(0,0,0,0.4)] backdrop-blur-xl"
        style={{
          backgroundColor: 'rgba(31, 41, 55, 0.85)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          padding: '20px 24px',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-white" />
            <span className="text-white font-bold text-base">地层沉积时间轴</span>
          </div>
          <div className="flex gap-1.5">
            {speeds.map((speed) => (
              <button
                key={speed}
                onClick={() => setAnimationSpeed(speed)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  animationSpeed === speed
                    ? 'bg-blue-500 text-white font-bold'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
                style={{
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        <div className="text-blue-300 text-sm font-bold text-center mb-3">
          {currentEra}
        </div>

        <div className="mb-2">
          <input
            type="range"
            min={0}
            max={100}
            value={timeline}
            onChange={(e) => setTimeline(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer timeline-slider"
            style={{
              background: `linear-gradient(to right, #3b82f6 ${timeline}%, #334155 ${timeline}%)`,
            }}
          />
          <style>{`
            .timeline-slider::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: #ffffff;
              cursor: pointer;
              border: none;
              box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
              transition: box-shadow 0.2s ease;
            }
            .timeline-slider::-webkit-slider-thumb:hover,
            .timeline-slider::-webkit-slider-thumb:active {
              box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.35);
            }
            .timeline-slider::-moz-range-thumb {
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: #ffffff;
              cursor: pointer;
              border: none;
              box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
              transition: box-shadow 0.2s ease;
            }
            .timeline-slider::-moz-range-thumb:hover,
            .timeline-slider::-moz-range-thumb:active {
              box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.35);
            }
            .timeline-slider::-webkit-slider-runnable-track {
              height: 8px;
              border-radius: 4px;
            }
            .timeline-slider::-moz-range-track {
              height: 8px;
              border-radius: 4px;
            }
          `}</style>
        </div>

        <div className="flex justify-between mt-1">
          <span className="text-gray-400 text-[11px]">从新到老</span>
          <span className="text-gray-400 text-[11px]">从老到新</span>
        </div>
      </div>
    </div>
  );
}
