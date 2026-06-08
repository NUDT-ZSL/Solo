import React from 'react';
import { useStore } from '../store';
import { Image, FileJson, Plus, ZoomIn, ZoomOut, RotateCcw, Users } from 'lucide-react';

const Toolbar: React.FC = () => {
  const {
    currentTimeline,
    collaborators,
    zoom,
    setZoom,
    setPan,
    setModalOpen,
    setEditingEvent,
    wsConnected,
  } = useStore();

  const handleAddEvent = () => {
    if (!currentTimeline) return;
    setEditingEvent(null);
    setModalOpen(true);
  };

  const handleZoomIn = () => {
    setZoom(Math.min(zoom * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom / 1.2, 0.3));
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleExportPNG = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${currentTimeline?.title || 'timeline'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleExportJSON = () => {
    if (!currentTimeline) return;
    const dataStr = JSON.stringify(currentTimeline, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${currentTimeline.title}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const ToolbarButton: React.FC<{
    onClick: () => void;
    title: string;
    children: React.ReactNode;
    disabled?: boolean;
  }> = ({ onClick, title, children, disabled }) => (
    <button
      className={`
        relative px-3 py-2 rounded-md text-white text-sm font-medium
        transition-all duration-200 flex items-center gap-2
        ${disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:bg-[#3d5166] active:scale-95'
        }
      `}
      onClick={onClick}
      title={title}
      disabled={disabled}
    >
      {children}
      <span
        className="absolute inset-0 rounded-md pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at center, rgba(74, 144, 217, 0.3) 0%, transparent 70%)',
          opacity: 0,
          transition: 'opacity 0.3s',
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            (e.currentTarget.style as CSSStyleDeclaration).opacity = '1';
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget.style as CSSStyleDeclaration).opacity = '0';
        }}
      />
    </button>
  );

  return (
    <div
      className="h-14 px-4 flex items-center justify-between text-white"
      style={{ backgroundColor: '#2C3E50' }}
    >
      <div className="flex items-center gap-2">
        <ToolbarButton
          onClick={handleExportPNG}
          title="导出PNG"
          disabled={!currentTimeline}
        >
          <Image size={18} />
          <span className="hidden sm:inline">导出PNG</span>
        </ToolbarButton>

        <ToolbarButton
          onClick={handleExportJSON}
          title="导出JSON"
          disabled={!currentTimeline}
        >
          <FileJson size={18} />
          <span className="hidden sm:inline">导出JSON</span>
        </ToolbarButton>

        <div className="w-px h-6 bg-[#4A5568] mx-2" />

        <ToolbarButton
          onClick={handleAddEvent}
          title="添加事件"
          disabled={!currentTimeline}
        >
          <Plus size={18} />
          <span className="hidden sm:inline">添加事件</span>
        </ToolbarButton>
      </div>

      <div className="flex items-center gap-2">
        {currentTimeline && (
          <div className="text-sm mr-4 hidden md:block">
            <span className="text-gray-300">当前时间线：</span>
            <span className="text-[#4A90D9] font-medium">
              {currentTimeline.title}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 mr-2">
          <Users size={16} className="text-gray-400" />
          <span className="text-sm text-gray-300">
            {collaborators.length} 协作者
          </span>
          <span
            className={`w-2 h-2 rounded-full ml-1 ${
              wsConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
        </div>

        <div className="w-px h-6 bg-[#4A5568] mx-2" />

        <ToolbarButton onClick={handleZoomOut} title="缩小">
          <ZoomOut size={18} />
        </ToolbarButton>

        <span className="text-sm text-gray-300 w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>

        <ToolbarButton onClick={handleZoomIn} title="放大">
          <ZoomIn size={18} />
        </ToolbarButton>

        <ToolbarButton onClick={handleReset} title="重置视图">
          <RotateCcw size={18} />
        </ToolbarButton>
      </div>
    </div>
  );
};

export default Toolbar;
