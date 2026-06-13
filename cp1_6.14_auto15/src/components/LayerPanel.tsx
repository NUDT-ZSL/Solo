import { useRef, useCallback } from 'react';
import { Layer } from '../types';
import './LayerPanel.css';

interface LayerPanelProps {
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onOpacityChange: (id: string, opacity: number) => void;
  onBlendModeChange: (id: string, blendMode: GlobalCompositeOperation) => void;
  onToggleVisibility: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onMoveLayer: (id: string, direction: 'up' | 'down') => void;
  onUpload: (files: FileList | null) => void;
  blendModes: GlobalCompositeOperation[];
}

const blendModeLabels: Record<string, string> = {
  'source-over': '正常',
  'multiply': '正片叠底',
  'screen': '滤色',
  'overlay': '叠加',
  'darken': '变暗',
  'lighten': '变亮',
  'color-dodge': '颜色减淡',
  'color-burn': '颜色加深',
  'hard-light': '强光',
};

function LayerPanel({
  layers,
  selectedLayerId,
  onSelectLayer,
  onOpacityChange,
  onBlendModeChange,
  onToggleVisibility,
  onDeleteLayer,
  onMoveLayer,
  onUpload,
  blendModes,
}: LayerPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    onUpload(e.dataTransfer.files);
  }, [onUpload]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpload(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onUpload]);

  const rafRef = useRef<number | null>(null);
  const pendingOpacityRef = useRef<{ id: string; opacity: number } | null>(null);

  const handleOpacityChangeOptimized = useCallback((id: string, opacity: number) => {
    pendingOpacityRef.current = { id, opacity };
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        if (pendingOpacityRef.current) {
          onOpacityChange(pendingOpacityRef.current.id, pendingOpacityRef.current.opacity);
          pendingOpacityRef.current = null;
        }
        rafRef.current = null;
      });
    }
  }, [onOpacityChange]);

  return (
    <div
      className="layer-panel"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="panel-header">
        <h2 className="panel-title">图层管理</h2>
        <button
          className="upload-btn"
          onClick={handleUploadClick}
          disabled={layers.length >= 6}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>添加图片</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      <div className="layers-count">
        {layers.length} / 6 张图片
      </div>

      <div className="layers-list">
        {layers.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <p>拖拽图片到此处或点击上方按钮添加</p>
          </div>
        ) : (
          layers.map((layer, index) => (
            <div
              key={layer.id}
              className={`layer-item ${selectedLayerId === layer.id ? 'selected' : ''}`}
              onClick={() => onSelectLayer(layer.id)}
            >
              <div
                className="layer-color-indicator"
                style={{ backgroundColor: layer.color }}
              />
              <div className="layer-info">
                <div className="layer-top-row">
                  <span className="layer-name" title={layer.name}>
                    {layer.name}
                  </span>
                  <div className="layer-actions">
                    <button
                      className="action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleVisibility(layer.id);
                      }}
                      title={layer.visible ? '隐藏' : '显示'}
                    >
                      {layer.visible ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      )}
                    </button>
                    <button
                      className="action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveLayer(layer.id, 'up');
                      }}
                      disabled={index === 0}
                      title="上移"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                    </button>
                    <button
                      className="action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveLayer(layer.id, 'down');
                      }}
                      disabled={index === layers.length - 1}
                      title="下移"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteLayer(layer.id);
                      }}
                      title="删除"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="layer-controls">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={layer.opacity}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleOpacityChangeOptimized(layer.id, parseFloat(e.target.value));
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="layer-opacity-slider"
                  />
                  <span className="opacity-label">
                    {Math.round(layer.opacity * 100)}%
                  </span>
                  <select
                    className="blend-mode-select"
                    value={layer.blendMode}
                    onChange={(e) => {
                      e.stopPropagation();
                      onBlendModeChange(layer.id, e.target.value as GlobalCompositeOperation);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {blendModes.map(mode => (
                      <option key={mode} value={mode}>
                        {blendModeLabels[mode] || mode}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="panel-footer">
        <p className="hint-text">
          拖拽中央分割线对比图层差异
        </p>
      </div>
    </div>
  );
}

export default LayerPanel;
