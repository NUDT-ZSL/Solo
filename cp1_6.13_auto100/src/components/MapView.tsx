import { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { TravelLocation, TravelTheme } from '../types';

const THEME_COLORS: Record<TravelTheme, string> = {
  city: '#3b82f6',
  nature: '#22c55e',
  adventure: '#f59e0b',
};

function createCustomMarker(color: string) {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background: ${color};
        border: 3px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        transform: translate(-50%, -50%);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

interface MapFlyToProps {
  lat: number | null;
  lng: number | null;
  zoom?: number;
}

function MapFlyTo({ lat, lng, zoom = 6 }: MapFlyToProps) {
  const map = useMap();

  useEffect(() => {
    if (lat !== null && lng !== null) {
      map.flyTo([lat, lng], zoom, {
        duration: 1.2,
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
    if (flyToLat !== null && flyToLng !== null) {
      return [flyToLat, flyToLng];
    }
    return [20, 0];
  }, [flyToLat, flyToLng]);

  const selectedLocation = useMemo(
    () => locations.find((l) => l.id === selectedId) || null,
    [locations, selectedId]
  );

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
        style={{ height: '100%', width: '100%', background: '#0f172a' }}
        worldCopyJump={true}
        preferCanvas={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        {locations.map((loc) => {
          const isSelected = loc.id === selectedId;
          const marker = createCustomMarker(THEME_COLORS[loc.theme]);

          return (
            <Marker
              key={loc.id}
              position={[loc.lat, loc.lng]}
              icon={marker}
              eventHandlers={{
                click: () => onLocationClick(loc.id),
                mouseover: (e) => {
                  const el = e.target.getElement() as HTMLElement | null;
                  if (el) {
                    const inner = el.querySelector('div') as HTMLElement | null;
                    if (inner) {
                      inner.style.transform = 'translate(-50%, -50%) scale(1.25)';
                      inner.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.6)';
                    }
                  }
                },
                mouseout: (e) => {
                  const el = e.target.getElement() as HTMLElement | null;
                  if (el) {
                    const inner = el.querySelector('div') as HTMLElement | null;
                    if (inner) {
                      inner.style.transform = 'translate(-50%, -50%) scale(1)';
                      inner.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
                    }
                  }
                },
              }}
            >
              <Popup
                closeButton={false}
                autoPan={false}
                className="custom-popup"
              >
                <div style={{ padding: '4px 8px', fontFamily: 'system-ui, sans-serif' }}>
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
        })}

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
        }
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        .custom-popup .leaflet-popup-content {
          margin: 0;
        }
        .leaflet-container {
          background: #0f172a !important;
          outline: none;
        }
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3) !important;
          border-radius: 10px !important;
          overflow: hidden;
        }
        .leaflet-control-zoom a {
          background: #1e293b !important;
          color: #e2e8f0 !important;
          border: none !important;
          width: 36px !important;
          height: 36px !important;
          line-height: 36px !important;
          font-size: 18px !important;
          transition: background 0.2s ease;
        }
        .leaflet-control-zoom a:hover {
          background: #334155 !important;
          color: #ffffff !important;
        }
        .leaflet-control-attribution {
          background: rgba(15, 23, 42, 0.8) !important;
          backdrop-filter: blur(8px);
          color: #94a3b8 !important;
          font-size: 10px !important;
          padding: 4px 12px !important;
          border-radius: 8px 0 0 0 !important;
        }
        .leaflet-control-attribution a {
          color: #60a5fa !important;
        }
      `}</style>
    </div>
  );
}
