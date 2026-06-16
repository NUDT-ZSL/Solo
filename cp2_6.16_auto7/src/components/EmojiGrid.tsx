import React from 'react';
import type { Emoji, Category } from '../types';
import { EmojiCard } from './EmojiCard';

interface EmojiGridProps {
  emojis: Emoji[];
  favorites: Set<number>;
  searchKeyword: string;
  selectedCategory: Category | null;
  onEmojiClick: (emoji: Emoji) => void;
  onToggleFavorite: (emojiId: number) => void;
}

export const EmojiGrid: React.FC<EmojiGridProps> = ({
  emojis,
  favorites,
  onEmojiClick,
  onToggleFavorite
}) => {
  if (emojis.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        color: '#94a3b8',
        fontSize: 15
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
        <div>没有找到匹配的表情</div>
      </div>
    );
  }

  return (
    <div className="emoji-grid">
      {emojis.map((emoji) => (
        <EmojiCard
          key={emoji.id}
          emoji={emoji}
          isFavorited={favorites.has(emoji.id)}
          onClick={() => onEmojiClick(emoji)}
          onToggleFavorite={(e) => {
            e.stopPropagation();
            onToggleFavorite(emoji.id);
          }}
        />
      ))}
    </div>
  );
};
