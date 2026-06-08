import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { EMOTION_CONFIGS, FOOD_CONFIGS, Dream } from '@/data/mockData';
import { useRef, useEffect } from 'react';
import { ParticleEngine } from '@/utils/particleEngine';

interface DreamCardProps {
  dream: Dream;
  index: number;
}

export default function DreamCard({ dream, index }: DreamCardProps) {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ParticleEngine | null>(null);

  const emotionCfg = EMOTION_CONFIGS[dream.emotion];
  const foodCfg = dream.foodKeywords[0] ? FOOD_CONFIGS[dream.foodKeywords[0]] : null;

  const foodLabels = useMemo(
    () => dream.foodKeywords.map((k) => FOOD_CONFIGS[k]?.label || k).join('、'),
    [dream.foodKeywords]
  );

  useEffect(() => {
    if (!canvasRef.current || !emotionCfg) return;
    const engine = new ParticleEngine(canvasRef.current, emotionCfg);
    if (foodCfg) engine.setFoodConfig(foodCfg);
    engineRef.current = engine;
    return () => {
      engine.destroy();
    };
  }, [emotionCfg, foodCfg]);

  const startPreview = () => {
    engineRef.current?.start();
  };

  const stopPreview = () => {
    engineRef.current?.stop();
  };

  const timeAgo = useMemo(() => {
    const diff = Date.now() - dream.createdAt;
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return '刚刚';
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    return `${days}天前`;
  }, [dream.createdAt]);

  return (
    <div
      className="group relative rounded-2xl overflow-hidden cursor-pointer
        bg-white/10 backdrop-blur-xl border border-white/20
        shadow-lg shadow-black/5 hover:shadow-2xl hover:shadow-black/10
        hover:scale-[1.03] transition-all duration-500 ease-out
        animate-fadeInUp"
      style={{ animationDelay: `${index * 80}ms` }}
      onMouseEnter={startPreview}
      onMouseLeave={stopPreview}
      onClick={() => navigate(`/dream/${dream.id}`)}
    >
      <div className="relative h-40 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ background: `linear-gradient(135deg, ${emotionCfg?.color}22, ${foodCfg?.color || '#C9A9FF'}22)` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4">
          <span
            className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium text-white/90"
            style={{ backgroundColor: emotionCfg?.color + 'CC' }}
          >
            {emotionCfg?.label}
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-base font-semibold text-white/90 mb-1.5 line-clamp-1 tracking-wide">
          {dream.title}
        </h3>
        <p className="text-sm text-white/50 line-clamp-2 leading-relaxed mb-3">
          {dream.description}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/40">{foodLabels}</span>
          <span className="text-xs text-white/30">{timeAgo}</span>
        </div>
      </div>
    </div>
  );
}
