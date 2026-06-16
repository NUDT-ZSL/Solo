import { CityData, Building } from '../data/buildings';
import BuildingCard from './BuildingCard';

type TimeSlot = 'morning' | 'noon' | 'dusk' | 'night';

interface UnlockedSlots {
  [buildingId: string]: TimeSlot[];
}

interface CitySectionProps {
  cityData: CityData;
  unlockedSlots: UnlockedSlots;
  onCardClick: (building: Building) => void;
}

function CitySection({ cityData, unlockedSlots, onCardClick }: CitySectionProps) {
  return (
    <section
      id={`city-${cityData.name}`}
      style={{
        height: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: cityData.gradient,
        position: 'relative',
        scrollSnapAlign: 'start',
        transition: 'background 0.4s ease-out'
      }}
    >
      <div style={{
        position: 'absolute',
        top: '40px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#1A1A2E',
        fontSize: '32px',
        fontWeight: 700,
        letterSpacing: '4px',
        textTransform: 'uppercase',
        opacity: 0.6,
        textShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        {cityData.name}
      </div>
      
      <div style={{
        display: 'flex',
        gap: '40px',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        padding: '80px 20px'
      }}>
        {cityData.buildings.map((building) => (
          <BuildingCard
            key={building.id}
            building={building}
            unlockedSlots={unlockedSlots[building.id] || []}
            onClick={() => onCardClick(building)}
          />
        ))}
      </div>
    </section>
  );
}

export default CitySection;
