import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { latLonToVec3, getWind } from '@/sim/WindSimulator'
import { useStore } from '@/store/useStore'

const EARTH_RADIUS = 3

interface CityData {
  name: string
  nameEn: string
  lat: number
  lon: number
}

const CITIES: CityData[] = [
  { name: '北京', nameEn: 'Beijing', lat: 39.9042, lon: 116.4074 },
  { name: '东京', nameEn: 'Tokyo', lat: 35.6762, lon: 139.6503 },
  { name: '上海', nameEn: 'Shanghai', lat: 31.2304, lon: 121.4737 },
  { name: '首尔', nameEn: 'Seoul', lat: 37.5665, lon: 126.9780 },
  { name: '新德里', nameEn: 'New Delhi', lat: 28.6139, lon: 77.2090 },
  { name: '孟买', nameEn: 'Mumbai', lat: 19.0760, lon: 72.8777 },
  { name: '莫斯科', nameEn: 'Moscow', lat: 55.7558, lon: 37.6173 },
  { name: '伦敦', nameEn: 'London', lat: 51.5074, lon: -0.1278 },
  { name: '巴黎', nameEn: 'Paris', lat: 48.8566, lon: 2.3522 },
  { name: '柏林', nameEn: 'Berlin', lat: 52.5200, lon: 13.4050 },
  { name: '开罗', nameEn: 'Cairo', lat: 30.0444, lon: 31.2357 },
  { name: '纽约', nameEn: 'New York', lat: 40.7128, lon: -74.0060 },
  { name: '洛杉矶', nameEn: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
  { name: '多伦多', nameEn: 'Toronto', lat: 43.6532, lon: -79.3832 },
  { name: '墨西哥城', nameEn: 'Mexico City', lat: 19.4326, lon: -99.1332 },
  { name: '圣保罗', nameEn: 'São Paulo', lat: -23.5505, lon: -46.6333 },
  { name: '布宜诺斯艾利斯', nameEn: 'Buenos Aires', lat: -34.6037, lon: -58.3816 },
  { name: '悉尼', nameEn: 'Sydney', lat: -33.8688, lon: 151.2093 },
  { name: '开普敦', nameEn: 'Cape Town', lat: -33.9249, lon: 18.4241 },
  { name: '迪拜', nameEn: 'Dubai', lat: 25.2048, lon: 55.2708 },
]

function CityMarker({
  city,
  onClick,
  seed,
}: {
  city: CityData
  onClick: (city: CityData, windSpeed: number) => void
  seed: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const position = useMemo(() => latLonToVec3(city.lat, city.lon, EARTH_RADIUS + 0.02), [city.lat, city.lon])

  useFrame((state) => {
    if (!meshRef.current) return
    const pulse = 0.9 + 0.1 * Math.sin(state.clock.getElapsedTime() * 3 + city.lat)
    meshRef.current.scale.setScalar(pulse)
    if (glowRef.current) {
      glowRef.current.scale.setScalar(pulse * 2.2)
    }
  })

  const handleClick = useCallback(
    (e: THREE.Event) => {
      ;(e as any).stopPropagation()
      const wind = getWind(city.lat, city.lon, seed)
      onClick(city, wind.speed)
    },
    [city, onClick, seed],
  )

  return (
    <group position={position}>
      <mesh ref={meshRef} onClick={handleClick}>
        <sphereGeometry args={[0.05, 12, 8]} />
        <meshBasicMaterial color="#ffeb3b" transparent opacity={0.95} />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.05, 12, 8]} />
        <meshBasicMaterial color="#ffeb3b" transparent opacity={0.2} depthWrite={false} />
      </mesh>
    </group>
  )
}

export { CITIES }
export type { CityData }

export default function CityMarkers() {
  const [seed, setSeed] = useState(Date.now())
  const selectedCity = useStore((s) => s.selectedCity)
  const selectCity = useStore((s) => s.selectCity)

  useEffect(() => {
    const id = setInterval(() => setSeed(Date.now()), 2000)
    return () => clearInterval(id)
  }, [])

  const handleCityClick = useCallback(
    (city: CityData, windSpeed: number) => {
      selectCity({ name: city.name, lat: city.lat, lon: city.lon, windSpeed: Math.round(windSpeed * 10) / 10 })
    },
    [selectCity],
  )

  useEffect(() => {
    if (!selectedCity) return
    const timer = setTimeout(() => selectCity(null), 3000)
    return () => clearTimeout(timer)
  }, [selectedCity, selectCity])

  return (
    <group>
      {CITIES.map((city) => (
        <CityMarker key={city.nameEn} city={city} onClick={handleCityClick} seed={seed} />
      ))}
    </group>
  )
}
