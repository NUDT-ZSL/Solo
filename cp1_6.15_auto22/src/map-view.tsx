import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import L from 'leaflet';
import { TravelRecord, haversineDistance } from './data-store';

interface MapViewProps {
  records: TravelRecord[];
  visibleIds: Set<string>;
  activeId: string | null;
  onActiveChange: (id: string | null) => void;
}

function createCircleIcon(index: number, zoom: number): L.DivIcon {
  const baseSize = 32;
  const scale = zoom >= 12 ? 1.3 : zoom >= 8 ? 1.0 : 0.7;
  const size = Math.round(baseSize * scale);
  const fontSize = Math.round(14 * scale);
  return L.divIcon({
    className: 'custom-marker-icon-wrapper',
    html: `<div class="custom-marker-icon" data-index="${index}" style="width:${size}px;height:${size}px;font-size:${fontSize}px;line-height:${size}px;">${index}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function buildPopupContent(record: TravelRecord): string {
  const images = record.imageUrls
    .map(
      (url) =>
        `<img src="${url}" alt="" class="popup-image" onerror="this.style.display='none'" />`
    )
    .join('');
  return `
    <div class="popup-card">
      <h4 class="popup-title">${record.placeName}</h4>
      <p class="popup-time">${record.arriveTime.replace('T', ' ')} → ${record.leaveTime.replace('T', ' ')}</p>
      <p class="popup-desc">${record.description || '暂无描述'}</p>
      ${images ? `<div class="popup-images">${images}</div>` : ''}
    </div>
  `;
}

export default function MapView({
  records,
  visibleIds,
  activeId,
  onActiveChange,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const prevVisibleRef = useRef<Set<string>>(new Set());
  const initialCenterSet = useRef(false);

  const sorted = useMemo(
    () => [...records].sort((a, b) => a.arriveTime.localeCompare(b.arriveTime)),
    [records]
  );

  const indexMap = useMemo(() => {
    const m = new Map<string, number>();
    sorted.forEach((r, i) => m.set(r.id, i + 1));
    return m;
  }, [sorted]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [30, 110],
      zoom: 5,
      minZoom: 3,
      maxZoom: 18,
      zoomControl: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (records.length > 0 && !initialCenterSet.current) {
      const first = sorted[0];
      map.setView([first.latitude, first.longitude], 10, {
        animate: true,
        duration: 0.5,
      });
      initialCenterSet.current = true;
    }
  }, [records, sorted]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const prevVisible = prevVisibleRef.current;
    const toAdd: string[] = [];
    const toRemove = new Set<string>();

    visibleIds.forEach((id) => {
      if (!prevVisible.has(id)) toAdd.push(id);
    });
    prevVisible.forEach((id) => {
      if (!visibleIds.has(id)) toRemove.add(id);
    });

    toAdd.sort((a, b) => {
      const ra = records.find((r) => r.id === a);
      const rb = records.find((r) => r.id === b);
      if (!ra || !rb) return 0;
      return ra.arriveTime.localeCompare(rb.arriveTime);
    });

    toRemove.forEach((id) => {
      const marker = markersRef.current.get(id);
      if (marker) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    const timeouts: number[] = [];
    toAdd.forEach((id, idx) => {
      const delay = idx * 120;
      const t = window.setTimeout(() => {
        if (!mapRef.current) return;
        const record = records.find((r) => r.id === id);
        if (!record) return;
        const existing = markersRef.current.get(id);
        if (existing) return;
        const idxNum = indexMap.get(id) || 1;
        const zoom = mapRef.current.getZoom();
        const icon = createCircleIcon(idxNum, zoom);
        const popupZindex = 9000 + zoom * 100 + idxNum;
        const marker = L.marker([record.latitude, record.longitude], {
          icon,
          keyboard: false,
        }).addTo(mapRef.current);
        marker.bindPopup(buildPopupContent(record), {
          maxWidth: 300,
          className: 'custom-popup',
          autoPan: true,
          autoPanPadding: [40, 40],
          offset: L.point(0, -4),
        });
        marker.on('popupopen', () => {
          const pw = (marker as any)._popupWrapper as HTMLElement | undefined;
          if (pw) pw.style.zIndex = String(popupZindex);
        });
        marker.on('click', () => onActiveChange(id));
        const el = marker.getElement();
        if (el) {
          const inner = el.querySelector('.custom-marker-icon') as HTMLElement | null;
          if (inner) {
            inner.style.animation = 'none';
            void inner.offsetWidth;
            inner.style.animation = '';
            inner.classList.add('marker-bounce-in');
            inner.addEventListener('animationend', () => {
              inner.classList.remove('marker-bounce-in');
            }, { once: true });
          }
          el.style.zIndex = String(500 + idxNum);
        }
        markersRef.current.set(id, marker);
      }, delay);
      timeouts.push(t);
    });

    prevVisibleRef.current = new Set(visibleIds);
    return () => {
      timeouts.forEach((t) => window.clearTimeout(t));
    };
  }, [visibleIds, records, indexMap, onActiveChange]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activeId) return;
    const record = records.find((r) => r.id === activeId);
    if (!record) return;
    map.flyTo([record.latitude, record.longitude], map.getZoom(), {
      duration: 0.5,
    });
    const marker = markersRef.current.get(activeId);
    if (marker) {
      marker.openPopup();
    }
  }, [activeId, records]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onZoom = () => {
      const zoom = map.getZoom();
      markersRef.current.forEach((marker, id) => {
        const idx = indexMap.get(id) || 1;
        marker.setIcon(createCircleIcon(idx, zoom));
        const pw = (marker as any)._popupWrapper as HTMLElement | undefined;
        if (pw) pw.style.zIndex = String(9000 + zoom * 100 + idx);
        const el = marker.getElement();
        if (el) el.style.zIndex = String(500 + idx);
      });
    };
    map.on('zoomend', onZoom);
    return () => {
      map.off('zoomend', onZoom);
    };
  }, [indexMap]);

  return <div ref={containerRef} className="map-container" />;
}

export function computeStats(records: TravelRecord[]) {
  if (records.length === 0) {
    return { totalDays: 0, cityCount: 0, longestStay: '--', avgDailyDist: 0 };
  }
  const sorted = [...records].sort((a, b) =>
    a.arriveTime.localeCompare(b.arriveTime)
  );
  let totalDays = 0;
  let longestDays = 0;
  let longestPlace = '--';
  sorted.forEach((r) => {
    const arrive = new Date(r.arriveTime).getTime();
    const leave = new Date(r.leaveTime).getTime();
    const days = Math.max(1, Math.round((leave - arrive) / 86400000));
    totalDays += days;
    if (days > longestDays) {
      longestDays = days;
      longestPlace = r.placeName;
    }
  });
  const cities = new Set(sorted.map((r) => r.placeName));
  let totalDist = 0;
  for (let i = 1; i < sorted.length; i++) {
    totalDist += haversineDistance(
      sorted[i - 1].latitude,
      sorted[i - 1].longitude,
      sorted[i].latitude,
      sorted[i].longitude
    );
  }
  const avgDailyDist = totalDays > 0 ? totalDist / totalDays : 0;
  return {
    totalDays,
    cityCount: cities.size,
    longestStay: longestPlace + ' (' + longestDays + '天)',
    avgDailyDist: Math.round(avgDailyDist),
  };
}
