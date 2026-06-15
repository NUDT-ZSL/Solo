import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useDreamStore } from '@/store/dreamStore';
import { EMOTION_CONFIGS, FOOD_CONFIGS } from '@/data/mockData';
import DreamForm from '@/components/DreamForm';
import DreamCanvas from '@/components/DreamCanvas';
import BackgroundParticles from '@/components/BackgroundParticles';

export default function CreateDream() {
  const navigate = useNavigate();
  const addDream = useDreamStore((s) => s.addDream);
  const [previewEmotion, setPreviewEmotion] = useState('');
  const [previewFoods, setPreviewFoods] = useState<string[]>([]);

  const previewDream = useMemo(
    () => ({
      id: 'preview',
      title: '预览',
      description: '',
      emotion: previewEmotion || 'happy',
      foodKeywords: previewFoods.length > 0 ? previewFoods : ['dessert'],
      createdAt: Date.now(),
    }),
    [previewEmotion, previewFoods]
  );

  const hasPreview = previewEmotion || previewFoods.length > 0;

  const handleSubmit = (data: { title: string; description: string; emotion: string; foodKeywords: string[] }) => {
    addDream(data);
    navigate('/');
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-orange-400/90 via-amber-300/80 to-purple-300/90 -z-20" />
      <BackgroundParticles />

      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/10 border-b border-white/15">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-white/70 hover:text-white/90 transition-colors duration-200"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">返回</span>
          </button>
          <h1 className="text-white/90 font-semibold text-lg tracking-wide">记录味觉梦境</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-xl shadow-black/10 animate-fadeInUp">
            <h2 className="text-white/80 text-sm font-medium mb-5 tracking-wide">梦境信息</h2>
            <DreamForm
              onSubmit={handleSubmit}
              onEmotionChange={setPreviewEmotion}
              onFoodChange={setPreviewFoods}
            />
          </div>

          <div className="animate-fadeInUp" style={{ animationDelay: '100ms' }}>
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-xl shadow-black/10">
              <div className="px-5 py-3 border-b border-white/10">
                <h2 className="text-white/80 text-sm font-medium tracking-wide">
                  {hasPreview ? '粒子预览' : '选择情绪和食物以预览'}
                </h2>
              </div>
              <div className="h-80 relative">
                {hasPreview ? (
                  <DreamCanvas dream={previewDream} miniMode />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-white/25 text-sm">选择情绪和食物后，这里将实时预览粒子效果</p>
                  </div>
                )}
              </div>
              {hasPreview && previewEmotion && (
                <div className="px-5 py-3 border-t border-white/10">
                  <div className="flex items-center gap-3">
                    <span className="text-white/40 text-xs">当前情绪:</span>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs text-white/80"
                      style={{ backgroundColor: EMOTION_CONFIGS[previewEmotion]?.color + '88' }}
                    >
                      {EMOTION_CONFIGS[previewEmotion]?.label}
                    </span>
                    {previewFoods.length > 0 && (
                      <>
                        <span className="text-white/40 text-xs">食物:</span>
                        <div className="flex gap-1.5">
                          {previewFoods.map((f) => (
                            <span
                              key={f}
                              className="px-2 py-0.5 rounded-full text-xs text-white/80"
                              style={{ backgroundColor: FOOD_CONFIGS[f]?.color + '88' }}
                            >
                              {FOOD_CONFIGS[f]?.label}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
