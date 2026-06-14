import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Skill, Review } from '../types';
import { apiService } from '../services/apiService';
import './SkillDetail.css';

interface SkillWithUser extends Skill {
  user: User;
}

interface ReviewWithUser extends Review {
  fromUser?: User;
}

interface SkillDetailProps {
  skill: SkillWithUser;
  currentUser: User;
  onClose: () => void;
  onRequestExchange: (skill: SkillWithUser) => void;
}

const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const StarRating: React.FC<{
  rating: number;
  size?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
}> = ({ rating, size = 24, interactive = false, onChange }) => {
  const [hoverRating, setHoverRating] = useState(0);

  const handleClick = (star: number) => {
    if (interactive && onChange) {
      onChange(star);
    }
  };

  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = (hoverRating || rating) >= star;
        return (
          <svg
            key={star}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={filled ? '#f59e0b' : '#475569'}
            style={{
              cursor: interactive ? 'pointer' : 'default',
              transition: 'transform 0.15s',
              transform: interactive && hoverRating === star ? 'scale(1.2)' : 'scale(1)',
            }}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            onClick={() => handleClick(star)}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        );
      })}
    </div>
  );
};

const TimeSlotGrid: React.FC<{ availableSlots: boolean[][] }> = ({ availableSlots }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = Array.from({ length: 7 }, (_, i) => i);

  return (
    <div className="time-slot-grid">
      <div className="time-slot-header">
        <div className="time-slot-corner"></div>
        {dayNames.map((day) => (
          <div key={day} className="time-slot-day-label">{day}</div>
        ))}
      </div>
      <div className="time-slot-body">
        {hours.map((hour) => (
          <div key={hour} className="time-slot-row">
            <div className="time-slot-hour-label">{`${hour}:00`}</div>
            {days.map((day) => (
              <div
                key={`${day}-${hour}`}
                className={`time-slot ${availableSlots[day]?.[hour] ? 'available' : 'unavailable'}`}
                title={availableSlots[day]?.[hour] ? '可预约' : '已约满'}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const ReviewList: React.FC<{ reviews: ReviewWithUser[] }> = ({ reviews }) => {
  if (reviews.length === 0) {
    return (
      <div className="reviews-empty">
        暂无评价
      </div>
    );
  }

  return (
    <div className="reviews-list">
      {reviews.map((review) => (
        <div key={review.id} className="review-item">
          <img src={review.fromUser?.avatar} alt="" className="review-avatar" />
          <div className="review-content">
            <div className="review-header">
              <span className="review-username">{review.fromUser?.nickname}</span>
              <span className="review-date">
                {new Date(review.createdAt).toLocaleDateString('zh-CN')}
              </span>
            </div>
            <StarRating rating={review.rating} size={16} />
            <p className="review-text">{review.comment}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

const SkillDetail: React.FC<SkillDetailProps> = ({
  skill,
  currentUser,
  onClose,
  onRequestExchange,
}) => {
  const [reviews, setReviews] = useState<ReviewWithUser[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const reviewsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiService.getReviews(skill.id).then(setReviews);
  }, [skill.id]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const handleSubmitReview = useCallback(async () => {
    if (!newComment.trim()) return;
    
    setSubmitting(true);
    try {
      await apiService.createReview({
        fromUserId: currentUser.id,
        toUserId: skill.userId,
        skillId: skill.id,
        rating: newRating,
        comment: newComment,
      });
      const updated = await apiService.getReviews(skill.id);
      setReviews(updated);
      setShowReviewForm(false);
      setNewComment('');
      setNewRating(5);
    } catch (error) {
      console.error('Failed to submit review:', error);
    } finally {
      setSubmitting(false);
    }
  }, [currentUser.id, skill.userId, skill.id, newRating, newComment]);

  const isOwnSkill = skill.userId === currentUser.id;

  return (
    <div className="modal-backdrop skill-detail-backdrop" onClick={handleBackdropClick}>
      <div className="modal skill-detail-modal">
        <div className="modal-header">
          <h3>技能详情</h3>
          <button className="close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body skill-detail-body">
          <div className="skill-detail-header">
            <img src={skill.user.avatar} alt={skill.user.nickname} className="detail-avatar" />
            <div className="detail-user-info">
              <h2 className="detail-username">{skill.user.nickname}</h2>
              <div className="detail-skill-title">
                <span className="detail-skill-name">{skill.name}</span>
                <span className="skill-tag detail-tag">{skill.level}</span>
              </div>
              <div className="detail-rating">
                <StarRating rating={skill.avgRating} size={18} />
                <span className="detail-rating-text">
                  {skill.avgRating} 分 · {skill.reviewCount} 条评价
                </span>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h4 className="section-title">技能简介</h4>
            <p className="detail-description">{skill.description}</p>
          </div>

          <div className="detail-section">
            <h4 className="section-title">可教学时间</h4>
            <div className="time-slot-wrapper">
              <TimeSlotGrid availableSlots={skill.availableSlots} />
            </div>
            <div className="time-slot-legend">
              <span className="legend-item">
                <span className="legend-color available"></span>
                可预约
              </span>
              <span className="legend-item">
                <span className="legend-color unavailable"></span>
                已约满
              </span>
            </div>
          </div>

          <div className="detail-section">
            <h4 className="section-title">
              用户评价
              {!isOwnSkill && (
                <button
                  className="add-review-btn"
                  onClick={() => setShowReviewForm(!showReviewForm)}
                >
                  {showReviewForm ? '取消' : '写评价'}
                </button>
              )}
            </h4>

            {showReviewForm && (
              <div className="review-form">
                <div className="rating-input">
                  <span className="rating-label">评分：</span>
                  <StarRating
                    rating={newRating}
                    size={24}
                    interactive
                    onChange={setNewRating}
                  />
                  <span className="rating-value">{newRating} 星</span>
                </div>
                <textarea
                  className="form-textarea"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="分享你的学习体验..."
                  maxLength={100}
                  rows={3}
                />
                <div className="review-form-footer">
                  <span className="char-count">{newComment.length}/100</span>
                  <button
                    className="btn btn-submit"
                    onClick={handleSubmitReview}
                    disabled={submitting || !newComment.trim()}
                  >
                    {submitting ? '提交中...' : '提交评价'}
                  </button>
                </div>
              </div>
            )}

            <div className="reviews-container" ref={reviewsRef}>
              <ReviewList reviews={reviews} />
            </div>
          </div>
        </div>

        {!isOwnSkill && (
          <div className="modal-footer detail-footer">
            <button className="btn btn-cancel" onClick={onClose}>关闭</button>
            <button
              className="btn btn-submit"
              onClick={() => onRequestExchange(skill)}
            >
              发起兑换请求
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillDetail;
