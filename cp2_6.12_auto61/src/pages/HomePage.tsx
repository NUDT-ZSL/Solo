import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import SnippetCard from '../components/SnippetCard';
import CreateModal from '../components/CreateModal';
import { getSnippets, createSnippet, type Snippet } from '../api/snippets';

export default function HomePage() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    getSnippets()
      .then(setSnippets)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    snippets.forEach((s) => s.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [snippets]);

  const handleCreate = useCallback(
    async (data: { title: string; language: string; code: string; tags: string[] }) => {
      const snippet = await createSnippet(data);
      setSnippets((prev) => [snippet, ...prev]);
      setModalOpen(false);
    },
    []
  );

  const filteredSnippets = useMemo(() => {
    if (!activeTag) return snippets;
    return snippets.filter((s) => s.tags.includes(activeTag));
  }, [snippets, activeTag]);

  return (
    <div style={{ minHeight: '100vh' }}>
      <header
        style={{
          borderBottom: '1px solid #313244',
          padding: '20px 0',
          background: '#181825',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#89b4fa' }}>
            &lt;/&gt; Code Snippets
          </h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setModalOpen(true)}
            style={{
              padding: '10px 24px',
              background: '#89b4fa',
              border: 'none',
              borderRadius: 10,
              color: '#1e1e2e',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + 创建片段
          </motion.button>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
        {allTags.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#6c7086', marginRight: 4 }}>筛选:</span>
            <button
              onClick={() => setActiveTag(null)}
              style={{
                padding: '5px 14px',
                background: !activeTag ? '#89b4fa' : '#282840',
                border: '1px solid #45475a',
                borderRadius: 20,
                color: !activeTag ? '#1e1e2e' : '#cdd6f4',
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              全部
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                style={{
                  padding: '5px 14px',
                  background: activeTag === tag ? '#89b4fa' : '#282840',
                  border: '1px solid #45475a',
                  borderRadius: 20,
                  color: activeTag === tag ? '#1e1e2e' : '#cdd6f4',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#6c7086' }}>加载中...</div>
        ) : snippets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <p style={{ fontSize: 48, marginBottom: 16 }}>📋</p>
            <p style={{ color: '#6c7086', fontSize: 16 }}>还没有代码片段，点击右上角创建第一个吧</p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 16,
            }}
          >
            <AnimatePresence mode="popLayout">
              {snippets.map((snippet) => (
                <SnippetCard
                  key={snippet.id}
                  snippet={snippet}
                  matched={!activeTag || snippet.tags.includes(activeTag)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      <CreateModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleCreate} />

      <style>{`
        @media (max-width: 768px) {
          .snippet-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
