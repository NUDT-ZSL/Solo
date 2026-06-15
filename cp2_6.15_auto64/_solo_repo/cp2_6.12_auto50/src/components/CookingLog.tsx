import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Recipe {
  id: string;
  name: string;
  matchScore: number;
  description: string;
  requiredIngredients: string;
  steps: string;
  ingredients: string;
}

interface CookingLogProps {
  recipe: Recipe;
  onSave: (data: { recipeId: string; recipeName: string; matchScore: number; notes: string; rating: number }) => void;
  onBack: () => void;
  initialNotes?: string;
  initialRating?: number;
  readOnly?: boolean;
}

type SaveStatus = 'idle' | 'saving' | 'saved';

const CookingLog: React.FC<CookingLogProps> = ({
  recipe,
  onSave,
  onBack,
  initialNotes = '',
  initialRating = 0,
  readOnly = false,
}) => {
  const [notes, setNotes] = useState(initialNotes);
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [showToast, setShowToast] = useState(false);
  const isDirtyRef = useRef(false);
  const lastSavedNotesRef = useRef(initialNotes);
  const lastSavedRatingRef = useRef(initialRating);

  useEffect(() => {
    if (readOnly) return;

    const interval = setInterval(() => {
      const notesChanged = notes !== lastSavedNotesRef.current;
      const ratingChanged = rating !== lastSavedRatingRef.current;

      if ((notesChanged || ratingChanged) && isDirtyRef.current) {
        setSaveStatus('saving');
        onSave({
          recipeId: recipe.id,
          recipeName: recipe.name,
          matchScore: recipe.matchScore,
          notes,
          rating,
        });
        lastSavedNotesRef.current = notes;
        lastSavedRatingRef.current = rating;
        isDirtyRef.current = false;

        setTimeout(() => {
          setSaveStatus('saved');
          setTimeout(() => {
            setSaveStatus('idle');
          }, 300);
        }, 500);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [notes, rating, recipe, onSave, readOnly]);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    isDirtyRef.current = true;
  };

  const handleRatingClick = (star: number) => {
    if (readOnly) return;
    setRating(star);
    isDirtyRef.current = true;
  };

  const handleSave = () => {
    onSave({
      recipeId: recipe.id,
      recipeName: recipe.name,
      matchScore: recipe.matchScore,
      notes,
      rating,
    });
    lastSavedNotesRef.current = notes;
    lastSavedRatingRef.current = rating;
    isDirtyRef.current = false;
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 1500);
  };

  const displayRating = hoverRating > 0 ? hoverRating : rating;

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '8px' }}>
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#8B4513', flex: 1 }}
        >
          {recipe.name}
        </motion.h1>
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          style={{
            display: 'inline-block',
            padding: '6px 16px',
            borderRadius: '20px',
            backgroundColor: '#F4A460',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            alignSelf: 'center',
          }}
        >
          {recipe.matchScore}% 匹配
        </motion.span>
      </div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={{
          margin: '8px 0 24px 0',
          fontSize: '18px',
          color: '#A0522D',
          fontWeight: 'normal',
          paddingBottom: '16px',
          borderBottom: '2px dashed #F4A460',
        }}
      >
        📝 烹饪日志
      </motion.h2>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          backgroundColor: '#FFFAF0',
          border: '1px solid #F4A460',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          position: 'relative',
        }}
      >
        {!readOnly && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AnimatePresence mode="wait">
              {saveStatus === 'saving' && (
                <motion.span
                  key="saving"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ display: 'inline-flex', alignItems: 'center' }}
                >
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    style={{ display: 'inline-block', width: '14px', height: '14px' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F4A460" strokeWidth="3">
                      <circle cx="12" cy="12" r="10" strokeDasharray="30 60" />
                    </svg>
                  </motion.span>
                </motion.span>
              )}
              {saveStatus === 'saved' && (
                <motion.span
                  key="saved"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  style={{ fontSize: '12px', color: '#228B22', fontWeight: 'bold' }}
                >
                  已自动保存 ✓
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        )}

        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#8B4513', fontSize: '15px' }}>
          烹饪心得
        </label>

        {readOnly ? (
          <div
            style={{
              minHeight: '160px',
              padding: '12px',
              backgroundColor: '#FFF0DB',
              borderRadius: '8px',
              border: '1px solid #FFE4B5',
              color: '#8B4513',
              fontSize: '14px',
              lineHeight: 1.8,
              whiteSpace: 'pre-wrap',
            }}
          >
            {notes || <span style={{ color: '#ccc' }}>暂无笔记</span>}
          </div>
        ) : (
          <>
            <textarea
              value={notes}
              onChange={handleNotesChange}
              maxLength={500}
              placeholder="记录你的烹饪心得、调整建议、口感评价..."
              style={{
                width: '100%',
                minHeight: '160px',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #FFE4B5',
                backgroundColor: '#FFF0DB',
                color: '#8B4513',
                fontSize: '14px',
                lineHeight: 1.8,
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ textAlign: 'right', marginTop: '6px', fontSize: '12px', color: '#A0522D' }}>
              已输入 {notes.length}/500 字
            </div>
          </>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{
          backgroundColor: '#FFFAF0',
          border: '1px solid #F4A460',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '32px',
        }}
      >
        <label style={{ display: 'block', marginBottom: '12px', fontWeight: 'bold', color: '#8B4513', fontSize: '15px' }}>
          你对这道菜的评分
        </label>
        <div
          style={{
            display: 'flex',
            gap: '8px',
            cursor: readOnly ? 'default' : 'pointer',
            userSelect: 'none',
          }}
        >
          {[1, 2, 3, 4, 5].map((star) => {
            const filled = star <= displayRating;
            const isPreview = hoverRating > 0;
            return (
              <motion.span
                key={star}
                animate={{ color: filled ? '#FFD700' : '#ccc' }}
                transition={{ duration: 0.3 }}
                onMouseEnter={() => !readOnly && setHoverRating(star)}
                onMouseLeave={() => !readOnly && setHoverRating(0)}
                onClick={() => handleRatingClick(star)}
                style={{
                  fontSize: isPreview ? '32px' : '36px',
                  lineHeight: 1,
                  textShadow: filled ? '0 2px 4px rgba(255, 215, 0, 0.3)' : 'none',
                  transition: 'font-size 0.2s',
                }}
              >
                ★
              </motion.span>
            );
          })}
        </div>
        {rating > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ marginTop: '8px', fontSize: '13px', color: '#A0522D' }}
          >
            {rating === 1 && '😅 有待改进'}
            {rating === 2 && '🙂 还不错'}
            {rating === 3 && '😊 挺好的'}
            {rating === 4 && '😋 非常好吃'}
            {rating === 5 && '🤩 完美！'}
          </motion.div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={{ display: 'flex', gap: '12px' }}
      >
        {!readOnly && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#F4A460',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            💾 保存日志
          </motion.button>
        )}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onBack}
          style={{
            flex: readOnly ? 1 : undefined,
            width: readOnly ? '100%' : '140px',
            padding: '14px',
            borderRadius: '12px',
            border: '2px solid #F4A460',
            backgroundColor: '#FFF0DB',
            color: '#8B4513',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          ← 返回
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            style={{
              position: 'fixed',
              bottom: '40px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '14px 28px',
              backgroundColor: '#228B22',
              color: '#fff',
              borderRadius: '30px',
              fontSize: '15px',
              fontWeight: 'bold',
              boxShadow: '0 8px 24px rgba(34, 139, 34, 0.3)',
              zIndex: 1000,
              whiteSpace: 'nowrap',
            }}
          >
            ✓ 日志保存成功！
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CookingLog;
