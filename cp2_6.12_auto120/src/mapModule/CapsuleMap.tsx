import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents, CircleMarker } from 'react-leaflet';
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

interface PointerEventExt {
  latlng: L.LatLng;
  originalEvent: PointerEvent;
}

const MapHandler: React.FC<{
  onLongPress: (lat: number, lng: number) => void;
}> = ({ onLongPress }) => {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressedPos = useRef<[number, number] | null>(null);
  const triggered = useRef(false);
  const map = useMap();

  const clearTimer = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pressedPos.current = null;
  }, []);

  useEffect(() => {
    const el = map.getContainer();

    const handlePointerDown = (ev: PointerEvent) => {
      if (ev.button !== 0 && ev.pointerType === 'mouse') return;
      const point = map.mouseEventToLatLng(ev as unknown as MouseEvent);
      pressedPos.current = [point.lat, point.lng];
      triggered.current = false;
      pressTimer.current = setTimeout(() => {
        if (pressedPos.current) {
          triggered.current = true;
          onLongPress(pressedPos.current[0], pressedPos.current[1]);
        }
      }, LONG_PRESS_MS);
    };

    const handlePointerUp = () => clearTimer();
    const handlePointerLeave = () => clearTimer();
    const handlePointerMove = (ev: PointerEvent) => {
      if (pressTimer.current && !triggered.current) {
        const threshold = 8;
        if (ev.movementX && ev.movementY && (Math.abs(ev.movementX) > threshold || Math.abs(ev.movementY) > threshold)) {
          clearTimer();
        }
      }
    };
    const handleContextMenu = (ev: Event) => ev.preventDefault();

    el.addEventListener('pointerdown', handlePointerDown);
    el.addEventListener('pointerup', handlePointerUp);
    el.addEventListener('pointercancel', handlePointerUp);
    el.addEventListener('pointerleave', handlePointerLeave);
    el.addEventListener('pointermove', handlePointerMove);
    el.addEventListener('contextmenu', handleContextMenu);

    return () => {
      el.removeEventListener('pointerdown', handlePointerDown);
      el.removeEventListener('pointerup', handlePointerUp);
      el.removeEventListener('pointercancel', handlePointerUp);
      el.removeEventListener('pointerleave', handlePointerLeave);
      el.removeEventListener('pointermove', handlePointerMove);
      el.removeEventListener('contextmenu', handleContextMenu);
      clearTimer();
    };
  }, [map, onLongPress, clearTimer]);

  return null;
};

