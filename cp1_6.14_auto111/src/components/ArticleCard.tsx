import { useState } from 'react';
import { Article, TAG_COLORS } from '../types';

interface ArticleCardProps {
  article: Article;
  onClick: (article: Article) => void;
}

export function ArticleCard({ article, onClick }: ArticleCardProps) {
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = () => {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 200);
    onClick(article);
  };

  return (
    <div
      className={`article-card ${isClicked ? 'clicked' : ''}`}
      onClick={handleClick}
    >
      <h3 className="article-title">{article.title}</h3>
      <p className="article-date">{article.date}</p>
      <div className="article-tags">
        {article.tags.map((tag) => (
          <span
            key={tag}
            className="tag-badge"
            style={{ backgroundColor: TAG_COLORS[tag] }}
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="article-stats">
        <span className="views">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          {article.views.toLocaleString()}
        </span>
        <span className="likes">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {article.likes.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
