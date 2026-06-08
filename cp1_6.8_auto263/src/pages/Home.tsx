import { useEffect, useState } from 'react';
import { Search, Filter, Sparkles } from 'lucide-react';
import FlavorCard from '@/components/FlavorCard';
import { useStore } from '@/store/useStore';
import type { FlavorProfile } from '@/types';

const ALL_TAGS = ['川菜', '日式', '甜点', '中餐', '法式', '泰式', '面食', '火锅', '海鲜', '糕点', '汤品', '咖啡', '柠檬', '抹茶', '焦糖', '桂花', '中式', '意式', '肉类', '家常', '味噌', '麻辣', '酸辣'];
const MOODS = [
  { value: '', label: '全部' },
  { value: 'happy', label: '😊 开心' },
  { value: 'relaxed', label: '😌 放松' },
  { value: 'excited', label: '🔥 激动' },
  { value: 'nostalgic', label: '🥹 怀旧' },
  { value: 'neutral', label: '😐 平静' },
];

export default function Home() {
  const { profiles, setProfiles, searchQuery, setSearchQuery, selectedTag, setSelectedTag, selectedMood, setSelectedMood } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedTag) params.set('tag', selectedTag);
    if (selectedMood) params.set('mood', selectedMood);
    setLoading(true);
    fetch(`/api/foods?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        setProfiles(data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [searchQuery, selectedTag, selectedMood, setProfiles]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 bg-[#FAF6F1]/80 backdrop-blur-xl border-b border-[#E8DDD3]/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <Sparkles className="w-6 h-6 text-[#D4845A]" />
            <span className="text-xl font-bold text-[#6B4C3B]" style={{ fontFamily: "'Playfair Display', serif" }}>
              味觉共振
            </span>
          </div>
          <div className="flex-1 max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7355]" />
            <input
              type="text"
              placeholder="搜索食物或风味..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full bg-white/60 backdrop-blur-sm border border-[#E8DDD3] text-sm text-[#6B4C3B] placeholder:text-[#B8A898] focus:outline-none focus:ring-2 focus:ring-[#D4845A]/30 focus:border-[#D4845A] transition-all"
            />
          </div>
          <a
            href="/create"
            className="shrink-0 px-4 py-2 rounded-full bg-[#D4845A] text-white text-sm font-medium hover:bg-[#C27347] active:scale-95 transition-all"
          >
            + 创建
          </a>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-2 mb-2 text-sm text-[#8B7355]">
          <Filter className="w-4 h-4" />
          <span>心情筛选</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {MOODS.map(m => (
            <button
              key={m.value}
              onClick={() => setSelectedMood(m.value)}
              className={`px-3 py-1.5 rounded-full text-xs transition-all ${selectedMood === m.value ? 'bg-[#D4845A] text-white' : 'bg-white/60 backdrop-blur-sm border border-[#E8DDD3] text-[#6B4C3B] hover:bg-[#F5E6D3]'}`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {ALL_TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
              className={`px-3 py-1 rounded-full text-xs transition-all ${selectedTag === tag ? 'bg-[#6B4C3B] text-white' : 'bg-[#F5E6D3] text-[#6B4C3B] hover:bg-[#E8DDD3]'}`}
            >
              {tag}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white/40 animate-pulse h-72" />
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-20 text-[#8B7355]">
            <p className="text-lg mb-2">还没有找到匹配的风味档案</p>
            <p className="text-sm">试试调整筛选条件，或者创建一个新记录吧</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((profile: FlavorProfile) => (
              <FlavorCard key={profile.id} profile={profile} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
