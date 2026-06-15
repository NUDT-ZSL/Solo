import React, { useState } from 'react';
import { Leaf } from 'lucide-react';
import PlantList from './components/PlantList';
import PlantDetail from './components/PlantDetail';
import CalendarView from './CalendarView';
import type { Plant } from './types';
import './styles/global.css';

const App: React.FC = () => {
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);

  const handleSelectPlant = (plant: Plant) => {
    setSelectedPlant(plant);
  };

  const handleBack = () => {
    setSelectedPlant(null);
  };

  if (selectedPlant) {
    return (
      <div className="app-container">
        <PlantDetail plant={selectedPlant} onBack={handleBack} />
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <Leaf size={32} color="#2e7d32" />
            <h1 className="app-title">植物养护助手</h1>
          </div>
          <p className="app-subtitle">记录植物生长，科学养护每一株绿植</p>
        </div>
      </header>

      <main className="app-main">
        <section className="home-section">
          <CalendarView />
        </section>
        
        <section className="home-section">
          <PlantList onSelectPlant={handleSelectPlant} />
        </section>
      </main>

      <footer className="app-footer">
        <p>© 2026 植物养护助手 - 让每一株植物都健康成长</p>
      </footer>
    </div>
  );
};

export default App;
