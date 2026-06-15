import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Memory } from '../types';
import { MOOD_COLOR, MOOD_EMOJI } from '../types';

interface MapViewProps {
  memories: Memory[];
  selectedMemory: Memory | null;
  onMemorySelect: (memory: Memory | null) => void;
  highlightedMemoryId: string | null;
}

function createCustomIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div class="memory-pin" style="background-color: ${color};"></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
}

function MapController({ 
  center, 
  zoom 
}: { 
  center: [number, number]; 
  zoom: number;
}) {
  const map = useMap();
  
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.5 });
  }, [center, zoom, map]);
  
  return null;
}

function MemoryMarker({ 
  memory, 
  isHighlighted,
  isSelected,
  onClick 
}: { 
  memory: Memory; 
  isHighlighted: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const markerRef = useRef<L.Marker>(null);
  const triggerRef = useRef(0);

  useEffect(() => {
    if (!isHighlighted || !markerRef.current) return;

    triggerRef.current += 1;
    const marker = markerRef.current;
    const el = marker.getElement();

    if (el) {
      el.classList.remove('blink-twice');
      void el.offsetWidth;
      el.classList.add('blink-twice');

      const cleanupTimeout = window.setTimeout(() => {
        if (markerRef.current) {
          const currentEl = markerRef.current.getElement();
          if (currentEl) {
            currentEl.classList.remove('blink-twice');
          }
        }
      }, 1300);

      return () => {
        clearTimeout(cleanupTimeout);
      };
    }
  }, [isHighlighted, triggerRef.current]);

  return (
    <Marker
      ref={markerRef}
      position={[memory.latitude, memory.longitude]}
      icon={createCustomIcon(MOOD_COLOR[memory.mood])}
      eventHandlers={{
        click: onClick
      }}
    >
      {isSelected && (
        <Popup>
          <div style={{ minWidth: '200px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#8B4513', fontFamily: "'Noto Serif SC', serif" }}>
              {memory.title}
            </h3>
            <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#6D4C41' }}>
              {memory.description.length > 60 
                ? memory.description.substring(0, 60) + '...' 
                : memory.description}
            </p>
            <span style={{ fontSize: '20px' }}>{MOOD_EMOJI[memory.mood]}</span>
          </div>
        </Popup>
      )}
    </Marker>
  );
}

export default function MapView({ memories, selectedMemory, onMemorySelect, highlightedMemoryId }: MapViewProps) {
  const [userPosition, setUserPosition] = useState<[number, number]>([35.8617, 104.1954]);
  const [zoom, setZoom] = useState(4);
  const [isClosing, setIsClosing] = useState(false);
  const [flyTrigger, setFlyTrigger] = useState(0);
  const popupTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserPosition([position.coords.latitude, position.coords.longitude]);
          setZoom(8);
        },
        () => {
          console.log('Using default location');
        }
      );
    }
  }, []);

  useEffect(() => {
    if (highlightedMemoryId) {
      const memory = memories.find(m => m.id === highlightedMemoryId);
      if (memory) {
        setUserPosition([memory.latitude, memory.longitude]);
        setZoom(12);
        setFlyTrigger(prev => prev + 1);
      }
    }
  }, [highlightedMemoryId, memories]);

  const handleClosePopup = useCallback(() => {
    setIsClosing(true);
    if (popupTimeoutRef.current) {
      clearTimeout(popupTimeoutRef.current);
    }
    popupTimeoutRef.current = window.setTimeout(() => {
      setIsClosing(false);
      onMemorySelect(null);
    }, 300);
  }, [onMemorySelect]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClosePopup();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const mapCenter: [number, number] = selectedMemory
    ? [selectedMemory.latitude, selectedMemory.longitude]
    : userPosition;

  return (
    <div className="map-container">
      <MapContainer
        center={userPosition}
        zoom={zoom}
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <MapController 
          key={flyTrigger}
          center={mapCenter} 
          zoom={zoom} 
        />
        {memories.map((memory) => (
          <MemoryMarker
            key={memory.id}
            memory={memory}
            isHighlighted={highlightedMemoryId === memory.id}
            isSelected={selectedMemory?.id === memory.id}
            onClick={() => onMemorySelect(memory)}
          />
        ))}
      </MapContainer>

      {selectedMemory && (
        <>
          <div
            className={`popup-overlay ${isClosing ? 'closing' : ''}`}
            onClick={handleOverlayClick}
          />
          <div className={`popup-card ${isClosing ? 'closing' : ''}`}>
            <button className="popup-close" onClick={handleClosePopup}>
              ×
            </button>
            <img
              src={selectedMemory.image_url}
              alt={selectedMemory.title}
              className="popup-image"
              loading="lazy"
            />
            <div className="popup-body">
              <div className="popup-header">
                <h2 className="popup-title">{selectedMemory.title}</h2>
                <span className="popup-mood">{MOOD_EMOJI[selectedMemory.mood]}</span>
              </div>
              <p className="popup-description">{selectedMemory.description}</p>
              <div className="popup-date">
                <span>📅</span>
                {formatDate(selectedMemory.created_at)}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
