import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { differenceInDays, format } from 'date-fns';
import PlantList from './PlantList';
import PlantDetail from './PlantDetail';
import AddPlantForm from './AddPlantForm';
import Calendar from './Calendar';
import AlertPanel from './AlertPanel';

export interface Plant {
  _id: string;
  name: string;
  species: string;
  photoUrl: string;
  waterCycle: number;
  fertilizeCycle: number;
  lastWatered: string | null;
  lastFertilized: string | null;
  createdAt: string;
}

export interface CareLog {
  _id: string;
  plantId: string;
  type: 'water' | 'fertilize';
  timestamp: string;
}

export type WarningLevel = 'none' | 'orange' | 'red';

export function getWaterWarning(plant: Plant): WarningLevel {
  if (!plant.lastWatered) return 'red';
  const days = differenceInDays(new Date(), new Date(plant.lastWatered));
  if (days >= plant.waterCycle - 1) return 'red';
  if (days >= plant.waterCycle - 3) return 'orange';
  return 'none';
}

export function getDaysUntilNextWater(plant: Plant): number {
  if (!plant.lastWatered) return 0;
  const daysSince = differenceInDays(new Date(), new Date(plant.lastWatered));
  return Math.max(0, plant.waterCycle - daysSince);
}

function AppContent() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchPlants = useCallback(async () => {
    try {
      const res = await axios.get('/api/plants');
      setPlants(res.data);
    } catch (err) {
      console.error('Failed to fetch plants:', err);
    }
  }, []);

  useEffect(() => {
    fetchPlants();
  }, [fetchPlants]);

  const handleAddPlant = async (plantData: Omit<Plant, '_id' | 'lastWatered' | 'lastFertilized' | 'createdAt'>) => {
    try {
      await axios.post('/api/plants', plantData);
      setShowAddModal(false);
      fetchPlants();
    } catch (err) {
      console.error('Failed to add plant:', err);
    }
  };

  const handleRecordLog = async (plantId: string, type: 'water' | 'fertilize') => {
    try {
      await axios.post(`/api/plants/${plantId}/logs`, { type });
      fetchPlants();
    } catch (err) {
      console.error('Failed to record log:', err);
    }
  };

  const handleDeletePlant = async (plantId: string) => {
    try {
      await axios.delete(`/api/plants/${plantId}`);
      fetchPlants();
      navigate('/');
    } catch (err) {
      console.error('Failed to delete plant:', err);
    }
  };

  const getActiveTab = () => {
    if (location.pathname === '/') return 'plants';
    if (location.pathname.startsWith('/plant')) return 'plants';
    if (location.pathname === '/calendar') return 'calendar';
    return 'plants';
  };

  const alertCount = plants.filter(p => getWaterWarning(p) !== 'none').length;

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-title">🌿 PlantMind</div>
        <div className="navbar-tabs">
          <button
            className={`nav-tab ${getActiveTab() === 'plants' ? 'active' : ''}`}
            onClick={() => navigate('/')}
          >
            我的植物
          </button>
          <button
            className={`nav-tab ${getActiveTab() === 'calendar' ? 'active' : ''}`}
            onClick={() => navigate('/calendar')}
          >
            养护日历
          </button>
          <button
            className={`nav-tab ${alertOpen ? 'active' : ''}`}
            onClick={() => setAlertOpen(!alertOpen)}
          >
            预警
          </button>
        </div>
      </nav>

      <div className="main-content">
        <Routes>
          <Route
            path="/"
            element={
              <>
                <div className="page-header">
                  <h1 className="page-title">我的植物</h1>
                  <button
                    className="add-btn"
                    onClick={() => setShowAddModal(true)}
                    title="添加植物"
                  >
                    +
                  </button>
                </div>
                <PlantList plants={plants} onPlantClick={(id) => navigate(`/plant/${id}`)} />
              </>
            }
          />
          <Route
            path="/plant/:id"
            element={
              <PlantDetail
                plants={plants}
                onRecordLog={handleRecordLog}
                onDelete={handleDeletePlant}
              />
            }
          />
          <Route path="/calendar" element={<Calendar plants={plants} />} />
        </Routes>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>添加新植物</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                ×
              </button>
            </div>
            <AddPlantForm onSubmit={handleAddPlant} onCancel={() => setShowAddModal(false)} />
          </div>
        </div>
      )}

      <AlertPanel
        plants={plants}
        isOpen={alertOpen}
        onToggle={() => setAlertOpen(!alertOpen)}
        onPlantClick={(id) => {
          navigate(`/plant/${id}`);
          setAlertOpen(false);
        }}
      />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
