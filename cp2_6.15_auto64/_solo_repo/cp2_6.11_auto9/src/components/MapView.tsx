import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import type { SoundMarker } from '../../shared/types';
import { EMOTION_COLORS } from '../../shared/types';

const MAPBOX_TOKEN = 'pk.placeholder_replace_with_real_token';

interface MapViewProps {
  markers: SoundMarker[];
  onMarkerClick: (marker: SoundMarker) => void;
  onMapClick: (lat: number, lng: number) => void;
  onMarkerDragEnd: (id: string, lat: number, lng: number) => void;
  userLocation: { lat: number; lng: number } | null;
  searchQuery: string;
}

interface MarkerEntry {
  id: string;
  marker: mapboxgl.Marker;
  el: HTMLElement;
}

export default function MapView({
  markers,
  onMarkerClick,
  onMapClick,
  onMarkerDragEnd,
  userLocation,
  searchQuery,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerEntries = useRef<MarkerEntry[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const center: [number, number] = userLocation
      ? [userLocation.lng, userLocation.lat]
      : [116.397, 39.908];

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center,
      zoom: 12,
      accessToken: MAPBOX_TOKEN,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    map.on('click', (e) => {
      onMapClick(e.lngLat.lat, e.lngLat.lng);
    });

    mapRef.current = map;

    return () => {
      markerEntries.current.forEach((entry) => entry.marker.remove());
      markerEntries.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const createWaveElement = useCallback(
    (tag: string, isHighlighted: boolean) => {
      const el = document.createElement('div');
      el.className = 'marker-wave-container';
      el.style.cssText = `
        position: relative;
        width: 28px;
        height: 28px;
        cursor: pointer;
        ${isHighlighted ? 'transform: scale(1.4); z-index: 10;' : ''}
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      `;

      const color = EMOTION_COLORS[tag as keyof typeof EMOTION_COLORS] || '#D4A373';

      for (let i = 0; i < 3; i++) {
        const bar = document.createElement('div');
        bar.className = 'wave-bar';
        bar.style.cssText = `
          position: absolute;
          bottom: 0;
          width: 3px;
          background: ${color};
          border-radius: 2px;
          animation: wave 1.2s ease-in-out infinite;
          animation-delay: ${i * 0.15}s;
          left: ${4 + i * 8}px;
          height: 12px;
        `;
        el.appendChild(bar);
      }

      const ripple = document.createElement('div');
      ripple.className = 'marker-ripple';
      ripple.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        width: 60px;
        height: 60px;
        margin: -30px 0 0 -30px;
        border-radius: 50%;
        border: 2px solid ${color};
        animation: ripple 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        pointer-events: none;
      `;
      el.appendChild(ripple);

      setTimeout(() => ripple.remove(), 900);

      return el;
    },
    []
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existingIds = new Set(markerEntries.current.map((e) => e.id));
    const newMarkerIds = new Set(markers.map((m) => m.id));

    for (const entry of markerEntries.current) {
      if (!newMarkerIds.has(entry.id)) {
        entry.marker.remove();
      }
    }

    const remaining = markerEntries.current.filter((e) =>
      newMarkerIds.has(e.id)
    );
    markerEntries.current = remaining;

    for (const m of markers) {
      if (existingIds.has(m.id)) {
        const existing = markerEntries.current.find((e) => e.id === m.id);
        if (existing) {
          const isHighlighted =
            searchQuery &&
            m.title.toLowerCase().includes(searchQuery.toLowerCase());
          const newEl = createWaveElement(
            m.emotionTag,
            !!isHighlighted
          );
          existing.marker.setLngLat([m.lng, m.lat]);
          existing.el.replaceWith(newEl);
          existing.el = newEl;
        }
        continue;
      }

      const isHighlighted =
        searchQuery && m.title.toLowerCase().includes(searchQuery.toLowerCase());
      const el = createWaveElement(m.emotionTag, !!isHighlighted);

      const marker = new mapboxgl.Marker({
        element: el,
        draggable: false,
      })
        .setLngLat([m.lng, m.lat])
        .addTo(map);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onMarkerClick(m);
      });

      markerEntries.current.push({ id: m.id, marker, el });
    }
  }, [markers, searchQuery, createWaveElement, onMarkerClick]);

  useEffect(() => {
    if (!mapRef.current || !userLocation) return;
    mapRef.current.flyTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: 12,
    });
  }, [userLocation]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={mapContainer}
        className="absolute inset-0 rounded-map overflow-hidden shadow-map"
      />
    </div>
  );
}
