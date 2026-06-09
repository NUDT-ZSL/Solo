import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '@/store';
import { X, CalendarDays } from 'lucide-react';

export const TagModal: React.FC = () => {
  const { pendingTag, setPendingTag, currentImage } = useAppStore();
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');
  const [plantName, setPlantName] = useState('');
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (pendingTag) {
      const today = new Date().toISOString().slice(0, 10);
      setDate(today);
      setNote('');
      setPlantName(currentImage?.plantName || '');
      setTimeout(() => noteRef.current?.focus(), 50);
    }
  }, [pendingTag, currentImage]);

  if (!pendingTag) return null;

  const handleConfirm = () => {
    const fn = (window as any).__veinCanvasConfirm;
    if (typeof fn === 'function') {
      fn(note.trim(), date, plantName.trim() || (currentImage?.plantName ?? '未知植物'));
    }
  };

  const handleCancel = () => setPendingTag(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={handleCancel}
    >
      <div
        className="animate-modal w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{
          background:
            'linear-gradient(160deg, hsl(140, 28%, 28%) 0%, hsl(140, 30%, 22%) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-serif text-xl font-semibold mb-1"
              style={{ color: 'var(--text-primary)' }}>
              添加叶脉标记
            </h3>
            <p className="text-xs opacity-70" style={{ color: 'var(--text-secondary)' }}>
              记录此刻的自然观察
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-smooth"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--text-secondary)' }}>
              植物名称
            </label>
            <input
              type="text"
              value={plantName}
              onChange={(e) => setPlantName(e.target.value)}
              placeholder="如：枫树、银杏、香樟…"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-smooth"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = 'hsl(140, 40%, 60%)')
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')
              }
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--text-secondary)' }}>
              观察日期
            </label>
            <div className="relative">
              <CalendarDays
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'hsl(140, 30%, 65%)' }}
              />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm outline-none transition-smooth"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-primary)',
                  colorScheme: 'dark',
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = 'hsl(140, 40%, 60%)')
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')
                }
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--text-secondary)' }}>
              观察备注
            </label>
            <textarea
              ref={noteRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="记录叶脉的形态、颜色、位置，或当下的心情…"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none resize-none transition-smooth font-sans"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-primary)',
                lineHeight: 1.6,
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = 'hsl(140, 40%, 60%)')
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')
              }
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-smooth"
            style={{
              background: 'rgba(255,255,255,0.08)',
              color: 'var(--text-primary)',
            }}
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-smooth"
            style={{
              background: 'linear-gradient(135deg, hsl(45, 90%, 55%), hsl(38, 95%, 50%))',
              color: 'hsl(140, 40%, 12%)',
              boxShadow: '0 4px 16px rgba(255, 180, 0, 0.35)',
            }}
          >
            确认标记
          </button>
        </div>
      </div>
    </div>
  );
};
