import { Sun, Moon, Trash2 } from 'lucide-react';
import { useVoxelStore, PRESET_COLORS } from './store';

export function Controls() {
  const { currentColor, setColor, isDay, toggleDayNight, clearVoxels, voxels } =
    useVoxelStore();

  const handleClear = () => {
    if (voxels.length === 0) return;
    if (window.confirm('确定要清空所有体素块吗？')) {
      clearVoxels();
    }
  };

  const sunGradient = 'linear-gradient(135deg, #ffaa00 0%, #ff6600 100%)';
  const moonGradient = 'linear-gradient(135deg, #3366cc 0%, #1a1a3a 100%)';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-gray-300 tracking-wide">
          昼夜模式
        </h3>
        <button
          onClick={toggleDayNight}
          className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
          style={{
            background: isDay ? sunGradient : moonGradient,
            boxShadow: isDay
              ? '0 0 20px rgba(255, 170, 0, 0.4)'
              : '0 0 20px rgba(51, 102, 204, 0.4)',
          }}
          title={isDay ? '切换到夜晚' : '切换到白天'}
        >
          {isDay ? (
            <Sun size={18} className="text-white" />
          ) : (
            <Moon size={18} className="text-white" />
          )}
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-gray-300 tracking-wide">
          体素颜色
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setColor(color)}
              className="w-10 h-10 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
              style={{
                backgroundColor: color,
                border:
                  currentColor === color
                    ? '3px solid #ffffff'
                    : '2px solid rgba(255,255,255,0.2)',
                boxShadow:
                  currentColor === color
                    ? `0 0 15px ${color}`
                    : '0 2px 8px rgba(0,0,0,0.3)',
              }}
              title={color}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>当前颜色:</span>
          <span
            className="w-6 h-6 rounded"
            style={{ backgroundColor: currentColor }}
          />
          <span className="font-mono">{currentColor}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-gray-300 tracking-wide">
          操作
        </h3>
        <button
          onClick={handleClear}
          className="w-30 h-10 rounded-lg flex items-center justify-center gap-2 text-white font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            width: '120px',
            height: '40px',
            background: 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)',
            boxShadow: '0 4px 15px rgba(255, 68, 68, 0.3)',
          }}
          disabled={voxels.length === 0}
        >
          <Trash2 size={16} />
          <span>清空</span>
        </button>
        <p className="text-xs text-gray-500">
          体素数量: {voxels.length} / 500
        </p>
      </div>

      <div className="pt-4 border-t border-gray-700">
        <h3 className="text-sm font-semibold text-gray-300 tracking-wide mb-2">
          使用说明
        </h3>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• 点击网格生成体素块</li>
          <li>• 拖拽连续生成体素</li>
          <li>• 点击体素块可删除</li>
          <li>• 鼠标滚轮缩放视图</li>
          <li>• 右键拖拽旋转视角</li>
        </ul>
      </div>
    </div>
  );
}
