import { useEffect, useRef, useCallback, useState } from 'react';
import { useStore } from '../store/useStore';
import StoryCard from './StoryCard';

export default function TimeWall() {
  const { stories, hasMore, loading, loadStories } = useStore();
  const observerRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(3);

  useEffect(() => {
    loadStories(1);
  }, [loadStories]);

  useEffect(() => {
    const updateColumns = () => {
      const w = window.innerWidth;
      if (w < 768) setColumns(1);
      else if (w < 1200) setColumns(2);
      else setColumns(3);
    };
    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !loading) {
        loadStories();
      }
    },
    [hasMore, loading, loadStories]
  );

  useEffect(() => {
    const option = {
      root: null,
      rootMargin: '100px',
      threshold: 0
    };
    const observer = new IntersectionObserver(handleObserver, option);
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [handleObserver]);

  const columnStories: typeof stories[] = Array.from({ length: columns }, () => []);
  stories.forEach((story, i) => {
    columnStories[i % columns].push(story);
  });

  const gap = columns === 1 ? 12 : columns === 2 ? 16 : 24;

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap
        }}
      >
        {columnStories.map((col, colIndex) => (
          <div key={colIndex} style={{ display: 'flex', flexDirection: 'column', gap }}>
            {col.map((story, i) => (
              <StoryCard key={story.id} story={story} index={colIndex + i * columns} />
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
