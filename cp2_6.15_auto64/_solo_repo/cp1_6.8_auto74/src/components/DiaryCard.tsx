import { DiaryEntry, MoodColor } from '../types';
import { MOOD_LABEL_MAP } from '../constants';
import { X } from 'lucide-react';

interface DiaryCardProps {
  entry: DiaryEntry;
  onClose: () => void;
}

export default function DiaryCard({ entry, onClose }: DiaryCardProps) {
  const date = new Date(entry.createdAt);
  const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const label = MOOD_LABEL_MAP[entry.moodColor as MoodColor];

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

        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-4 h-4 rounded-full shadow-sm"
            style={{
              backgroundColor: entry.moodColor,
              boxShadow: `0 0 8px ${entry.moodColor}80`,
            }}
          />
          <span className="text-sm font-medium text-[#8B7B6B]">{label}</span>
        </div>

        <p className="text-[#3D2E26] text-base leading-relaxed whitespace-pre-wrap mb-6">
          {entry.text}
        </p>

        <div className="text-xs text-[#B0A090]">
          {dateStr} {timeStr}
        </div>
      </div>
    </div>
  );
}
