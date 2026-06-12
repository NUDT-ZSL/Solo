import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { Exhibit } from './types';
import ExhibitCard from './components/ExhibitCard';
import GridMap from './components/GridMap';
import EditPanel from './components/EditPanel';
import './App.css';

interface ExhibitionRoomProps {
  socket: Socket;
  roomId: string;
  roomName: string;
  initialExhibits: Exhibit[];
  onBack: () => void;
  onUserCountChange: (count: number) => void;
}

const ExhibitionRoom: React.FC<ExhibitionRoomProps> = ({
  socket,
  roomId,
  roomName,
  initialExhibits,
  onBack,
  onUserCountChange,
}) => {
  const [exhibits, setExhibits] = useState<Exhibit[]>(initialExhibits);
  const [selectedExhibit, setSelectedExhibit] = useState<Exhibit | null>(null);
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
  const [draggingExhibitId, setDraggingExhibitId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [rippleExhibits, setRippleExhibits] = useState<Record<string, number>>({});
  const [userCount, setUserCount] = useState(1);
  const rafRef = useRef<number | null>(null);
  const dragStartRef = useRef<{
    exhibitId: string;
    startX: number;
    startY: number;
    hasMoved: boolean;
  } | null>(null);

  useEffect(() => {
    const handleUserCount = (data: { count: number }) => {
      setUserCount(data.count);
      onUserCountChange(data.count);
    };

    const handleExhibitPlaced = (data: {
      exhibitId: string;
      gridX: number;
      gridY: number;
      swappedId: string | null;
      swappedX: number | null;
      swappedY: number | null;
    }) => {
      setExhibits((prev) =>
        prev.map((e) => {
          if (e.id === data.exhibitId) {
            return { ...e, gridX: data.gridX, gridY: data.gridY, isPlaced: true };
          }
          if (data.swappedId && e.id === data.swappedId) {
            return {
              ...e,
              gridX: data.swappedX,
              gridY: data.swappedY,
              isPlaced: data.swappedX !== null && data.swappedY !== null,
            };
          }
          return e;
        })
      );
    };

    const handleExhibitUpdated = (updatedExhibit: Exhibit) => {
      setExhibits((prev) =>
        prev.map((e) => (e.id === updatedExhibit.id ? { ...e, ...updatedExhibit } : e))
      );
      setRippleExhibits((prev) => ({
        ...prev,
        [updatedExhibit.id]: (prev[updatedExhibit.id] || 0) + 1,
      }));
      if (selectedExhibit?.id === updatedExhibit.id) {
        setSelectedExhibit({ ...updatedExhibit });
      }
    };

    const handleExhibitRotated = (data: { exhibitId: string; rotation: number }) => {
      setExhibits((prev) =>
        prev.map((e) => (e.id === data.exhibitId ? { ...e, rotation: data.rotation } : e))
      );
    };

    const handleSpacingUpdated = (data: { exhibitId: string; spacing: number }) => {
      setExhibits((prev) =>
        prev.map((e) => (e.id === data.exhibitId ? { ...e, spacing: data.spacing } : e))
      );
    };

    socket.on('user_count', handleUserCount);
    socket.on('exhibit_placed', handleExhibitPlaced);
    socket.on('exhibit_updated', handleExhibitUpdated);
    socket.on('exhibit_rotated', handleExhibitRotated);
    socket.on('spacing_updated', handleSpacingUpdated);

    return () => {
      socket.off('user_count', handleUserCount);
      socket.off('exhibit_placed', handleExhibitPlaced);
      socket.off('exhibit_updated', handleExhibitUpdated);
      socket.off('exhibit_rotated', handleExhibitRotated);
      socket.off('spacing_updated', handleSpacingUpdated);
    };
  }, [socket, selectedExhibit, onUserCountChange]);

  const handleDragStart = useCallback(
    (e: React.MouseEvent, exhibit: Exhibit) => {
      e.preventDefault();
      setDraggingExhibitId(exhibit.id);
      setDragPosition({ x: e.clientX, y: e.clientY });
      dragStartRef.current = {
        exhibitId: exhibit.id,
        startX: e.clientX,
        startY: e.clientY,
        hasMoved: false,
      };
    },
    []
  );

  useEffect(() => {
    if (!draggingExhibitId) return;

    let lastX = 0;
    let lastY = 0;

    const animate = () => {
      if (lastX !== 0 || lastY !== 0) {
        setDragPosition({ x: lastX, y: lastY });
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      if (dragStartRef.current) {
        const dx = Math.abs(e.clientX - dragStartRef.current.startX);
        const dy = Math.abs(e.clientY - dragStartRef.current.startY);
        if (dx > 3 || dy > 3) {
          dragStartRef.current.hasMoved = true;
        }
      }
    };

    const handleMouseUp = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setDraggingExhibitId(null);
      setDragPosition(null);
      dragStartRef.current = null;
    };

    rafRef.current = requestAnimationFrame(animate);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingExhibitId]);

  const handleExhibitDrop = useCallback(
    (exhibitId: string, gridX: number, gridY: number) => {
      socket.emit('place_exhibit', roomId, exhibitId, gridX, gridY);
    },
    [socket, roomId]
  );

  const handleExhibitClick = useCallback(
    (exhibit: Exhibit) => {
      setSelectedExhibit(exhibit);
      setIsEditPanelOpen(true);
    },
    []
  );

  const handleRotate = useCallback(
    (exhibitId: string, direction: 'left' | 'right') => {
      const exhibit = exhibits.find((e) => e.id === exhibitId);
      if (!exhibit) return;
      const delta = direction === 'right' ? 90 : -90;
      const newRotation = (exhibit.rotation + delta + 360) % 360;
      socket.emit('rotate_exhibit', roomId, exhibitId, newRotation);
    },
    [socket, roomId, exhibits]
  );

  const handleSpacingChange = useCallback(
    (exhibitId: string, spacing: number) => {
      socket.emit('update_spacing', roomId, exhibitId, spacing);
    },
    [socket, roomId]
  );

  const handleSaveExhibit = useCallback(
    (exhibitData: Partial<Exhibit>) => {
      socket.emit('update_exhibit', roomId, exhibitData);
      setIsEditPanelOpen(false);
    },
    [socket, roomId]
  );

  const handleGenerateMap = () => {
    socket.emit('generate_map', roomId, (response: any) => {
      if (response.success) {
        window.open(`http://localhost:3001${response.previewUrl}`, '_blank');
      }
    });
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      alert('房间ID已复制到剪贴板');
    });
  };

  const unplacedExhibits = exhibits.filter((e) => !e.isPlaced);
  const placedCount = exhibits.filter((e) => e.isPlaced).length;

  return (
    <div className="exhibition-room">
      <header className="room-header">
        <div className="room-header-left">
          <button className="back-btn" onClick={onBack}>
            ← 返回
          </button>
          <h1 className="room-title">{roomName}</h1>
          <span className="room-id-badge" onClick={copyRoomId} title="点击复制房间ID">
            ID: {roomId}
          </span>
        </div>
        <div className="room-header-right">
          <span className="user-count">👥 {userCount} 人在线 · {placedCount} 件展品</span>
          <button className="generate-btn" onClick={handleGenerateMap}>
            生成展览地图
          </button>
        </div>
      </header>

      <div className="room-content">
        <aside className="sidebar">
          <div className="sidebar-header">
            <span>展品清单</span>
            <span className="exhibit-count">{unplacedExhibits.length} 件</span>
          </div>
          <div className="exhibit-list">
            {unplacedExhibits.map((exhibit) => (
              <ExhibitCard
                key={exhibit.id}
                exhibit={exhibit}
                onDragStart={handleDragStart}
                isDragging={draggingExhibitId === exhibit.id}
              />
            ))}
            {unplacedExhibits.length === 0 && (
              <div className="empty-list">
                <p>所有展品已布置完成</p>
                <p className="empty-hint">从地图上拖回可重新布置</p>
              </div>
            )}
          </div>
        </aside>

        <div className="divider-line" />

        <main className="map-area">
          <GridMap
            exhibits={exhibits}
            draggingExhibitId={draggingExhibitId}
            dragPosition={dragPosition}
            onExhibitDrop={handleExhibitDrop}
            onExhibitClick={handleExhibitClick}
            onRotate={handleRotate}
            onSpacingChange={handleSpacingChange}
            rippleExhibits={rippleExhibits}
          />
        </main>
      </div>

      <EditPanel
        exhibit={selectedExhibit}
        isOpen={isEditPanelOpen}
        onClose={() => setIsEditPanelOpen(false)}
        onSave={handleSaveExhibit}
      />
    </div>
  );
};

export default ExhibitionRoom;
