import { Layer } from '../types';
import './Toolbar.css';

interface ToolbarProps {
  layers: Layer[];
  onOpacityChange: (id: string, opacity: number) => void;
  selectedLayerId: string | null;
  onSelectLayer: (id: string) => void;
}

function Toolbar({ layers, onOpacityChange, selectedLayerId, onSelectLayer }: ToolbarProps) {
  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  const handlePrevLayer = () => {
    if (layers.length === 0) return;
    const currentIndex = layers.findIndex(l => l.id === selectedLayerId);
    const prevIndex = currentIndex <= 0 ? layers.length - 1 : currentIndex - 1;
    onSelectLayer(layers[prevIndex].id);
  };

  const handleNextLayer = () => {
    if (layers.length === 0) return;
    const currentIndex = layers.findIndex(l => l.id === selectedLayerId);
    const nextIndex = currentIndex >= layers.length - 1 ? 0 : currentIndex + 1;
    onSelectLayer(layers[nextIndex].id);
  };

  return (
    <div className="toolbar">
      <div className="toolbar-title">图层透明度</div>
      <div className="toolbar-layer-switch">
        <button
          className="switch-btn"
          onClick={handlePrevLayer}
          disabled={layers.length === 0}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="layer-indicator">
          <div
            className="layer-color-dot"
            style={{ backgroundColor: selectedLayer?.color || '#666' }}
          />
          <span className="layer-name">
            {selectedLayer?.name || '无图层'}
          </span>
        </div>
        <button
          className="switch-btn"
          onClick={handleNextLayer}
          disabled={layers.length === 0}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
      <div className="toolbar-slider-container">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={selectedLayer?.opacity || 0}
          onChange={(e) => {
            if (selectedLayerId) {
              onOpacityChange(selectedLayerId, parseFloat(e.target.value));
            }
          }}
          className="opacity-slider"
          disabled={!selectedLayer}
        />
        <span className="opacity-value">
          {Math.round((selectedLayer?.opacity || 0) * 100)}%
        </span>
      </div>
    </div>
  );
}

export default Toolbar;
