import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { Article } from '../types';
import { formatTime, getStatusLabel } from '../utils';

interface ArticleListProps {
  articles: Article[];
  selectedId: string | null;
  onSelect: (article: Article) => void;
  onDelete: (articleId: string) => void;
  loading: boolean;
}

const ITEM_HEIGHT = 84;
const OVERSCAN = 5;

function ArticleList({ articles, selectedId, onSelect, onDelete, loading }: ArticleListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const query = searchQuery.toLowerCase();
    return articles.filter(a => 
      a.title.toLowerCase().includes(query) ||
      a.body.toLowerCase().includes(query)
    );
  }, [articles, searchQuery]);

  const totalHeight = filteredArticles.length * ITEM_HEIGHT;

  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    filteredArticles.length,
    Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + OVERSCAN
  );

  const visibleArticles = useMemo(() => {
    return filteredArticles.slice(startIndex, endIndex);
  }, [filteredArticles, startIndex, endIndex]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => {
      setContainerHeight(container.clientHeight);
    };

    updateHeight();
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#6c757d' }}>
        加载中...
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#adb5bd' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
        <p style={{ fontSize: 13 }}>暂无文章，点击右上角 + 新建</p>
      </div>
    );
  }

  return (
    <>
      <div style={{ padding: '8px 12px 4px' }}>
        <input
          type="text"
          placeholder="搜索文章..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '6px 10px',
            border: '1px solid #dee2e6',
            borderRadius: 6,
            fontSize: 13,
            outline: 'none',
            backgroundColor: '#ffffff'
          }}
        />
      </div>
      
      <div
        ref={containerRef}
        className="article-list"
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleArticles.map((article, idx) => {
            const realIndex = startIndex + idx;
            const isSelected = selectedId === article.id;
            
            return (
              <div
                key={article.id}
                className={`article-card ${isSelected ? 'selected' : ''}`}
                style={{
                  position: 'absolute',
                  top: realIndex * ITEM_HEIGHT,
                  left: 0,
                  right: 0,
                  height: ITEM_HEIGHT - 8,
                  marginBottom: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
                onClick={() => onSelect(article)}
              >
                <div>
                  <div className="article-card-title">
                    {article.isDraft && (
                      <span 
                        style={{ 
                          fontSize: 11, 
                          color: '#6c757d', 
                          backgroundColor: '#e9ecef',
                          padding: '1px 6px',
                          borderRadius: 4,
                          marginRight: 6,
                          verticalAlign: 'middle'
                        }}
                      >
                        草稿
                      </span>
                    )}
                    {article.title || '无标题文章'}
                  </div>
                  <div style={{ 
                    fontSize: 12, 
                    color: '#6c757d',
                    display: '-webkit-box',
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    marginBottom: 4
                  }}>
                    {article.body || '暂无内容'}
                  </div>
                </div>
                
                <div className="article-card-meta">
                  <span>{formatTime(article.updatedAt)}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {article.latestPublishStatus && (
                      <span className={`status-tag ${article.latestPublishStatus}`}>
                        {getStatusLabel(article.latestPublishStatus)}
                      </span>
                    )}
                    {article.versionsCount && article.versionsCount > 1 && (
                      <span 
                        style={{ 
                          fontSize: 11, 
                          color: '#6c757d',
                          backgroundColor: '#e9ecef',
                          padding: '1px 6px',
                          borderRadius: 4
                        }}
                        title={`${article.versionsCount}个版本`}
                      >
                        v{article.versionsCount}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(article.id);
                      }}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: 14,
                        color: '#adb5bd',
                        padding: '2px 4px',
                        borderRadius: 4
                      }}
                      title="删除文章"
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.color = '#dc3545';
                        (e.currentTarget as HTMLElement).style.backgroundColor = '#fff5f5';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.color = '#adb5bd';
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredArticles.length === 0 && searchQuery && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: 24,
            textAlign: 'center',
            color: '#adb5bd'
          }}>
            <p style={{ fontSize: 13 }}>未找到匹配的文章</p>
          </div>
        )}
      </div>
    </>
  );
}

export default ArticleList;
