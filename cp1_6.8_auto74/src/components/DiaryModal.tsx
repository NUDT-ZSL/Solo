import { useState } from 'react';
import { MoodColor } from '../types';
import { MOOD_COLORS } from '../constants';
import { useDiaryStore } from '../DiaryStore';
import { X, Send } from 'lucide-react';

interface DiaryModalProps {
  open: boolean;
  onClose: () => void;
}

export default function DiaryModal({ open, onClose }: DiaryModalProps) {
  const [text, setText] = useState('');
  const [selectedColor, setSelectedColor] = useState<MoodColor>(MOOD_COLORS[0].color);
  const addEntry = useDiaryStore((s) => s.addEntry);

  if (!open) return null;

  const handleSubmit = () => {
    if (!text.trim()) return;
    addEntry(text.trim(), selectedColor);
    setText('');
    setSelectedColor(MOOD_COLORS[0].color);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative mx-4 w-full max-w-md rounded-3xl p-8 shadow-2xl"
        style={{
          background: 'rgba(255,255,255,0.55)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full transition-colors hover:bg-black/5"
        >
          <X size={18} className="text-[#8B7B6B]" />
        </button>

        <h2 className="text-xl font-semibold text-[#3D2E26] mb-6">写日记</h2>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="今天心情如何..."
          className="w-full h-32 resize-none rounded-2xl p-4 text-sm text-[#3D2E26] placeholder-[#C4B8AC] outline-none transition-shadow focus:shadow-[0_0_0_2px_rgba(255,154,162,0.4)]"
          style={{
            background: 'rgba(255,255,255,0.5)',
            border: '1px solid rgba(255,255,255,0.4)',
          }}
        />

        <div className="mt-5">
          <p className="text-xs text-[#8B7B6B] mb-3">选择心情</p>
          <div className="flex gap-3 flex-wrap">
            {MOOD_COLORS.map((m) => (
              <button
                key={m.color}
                onClick={() => setSelectedColor(m.color)}
                className="group relative w-9 h-9 rounded-full transition-all duration-200"
                style={{
                  backgroundColor: m.color,
                  boxShadow:
                    selectedColor === m.color
                      ? `0 0 0 3px rgba(255,255,255,0.8), 0 0 12px ${m.color}60`
                      : `0 0 6px ${m.color}40`,
                  transform: selectedColor === m.color ? 'scale(1.15)' : 'scale(1)',
                }}
                title={m.label}
              />
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: selectedColor,
            color: '#5A4A42',
            boxShadow: `0 4px 16px ${selectedColor}50`,
          }}
        >
          <Send size={16} />
          记录此刻
        </button>
      </div>
    </div>
  );
}
