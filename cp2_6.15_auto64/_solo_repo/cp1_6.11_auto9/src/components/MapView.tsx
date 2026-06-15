import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { useStore } from '@/store/useStore';
import { TAG_COLORS } from '@/types';
import type { MarkerData, EmotionTag } from '@/types';

const MAPBOX_TOKEN = 'pk.eyJ1Ijoic291bmRzY2FwZWRlbW8iLCJhIjoiY2xrZXh0ZXN0MSJ9.placeholder';

interface MapViewProps {
  onMarkerClick: (marker: MarkerData) => void;
  onMapClick: (lng: number, lat: number) => void;
}

function createWaveSVG(color: string): string {
  return `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="16" fill="${color}" opacity="0.2"/>
    <circle cx="20" cy="20" r="10" fill="${color}" opacity="0.5"/>
    <g transform="translate(20,20)">
      <rect x="-8" y="-1" width="2" height="2" rx="1" fill="white" opacity="0.9">
        <animate attributeName="height" values="2;12;2" dur="1.2s" repeatCount="indefinite"/>
        <animate attributeName="y" values="-1;-6;-1" dur="1.2s" repeatCount="indefinite"/>
      </rect>
      <rect x="-3" y="-1" width="2" height="2" rx="1" fill="white" opacity="0.9">
        <animate attributeName="height" values="2;16;2" dur="1.2s" begin="0.15s" repeatCount="indefinite"/>
        <animate attributeName="y" values="-1;-8;-1" dur="1.2s" begin="0.15s" repeatCount="indefinite"/>
      </rect>
      <rect x="2" y="-1" width="2" height="2" rx="1" fill="white" opacity="0.9">
        <animate attributeName="height" values="2;10;2" dur="1.2s" begin="0.3s" repeatCount="indefinite"/>
        <animate attributeName="y" values="-1;-5;-1" dur="1.2s" begin="0.3s" repeatCount="indefinite"/>
      </rect>
      <rect x="7" y="-1" width="2" height="2" rx="1" fill="white" opacity="0.9">
        <animate attributeName="height" values="2;14;2" dur="1.2s" begin="0.45s" repeatCount="indefinite"/>
        <animate attributeName="y" values="-1;-7;-1" dur="1.2s" begin="0.45s" repeatCount="indefinite"/>
      </rect>
    </g>
  </svg>`;
}

export default function MapView({ onMarkerClick, onMapClick }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const { markers, setSelectedMarker } = useStore();

  const updateMarkers = useCallback((markerList: MarkerData[]) => {
    if (!mapRef.current) return;

    const existingIds = new Set(markersRef.current.keys());
    const newIds = new Set(markerList.map((m) => m.id));

    for (const id of existingIds) {
      if (!newIds.has(id)) {
        const m = markersRef.current.get(id);
        if (m) {
          m.remove();
          markersRef.current.delete(id);
        }
      }
    }

    for (const markerData of markerList) {
      const color = TAG_COLORS[markerData.tag as EmotionTag] || '#D4A373';

      if (markersRef.current.has(markerData.id)) {
        const existing = markersRef.current.get(markerData.id)!;
        existing.setLngLat([markerData.lng, markerData.lat]);
      } else {
        const el = document.createElement('div');
        el.className = 'sound-wave-marker';
        el.innerHTML = createWaveSVG(color);
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onMarkerClick(markerData);
        });

        const mbMarker = new mapboxgl.Marker({
          element: el,
          draggable: false,
          anchor: 'center',
        })
          .setLngLat([markerData.lng, markerData.lat])
          .addTo(mapRef.current!);

        markersRef.current.set(markerData.id, mbMarker);
      }
    }
  }, [onMarkerClick]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [116.4074, 39.9042],
      zoom: 12,
      accessToken: MAPBOX_TOKEN,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), 'top-right');

    map.on('click', (e) => {
      onMapClick(e.lngLat.lng, e.lngLat.lat);
    });

    map.on('load', () => {
      map.resize();
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    updateMarkers(markers);
  }, [markers, updateMarkers]);

  const enableDragForMarker = useCallback((markerId: string) => {
    const mbMarker = markersRef.current.get(markerId);
    if (!mbMarker) return;

    const el = mbMarker.getElement();
    mbMarker.setDraggable(true);

    mbMarker.on('dragend', () => {
      const lngLat = mbMarker.getLngLat();
      useStore.getState().updateMarker({
        ...useStore.getState().markers.find((m) => m.id === markerId)!,
        lng: lngLat.lng,
        lat: lngLat.lat,
      });
    });
  }, []);

  return (
    <div
      ref={mapContainer}
      className="w-full h-full rounded-2xl overflow-hidden"
      style={{ boxShadow: 'rgba(0,0,0,0.1) 0px 4px 12px' }}
    />
  );
}
