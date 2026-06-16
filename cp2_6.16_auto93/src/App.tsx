import { useState, useCallback, useEffect, useRef } from 'react';
import SkyCanvas from './components/SkyCanvas';
import ControlPanel from './components/ControlPanel';
import { cities, City } from './data/cities';
import { formatTime, getSunriseTime, getSunsetTime } from './utils/math';

export interface BuildingInfo {
  index: number;
  height: number;
  temperature: number;
}

export default function App() {
  const [selectedCity, setSelectedCity] = useState<City>(cities[0]);
  const [currentTime, setCurrentTime] = useState<number>(8);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingInfo | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sunriseTime = getSunriseTime(selectedCity.latitude, selectedCity.longitude);
  const sunsetTime = getSunsetTime(selectedCity.latitude, selectedCity.longitude);

  const animate = useCallback((timestamp: number) => {
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = timestamp;
    }
    const delta = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;

    setCurrentTime(prev => {
      let next = prev + delta * speed * 0.005;
      if (next >= 24) {
        next = next - 24;
      }
      return next;
    });

    animationRef.current = requestAnimationFrame(animate);
  }, [speed]);

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = 0;
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, animate]);

  const handleCityChange = useCallback((city: City) => {
    setSelectedCity(city);
  }, []);

  const handleTimeChange = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handlePlayToggle = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleSpeedChange = useCallback((newSpeed: number) => {
    setSpeed(newSpeed);
  }, []);

  const handleBuildingClick = useCallback((info: BuildingInfo) => {
    setSelectedBuilding(info);
    if (bubbleTimerRef.current) {
      clearTimeout(bubbleTimerRef.current);
    }
    bubbleTimerRef.current = setTimeout(() => {
      setSelectedBuilding(null);
    }, 5000);
  }, []);

  useEffect(() => {
    return () => {
      if (bubbleTimerRef.current) {
        clearTimeout(bubbleTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="app-container">
      <div className="canvas-wrapper">
        <SkyCanvas
          city={selectedCity}
          time={currentTime}
          onBuildingClick={handleBuildingClick}
          selectedBuildingIndex={selectedBuilding?.index ?? null}
        />
        {selectedBuilding && (
          <div className="info-bubble">
            <div className="info-bubble-title">建筑信息</div>
            <div className="info-bubble-content">
              <div><span>高度：</span>{selectedBuilding.height}px</div>
              <div><span>温度：</span>{selectedBuilding.temperature}°C</div>
            </div>
          </div>
        )}
      </div>
      <ControlPanel
        cities={cities}
        selectedCity={selectedCity}
        currentTime={currentTime}
        formattedTime={formatTime(currentTime)}
        sunriseTime={formatTime(sunriseTime)}
        sunsetTime={formatTime(sunsetTime)}
        isPlaying={isPlaying}
        speed={speed}
        onCityChange={handleCityChange}
        onTimeChange={handleTimeChange}
        onPlayToggle={handlePlayToggle}
        onSpeedChange={handleSpeedChange}
      />
    </div>
  );
}
