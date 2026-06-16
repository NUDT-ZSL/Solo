import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { WorkDetail, Anchor, CraftType, Review } from '../types';
import { getWorkDetail, submitReview, addAnchor, updateAnchor, deleteAnchor } from '../utils/mockApi';
import { useAppContext } from '../context/AppContext';
import AnchorMarker from '../components/AnchorMarker';
import StarRating from '../components/StarRating';
import '../styles/Detail.css';

const categoryLabels: Record<string, string> = {
  ceramic: '陶瓷',
  wood: '木工',
  embroidery: '刺绣',
  metal: '金属',
};

const typeLabels: Record<CraftType, string> = {
  material: '材料',
  technique: '技法',
  tool: '工具',
};

const typeOptions: { value: CraftType; label: string }[] = [
  { value: 'material', label: '材料' },
  { value: 'technique', label: '技法' },
  { value: 'tool', label: '工具' },
];

interface NewAnchorData {
  x: number;
  y: number;
  type: CraftType;
  description: string;
}

const Detail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isEditMode } = useAppContext();

  const [work, setWork] = useState<WorkDetail | null>(null);
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [newAnchor, setNewAnchor] = useState<NewAnchorData | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchWorkDetail = async () => {
      setLoading(true);
      try {
        const data = await getWorkDetail(id);
        if (data) {
          setWork(data);
          setAnchors(data.anchors);
          setReviews(data.reviews);
        }
      } catch (error) {
        console.error('Failed to fetch work detail:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkDetail();
  }, [id]);

  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isEditMode || newAnchor) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      setNewAnchor({
        x,
        y,
        type: 'material',
        description: '',
      });
    },
    [isEditMode, newAnchor]
  );

  const handleAnchorPositionChange = useCallback(
    async (anchorId: string, x: number, y: number) => {
      if (!id) return;

      setAnchors((prev) =>
        prev.map((a) => (a.id === anchorId ? { ...a, x, y } : a))
      );

      try {
        await updateAnchor(id, anchorId, { x, y });
      } catch (error) {
        console.error('Failed to update anchor position:', error);
      }
    },
    [id]
  );

  const handleNewAnchorTypeChange = (type: CraftType) => {
    if (!newAnchor) return;
    setNewAnchor({ ...newAnchor, type });
  };

  const handleNewAnchorDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!newAnchor) return;
    setNewAnchor({ ...newAnchor, description: e.target.value });
  };

  const handleSaveNewAnchor = async () => {
    if (!id || !newAnchor || !newAnchor.description.trim()) return;

    try {
      const savedAnchor = await addAnchor(id, {
        x: newAnchor.x,
        y: newAnchor.y,
        type: newAnchor.type,
        description: newAnchor.description.trim(),
      });
      setAnchors((prev) => [...prev, savedAnchor]);
      setNewAnchor(null);
    } catch (error) {
      console.error('Failed to save anchor:', error);
    }
  };

  const handleCancelNewAnchor = () => {
    setNewAnchor(null);
  };

  const handleDeleteAnchor = async (anchorId: string) => {
    if (!id) return;

    try {
      const success = await deleteAnchor(id, anchorId);
      if (success) {
        setAnchors((prev) => prev.filter((a) => a.id !== anchorId));
      }
    } catch (error) {
      console.error('Failed to delete anchor:', error);
    }
  };

  const handleRatingChange = (rating: number) => {
    setUserRating(rating);
  };

  const handleReviewTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReviewText(e.target.value);
  };

  const handleSubmitReview = async () => {
    if (!id || userRating === 0 || !reviewText.trim() || submitting) return;

    setSubmitting(true);
    try {
      const result = await submitReview(id, userRating, reviewText.trim());
      if (result.success && work) {
        setWork({ ...work, averageRating: result.newAverage, reviewCount: work.reviewCount + 1 });
        setReviews((prev) => [result.review, ...prev]);
        setUserRating(0);
        setReviewText('');
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="detail-page">
        <div className="detail-container">
          <div className="loading">加载中...</div>
        </div>
      </div>
    );
  }

  if (!work) {
    return (
      <div className="detail-page">
        <div className="detail-container">
          <div className="no-results">作品不存在</div>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-page">
      <div className="detail-container">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← 返回画廊
        </button>

        <div className="detail-content">
          <div className="detail-image-section">
            <div
              className="detail-image-container"
              onClick={handleImageClick}
            >
              <img src={work.image} alt={work.title} />

              {isEditMode && (
                <div className="edit-mode-hint">
                  点击图片任意位置添加工艺锚点
                </div>
              )}

              {anchors.map((anchor) => (
                <AnchorMarker
                  key={anchor.id}
                  anchor={anchor}
                  isEditMode={isEditMode}
                  onPositionChange={handleAnchorPositionChange}
                />
              ))}

              {newAnchor && (
                <>
                  <div
                    className={`anchor-marker ${newAnchor.type}`}
                    style={{
                      left: `${newAnchor.x}%`,
                      top: `${newAnchor.y}%`,
                    }}
                  />
                  <div className="anchor-edit-popup">
                    <h4>添加工艺锚点</h4>
                    <div className="anchor-type-selector">
                      {typeOptions.map((opt) => (
                        <button
                          key={opt.value}
                          className={`type-option-btn ${newAnchor.type === opt.value ? `active ${opt.value}` : ''}`}
                          onClick={() => handleNewAnchorTypeChange(opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <textarea
                      className="anchor-description-input"
                      placeholder="请输入工艺描述（最多50字）"
                      rows={3}
                      maxLength={50}
                      value={newAnchor.description}
                      onChange={handleNewAnchorDescriptionChange}
                    />
                    <div className="char-count">{newAnchor.description.length}/50</div>
                    <div className="popup-actions">
                      <button className="popup-cancel-btn" onClick={handleCancelNewAnchor}>
                        取消
                      </button>
                      <button
                        className="popup-save-btn"
                        onClick={handleSaveNewAnchor}
                        disabled={!newAnchor.description.trim()}
                      >
                        保存
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="detail-info-section">
            <h1 className="detail-title">{work.title}</h1>
            <div className="detail-author">
              <img src={work.authorAvatar} alt={work.author} />
              <div className="detail-author-info">
                <span className="detail-author-name">{work.author}</span>
                <span className="detail-author-label">手工艺人</span>
              </div>
            </div>
            <span className="detail-category-tag">{categoryLabels[work.category]}</span>
            <p className="detail-description">{work.description}</p>
            <div className="detail-stats">
              <div className="stat-item">
                <div className="stat-value">{work.averageRating}</div>
                <div className="stat-label">评分</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{work.reviewCount}</div>
                <div className="stat-label">评价</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{work.views}</div>
                <div className="stat-label">浏览</div>
              </div>
            </div>
          </div>
        </div>

        <div className="rating-section">
          <h3>作品评分</h3>
          <div className="average-rating-display">
            <StarRating rating={work.averageRating} size="large" />
            <div>
              <div className="average-score">{work.averageRating}</div>
              <div className="average-score-sub">基于 {work.reviewCount} 条评价</div>
            </div>
          </div>

          <div className="user-rating-section">
            <h4>为这件作品评分</h4>
            <div className="user-stars">
              <StarRating
                rating={userRating}
                size="large"
                interactive
                onRate={handleRatingChange}
              />
            </div>
            <textarea
              className="review-input"
              placeholder="分享你的看法（最多200字）"
              rows={3}
              maxLength={200}
              value={reviewText}
              onChange={handleReviewTextChange}
            />
            <div className="char-count">{reviewText.length}/200</div>
            <button
              className="submit-review-btn"
              onClick={handleSubmitReview}
              disabled={userRating === 0 || !reviewText.trim() || submitting}
            >
              {submitting ? '提交中...' : '提交评价'}
            </button>
          </div>

          <h3>用户评价</h3>
          <div className="reviews-list">
            {reviews.map((review) => (
              <div key={review.id} className="review-item">
                <div className="review-header">
                  <div className="review-user">
                    <span className="review-user-name">{review.userName}</span>
                    <StarRating rating={review.rating} />
                  </div>
                  <span className="review-date">{review.createdAt}</span>
                </div>
                <p className="review-comment">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>

        {anchors.length > 0 && (
          <div className="anchors-list-section">
            <h3>工艺标注点</h3>
            <div className="anchors-list">
              {anchors.map((anchor) => (
                <div key={anchor.id} className="anchor-list-item">
                  <div className={`anchor-dot ${anchor.type}`} />
                  <div className="anchor-list-content">
                    <span className={`anchor-list-type ${anchor.type}`}>
                      {typeLabels[anchor.type]}
                    </span>
                    <p className="anchor-list-desc">{anchor.description}</p>
                  </div>
                  {isEditMode && (
                    <button
                      className="anchor-delete-btn"
                      onClick={() => handleDeleteAnchor(anchor.id)}
                    >
                      删除
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Detail;
