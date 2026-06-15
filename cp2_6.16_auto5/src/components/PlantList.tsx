import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import PlantCard from './PlantCard';
import { plantManager } from '../PlantManager';
import type { Plant, PlantSpecies, PlantFormData } from '../types';

interface PlantListProps {
  onSelectPlant: (plant: Plant) => void;
}

const SPECIES_OPTIONS: PlantSpecies[] = ['绿萝', '仙人掌', '虎皮兰', '多肉', '龟背竹'];

const PlantList: React.FC<PlantListProps> = ({ onSelectPlant }) => {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);
  const [formData, setFormData] = useState<PlantFormData>({
    name: '',
    species: '绿萝',
    plantDate: plantManager.getTodayDate(),
    location: ''
  });

  useEffect(() => {
    loadPlants();
  }, []);

  const loadPlants = async () => {
    setLoading(true);
    const data = await plantManager.getPlants();
    setPlants(data);
    setLoading(false);
  };

  const handleAdd = () => {
    setEditingPlant(null);
    setFormData({
      name: '',
      species: '绿萝',
      plantDate: plantManager.getTodayDate(),
      location: ''
    });
    setShowForm(true);
  };

  const handleEdit = (plant: Plant) => {
    setEditingPlant(plant);
    setFormData({
      name: plant.name,
      species: plant.species,
      plantDate: plant.plantDate,
      location: plant.location
    });
    setShowForm(true);
  };

  const handleDelete = async (plantId: number) => {
    const success = await plantManager.deletePlant(plantId);
    if (success) {
      loadPlants();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.location.trim()) {
      alert('请填写完整信息');
      return;
    }

    let result;
    if (editingPlant) {
      result = await plantManager.updatePlant(editingPlant.id, formData);
    } else {
      result = await plantManager.createPlant(formData);
    }

    if (result) {
      setShowForm(false);
      loadPlants();
    }
  };

  if (loading) {
    return <div className="plants-loading">加载中...</div>;
  }

  return (
    <div className="plant-list-container">
      <div className="list-header">
        <h2 className="list-title">我的植物</h2>
        <button className="add-button" onClick={handleAdd}>
          <Plus size={20} />
          添加植物
        </button>
      </div>

      <div className="plant-grid">
        {plants.length === 0 ? (
          <div className="empty-state">
            <p>还没有添加植物</p>
            <button className="add-button" onClick={handleAdd}>
              <Plus size={20} />
              添加第一株植物
            </button>
          </div>
        ) : (
          plants.map(plant => (
            <PlantCard
              key={plant.id}
              plant={plant}
              onClick={() => onSelectPlant(plant)}
              onEdit={() => handleEdit(plant)}
              onDelete={() => handleDelete(plant.id)}
            />
          ))
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingPlant ? '编辑植物' : '添加植物'}</h3>
              <button className="close-button" onClick={() => setShowForm(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="plant-form">
              <div className="form-group">
                <label>名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="给植物起个名字"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>种类</label>
                <select
                  value={formData.species}
                  onChange={e => setFormData(prev => ({ ...prev, species: e.target.value as PlantSpecies }))}
                  className="form-input"
                >
                  {SPECIES_OPTIONS.map(species => (
                    <option key={species} value={species}>{species}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>种植日期</label>
                <input
                  type="date"
                  value={formData.plantDate}
                  onChange={e => setFormData(prev => ({ ...prev, plantDate: e.target.value }))}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>位置</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="例如：客厅窗台"
                  className="form-input"
                />
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-button" onClick={() => setShowForm(false)}>
                  取消
                </button>
                <button type="submit" className="submit-button">
                  {editingPlant ? '保存修改' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlantList;
