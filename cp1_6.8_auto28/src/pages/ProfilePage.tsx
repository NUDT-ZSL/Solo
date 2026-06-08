import { useEffect, useRef, useState, useCallback } from 'react';
import { TokenRenderer } from '@/utils/TokenRenderer';
import { soundEngine } from '@/utils/SoundEngine';
import { useStore } from '@/store/useStore';
import { Totem } from '@/types';
import { ArrowLeft, Trash2, Play, Grid3X3, List, Volume2, Clock, Search } from 'lucide-react';

const renderer = new TokenRenderer();

type ViewMode = 'grid' | 'list';
type SortBy = 'newest' | 'oldest';

function TotemCard({ totem, onDelete, onPlay }: { totem: Totem; onDelete: (id: string) => void; onPlay: (totem: Totem) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      renderer.drawStaticTotem(canvasRef.current, totem, 80, 80);
    }
  }, [totem]);

  return (
    <div className="detail-card rounded-xl p-4 group hover:scale-[1.02] transition-transform">
      <div className="flex items-center gap-4">
        <canvas ref={canvasRef} className="rounded-lg flex-shrink-0" style={{ width: 80, height: 80 }} />
        <div className="flex-1 min-w-0">
          <p className="text-white/50 text-xs mb-1">#{totem.id.slice(0, 8)}</p>
          <div className="flex items-center gap-2 text-white/40 text-xs mb-2">
            <Clock size={10} />
            <span>{new Date(totem.createdAt).toLocaleDateString('zh-CN')}</span>
            <Volume2 size={10} />
            <span>{totem.playCount} 次</span>
          </div>
          {totem.mergedFrom && totem.mergedFrom.length > 0 && (
            <span className="text-purple-400 text-xs">✨ 融合图腾</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPlay(totem)}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors"
          >
            <Play size={14} className="text-white/60" />
          </button>
          <button
            onClick={() => onDelete(totem.id)}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 size={14} className="text-white/40 hover:text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

function TotemGridCard({ totem, onDelete, onPlay }: { totem: Totem; onDelete: (id: string) => void; onPlay: (totem: Totem) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      renderer.drawStaticTotem(canvasRef.current, totem, 120, 120);
    }
  }, [totem]);

  return (
    <div className="detail-card rounded-xl p-3 group hover:scale-[1.03] transition-transform flex flex-col items-center">
      <canvas ref={canvasRef} className="rounded-lg mb-2" style={{ width: 120, height: 120 }} />
      <p className="text-white/40 text-xs mb-1">#{totem.id.slice(0, 8)}</p>
      <div className="flex items-center gap-1 text-white/30 text-xs mb-2">
        <Volume2 size={9} />
        <span>{totem.playCount}</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onPlay(totem)}
          className="w-7 h-7 rounded-md flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors"
        >
          <Play size={12} className="text-white/60" />
        </button>
        <button
          onClick={() => onDelete(totem.id)}
          className="w-7 h-7 rounded-md flex items-center justify-center bg-white/5 hover:bg-red-500/20 transition-colors"
        >
          <Trash2 size={12} className="text-white/40" />
        </button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { myTotems, fetchMyTotems, deleteTotem, userId } = useStore();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    fetchMyTotems();
  }, [fetchMyTotems]);

  const handlePlay = useCallback(async (totem: Totem) => {
    if (playingId) {
      soundEngine.stopPlayback();
      setPlayingId(null);
    }
    setPlayingId(totem.id);
    await soundEngine.playAudio(totem.audioData, 0.05, 0.05, () => {
      setPlayingId(null);
    });
  }, [playingId]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteTotem(id);
  }, [deleteTotem]);

  const filtered = myTotems
    .filter((t) => t.id.includes(searchQuery))
    .sort((a, b) => sortBy === 'newest' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt);

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <a href="/" className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors">
              <ArrowLeft size={18} className="text-white/60" />
            </a>
            <div>
              <h1 className="text-xl font-semibold" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                我的图腾
              </h1>
              <p className="text-white/30 text-xs mt-1">{myTotems.length} 个声波图腾</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 text-xs transition-colors ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
              >
                <Grid3X3 size={14} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 text-xs transition-colors ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
              >
                <List size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="搜索图腾 ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-pink-500/50 transition-colors"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/60 focus:outline-none"
          >
            <option value="newest">最新优先</option>
            <option value="oldest">最早优先</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Volume2 size={48} className="text-white/10 mb-4" />
            <p className="text-white/30 text-sm mb-2">还没有图腾</p>
            <a href="/" className="text-pink-400 text-sm hover:underline">
              去回音壁创建第一个
            </a>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filtered.map((totem) => (
              <TotemGridCard key={totem.id} totem={totem} onDelete={handleDelete} onPlay={handlePlay} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((totem) => (
              <TotemCard key={totem.id} totem={totem} onDelete={handleDelete} onPlay={handlePlay} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
