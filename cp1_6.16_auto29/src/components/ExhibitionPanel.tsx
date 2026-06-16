import React, { useState, useRef } from 'react';
import { Room, Artwork, PlacedExhibit, LightingConfig } from '../types';
import { LIGHT_PRESETS, getTemperatureColor } from '../logic/lightingService';
import ContextMenu from './ContextMenu';
import ShareModal from './ShareModal';

interface ExhibitionPanelProps {
  rooms: Room[];
  currentRoomId: string;
  artworks: Artwork[];
  loading: boolean;
  selectedExhibitId: string | null;
  onSelectRoom: (id: string) => void;
  onAddRoom: () => void;
  onUpdateRoom: (id: string, updates: Partial<Room>) => void;
  onAddExhibit: (artwork: Artwork, wallIndex: number) => string | undefined;
  onRemoveExhibit: (exhibitId: string) => void;
  onUpdateExhibit: (exhibitId: string, updates: Partial<PlacedExhibit>) => void;
  onSelectExhibit: (id: string | null) => void;
  onUpdateLighting: (lighting: Partial<LightingConfig>) => void;
}

const WALL_COLORS = [
  '#2c2c3e',
  '#3d2c3e',
  '#2c3e3d',
  '#3e3d2c',
  '#1e1e2e',
  '#4a3f5c',
  '#2d4a3d',
  '#5c4a3f'
];

const FLOOR_TEXTURES = [
  { id: 'wood', name: '木纹', color: '#D2B48C' },
  { id: 'marble', name: '大理石', color: '#F5F5DC' },
  { id: 'carpet', name: '地毯', color: '#8B4513' }
];

const WALL_NAMES = ['正面墙', '左侧墙', '右侧墙'];

