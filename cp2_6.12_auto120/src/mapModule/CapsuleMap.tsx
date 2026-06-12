import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../App';
import { Capsule } from '../services/api';
import CapsuleForm from './CapsuleForm';
import ReplyPanel from '../interactionModule/ReplyPanel';

const LONG_PRESS_MS = 1500;

const getCapsuleColor = (unlockTimeIso: string): string => {
  const now = Date.now();
  const unlock = new Date(unlockTimeIso).getTime();
  const diffHours = (unlock - now) / (1000 * 60 * 60);
  if (diffHours <= 1) return '#ff4757';
  if (diffHours <= 24 * 30) return '#ffa502';
  return '#3742fa';
};

const formatUnlockTime = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const DARK_TILE_URL =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

const MapHandler: React.FC<{
  onLongPress: (lat: number, lng: number) => void;
}> = ({ onLongPress }) => {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressedPos = useRef<[number, number] | null>(null);
  const map = useMapEvents({
    mousedown: (e) => {
      pressedPos.current = [e.latlng.lat, e.latlng.lng];
      pressTimer.current = setTimeout(() => {
        if (pressedPos.current) {
          onLongPress(pressedPos.current[0], pressedPos.current[1]);
        }
      }, LONG_PRESS_MS);
    },
    mouseup: () => {
      if (pressTimer.current) {
        clearTimeout(pressTimer.current);
        pressTimer.current = null;
      }
      pressedPos.current = null;
    },
    mouseleave: () => {
      if (pressTimer.current) {
        clearTimeout(pressTimer.current);
        pressTimer.current = null;
      }
      pressedPos.current = null;
    },
    contextmenu: (e) => {
      e.originalEvent.preventDefault();
    },
    touchstart: (e) => {
      const touch = e.latlng;
      pressedPos.current = [touch.lat, touch.lng];
      pressTimer.current = setTimeout(() => {
        if (pressedPos.current) {
          onLongPress(pressedPos.current[0], pressedPos.current[1]);
        }
      }, LONG_PRESS_MS);
    },
    touchend: () => {
      if (pressTimer.current) {
        clearTimeout(pressTimer.current);
        pressTimer.current = null;
      }
      pressedPos.current = null;
    },
  });
  return null;
};

const BubblePopup: React.FC<{
  lat: number;
  lng: number;
  onBury: () => void;
  onClose: () => void;
}> = ({ lat, lng, onBury, onClose }) => {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={bubbleWrapStyle}
    >
      <div style={bubbleStyle}>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
          坐标: {lat.toFixed(4)}, {lng.toFixed(4)}
        </div>
        <button onClick={onBury} style={buryBtnStyle}>
          在此埋下时间胶囊
        </button>
        <button onClick={onClose} style={bubbleCloseStyle}>
          ×
        </button>
      </div>
    </motion.div>
  );
};

