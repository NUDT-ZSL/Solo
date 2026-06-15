import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import type { Recipe, Ingredient, Comment } from '../types';

interface RecipeDetailProps {
  recipe: Recipe | undefined;
  loading?: boolean;
  onUpdateRecipe?: (recipe: Recipe) => void;
}

const EMOJIS = ['😋', '😍', '🤤', '👍', '👌', '🔥', '💯', '✨', '🌟', '❤️', '🍳', '🥢', '🍴', '😅', '🙏', '🎉'];

export function RecipeDetail({ recipe, loading = false, onUpdateRecipe }: RecipeDetailProps) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [commentText, setCommentText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [localComments, setLocalComments] = useState<Comment[]>([]);

  useEffect(() => {
    if (recipe) {
      setIngredients(recipe.ingredients.map(i => ({ ...i })));
      setLocalComments(recipe.comments || []);
    }
  }, [recipe]);

  const toggleIngredient = (id: string) => {
    setIngredients(prev =>
      prev.map(ing =>
        ing.id === id ? { ...ing, checked: !ing.checked } : ing
      )
    );
  };

  const handleSendComment = () => {
    if (!commentText.trim() || !recipe) return;
    const newComment: Comment = {
      id: uuidv4(),
      author: '我',
      content: commentText.trim(),
      createdAt: new Date().toISOString().split('T')[0]
    };
    const updatedComments = [...localComments, newComment];
    setLocalComments(updatedComments);
    setCommentText('');
    setShowEmoji(false);
    if (onUpdateRecipe) {
      onUpdateRecipe({ ...recipe, comments: updatedComments });
    }
  };

  const insertEmoji = (emoji: string) => {
    setCommentText(prev => prev + emoji);
    setShowEmoji(false);
  };

  if (loading || !recipe) {
    return (
      <div className="detail-page">
        <div className="detail-container">
          <div className="detail-wrapper detail-skeleton">
            <div className="skeleton skel-img"></div>
            <div className="skel-content">
              <div className="skeleton skel-line-1"></div>
              <div className="skeleton skel-line-2"></div>
              <div className="skeleton skel-block"></div>
              <div className="skeleton skel-line-3"></div>
              <div className="skeleton skel-line-4"></div>
              <div className="skeleton skel-line-5"></div>
              <div className="skeleton skel-block"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const difficultyMap: Record<string, string> = {
    easy: '简单',
    medium: '中等',
    hard: '困难'
  };

  return (
    <div className="detail-page">
      <div className="detail-container">
        <Link to="/" className="back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          返回菜谱墙
        </Link>

        <div className="detail-wrapper" style={{ marginTop: '16px' }}>
          <div className="detail-image-wrap">
            <div
              className="image-placeholder detail-image"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '120px'
              }}
            >
              {getFoodEmoji(recipe.cuisine)}
            </div>
          </div>

          <div className="detail-content">
            <div>
              <h1 className="detail-title">{recipe.name}</h1>
              <div className="detail-meta" style={{ marginTop: '12px' }}>
                <span className="meta-item">
                  <span style={{ fontSize: '16px' }}>🍽️</span>
                  {recipe.cuisine}
                </span>
                <span className="meta-item">
                  <span style={{ fontSize: '16px' }}>⏱️</span>
                  {recipe.prepTime}分钟
                </span>
                <span className="meta-item">
                  <span style={{ fontSize: '16px' }}>📊</span>
                  {difficultyMap[recipe.difficulty]}
                </span>
                <div className="rating-stars" style={{ marginLeft: '8px' }}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <span
                      key={i}
                      className={`star ${i <= recipe.rating ? 'filled' : 'empty'}`}
                      style={{
                        color: i <= recipe.rating ? 'var(--accent)' : 'var(--border)',
                        fontSize: '18px'
                      }}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h3 className="detail-section-title">简介</h3>
              <p className="detail-desc">{recipe.description}</p>
            </div>

            <div>
              <h3 className="detail-section-title">食材清单</h3>
              <div className="ingredient-list">
                {ingredients.map(ing => (
                  <div key={ing.id} className="ingredient-item">
                    <div
                      className={`ingredient-check ${ing.checked ? 'checked' : ''}`}
                      onClick={() => toggleIngredient(ing.id)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span className={`ingredient-text ${ing.checked ? 'checked' : ''}`}>
                      {ing.name}
                    </span>
                    <span className={`ingredient-amount ${ing.checked ? 'checked' : ''}`}>
                      {ing.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="detail-section-title">烹饪步骤</h3>
              <div className="steps-list">
                {recipe.steps.map((step, idx) => (
                  <div key={idx} className="step-item">
                    <div className="step-number">{idx + 1}</div>
                    <div className="step-text">{step}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="comments-section">
              <h3 className="detail-section-title">评论 ({localComments.length})</h3>
              <div className="comments-list">
                {localComments.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '12px 0' }}>
                    暂无评论，快来分享你的烹饪心得吧～
                  </p>
                ) : (
                  localComments.map(c => (
                    <div key={c.id} className="comment-item">
                      <div className="comment-avatar">
                        {c.author.charAt(0)}
                      </div>
                      <div className="comment-body">
                        <div className="comment-header">
                          <span className="comment-author">{c.author}</span>
                          <span className="comment-date">{c.createdAt}</span>
                        </div>
                        <p className="comment-content">{c.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="comment-input-wrap">
                <textarea
                  className="comment-input"
                  placeholder="写下你的评论..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendComment();
                    }
                  }}
                  rows={2}
                />
                <button
                  className="emoji-btn"
                  onClick={() => setShowEmoji(!showEmoji)}
                  title="表情"
                >
                  😊
                </button>
                <button
                  className="send-btn"
                  onClick={handleSendComment}
                  title="发送"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>

                {showEmoji && (
                  <div className="emoji-picker">
                    {EMOJIS.map(em => (
                      <span
                        key={em}
                        className="emoji-option"
                        onClick={() => insertEmoji(em)}
                      >
                        {em}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getFoodEmoji(cuisine: string): string {
  const map: Record<string, string> = {
    '川菜': '🌶️',
    '粤菜': '🍗',
    '湘菜': '🐟',
    '鲁菜': '🍖',
    '日料': '🍣',
    '西餐': '🍝'
  };
  return map[cuisine] || '🍲';
}
