import React, { useState } from 'react';

interface AddPlantFormProps {
  onSubmit: (data: {
    name: string;
    species: string;
    photoUrl: string;
    waterCycle: number;
    fertilizeCycle: number;
  }) => void;
  onCancel: () => void;
}

const AddPlantForm: React.FC<AddPlantFormProps> = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [waterCycle, setWaterCycle] = useState(7);
  const [fertilizeCycle, setFertilizeCycle] = useState(30);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      species: species.trim(),
      photoUrl: photoUrl.trim(),
      waterCycle: Math.max(1, Math.min(30, parseInt(String(waterCycle)) || 7)),
      fertilizeCycle: Math.max(7, Math.min(90, parseInt(String(fertilizeCycle)) || 30)),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>植物名称 *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="给它起个名字吧"
          required
        />
      </div>

      <div className="form-group">
        <label>品种</label>
        <input
          type="text"
          value={species}
          onChange={(e) => setSpecies(e.target.value)}
          placeholder="例如：绿萝、多肉、仙人掌"
        />
      </div>

      <div className="form-group">
        <label>照片URL</label>
        <input
          type="url"
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
          placeholder="https://example.com/photo.jpg"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>浇水周期 (1-30天) *</label>
          <input
            type="number"
            min="1"
            max="30"
            value={waterCycle}
            onChange={(e) => setWaterCycle(Number(e.target.value))}
            required
          />
        </div>
        <div className="form-group">
          <label>施肥周期 (7-90天) *</label>
          <input
            type="number"
            min="7"
            max="90"
            value={fertilizeCycle}
            onChange={(e) => setFertilizeCycle(Number(e.target.value))}
            required
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          取消
        </button>
        <button type="submit" className="btn btn-primary">
          添加植物
        </button>
      </div>
    </form>
  );
};

export default AddPlantForm;
