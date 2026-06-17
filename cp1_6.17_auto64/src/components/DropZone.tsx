import React, { useState, useCallback } from 'react';

export interface PresetColorBlock {
  id: string;
  title: string;
  colors: string[];
  thumbnailColor: string;
}

interface DropZoneProps {
  onDropUpload: (preset: PresetColorBlock) => void;
  currentThemePrimary: string;
  isUploading: boolean;
}

const presetBlocks: PresetColorBlock[] = [
  { id: 'p1', title: '活力糖果', colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'], thumbnailColor: '#FF6B6B' },
  { id: 'p2', title: '都市灰调', colors: ['#2C3E50', '#34495E', '#7F8C8D', '#BDC3C7', '#ECF0F1'], thumbnailColor: '#2C3E50' },
  { id: 'p3', title: '彩虹交响', colors: ['#F39C12', '#E74C3C', '#9B59B6', '#3498DB', '#2ECC71'], thumbnailColor: '#F39C12' },
  { id: 'p4', title: '大地温暖', colors: ['#D4A574', '#C19A6B', '#8B7355', '#6B4423', '#3E2723'], thumbnailColor: '#D4A574' },
  { id: 'p5', title: '海洋深邃', colors: ['#0077B6', '#00B4D8', '#90E0EF', '#CAF0F8', '#03045E'], thumbnailColor: '#0077B6' },
  { id: 'p6', title: '浪漫粉紫', colors: ['#FFAFCC', '#FFC8DD', '#CDB4DB', '#A2D2FF', '#BDE0FE'], thumbnailColor: '#FFAFCC' },
];

const DropZone: React.FC<DropZoneProps> = ({
  onDropUpload,
  currentThemePrimary,
  isUploading,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggedPreset, setDraggedPreset] = useState<PresetColorBlock | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, preset: PresetColorBlock) => {
    e.dataTransfer.setData('application/json', JSON.stringify(preset));
    e.dataTransfer.effectAllowed = 'copy';
    setDraggedPreset(preset);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedPreset(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setDraggedPreset(null);

    try {
      const data = e.dataTransfer.getData('application/json');
      if (data) {
        const preset = JSON.parse(data) as PresetColorBlock;
        onDropUpload(preset);
        return;
      }

      const text = e.dataTransfer.getData('text/plain');
      if (text) {
        const foundPreset = presetBlocks.find(p => p.id === text);
        if (foundPreset) {
          onDropUpload(foundPreset);
        }
      }
    } catch (error) {
      console.error('拖拽数据解析失败:', error);
    }
  }, [onDropUpload]);

  const handlePresetClick = useCallback((preset: PresetColorBlock) => {
    onDropUpload(preset);
  }, [onDropUpload]);

  return (
    <div style={{ marginBottom: '28px' }}>
      <h2
        style={{
          fontFamily: "'Playfair Display', serif",
          fontWeight: 700,
          fontSize: '24px',
          marginBottom: '16px',
          color: 'var(--color-text)',
          transition: 'color 0.3s ease',
        }}
      >
        上传新作品
      </h2>

      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '16px',
          flexWrap: 'wrap',
        }}
      >
        {presetBlocks.map((preset) => (
          <div
            key={preset.id}
            draggable
            onDragStart={(e) => handleDragStart(e, preset)}
            onDragEnd={handleDragEnd}
            onClick={() => handlePresetClick(preset)}
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '12px',
              cursor: 'grab',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: `linear-gradient(135deg, ${preset.colors.slice(0, 3).join(', ')})`,
              boxShadow: draggedPreset?.id === preset.id
                ? '0 8px 24px rgba(0,0,0,0.3)'
                : '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'all 0.25s ease',
              transform: draggedPreset?.id === preset.id ? 'scale(0.95)' : 'scale(1)',
              userSelect: 'none',
            }}
            onMouseEnter={(e) => {
              if (draggedPreset?.id !== preset.id) {
                e.currentTarget.style.transform = 'translateY(-4px) scale(1.03)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.18)';
              }
            }}
            onMouseLeave={(e) => {
              if (draggedPreset?.id !== preset.id) {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLElement).style.cursor = 'grabbing';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLElement).style.cursor = 'grab';
            }}
            title={`拖拽到下方上传区或点击上传：${preset.title}`}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: preset.thumbnailColor,
                border: '2px solid rgba(255,255,255,0.6)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              }}
            />
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '11px',
                fontWeight: 600,
                color: '#FFFFFF',
                textShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }}
            >
              {preset.title}
            </span>
          </div>
        ))}
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => presetBlocks.length > 0 && handlePresetClick(presetBlocks[Math.floor(Math.random() * presetBlocks.length)])}
        style={{
          height: '140px',
          borderRadius: '16px',
          border: `3px ${isDragOver ? 'solid' : 'dashed'} ${isDragOver ? currentThemePrimary : '#CCCCCC'}`,
          backgroundColor: isDragOver ? `${currentThemePrimary}15` : '#E8E8E8',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          cursor: isUploading ? 'progress' : 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          animation: isDragOver ? 'pulse-border 1s ease-in-out infinite' : 'none',
        }}
      >
        {isUploading ? (
          <>
            <div
              style={{
                width: '32px',
                height: '32px',
                border: '3px solid #CCCCCC',
                borderTopColor: currentThemePrimary,
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '15px',
                color: 'var(--color-text-secondary)',
                fontWeight: 500,
              }}
            >
              正在提取颜色主题...
            </span>
          </>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: isDragOver ? `${currentThemePrimary}30` : 'rgba(0,0,0,0.06)',
                transition: 'all 0.3s ease',
              }}
            >
              <span
                style={{
                  fontSize: '28px',
                  transition: 'transform 0.3s ease',
                  transform: isDragOver ? 'translateY(-2px) scale(1.1)' : 'scale(1)',
                }}
              >
                {isDragOver ? '🎉' : '📥'}
              </span>
            </div>
            <div
              style={{
                textAlign: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '15px',
                  fontWeight: 600,
                  color: isDragOver ? currentThemePrimary : 'var(--color-text)',
                  transition: 'color 0.3s ease',
                }}
              >
                {isDragOver ? '松开即可上传！' : '拖拽颜色方块到此处'}
              </span>
              <span
                style={{
                  display: 'block',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '13px',
                  color: 'var(--color-text-secondary)',
                  marginTop: '4px',
                }}
              >
                或点击随机选择一个预设主题
              </span>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-border {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default DropZone;