const BubbleOverlay: React.FC<{
  lat: number;
  lng: number;
  onBury: () => void;
  onClose: () => void;
}> = ({ lat, lng, onBury, onClose }) => {
  const map = useMap();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const update = () => {
      const p = map.latLngToContainerPoint([lat, lng]);
      setPos({ x: p.x, y: p.y });
    };
    update();
    map.on('move', update);
    map.on('zoom', update);
    return () => {
      map.off('move', update);
      map.off('zoom', update);
    };
  }, [map, lat, lng]);

  if (!pos) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        transform: 'translate(-50%, -100%) translateY(-12px)',
        pointerEvents: 'auto',
        zIndex: 600,
      }}
    >
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={bubbleStyle}
      >
        <div style={{ fontSize: 12, color: 'rgba(180,180,200,0.95)', marginBottom: 8 }}>
          坐标精度: {lat.toFixed(4)}, {lng.toFixed(4)}
        </div>
        <button onClick={onBury} style={buryBtnStyle}>
          在此埋下时间胶囊
        </button>
        <button onClick={onClose} style={bubbleCloseStyle} aria-label="关闭">
          ×
        </button>
        <div
          style={{
            position: 'absolute',
            bottom: -8,
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            width: 14,
            height: 14,
            backgroundColor: 'rgba(26,26,46,0.92)',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        />
      </motion.div>
    </div>
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
      transition={{ type: 'spring', stiffness: 420, damping: 22, mass: 0.9 }}
      style={cardWrapStyle}
    >
      <div style={cardStyle}>
        <button onClick={onClose} style={cardCloseStyle} aria-label="关闭">×</button>
        {isUnlocked ? (
          <>
            <div style={{ fontSize: 14, color: '#333', lineHeight: 1.65, whiteSpace: 'pre-wrap', marginBottom: 12 }}>
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
          <div style={{ textAlign: 'center', padding: '14px 0 10px' }}>
            <div style={{ fontSize: 40, marginBottom: 12, lineHeight: 1 }}>🔒</div>
            <div style={{ fontSize: 15, color: '#2a2a3e', fontWeight: 600, marginBottom: 8 }}>
              此胶囊将在 {formatUnlockTime(capsule.unlock_time)} 解锁
            </div>
            <div style={{ fontSize: 12, color: '#888' }}>请耐心等待</div>
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
        html: `<div style="background:rgba(55,66,250,0.88);color:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35)">${count}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
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

const CoordinateOverlay: React.FC = () => {
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

  const handleLongPress = useCallback((lat: number, lng: number) => {
    setLongPressPos([lat, lng]);
    setSelectedCapsule(null);
  }, []);

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
        style={{ width: '100%', height: '100%', background: '#1a1a2e' }}
        zoomControl={true}
        attributionControl={false}
        worldCopyJump={true}
        preferCanvas={true}
      >
        <TileLayer
          url={DARK_TILE_URL}
          attribution=''
          className='dark-tile-layer'
        />
        <ZoomListener onZoom={setZoom} />
        <MapHandler onLongPress={handleLongPress} />

        {singles.map((c) => (
          <CircleMarker
            key={c.id}
            center={[c.lat, c.lng]}
            radius={7}
            pathOptions={{
              color: '#ffffff',
              weight: 2.5,
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
      </MapContainer>

      {longPressPos && (
        <BubbleOverlay
          lat={longPressPos[0]}
          lng={longPressPos[1]}
          onBury={handleBury}
          onClose={() => setLongPressPos(null)}
        />
      )}

      <AnimatePresence>
        {selectedCapsule && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 500,
              padding: 20,
            }}
            onClick={() => setSelectedCapsule(null)}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <CapsuleCard capsule={selectedCapsule} onClose={() => setSelectedCapsule(null)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showForm && formPos && (
        <CapsuleForm lat={formPos[0]} lng={formPos[1]} onClose={handleCloseForm} />
      )}

      <style>{`
        .leaflet-container {
          background: #1a1a2e !important;
          outline: none;
          font-family: inherit;
        }
        .leaflet-control-zoom a {
          background: rgba(22,33,62,0.95) !important;
          color: #e0e0e0 !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
        }
        .leaflet-control-zoom a:hover {
          background: rgba(55,66,250,0.9) !important;
          color: #fff !important;
        }
        .dark-tile-layer {
          filter:
            hue-rotate(-5deg)
            saturate(0.85)
            brightness(0.92)
            contrast(1.05);
        }
        .dark-tile-layer + .leaflet-tile-container img,
        .leaflet-tile {
          filter:
            hue-rotate(-5deg)
            saturate(0.85)
            brightness(0.92)
            contrast(1.05) !important;
        }
        .custom-cluster {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-interactive {
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

const bubbleStyle: React.CSSProperties = {
  position: 'relative',
  backgroundColor: 'rgba(26,26,46,0.92)',
  backdropFilter: 'blur(10px)',
  borderRadius: 12,
  padding: '14px 16px 14px',
  boxShadow: '0 6px 24px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)',
  minWidth: 210,
  border: '1px solid rgba(255,255,255,0.08)',
};

const buryBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 0',
  backgroundColor: '#3742fa',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  letterSpacing: 0.3,
};

const bubbleCloseStyle: React.CSSProperties = {
  position: 'absolute',
  top: 4,
  right: 6,
  background: 'none',
  border: 'none',
  fontSize: 20,
  color: 'rgba(200,200,220,0.7)',
  cursor: 'pointer',
  padding: 0,
  lineHeight: 1,
  width: 24,
  height: 24,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const cardWrapStyle: React.CSSProperties = {
  maxWidth: 380,
  width: '100%',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: 14,
  padding: '22px 20px 16px',
  boxShadow: '0 12px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.05)',
  position: 'relative',
  maxHeight: '75vh',
  overflowY: 'auto',
};

const cardCloseStyle: React.CSSProperties = {
  position: 'absolute',
  top: 8,
  right: 10,
  background: 'none',
  border: 'none',
  fontSize: 24,
  color: '#b0b0b0',
  cursor: 'pointer',
  padding: 0,
  lineHeight: 1,
  width: 30,
  height: 30,
};

const cardImageStyle: React.CSSProperties = {
  width: '100%',
  maxHeight: 240,
  objectFit: 'cover',
  borderRadius: 10,
  marginBottom: 8,
};

export default CapsuleMap;
