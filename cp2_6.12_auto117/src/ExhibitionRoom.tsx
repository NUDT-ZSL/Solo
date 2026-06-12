import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { Exhibit } from './types';
import ExhibitCard from './components/ExhibitCard';
import GridMap from './components/GridMap';
import EditPanel from './components/EditPanel';

interface ExhibitionRoomProps {
  socket: Socket;
  roomId: string;
  roomName: string;
  initialExhibits: Exhibit[];
  onBack: () => void;
  onUserCountChange: (count: number) => void;
}

function ExhibitionRoom({
  socket,
  roomId,
  roomName,
  initialExhibits,
  onBack,
  onUserCountChange,
}: ExhibitionRoomProps) {
  const [exhibits, setExhibits] = useState<Exhibit[]>(initialExhibits);
  const [selectedExhibit, setSelectedExhibit] = useState<Exhibit | null>(null);
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
  const [draggingExhibitId, setDraggingExhibitId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [rippleExhibits, setRippleExhibits] = useState<{ [key: string]: number }>({});
  const dragStartRef = useRef<{ x: number; y: number; exhibitId: string } | null>(null);

  useEffect(() => {
    socket.on('user_joined', (data: { userId: string; userCount: number }) => {
      onUserCountChange(data.userCount);
    });

    socket.on('user_left', (data: { userId: string; userCount: number }) => {
      onUserCountChange(data.userCount);
    });

    socket.on(
      'exhibit_placed',
      (data: {
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
      }
    );

    socket.on('exhibit_updated', (updatedExhibit: Exhibit) => {
      setExhibits((prev) =>
        prev.map((e) => (e.id === updatedExhibit.id ? { ...e, ...updatedExhibit } : e))
      );
      setRippleExhibits((prev) => ({
        ...prev,
        [updatedExhibit.id]: (prev[updatedExhibit.id] || 0) + 1,
      }));
    });

    socket.on('exhibit_rotated', (data: { exhibitId: string; rotation: number }) => {
      setExhibits((prev) =>
        prev.map((e) => (e.id === data.exhibitId ? { ...e, rotation: data.rotation } : e))
      );
    });

    socket.on('spacing_updated', (data: { exhibitId: string; spacing: number }) => {
      setExhibits((prev) =>
        prev.map((e) => (e.id === data.exhibitId ? { ...e, spacing: data.spacing } : e))
      );
    });

    return () => {
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('exhibit_placed');
      socket.off('exhibit_updated');
      socket.off('exhibit_rotated');
      socket.off('spacing_updated');
    };
  }, [socket, onUserCountChange]);

  const handleDragStart = useCallback(
    (e: React.MouseEvent, exhibit: Exhibit) => {
      setDraggingExhibitId(exhibit.id);
      setDragPosition({ x: e.clientX, y: e.clientY });
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        exhibitId: exhibit.id,
      };
    },
    []
  );

  useEffect(() => {
    if (!draggingExhibitId) return;

    const handleMouseMove = (e: MouseEvent) => {
      setDragPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
      setDraggingExhibitId(null);
      setDragPosition(null);
      dragStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
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
      if (draggingExhibitId) return;
      setSelectedExhibit(exhibit);
      setIsEditPanelOpen(true);
    },
    [draggingExhibitId]
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
    navigator.clipboard.writeText(roomId);
    alert('房间ID已复制到剪贴板');
  };

  const unplacedExhibits = exhibits.filter((e) => !e.isPlaced);
  const placedExhibits = exhibits.filter((e) => e.isPlaced);

  return (
    <div className="exhibition-room">
      <header className="room-header">
        <div className="room-header-left">
          <button className="back-btn" onClick={onBack}>
            ← 返回
          </button>
          <h1 className="room-title">{roomName}</h1>
          <span className="room-id" onClick={copyRoomId} title="点击复制房间ID">
            房间ID: {roomId}
          </span>
        </div>
        <div className="room-header-right">
          <span className="user-count">👥 {placedExhibits.length} 件展品已布置</span>
          <button className="generate-btn" onClick={handleGenerateMap}>
            生成展览地图
          </button>
        </div>
      </header>

      <div className="room-body">
        <aside className="sidebar">
          <div className="sidebar-header">展品清单 ({unplacedExhibits.length})</div>
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
              <div style={{ color: '#999', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                所有展品已布置完成
              </div>
            )}
          </div>
        </aside>

        <main className="map-container">
          <GridMap
            exhibits={exhibits}
            onExhibitDrop={handleExhibitDrop}
            onExhibitClick={handleExhibitClick}
            onRotate={handleRotate}
            draggingExhibitId={draggingExhibitId}
            dragPosition={dragPosition}
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
}

export default ExhibitionRoom;
