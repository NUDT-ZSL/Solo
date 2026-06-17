import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import dayjs from 'dayjs'
import type { City, Song } from '../../shared/types'

interface TourMapProps {
  cities: City[]
  songs: Song[]
  selectedCityId: string | null
  onSelectCity: (cityId: string) => void
  onEditCity: (city: City) => void
  onDeleteCity: (cityId: string) => void
}

function MapAutoFit({ cities }: { cities: City[] }) {
  const map = useMap()
  const didFit = useRef(false)

  useEffect(() => {
    if (cities.length > 0 && !didFit.current) {
      const bounds = L.latLngBounds(cities.map(c => [c.latitude, c.longitude]))
      map.fitBounds(bounds, { padding: [80, 80] })
      didFit.current = true
    }
  }, [cities, map])

  return null
}

export default function TourMap({
  cities,
  songs,
  selectedCityId,
  onSelectCity,
  onEditCity,
  onDeleteCity,
}: TourMapProps) {
  const getTotalDuration = (city: City) => {
    return city.songIds.reduce((sum, sid) => {
      const song = songs.find(s => s.id === sid)
      return sum + (song?.duration || 0)
    }, 0)
  }

  const isDurationWarning = (city: City) => {
    const total = getTotalDuration(city)
    return Math.abs(total - city.targetDuration) > 2
  }

  const sortedCities = useMemo(() => {
    return [...cities].sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf())
  }, [cities])

  const positions = sortedCities.map(c => [c.latitude, c.longitude] as [number, number])

  const createIcon = (city: City, index: number) => {
    const warning = isDurationWarning(city)
    const isSelected = selectedCityId === city.id

    return L.divIcon({
      className: '',
      html: `<div class="city-marker-icon ${warning ? 'warning' : ''}" 
        style="width:${isSelected ? '44px' : '36px'};height:${isSelected ? '44px' : '36px'};">
        ${index + 1}
      </div>`,
      iconSize: isSelected ? [44, 44] : [36, 36],
      iconAnchor: isSelected ? [22, 22] : [18, 18],
    })
  }

  return (
    <MapContainer
      center={[35.8617, 104.1954]}
      zoom={4}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapAutoFit cities={sortedCities} />

      {positions.length >= 2 && (
        <Polyline
          positions={positions}
          pathOptions={{
            color: '#7c3aed',
            weight: 3,
            opacity: 0.8,
            dashArray: '10, 10',
          }}
        />
      )}

      {sortedCities.map((city, index) => (
        <Marker
          key={city.id}
          position={[city.latitude, city.longitude]}
          icon={createIcon(city, index)}
          eventHandlers={{
            click: () => onSelectCity(city.id),
          }}
        >
          <Popup closeButton={true} maxWidth={280}>
            <div className="popup-title">📍 {city.name}</div>
            <div className="popup-info">
              <span className="popup-label">📅</span>
              {dayjs(city.date).format('YYYY年MM月DD日')}
            </div>
            <div className="popup-info">
              <span className="popup-label">🏟️</span>
              {city.venue}
            </div>
            <div className="popup-info">
              <span className="popup-label">🎵</span>
              {city.songIds.length} 首歌曲 · {getTotalDuration(city).toFixed(1)} 分钟
            </div>
            <div className="popup-info">
              <span className="popup-label">🎯</span>
              目标 {city.targetDuration} 分钟
              {isDurationWarning(city) && (
                <span style={{ color: '#ef4444', marginLeft: 8 }}>⚠️ 时长异常</span>
              )}
            </div>
            {city.audienceCount && (
              <div className="popup-info">
                <span className="popup-label">👥</span>
                {city.audienceCount.toLocaleString()} 人次
              </div>
            )}
            {city.notes && <div className="popup-notes">📝 {city.notes}</div>}
            <div className="popup-actions">
              <button className="btn btn-secondary" onClick={(e) => {
                e.stopPropagation()
                onEditCity(city)
              }}>
                ✏️ 编辑
              </button>
              <button className="btn btn-danger" onClick={(e) => {
                e.stopPropagation()
                onDeleteCity(city.id)
              }}>
                🗑️ 删除
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
