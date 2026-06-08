import { useState } from 'react';
import { Emotion, EMOTION_LABELS, EMOTION_EMOJIS } from '../PoemEngine';
import { useStore } from '../store/useStore';
import { X, Sparkles } from 'lucide-react';

interface CreatePoemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreatePoemModal({ isOpen, onClose }: CreatePoemModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [emotion, setEmotion] = useState<Emotion>('calm');
  const addPoem = useStore((s) => s.addPoem);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;
    addPoem(title.trim(), content.trim(), emotion);
    setTitle('');
    setContent('');
    setEmotion('calm');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white/70 backdrop-blur-xl rounded-2xl border border-white/40 shadow-[0_8px_32px_rgba(200,149,108,0.15)] animate-float-up overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="font-xiaowei text-xl text-poem-text">创作新诗</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/60 text-poem-muted transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          <div>
            <label className="block text-sm font-serif text-poem-muted mb-1.5">诗题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="为你的诗起一个名字..."
              className="w-full bg-white/60 border border-warmgray/50 rounded-xl px-4 py-2.5 text-sm font-serif text-poem-text placeholder:text-poem-muted/50 focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/30 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-serif text-poem-muted mb-1.5">诗内容</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 200))}
              placeholder="写下你的诗句..."
              className="w-full bg-white/60 border border-warmgray/50 rounded-xl px-4 py-2.5 text-sm font-serif text-poem-text placeholder:text-poem-muted/50 focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/30 transition min-h-[120px] resize-none"
            />
            <p className="text-xs text-poem-muted text-right -mt-2">
              {content.length}/200
            </p>
          </div>

          <div>
            <label className="block text-sm font-serif text-poem-muted mb-1.5">情感标签</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(EMOTION_LABELS) as Emotion[]).map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmotion(e)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-serif transition cursor-pointer ${
                    emotion === e
                      ? 'bg-amber/20 border-amber/50 text-amber-dark'
                      : 'bg-white/40 border-white/30 text-poem-muted hover:bg-white/60'
                  }`}
                >
                  <span>{EMOTION_EMOJIS[e]}</span>
                  <span>{EMOTION_LABELS[e]}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim()}
            className={`w-full py-2.5 rounded-xl bg-amber text-white font-serif text-sm hover:bg-amber-dark transition flex items-center justify-center gap-2 ${
              !title.trim() || !content.trim() ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Sparkles size={16} />
            生成诗篇
          </button>
        </div>
      </div>
    </div>
  );
}
