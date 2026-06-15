import { useState, useEffect, useRef } from 'react';
import { PetState } from '../types';

interface PetCardProps {
  pet: PetState;
}

export default function PetCard({ pet }: PetCardProps) {
  const petEmoji: Record<string, string> = {
    cat: '🐱',
    dog: '🐶',
    dragon: '🐲',
  };

  const bgColor: Record<string, string> = {
    cat: '#FFF3E0',
    dog: '#E3F2FD',
    dragon: '#F3E5F5',
  };

  const animRef = useRef(0);

  const [displayHealth, setDisplayHealth] = useState(pet.health);
  const [displayHappiness, setDisplayHappiness] = useState(pet.happiness);
  const [displayHunger, setDisplayHunger] = useState(pet.hunger);
  const [waveKey, setWaveKey] = useState(0);

  useEffect(() => {
    animRef.current++;
    const startHealth = displayHealth;
    const startHappiness = displayHappiness;
    const startHunger = displayHunger;
    const targetHealth = pet.health;
    const targetHappiness = pet.happiness;
    const targetHunger = pet.hunger;
    const duration = 500;
    const startTime = Date.now();
    const currentAnim = animRef.current;

    const animate = () => {
      if (animRef.current !== currentAnim) return;
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      setDisplayHealth(startHealth + (targetHealth - startHealth) * easeProgress);
      setDisplayHappiness(startHappiness + (targetHappiness - startHappiness) * easeProgress);
      setDisplayHunger(startHunger + (targetHunger - startHunger) * easeProgress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    setWaveKey((k) => k + 1);
  }, [pet.health, pet.happiness, pet.hunger]);

  return (
    <div className="pet-card" style={{ background: bgColor[pet.type] || '#FFF' }}>
      <div className="pet-card-header">
        <span className="pet-card-emoji">{petEmoji[pet.type]}</span>
        <span className="pet-card-name">{pet.name}</span>
      </div>
      <div className="pet-card-stats">
        <div className="pet-card-stat-row">
          <span className="pet-card-stat-label">❤️</span>
          <div className="pet-card-stat-bar-bg">
            <div
              className="pet-card-stat-bar health"
              style={{ width: `${displayHealth}%` }}
            />
            <div className="pet-card-stat-wave health-wave" key={`hw-${waveKey}`} />
          </div>
          <span className="pet-card-stat-value" key={`hv-${pet.health}`}>
            {Math.round(displayHealth)}
          </span>
        </div>
        <div className="pet-card-stat-row">
          <span className="pet-card-stat-label">😊</span>
          <div className="pet-card-stat-bar-bg">
            <div
              className="pet-card-stat-bar happiness"
              style={{ width: `${displayHappiness}%` }}
            />
            <div className="pet-card-stat-wave happiness-wave" key={`hpw-${waveKey}`} />
          </div>
          <span className="pet-card-stat-value" key={`hpv-${pet.happiness}`}>
            {Math.round(displayHappiness)}
          </span>
        </div>
        <div className="pet-card-stat-row">
          <span className="pet-card-stat-label">🍖</span>
          <div className="pet-card-stat-bar-bg">
            <div
              className="pet-card-stat-bar hunger"
              style={{ width: `${displayHunger}%` }}
            />
            <div className="pet-card-stat-wave hunger-wave" key={`hgw-${waveKey}`} />
          </div>
          <span className="pet-card-stat-value" key={`hgv-${pet.hunger}`}>
            {Math.round(displayHunger)}
          </span>
        </div>
      </div>
    </div>
  );
}
