import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import axios from 'axios';
import type { Review } from '../types';
import { useStore } from '../store/useStore';

interface ReviewFormProps {
  bookClubId: string;
  onReviewSubmitted: (review: Review) => void;
}

export default function ReviewForm({ bookClubId, onReviewSubmitted }: ReviewFormProps) {
  const { currentUser } = useStore();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bouncingStar, setBouncingStar] = useState<number | null>(null);

  const handleStarClick = (star: number) => {
    setRating(star);
    setBouncingStar(star);
    setTimeout(() => setBouncingStar(null), 200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 || !content.trim() || submitting) return;

    setSubmitting(true);
    axios.post(`/api/bookclubs/${bookClubId}/reviews`, {
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      rating,
      content: content.trim()
    })
      .then(res => {
        onReviewSubmitted(res.data);
        setRating(0);
        setContent('');
      })
      .catch(err => console.error('提交书评失败:', err))
      .finally(() => setSubmitting(false));
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="bg-white rounded-xl p-5 md:p-6" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <h2 className="text-lg font-bold text-coffee mb-4">发表书评</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="text-sm text-gray-500 mb-2 block">评分</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <motion.button
                key={star}
                type="button"
                onClick={() => handleStarClick(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                animate={bouncingStar === star ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                transition={{ duration: 0.2 }}
                className="text-2xl focus:outline-none cursor-pointer p-0.5"
                style={{ color: star <= displayRating ? '#FFD700' : '#D1D5DB' }}
              >
                ★
              </motion.button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm text-gray-500 mb-2 block">评论内容</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="分享你的阅读感受..."
            rows={4}
            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-violet-theme focus:outline-none transition-colors duration-300 resize-none text-coffee placeholder:text-gray-400"
          />
        </div>

        <motion.button
          type="submit"
          disabled={rating === 0 || !content.trim() || submitting}
          whileTap={{ scale: 0.97 }}
          className={`px-6 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all duration-200 ${
            rating === 0 || !content.trim() || submitting
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-violet-theme text-white hover:bg-violet-600'
          }`}
        >
          <Send className="w-4 h-4" />
          {submitting ? '提交中...' : '提交书评'}
        </motion.button>
      </form>
    </div>
  );
}
