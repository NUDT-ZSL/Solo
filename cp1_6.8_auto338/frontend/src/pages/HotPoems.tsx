import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getHotPoems } from '@/utils/api';
import type { Poem } from '@/utils/api';

function HotPoemCard({ poem, rank }: { poem: Poem; rank: number }) {
  return (
    <div className="card-enter glass-button p-5 space-y-3" style={{ animationDelay: `${rank * 0.08}s` }}>
      <div className="flex items-center justify-between">
        <span className={`font-bold text-lg ${rank <= 3 ? 'gold-text' : 'text-night-100'}`}>
          #{rank}
        </span>
        <span className="text-xs text-night-100">缝合 {poem.stitch_count} 次</span>
      </div>
      <div className="space-y-1">
        {poem.lines.map((line) => (
          <p key={line.id} className="poem-line-anim text-night-50 text-lg leading-relaxed">
            {line.content}
          </p>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-2">
        {poem.lines.map((line) => (
          <Link
            key={line.id}
            to={`/user/${line.anonymous_id}`}
            className="text-xs text-gold-400/60 hover:text-gold-400 transition-colors"
          >
            诗人{line.anonymous_id.slice(0, 6)}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function HotPoems() {
  const [poems, setPoems] = useState<Poem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getHotPoems()
      .then(setPoems)
      .catch(() => setPoems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-night-100 animate-pulse">加载中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <section className="text-center space-y-4 py-4">
        <h1 className="gold-text text-3xl font-bold">🔥 热诗榜</h1>
        <p className="text-night-100 text-sm">被缝合最多的诗歌</p>
      </section>

      {poems.length === 0 ? (
        <p className="text-center text-night-100 py-12">暂无热诗</p>
      ) : (
        <section className="space-y-4">
          {poems.map((poem, i) => (
            <HotPoemCard key={poem.id} poem={poem} rank={i + 1} />
          ))}
        </section>
      )}
    </div>
  );
}
