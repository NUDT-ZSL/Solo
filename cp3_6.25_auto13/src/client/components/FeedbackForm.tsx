import { useState } from 'react';
import { useApp } from '../App';

interface FeedbackFormProps {
  marketId: string;
}

const FeedbackForm = ({ marketId }: FeedbackFormProps) => {
  const { addFeedback } = useApp();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      alert('请选择评分');
      return;
    }
    if (!comment.trim()) {
      alert('请填写评论');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      addFeedback(marketId, rating, comment);
      setRating(0);
      setComment('');
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="feedback-form fade-in">
      <h3>提交活动评价</h3>

      <div>
        <label style={{ fontSize: '14px', color: '#6a1b9a', fontWeight: 500, marginBottom: '8px', display: 'block' }}>
          评分
        </label>
        <div className="rating-stars">
          {[1, 2, 3, 4, 5].map(star => (
            <span
              key={star}
              className={'star ' + (((hoverRating || rating) >= star) ? 'active' : '')}
              onClick={() => !loading && setRating(star)}
              onMouseEnter={() => !loading && setHoverRating(star)}
              onMouseLeave={() => !loading && setHoverRating(0)}
            >
              ★
            </span>
          ))}
        </div>
      </div>

      <div>
        <label style={{ fontSize: '14px', color: '#6a1b9a', fontWeight: 500, marginBottom: '8px', display: 'block' }}>
          评论
        </label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="请分享您对本次活动的感受..."
          disabled={loading}
        />
      </div>

      <button onClick={handleSubmit} disabled={loading} style={{ width: '100%' }}>
        {loading ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span className="loading-spinner"></span>
            提交中...
          </span>
        ) : (
          '提交评价'
        )}
      </button>
    </div>
  );
};

export default FeedbackForm;