import React from 'react';
import { CodeSnippet } from '../types';

interface CardListProps {
  snippets: CodeSnippet[];
  onCardClick: (id: string) => void;
  onShare: (id: string) => void;
}

const langColors: Record<string, string> = {
  JavaScript: '#f7df1e',
  TypeScript: '#3178c6',
  Python: '#3776ab',
  HTML: '#e34f26',
  CSS: '#1572b6',
};

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
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
  const years = Math.floor(months / 12);
  return `${years}年前`;
}

const CardList: React.FC<CardListProps> = ({ snippets, onCardClick, onShare }) => {
  if (snippets.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 20px',
        color: '#94a3b8',
      }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 16 }}>
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <div style={{ fontSize: 16, fontWeight: 500 }}>暂无代码片段</div>
        <div style={{ fontSize: 14, marginTop: 4 }}>点击右上角"新建"按钮创建你的第一个片段</div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 16,
      padding: 0,
    }}>
      {snippets.map((snippet) => {
        const codeLines = snippet.code.split('\n').slice(0, 5);
        const hasMore = snippet.code.split('\n').length > 5;
        return (
          <div
            key={snippet.id}
            onClick={() => onCardClick(snippet.id)}
            style={{
              width: '100%',
              minHeight: 240,
              maxHeight: 280,
              borderRadius: 12,
              background: '#ffffff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
            }}
          >
            <div style={{
              padding: '14px 16px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{
                fontSize: 15,
                fontWeight: 600,
                color: '#1e293b',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                marginRight: 8,
              }}>
                {snippet.title}
              </div>
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 4,
                background: langColors[snippet.language] || '#6366f1',
                color: snippet.language === 'JavaScript' ? '#1e293b' : '#ffffff',
                flexShrink: 0,
              }}>
                {snippet.language}
              </span>
            </div>
            <div style={{
              padding: '0 16px',
              flex: 1,
              overflow: 'hidden',
              background: '#1e293b',
              margin: '0 12px',
              borderRadius: 6,
              position: 'relative',
            }}>
              <pre style={{
                margin: 0,
                padding: '10px 12px',
                fontSize: 12,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                lineHeight: 1.5,
                color: '#e2e8f0',
                overflow: 'hidden',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}>
                {codeLines.join('\n')}
                {hasMore && (
                  <span style={{ color: '#64748b' }}>{'\n}...'}
                    <span style={{
                      fontSize: 11,
                      color: '#60a5fa',
                      cursor: 'pointer',
                    }}> 展开更多</span>
                  </span>
                )}
              </pre>
            </div>
            <div style={{
              padding: '10px 16px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1, overflow: 'hidden' }}>
                {snippet.tags.slice(0, 3).map((tag) => (
                  <span key={tag} style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: '#e2e8f0',
                    color: '#334155',
                    fontWeight: 500,
                  }}>
                    {tag}
                  </span>
                ))}
                {snippet.tags.length > 3 && (
                  <span style={{ fontSize: 11, color: '#94a3b8', lineHeight: '22px' }}>
                    +{snippet.tags.length - 3}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                  {formatRelativeTime(snippet.createdAt)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onShare(snippet.id);
                  }}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                    color: '#94a3b8',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#3b82f6'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'; }}
                  title="分享"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CardList;
