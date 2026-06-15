import { useState, useCallback } from 'react';
import FloorPlanCanvas from './FloorPlanCanvas';
import Sidebar from './Sidebar';
import {
  Room,
  Scale,
  DetectedRegion,
  getNextColor,
  generateId,
  polygonAreaSquareMeters,
  formatExportData,
} from './utils';

const DEFAULT_SCALE: Scale = { pixels: 20, meters: 1 };

export default function App() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFilename, setImageFilename] = useState<string>('');
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [scale, setScale] = useState<Scale>(DEFAULT_SCALE);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [detectedRegions, setDetectedRegions] = useState<DetectedRegion[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || null;

  const handleImageUploaded = useCallback(
    (url: string, filename: string, width: number, height: number) => {
      setImageUrl(url);
      setImageFilename(filename);
      setImageSize({ width, height });
      setRooms([]);
      setSelectedRoomId(null);
      setDetectedRegions([]);
    },
    []
  );

  const handleRoomsChange = useCallback((newRooms: Room[]) => {
    setRooms(newRooms);
  }, []);

  const handleRoomSelect = useCallback((roomId: string | null) => {
    setSelectedRoomId(roomId);
    setIsPanelOpen(roomId !== null);
  }, []);

  const handleRoomUpdate = useCallback((roomId: string, updates: Partial<Room>) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, ...updates } : r))
    );
  }, []);

  const handleDeleteRoom = useCallback((roomId: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
    if (selectedRoomId === roomId) {
      setSelectedRoomId(null);
      setIsPanelOpen(false);
    }
  }, [selectedRoomId]);

  const handleDetectEdges = useCallback(async () => {
    if (!imageFilename) return;
    setIsDetecting(true);
    try {
      const res = await fetch('/api/detect-edges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: imageFilename }),
      });
      const data = await res.json();
      if (data.success) {
        setDetectedRegions(data.regions);
      }
    } catch (e) {
      console.error('Detection failed:', e);
    } finally {
      setIsDetecting(false);
    }
  }, [imageFilename]);

  const handleConfirmRegion = useCallback(
    (region: DetectedRegion) => {
      const usedColors = rooms.map((r) => r.color);
      const color = getNextColor(usedColors);
      const newRoom: Room = {
        id: generateId(),
        name: `房间 ${rooms.length + 1}`,
        color,
        points: region.points,
        area: polygonAreaSquareMeters(region.points, scale),
        openings: [],
      };
      setRooms((prev) => [...prev, newRoom]);
      setDetectedRegions((prev) => prev.filter((r) => r !== region));
    },
    [rooms, scale]
  );

  const handleClearDetected = useCallback(() => {
    setDetectedRegions([]);
  }, []);

  const handleExport = useCallback(() => {
    const json = formatExportData(rooms, scale, imageFilename);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `floorplan_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rooms, scale, imageFilename]);

  return (
    <div style={styles.app}>
      <Sidebar
        rooms={rooms}
        scale={scale}
        onScaleChange={setScale}
        onImageUploaded={handleImageUploaded}
        onDetectEdges={handleDetectEdges}
        onExport={handleExport}
        isDetecting={isDetecting}
        selectedRoom={selectedRoom}
        onRoomUpdate={handleRoomUpdate}
        onDeleteRoom={handleDeleteRoom}
        isPanelOpen={isPanelOpen}
        onTogglePanel={() => setIsPanelOpen((p) => !p)}
        imageUrl={imageUrl}
      />
      <div style={styles.canvasWrapper}>
        <FloorPlanCanvas
          imageUrl={imageUrl}
          imageSize={imageSize}
          rooms={rooms}
          scale={scale}
          onRoomsChange={handleRoomsChange}
          selectedRoomId={selectedRoomId}
          onRoomSelect={handleRoomSelect}
          detectedRegions={detectedRegions}
          onConfirmRegion={handleConfirmRegion}
          onClearDetected={handleClearDetected}
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
  },
  canvasWrapper: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
};
