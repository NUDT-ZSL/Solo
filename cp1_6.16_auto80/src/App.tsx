import { useState, useEffect, useCallback } from 'react';
import { getCitiesData, getCities, Building, CityData } from './data/buildings';
import CitySection from './components/CitySection';
import QuizModal from './components/QuizModal';

type TimeSlot = 'morning' | 'noon' | 'dusk' | 'night';

interface UnlockedSlots {
  [buildingId: string]: TimeSlot[];
}

const TIME_SLOTS: TimeSlot[] = ['morning', 'noon', 'dusk', 'night'];

function App() {
  const [citiesData] = useState<CityData[]>(getCitiesData());
  const [cities] = useState<string[]>(getCities());
  const [unlockedSlots, setUnlockedSlots] = useState<UnlockedSlots>({});
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [activeCity, setActiveCity] = useState<string>(cities[0]);

  const fullyUnlockedCount = Object.values(unlockedSlots).filter(
    (slots) => slots.length === 4
  ).length;
  const totalBuildings = citiesData.reduce(
    (sum, city) => sum + city.buildings.length,
    0
  );

  const handleScroll = useCallback(() => {
    const scrollPosition = window.scrollY + window.innerHeight / 2;
    const sections = cities.map((city) => document.getElementById(`city-${city}`));
    
    for (let i = sections.length - 1; i >= 0; i--) {
      const section = sections[i];
      if (section && section.offsetTop <= scrollPosition) {
        setActiveCity(cities[i]);
        break;
      }
    }
  }, [cities]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const handleCityClick = (city: string) => {
    const element = document.getElementById(`city-${city}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCardClick = (building: Building) => {
    setSelectedBuilding(building);
  };

  const handleCloseModal = () => {
    setSelectedBuilding(null);
  };

  const handleAnswerCorrect = (buildingId: string) => {
    setUnlockedSlots((prev) => {
      const currentSlots = prev[buildingId] || [];
      if (currentSlots.length >= 4) return prev;
      
      const nextSlot = TIME_SLOTS[currentSlots.length];
      return {
        ...prev,
        [buildingId]: [...currentSlots, nextSlot]
      };
    });
  };

  return (
    <div style={{ 
      backgroundColor: '#1E1E2E', 
      minHeight: '100vh',
      scrollBehavior: 'smooth',
      transition: 'background-color 0.4s ease-out'
    }}>
      <div style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        padding: '12px 20px',
        borderRadius: '12px',
        backdropFilter: 'blur(10px)'
      }}>
        <span style={{ color: '#FFD700', fontSize: '14px', fontWeight: 600 }}>
          {fullyUnlockedCount}/{totalBuildings}
        </span>
        <div style={{
          width: '180px',
          height: '6px',
          backgroundColor: '#333',
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            backgroundColor: '#FFD700',
            width: `${(fullyUnlockedCount / totalBuildings) * 100}%`,
            transition: 'width 0.4s ease-out',
            borderRadius: '3px'
          }} />
        </div>
      </div>

      <div>
        {citiesData.map((cityData) => (
          <CitySection
            key={cityData.name}
            cityData={cityData}
            unlockedSlots={unlockedSlots}
            onCardClick={handleCardClick}
          />
        ))}
      </div>

      <div style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        display: 'flex',
        gap: '12px',
        padding: '12px 20px',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: '100px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        {cities.map((city) => (
          <button
            key={city}
            onClick={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.transform = 'scale(0.95)';
              setTimeout(() => {
                btn.style.transform = 'scale(1.05)';
                setTimeout(() => {
                  btn.style.transform = 'scale(1)';
                }, 100);
              }, 100);
              handleCityClick(city);
            }}
            style={{
              padding: '10px 24px',
              borderRadius: '100px',
              border: 'none',
              backgroundColor: activeCity === city ? '#FF6B6B' : '#2D2D4A',
              color: 'white',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease-out, background-color 0.4s ease-out',
              outline: 'none'
            }}
          >
            {city}
          </button>
        ))}
      </div>

      {selectedBuilding && (
        <QuizModal
          building={selectedBuilding}
          unlockedSlots={unlockedSlots[selectedBuilding.id] || []}
          onClose={handleCloseModal}
          onAnswerCorrect={handleAnswerCorrect}
        />
      )}
    </div>
  );
}

export default App;
