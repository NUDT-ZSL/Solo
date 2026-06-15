import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, MapPin, Info } from 'lucide-react';
import { plantManager } from '../PlantManager';
import CalendarView from '../CalendarView';
import LogForm from '../LogForm';
import WaterChart from './WaterChart';
import LightChart from './LightChart';
import type { Plant, PlantLog, CareAdvice } from '../types';

interface PlantDetailProps {
  plant: Plant;
  onBack: () => void;
}

const PlantDetail: React.FC<PlantDetailProps> = ({ plant, onBack }) => {
  const [logs, setLogs] = useState<PlantLog[]>([]);
  const [advice, setAdvice] = useState<CareAdvice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [plant.id]);

  const loadData = async () => {
    setLoading(true);
    const [logsData, adviceData] = await Promise.all([
      plantManager.getPlantLogs(plant.id, 30),
      plantManager.getCareAdvice(plant.id)
    ]);
    setLogs(logsData);
    setAdvice(adviceData);
    setLoading(false);
  };

  const handleLogSuccess = () => {
    loadData();
  };

  if (loading) {
    return <div className="detail-loading">加载中...</div>;
  }

  return (
    <div className="plant-detail-container">
      <div className="detail-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={20} />
          返回列表
        </button>
        <h1 className="detail-title">{plant.name}</h1>
      </div>

      <div className="detail-content">
        <div className="detail-main">
          <div className="plant-info-card">
            <div className="info-header">
              <h2 className="plant-name-large">{plant.name}</h2>
              <span className="plant-species-badge">{plant.species}</span>
            </div>
            <div className="info-row">
              <Calendar size={18} />
              <span>种植日期: {plant.plantDate}</span>
            </div>
            <div className="info-row">
              <MapPin size={18} />
              <span>位置: {plant.location}</span>
            </div>
            
            {advice && (
              <div className="care-advice">
                <div className="advice-header">
                  <Info size={18} />
                  <span>养护建议</span>
                </div>
                <p className="advice-text">{advice.advice}</p>
                <p className="advice-update">
                  更新于 {new Date(advice.lastUpdated).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          <LogForm plantId={plant.id} onSuccess={handleLogSuccess} />

          <CalendarView plantId={plant.id} />
        </div>

        <div className="detail-charts">
          <WaterChart logs={logs} />
          <LightChart logs={logs} />
        </div>
      </div>
    </div>
  );
};

export default PlantDetail;
