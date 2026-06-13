import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import type { PhotoData } from './PhotoUploader'

interface MapViewProps {
  photos: PhotoData[]
  selectedId: string | null
  photoIdsWithMemory: Set<string>
  onSelectPhoto: (photo: PhotoData) => void
  onUpdateGPS: (photoId: string, lat: number, lng: number) => void
}

const colorForIndex = (i: number): string => {
  const hueStart = 25
  const hueEnd = 290
  const t = i / Math.max(1, 20)
  const hue = hueStart + t * (hueEnd - hueStart)
  return `hsl(${hue}, 85%, 60%)`
}

const formatDate = (iso: string) => {
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const MapView: React.FC<MapViewProps> = ({
  photos,
  selectedId,
  photoIdsWithMemory,
  onSelectPhoto,
  onUpdateGPS
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerLayerRef = useRef<L.LayerGroup | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const satelliteLayerRef = useRef<L.TileLayer | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const [isSatellite, setIsSatellite] = useState(false)

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: [35.8617, 104.1954],
      zoom: 4,
      zoomControl: true,
      attributionControl: false
    })

    tileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    })
    tileLayerRef.current.addTo(map)

    satelliteLayerRef.current = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19 }
    )

    markerLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
  }, [])

  useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current

    if (isSatellite) {
      if (tileLayerRef.current) map.removeLayer(tileLayerRef.current)
      if (satelliteLayerRef.current && !map.hasLayer(satelliteLayerRef.current)) {
        satelliteLayerRef.current.addTo(map)
      }
    } else {
      if (satelliteLayerRef.current) map.removeLayer(satelliteLayerRef.current)
      if (tileLayerRef.current && !map.hasLayer(tileLayerRef.current)) {
        tileLayerRef.current.addTo(map)
      }
    }
  }, [isSatellite])

  useEffect(() => {
    if (!mapRef.current || !markerLayerRef.current) return
    const map = mapRef.current

    markersRef.current.forEach((m) => markerLayerRef.current!.removeLayer(m))
    markersRef.current.clear()

    const withGPS = photos.filter((p) => typeof p.latitude === 'number' && typeof p.longitude === 'number')

    withGPS.forEach((photo, idx) => {
      const color = colorForIndex(idx)
      const hasMemory = photoIdsWithMemory.has(photo.id)
      const isSelected = photo.id === selectedId

      const iconHtml = `
        <div style="position: relative; width: 28px; height: 28px;">
          <div style="
            position: absolute;
            inset: 0;
            background: ${color};
            opacity: ${isSelected ? 0.95 : 0.7};
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.25);
            transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'};
            transition: all 0.2s ease-out;
          "></div>
          ${hasMemory ? `
            <div style="
              position: absolute;
              top: -4px;
              right: -4px;
              width: 16px;
              height: 16px;
              border-radius: 8px;
              background: #ef4444;
              color: white;
              font-size: 10px;
              font-weight: 700;
              line-height: 16px;
              text-align: center;
              border: 2px solid white;
              box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            ">!</div>
          ` : ''}
        </div>
      `

      const icon = L.divIcon({
        className: 'ml-map-marker',
        html: iconHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      })

      const marker = L.marker([photo.latitude!, photo.longitude!], {
        icon,
        draggable: true
      })

      const popupContent = `
        <div style="min-width: 180px; font-family: 'Noto Sans SC', sans-serif;">
          <img src="${photo.dataUrl}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />
          <div style="font-size: 0.75rem; color: #6b7280; margin-bottom: 4px;">📅 ${formatDate(photo.takenAt)}</div>
          <div style="font-size: 0.85rem; font-weight: 500; color: #1f2937; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${photo.originalName}</div>
          ${hasMemory ? '<div style="margin-top: 6px; font-size: 0.7rem; color: #ef4444;">📝 有回忆附注</div>' : ''}
        </div>
      `

      marker.bindPopup(popupContent)

      marker.on('click', () => {
        onSelectPhoto(photo)
      })

      marker.on('dragend', (e: L.LeafletEvent) => {
        const target = e.target as L.Marker
        const pos = target.getLatLng()
        onUpdateGPS(photo.id, pos.lat, pos.lng)
      })

      marker.addTo(markerLayerRef.current!)
      markersRef.current.set(photo.id, marker)
    })

    if (withGPS.length > 0) {
      const bounds = L.latLngBounds(withGPS.map((p) => [p.latitude!, p.longitude!]))
      map.fitBounds(bounds.pad(0.4), { maxZoom: 12, animate: true })
    }
  }, [photos, photoIdsWithMemory, selectedId, onSelectPhoto, onUpdateGPS])

  useEffect(() => {
    if (!mapRef.current || !selectedId) return
    const marker = markersRef.current.get(selectedId)
    if (marker) {
      mapRef.current.flyTo(marker.getLatLng(), Math.max(mapRef.current.getZoom(), 10), {
        duration: 0.6
      })
      marker.openPopup()
    }
  }, [selectedId])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      <div style={{
        position: 'absolute',
        top: 12,
        right: 12,
        background: 'white',
        borderRadius: 10,
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        display: 'flex',
        overflow: 'hidden',
        zIndex: 500
      }}>
        <button
          onClick={() => setIsSatellite(false)}
          style={{
            padding: '8px 14px',
            border: 'none',
            background: isSatellite ? '#f3f4f6' : '#f97316',
            color: isSatellite ? '#374151' : 'white',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 500,
            transition: 'all 0.2s ease-out'
          }}
        >🗺️ 地图</button>
        <button
          onClick={() => setIsSatellite(true)}
          style={{
            padding: '8px 14px',
            border: 'none',
            background: isSatellite ? '#d946ef' : '#f3f4f6',
            color: isSatellite ? 'white' : '#374151',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 500,
            transition: 'all 0.2s ease-out'
          }}
        >🛰️ 卫星</button>
      </div>

      <style>{`
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          padding: 0;
        }
        .leaflet-popup-content {
          margin: 10px;
        }
        .leaflet-container {
          background: #e5e7eb;
        }
      `}</style>
    </div>
  )
}

export default MapView
