import { useState, useEffect } from 'react';
import { X, RotateCw, Upload, Maximize2, Route, Clock, ImageIcon } from 'lucide-react';
import { useExhibitionStore } from '@/store';
import { calculatePathLength, calculateVisibilityScores } from '@/utils/pathfinding';
import { Exhibit, Wall } from '@/types';

export default function InfoPanel() {
  const {
    currentExhibition,
    path,
    selectedWallId,
    selectedExhibitId,
    updateWall,
    updateExhibit,
    selectedTool,
  } = useExhibitionStore();

  const [pathStats, setPathStats] = useState<{
    pathLength: number;
    estimatedTime: number;
    visibilityScores: { exhibitId: string; visibility: number }[];
  } | null>(null);

  useEffect(() => {
    if (path.length > 0) {
      const length = calculatePathLength(path);
      const scores = calculateVisibilityScores(path, currentExhibition.exhibits, currentExhibition.walls);
      const estimatedTime = (length / 1000) * 1.5;

      setPathStats({
        pathLength: length,
        estimatedTime: estimatedTime,
        visibilityScores: scores,
      });
    }
  }, [path, currentExhibition.exhibits, currentExhibition.walls]);

  const selectedWall = currentExhibition.walls.find((w) => w.id === selectedWallId);
  const selectedExhibit = currentExhibition.exhibits.find((e) => e.id === selectedExhibitId);

  const handleWallChange = (field: keyof Wall, value: number) => {
    if (selectedWallId) {
      updateWall(selectedWallId, { [field]: value });
    }
  };

  const handleExhibitChange = (field: keyof Exhibit, value: number | string) => {
    if (selectedExhibitId) {
      updateExhibit(selectedExhibitId, { [field]: value });
    }
  };

  const getVisibilityColor = (visibility: number) => {
    if (visibility >= 70) return 'bg-green-500';
    if (visibility >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="hidden lg:flex flex-col w-80 bg-[#1e293b] border-l border-[#334155] overflow-hidden">
      <div className="p-4 border-b border-[#334155]">
        <h2 className="text-lg font-semibold text-[#f1f5f9]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
          {currentExhibition.name}
        </h2>
        <p className="text-xs text-[#94a3b8] mt-1">
          更新于 {new Date(currentExhibition.updatedAt).toLocaleString('zh-CN')}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-[#334155]">
          <h3 className="text-sm font-semibold text-[#f1f5f9] mb-3">参观动线统计</h3>
          {pathStats ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#64748b] flex items-center gap-1.5">
                  <Route size={16} />
                  动线长度
                </span>
                <span className="text-sm font-medium text-[#6366f1]">
                  {(pathStats.pathLength / 100).toFixed(2)} 米
                </span>
              </div>
              <div className="w-full h-2 bg-[#334155] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#6366f1] transition-all duration-300"
                  style={{ width: `${Math.min(100, (pathStats.pathLength / 2000) * 100)}%` }}
                />
              </div>

              <div className="flex justify-between items-center mt-4">
                <span className="text-sm text-[#64748b] flex items-center gap-1.5">
                  <Clock size={16} />
                  预计时间
                </span>
                <span className="text-sm font-medium text-[#22c55e]">
                  {pathStats.estimatedTime.toFixed(1)} 分钟
                </span>
              </div>
              <div className="w-full h-2 bg-[#334155] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#22c55e] transition-all duration-300"
                  style={{ width: `${Math.min(100, (pathStats.estimatedTime / 30) * 100)}%` }}
                />
              </div>

              <div className="mt-4">
                <span className="text-sm text-[#94a3b8] block mb-2">展品可达性</span>
                <div className="space-y-2">
                  {pathStats.visibilityScores.map((score) => {
                    const exhibit = currentExhibition.exhibits.find((e) => e.id === score.exhibitId);
                    return (
                      <div key={score.exhibitId} className="flex items-center gap-2">
                        <span className="text-xs text-[#f1f5f9] w-20 truncate">{exhibit?.name || '未知'}</span>
                        <div className="flex-1 h-2 bg-[#334155] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getVisibilityColor(score.visibility)} transition-all duration-300`}
                            style={{ width: `${score.visibility}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-[#f1f5f9] w-10 text-right">{score.visibility}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#64748b]">暂无动线数据</p>
          )}
        </div>

        {selectedWall && (
          <div className="p-4 border-b border-[#334155]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#f1f5f9]">展墙属性</h3>
              <button
                onClick={() => updateWall(selectedWall.id, {})}
                className="text-[#94a3b8] hover:text-[#6366f1] transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-[#94a3b8] block mb-1">X 坐标</label>
                  <input
                    type="number"
                    value={selectedWall.x}
                    onChange={(e) => handleWallChange('x', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 bg-[#0f172a] border border-[#334155] rounded text-sm text-[#f1f5f9] focus:border-[#6366f1] outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#94a3b8] block mb-1">Y 坐标</label>
                  <input
                    type="number"
                    value={selectedWall.y}
                    onChange={(e) => handleWallChange('y', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 bg-[#0f172a] border border-[#334155] rounded text-sm text-[#f1f5f9] focus:border-[#6366f1] outline-none transition-colors"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-[#94a3b8] block mb-1">宽度</label>
                  <input
                    type="number"
                    value={selectedWall.width}
                    onChange={(e) => handleWallChange('width', parseInt(e.target.value) || 20)}
                    className="w-full px-2 py-1.5 bg-[#0f172a] border border-[#334155] rounded text-sm text-[#f1f5f9] focus:border-[#6366f1] outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#94a3b8] block mb-1">高度</label>
                  <input
                    type="number"
                    value={selectedWall.height}
                    onChange={(e) => handleWallChange('height', parseInt(e.target.value) || 20)}
                    className="w-full px-2 py-1.5 bg-[#0f172a] border border-[#334155] rounded text-sm text-[#f1f5f9] focus:border-[#6366f1] outline-none transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-[#94a3b8] block mb-1">
                  <RotateCw size={12} className="inline mr-1" />
                  旋转角度
                </label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={selectedWall.rotation}
                  onChange={(e) => handleWallChange('rotation', parseInt(e.target.value))}
                  className="w-full accent-[#6366f1]"
                />
                <span className="text-xs text-[#6366f1]">{selectedWall.rotation}°</span>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 border-b border-[#334155]">
          <h3 className="text-sm font-semibold text-[#f1f5f9] mb-3">展品详情</h3>
          {selectedExhibit ? (
            <div className="space-y-3">
              <div className="w-full h-32 bg-[#0f172a] rounded-lg overflow-hidden mb-3">
                <img
                  src={selectedExhibit.imageUrl}
                  alt={selectedExhibit.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <label className="text-xs text-[#94a3b8] block mb-1">名称</label>
                <input
                  type="text"
                  value={selectedExhibit.name}
                  onChange={(e) => handleExhibitChange('name', e.target.value)}
                  className="w-full px-2 py-1.5 bg-[#0f172a] border border-[#334155] rounded text-sm text-[#f1f5f9] focus:border-[#6366f1] outline-none transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-[#94a3b8] block mb-1">
                    <Maximize2 size={12} className="inline mr-1" />
                    宽度
                  </label>
                  <input
                    type="number"
                    value={selectedExhibit.width}
                    onChange={(e) => handleExhibitChange('width', parseInt(e.target.value) || 60)}
                    className="w-full px-2 py-1.5 bg-[#0f172a] border border-[#334155] rounded text-sm text-[#f1f5f9] focus:border-[#6366f1] outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#94a3b8] block mb-1">高度</label>
                  <input
                    type="number"
                    value={selectedExhibit.height}
                    onChange={(e) => handleExhibitChange('height', parseInt(e.target.value) || 80)}
                    className="w-full px-2 py-1.5 bg-[#0f172a] border border-[#334155] rounded text-sm text-[#f1f5f9] focus:border-[#6366f1] outline-none transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-[#94a3b8] block mb-1">
                  <RotateCw size={12} className="inline mr-1" />
                  旋转角度
                </label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={selectedExhibit.rotation}
                  onChange={(e) => handleExhibitChange('rotation', parseInt(e.target.value))}
                  className="w-full accent-[#6366f1]"
                />
                <span className="text-xs text-[#6366f1]">{selectedExhibit.rotation}°</span>
              </div>
              <div>
                <label className="block w-full">
                  <span className="text-xs text-[#94a3b8] block mb-1">
                    <Upload size={12} className="inline mr-1" />
                    更换图片
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="exhibit-reupload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const dataUrl = event.target?.result as string;
                          handleExhibitChange('imageUrl', dataUrl);
                        };
                        reader.readAsDataURL(file);
                      }
                      e.target.value = '';
                    }}
                  />
                  <label
                    htmlFor="exhibit-reupload"
                    className="block w-full px-3 py-2 bg-[#334155] text-[#f1f5f9] text-sm text-center rounded-lg cursor-pointer hover:bg-[#475569] transition-colors"
                  >
                    选择图片
                  </label>
                </label>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center rounded-lg cursor-pointer hover:bg-[#0f172a]/50 transition-colors duration-200">
              <ImageIcon size={32} className="text-[#475569] mb-2 transition-colors group-hover:text-[#64748b]" />
              <p className="text-sm text-[#64748b]">点击展品查看详情</p>
            </div>
          )}
        </div>

        {!selectedWall && !selectedExhibit && (
          <div className="p-4">
            <div className="p-4 bg-[#0f172a] rounded-xl border border-[#334155]">
              <h4 className="text-sm font-medium text-[#f1f5f9] mb-2">操作提示</h4>
              <ul className="text-xs text-[#94a3b8] space-y-1.5">
                <li>• 选择展墙工具后拖拽绘制展墙</li>
                <li>• 点击选中展墙或展品</li>
                <li>• 拖拽移动已选中的元素</li>
                <li>• 选中展墙后可粘贴/上传展品图片</li>
                <li>• 按 Delete 键删除选中元素</li>
              </ul>
            </div>
            {selectedTool !== 'select' && (
              <div className="mt-4 p-3 bg-[#6366f1]/10 border border-[#6366f1]/30 rounded-lg">
                <p className="text-xs text-[#6366f1]">
                  当前工具：
                  {selectedTool === 'rectangle' && '矩形展墙'}
                  {selectedTool === 'L-shape' && 'L形展墙'}
                  {selectedTool === 'arc' && '弧形展墙'}
                  <br />
                  在画布上拖拽绘制
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
