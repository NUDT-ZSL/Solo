import { lines, type Line } from '@/map/stationData';
import { cn } from '@/lib/utils';

interface LineSelectorProps {
  selectedLineIds: string[];
  onLineToggle: (lineId: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

export default function LineSelector({
  selectedLineIds,
  onLineToggle,
  onSelectAll,
  onClearAll,
}: LineSelectorProps) {
  return (
    <div className="p-4">
      <h3 className="text-white text-sm font-semibold mb-3">线路选择</h3>
      <div className="flex gap-2 mb-3">
        <button
          onClick={onSelectAll}
          className="flex-1 text-xs px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
        >
          全选
        </button>
        <button
          onClick={onClearAll}
          className="flex-1 text-xs px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
        >
          清空
        </button>
      </div>
      <div className="space-y-2">
        {lines.map((line: Line) => (
          <button
            key={line.id}
            onClick={() => onLineToggle(line.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left',
              selectedLineIds.includes(line.id)
                ? 'bg-slate-700/80'
                : 'bg-slate-800/50 hover:bg-slate-700/50'
            )}
          >
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: line.color }}
            />
            <span
              className={cn(
                'text-sm',
                selectedLineIds.includes(line.id) ? 'text-white' : 'text-slate-400'
              )}
            >
              {line.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
