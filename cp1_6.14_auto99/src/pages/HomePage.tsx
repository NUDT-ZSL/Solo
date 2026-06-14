import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Server } from 'lucide-react';
import { EndpointCard } from '../components/EndpointCard';
import { endpointApi } from '../http';
import type { Endpoint } from '../types';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEndpoints = useCallback(async () => {
    try {
      setLoading(true);
      const data = await endpointApi.getAll();
      setEndpoints(data);
    } catch (error) {
      console.error('Failed to load endpoints:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEndpoints();
  }, [loadEndpoints]);

  const handleCardClick = (id: string) => {
    navigate(`/endpoint/${id}`);
  };

  const handleNewEndpoint = () => {
    navigate('/endpoint/new');
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <h1 className="page-title">模拟端点列表</h1>
        <button className="sidebar-btn" onClick={handleNewEndpoint}>
          <Plus size={18} />
          新建端点
        </button>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : endpoints.length === 0 ? (
        <div className="empty-state">
          <Server size={64} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <h3>还没有模拟端点</h3>
          <p>点击"新建端点"按钮创建你的第一个API模拟</p>
          <button className="btn-primary" onClick={handleNewEndpoint} style={{ width: 'auto', padding: '0 24px' }}>
            新建端点
          </button>
        </div>
      ) : (
        <div className="endpoint-grid">
          {endpoints.map((endpoint) => (
            <EndpointCard
              key={endpoint.id}
              endpoint={endpoint}
              onClick={() => handleCardClick(endpoint.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
