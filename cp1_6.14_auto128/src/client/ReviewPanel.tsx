import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import http from './http';

interface Submission {
  id: string;
  userId: string;
  userNickname: string;
  classId: string;
  assignmentId: string;
  title: string;
  imageUrl: string;
  createdAt: string;
}

interface Review {
  id: string;
  submissionId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface DeadlineConfig {
  classId: string;
  assignmentId: string;
  startDate: string;
  endDate: string;
  isLocked: boolean;
}

interface Props {
  submissionId: string | null;
  onBack: () => void;
}

const ReviewPanel: React.FC<Props> = ({ submissionId, onBack }) => {
  const { user, isTeacher } = useAuth();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [flashSuccess, setFlashSuccess] = useState(false);
  const [deadline, setDeadline] = useState<DeadlineConfig | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const fetchSubmission = useCallback(async () => {
    if (!submissionId) return;
    try {
      const res = await http.get(`/submissions/${submissionId}`);
      setSubmission(res.data);
    } catch (err) {
      console.error('Failed to load submission:', err);
    }
  }, [submissionId]);

  const fetchReviews = useCallback(async () => {
    if (!submissionId) return;
    try {
      const [revRes, statsRes] = await Promise.all([
        http.get(`/reviews/submission/${submissionId}`),
        http.get(`/reviews/stats/${submissionId}`),
      ]);
      setReviews(revRes.data);
      setAvgRating(statsRes.data.avgRating);
      setReviewCount(statsRes.data.reviewCount);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    }
  }, [submissionId]);

  const fetchDeadline = useCallback(async () => {
    if (!submission) return;
    try {
      const res = await http.get('/reviews/deadline', {
        params: {
          classId: submission.classId,
          assignmentId: submission.assignmentId,
        },
      });
      setDeadline(res.data);
      setIsLocked(res.data.isLocked);
    } catch (err) {
      console.error('Failed to load deadline:', err);
    }
  }, [submission]);

  useEffect(() => {
    fetchSubmission();
  }, [fetchSubmission]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    fetchDeadline();
  }, [fetchDeadline]);

  const handleSubmitReview = async () => {
    if (!submissionId || !user) return;

    if (isLocked) {
      console.log(
        `[评分锁定] 作业 ${submissionId} 评分已截止，无法提交评分。`
      );
      return;
    }

    if (selectedRating === 0) return;

    setSubmitting(true);
    try {
      await http.post('/reviews', {
        submissionId,
        reviewerId: user.id,
        rating: selectedRating,
        comment,
      });

      setFlashSuccess(true);
      setTimeout(() => setFlashSuccess(false), 200);

      setSelectedRating(0);
      setComment('');

      await fetchReviews();
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const remainingChars = 200 - comment.length;
  const isOwnSubmission = user?.id === submission?.userId;
  const canReview = !isOwnSubmission && !isTeacher && !isLocked;

  if (!submission) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="review-panel fade-in">
      <button className="back-btn" onClick={onBack}>
        ← 返回列表
      </button>

      <div className="review-content">
        <div className="review-image-section">
          <img
            src={submission.imageUrl}
            alt={submission.title}
            className="review-image"
          />
          <div className="review-meta">
            <h3>{submission.userNickname} 的作业</h3>
            <p className="review-title">{submission.title}</p>
            <p className="review-date">
              提交于 {new Date(submission.createdAt).toLocaleString('zh-CN')}
            </p>
          </div>
        </div>

        <div className="review-stats-section">
          <div className="stats-card">
            <div className="stats-avg">
              <span className="avg-label">平均得分</span>
              <span className="avg-value">{avgRating}</span>
            </div>
            <div className="stats-count">
              {reviewCount} 人已评分
            </div>
          </div>
        </div>

        {!isTeacher && !isOwnSubmission && (
          <div className="review-form-section">
            <h3>匿名评分</h3>

            {isLocked && (
              <div className="deadline-locked">
                评分已截止，无法继续评分
              </div>
            )}

            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`star ${
                    star <= (hoverRating || selectedRating)
                      ? 'star-active'
                      : ''
                  }`}
                  onClick={() => canReview && setSelectedRating(star)}
                  onMouseEnter={() => canReview && setHoverRating(star)}
                  onMouseLeave={() => canReview && setHoverRating(0)}
                >
                  ★
                </span>
              ))}
              <span className="rating-text">
                {selectedRating > 0 ? `${selectedRating} 分` : '请选择评分'}
              </span>
            </div>

            <div className="comment-section">
              <textarea
                className="comment-input"
                value={comment}
                onChange={(e) => {
                  if (e.target.value.length <= 200) {
                    setComment(e.target.value);
                  }
                }}
                placeholder="请输入评语（匿名，最多200字）"
                disabled={!canReview}
                rows={4}
              />
              <div className="char-count">
                <span
                  className={remainingChars < 30 ? 'char-warning' : ''}
                >
                  剩余 {remainingChars} 字
                </span>
              </div>
            </div>

            <button
              className={`btn-primary submit-btn ${flashSuccess ? 'btn-flash-success' : ''} ${submitting || selectedRating === 0 ? 'btn-disabled' : ''}`}
              onClick={handleSubmitReview}
              disabled={submitting || selectedRating === 0 || isLocked}
            >
              {submitting ? '提交中...' : '提交评分'}
            </button>
          </div>
        )}

        {isOwnSubmission && (
          <div className="own-submission-notice">
            这是您自己的作业，无法为自己评分
          </div>
        )}

        <div className="reviews-list-section">
          <h3>评语列表（{reviews.length}）</h3>
          {reviews.length === 0 ? (
            <div className="empty-state">暂无评语</div>
          ) : (
            <div className="reviews-list">
              {reviews.map((rev) => (
                <div key={rev.id} className="review-item">
                  <div className="review-item-header">
                    <div className="review-item-stars">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span
                          key={s}
                          className={`star-sm ${s <= rev.rating ? 'star-active' : ''}`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="review-item-date">
                      {new Date(rev.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  {rev.comment && (
                    <p className="review-item-comment">{rev.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewPanel;
