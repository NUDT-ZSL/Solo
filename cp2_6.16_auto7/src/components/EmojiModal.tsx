import React, { useMemo } from 'react';
import type { Emoji } from '../types';
import { mockEmojis } from '../data/mockEmojis';

interface EmojiModalProps {
  emoji: Emoji;
  isFavorited: boolean;
  onClose: () => void;
  onToggleFavorite: (emojiId: number) => void;
  onSelectEmoji: (emoji: Emoji) => void;
}

export const EmojiModal: React.FC<EmojiModalProps> = ({
  emoji,
  isFavorited,
  onClose,
  onToggleFavorite,
  onSelectEmoji
}) => {
  const similarEmojis = useMemo(() => {
    const sameCategory = mockEmojis.filter(
      (e) => e.category === emoji.category && e.id !== emoji.id
    );
    const shuffled = [...sameCategory].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 6);
  }, [emoji.id, emoji.category]);

  const unicodeHex = useMemo(() => {
    return Array.from(emoji.unicode)
      .map((c) => 'U+' + c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0'))
      .join(' ');
  }, [emoji.unicode]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSimilarClick = (similar: Emoji) => {
    onSelectEmoji(similar);
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content" role="dialog" aria-modal="true">
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="关闭"
        >
          ×
        </button>

        <div className="modal-header">
          <span className="big-emoji">{emoji.unicode}</span>
          <h2 className="emoji-name">{emoji.name}</h2>
          <div className="emoji-meta">
            <span className="category-tag">{emoji.category}</span>
            <span className="meta-item">
              <span className="label">编码:</span>
              {unicodeHex}
            </span>
          </div>
        </div>

        <div className="modal-body">
          <div className="modal-section">
            <div className="modal-section-title">📖 详细释义</div>
            <div className="modal-section-content">{emoji.meaning}</div>
          </div>

          <div className="modal-section">
            <div className="modal-section-title">📜 历史来源</div>
            <div className="modal-section-content">{emoji.origin}</div>
          </div>

          <div className="modal-section">
            <div className="modal-section-title">💬 使用场景示例</div>
            <div className="usage-scenarios">
              {emoji.usageScenarios.map((scenario, index) => (
                <div key={index} className="usage-card">
                  {scenario}
                </div>
              ))}
            </div>
          </div>

          <div className="modal-section">
            <div className="modal-section-title">✨ 类似表情推荐</div>
            <div className="similar-emojis">
              {similarEmojis.map((similar) => (
                <div
                  key={similar.id}
                  className="similar-card"
                  onClick={() => handleSimilarClick(similar)}
                >
                  <span className="emoji">{similar.unicode}</span>
                  <span className="name">{similar.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <div className="favorites-count">
            ❤️ 收藏数：{emoji.favorites.toLocaleString()}
          </div>
          <button
            className={`modal-favorite-btn ${isFavorited ? 'favorited' : 'not-favorited'}`}
            onClick={() => onToggleFavorite(emoji.id)}
          >
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {isFavorited ? '已收藏' : '收藏'}
          </button>
        </div>
      </div>
    </div>
  );
};
