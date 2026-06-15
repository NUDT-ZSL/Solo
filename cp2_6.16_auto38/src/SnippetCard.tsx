import React from 'react';
import type { Language, Snippet } from './api';

const LANGUAGE_COLORS: Record<Language, string> = {
  JavaScript: '#f7df1e',
  Python: '#3572A5',
  'HTML/CSS': '#e34f26',
  TypeScript: '#3178c6',
};

const LANGUAGE_TEXT_COLORS: Record<Language, string> = {
  JavaScript: '#333',
  Python: '#fff',
  'HTML/CSS': '#fff',
  TypeScript: '#fff',
};

interface SnippetCardProps {
  snippet: Snippet;
  onClick: (snippet: Snippet) => void;
}

const SnippetCard: React.FC<SnippetCardProps> = ({ snippet, onClick }) => {
  const previewLines = snippet.code.split('\n').slice(0, 5);
  const hasMore = snippet.code.split('\n').length > 5;

  return (
    <div style={styles.card} onClick={() => onClick(snippet)}>
      <div style={styles.title}>{snippet.title}</div>
      <pre style={styles.codePreview}>
        {previewLines.join('\n')}
        {hasMore ? '...' : ''}
      </pre>
      <div
        style={{
          ...styles.langTag,
          backgroundColor: LANGUAGE_COLORS[snippet.language],
          color: LANGUAGE_TEXT_COLORS[snippet.language],
        }}
      >
        {snippet.language}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    width: 280,
    height: 200,
    borderRadius: 12,
    background: '#ffffff',
    border: '1px solid #e0e0e0',
    padding: 16,
    position: 'relative',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    color: '#333',
    marginBottom: 8,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  codePreview: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#666',
    overflow: 'hidden',
    margin: 0,
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  langTag: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    borderRadius: 4,
    fontSize: 12,
    padding: '2px 8px',
    fontWeight: 500,
  },
};

export default SnippetCard;
