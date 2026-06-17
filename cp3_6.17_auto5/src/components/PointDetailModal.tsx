import React from 'react';
import { X, CheckCircle, BookOpen, Tag, BarChart3 } from 'lucide-react';
import { KnowledgePoint, Difficulty } from '../types';

interface PointDetailModalProps {
  point: KnowledgePoint;
  isInPath: boolean;
  isReviewed: boolean;
  assessmentScore: number | null;
  onClose: () => void;
  onMarkReviewed: () => void;
}

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  '初级': '#81c784',
  '中级': '#ffb74d',
  '高级': '#e57373',
};

export const PointDetailModal: React.FC<PointDetailModalProps> = ({
  point,
  isInPath,
  isReviewed,
  assessmentScore,
  onClose,
  onMarkReviewed,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <div
        className="relative bg-white rounded-l-2xl shadow-2xl z-10 overflow-hidden animate-slide-in"
        style={{
          width: '380px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          animation: 'slideIn 0.3s ease-out',
        }}
      >
        <style>{`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}</style>

        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2" style={{ color: '#212121' }}>
                {point.title}
              </h2>
              <div className="flex items-center gap-3">
                <span
                  className="px-3 py-1 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: DIFFICULTY_COLORS[point.difficulty] }}
                >
                  {point.difficulty}
                </span>
                {isInPath && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    复习路径中
                  </span>
                )}
                {isReviewed && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    已复习
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} style={{ color: '#757575' }} />
            </button>
          </div>

          {assessmentScore !== null && (
            <div className="mb-4 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={16} style={{ color: '#00bcd4' }} />
                <span className="text-sm font-medium" style={{ color: '#212121' }}>
                  测评得分
                </span>
              </div>
              <div className="flex items-end gap-2">
                <span
                  className="text-3xl font-bold"
                  style={{
                    color: assessmentScore >= 60 ? '#81c784' : '#e57373',
                  }}
                >
                  {assessmentScore}
                </span>
                <span className="text-sm text-gray-500 mb-1">/ 100</span>
              </div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${assessmentScore}%`,
                    backgroundColor: assessmentScore >= 60 ? '#81c784' : '#e57373',
                  }}
                />
              </div>
            </div>
          )}

          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={16} style={{ color: '#00bcd4' }} />
              <span className="text-sm font-medium" style={{ color: '#212121' }}>
                知识点详情
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#424242' }}>
              {point.description}
            </p>
          </div>

          {point.tags.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Tag size={16} style={{ color: '#00bcd4' }} />
                <span className="text-sm font-medium" style={{ color: '#212121' }}>
                  相关标签
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {point.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full text-xs"
                    style={{
                      backgroundColor: 'rgba(0, 188, 212, 0.1)',
                      color: '#00bcd4',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!isReviewed && (
            <button
              onClick={onMarkReviewed}
              className="w-full py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: '#1a237e' }}
            >
              <CheckCircle size={18} />
              完成复习
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
