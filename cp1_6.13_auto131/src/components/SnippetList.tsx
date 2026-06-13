import { useNavigate } from 'react-router-dom';
import { Star, Search } from 'lucide-react';
import { Snippet, LANGUAGE_COLORS, Language } from '../types';
import { toggleFavorite } from '../api/snippets';
import { useState } from 'react';

interface SnippetListProps {
  snippets: Snippet[];
  onFavoriteToggle: () => void;
}

const snippetListStyles = `
  .snippet-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 24px;
    padding: 0;
  }

  @media (min-width: 1440px) {
    .snippet-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  @media (max-width: 1200px) {
    .snippet-grid {
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }
  }

  @media (max-width: 992px) {
    .snippet-grid {
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 18px;
    }
  }

  @media (max-width: 768px) {
    .snippet-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
  }

  @media (max-width: 640px) {
    .snippet-grid {
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 14px;
    }
  }

  @media (max-width: 480px) {
    .snippet-grid {
      grid-template-columns: 1fr;
      gap: 12px;
    }
  }

  .snippet-card {
    background: #ffffff;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
    cursor: pointer;
    transition: transform 0.25s ease, box-shadow 0.25s ease;
    display: flex;
    flex-direction: column;
    gap: 12px;
    position: relative;
    animation: slideUp 0.3s ease forwards;
    opacity: 0;
  }

  .snippet-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
  }

  .snippet-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
  }

  .snippet-card-title {
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
    line-height: 1.4;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .snippet-lang-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    letter-spacing: 0.3px;
    flex-shrink: 0;
  }

  .snippet-card-summary {
    font-size: 13px;
    color: #64748b;
    font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
    background: #f8fafc;
    padding: 10px 12px;
    border-radius: 8px;
    line-height: 1.5;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .snippet-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;
  }

  .snippet-card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    flex: 1;
    overflow: hidden;
  }

  .snippet-card-tag {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 4px;
    background: #e2e8f0;
    color: #1e293b;
  }

  .snippet-fav-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s ease;
    flex-shrink: 0;
  }

  .snippet-fav-btn:hover {
    transform: scale(1.2);
  }

  .snippet-fav-btn:active {
    transform: scale(0.9);
  }

  .snippet-fav-btn.active svg {
    fill: #f59e0b;
    color: #f59e0b;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    gap: 16px;
    animation: fadeIn 0.3s ease;
  }

  .empty-state-icon {
    width: 64px;
    height: 64px;
    color: #475569;
    opacity: 0.5;
  }

  .empty-state-text {
    font-size: 16px;
    color: #94a3b8;
    text-align: center;
    line-height: 1.6;
  }
`;

function SnippetCard({
  snippet,
  onFavoriteToggle,
}: {
  snippet: Snippet;
  onFavoriteToggle: () => void;
}) {
  const navigate = useNavigate();
  const [isFav, setIsFav] = useState(snippet.isFavorite);
  const [animating, setAnimating] = useState(false);

  const langColor = LANGUAGE_COLORS[snippet.language as Language] || {
    bg: '#888888',
    text: '#ffffff',
  };

  const summary = snippet.code.substring(0, 80).replace(/\n/g, ' ');

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setAnimating(true);
    try {
      await toggleFavorite(snippet.id);
      setIsFav(!isFav);
      onFavoriteToggle();
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
    setTimeout(() => setAnimating(false), 300);
  };

  return (
    <div
      className="snippet-card"
      onClick={() => navigate(`/snippet/${snippet.id}`)}
      style={{ animationDelay: '0s' }}
    >
      <div className="snippet-card-header">
        <span className="snippet-card-title">{snippet.title}</span>
        <span
          className="snippet-lang-badge"
          style={{
            backgroundColor: langColor.bg,
            color: langColor.text,
          }}
        >
          {snippet.language}
        </span>
      </div>

      <div className="snippet-card-summary">{summary}</div>

      <div className="snippet-card-footer">
        <div className="snippet-card-tags">
          {snippet.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="snippet-card-tag">
              {tag}
            </span>
          ))}
          {snippet.tags.length > 3 && (
            <span className="snippet-card-tag">+{snippet.tags.length - 3}</span>
          )}
        </div>

        <button
          className={`snippet-fav-btn ${isFav ? 'active' : ''}`}
          onClick={handleFavorite}
          style={animating ? { transform: 'scale(0.8)' } : undefined}
        >
          <Star
            size={18}
            fill={isFav ? '#f59e0b' : 'none'}
            color={isFav ? '#f59e0b' : '#94a3b8'}
          />
        </button>
      </div>
    </div>
  );
}

export default function SnippetList({ snippets, onFavoriteToggle }: SnippetListProps) {
  if (snippets.length === 0) {
    return (
      <div className="empty-state">
        <Search className="empty-state-icon" />
        <p className="empty-state-text">
          没有找到匹配的代码片段，试试调整筛选条件吧
        </p>
      </div>
    );
  }

  return (
    <>
      <style>{snippetListStyles}</style>
      <div className="snippet-grid">
        {snippets.map((snippet, index) => (
          <div
            key={snippet.id}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <SnippetCard
              snippet={snippet}
              onFavoriteToggle={onFavoriteToggle}
            />
          </div>
        ))}
      </div>
    </>
  );
}
