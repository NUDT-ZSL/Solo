import { useState, useEffect } from 'react';
import { Leaf, Loader2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import PlantCard from '../components/PlantCard';
import type { Plant } from '../types';
import { api } from '../utils/api';

export default function MyGarden() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPlants();
  }, []);

  const loadPlants = async () => {
    setIsLoading(true);
    try {
      const response = await api.plants.getAll();
      if (response.success && response.plants) {
        setPlants(response.plants);
      }
    } catch (error) {
      console.error('Load plants error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: 'var(--color-primary)',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <Leaf size={32} style={{ color: 'var(--color-secondary)' }} />
            我的植物库
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            共 {plants.length} 株植物
          </p>
        </div>
        <Link
          to="/"
          className="ripple-button"
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-primary)',
            color: '#ffffff',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Plus size={16} />
          添加新植物
        </Link>
      </div>

      {isLoading ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '80px',
          }}
        >
          <Loader2
            size={40}
            className="animate-spin"
            style={{ color: 'var(--color-secondary)' }}
          />
        </div>
      ) : plants.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '80px',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: 'rgba(165, 214, 167, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Leaf size={40} style={{ color: 'var(--color-secondary)' }} />
          </div>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 600,
              marginBottom: '8px',
            }}
          >
            你的植物库还是空的
          </h2>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              marginBottom: '24px',
            }}
          >
            去首页上传植物照片，开始你的园艺之旅吧！
          </p>
          <Link
            to="/"
            className="ripple-button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '12px',
              backgroundColor: 'var(--color-primary)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            <Plus size={18} />
            开始识别植物
          </Link>
        </div>
      ) : (
        <div className="grid-3">
          {plants.map((plant) => (
            <PlantCard key={plant.id} plant={plant} />
          ))}
        </div>
      )}
    </div>
  );
}
