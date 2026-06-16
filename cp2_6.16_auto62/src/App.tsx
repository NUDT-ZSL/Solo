import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Flower2 } from 'lucide-react';
import PlantCard from './components/PlantCard';
import PlantDetail from './components/PlantDetail';
import NotificationBanner from './components/NotificationBanner';
import type { Plant, NeedCareItem, CareType } from './types';
import { fetchPlants, fetchNeedCare, addCareRecord } from './api';

const App: React.FC = () => {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [needCareItems, setNeedCareItems] = useState<NeedCareItem[]>([]);
  const [highlightedPlantId, setHighlightedPlantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const loadData = useCallback(async () => {
    try {
      const [plantsData, needCareData] = await Promise.all([fetchPlants(), fetchNeedCare()]);
      setPlants(plantsData);
      setNeedCareItems(needCareData);
      if (plantsData.length > 0 && !selectedPlantId) {
        setSelectedPlantId(plantsData[0].id);
      }
    } catch (err) {
      console.error('加载数据失败', err);
    } finally {
      setLoading(false);
    }
  }, [selectedPlantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchNeedCare().then(setNeedCareItems);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handlePlantUpdate = (updatedPlant: Plant) => {
    setPlants((prev) => prev.map((p) => (p.id === updatedPlant.id ? updatedPlant : p)));
    if (selectedPlantId === updatedPlant.id) {
      setSelectedPlantId(updatedPlant.id);
    }
    fetchNeedCare().then(setNeedCareItems);
  };

  const handleQuickCare = async (plantId: string, type: CareType) => {
    try {
      const updated = await addCareRecord(plantId, type);
      handlePlantUpdate(updated);
    } catch (err) {
      console.error('快捷操作失败', err);
    }
  };

  const handleBannerClick = (plantId: string) => {
    setSelectedPlantId(plantId);
    const cardElement = cardRefs.current[plantId];
    if (cardElement) {
      cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedPlantId(plantId);
      setTimeout(() => setHighlightedPlantId(null), 4000);
    }
  };

  const selectedPlant = plants.find((p) => p.id === selectedPlantId) || null;

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f0fdf4',
          color: '#166534',
          fontSize: '18px',
        }}
      >
        加载中...
      </div>
    );
  }

  return (
    <div className="app-container">
      <header
        style={{
        textAlign: 'center',
        padding: '16px 0',
        marginBottom: '8px',
      }}
    >
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#166534',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Flower2 size={32} />
          家庭植物养护中心
        </h1>
      </header>

      <NotificationBanner needCareItems={needCareItems} onBannerClick={handleBannerClick} />

      <div className="main-layout">
        <div className="plant-list-container">
          <h2 className="plant-list-title">我的植物</h2>
          <div className="plant-list">
            {plants.map((plant) => (
              <PlantCard
                key={plant.id}
                ref={(el) => {
                  cardRefs.current[plant.id] = el;
                }}
                plant={plant}
                isSelected={selectedPlantId === plant.id}
                isHighlighted={highlightedPlantId === plant.id}
                onClick={() => setSelectedPlantId(plant.id)}
                onWater={() => handleQuickCare(plant.id, 'water')}
                onFertilize={() => handleQuickCare(plant.id, 'fertilize')}
              />
            ))}
          </div>
        </div>

        <div className="detail-container">
          {selectedPlant ? (
            <PlantDetail plant={selectedPlant} onUpdate={handlePlantUpdate} />
          ) : (
            <div className="detail-empty">
              <Flower2 className="detail-empty-icon" />
              <p>请选择一株植物查看详情</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
