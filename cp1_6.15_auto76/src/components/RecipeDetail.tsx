import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Recipe, User, Comment } from '../business/RecipeEngine';
import { calculateAverageRating, formatTimestamp, sortCommentsByTime } from '../business/RecipeEngine';

interface RecipeDetailProps {
  recipe: Recipe;
  author: User | undefined;
  users: User[];
  onBack: () => void;
  onRate: (recipeId: string, rating: number) => void;
  onAddComment: (recipeId: string, content: string) => void;
}

const EMOJI_LIST = [
  '😋', '🤤', '👍', '❤️', '🔥', '✨', '💯', '👏',
  '🎉', '🥘', '🍜', '🍰', '🍳', '🥗', '🍲', '🥘',
  '💪', '😍', '🤩', '😊', '😘', '🥰', '😋', '🤗',
  '😎', '🤤', '👏', '🙌', '👌', '🤙', '💛', '🌟',
];

const RecipeDetail: React.FC<RecipeDetailProps> = ({ recipe, author, users, onBack, onRate, onAddComment }) => {
  const [hoverRating, setHoverRating] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [commentText, setCommentText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [newCommentIds, setNewCommentIds] = useState<Set<string>>(new Set());
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const avgRating = calculateAverageRating(recipe.ratings);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmojiPicker]);

  const handleStarClick = useCallback((rating: number) => {
    onRate(recipe.id, rating);
  }, [onRate, recipe.id]);

  const toggleStep = useCallback((idx: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const handleAddComment = useCallback(() => {
    if (!commentText.trim()) return;
    onAddComment(recipe.id, commentText.trim());
    setCommentText('');
  }, [commentText, onAddComment, recipe.id]);

  const handleEmojiClick = useCallback((emoji: string) => {
    setCommentText((prev) => prev + emoji);
    if (commentInputRef.current) commentInputRef.current.focus();
  }, []);

  const handleCommentKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleAddComment();
    }
  }, [handleAddComment]);

  const sortedComments = sortCommentsByTime(recipe.comments);
  const getUserById = (userId: string) => users.find((u) => u.id === userId);

  return (
    <div className="detail-page">
      <div className="detail-left">
        <h3 className="detail-section-title">📋 食材清单</h3>
        <ul className="ingredients-list">
          {recipe.ingredients.map((ing, i) => (
            <li key={i}>
              <span>{ing.name}</span>
              <span>{ing.amount}</span>
            </li>
          ))}
        </ul>

        <h3 className="detail-section-title">👨‍🍳 烹饪步骤</h3>
        <div className="steps-timeline">
          {recipe.steps.map((step, i) => (
            <div
              key={i}
              className={`step-item ${completedSteps.has(i) ? 'completed' : ''}`}
            >
              <div className="step-dot">
                {completedSteps.has(i) ? '✓' : i + 1}
              </div>
              <div className="step-description">
                <span className="step-number">步骤 {i + 1}</span>
                {step.description}
              </div>
              <div className="step-meta">
                {step.duration > 0 && <span>⏱ {step.duration}分钟</span>}
              </div>
              {step.tip && <div className="step-tip">💡 {step.tip}</div>}
              <button
                className="step-toggle"
                onClick={() => toggleStep(i)}
              >
                {completedSteps.has(i) ? '↩ 取消完成' : '✓ 标记完成'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="detail-right">
        <button className="detail-back-btn" onClick={onBack}>
          ← 返回食谱列表
        </button>

        {recipe.imageUrl ? (
          <img className="detail-hero-image" src={recipe.imageUrl} alt={recipe.title} />
        ) : (
          <div className="detail-hero-placeholder">🍴</div>
        )}

        <div className="detail-info">
          <h1 className="detail-title">{recipe.title}</h1>

          <div className="detail-author-row">
            {author?.avatarUrl ? (
              <img className="detail-author-avatar" src={author.avatarUrl} alt={author.name} />
            ) : (
              <div className="detail-author-avatar" style={{ background: 'var(--placeholder-beige)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, borderRadius: '50%' }}>👤</div>
            )}
            <div>
              <div className="detail-author-name">{author?.name || '匿名'}</div>
              <div className="detail-author-cuisine">{recipe.cuisine}</div>
            </div>
          </div>

          <div className="detail-rating-row">
            <div className="detail-rating-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`star ${star <= Math.round(hoverRating || avgRating) ? 'filled' : ''}`}
                  onClick={() => handleStarClick(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                >
                  ★
                </span>
              ))}
            </div>
            <span className="detail-rating-text">{avgRating.toFixed(1)}</span>
            <span className="detail-rating-count">({recipe.ratings.length}人评分)</span>
          </div>

          <div className="detail-tags">
            {recipe.tags.map((tag) => (
              <span key={tag} className="detail-tag">{tag}</span>
            ))}
          </div>

          <div className="detail-cooking-time">
            ⏱ 烹饪时间：{recipe.cookingTime}分钟
          </div>
        </div>

        <div className="comments-section">
          <h3 className="comments-title">💬 评论 ({sortedComments.length})</h3>

          <div className="comment-input-wrapper">
            <div className="comment-input-row" style={{ position: 'relative' }}>
              <div ref={emojiPickerRef} style={{ position: 'relative' }}>
                <button
                  className="emoji-picker-trigger"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  type="button"
                >
                  😊
                </button>
                {showEmojiPicker && (
                  <div className="emoji-picker">
                    {EMOJI_LIST.map((emoji, i) => (
                      <button
                        key={i}
                        className="emoji-item"
                        onClick={() => handleEmojiClick(emoji)}
                        type="button"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <textarea
                ref={commentInputRef}
                className="comment-input"
                placeholder="写下你的评论... (Ctrl+Enter 发送)"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={handleCommentKeyDown}
                rows={2}
              />
              <button
                className="comment-submit-btn"
                onClick={handleAddComment}
                disabled={!commentText.trim()}
              >
                发送
              </button>
            </div>
          </div>

          {sortedComments.map((comment) => {
            const commentUser = getUserById(comment.userId);
            const isNew = newCommentIds.has(comment.id);
            return (
              <div
                key={comment.id}
                className="comment-item"
                style={isNew ? { animation: 'commentSlideIn 0.2s ease forwards' } : {}}
              >
                {commentUser?.avatarUrl ? (
                  <img className="comment-avatar" src={commentUser.avatarUrl} alt={commentUser.name} loading="lazy" />
                ) : (
                  <div className="comment-avatar-placeholder">👤</div>
                )}
                <div className="comment-content">
                  <div className="comment-user-name">{commentUser?.name || '匿名用户'}</div>
                  <div className="comment-text">{comment.content}</div>
                  <div className="comment-time">{formatTimestamp(comment.timestamp)}</div>
                </div>
              </div>
            );
          })}

          {sortedComments.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-brown-light)', opacity: 0.6 }}>
              暂无评论，快来第一个留言吧！
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecipeDetail;
