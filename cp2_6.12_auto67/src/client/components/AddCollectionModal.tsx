import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

interface AddCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdded: (item: any) => void;
}

type CollectionType = 'book' | 'movie' | 'music';

const typeInfo = {
  book: { label: '书籍', placeholder: '书名', creatorLabel: '作者' },
  movie: { label: '电影', placeholder: '电影名', creatorLabel: '导演' },
  music: { label: '音乐', placeholder: '专辑名', creatorLabel: '艺术家' },
};

const AddCollectionModal = ({ isOpen, onClose, onAdded }: AddCollectionModalProps) => {
  const [activeType, setActiveType] = useState<CollectionType>('book');
  const [title, setTitle] = useState('');
  const [creator, setCreator] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [rating, setRating] = useState(5);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle('');
    setCreator('');
    setCoverUrl('');
    setRating(5);
    setFocusedField(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!title.trim() || !creator.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await axios.post('/api/collections', {
        title: title.trim(),
        type: activeType,
        creator: creator.trim(),
        coverUrl: coverUrl.trim() || null,
        rating,
      });
      onAdded(response.data);
      handleClose();
    } catch (error) {
      console.error('添加收藏失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs: CollectionType[] = ['book', 'movie', 'music'];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleClose}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(4px)',
            }}
          />

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1001,
              width: '90%',
              maxWidth: '480px',
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
            }}
          >
            <div style={{ padding: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
                }}
              >
                <h2 style={{ fontSize: '20px', fontWeight: 600 }}>添加收藏</h2>
                <button
                  onClick={handleClose}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: 'var(--border-light)',
                    cursor: 'pointer',
                    fontSize: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-gray)',
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#ddd';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--border-light)';
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ position: 'relative', marginBottom: '24px' }}>
                <div
                  style={{
                    display: 'flex',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '8px',
                    padding: '4px',
                  }}
                >
                  {tabs.map((type) => (
                    <button
                      key={type}
                      onClick={() => setActiveType(type)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        color: activeType === type ? 'var(--primary-purple)' : 'var(--text-gray)',
                        transition: 'color 0.2s ease',
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                      {typeInfo[type].label}
                    </button>
                  ))}
                </div>
                <motion.div
                  animate={{
                    left: tabs.indexOf(activeType) * (100 / tabs.length) + '%',
                    width: 100 / tabs.length + '%',
                  }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    bottom: '4px',
                    height: 'calc(100% - 8px)',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: 'var(--text-gray)' }}>
                    {typeInfo[activeType].placeholder}
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onFocus={() => setFocusedField('title')}
                    onBlur={() => setFocusedField(null)}
                    placeholder={`请输入${typeInfo[activeType].placeholder}`}
                    style={{
                      width: '100%',
                      padding: '10px 0',
                      fontSize: '15px',
                      border: 'none',
                      borderBottom: '2px solid ' + (focusedField === 'title' ? 'var(--primary-purple)' : 'var(--border-light)'),
                      backgroundColor: 'transparent',
                      outline: 'none',
                      transition: 'border-color 0.3s ease',
                      color: 'var(--text-dark)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: 'var(--text-gray)' }}>
                    {typeInfo[activeType].creatorLabel}
                  </label>
                  <input
                    type="text"
                    value={creator}
                    onChange={(e) => setCreator(e.target.value)}
                    onFocus={() => setFocusedField('creator')}
                    onBlur={() => setFocusedField(null)}
                    placeholder={`请输入${typeInfo[activeType].creatorLabel}`}
                    style={{
                      width: '100%',
                      padding: '10px 0',
                      fontSize: '15px',
                      border: 'none',
                      borderBottom: '2px solid ' + (focusedField === 'creator' ? 'var(--primary-purple)' : 'var(--border-light)'),
                      backgroundColor: 'transparent',
                      outline: 'none',
                      transition: 'border-color 0.3s ease',
                      color: 'var(--text-dark)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: 'var(--text-gray)' }}>
                    封面链接（可选）
                  </label>
                  <input
                    type="text"
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    onFocus={() => setFocusedField('coverUrl')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="请输入封面图片URL"
                    style={{
                      width: '100%',
                      padding: '10px 0',
                      fontSize: '15px',
                      border: 'none',
                      borderBottom: '2px solid ' + (focusedField === 'coverUrl' ? 'var(--primary-purple)' : 'var(--border-light)'),
                      backgroundColor: 'transparent',
                      outline: 'none',
                      transition: 'border-color 0.3s ease',
                      color: 'var(--text-dark)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '10px', color: 'var(--text-gray)' }}>
                    个人评分
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <motion.button
                        key={star}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setRating(star)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '28px',
                          color: star <= rating ? 'var(--star-gold)' : 'var(--star-gray)',
                          background: star <= rating ? 'linear-gradient(135deg, #F1C40F, #F39C12)' : 'transparent',
                          WebkitBackgroundClip: star <= rating ? 'text' : 'unset',
                          WebkitTextFillColor: star <= rating ? 'transparent' : 'var(--star-gray)',
                          backgroundClip: star <= rating ? 'text' : 'unset',
                          transition: 'transform 0.2s ease',
                        }}
                      >
                        ★
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={!title.trim() || !creator.trim() || isSubmitting}
                style={{
                  width: '100%',
                  marginTop: '28px',
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: title.trim() && creator.trim()
                    ? 'linear-gradient(135deg, var(--primary-purple), var(--primary-orange))'
                    : 'var(--border-light)',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: title.trim() && creator.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                }}
              >
                {isSubmitting ? '添加中...' : '确认添加'}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AddCollectionModal;
