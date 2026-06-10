import { useEffect, useRef, useCallback, useState } from 'react';
import { useStore } from '../store/useStore';
import StoryCard from './StoryCard';

export default function TimeWall() {
  const { stories, hasMore, loading, loadStories } = useStore();
  const observerRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(3);

  useEffect(() => { loadStories(1); }, [loadStories]);

  // 响应式列数
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 768) setCols(1);
      else if (w < 1200) setCols(2);
      else setCols(3);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // 无限滚动
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasMore && !loading) loadStories();
    },
    [hasMore, loading, loadStories]
  );

  useEffect(() => {
    const ob = new IntersectionObserver(handleObserver, {
      root: null, rootMargin: '100px', threshold: 0
    });
    if (observerRef.current) ob.observe(observerRef.current);
    return () => ob.disconnect();
  }, [handleObserver]);

  // 瀑布流分栏
  const colStories: typeof stories[] = Array.from({ length: cols }, () => []);
  stories.forEach((s, i) => colStories[i % cols].push(s));
  const gap = cols === 1 ? 12 : cols === 2 ? 16 : 24;

  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap
      }}>
        {colStories.map((col, ci) => (
          <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap }}>
            {col.map((s, i) => (
              <StoryCard key={s.id} story={s} index={ci + i * cols} />
            ))}
          </div>
        ))}
      </div>

      <div ref={observerRef} style={{ height: 40, margin: '24px 0' }}>
        {loading && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            加载更多故事...
          </div>
        )}
        {!hasMore && stories.length > 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            🌙 已经到底啦
          </div>
        )}
      </div>
    </div>
  );
}