const ExhibitionPanel: React.FC<ExhibitionPanelProps> = ({
  rooms,
  currentRoomId,
  artworks,
  loading,
  selectedExhibitId,
  onSelectRoom,
  onAddRoom,
  onUpdateRoom,
  onAddExhibit,
  onRemoveExhibit,
  onUpdateExhibit,
  onSelectExhibit,
  onUpdateLighting
}) => {
  const currentRoom = rooms.find(r => r.id === currentRoomId);
  const [draggedArtwork, setDraggedArtwork] = useState<Artwork | null>(null);
  const [dragOverWall, setDragOverWall] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    exhibit: PlacedExhibit;
    position: { x: number; y: number };
  } | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [galleryId, setGalleryId] = useState('');
  const [sharing, setSharing] = useState(false);
  const dragImageRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent, artwork: Artwork) => {
    setDraggedArtwork(artwork);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', artwork.id);

    if (e.dataTransfer.setDragImage && dragImageRef.current) {
      const dragImg = document.createElement('div');
      dragImg.style.width = '60px';
      dragImg.style.height = '60px';
      dragImg.style.borderRadius = '8px';
      dragImg.style.background = `linear-gradient(135deg, ${artwork.gradientStart}, ${artwork.gradientEnd})`;
      dragImg.style.display = 'flex';
      dragImg.style.alignItems = 'center';
      dragImg.style.justifyContent = 'center';
      dragImg.style.fontSize = '28px';
      dragImg.style.opacity = '0.7';
      dragImg.innerHTML = artwork.icon;
      document.body.appendChild(dragImg);
      e.dataTransfer.setDragImage(dragImg, 30, 30);
      setTimeout(() => document.body.removeChild(dragImg), 0);
    }
  };

  const handleDragEnd = () => {
    setDraggedArtwork(null);
    setDragOverWall(null);
  };

  const handleDragOver = (e: React.DragEvent, wallIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverWall(wallIndex);
  };

  const handleDragLeave = () => {
    setDragOverWall(null);
  };

  const handleDrop = (e: React.DragEvent, wallIndex: number) => {
    e.preventDefault();
    if (draggedArtwork) {
      const newId = onAddExhibit(draggedArtwork, wallIndex);
      if (newId) {
        onSelectExhibit(newId);
      }
    }
    setDraggedArtwork(null);
    setDragOverWall(null);
  };

  const handleContextMenu = (e: React.MouseEvent, exhibit: PlacedExhibit) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      exhibit,
      position: { x: e.clientX, y: e.clientY }
    });
    onSelectExhibit(exhibit.exhibitId);
  };

  const handleGenerateShare = async () => {
    if (!currentRoom) return;
    setSharing(true);

    try {
      const galleryConfig = {
        rooms,
        currentRoomId
      };

      const response = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(galleryConfig)
      });

      const data = await response.json();

      if (data.success) {
        setGalleryId(data.data.id);
        const shareUrlValue = data.data.shareUrl || `${window.location.origin}/gallery/${data.data.id}`;
        setShareUrl(shareUrlValue);
        setShareModalOpen(true);
      } else {
        const mockId = Math.random().toString(36).substring(2, 10);
        setGalleryId(mockId);
        setShareUrl(`${window.location.origin}/gallery/${mockId}`);
        setShareModalOpen(true);
      }
    } catch (err) {
      const mockId = Math.random().toString(36).substring(2, 10);
      setGalleryId(mockId);
      setShareUrl(`${window.location.origin}/gallery/${mockId}`);
      setShareModalOpen(true);
    } finally {
      setSharing(false);
    }
  };

  if (!currentRoom) return null;

  const exhibitsByWall = [0, 1, 2].map(wallIndex =>
    currentRoom.exhibits.filter(e => e.wallIndex === wallIndex)
  );

  return (
    <>
      <div className="panel-header">
        <h2>🎨 策展面板</h2>
        <button
          className="btn btn-primary btn-small"
          onClick={handleGenerateShare}
          disabled={sharing}
        >
          {sharing ? '生成中...' : '🔗 分享'}
        </button>
      </div>

      <div className="panel-content">
        <div className="section">
          <div className="section-title">展间管理</div>
          <div className="room-tabs">
            {rooms.map(room => (
              <div
                key={room.id}
                className={`room-tab ${room.id === currentRoomId ? 'active' : ''}`}
                onClick={() => onSelectRoom(room.id)}
              >
                {room.name}
              </div>
            ))}
            <button className="room-add-btn" onClick={onAddRoom}>
              + 新增
            </button>
          </div>
        </div>

        <div className="section">
          <div className="section-title">展间设置</div>

          <div className="slider-group">
            <div className="slider-label">
              <span>展间名称</span>
            </div>
            <input
              type="text"
              className="text-input"
              value={currentRoom.name}
              onChange={(e) => onUpdateRoom(currentRoomId, { name: e.target.value })}
              placeholder="输入展间名称"
            />
          </div>

          <div className="slider-group">
            <div className="slider-label">
              <span>墙面颜色</span>
            </div>
            <div className="color-palette">
              {WALL_COLORS.map((color, idx) => (
                <div
                  key={idx}
                  className={`color-swatch ${currentRoom.wallColor === color ? 'selected' : ''}`}
                  style={{ background: color }}
                  onClick={() => onUpdateRoom(currentRoomId, { wallColor: color })}
                  title={`颜色 ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="slider-group">
            <div className="slider-label">
              <span>地板纹理</span>
            </div>
            <div className="floor-options">
              {FLOOR_TEXTURES.map(floor => (
                <div
                  key={floor.id}
                  className={`floor-option ${currentRoom.floorTexture === floor.id ? 'active' : ''}`}
                  onClick={() => onUpdateRoom(currentRoomId, {
                    floorTexture: floor.id as 'wood' | 'marble' | 'carpet'
                  })}
                >
                  <div
                    className="floor-preview"
                    style={{ background: floor.color }}
                  />
                  {floor.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-title">
            艺术品库
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
              （拖拽到墙面）
            </span>
          </div>
          {loading ? (
            <div className="loading">加载艺术品中...</div>
          ) : (
            <div className="artwork-grid">
              {artworks.map(artwork => (
                <div
                  key={artwork.id}
                  className={`artwork-card ${draggedArtwork?.id === artwork.id ? 'dragging' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, artwork)}
                  onDragEnd={handleDragEnd}
                >
                  <div
                    className="artwork-thumbnail"
                    style={{
                      background: `linear-gradient(135deg, ${artwork.gradientStart} 0%, ${artwork.gradientEnd} 100%)`
                    }}
                  >
                    {artwork.icon}
                  </div>
                  <div className="artwork-tooltip">
                    <div className="name">{artwork.name}</div>
                    <div className="author">作者: {artwork.author}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="section">
          <div className="section-title">当前展间展品</div>
          {WALL_NAMES.map((wallName, wallIndex) => (
            <div
              key={wallIndex}
              className={`wall-zone ${dragOverWall === wallIndex ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, wallIndex)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, wallIndex)}
            >
              <div className="wall-zone-title">
                <span>{wallName}</span>
                <span style={{ fontSize: '11px' }}>
                  {exhibitsByWall[wallIndex].length} 件作品
                </span>
              </div>
              <div className="wall-exhibits">
                {exhibitsByWall[wallIndex].map(exhibit => (
                  <div
                    key={exhibit.exhibitId}
                    className={`wall-exhibit ${selectedExhibitId === exhibit.exhibitId ? 'selected' : ''}`}
                    style={{
                      background: `linear-gradient(135deg, ${exhibit.artwork.gradientStart}, ${exhibit.artwork.gradientEnd})`,
                      borderColor: selectedExhibitId === exhibit.exhibitId ? 'var(--accent-gold)' : 'transparent'
                    }}
                    onClick={() => onSelectExhibit(exhibit.exhibitId)}
                    onContextMenu={(e) => handleContextMenu(e, exhibit)}
                    title="右键打开菜单"
                  >
                    {exhibit.artwork.icon}
                    <div
                      className="remove-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveExhibit(exhibit.exhibitId);
                      }}
                    >
                      ×
                    </div>
                  </div>
                ))}
                {exhibitsByWall[wallIndex].length === 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '8px 0' }}>
                    拖拽艺术品到此处
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="section">
          <div className="section-title">灯光设置</div>

          <div className="slider-group">
            <div className="slider-label">
              <span>主光源色温</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  className="color-preview-circle"
                  style={{ background: getTemperatureColor(currentRoom.lighting.temperature) }}
                />
                <span className="value">{currentRoom.lighting.temperature}K</span>
              </div>
            </div>
            <div className="light-presets">
              {Object.entries(LIGHT_PRESETS).map(([key, preset]) => (
                <div
                  key={key}
                  className={`light-preset ${Math.abs(currentRoom.lighting.temperature - preset.temperature) < 50 ? 'active' : ''}`}
                  onClick={() => onUpdateLighting({ temperature: preset.temperature })}
                >
                  <div
                    className="temp-dot"
                    style={{ background: getTemperatureColor(preset.temperature) }}
                  />
                  {preset.name}
                </div>
              ))}
            </div>
            <input
              type="range"
              min="2000"
              max="8000"
              step="100"
              value={currentRoom.lighting.temperature}
              onChange={(e) => onUpdateLighting({ temperature: Number(e.target.value) })}
            />
          </div>

          <div className="slider-group">
            <div className="slider-label">
              <span>辅助光亮度</span>
              <span className="value">
                {(currentRoom.lighting.ambientIntensity * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={currentRoom.lighting.ambientIntensity}
              onChange={(e) => onUpdateLighting({ ambientIntensity: Number(e.target.value) })}
            />
          </div>

          <div className="slider-group">
            <div className="slider-label">
              <span>背光角度</span>
              <span className="value">{currentRoom.lighting.backlightAngle}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              step="5"
              value={currentRoom.lighting.backlightAngle}
              onChange={(e) => onUpdateLighting({ backlightAngle: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="section">
          <button
            className="btn btn-primary btn-block"
            onClick={handleGenerateShare}
            disabled={sharing}
          >
            {sharing ? '⏳ 生成分享链接中...' : '🔗 生成分享链接'}
          </button>
        </div>
      </div>

      {contextMenu && (
        <ContextMenu
          exhibit={contextMenu.exhibit}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          onRotate={(angle) => {
            onUpdateExhibit(contextMenu.exhibit.exhibitId, { rotation: angle });
            setContextMenu(prev => prev ? {
              ...prev,
              exhibit: { ...prev.exhibit, rotation: angle }
            } : null);
          }}
          onScale={(scale) => {
            onUpdateExhibit(contextMenu.exhibit.exhibitId, { scale });
            setContextMenu(prev => prev ? {
              ...prev,
              exhibit: { ...prev.exhibit, scale }
            } : null);
          }}
          onBorderColor={(color) => {
            onUpdateExhibit(contextMenu.exhibit.exhibitId, { borderColor: color });
            setContextMenu(prev => prev ? {
              ...prev,
              exhibit: { ...prev.exhibit, borderColor: color }
            } : null);
          }}
          onDescription={(desc) => {
            onUpdateExhibit(contextMenu.exhibit.exhibitId, { description: desc });
            setContextMenu(prev => prev ? {
              ...prev,
              exhibit: { ...prev.exhibit, description: desc }
            } : null);
          }}
          onDelete={() => {
            onRemoveExhibit(contextMenu.exhibit.exhibitId);
            setContextMenu(null);
          }}
        />
      )}

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        shareUrl={shareUrl}
        galleryId={galleryId}
      />
    </>
  );
};

export default ExhibitionPanel;
