import { useOrigamiStore } from "./store";
import { Clock, RotateCcw } from "lucide-react";

export default function HistoryPanel() {
  const { foldHistory, revertToState, paperState, isAnimating } = useOrigamiStore();

  const currentArea = useOrigamiStore((s) => s.getCurrentArea());
  const foldCount = useOrigamiStore((s) => s.getFoldCount());

  return (
    <div className="history-card flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-gray-600 tracking-wide uppercase">折叠历史</h2>

      <div className="flex-1 overflow-y-auto min-h-0" style={{ maxHeight: "calc(100vh - 320px)" }}>
        {foldHistory.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-8">
            暂无折叠记录
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {foldHistory.map((record, idx) => {
              const isCurrent = idx === foldHistory.length - 1;
              return (
                <button
                  key={record.id}
                  onClick={() => {
                    if (!isAnimating) revertToState(record.id);
                  }}
                  className={`history-item flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-all duration-150 ${
                    isCurrent
                      ? "current-item font-medium"
                      : "hover:bg-gray-50 text-gray-600"
                  }`}
                  style={{
                    transform: "scale(1)",
                    transition: "transform 0.15s ease-out, background-color 0.15s ease-out",
                  }}
                  onMouseDown={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "scale(1.02)";
                  }}
                  onMouseUp={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                  }}
                >
                  <RotateCcw size={12} className="text-gray-400 shrink-0" />
                  <span className="flex-1">折叠#{record.id}</span>
                  <span className="flex items-center gap-1 text-gray-400">
                    <Clock size={10} />
                    {record.timestamp}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 pt-3 mt-auto">
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">当前面积</span>
            <span className="stat-value">{currentArea} px²</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">折叠次数</span>
            <span className="stat-value">{foldCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
