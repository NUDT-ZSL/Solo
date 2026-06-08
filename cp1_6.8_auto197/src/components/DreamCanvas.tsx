import { useEffect, useRef, useState, useCallback } from 'react';
import { ParticleEngine } from '@/utils/particleEngine';
import { EMOTION_CONFIGS, FOOD_CONFIGS, Dream } from '@/data/mockData';

interface DreamCanvasProps {
  dream: Dream;
  isDetail?: boolean;
  miniMode?: boolean;
}

export default function DreamCanvas({ dream, isDetail = false, miniMode = false }: DreamCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ParticleEngine | null>(null);
  const [tasteCard, setTasteCard] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });
  const [selectedFood, setSelectedFood] = useState<string>('');

  const emotionCfg = EMOTION_CONFIGS[dream.emotion];
  const primaryFood = dream.foodKeywords[0] || 'dessert';
  const foodCfg = FOOD_CONFIGS[primaryFood];

  const handleBurst = useCallback(
    (x: number, y: number) => {
      setSelectedFood(primaryFood);
      setTasteCard({ x, y, visible: true });
      setTimeout(() => {
        setTasteCard((prev) => ({ ...prev, visible: false }));
      }, 3500);
    },
    [primaryFood]
  );

  useEffect(() => {
    if (!canvasRef.current || !emotionCfg) return;
    const engine = new ParticleEngine(canvasRef.current, emotionCfg);
    if (foodCfg) engine.setFoodConfig(foodCfg);
    engine.setDetailMode(isDetail);
    if (isDetail) {
      engine.setOnBurst(handleBurst);
    }
    engineRef.current = engine;
    engine.start();

    return () => {
      engine.destroy();
    };
  }, [emotionCfg, foodCfg, isDetail, handleBurst]);

  const selectedFoodCfg = FOOD_CONFIGS[selectedFood];

  return (
    <div className={`relative ${miniMode ? 'h-full' : 'w-full h-full'}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {isDetail && tasteCard.visible && selectedFoodCfg && (
        <div
          className="absolute pointer-events-none animate-fadeInUp"
          style={{
            left: Math.min(tasteCard.x, (miniMode ? 300 : window.innerWidth) - 220),
            top: Math.min(tasteCard.y, (miniMode ? 200 : window.innerHeight) - 140),
          }}
        >
          <div className="bg-white/15 backdrop-blur-2xl border border-white/30 rounded-2xl p-5 shadow-2xl shadow-black/20 min-w-[200px]">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: selectedFoodCfg.color }}
              />
              <span className="text-white/90 font-semibold text-sm">{selectedFoodCfg.label}</span>
            </div>
            <p className="text-white/70 text-xs leading-relaxed mb-2">{selectedFoodCfg.description}</p>
            <div className="flex items-center gap-2">
              <span className="text-white/50 text-xs">味道</span>
              <span className="text-white/80 text-xs font-medium">{selectedFoodCfg.taste}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-white/50 text-xs">情绪浓度</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${60 + Math.random() * 35}%`,
                    backgroundColor: emotionCfg?.color,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
