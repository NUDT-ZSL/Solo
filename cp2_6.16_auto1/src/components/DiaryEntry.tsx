import { useState, useEffect } from 'react';
import type { DiaryRecord, Book, EmotionType } from '../types';
import { EMOTION_CONFIG, EMOTION_TYPES, MIN_DURATION, MAX_DURATION, DEFAULT_DURATION } from '../utils/constants';
import { createDiaryRecord, updateDiaryRecord } from '../utils/api';

interface DiaryEntryProps {
  books: Book[];
  editingRecord?: DiaryRecord | null;
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function DiaryEntry({ books, editingRecord, onSuccess, onCancel }: DiaryEntryProps) {
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [duration, setDuration] = useState<number>(DEFAULT_DURATION);
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType | null>(null);
  const [poppingEmotion, setPoppingEmotion] = useState<EmotionType | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingRecord) {
      setSelectedBookId(editingRecord.bookId);
      setDuration(editingRecord.duration);
      setSelectedEmotion(editingRecord.emotion);
    } else {
      setSelectedBookId('');
      setDuration(DEFAULT_DURATION);
      setSelectedEmotion(null);
    }
  }, [editingRecord]);

  const handleEmotionClick = (emotion: EmotionType) => {
    setSelectedEmotion(emotion);
    setPoppingEmotion(emotion);
    setTimeout(() => setPoppingEmotion(null), 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBookId || !selectedEmotion || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingRecord && editingRecord.id) {
        await updateDiaryRecord(editingRecord.id, {
          bookId: selectedBookId,
          duration,
          emotion: selectedEmotion,
        });
      } else {
        await createDiaryRecord({
          bookId: selectedBookId,
          duration,
          emotion: selectedEmotion,
        });
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onSuccess();
        if (!editingRecord) {
          setSelectedBookId('');
          setDuration(DEFAULT_DURATION);
          setSelectedEmotion(null);
        }
      }, 600);
    } catch (err) {
      console.error('提交失败:', err);
      alert('提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = selectedBookId && selectedEmotion;

  return (
    <div className="relative w-full">
      {showSuccess && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-10 rounded-2xl">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full bg-green-500/30"
              style={{
                width: '80px',
                height: '80px',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                animation: 'checkmark-ring 0.5s ease-out forwards',
              }}
            />
            <div
              className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center"
              style={{ animation: 'checkmark-expand 0.5s ease-out' }}
            >
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="w-full space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#5d4037' }}>
            选择书籍
          </label>
          <select
            value={selectedBookId}
            onChange={(e) => setSelectedBookId(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-orange-200 focus:border-orange-400 focus:outline-none transition-colors bg-white"
            style={{ color: '#5d4037' }}
          >
            <option value="">请选择一本书籍</option>
            {books.map((book) => (
              <option key={book.id} value={book.id}>
                {book.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#5d4037' }}>
            阅读时长: <span style={{ color: '#ff9800', fontWeight: 700 }}>{duration} 分钟</span>
          </label>
          <input
            type="range"
            min={MIN_DURATION}
            max={MAX_DURATION}
            step={5}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #ff9800 0%, #ff9800 ${((duration - MIN_DURATION) / (MAX_DURATION - MIN_DURATION)) * 100}%, #ffe0b2 ${((duration - MIN_DURATION) / (MAX_DURATION - MIN_DURATION)) * 100}%, #ffe0b2 100%)`,
            }}
          />
          <div className="flex justify-between text-xs mt-1" style={{ color: '#a1887f' }}>
            <span>{MIN_DURATION}分钟</span>
            <span>{MAX_DURATION}分钟</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-3" style={{ color: '#5d4037' }}>
            孩子的情绪
          </label>
          <div className="flex justify-around flex-wrap gap-2">
            {EMOTION_TYPES.map((emotion) => {
              const config = EMOTION_CONFIG[emotion];
              const isSelected = selectedEmotion === emotion;
              const isPopping = poppingEmotion === emotion;

              return (
                <button
                  key={emotion}
                  type="button"
                  onClick={() => handleEmotionClick(emotion)}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-200"
                  style={{
                    backgroundColor: isSelected ? `${config.color}20` : 'transparent',
                    border: `2px solid ${isSelected ? config.color : 'transparent'}`,
                    transform: isPopping ? 'scale(1.2)' : 'scale(1)',
                  }}
                >
                  <span
                    className="text-4xl transition-transform"
                    style={{
                      animation: isPopping ? 'emoji-pop 0.2s ease-out' : 'none',
                    }}
                  >
                    {config.emoji}
                  </span>
                  <span className="text-xs font-medium" style={{ color: config.color }}>
                    {config.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          {onCancel && editingRecord && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl font-medium transition-all duration-200 hover:opacity-90"
              style={{ backgroundColor: '#9e9e9e', color: '#fff' }}
            >
              取消
            </button>
          )}
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className={`${onCancel && editingRecord ? 'flex-1' : 'w-full'} py-3 rounded-xl font-medium text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
            style={{ backgroundColor: '#ff9800' }}
          >
            {isSubmitting ? '提交中...' : editingRecord ? '更新记录' : '保存记录'}
          </button>
        </div>
      </form>
    </div>
  );
}
