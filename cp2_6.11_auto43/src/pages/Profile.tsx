import { useEffect } from 'react';
import { useEmotionStore } from '@/store/emotionStore';
import StatsPanel from '@/components/StatsPanel';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Profile() {
  const { stats, fetchStats, records } = useEmotionStore();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #FADDC6 0%, #E8D0F0 100%)',
      }}
    >
      <div className="relative z-10 min-h-screen p-6">
        <header className="flex items-center gap-4 mb-8">
          <Link
            to="/"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
            style={{
              backdropFilter: 'blur(8px)',
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          >
            <ArrowLeft size={16} className="text-white/80" />
          </Link>
          <h1 className="text-xl font-bold text-white/90">个人主页</h1>
        </header>

        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{
                background: 'linear-gradient(135deg, #FF8E53, #7C6EF6)',
                border: '2px solid #FFFFFF',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              }}
            >
              小
            </div>
            <div>
              <div className="text-lg font-semibold text-white/90">小明</div>
              <div className="text-sm text-white/60">{stats?.totalDays || records.length} 天</div>
            </div>
          </div>

          {stats && <StatsPanel stats={stats} />}
        </div>
      </div>
    </div>
  );
}
