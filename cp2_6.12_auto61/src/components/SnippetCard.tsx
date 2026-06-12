import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { Snippet } from '../api/snippets';

const LANG_COLORS: Record<string, { bg: string; color: string }> = {
  javascript: { bg: '#f9e74d33', color: '#f9e74d' },
  python: { bg: '#3b82f633', color: '#60a5fa' },
  html: { bg: '#f9731633', color: '#fb923c' },
  css: { bg: '#a855f733', color: '#c084fc' },
  typescript: { bg: '#3b82f633', color: '#60a5fa' },
  java: { bg: '#ef444433', color: '#f87171' },
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}秒前`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}个月前`;
  return `${Math.floor(months / 12)}年前`;
}

interface Props {
  snippet: Snippet;
  matched: boolean;
}

export default function SnippetCard({ snippet, matched }: Props) {
  const navigate = useNavigate();
  const langStyle = LANG_COLORS[snippet.language.toLowerCase()] || { bg: '#89b4fa33', color: '#89b4fa' };
  const time = useMemo(() => relativeTime(snippet.created_at), [snippet.created_at]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: matched ? 1 : 0.2,
        scale: matched ? 1 : 0.8,
        y: 0,
      }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      whileHover={matched ? { y: -3, boxShadow: '0 8px 30px rgba(0,0,0,0.5)' } : {}}
      onClick={() => matched && navigate(`/snippet/${snippet.id}`)}
      style={{
        background: '#282840',
        borderRadius: 12,
        padding: 20,
        cursor: matched ? 'pointer' : 'default',
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        transition: 'box-shadow 0.2s',
        pointerEvents: matched ? 'auto' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <span
          style={{
            background: langStyle.bg,
            color: langStyle.color,
            padding: '4px 12px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 0.5,
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
              padding: '3px 10px',
              borderRadius: 12,
              fontSize: 11,
            }}
          >
            {tag}
          </span>
        ))}
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: '#cdd6f4', marginBottom: 8, lineHeight: 1.4 }}>
        {snippet.title}
      </h3>
      <p style={{ fontSize: 12, color: '#6c7086' }}>{time}</p>
    </motion.div>
  );
}
