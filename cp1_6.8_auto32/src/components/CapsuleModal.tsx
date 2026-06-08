import { Capsule, isExpired, getDurationColor, formatDurationLabel, formatDate } from '@/utils/CapsuleEngine';
import { Lock, Unlock, X } from 'lucide-react';

interface CapsuleModalProps {
  capsule: Capsule;
  onClose: () => void;
  onOpen: (id: string) => void;
}

export default function CapsuleModal({ capsule, onClose, onOpen }: CapsuleModalProps) {
  const expired = isExpired(capsule);
  const colors = getDurationColor(capsule.duration);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl p-6 animate-modal-in"
        style={{
          background: `linear-gradient(135deg, rgba(15,15,46,0.92), rgba(10,10,26,0.95))`,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${expired ? colors.primary : 'rgba(255,255,255,0.08)'}`,
          boxShadow: `0 0 40px ${colors.glow}, 0 20px 60px rgba(0,0,0,0.5)`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white/80 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
              boxShadow: `0 0 12px ${colors.glow}`,
            }}
          >
            {expired ? <Unlock size={18} className="text-white" /> : <Lock size={18} className="text-white" />}
          </div>
          <div>
            <div className="text-white/90 text-sm font-medium">
              {formatDurationLabel(capsule.duration)}胶囊
            </div>
            <div className="text-white/40 text-xs">
              创建于 {formatDate(capsule.createdAt)}
            </div>
          </div>
        </div>

        <div
          className="h-px w-full mb-4"
          style={{
            background: `linear-gradient(90deg, transparent, ${colors.primary}40, transparent)`,
          }}
        />

        {expired ? (
          <div>
            <div className="text-white/50 text-xs mb-2">
              开启时间：{formatDate(capsule.openAt)}
            </div>
            <div className="text-white/90 text-base leading-relaxed whitespace-pre-wrap">
              {capsule.content}
            </div>
            {!capsule.isOpened && (
              <button
                onClick={() => onOpen(capsule.id)}
                className="mt-5 w-full py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:brightness-110"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                  boxShadow: `0 0 20px ${colors.glow}`,
                }}
              >
                标记已开启
              </button>
            )}
            {capsule.isOpened && (
              <div className="mt-4 text-center text-xs text-white/30">
                ✓ 已开启
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{
                background: `rgba(255,255,255,0.03)`,
                border: `1px dashed rgba(255,255,255,0.1)`,
              }}
            >
              <Lock size={24} className="text-white/20" />
            </div>
            <div className="text-white/50 text-lg font-light mb-2">未到时</div>
            <div className="text-white/30 text-sm">
              将于 {formatDate(capsule.openAt)} 开启
            </div>
            <div className="mt-3 text-white/20 text-xs">
              剩余 {Math.ceil((new Date(capsule.openAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} 天
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