const CapsuleCard: React.FC<{
  capsule: Capsule;
  onClose: () => void;
}> = ({ capsule, onClose }) => {
  const isUnlocked = capsule.is_unlocked;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: -10 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      style={cardWrapStyle}
    >
      <div style={cardStyle}>
        <button onClick={onClose} style={cardCloseStyle}>×</button>
        {isUnlocked ? (
          <>
            <div style={{ fontSize: 14, color: '#333', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 10 }}>
              {capsule.message}
            </div>
            {capsule.image_url && (
              <img
                src={capsule.image_url.startsWith('http') ? capsule.image_url : `/uploads/${capsule.image_url}`}
                alt="capsule"
                style={cardImageStyle}
              />
            )}
            <ReplyPanel capsuleId={capsule.id} />
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🔒</div>
            <div style={{ fontSize: 14, color: '#333', fontWeight: 500, marginBottom: 6 }}>
              此胶囊将在 {formatUnlockTime(capsule.unlock_time)} 解锁
            </div>
            <div style={{ fontSize: 12, color: '#999' }}>请耐心等待</div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const AggregatedMarker: React.FC<{
  count: number;
  position: [number, number];
  onClick: () => void;
}> = ({ count, position, onClick }) => {
  const icon = useMemo(
    () =>
      L.divIcon({
        className: 'custom-cluster',
        html: `<div style="background:rgba(55,66,250,0.85);color:#fff;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${count}</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      }),
    [count]
  );
  return <Marker position={position} icon={icon} eventHandlers={{ click: onClick }} />;
};

const useAggregatedMarkers = (capsules: Capsule[], zoom: number) => {
  return useMemo(() => {
    if (zoom >= 14) {
      return { singles: capsules, clusters: [] as { lat: number; lng: number; count: number }[] };
    }
    const gridSize = zoom < 10 ? 3 : zoom < 12 ? 1.5 : 0.6;
    const map = new Map<string, { lat: number; lng: number; count: number; capsules: Capsule[] }>();
    capsules.forEach((c) => {
      const key = `${Math.floor(c.lat / gridSize)}_${Math.floor(c.lng / gridSize)}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        existing.lat = (existing.lat * (existing.count - 1) + c.lat) / existing.count;
        existing.lng = (existing.lng * (existing.count - 1) + c.lng) / existing.count;
      } else {
        map.set(key, { lat: c.lat, lng: c.lng, count: 1, capsules: [c] });
      }
    });
    const singles: Capsule[] = [];
    const clusters: { lat: number; lng: number; count: number }[] = [];
    map.forEach((v) => {
      if (v.count === 1) singles.push(v.capsules[0]);
      else clusters.push({ lat: v.lat, lng: v.lng, count: v.count });
    });
    return { singles, clusters };
  }, [capsules, zoom]);
};

const ZoomListener: React.FC<{ onZoom: (z: number) => void }> = ({ onZoom }) => {
  const map = useMap();
  useEffect(() => {
    const handler = () => onZoom(map.getZoom());
    map.on('zoomend', handler);
    onZoom(map.getZoom());
    return () => map.off('zoomend', handler);
  }, [map, onZoom]);
  return null;
};

const CapsuleMap: React.FC = () => {
  const { userPosition, capsules } = useAppContext();
  const [zoom, setZoom] = useState(13);
  const [longPressPos, setLongPressPos] = useState<[number, number] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formPos, setFormPos] = useState<[number, number] | null>(null);
  const [selectedCapsule, setSelectedCapsule] = useState<Capsule | null>(null);

  const { singles, clusters } = useAggregatedMarkers(capsules, zoom);

  const handleLongPress = (lat: number, lng: number) => {
    setLongPressPos([lat, lng]);
    setSelectedCapsule(null);
  };

  const handleBury = () => {
    if (longPressPos) {
      setFormPos(longPressPos);
      setShowForm(true);
      setLongPressPos(null);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setFormPos(null);
  };

  if (!userPosition) return null;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapContainer
        center={userPosition}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer
          url={DARK_TILE_URL}
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <ZoomListener onZoom={setZoom} />
        <MapHandler onLongPress={handleLongPress} />

        {singles.map((c) => (
          <CircleMarker
            key={c.id}
            center={[c.lat, c.lng]}
            radius={6}
            pathOptions={{
              color: '#fff',
              weight: 2,
              fillColor: getCapsuleColor(c.unlock_time),
              fillOpacity: 1,
            }}
            eventHandlers={{
              click: () => {
                setSelectedCapsule(c);
                setLongPressPos(null);
              },
            }}
          />
        ))}

        {clusters.map((cl, i) => (
          <AggregatedMarker
            key={`cl-${i}`}
            count={cl.count}
            position={[cl.lat, cl.lng]}
            onClick={() => {}}
          />
        ))}

        {longPressPos && (
          <Marker position={longPressPos} interactive={false} opacity={0}>
            <Popup open autoClose={false} closeButton={false} className="bubble-popup">
              <BubblePopup
                lat={longPressPos[0]}
                lng={longPressPos[1]}
                onBury={handleBury}
                onClose={() => setLongPressPos(null)}
              />
            </Popup>
          </Marker>
        )}
      </MapContainer>

      <AnimatePresence>
        {selectedCapsule && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 500,
            }}
            onClick={() => setSelectedCapsule(null)}
          >
            <div style={{ pointerEvents: 'auto' }} onClick={(e) => e.stopPropagation()}>
              <CapsuleCard capsule={selectedCapsule} onClose={() => setSelectedCapsule(null)} />
            </div>
          </div>
        )}
      </AnimatePresence>

      {showForm && formPos && (
        <CapsuleForm lat={formPos[0]} lng={formPos[1]} onClose={handleCloseForm} />
      )}

      <style>{`
        .leaflet-container {
          background: #1a1a2e !important;
        }
        .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
        }
        .leaflet-popup-tip {
          display: none !important;
        }
        .leaflet-popup-close-button {
          display: none !important;
        }
      `}</style>
    </div>
  );
};

const bubbleWrapStyle: React.CSSProperties = {
  position: 'relative',
};

const bubbleStyle: React.CSSProperties = {
  position: 'relative',
  backgroundColor: 'rgba(255,255,255,0.95)',
  borderRadius: 12,
  padding: '12px 16px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
  minWidth: 180,
};

const buryBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 0',
  backgroundColor: '#3742fa',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
};

const bubbleCloseStyle: React.CSSProperties = {
  position: 'absolute',
  top: 4,
  right: 8,
  background: 'none',
  border: 'none',
  fontSize: 18,
  color: '#999',
  cursor: 'pointer',
  padding: 0,
  lineHeight: 1,
};

const cardWrapStyle: React.CSSProperties = {
  maxWidth: 360,
  width: '90vw',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: '18px 18px 14px',
  boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
  position: 'relative',
  maxHeight: '70vh',
  overflowY: 'auto',
};

const cardCloseStyle: React.CSSProperties = {
  position: 'absolute',
  top: 8,
  right: 10,
  background: 'none',
  border: 'none',
  fontSize: 22,
  color: '#aaa',
  cursor: 'pointer',
  padding: 0,
  lineHeight: 1,
  width: 28,
  height: 28,
};

const cardImageStyle: React.CSSProperties = {
  width: '100%',
  maxHeight: 220,
  objectFit: 'cover',
  borderRadius: 8,
  marginBottom: 4,
};

export default CapsuleMap;
