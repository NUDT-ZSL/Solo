import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { useStore } from '@/store/useStore';

export const PropertyPanel: React.FC = () => {
  const layout = useStore((state) => state.layout);
  const selectedElementId = useStore((state) => state.selectedElementId);
  const artworks = useStore((state) => state.artworks);
  const setSelectedElementId = useStore((state) => state.setSelectedElementId);
  const setShowPropertyPanel = useStore((state) => state.setShowPropertyPanel);
  const updateElement = useStore((state) => state.updateElement);
  const saveLayout = useStore((state) => state.saveLayout);
  const assignArtworkToStand = useStore((state) => state.assignArtworkToStand);

  const selectedElement = useMemo(() => {
    if (!layout || !selectedElementId) return null;
    return layout.elements.find((el) => el.id === selectedElementId);
  }, [layout, selectedElementId]);

  const handleClose = () => {
    setShowPropertyPanel(false);
    setSelectedElementId(null);
  };

  const handleArtworkChange = (artworkId: string) => {
    if (!selectedElement) return;

    if (artworkId === '') {
      const updatedElement = {
        ...selectedElement,
        artworkId: undefined,
        artworkColor: undefined,
        artworkName: undefined,
      };
      updateElement(updatedElement);
    } else {
      const artwork = artworks.find((a) => a.id === artworkId);
      if (artwork) {
        assignArtworkToStand(selectedElement.id, artwork);
      }
    }
    saveLayout();
  };

  if (!selectedElement) return null;

  const isStand = selectedElement.type === 'stand';

  return (
    <div className="absolute top-0 right-0 h-full z-30 pointer-events-none">
      <div
        className="
          h-full w-[200px] bg-[#33334d] border-l border-[#444466]
          flex flex-col p-4 pointer-events-auto
          transform transition-transform duration-300 ease-out
        "
      >
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-medium text-[#e0e0ff]">
            {isStand ? '展台属性' : '展墙属性'}
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-[#444466] transition-colors"
          >
            <X size={16} className="text-[#a0a0c0]" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[#a0a0c0] mb-1">ID</label>
            <div className="px-3 py-2 rounded-lg bg-[#2a2a3e] text-xs text-[#e0e0ff] font-mono truncate">
              {selectedElement.id.slice(0, 8)}...
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#a0a0c0] mb-1">X 坐标</label>
            <div className="px-3 py-2 rounded-lg bg-[#2a2a3e] text-sm text-[#e0e0ff]">
              {Math.round(selectedElement.x)}px
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#a0a0c0] mb-1">Y 坐标</label>
            <div className="px-3 py-2 rounded-lg bg-[#2a2a3e] text-sm text-[#e0e0ff]">
              {Math.round(selectedElement.y)}px
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#a0a0c0] mb-1">尺寸</label>
            <div className="px-3 py-2 rounded-lg bg-[#2a2a3e] text-sm text-[#e0e0ff]">
              {selectedElement.width} × {selectedElement.height}px
            </div>
          </div>

          {isStand && (
            <div>
              <label className="block text-xs text-[#a0a0c0] mb-1">分配艺术品</label>
              <select
                value={selectedElement.artworkId || ''}
                onChange={(e) => handleArtworkChange(e.target.value)}
                className="
                  w-full px-3 py-2 rounded-lg text-sm
                  bg-[#2a2a3e] border border-[#444466]
                  text-[#e0e0ff]
                  focus:outline-none focus:border-[#6c63ff]
                  transition-all duration-300 ease-out
                "
              >
                <option value="">未分配</option>
                {artworks.map((artwork) => (
                  <option key={artwork.id} value={artwork.id}>
                    {artwork.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedElement.artworkName && (
            <div>
              <label className="block text-xs text-[#a0a0c0] mb-1">当前展品</label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#2a2a3e]">
                <div
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: selectedElement.artworkColor }}
                />
                <span className="text-sm text-[#e0e0ff] truncate">
                  {selectedElement.artworkName}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-auto pt-4 text-xs text-[#a0a0c0]">
          提示：按 Delete 键删除此{isStand ? '展台' : '展墙'}
        </div>
      </div>
    </div>
  );
};
