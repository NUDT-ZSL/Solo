import { useState } from 'react';
import type { EmotionRecord } from '../../../shared/types';

interface Props {
  record: EmotionRecord;
  position: { x: number; y: number };
  onEdit: (record: EmotionRecord) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function DetailCard({ record, position, onEdit, onDelete, onClose }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [glowVisible, setGlowVisible] = useState(true);

  const ageLabel = record.intensity >= 4 ? '活力满满' : record.intensity >= 2 ? '沉稳内敛' : '平静如水';

  setTimeout(() => setGlowVisible(false), 3500);

  const cardStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(position.x - 120, window.innerWidth - 280),
    top: Math.max(position.y - 180, 10),
    zIndex: 100,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    background: 'rgba(255,255,255,0.2)',
    border: '1px solid rgba(255,255,255,0.35)',
    borderRadius: '12px',
    padding: '16px',
    minWidth: '220px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  };

  return (
    <>
      <div className="fixed inset-0 z-[99]" onClick={onClose} />
      <div style={cardStyle} className="animate-fadeIn">
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0"
          style={{
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '8px solid rgba(255,255,255,0.2)',
          }}
        />

        {glowVisible && (
          <div
            className="absolute inset-0 rounded-xl animate-glow"
            style={{
              background: `radial-gradient(circle, ${record.color}30 0%, transparent 70%)`,
            }}
          />
        )}

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: record.color, boxShadow: `0 0 8px ${record.color}60` }}
            />
            <span className="text-xs text-white/60">{ageLabel}</span>
          </div>

          <div className="text-white font-medium mb-1">{record.date}</div>
          <div className="text-white/90 text-sm mb-3">{record.text}</div>

          <div className="flex gap-2">
            <button
              onClick={() => onEdit(record)}
              className="flex-1 py-1.5 rounded-lg text-sm text-white/80 transition-all duration-200 hover:bg-white/15"
              style={{ border: '1px solid rgba(255,255,255,0.2)' }}
            >
              编辑
            </button>
            {confirmDelete ? (
              <div className="flex gap-1">
                <button
                  onClick={() => onDelete(record.id)}
                  className="px-3 py-1.5 rounded-lg text-sm text-white bg-red-500/60 transition-all duration-200"
                >
                  确定
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 rounded-lg text-sm text-white/60 transition-all duration-200"
                  style={{ border: '1px solid rgba(255,255,255,0.2)' }}
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex-1 py-1.5 rounded-lg text-sm text-white/60 transition-all duration-200 hover:bg-red-500/20 hover:text-red-300"
                style={{ border: '1px solid rgba(255,255,255,0.15)' }}
              >
                删除
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
