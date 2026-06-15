import { useState } from 'react';
import * as api from '../services/api';

interface Props {
  exchangeId: string;
  skillId: string;
  fromUserId: string;
  fromUserName?: string;
  fromUserAvatar?: string;
  toUserId: string;
  onSubmitted?: (review: api.Review) => void;
}

export default function ReviewForm({
  exchangeId,
  skillId,
  fromUserId,
  fromUserName,
  fromUserAvatar,
  toUserId,
  onSubmitted,
}: Props) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload: api.SubmitReviewPayload = {
        exchangeId,
        skillId,
        fromUserId,
        fromUserName: anonymous ? undefined : fromUserName,
        fromUserAvatar: anonymous ? undefined : fromUserAvatar,
        toUserId,
        rating,
        comment,
        anonymous,
      };
      const r = await api.submitReview(payload);
      onSubmitted?.(r);
      setRating(5);
      setComment('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="review-form-card">
      <h3 className="modal-title" style={{ fontSize: 16, marginBottom: 12 }}>
        评价这次交换
      </h3>

      <div style={{ marginBottom: 14 }}>
        <div className="form-label">整体评分</div>
        <div className="rating-bar">
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              className={`rating-star ${n <= (hover || rating) ? 'active' : ''}`}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
            >
              ★
            </span>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">留下你的感受（可选）</label>
        <textarea
          className="form-textarea"
          value={comment}
          maxLength={200}
          onChange={(e) => setComment(e.target.value)}
          placeholder="写点什么帮助其他用户判断～"
        />
        <div className="counter">{comment.length}/200</div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label className="anonymous-check">
          <input
            type="checkbox"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
          />
          匿名评价（对方不会看到你的身份）
        </label>
      </div>

      <button
        className="btn btn-primary"
        style={{ width: '100%' }}
        disabled={submitting}
        onClick={submit}
        type="button"
      >
        {submitting ? '提交中...' : '提交评价'}
      </button>
    </div>
  );
}
