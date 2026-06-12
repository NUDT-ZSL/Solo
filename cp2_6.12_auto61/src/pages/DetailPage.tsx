import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import CodeHighlight from '../components/CodeHighlight';
import CommentSection from '../components/CommentSection';
import { getSnippet, type Snippet } from '../api/snippets';

const LANG_COLORS: Record<string, { bg: string; color: string }> = {
  javascript: { bg: '#f9e74d33', color: '#f9e74d' },
  python: { bg: '#3b82f633', color: '#60a5fa' },
  html: { bg: '#f9731633', color: '#fb923c' },
  css: { bg: '#a855f733', color: '#c084fc' },
  typescript: { bg: '#3b82f633', color: '#60a5fa' },
  java: { bg: '#ef444433', color: '#f87171' },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 800);
  }, [text]);

  return (
    <motion.button
      onClick={handleCopy}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.9 }}
      style={{
        padding: '8px 16px',
        background: copied ? '#a6e3a122' : '#45475a',
        border: `1px solid ${copied ? '#a6e3a1' : '#585b70'}`,
        borderRadius: 8,
        color: copied ? '#a6e3a1' : '#cdd6f4',
        fontSize: 13,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.span
            key="check"
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 90 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span style={{ color: '#a6e3a1' }}>✓</span>
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.3 }}
            >
              已复制
            </motion.span>
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            📋 复制
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [snippet, setSnippet] = useState<Snippet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    getSnippet(id)
      .then(setSnippet)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p style={{ color: '#6c7086' }}>加载中...</p>
      </div>
    );
  }

  if (error || !snippet) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <h2 style={{ color: '#f38ba8', marginBottom: 16 }}>片段不存在</h2>
        <button
          onClick={() => navigate('/')}
          style={{ padding: '10px 24px', background: '#89b4fa', border: 'none', borderRadius: 8, color: '#1e1e2e', cursor: 'pointer', fontWeight: 600 }}
        >
          返回首页
        </button>
      </div>
    );
  }

  const langStyle = LANG_COLORS[snippet.language.toLowerCase()] || { bg: '#89b4fa33', color: '#89b4fa' };

  return (
    <div style={{ minHeight: '100vh' }}>
      <header
        style={{
          borderBottom: '1px solid #313244',
          padding: '16px 0',
          background: '#181825',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'transparent',
              border: '1px solid #45475a',
              borderRadius: 8,
              color: '#cdd6f4',
              padding: '8px 14px',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            ← 返回
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: '#cdd6f4' }}>{snippet.title}</h1>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span
              style={{
                background: langStyle.bg,
                color: langStyle.color,
                padding: '5px 14px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {snippet.language}
            </span>
            {snippet.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  background: '#89b4fa22',
                  color: '#89b4fa',
                  padding: '4px 12px',
                  borderRadius: 12,
                  fontSize: 12,
                }}
              >
                {tag}
              </span>
            ))}
            <span style={{ fontSize: 12, color: '#6c7086' }}>
              {new Date(snippet.created_at).toLocaleString('zh-CN')}
            </span>
          </div>
          <CopyButton text={snippet.code} />
        </div>

        <CodeHighlight code={snippet.code} language={snippet.language} />

        <CommentSection snippetId={snippet.id} />
      </main>
    </div>
  );
}
