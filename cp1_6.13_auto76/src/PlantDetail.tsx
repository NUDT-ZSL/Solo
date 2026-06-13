import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format, differenceInDays } from 'date-fns';
import { Plant, CareLog, getWaterWarning } from './App';

interface PlantDetailProps {
  plants: Plant[];
  onRecordLog: (plantId: string, type: 'water' | 'fertilize') => void;
  onDelete: (plantId: string) => void;
}

const PlantDetail: React.FC<PlantDetailProps> = ({ plants, onRecordLog, onDelete }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<CareLog[]>([]);
  const [plant, setPlant] = useState<Plant | undefined>(plants.find((p) => p._id === id));

  useEffect(() => {
    if (!plant && id) {
      axios.get(`/api/plants/${id}`).then((res) => setPlant(res.data));
    }
  }, [id, plant]);

  useEffect(() => {
    if (id) {
      axios.get(`/api/plants/${id}/logs`).then((res) => setLogs(res.data));
    }
  }, [id]);

  const handleRecord = async (type: 'water' | 'fertilize') => {
    if (!id) return;
    await onRecordLog(id, type);
    const res = await axios.get(`/api/plants/${id}/logs`);
    setLogs(res.data);
    const plantRes = await axios.get(`/api/plants/${id}`);
    setPlant(plantRes.data);
  };

  const handleDelete = () => {
    if (!id || !plant) return;
    if (window.confirm(`确定要删除 "${plant.name}" 吗？`)) {
      onDelete(id);
    }
  };

  if (!plant) {
    return <div className="empty-state"><p>加载中...</p></div>;
  }

  const warning = getWaterWarning(plant);

  return (
    <div className="plant-detail">
      <button className="back-btn" onClick={() => navigate('/')}>
        ← 返回植物列表
      </button>

      <div className="detail-header">
        {plant.photoUrl ? (
          <img src={plant.photoUrl} alt={plant.name} className="detail-photo" />
        ) : (
          <div className="plant-photo-placeholder" style={{ width: 120, height: 120, fontSize: 48 }}>
            🌿
          </div>
        )}
        <div className="detail-info">
          <h2>{plant.name}</h2>
          <div className="species">{plant.species || '未知品种'}</div>
          <div className="detail-meta">
            <span>💧 浇水周期: {plant.waterCycle}天</span>
            <span>🌱 施肥周期: {plant.fertilizeCycle}天</span>
          </div>
          <div className="detail-actions">
            <button className="btn btn-water" onClick={() => handleRecord('water')}>
              💧 记录浇水
            </button>
            <button className="btn btn-fertilize" onClick={() => handleRecord('fertilize')}>
              🌱 记录施肥
            </button>
            <button className="btn btn-danger" onClick={handleDelete}>
              🗑️ 删除
            </button>
          </div>
        </div>
      </div>

      <div className="log-list">
        <h3>养护日志</h3>
        {logs.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px' }}>
            <p>暂无养护记录，快去给植物浇水吧！</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log._id} className="log-item">
              <div className={`log-icon ${log.type}`}>
                {log.type === 'water' ? '💧' : '🌱'}
              </div>
              <div className="log-info">
                <div className="log-type">{log.type === 'water' ? '浇水' : '施肥'}</div>
                <div className="log-time">
                  {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm')}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PlantDetail;
