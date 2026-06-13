import { useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { TravelLocation, TravelTheme } from '../types';

const THEME_COLORS: Record<TravelTheme, string> = {
  city: '#3b82f6',
  nature: '#22c55e',
  adventure: '#f59e0b',
};

function createCustomMarker(color: string, selected: boolean) {
  const size = selected ? 32 : 24;
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 3px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 ${selected ? 8 : 4}px ${selected ? 24 : 12}px rgba(0, 0, 0, ${selected ? 0.6 : 0.4});
        transform: translate(-50%, -50%);
        transition: transform 0.2s ease, box-shadow 0.2s ease, width 0.2s ease, height 0.2s ease;
        will-change: transform;
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

interface MapFlyToProps {
  lat: number | null;
  lng: number | null;
  zoom?: number;
}

function MapFlyTo({ lat, lng, zoom = 6 }: MapFlyToProps) {
  const map = useMap();
  const lastPos = useRef<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  useEffect(() => {
    if (lat !== null && lng !== null && (lastPos.current.lat !== lat || lastPos.current.lng !== lng)) {
      lastPos.current = { lat, lng };
      map.flyTo([lat, lng], zoom, {
        duration: 1.0,
        easeLinearity: 0.25,
      });
    }
  }, [lat, lng, zoom, map]);

  return null;
}

interface MapViewProps {
  locations: TravelLocation[];
  selectedId: string | null;
  onLocationClick: (id: string) => void;
  flyToLat: number | null;
  flyToLng: number | null;
}

export function MapView({ locations, selectedId, onLocationClick, flyToLat, flyToLng }: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);

  const center: [number, number] = useMemo(() => {
    return [20, 0];
  }, []);

  const selectedLocation = useMemo(
    () => locations.find((l) => l.id === selectedId) || null,
    [locations, selectedId]
  );

  const handleMarkerClick = useCallback(
    (id: string) => {
      onLocationClick(id);
    },
    [onLocationClick]
  );

  const MarkersMemo = useMemo(() => {
    return locations.map((loc) => {
      const isSelected = loc.id === selectedId;
      const marker = createCustomMarker(THEME_COLORS[loc.theme], isSelected);

      return (
        <Marker
          key={loc.id}
          position={[loc.lat, loc.lng]}
          icon={marker}
          eventHandlers={{
            click: () => handleMarkerClick(loc.id),
            mouseover: (e) => {
              const el = e.target.getElement() as HTMLElement | null;
              if (el) {
                const inner = el.querySelector('div') as HTMLElement | null;
                if (inner) {
                  inner.style.transform = 'translate(-50%, -50%) scale(1.25)';
                }
              }
            },
            mouseout: (e) => {
              const el = e.target.getElement() as HTMLElement | null;
              if (el) {
                const inner = el.querySelector('div') as HTMLElement | null;
                if (inner) {
                  inner.style.transform = 'translate(-50%, -50%) scale(1)';
                }
              }
            },
          }}
        >
          <Popup
            closeButton={false}
            autoPan={false}
            offset={[0, -8]}
            className="custom-popup"
          >
            <div style={{ padding: '6px 10px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>
                {loc.name}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                {loc.country}
              </div>
            </div>
          </Popup>
        </Marker>
      );
    });
  }, [locations, selectedId, handleMarkerClick]);

  return (
    <div className="map-wrapper">
      <MapContainer
        ref={mapRef as unknown as React.MutableRefObject<L.Map>}
        center={center}
        zoom={2}
        minZoom={2}
        maxZoom={18}
        zoomControl={true}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        worldCopyJump={true}
        preferCanvas={true}
        updateWhenZooming={false}
        updateWhenIdle={true}
        fadeAnimation={true}
        zoomAnimation={true}
        markerZoomAnimation={true}
        zoomAnimationThreshold={4}
        trackResize={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
          className="dark-tile-layer"
        />

        {MarkersMemo}

        <MapFlyTo
          lat={selectedLocation ? selectedLocation.lat : flyToLat}
          lng={selectedLocation ? selectedLocation.lng : flyToLng}
          zoom={selectedLocation ? 8 : 2}
        />
      </MapContainer>

      <style>{`
        .map-wrapper {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 0;
          overflow: hidden;
        }

        .leaflet-container {
          background: #0f172a !important;
          outline: none;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .dark-tile-layer {
          filter:
            brightness(0.85)
            contrast(1.1)
            saturate(0.9)
            hue-rotate(-5deg);
        }

        .leaflet-tile-pane {
          filter:
            brightness(0.9)
            contrast(1.05);
          opacity: 1;
          transform: translate3d(0,0,0);
          will-change: transform;
        }

        .leaflet-tile {
          filter: sepia(0.05) saturate(0.85) brightness(0.8);
          outline: none;
        }

        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 10px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
          background: #ffffff;
          padding: 0;
        }

        .custom-popup .leaflet-popup-content {
          margin: 0;
        }

        .custom-popup .leaflet-popup-tip {
          background: #ffffff;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
        }

        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35) !important;
          border-radius: 12px !important;
          overflow: hidden;
          margin-right: 20px !important;
          margin-top: 20px !important;
        }

        .leaflet-control-zoom a {
          background: #1e293b !important;
          color: #e2e8f0 !important;
          border: none !important;
          width: 40px !important;
          height: 40px !important;
          line-height: 40px !important;
          font-size: 20px !important;
          font-weight: 300;
          transition: background 0.2s ease, color 0.2s ease;
        }

        .leaflet-control-zoom a:hover {
          background: #334155 !important;
          color: #ffffff !important;
        }

        .leaflet-control-zoom a.leaflet-disabled {
          background: #1e293b !important;
          color: #475569 !important;
          cursor: not-allowed;
        }

        .leaflet-control-attribution {
          background: rgba(15, 23, 42, 0.85) !important;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          color: #94a3b8 !important;
          font-size: 10px !important;
          padding: 4px 12px !important;
          border-radius: 8px 0 0 0 !important;
          border-top: 1px solid rgba(71, 85, 105, 0.3) !important;
          border-left: 1px solid rgba(71, 85, 105, 0.3) !important;
        }

        .leaflet-control-attribution a {
          color: #60a5fa !important;
          text-decoration: none;
        }

        .leaflet-control-attribution a:hover {
          text-decoration: underline;
        }

        .custom-marker {
          background: transparent !important;
          border: none !important;
        }

        @media (max-width: 1024px) {
          .leaflet-control-zoom {
            margin-right: 12px !important;
            margin-top: 12px !important;
          }
        }
      `}</style>
    </div>
  );
}
