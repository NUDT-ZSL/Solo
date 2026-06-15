import { memo } from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import type { CodeSnippet } from '../types';
import { LANGUAGE_COLORS } from '../types';

interface SnippetCardProps {
  snippet: CodeSnippet;
  index: number;
  onClick: () => void;
}

const SnippetCard = memo(function SnippetCard({ snippet, index, onClick }: SnippetCardProps) {
  const codeLines = snippet.code.split('\n').slice(0, 5);
  const langColor = LANGUAGE_COLORS[snippet.language] || '#667eea';
  const statusLabel: Record<string, string> = {
    pending: '待审',
    approved: '已通过',
    changes_requested: '需修改',
  };

  return (
    <div
      className="snippet-card card-enter"
      style={{ animationDelay: `${index * 0.06}s` }}
      onClick={onClick}
    >
      <div className="card-header">
        <span className="card-language-tag" style={{ backgroundColor: langColor }}>
          {snippet.language}
        </span>
        <span className={`card-status card-status-${snippet.status}`}>
          {statusLabel[snippet.status] || snippet.status}
        </span>
      </div>
      <div className="card-code-preview">
        {codeLines.map((line, i) => (
          <div className="card-code-line" key={i}>
            <span className="card-line-number">{i + 1}</span>
            <span className="card-line-content">{line}</span>
          </div>
        ))}
      </div>
      <div className="card-footer">
        <div className="card-author-avatar">
          {snippet.author.name.charAt(0)}
        </div>
        <span className="card-author-name">{snippet.author.name}</span>
        <span className="card-stat">
          <Heart size={16} /> {snippet.likes}
        </span>
        <span className="card-stat">
          <MessageCircle size={16} /> {snippet.comments.length}
        </span>
      </div>
    </div>
  );
});

export default SnippetCard;
