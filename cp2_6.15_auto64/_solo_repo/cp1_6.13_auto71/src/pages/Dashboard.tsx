import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Plant } from '../types';
import { getDaysUntilWatering } from '../types';
import { getPlants, addPlant, quickWater } from '../utils/api';
import PlantCard from '../components/PlantCard';
import { PlusIcon } from '../components/icons';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'urgent' | 'normal'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlant, setNewPlant] = useState({ name: '', type: '番茄', wateringFrequency: 2 });
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const loadPlants = useCallback(async () => {
    try {
      const startTime = performance.now();
      const data = await getPlants();
      setPlants(data);
      const endTime = performance.now();
      console.log(`卡片列表加载时间: ${(endTime - startTime).toFixed(2)}ms`);
    } catch (err) {
      console.error('加载植物列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlants();
  }, [loadPlants]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const filteredAndSortedPlants = useMemo(() => {
    const startTime = performance.now();
    let result = [...plants];

    if (filter === 'urgent') {
      result = result.filter(p => getDaysUntilWatering(p) <= 1);
    } else if (filter === 'normal') {
      result = result.filter(p => getDaysUntilWatering(p) > 1);
    }

    result.sort((a, b) => {
      const daysA = getDaysUntilWatering(a);
      const daysB = getDaysUntilWatering(b);
      return sortOrder === 'asc' ? daysA - daysB : daysB - daysA;
    });

    const endTime = performance.now();
    console.log(`筛选排序耗时: ${(endTime - startTime).toFixed(2)}ms`);
    return result;
  }, [plants, filter, sortOrder]);

  const handleCardClick = useCallback((plant: Plant) => {
    navigate(`/plant/${plant._id}`);
  }, [navigate]);

  const handleWater = useCallback(async (plant: Plant) => {
    try {
      await quickWater(plant._id);
      await loadPlants();
    } catch (err) {
      console.error('浇水失败:', err);
    }
  }, [loadPlants]);

  const handleAddPlant = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addPlant(newPlant);
      setShowAddModal(false);
      setNewPlant({ name: '', type: '番茄', wateringFrequency: 2 });
      await loadPlants();
    } catch (err) {
      console.error('添加植物失败:', err);
    }
  }, [newPlant, loadPlants]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 'calc(100vh - 56px)',
        color: '#6b7280',
      }}>
        加载中...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
      }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>
            我的花园
          </h1>
          <p style={{ color: '#6b7280', fontSize: 14 }}>
            共 {plants.length} 株植物，{filteredAndSortedPlants.filter(p => getDaysUntilWatering(p) < 1).length} 株需要浇水
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              background: '#ffffff',
              fontSize: 14,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">全部</option>
            <option value="urgent">需浇水</option>
            <option value="normal">正常</option>
          </select>

          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              background: '#ffffff',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            {sortOrder === 'asc' ? '↑ 优先紧急' : '↓ 优先正常'}
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <PlusIcon size={18} />
            添加植物
          </button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, 280px)',
        gap: 24,
        justifyContent: 'center',
      }}>
        {filteredAndSortedPlants.map(plant => (
          <PlantCard
            key={plant._id}
            plant={plant}
            onClick={handleCardClick}
            onWater={handleWater}
          />
        ))}
      </div>

      {filteredAndSortedPlants.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#9ca3af',
        }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>🌱</p>
          <p style={{ fontSize: 16 }}>暂无植物，点击右上角添加第一株植物吧</p>
        </div>
      )}

      {showAddModal && (
        <>
          <div
            onClick={() => setShowAddModal(false)}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 1000,
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400,
            background: '#ffffff',
            borderRadius: 16,
            padding: 24,
            zIndex: 1001,
            animation: 'scaleIn 0.2s ease-out',
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>添加植物</h2>
            <form onSubmit={handleAddPlant}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 14, color: '#374151', marginBottom: 6 }}>
                  植物名称
                </label>
                <input
                  type="text"
                  value={newPlant.name}
                  onChange={(e) => setNewPlant(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="给它起个名字"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 14, color: '#374151', marginBottom: 6 }}>
                  植物种类
                </label>
                <select
                  value={newPlant.type}
                  onChange={(e) => setNewPlant(prev => ({ ...prev, type: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    fontSize: 14,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="番茄">番茄</option>
                  <option value="薄荷">薄荷</option>
                  <option value="辣椒">辣椒</option>
                  <option value="黄瓜">黄瓜</option>
                  <option value="草莓">草莓</option>
                  <option value="生菜">生菜</option>
                  <option value="萝卜">萝卜</option>
                  <option value="向日葵">向日葵</option>
                </select>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 14, color: '#374151', marginBottom: 6 }}>
                  浇水频率（天）
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={newPlant.wateringFrequency}
                  onChange={(e) => setNewPlant(prev => ({ ...prev, wateringFrequency: Number(e.target.value) }))}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    color: '#ffffff',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  添加
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
