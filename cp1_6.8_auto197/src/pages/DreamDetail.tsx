import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useDreamStore } from '@/store/dreamStore';
import { EMOTION_CONFIGS, FOOD_CONFIGS } from '@/data/mockData';
import DreamCanvas from '@/components/DreamCanvas';
import BackgroundParticles from '@/components/BackgroundParticles';

export default function DreamDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const getDreamById = useDreamStore((s) => s.getDreamById);
  const dream = useMemo(() => (id ? getDreamById(id) : undefined), [id, getDreamById]);

  if (!dream) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-400/90 via-amber-300/80 to-purple-300/90">
        <div className="text-center animate-fadeInUp">
          <p className="text-white/50 text-lg mb-4">梦境已消散...</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20
              text-white/70 text-sm hover:bg-white/25 transition-all duration-300"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const emotionCfg = EMOTION_CONFIGS[dream.emotion];
  const foodLabels = dream.foodKeywords.map((k) => FOOD_CONFIGS[k]?.label || k);

  return (
    <div className="h-screen relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-orange-400/90 via-amber-300/80 to-purple-300/90 -z-20" />

      <DreamCanvas dream={dream} isDetail />

      <div className="absolute top-0 left-0 right-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
              bg-white/10 backdrop-blur-xl border border-white/20
              text-white/80 text-sm hover:bg-white/20 transition-all duration-300"
          >
            <ArrowLeft size={16} />
            返回
          </button>

          <div className="flex items-center gap-2">
            {emotionCfg && (
              <span
                className="px-3 py-1 rounded-full text-xs text-white/90 backdrop-blur-sm"
                style={{ backgroundColor: emotionCfg.color + 'AA' }}
              >
                {emotionCfg.label}
              </span>
            )}
            {foodLabels.map((label, i) => {
              const fc = FOOD_CONFIGS[dream.foodKeywords[i]];
              return (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full text-xs text-white/90 backdrop-blur-sm"
                  style={{ backgroundColor: (fc?.color || '#888') + 'AA' }}
                >
                  {label}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-6 pt-16 bg-gradient-to-t from-black/30 to-transparent">
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl p-5 shadow-2xl shadow-black/20 animate-fadeInUp">
            <h1 className="text-white/95 text-xl font-bold mb-2 tracking-wide">{dream.title}</h1>
            <p className="text-white/60 text-sm leading-relaxed line-clamp-3">{dream.description}</p>
            <div className="mt-3 flex items-center gap-4 text-xs text-white/35">
              <span>{new Date(dream.createdAt).toLocaleDateString('zh-CN')}</span>
              <span>·</span>
              <span>点击食物粒子查看味道描述</span>
              <span>·</span>
              <span>拖拽旋转视角</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
