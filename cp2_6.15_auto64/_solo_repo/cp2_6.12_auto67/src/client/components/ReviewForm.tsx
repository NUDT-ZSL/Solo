import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

interface ReviewFormProps {
  collectionId: string;
  onReviewAdded: (review: any) => void;
}

const emotions = [
  { key: 'happy', label: '开心', emoji: '😊', color: '#F1C40F' },
  { key: 'moved', label: '感动', emoji: '🥹', color: '#E74C3C' },
  { key: 'shocked', label: '震撼', emoji: '😮', color: '#9B59B6' },
  { key: 'boring', label: '无聊', emoji: '😴', color: '#7F8C8D' },
  { key: 'bad', label: '差评', emoji: '👎', color: '#E67E22' },
];

const ReviewForm = ({ collectionId, onReviewAdded }: ReviewFormProps) => {
  const [content, setContent] = useState('');
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleEmotion = (key: string) => {
    setSelectedEmotions(prev =>
      prev.includes(key)
        ? prev.filter(e => e !== key)
        : [...prev, key]
    );
  };

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await axios.post('/api/reviews', {
        collectionId,
        content: content.trim(),
        emotions: selectedEmotions,
      });
      onReviewAdded(response.data);
      setContent('');
      setSelectedEmotions([]);
    } catch (error) {
      console.error('发布评价失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--card-white)',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid var(--border-light)',
      }}
    >
      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>发表评价</h3>

      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, 500))}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="分享你的感受..."
          maxLength={500}
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '12px',
            fontSize: '14px',
            border: 'none',
            borderBottom: '2px solid ' + (isFocused ? 'var(--primary-purple)' : 'var(--border-light)'),
            backgroundColor: 'transparent',
            outline: 'none',
            resize: 'vertical',
            transition: 'border-color 0.3s ease',
            fontFamily: 'inherit',
            color: 'var(--text-dark)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '0',
            fontSize: '12px',
            color: content.length >= 450 ? 'var(--primary-orange)' : 'var(--text-gray)',
          }}
        >
          {content.length}/500
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-gray)', marginBottom: '8px' }}>表情标签：</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {emotions.map((emotion) => {
            const isSelected = selectedEmotions.includes(emotion.key);
            return (
              <motion.button
                key={emotion.key}
                onClick={() => toggleEmotion(emotion.key)}
                whileTap={{ scale: 1.1 }}
                animate={isSelected ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.2 }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: '2px solid ' + (isSelected ? emotion.color : 'var(--border-light)'),
                  backgroundColor: isSelected ? emotion.color : 'transparent',
                  color: isSelected ? 'white' : 'var(--text-dark)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>{emotion.emoji}</span>
                <span>{emotion.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSubmit}
        disabled={!content.trim() || isSubmitting}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: content.trim() ? 'var(--primary-purple)' : 'var(--border-light)',
          color: 'white',
          fontSize: '15px',
          fontWeight: 500,
          cursor: content.trim() ? 'pointer' : 'not-allowed',
          transition: 'background-color 0.2s ease',
        }}
      >
        {isSubmitting ? '发布中...' : '发布评价'}
      </motion.button>
    </div>
  );
};

export default ReviewForm;
