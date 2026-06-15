import { useState, useMemo } from 'react';
import type { Article } from '../types';
import { formatTime, getStatusLabel } from '../utils';

interface ArticleListProps {
  articles: Article[];
  selectedId: string | null;
  onSelect: (article: Article) => void;
  onDelete: (articleId: string) => void;
  loading: boolean;
}

function ArticleList({ articles, selectedId, onSelect, onDelete, loading }: ArticleListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const query = searchQuery.toLowerCase();
    return articles.filter(a => 
      a.title.toLowerCase().includes(query) ||
      a.body.toLowerCase().includes(query)
    );
  }, [articles, searchQuery]);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#6c757d' }}>
        加载中...
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div style={{ 
        padding: '40px 20px', 
        textAlign: 'center', 
        color: '#adb5bd',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
        <p style={{ fontSize: 14, marginBottom: 8 }}>暂无文章</p>
        <p style={{ fontSize: 12, color: '#ced4da' }}>点击右上角 + 新建文章</p>
      </div>
    );
  }

  return (
    <>
      <div style={{ padding: '10px 12px 8px', flexShrink: 0 }}>
        <input
          type="text"
          placeholder="🔍 搜索文章..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #dee2e6',
            borderRadius: 8,
            fontSize: 13,
            outline: 'none',
            backgroundColor: '#ffffff',
            transition: 'border-color 0.15s ease'
          }}
        />
      </div>
      
      <div 
        className="article-list"
        style={{ flex: 1, overflowY: 'auto' }}
      >
        {filteredArticles.length === 0 ? (
          <div style={{ 
            padding: 30, 
            textAlign: 'center', 
            color: '#adb5bd',
            fontSize: 13 
          }}>
            未找到匹配的文章
          </div>
        ) : (
          filteredArticles.map(article => {
            const isSelected = selectedId === article.id;
            
            return (
              <div
                key={article.id}
                className={`article-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelect(article)}
                style={{
                  position: 'relative',
                  cursor: 'pointer'
                }}
              >
                <div style={{ marginBottom: 8 }}>
                  <div 
                    className="article-card-title"
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                      color: '#212529',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      wordBreak: 'break-all',
                      marginBottom: 4
                    }}
                  >
                    {article.isDraft && (
                      <span 
                        style={{ 
                          display: 'inline-block',
                          fontSize: 10, 
                          color: '#6c757d', 
                          backgroundColor: '#e9ecef',
                          padding: '2px 6px',
                          borderRadius: 4,
                          marginRight: 6,
                          verticalAlign: 'middle',
                          fontWeight: 500,
                          flexShrink: 0
                        }}
                      >
                        草稿
                      </span>
                    )}
                    {article.title || '无标题文章'}
                  </div>
                  <div 
                    style={{ 
                      fontSize: 12, 
                      color: '#6c757d',
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      wordBreak: 'break-all',
                      minHeight: 36
                    }}
                  >
                    {article.body || '暂无内容'}
                  </div>
                </div>
                
                <div 
                  className="article-card-meta"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    color: '#6c757d',
                    paddingTop: 6,
                    borderTop: '1px solid #f1f3f5'
                  }}
                >
                  <span style={{ fontSize: 11, color: '#adb5bd' }}>
                    {formatTime(article.updatedAt)}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {article.latestPublishStatus && (
                      <span className={`status-tag ${article.latestPublishStatus}`}>
                        {getStatusLabel(article.latestPublishStatus)}
                      </span>
                    )}
                    {article.versionsCount && article.versionsCount > 1 && (
                      <span 
                        style={{ 
                          fontSize: 10, 
                          color: '#6c757d',
                          backgroundColor: '#f1f3f5',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontWeight: 500
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
                        color: '#ced4da',
                        padding: '2px 6px',
                        borderRadius: 4,
                        lineHeight: 1,
                        transition: 'all 0.15s ease'
                      }}
                      title="删除文章"
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.color = '#dc3545';
                        (e.currentTarget as HTMLElement).style.backgroundColor = '#fff5f5';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.color = '#ced4da';
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

export default ArticleList;
