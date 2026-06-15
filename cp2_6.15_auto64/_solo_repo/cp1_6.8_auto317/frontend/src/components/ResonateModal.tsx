import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { createResonance } from '@/api/client';

const EMOJIS = ['🌸', '🌿', '🍃', '🍂', '🌲', '🍎', '🧁', '☕', '📖', '🕯️', '🌊', '🌅', '🍄', '🌾', '🌺', '🪻', '🍊', '🫖', '🧴', '🏔️', '⭐', '🌙', '❄️', '🌈'];

export default function ResonateModal() {
  const { showResonateModal, toggleResonateModal, currentBottle, userId, loadDriftBottles } = useStore();
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = description.trim() && emoji && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !currentBottle) return;
    setSubmitting(true);
    try {
      await createResonance(currentBottle.id, {
        description: description.trim(),
        emoji,
        user_id: userId,
      });
      setDescription('');
      setEmoji('');
      toggleResonateModal();
      loadDriftBottles();
    } catch (e) {
      console.error('Failed to create resonance:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setDescription('');
    setEmoji('');
    toggleResonateModal();
  };

  return (
    <AnimatePresence>
      {showResonateModal && currentBottle && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <div className="absolute inset-0 bg-warm-brown/20 backdrop-blur-sm" />

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md glass-card p-6 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-warm-brown/50 hover:text-warm-brown transition-colors"
            >
              <X size={20} />
            </button>

            <h2 className="font-serif text-xl text-warm-brown mb-4">写下你的共鸣气味</h2>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-gold/10 mb-4">
              <span className="text-3xl">{currentBottle.emoji}</span>
              <p className="text-sm text-warm-brown line-clamp-2">{currentBottle.description}</p>
            </div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="这个气味让你想起了..."
              className="w-full h-24 px-4 py-3 rounded-xl bg-white/50 border border-amber-gold/20 text-warm-brown placeholder:text-warm-brown/30 focus:outline-none focus:border-amber-gold/50 resize-none text-sm"
            />

            <div className="mt-4">
              <p className="text-xs text-warm-brown/60 mb-2">选择一个气味表情</p>
              <div className="grid grid-cols-8 gap-1.5">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                      emoji === e
                        ? 'bg-amber-gold/20 ring-2 ring-amber-gold scale-110'
                        : 'hover:bg-amber-gold/10'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`w-full mt-6 py-3 rounded-xl text-sm font-medium transition-all ${
                canSubmit
                  ? 'bg-amber-gold text-white hover:bg-amber-gold/90'
                  : 'bg-amber-gold/20 text-amber-gold/50 cursor-not-allowed'
              }`}
            >
              {submitting ? '发送中...' : '发送共鸣'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
