import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Moon } from 'lucide-react';
import { useDreamStore } from '@/store/dreamStore';
import { EMOTION_CONFIGS, FOOD_CONFIGS } from '@/data/mockData';
import DreamCard from '@/components/DreamCard';
import BackgroundParticles from '@/components/BackgroundParticles';

export default function Home() {
  const navigate = useNavigate();
  const { searchQuery, setSearchQuery, getFilteredDreams } = useDreamStore();
  const [searchFocused, setSearchFocused] = useState(false);
  const dreams = useMemo(() => getFilteredDreams(), [getFilteredDreams, searchQuery]);

  const emotionTags = Object.values(EMOTION_CONFIGS);
  const foodTags = Object.values(FOOD_CONFIGS);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-orange-400/90 via-amber-300/80 to-purple-300/90 -z-20" />
      <BackgroundParticles />

      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/10 border-b border-white/15">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <Moon size={22} className="text-amber-200" />
            <span className="text-white/90 font-bold text-lg tracking-wider hidden sm:inline"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              味觉梦境
            </span>
          </div>

          <div className={`flex-1 max-w-md mx-auto relative transition-all duration-300 ${searchFocused ? 'scale-105' : ''}`}>
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="搜索情绪或食物..."
              className="w-full bg-white/10 border border-white/20 rounded-full pl-9 pr-4 py-2
                text-sm text-white/90 placeholder:text-white/35 outline-none
                focus:border-white/40 focus:bg-white/15 transition-all duration-300"
            />
          </div>

          <button
            onClick={() => navigate('/create')}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full
              bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium
              hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-orange-500/25
              hover:shadow-orange-500/40 hover:scale-105 transition-all duration-300"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">记录梦境</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 relative z-10">
        {searchQuery && (
          <div className="mb-6 flex flex-wrap gap-2 animate-fadeInUp">
            {emotionTags.map((t) => (
              <button
                key={t.emotion}
                onClick={() => setSearchQuery(t.label)}
                className="px-3 py-1 rounded-full text-xs border border-white/20 text-white/60
                  hover:border-white/40 hover:text-white/80 transition-all duration-200"
                style={{ borderColor: t.color + '44' }}
              >
                {t.label}
              </button>
            ))}
            {foodTags.map((t) => (
              <button
                key={t.food}
                onClick={() => setSearchQuery(t.label)}
                className="px-3 py-1 rounded-full text-xs border border-white/20 text-white/60
                  hover:border-white/40 hover:text-white/80 transition-all duration-200"
                style={{ borderColor: t.color + '44' }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {dreams.length === 0 ? (
          <div className="text-center py-20 animate-fadeInUp">
            <p className="text-white/40 text-lg mb-2">还没有相关的梦境记录</p>
            <p className="text-white/25 text-sm">试试其他关键词，或创建一个新的味觉梦境</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {dreams.map((dream, i) => (
              <div key={dream.id} className="break-inside-avoid">
                <DreamCard dream={dream} index={i} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
