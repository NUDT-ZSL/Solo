import { lines, getLineAvgFlow, type Line } from '@/map/stationData';
import { cn } from '@/lib/utils';

interface LineSelectorProps {
  selectedLineIds: string[];
  onLineToggle: (lineId: string) => void;
  currentTime: number;
  mode: 'single' | 'multi';
  onModeChange: (mode: 'single' | 'multi') => void;
}

export default function LineSelector({
  selectedLineIds,
  onLineToggle,
  currentTime,
  mode,
  onModeChange,
}: LineSelectorProps) {
  const handleLineClick = (lineId: string) => {
    if (mode === 'single') {
      if (selectedLineIds.includes(lineId)) {
        onLineToggle('');
      } else {
        onLineToggle(lineId);
      }
    } else {
      onLineToggle(lineId);
    }
  };

  return (
    <div className="w-[200px] flex flex-col h-full bg-[#f8fafc] rounded-xl shadow-lg overflow-hidden">
      <div className="p-4 border-b border-slate-200">
        <h3 className="text-slate-800 text-sm font-semibold mb-3">线路选择</h3>
        <div className="flex bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => onModeChange('single')}
            className={cn(
              'flex-1 text-xs py-1.5 rounded-md transition-all font-medium',
              mode === 'single'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            单选
          </button>
          <button
            onClick={() => onModeChange('multi')}
            className={cn(
              'flex-1 text-xs py-1.5 rounded-md transition-all font-medium',
              mode === 'multi'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            多选
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {lines.map((line: Line) => {
          const isSelected = selectedLineIds.includes(line.id);
          const avgFlow = getLineAvgFlow(line, Math.floor(currentTime));

          return (
            <button
              key={line.id}
              onClick={() => handleLineClick(line.id)}
              className={cn(
                'w-full h-[52px] flex items-center gap-3 transition-all duration-300 text-left group',
                isSelected ? 'bg-[#f0f9ff]' : 'hover:bg-slate-100'
              )}
            >
              <span
                className="h-full flex-shrink-0 transition-all duration-300"
                style={{
                  width: isSelected ? '16px' : '12px',
                  backgroundColor: line.color,
                }}
              />
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    'text-sm font-medium truncate transition-colors duration-200',
                    isSelected ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'
                  )}
                >
                  {line.name}
                </div>
                <div
                  className={cn(
                    'text-xs truncate transition-colors duration-200',
                    isSelected ? 'text-blue-600' : 'text-slate-500'
                  )}
                >
                  平均 {avgFlow.toLocaleString()} 人
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
