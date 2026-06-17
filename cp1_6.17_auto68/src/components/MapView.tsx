import { useEffect, useRef, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents
} from 'react-leaflet'
import L from 'leaflet'
import {
  useTravelStore,
  COLOR_PALETTE,
  type MarkerPoint
} from '../store'

interface AnimatedPolylineProps {
  positions: [number, number][]
  color: string
  weight: number
  opacity: number
}

function AnimatedPolyline({ positions, color, weight, opacity }: AnimatedPolylineProps) {
  const [progress, setProgress] = useState(0)
  const mapRef = useRef(useMap())

  useEffect(() => {
    if (positions.length < 2) return
    setProgress(0)
    const startTime = performance.now()
    const duration = 500

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const newProgress = Math.min(elapsed / duration, 1)
      setProgress(newProgress)
      if (newProgress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [positions])

  if (positions.length < 2) return null

  const fullLength = positions.length - 1
  const currentIndex = Math.floor(progress * fullLength)
  const segmentProgress = (progress * fullLength) % 1

  const visiblePositions: [number, number][] = positions.slice(0, currentIndex + 1)

  if (currentIndex < fullLength && segmentProgress > 0) {
    const start = positions[currentIndex]
    const end = positions[currentIndex + 1]
    const interpolated: [number, number] = [
      start[0] + (end[0] - start[0]) * segmentProgress,
      start[1] + (end[1] - start[1]) * segmentProgress
    ]
    visiblePositions.push(interpolated)
  }

  return (
    <Polyline
      positions={visiblePositions}
      pathOptions={{ color, weight, opacity, lineJoin: 'round', lineCap: 'round' }}
    />
  )
}

function MapClickHandler() {
  const openMarkerForm = useTravelStore((s) => s.openMarkerForm)

  useMapEvents({
    click: (e) => {
      openMarkerForm(e.latlng.lat, e.latlng.lng)
    }
  })

  return null
}

function MapBoundsHandler({ markers }: { markers: MarkerPoint[] }) {
  const map = useMap()

  useEffect(() => {
    if (markers.length === 0) return
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]))
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.3))
    }
  }, [markers.length, map])

  return null
}

function createPinIcon(color: string, isNew: boolean) {
  return L.divIcon({
    className: 'custom-pin-container',
    html: `
      <div class="custom-pin ${isNew ? 'marker-drop marker-pulse' : 'marker-drop'}">
        <svg viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z"
            fill="${color}"
          />
          <circle cx="16" cy="16" r="6" fill="white" opacity="0.9"/>
        </svg>
      </div>
    `,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40]
  })
}

function DraggableMarker({ marker }: { marker: MarkerPoint }) {
  const updateMarkerPosition = useTravelStore((s) => s.updateMarkerPosition)
  const members = useTravelStore((s) => s.members)
  const member = members.find((m) => m.id === marker.memberId)
  const color = member?.color || COLOR_PALETTE[0]
  const iconRef = useRef(createPinIcon(color, !!marker.isNew))
  const [position, setPosition] = useState<[number, number]>([marker.lat, marker.lng])

  useEffect(() => {
    setPosition([marker.lat, marker.lng])
  }, [marker.lat, marker.lng])

  useEffect(() => {
    if (marker.isNew) {
      const timer = setTimeout(() => {
        useTravelStore.getState().clearMarkersNewFlag()
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [marker.isNew, marker.id])

  return (
    <Marker
      position={position}
      icon={iconRef.current}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const target = e.target as L.Marker
          const latlng = target.getLatLng()
          updateMarkerPosition(marker.id, latlng.lat, latlng.lng)
          setPosition([latlng.lat, latlng.lng])
        }
      }}
    >
      <Popup>
        <div style={{ minWidth: '180px' }}>
          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '6px', color }}>
            {marker.name}
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            停留时间: {marker.duration} 小时
          </div>
          {marker.note && (
            <div style={{ fontSize: '12px', color: '#555', marginBottom: '8px', lineHeight: 1.5 }}>
              {marker.note}
            </div>
          )}
          <div
            style={{
              width: '100%',
              height: '60px',
              background: marker.imageColor,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
              fontWeight: 500
            }}
          >
            {marker.imageLabel}
          </div>
        </div>
      </Popup>
    </Marker>
  )
}

