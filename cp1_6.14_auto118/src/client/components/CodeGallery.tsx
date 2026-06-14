import { useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import useStore from '../store';
import TagFilter from './TagFilter';
import SnippetCard from './SnippetCard';

interface CodeGalleryProps {
  onSelectSnippet: (id: string) => void;
}

export default function CodeGallery({ onSelectSnippet }: CodeGalleryProps) {
  const snippets = useStore((s) => s.snippets);
  const allTags = useStore((s) => s.allTags);
  const selectedTags = useStore((s) => s.selectedTags);
  const loading = useStore((s) => s.loading);
  const fetchSnippets = useStore((s) => s.fetchSnippets);
  const fetchTags = useStore((s) => s.fetchTags);
  const toggleTag = useStore((s) => s.toggleTag);
  const setShowUploadModal = useStore((s) => s.setShowUploadModal);

  useEffect(() => {
    fetchSnippets();
    fetchTags();
  }, [fetchSnippets, fetchTags]);

  return (
    <>
      <TagFilter
        tags={allTags}
        selectedTags={selectedTags}
        onToggleTag={toggleTag}
      />
      {loading && snippets.length === 0 ? (
        <div className="loading-spinner">
          <Loader2 size={24} className="animate-spin" />
          <span style={{ marginLeft: 8 }}>加载中...</span>
        </div>
      ) : snippets.length === 0 ? (
        <div className="empty-state">
          <p>暂无代码片段，点击 + 上传第一个吧</p>
        </div>
      ) : (
        <div className="gallery-grid">
          {snippets.map((snippet, index) => (
            <SnippetCard
              key={snippet.id}
              snippet={snippet}
              index={index}
              onClick={() => onSelectSnippet(snippet.id)}
            />
          ))}
        </div>
      )}
      <button
        className="fab-button"
        onClick={() => setShowUploadModal(true)}
        title="上传代码片段"
      >
        <Plus size={24} />
      </button>
    </>
  );
}
