import React, { useCallback, useEffect, useState } from 'react';
import { PlacedItem, Artwork } from './types';

interface DetailPanelProps {
  selectedItem: PlacedItem | null;
  artwork: Artwork | undefined;
  onUpdateItem: (id: string, updates: Partial<PlacedItem>) => void;
  onDeleteItem: (id: string) => void;
}

const DetailPanel: React.FC<DetailPanelProps> = ({
  selectedItem,
  artwork,
  onUpdateItem,
  onDeleteItem
}) => {
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (selectedItem) {
      setRotation(selectedItem.rotation);
      setScale(selectedItem.scale);
    }
  }, [selectedItem]);

  const handleRotationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setRotation(value);
    if (selectedItem) {
      onUpdateItem(selectedItem.id, { rotation: value });
    }
  }, [selectedItem, onUpdateItem]);

  const handleScaleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setScale(value);
    if (selectedItem) {
      onUpdateItem(selectedItem.id, { scale: value });
    }
  }, [selectedItem, onUpdateItem]);

  const handleDelete = useCallback(() => {
    if (selectedItem) {
      onDeleteItem(selectedItem.id);
    }
  }, [selectedItem, onDeleteItem]);

  if (!selectedItem || !artwork) {
    return (
      <div className="detail-panel empty">
        <div className="empty-state">
          <div className="empty-icon">◯</div>
          <h3>选择艺术品</h3>
          <p>点击画布上的艺术品查看详情并调整参数</p>
        </div>
        <style>{`
          .detail-panel {
            width: 280px;
            height: 100vh;
            background: #FFFFFF;
            border-left: 1px solid rgba(139, 125, 114, 0.2);
            padding: 20px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
          }

          .detail-panel.empty {
            align-items: center;
            justify-content: center;
          }

          .empty-state {
            text-align: center;
            color: #8B7D72;
          }

          .empty-icon {
            font-size: 48px;
            margin-bottom: 16px;
            opacity: 0.3;
          }

          .empty-state h3 {
            font-family: 'Playfair Display', serif;
            font-size: 18px;
            font-weight: 500;
            color: #5C4F44;
            margin: 0 0 8px 0;
          }

          .empty-state p {
            font-family: 'Cormorant Garamond', serif;
            font-size: 14px;
            font-style: italic;
            margin: 0;
            line-height: 1.5;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="detail-panel">
      <div className="panel-header">
        <h2>详情面板</h2>
      </div>

      <div className="artwork-preview">
        <div 
          className={`preview-shape ${artwork.type}`}
          style={{ 
            backgroundColor: artwork.color,
            transform: `rotate(${rotation}deg) scale(${scale})`,
            transition: 'transform 0.3s ease'
          }}
        />
      </div>

      <div className="artwork-info">
        <h3 className="artwork-title">{artwork.title}</h3>
        <p className="artwork-artist">{artwork.artist}</p>
        <p className="artwork-year">{artwork.year} · {artwork.type === 'painting' ? '画作' : '雕塑'}</p>
      </div>

      <div className="control-group">
        <label className="control-label">
          <span>旋转角度</span>
          <span className="control-value">{rotation}°</span>
        </label>
        <input
          type="range"
          min="0"
          max="360"
          value={rotation}
          onChange={handleRotationChange}
          className="slider rotation-slider"
        />
        <div className="slider-marks">
          <span>0°</span>
          <span>90°</span>
          <span>180°</span>
          <span>270°</span>
          <span>360°</span>
        </div>
      </div>

      <div className="control-group">
        <label className="control-label">
          <span>缩放比例</span>
          <span className="control-value">{scale.toFixed(1)}x</span>
        </label>
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          value={scale}
          onChange={handleScaleChange}
          className="slider scale-slider"
        />
        <div className="slider-marks">
          <span>0.5x</span>
          <span>1.0x</span>
          <span>1.5x</span>
          <span>2.0x</span>
        </div>
      </div>

      <div className="info-group">
        <div className="info-row">
          <span className="info-label">位置 X</span>
          <span className="info-value">{selectedItem.x}px</span>
        </div>
        <div className="info-row">
          <span className="info-label">位置 Y</span>
          <span className="info-value">{selectedItem.y}px</span>
        </div>
        <div className="info-row">
          <span className="info-label">原始尺寸</span>
          <span className="info-value">{artwork.width} × {artwork.height}</span>
        </div>
      </div>

      <button className="delete-btn" onClick={handleDelete}>
        移除此艺术品
      </button>

      <style>{`
        .detail-panel {
          width: 280px;
          height: 100vh;
          background: #FFFFFF;
          border-left: 1px solid rgba(139, 125, 114, 0.2);
          padding: 20px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }

        .panel-header {
          margin-bottom: 20px;
          flex-shrink: 0;
        }

        .panel-header h2 {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-weight: 600;
          color: #2C2C2C;
          margin: 0;
        }

        .artwork-preview {
          height: 150px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F5F0EB;
          border-radius: 4px;
          margin-bottom: 20px;
          flex-shrink: 0;
        }

        .preview-shape {
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .preview-shape.painting {
          width: 80px;
          height: 60px;
          border: 4px solid #8B7D72;
        }

        .preview-shape.sculpture {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: 3px solid #8B7D72;
        }

        .artwork-info {
          margin-bottom: 24px;
          flex-shrink: 0;
        }

        .artwork-title {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          font-weight: 600;
          color: #2C2C2C;
          margin: 0 0 4px 0;
        }

        .artwork-artist {
          font-family: 'Cormorant Garamond', serif;
          font-size: 15px;
          font-style: italic;
          color: #5C4F44;
          margin: 0 0 2px 0;
        }

        .artwork-year {
          font-family: 'Cormorant Garamond', serif;
          font-size: 13px;
          color: #8B7D72;
          margin: 0;
        }

        .control-group {
          margin-bottom: 24px;
          flex-shrink: 0;
        }

        .control-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .control-label span:first-child {
          font-family: 'Cormorant Garamond', serif;
          font-size: 13px;
          font-weight: 500;
          color: #5C4F44;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .control-value {
          font-family: 'Playfair Display', serif;
          font-size: 14px;
          font-weight: 600;
          color: #2C2C2C;
        }

        .slider {
          width: 100%;
          height: 6px;
          -webkit-appearance: none;
          appearance: none;
          background: #E8E0D8;
          border-radius: 3px;
          outline: none;
          cursor: pointer;
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          background: #8B7D72;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 2px solid #FFFFFF;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-webkit-slider-thumb:hover {
          background: #5C4F44;
          transform: scale(1.1);
        }

        .slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          background: #8B7D72;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 2px solid #FFFFFF;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb:hover {
          background: #5C4F44;
          transform: scale(1.1);
        }

        .slider-marks {
          display: flex;
          justify-content: space-between;
          margin-top: 6px;
          font-family: 'Cormorant Garamond', serif;
          font-size: 11px;
          color: #8B7D72;
        }

        .info-group {
          background: #F5F0EB;
          border-radius: 4px;
          padding: 12px;
          margin-bottom: 20px;
          flex-shrink: 0;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px solid rgba(139, 125, 114, 0.1);
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .info-label {
          font-family: 'Cormorant Garamond', serif;
          font-size: 13px;
          color: #8B7D72;
        }

        .info-value {
          font-family: 'Playfair Display', serif;
          font-size: 13px;
          font-weight: 500;
          color: #2C2C2C;
        }

        .delete-btn {
          margin-top: auto;
          padding: 12px;
          background: transparent;
          border: 1px solid #C44;
          color: #C44;
          font-family: 'Cormorant Garamond', serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border-radius: 2px;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .delete-btn:hover {
          background: #C44;
          color: #FFFFFF;
        }
      `}</style>
    </div>
  );
};

export default DetailPanel;
