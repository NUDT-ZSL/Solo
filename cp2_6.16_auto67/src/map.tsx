import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import type { Plant, User } from './types'
import { getPlants, adoptPlant, getCurrentUser } from './data'

interface MapViewProps {
  onAdopted?: () => void
}

export default function MapView({ onAdopted }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const [plants, setPlants] = useState<Plant[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null)
  const popupRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    getCurrentUser().then(setUser)
    getPlants().then((data) => {
      setPlants(data)
    })
  }, [])

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      center: [39.9042, 116.4074],
      zoom: 14,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapInstanceRef.current || plants.length === 0) return

    const map = mapInstanceRef.current
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer)
      }
    })

    const dropIconSvg = (status: string) => {
      const color = status === 'available' ? '#40916c' : status === 'adopted' ? '#2d6a4f' : '#74c69d'
      const opacity = status === 'available' ? 1 : 0.7
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 48" width="32" height="48">
          <path d="M16 0C16 0 0 18 0 28C0 39 7 48 16 48C25 48 32 39 32 28C32 18 16 0 16 0Z"
            fill="${color}" fill-opacity="${opacity}" stroke="#1b4332" stroke-width="1.5"/>
          <ellipse cx="12" cy="26" rx="3" ry="5" fill="rgba(255,255,255,0.4)"/>
        </svg>
      `
    }

    plants.forEach((plant) => {
      const icon = L.divIcon({
        html: dropIconSvg(plant.status),
        className: 'custom-marker',
        iconSize: [32, 48],
        iconAnchor: [16, 48],
      })

      const marker = L.marker([plant.lat, plant.lng], { icon }).addTo(map)
      marker.on('click', () => {
        setSelectedPlant(plant)
      })
    })
  }, [plants])

  useEffect(() => {
    if (selectedPlant && mapInstanceRef.current) {
      mapInstanceRef.current.panTo([selectedPlant.lat, selectedPlant.lng])
    }
  }, [selectedPlant])

  const handleAdopt = async () => {
    if (!selectedPlant || !user) return
    const updated = await adoptPlant(selectedPlant.id, user.id)
    setPlants((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    setSelectedPlant(updated)
    const updatedUser = await getCurrentUser()
    setUser(updatedUser)
    if (onAdopted) onAdopted()
  }

  const statusText: Record<string, string> = {
    available: '可认养',
    adopted: '已认养',
    caring: '养护中',
  }

  const statusColor: Record<string, string> = {
    available: '#40916c',
    adopted: '#2d6a4f',
    caring: '#74c69d',
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {selectedPlant && (
        <div
          ref={popupRef}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '240px',
            background: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 4px 20px #0000001a',
            padding: '16px',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <button
            onClick={() => setSelectedPlant(null)}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#999',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#333')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#999')}
          >
            ×
          </button>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
            {selectedPlant.name}
          </h3>
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
            {selectedPlant.species}
          </p>
          <div
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '12px',
              background: statusColor[selectedPlant.status] + '20',
              color: statusColor[selectedPlant.status],
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '10px',
            }}
          >
            {statusText[selectedPlant.status]}
          </div>
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
            📍 {selectedPlant.location}
          </p>
          <p style={{ fontSize: '12px', color: '#888', lineHeight: 1.5, marginBottom: '14px' }}>
            {selectedPlant.description}
          </p>
          {selectedPlant.status === 'available' && user && (
            <button
              onClick={handleAdopt}
              style={adoptButtonStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1b4332'
                e.currentTarget.style.transform = 'scale(1.05)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#2d6a4f'
                e.currentTarget.style.transform = 'scale(1)'
              }}
              onMouseDown={(e) => createRipple(e)}
            >
              🌱 立即认养
            </button>
          )}
          {selectedPlant.status !== 'available' && user && selectedPlant.adoptedBy === user.id && (
            <div style={{ fontSize: '12px', color: '#40916c', textAlign: 'center', padding: '8px' }}>
              ✅ 你已认养此植物
            </div>
          )}
        </div>
      )}

      <style>{`
        .leaflet-container {
          background: #d8f3dc;
        }
        .custom-marker {
          background: none !important;
          border: none !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -45%); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }
      `}</style>
    </div>
  )
}

const adoptButtonStyle: React.CSSProperties = {
  width: '120px',
  height: '40px',
  borderRadius: '8px',
  background: '#2d6a4f',
  color: 'white',
  border: 'none',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 600,
  transition: 'all 0.3s ease',
  display: 'block',
  margin: '0 auto',
  position: 'relative',
  overflow: 'hidden',
}

function createRipple(event: React.MouseEvent<HTMLButtonElement>) {
  const button = event.currentTarget
  const circle = document.createElement('span')
  const diameter = Math.max(button.clientWidth, button.clientHeight)
  const radius = diameter / 2
  const rect = button.getBoundingClientRect()
  circle.style.width = circle.style.height = `${diameter}px`
  circle.style.left = `${event.clientX - rect.left - radius}px`
  circle.style.top = `${event.clientY - rect.top - radius}px`
  circle.style.background = 'rgba(255,255,255,0.4)'
  circle.style.position = 'absolute'
  circle.style.borderRadius = '50%'
  circle.style.transform = 'scale(0)'
  circle.style.animation = 'ripple 0.6s ease-out'
  circle.style.pointerEvents = 'none'
  circle.style.zIndex = '1'
  button.appendChild(circle)
  setTimeout(() => circle.remove(), 600)
}
