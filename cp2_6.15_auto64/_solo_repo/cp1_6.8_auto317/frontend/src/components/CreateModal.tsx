import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { createBottle } from '@/api/client';

const EMOJIS = ['🌸', '🌿', '🍃', '🍂', '🌲', '🍎', '🧁', '☕', '📖', '🕯️', '🌊', '🌅', '🍄', '🌾', '🌺', '🪻', '🍊', '🫖', '🧴', '🏔️', '⭐', '🌙', '❄️', '🌈'];

const CATEGORIES = ['自然', '食物', '书香', '生活', '花草', '季节', '城市', '记忆'];

export default function CreateModal() {
  const { showCreateModal, toggleCreateModal, userId, loadDriftBottles } = useStore();
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('');
  const [category, setCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = description.trim() && emoji && category && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await createBottle({
        description: description.trim(),
        emoji,
        category,
        creator_id: userId,
      });
      setDescription('');
      setEmoji('');
      setCategory('');
      toggleCreateModal();
      loadDriftBottles();
    } catch (e) {
      console.error('Failed to create bottle:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setDescription('');
    setEmoji('');
    setCategory('');
    toggleCreateModal();
  };

  return (
    <AnimatePresence>
      {showCreateModal && (
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

            <h2 className="font-serif text-xl text-warm-brown mb-5">投放气味漂流瓶</h2>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述你闻到的气味..."
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

            <div className="mt-4">
              <p className="text-xs text-warm-brown/60 mb-2">选择气味分类</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      category === c
                        ? 'bg-amber-gold text-white'
                        : 'bg-amber-gold/10 text-amber-gold hover:bg-amber-gold/20'
                    }`}
                  >
                    {c}
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
              {submitting ? '投放中...' : '投入漂流海'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