export default function MapView() {
  const markers = useTravelStore((s) => s.markers)
  const route = useTravelStore((s) => s.route)
  const { showMarkerForm, formPosition } = useTravelStore((s) => s.ui)
  const closeMarkerForm = useTravelStore((s) => s.closeMarkerForm)
  const addMarker = useTravelStore((s) => s.addMarker)
  const currentMemberId = useTravelStore((s) => s.currentMemberId)
  const members = useTravelStore((s) => s.members)

  const [name, setName] = useState('')
  const [duration, setDuration] = useState(2)
  const [note, setNote] = useState('')
  const [imageLabel, setImageLabel] = useState('风景照')
  const [imageColor, setImageColor] = useState('#7C4DFF')

  const imageColors = [
    '#7C4DFF',
    '#536DFE',
    '#448AFF',
    '#40C4FF',
    '#18FFFF',
    '#64FFDA',
    '#69F0AE',
    '#B2FF59',
    '#EEFF41',
    '#FFFF00',
    '#FFD740',
    '#FFAB40',
    '#FF6E40',
    '#FF5252',
    '#FF4081',
    '#E040FB'
  ]

  const resetForm = () => {
    setName('')
    setDuration(2)
    setNote('')
    setImageLabel('风景照')
    setImageColor('#7C4DFF')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formPosition || !name.trim()) return

    addMarker({
      memberId: currentMemberId,
      lat: formPosition.lat,
      lng: formPosition.lng,
      name: name.trim(),
      duration,
      note: note.trim(),
      imageLabel: imageLabel.trim() || '照片',
      imageColor
    })

    resetForm()
  }

  const handleCloseForm = () => {
    closeMarkerForm()
    resetForm()
  }

  const routePositions: [number, number][] = []
  if (route) {
    const markerMap = new Map(markers.map((m) => [m.id, m]))
    for (const id of route.order) {
      const marker = markerMap.get(id)
      if (marker) {
        routePositions.push([marker.lat, marker.lng])
      }
    }
  }

  const currentMember = members.find((m) => m.id === currentMemberId)

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer
        center={[35.8617, 104.1954]}
        zoom={5}
        style={{ width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden' }}
        zoomControl
        preferCanvas
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler />
        <MapBoundsHandler markers={markers} />
        {markers.map((marker) => (
          <DraggableMarker key={marker.id} marker={marker} />
        ))}
        {routePositions.length >= 2 && (
          <AnimatedPolyline
            positions={routePositions}
            color="#2196F3"
            weight={3}
            opacity={0.7}
          />
        )}
      </MapContainer>

      {showMarkerForm && formPosition && (
        <div
          className="form-fade-in"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: '16px',
            padding: '24px',
            width: '360px',
            maxWidth: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            border: '1px solid rgba(255,255,255,0.3)'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: currentMember?.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                {currentMember?.name[0]}
              </div>
              <span style={{ fontWeight: 600, color: '#1A237E' }}>
                添加标记点
              </span>
            </div>
            <button
              onClick={handleCloseForm}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#999',
                padding: '4px 8px',
                borderRadius: '6px'
              }}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#555',
                  marginBottom: '6px'
                }}
              >
                地点名称
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 50))}
                placeholder="例如：西湖风景区"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(0,0,0,0.1)',
                  fontSize: '14px',
                  outline: 'none',
                  background: 'rgba(255,255,255,0.6)',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => (e.target.style.borderColor = '#3F51B5')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(0,0,0,0.1)')}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#555',
                  marginBottom: '6px'
                }}
              >
                停留时间: <span style={{ color: '#3F51B5', fontWeight: 600 }}>{duration} 小时</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="8"
                step="0.5"
                value={duration}
                onChange={(e) => setDuration(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#3F51B5' }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '10px',
                  color: '#999',
                  marginTop: '2px'
                }}
              >
                <span>0.5h</span>
                <span>8h</span>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#555',
                  marginBottom: '6px'
                }}
              >
                备注 <span style={{ color: '#999', fontWeight: 400 }}>({note.length}/200)</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 200))}
                placeholder="记录关于这个地点的想法..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(0,0,0,0.1)',
                  fontSize: '14px',
                  outline: 'none',
                  background: 'rgba(255,255,255,0.6)',
                  resize: 'none',
                  transition: 'border-color 0.2s',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => (e.target.style.borderColor = '#3F51B5')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(0,0,0,0.1)')}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#555',
                  marginBottom: '6px'
                }}
              >
                图片标签
              </label>
              <input
                type="text"
                value={imageLabel}
                onChange={(e) => setImageLabel(e.target.value.slice(0, 20))}
                placeholder="例如：美食打卡"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(0,0,0,0.1)',
                  fontSize: '14px',
                  outline: 'none',
                  background: 'rgba(255,255,255,0.6)',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => (e.target.style.borderColor = '#3F51B5')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(0,0,0,0.1)')}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#555',
                  marginBottom: '8px'
                }}
              >
                图片颜色
              </label>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px'
                }}
              >
                {imageColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setImageColor(color)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      background: color,
                      border: imageColor === color ? '2px solid #1A237E' : '2px solid transparent',
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'transform 0.2s',
                      transform: imageColor === color ? 'scale(1.1)' : 'scale(1)'
                    }}
                  />
                ))}
              </div>
            </div>

            <div
              style={{
                width: '100%',
                height: '80px',
                background: imageColor,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '16px',
                fontWeight: 500,
                marginBottom: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              {imageLabel || '照片预览'}
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #3F51B5 0%, #1A237E 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 2px 8px rgba(63,81,181,0.3)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(63,81,181,0.4)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(63,81,181,0.3)'
              }}
            >
              添加标记点
            </button>
          </form>
        </div>
      )}

      {showMarkerForm && (
        <div
          onClick={handleCloseForm}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.15)',
            zIndex: 999,
            borderRadius: '12px'
          }}
        />
      )}
    </div>
  )
}
