import { useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import type { Poem } from '@/utils/api';

function PoemCard({ poem, index }: { poem: Poem; index: number }) {
  return (
    <div
      className="card-enter glass-button p-5 space-y-3"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {poem.lines.map((line) => (
        <p key={line.id} className="poem-line-anim text-night-50 text-lg leading-relaxed">
          {line.content}
        </p>
      ))}
      <div className="flex items-center justify-between text-xs text-night-100">
        <span>{poem.lines.length} 行</span>
        <span>缝合 {poem.stitch_count} 次</span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { recentPoems, searchResults, searchQuery, isSubmitting, fetchRecentPoems, submitPoem } = useStore();

  useEffect(() => {
    fetchRecentPoems();
  }, [fetchRecentPoems]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem('content') as HTMLInputElement;
    const content = input.value.trim();
    if (!content) return;
    await submitPoem(content);
    input.value = '';
  };

  const displayPoems = searchQuery ? [] : recentPoems;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <section className="text-center space-y-4 py-8">
        <h1 className="gold-text text-4xl font-bold">言灵诗歌</h1>
        <p className="text-night-100 text-sm">一句诗，连接万千灵魂</p>
      </section>

      <form onSubmit={handleSubmit} className="glass-button flex gap-3 p-3">
        <input
          name="content"
          type="text"
          placeholder="写下你的诗句..."
          className="flex-1 bg-transparent border-none outline-none text-night-50 placeholder:text-night-100/50 text-lg"
          disabled={isSubmitting}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2 rounded-lg bg-gold-400/20 text-gold-400 border border-gold-400/30 hover:bg-gold-400/30 transition-all disabled:opacity-50"
        >
          {isSubmitting ? '提交中...' : '投递'}
        </button>
      </form>

      {searchQuery && searchResults.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-night-100 text-sm">搜索结果</h2>
          {searchResults.map((result, i) => (
            <div key={i} className="card-enter glass-button p-4" style={{ animationDelay: `${i * 0.1}s` }}>
              {result.type === 'line' ? (
                <p className="text-night-50">{(result.data as any).content}</p>
              ) : (
                <p className="text-night-50">用户: {(result.data as any).anonymous_id}</p>
              )}
            </div>
          ))}
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-night-100 text-sm">最新诗歌</h2>
        {displayPoems.length === 0 ? (
          <p className="text-center text-night-100 py-12">暂无诗歌，投递第一句吧</p>
        ) : (
          displayPoems.map((poem, i) => (
            <PoemCard key={poem.id} poem={poem} index={i} />
          ))
        )}
      </section>
    </div>
  );
}
