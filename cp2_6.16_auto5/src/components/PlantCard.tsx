import React, { useState, useEffect } from 'react';
import { Droplets, Edit2, Trash2 } from 'lucide-react';
import { plantManager } from '../PlantManager';
import type { Plant, PlantLog } from '../types';

interface PlantCardProps {
  plant: Plant;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const PlantCard: React.FC<PlantCardProps> = ({ plant, onClick, onEdit, onDelete }) => {
  const [logs, setLogs] = useState<PlantLog[]>([]);
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    loadLogs();
  }, [plant.id]);

  const loadLogs = async () => {
    const data = await plantManager.getPlantLogs(plant.id, 7);
    setLogs(data);
  };

  const daysSinceWatered = plantManager.getLastWateredDays(logs);
  const statusColor = plantManager.getWaterStatusColor(daysSinceWatered);
  const statusText = daysSinceWatered < 0 
    ? '暂无记录' 
    : daysSinceWatered === 0 
      ? '今天已浇水' 
      : `${daysSinceWatered}天前浇水`;

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.card-actions')) {
      return;
    }
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 150);
    onClick();
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`确定要删除"${plant.name}"吗？`)) {
      onDelete();
    }
  };

  return (
    <div
      className={`plant-card ${isPressed ? 'pressed' : ''}`}
      onClick={handleClick}
    >
      <div className="card-header">
        <h3 className="plant-name">{plant.name}</h3>
        <div className="card-actions">
          <button className="action-btn" onClick={handleEdit} title="编辑">
            <Edit2 size={16} />
          </button>
          <button className="action-btn delete" onClick={handleDelete} title="删除">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      <div className="plant-species">{plant.species}</div>
      <div className="plant-location">{plant.location}</div>
      
      <div className="status-bar">
        <div className="status-indicator">
          <div 
            className="status-dot" 
            style={{ backgroundColor: statusColor }}
          />
          <span className="status-text">
            <Droplets size={14} />
            {statusText}
          </span>
        </div>
        <div 
          className="status-progress"
          style={{ 
            background: `linear-gradient(to right, ${statusColor} ${Math.min(100, Math.max(0, 100 - daysSinceWatered * 25))}%, #e0e0e0 ${Math.min(100, Math.max(0, 100 - daysSinceWatered * 25))}%)` 
          }}
        />
      </div>

      <div className="plant-date">
        种植于 {plant.plantDate}
      </div>
    </div>
  );
};

export default PlantCard;
