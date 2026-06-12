import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => void;
  toolName?: string;
}

export const RatingModal: React.FC<RatingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  toolName,
}) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleStarClick = (value: number) => {
    setRating(value);
  };

  const handleSubmit = () => {
    if (rating === 0) return;
    setSubmitted(true);
    setTimeout(() => {
      onSubmit(rating, comment);
      onClose();
      setSubmitted(false);
      setRating(0);
      setComment('');
    }, 500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <motion.div
            className="relative w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">评价工具</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {toolName && (
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <span className="text-sm text-gray-500">正在评价</span>
                  <p className="font-semibold text-gray-800">{toolName}</p>
                </div>
              )}

              <div className="text-center mb-8">
                <p className="text-gray-600 mb-4">您对这次借用体验满意吗？</p>
                <div className="flex justify-center gap-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <motion.button
                      key={star}
                      onClick={() => handleStarClick(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      whileTap={{ scale: 1.3, rotate: [-5, 5, 0] }}
                      transition={{ duration: 0.15 }}
                      className="text-4xl focus:outline-none"
                    >
                      <span
                        className={`transition-all duration-200 ${
                          (hoverRating || rating) >= star
                            ? 'text-yellow-400 drop-shadow-sm'
                            : 'text-gray-300'
                        }`}
                      >
                        ★
                      </span>
                    </motion.button>
                  ))}
                </div>
                {rating > 0 && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 text-sm text-gray-500"
                  >
                    {rating === 1 && '非常不满意'}
                    {rating === 2 && '不满意'}
                    {rating === 3 && '一般'}
                    {rating === 4 && '满意'}
                    {rating === 5 && '非常满意'}
                  </motion.p>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  简短评价
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="分享您的使用体验..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400 resize-none transition-all"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={rating === 0 || submitted}
                className={`w-full h-10 rounded-lg font-semibold transition-all duration-200
                  ${rating === 0 || submitted
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-400 to-green-600 text-white hover:shadow-lg hover:-translate-y-0.5'
                  }`}
              >
                {submitted ? '已提交 ✓' : '提交评价'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
