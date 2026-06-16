import { X, Trash2 } from 'lucide-react';
import { useExhibitionStore } from '@/store';

export default function LoadModal() {
  const { showLoadModal, setShowLoadModal, savedExhibitions, loadExhibition, deleteExhibition } = useExhibitionStore();

  if (!showLoadModal) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1e293b] border border-[#334155] rounded-2xl w-full max-w-md mx-4 overflow-hidden animate-[modalIn_0.2s_ease-out]">
        <div className="flex items-center justify-between p-4 border-b border-[#334155]">
          <h3 className="text-lg font-semibold text-[#f1f5f9]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            加载方案
          </h3>
          <button
            onClick={() => setShowLoadModal(false)}
            className="text-[#94a3b8] hover:text-[#f1f5f9] transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {savedExhibitions.length === 0 ? (
            <div className="p-8 text-center text-[#94a3b8]">
              <p>暂无保存的方案</p>
            </div>
          ) : (
            <div className="space-y-2">
              {savedExhibitions.map((exhibition) => (
                <div
                  key={exhibition.id}
                  className="flex items-center justify-between p-3 bg-[#0f172a] rounded-xl border border-[#334155] hover:border-[#6366f1] transition-colors group"
                >
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => loadExhibition(exhibition.id)}
                  >
                    <h4 className="text-sm font-medium text-[#f1f5f9]">{exhibition.name}</h4>
                    <p className="text-xs text-[#94a3b8] mt-1">
                      {exhibition.walls.length} 个展墙 · {exhibition.exhibits.length} 个展品
                    </p>
                    <p className="text-xs text-[#64748b] mt-0.5">
                      更新于 {new Date(exhibition.updatedAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`确定要删除「${exhibition.name}」吗？`)) {
                        deleteExhibition(exhibition.id);
                      }
                    }}
                    className="p-2 text-[#64748b] hover:text-[#ef4444] opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes modalIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
