import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import ExhibitionPanel from './components/ExhibitionPanel';
import GalleryViewer from './components/GalleryViewer';
import { Room, Artwork, PlacedExhibit, LightingConfig } from './types';
import { v4 as uuidv4 } from 'uuid';
import './styles.css';

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

const DEFAULT_LIGHTING: LightingConfig = {
  temperature: 4000,
  ambientIntensity: 0.5,
  backlightAngle: 45
};

function createDefaultRoom(index: number): Room {
  return {
    id: uuidv4(),
    name: `展间 ${index + 1}`,
    wallColor: WALL_COLORS[index % WALL_COLORS.length],
    floorTexture: index % 3 === 0 ? 'wood' : index % 3 === 1 ? 'marble' : 'carpet',
    exhibits: [],
    lighting: { ...DEFAULT_LIGHTING }
  };
}

const App: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string>('');
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);
  const [selectedExhibitId, setSelectedExhibitId] = useState<string | null>(null);
  const [isTouring, setIsTouring] = useState(false);

  useEffect(() => {
    const initialRooms = [
      createDefaultRoom(0),
      createDefaultRoom(1),
      createDefaultRoom(2)
    ];
    setRooms(initialRooms);
    setCurrentRoomId(initialRooms[0].id);

    fetch('/api/artworks')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setArtworks(data.data);
        }
      })
      .catch(() => {
        const mockArtworks: Artwork[] = [
          { id: 'mock-1', name: '星夜幻想', author: '林风眠', type: 'painting', gradientStart: '#1a1a4e', gradientEnd: '#4a4a8a', icon: '🎨', width: 2, height: 1.5 },
          { id: 'mock-2', name: '山水清音', author: '张大千', type: 'painting', gradientStart: '#2d5a3d', gradientEnd: '#5a8a5d', icon: '🖼️', width: 2.5, height: 1.8 },
          { id: 'mock-3', name: '现代雕塑', author: '罗丹', type: 'sculpture', gradientStart: '#4a3a2a', gradientEnd: '#8a7a5a', icon: '🗿', width: 1.2, height: 2 },
          { id: 'mock-4', name: '都市光影', author: '何藩', type: 'photography', gradientStart: '#2a2a3a', gradientEnd: '#5a5a6a', icon: '📷', width: 2, height: 1.5 },
          { id: 'mock-5', name: '花开富贵', author: '齐白石', type: 'painting', gradientStart: '#5a2a3a', gradientEnd: '#9a5a6a', icon: '🌸', width: 1.8, height: 2.2 },
          { id: 'mock-6', name: '抽象之舞', author: '康定斯基', type: 'painting', gradientStart: '#3a1a4a', gradientEnd: '#7a4a9a', icon: '🎭', width: 2.2, height: 1.8 },
          { id: 'mock-7', name: '青铜时代', author: '米开朗基罗', type: 'sculpture', gradientStart: '#3a2a1a', gradientEnd: '#7a6a4a', icon: '🏛️', width: 1, height: 2.5 },
          { id: 'mock-8', name: '海边晨曦', author: '莫奈', type: 'photography', gradientStart: '#1a3a4a', gradientEnd: '#5a8aaa', icon: '🌅', width: 2.5, height: 1.5 },
          { id: 'mock-9', name: '竹林七贤', author: '范曾', type: 'painting', gradientStart: '#1a4a2a', gradientEnd: '#5aaa6a', icon: '🎋', width: 3, height: 2 },
          { id: 'mock-10', name: '几何构成', author: '蒙德里安', type: 'painting', gradientStart: '#1a1a1a', gradientEnd: '#ea3a3a', icon: '🔷', width: 2, height: 2 },
          { id: 'mock-11', name: '陶瓷艺术', author: '陶艺大师', type: 'sculpture', gradientStart: '#4a2a5a', gradientEnd: '#8a6aaa', icon: '🏺', width: 1, height: 1.5 },
          { id: 'mock-12', name: '人像摄影', author: '卡什', type: 'photography', gradientStart: '#2a1a1a', gradientEnd: '#6a4a4a', icon: '👤', width: 1.5, height: 2 }
        ];
        setArtworks(mockArtworks);
      })
      .finally(() => setLoading(false));
  }, []);

  const currentRoom = rooms.find(r => r.id === currentRoomId);

  const updateRoom = (roomId: string, updates: Partial<Room>) => {
    setRooms(prev => prev.map(room =>
      room.id === roomId ? { ...room, ...updates } : room
    ));
  };

  const addRoom = () => {
    const newRoom = createDefaultRoom(rooms.length);
    setRooms(prev => [...prev, newRoom]);
    setCurrentRoomId(newRoom.id);
  };

  const addExhibit = (artwork: Artwork, wallIndex: number) => {
    if (!currentRoom) return;

    const newExhibit: PlacedExhibit = {
      exhibitId: uuidv4(),
      artwork,
      wallIndex,
      positionX: 0,
      positionY: 1.5,
      positionZ: 0,
      rotation: 0,
      scale: 1,
      borderColor: '#FFD700',
      description: ''
    };

    const wallExhibits = [...currentRoom.exhibits]
      .filter(e => e.wallIndex === wallIndex)
      .sort((a, b) => a.positionX - b.positionX);

    wallExhibits.push(newExhibit);

    const totalWidth = wallExhibits.reduce((sum, e) => sum + e.artwork.width * e.scale + 1, -1);
    let currentX = -totalWidth / 2;

    const roomWidth = 20;
    const wallWidth = wallIndex === 1 ? 20 : 20;

    wallExhibits.forEach(exhibit => {
      const w = exhibit.artwork.width * exhibit.scale;
      exhibit.positionX = currentX + w / 2;
      currentX += w + 1;
    });

    const otherWalls = currentRoom.exhibits.filter(e => e.wallIndex !== wallIndex);
    updateRoom(currentRoomId, { exhibits: [...otherWalls, ...wallExhibits] });
    return newExhibit.exhibitId;
  };

  const removeExhibit = (exhibitId: string) => {
    if (!currentRoom) return;
    updateRoom(currentRoomId, {
      exhibits: currentRoom.exhibits.filter(e => e.exhibitId !== exhibitId)
    });
    if (selectedExhibitId === exhibitId) {
      setSelectedExhibitId(null);
    }
  };

  const updateExhibit = (exhibitId: string, updates: Partial<PlacedExhibit>) => {
    if (!currentRoom) return;
    updateRoom(currentRoomId, {
      exhibits: currentRoom.exhibits.map(e =>
        e.exhibitId === exhibitId ? { ...e, ...updates } : e
      )
    });
  };

  const updateLighting = (lighting: Partial<LightingConfig>) => {
    if (!currentRoom) return;
    updateRoom(currentRoomId, {
      lighting: { ...currentRoom.lighting, ...lighting }
    });
  };

  return (
    <div className="app-container">
      <button
        className="mobile-drawer-toggle"
        onClick={() => setPanelOpen(!panelOpen)}
      >
        ☰ 策展面板
      </button>

      <div className={`panel-container ${panelOpen ? 'open' : ''}`}>
        <ExhibitionPanel
          rooms={rooms}
          currentRoomId={currentRoomId}
          artworks={artworks}
          loading={loading}
          selectedExhibitId={selectedExhibitId}
          onSelectRoom={setCurrentRoomId}
          onAddRoom={addRoom}
          onUpdateRoom={updateRoom}
          onAddExhibit={addExhibit}
          onRemoveExhibit={removeExhibit}
          onUpdateExhibit={updateExhibit}
          onSelectExhibit={setSelectedExhibitId}
          onUpdateLighting={updateLighting}
        />
      </div>

      <div className="gallery-viewer">
        {currentRoom && (
          <GalleryViewer
            room={currentRoom}
            isTouring={isTouring}
            onTourEnd={() => setIsTouring(false)}
            selectedExhibitId={selectedExhibitId}
          />
        )}

        <div className="tour-controls">
          <button
            className="btn btn-primary"
            onClick={() => setIsTouring(!isTouring)}
          >
            {isTouring ? '⏹ 停止导览' : '▶ 开始导览'}
          </button>
        </div>

        {isTouring && (
          <div className="tour-indicator">
            <span className="dot"></span>
            正在导览中...
          </div>
        )}
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
