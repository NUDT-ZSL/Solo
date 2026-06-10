import { useState } from 'react';
import { PRESET_COLORS } from '../../../shared/types';
import type { EmotionRecord } from '../../../shared/types';

interface Props {
  open: boolean;
  editingRecord: EmotionRecord | null;
  onClose: () => void;
  onSave: (data: { color: string; text: string; intensity: number; date: string }) => void;
}

export default function EmotionModal({ open, editingRecord, onClose, onSave }: Props) {
  const [color, setColor] = useState(editingRecord?.color || PRESET_COLORS[0]);
  const [text, setText] = useState(editingRecord?.text || '');
  const [intensity, setIntensity] = useState(editingRecord?.intensity || 3);
  const [date] = useState(editingRecord?.date || new Date().toISOString().slice(0, 10));
  const [pulseIdx, setPulseIdx] = useState<number | null>(null);

  if (!open) return null;

  const handleColorClick = (c: string, idx: number) => {
    setColor(c);
    setPulseIdx(idx);
    setTimeout(() => setPulseIdx(null), 200);
  };

  const handleSave = () => {
    if (!text.trim()) return;
    onSave({ color, text: text.trim(), intensity, date });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" style={{ backdropFilter: 'blur(4px)' }} />
      <div
        className="relative z-10 w-full max-w-[400px] mx-4 p-6 rounded-2xl"
        style={{
          backdropFilter: 'blur(12px)',
          background: 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white mb-4">
          {editingRecord ? '编辑心情' : '记录今日心情'}
        </h2>

        <div className="mb-4">
          <label className="text-sm text-white/70 mb-2 block">选择颜色</label>
          <div className="flex flex-wrap gap-3">
            {PRESET_COLORS.map((c, i) => (
              <button
                key={c}
                onClick={() => handleColorClick(c, i)}
                className="w-8 h-8 rounded-full transition-transform duration-200"
                style={{
                  backgroundColor: c,
                  border: color === c ? '3px solid white' : '2px solid rgba(255,255,255,0.3)',
                  transform: color === c ? 'scale(1.3)' : pulseIdx === i ? 'scale(1.2)' : 'scale(1)',
                  boxShadow: color === c ? `0 0 12px ${c}80` : 'none',
                }}
              />
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm text-white/70 mb-2 block">情绪强度</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                onClick={() => setIntensity(v)}
                className="w-10 h-10 rounded-lg font-medium text-sm transition-all duration-200"
                style={{
                  background: intensity >= v ? color : 'rgba(255,255,255,0.15)',
                  color: intensity >= v ? 'white' : 'rgba(255,255,255,0.5)',
                  border: `1px solid ${intensity >= v ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)'}`,
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm text-white/70 mb-2 block">描述心情</label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 50))}
            placeholder="今天的心情是..."
            maxLength={50}
            className="w-full px-4 py-2 rounded-xl bg-white/10 text-white placeholder-white/40 outline-none transition-all duration-300"
            style={{
              border: `1px solid ${text.length > 0 ? color : '#CCCCCC'}`,
            }}
          />
          <div className="text-right text-xs mt-1" style={{ color: text.length > 0 ? color : 'rgba(255,255,255,0.4)' }}>
            {text.length}/50
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl text-white/70 transition-all duration-300 hover:bg-white/10"
            style={{ border: '1px solid rgba(255,255,255,0.2)' }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!text.trim()}
            className="flex-1 py-2 rounded-xl font-medium transition-all duration-300 hover:scale-[1.02] disabled:opacity-40"
            style={{
              background: text.trim() ? color : 'rgba(255,255,255,0.15)',
              color: text.trim() ? 'white' : 'rgba(255,255,255,0.4)',
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
