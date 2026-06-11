import { useCallback, useEffect, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import type { DisplayMemo } from '../types'
import CanvasMarkerLayer from './CanvasMarkerLayer'
import HeatmapLayer from './HeatmapLayer'
import './MapView.css'

interface MapViewProps {
  memos: DisplayMemo[]
  selectedMemoId: number | null
  onMemoAdd: (lng: number, lat: number) => void
  onMemoSelect: (memoId: number | null) => void
  getColorByDate: (timestamp: number) => string
  heatmapMode: boolean
  heatmapRadius: number
  useCanvas: boolean
}

function MapClickHandler({ onClick }: { onClick: (lng: number, lat: number) => void }) {
  useMapEvents({
    click: (e) => {
      onClick(e.latlng.lng, e.latlng.lat)
    },
  })
  return null
}

function MarkersLayer({
  memos,
  selectedMemoId,
  onSelect,
  getColorByDate,
}: {
  memos: DisplayMemo[]
  selectedMemoId: number | null
  onSelect: (id: number | null) => void
  getColorByDate: (timestamp: number) => string
}) {
  const map = useMap()
  const markersRef = useRef<Map<number, L.Marker>>(new Map())

  useEffect(() => {
    const currentIds = new Set(memos.map((m) => m.id))

    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        map.removeLayer(marker)
        markersRef.current.delete(id)
      }
    })

    memos.forEach((memo) => {
      const existing = markersRef.current.get(memo.id)
      if (existing) {
        existing.setLatLng([memo.lat, memo.lng])
        const popup = existing.getPopup()
        if (popup) {
          popup.setContent(createPopupContent(memo))
        }
        const isSelected = memo.id === selectedMemoId
        const icon = createCustomIcon(getColorByDate(memo.timestamp), isSelected, memo.opacity)
        existing.setIcon(icon)

        const el = existing.getElement()
        if (el) {
          el.style.transition = 'opacity 300ms ease'
          el.style.opacity = String(memo.opacity)
        }
        return
      }

      const isSelected = memo.id === selectedMemoId
      const icon = createCustomIcon(getColorByDate(memo.timestamp), isSelected, memo.opacity)

      const marker = L.marker([memo.lat, memo.lng], { icon })
        .addTo(map)
        .on('click', (e) => {
          L.DomEvent.stopPropagation(e)
          onSelect(memo.id)
        })

      marker.bindPopup(createPopupContent(memo), {
        className: 'memo-popup',
        closeButton: false,
        offset: [0, -20],
      })

      const el = marker.getElement()
      if (el) {
        el.style.transition = 'opacity 300ms ease'
        el.style.opacity = String(memo.opacity)
      }

      markersRef.current.set(memo.id, marker)
    })
  }, [memos, selectedMemoId, map, onSelect, getColorByDate])

  return null
}

function createPopupContent(memo: DisplayMemo): string {
  const date = new Date(memo.timestamp).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  return `
    <div class="memo-popup-content">
      <div class="memo-popup-time">${date}</div>
      <div class="memo-popup-text">${escapeHtml(memo.content)}</div>
    </div>
  `
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function createCustomIcon(color: string, isSelected: boolean, opacity: number = 1): L.DivIcon {
  const size = isSelected ? 36 : 30
  const boxShadow = isSelected
    ? `0 0 20px ${color}, 0 0 40px ${color}40`
    : `0 0 10px ${color}80`

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div 
        style="
          width: ${size}px;
          height: ${size}px;
          background: radial-gradient(circle at 30% 30%, ${color}ff, ${color}cc);
          border-radius: 50%;
          box-shadow: ${boxShadow};
          border: 2px solid #ffffff40;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform: scale(1);
          opacity: ${opacity};
        "
        class="marker-dot"
      ></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

export default function MapView({
  memos,
  selectedMemoId,
  onMemoAdd,
  onMemoSelect,
  getColorByDate,
  heatmapMode,
  heatmapRadius,
  useCanvas,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null)

  const handleMapClick = useCallback(
    (lng: number, lat: number) => {
      onMemoAdd(lng, lat)
    },
    [onMemoAdd]
  )

  const displayMemos = useMemo(() => memos, [memos])

  const visibleMemosForHeatmap = useMemo(
    () => memos.filter((m) => m.opacity > 0.5),
    [memos]
  )

  return (
    <div className="map-container">
      <MapContainer
        center={[39.9042, 116.4074]}
        zoom={12}
        className="leaflet-map"
        ref={mapRef as any}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        <MapClickHandler onClick={handleMapClick} />

        {heatmapMode ? (
          <HeatmapLayer memos={visibleMemosForHeatmap} radius={heatmapRadius} />
        ) : useCanvas ? (
          <CanvasMarkerLayer
            memos={displayMemos}
            selectedMemoId={selectedMemoId}
            onSelect={onMemoSelect}
            getColorByDate={getColorByDate}
          />
        ) : (
          <MarkersLayer
            memos={displayMemos}
            selectedMemoId={selectedMemoId}
            onSelect={onMemoSelect}
            getColorByDate={getColorByDate}
          />
        )}
      </MapContainer>
    </div>
  )
}
