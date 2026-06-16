import { useEffect, useRef, useState, useCallback } from 'react';
import { CanvasEngine, COLOR_PALETTE, STAMP_TYPES } from './CanvasEngine';
import { GalleryManager, Artwork } from './GalleryManager';
import './App.css';

const galleryManager = new GalleryManager();

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0].color);
  const [brushSize, setBrushSize] = useState(5);
  const [currentTool, setCurrentTool] = useState<'brush' | 'stamp'>('brush');
  const [selectedStamp, setSelectedStamp] = useState(STAMP_TYPES[0].id);
  const [searchText, setSearchText] = useState('');
  const [, setGallery] = useState<Artwork[]>([]);
  const [previewArtwork, setPreviewArtwork] = useState<Artwork | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);

  const updateCanvasSize = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      const width = Math.floor(containerWidth * 0.8);
      const height = Math.floor(containerHeight * 0.8);
      setCanvasSize({ width, height });
    }
  }, []);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize]);

  useEffect(() => {
    if (canvasRef.current && canvasSize.width > 0 && canvasSize.height > 0) {
      if (!engineRef.current) {
        engineRef.current = new CanvasEngine(canvasRef.current);
        engineRef.current.setOnChangeCallback(() => {
          if (engineRef.current) {
            setCanUndo(engineRef.current.canUndo());
            setCanRedo(engineRef.current.canRedo());
            setIsEmpty(engineRef.current.isEmpty());
          }
        });
      }
      engineRef.current.setCanvasSize(canvasSize.width, canvasSize.height);
      engineRef.current.setColor(selectedColor);
      engineRef.current.setBrushSize(brushSize);
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [canvasSize]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setColor(selectedColor);
    }
  }, [selectedColor]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setBrushSize(brushSize);
    }
  }, [brushSize]);

  useEffect(() => {
    setGallery(galleryManager.loadGallery());
    const unsubscribe = galleryManager.subscribe(() => {
      setGallery(galleryManager.loadGallery());
    });
    return unsubscribe;
  }, []);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const { x, y } = getCanvasCoords(e);

    if (currentTool === 'stamp' && engineRef.current) {
      engineRef.current.addStamp(x, y, selectedStamp);
    } else if (currentTool === 'brush' && engineRef.current) {
      setIsDragging(true);
      engineRef.current.startDrawing(x, y);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !engineRef.current) return;
    const { x, y } = getCanvasCoords(e);
    engineRef.current.drawLine(x, y);
  };

  const handleMouseUp = () => {
    if (isDragging && engineRef.current) {
      engineRef.current.endDrawing();
      setIsDragging(false);
    }
  };

  const handleMouseLeave = () => {
    if (isDragging && engineRef.current) {
      engineRef.current.endDrawing();
      setIsDragging(false);
    }
  };

  const handleUndo = () => {
    if (engineRef.current) {
      engineRef.current.undo();
    }
  };

  const handleRedo = () => {
    if (engineRef.current) {
      engineRef.current.redo();
    }
  };

  const handleSave = async () => {
    if (!engineRef.current || engineRef.current.isEmpty()) return;

    const title = prompt('请输入作品标题：', `涂鸦作品_${Date.now()}`);
    if (title === null) return;

    const dataUrl = engineRef.current.getCanvasData();
    await galleryManager.saveArtwork(dataUrl, title || '未命名作品');
    engineRef.current.clearCanvas();
  };

  const handleLike = (artworkId: string) => {
    galleryManager.toggleLike(artworkId);
  };

  const handleCardClick = (artwork: Artwork) => {
    setPreviewArtwork(artwork);
  };

  const handleClosePreview = () => {
    setPreviewArtwork(null);
  };

  const handleClearClick = () => {
    if (!isEmpty) {
      setShowClearDialog(true);
    }
  };

  const handleConfirmClear = () => {
    if (engineRef.current) {
      engineRef.current.clearCanvas();
    }
    setShowClearDialog(false);
  };

  const handleCancelClear = () => {
    setShowClearDialog(false);
  };

  const filteredGallery = galleryManager.searchArtworks(searchText);
  const matchedIds = searchText.trim() 
    ? new Set(filteredGallery.map(a => a.id))
    : new Set<string>();

  return (
    <div className="app-container">
      <div className="canvas-section" ref={containerRef}>
        <div className="canvas-toolbar">
          <button
            className="undo-btn"
            onClick={handleUndo}
            disabled={!canUndo || isEmpty}
            style={{ opacity: !canUndo || isEmpty ? 0.3 : 1 }}
            title="撤销"
          >
            ⌛
          </button>
          <button
            className="redo-btn"
            onClick={handleRedo}
            disabled={!canRedo}
            style={{ opacity: canRedo ? 1 : 0.3 }}
            title="重做"
          >
            ⏩
          </button>
          <button
            className="clear-btn"
            onClick={handleClearClick}
            disabled={isEmpty}
            style={{ opacity: isEmpty ? 0.3 : 1 }}
            title="清空画布"
          >
            🗑️
          </button>
          <button className="save-btn" onClick={handleSave} disabled={isEmpty}>
            喷绘完成
          </button>
        </div>

        <div className="canvas-wrapper">
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            className={currentTool === 'stamp' ? 'stamp-cursor' : 'brush-cursor'}
          />
        </div>
      </div>

      <div className="sidebar-section">
        <div className="tool-section">
          <h3 className="section-title">创作工具</h3>
          
          <div className="tool-toggle">
            <button
              className={`tool-btn ${currentTool === 'brush' ? 'active' : ''}`}
              onClick={() => setCurrentTool('brush')}
            >
              ✏️ 画笔
            </button>
            <button
              className={`tool-btn ${currentTool === 'stamp' ? 'active' : ''}`}
              onClick={() => setCurrentTool('stamp')}
            >
              🎨 印章
            </button>
          </div>

          <div className="palette-section">
            <h4 className="subsection-title">调色板</h4>
            <div className="color-palette">
              {COLOR_PALETTE.map(({ color, name }) => (
                <button
                  key={color}
                  className={`color-swatch ${selectedColor === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                  title={name}
                >
                  <span className="color-name">{name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="brush-size-section">
            <h4 className="subsection-title">画笔尺寸</h4>
            <input
              type="range"
              min="1"
              max="50"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="size-slider"
            />
            <span className="size-value">{brushSize}px</span>
          </div>

          {currentTool === 'stamp' && (
            <div className="stamp-section">
              <h4 className="subsection-title">选择印章</h4>
              <div className="stamp-grid">
                {STAMP_TYPES.map((stamp) => (
                  <button
                    key={stamp.id}
                    className={`stamp-btn ${selectedStamp === stamp.id ? 'selected' : ''}`}
                    onClick={() => setSelectedStamp(stamp.id)}
                    title={stamp.name}
                  >
                    {stamp.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="gallery-section">
          <h3 className="section-title">作品集</h3>
          
          <div className="search-section">
            <input
              type="text"
              placeholder="搜索涂鸦标题"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="gallery-grid">
            {filteredGallery.map((artwork) => (
              <div
                key={artwork.id}
                className={`artwork-card ${matchedIds.has(artwork.id) && searchText.trim() ? 'matched' : ''}`}
              >
                <div
                  className="artwork-thumbnail"
                  onClick={() => handleCardClick(artwork)}
                >
                  <img src={artwork.thumbnailUrl} alt={artwork.title} />
                  <div className="card-overlay">
                    <span className="magnify-icon">🔍</span>
                    <span className="like-count">{artwork.likes}</span>
                  </div>
                </div>
                <div className="artwork-info">
                  <p className="artwork-title">{artwork.title}</p>
                  <button
                    className={`like-btn ${artwork.liked ? 'liked' : ''}`}
                    onClick={() => handleLike(artwork.id)}
                    disabled={artwork.liked}
                  >
                    {artwork.liked ? '❤️' : '🤍'}
                  </button>
                </div>
              </div>
            ))}
            {filteredGallery.length === 0 && (
              <div className="empty-gallery">
                <p>暂无作品</p>
                <p className="hint">开始你的第一幅涂鸦吧！</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {previewArtwork && (
        <div className="preview-overlay" onClick={handleClosePreview}>
          <div className="preview-content" onClick={(e) => e.stopPropagation()}>
            <img src={previewArtwork.dataUrl} alt={previewArtwork.title} />
            <p className="preview-title">{previewArtwork.title}</p>
            <button className="close-preview" onClick={handleClosePreview}>
              ✕
            </button>
          </div>
        </div>
      )}

      {showClearDialog && (
        <div className="confirm-overlay" onClick={handleCancelClear}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-title">确认清空画布？</p>
            <p className="confirm-message">清空后可通过撤销按钮恢复内容。</p>
            <div className="confirm-buttons">
              <button className="confirm-cancel" onClick={handleCancelClear}>
                取消
              </button>
              <button className="confirm-ok" onClick={handleConfirmClear}>
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
