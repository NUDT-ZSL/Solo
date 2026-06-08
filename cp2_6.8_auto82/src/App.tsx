import React, { useState, useMemo, useCallback } from 'react'
import { MapView } from './components/MapView'
import { WeatherCard } from './components/WeatherCard'
import { generateCityWeather } from './data'

const App: React.FC = () => {
  const [isNight, setIsNight] = useState(false)
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null)

  const cities = useMemo(() => generateCityWeather(), [])

  const selectedCity = useMemo(
    () => cities.find((c) => c.id === selectedCityId) || null,
    [cities, selectedCityId]
  )

  const handleCityClick = useCallback((cityId: string) => {
    setSelectedCityId(cityId)
  }, [])

  const toggleTheme = useCallback(() => {
    setIsNight((prev) => !prev)
  }, [])

  return (
    <div className={`app ${isNight ? 'night' : 'day'}`}>
      <nav className="navbar">
        <h1 className="navbar-title">天气模式</h1>
        <button className="theme-toggle" onClick={toggleTheme}>
          {isNight ? '☀️ 白天模式' : '🌙 夜间模式'}
        </button>
      </nav>

      <div className="main-container">
        <div className="map-wrapper">
          <MapView
            cities={cities}
            selectedCityId={selectedCityId}
            onCityClick={handleCityClick}
            isNight={isNight}
          />
        </div>
        <div className="weather-wrapper">
          <WeatherCard city={selectedCity} isNight={isNight} />
        </div>
      </div>
    </div>
  )
}

export default App
