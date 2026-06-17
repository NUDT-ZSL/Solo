import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import type { Repair } from '../types';

const AdminRepairs: React.FC = () => {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);
  const [fixingId, setFixingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRepairs();
  }, []);

  const fetchRepairs = async () => {
    try {
      const res = await fetch('/api/repairs');
      const data = await res.json();
      setRepairs(data);
    } catch (error) {
      console.error('Failed to fetch repairs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFix = async (repairId: string) => {
    if (!window.confirm('确认标记为已修复？')) return;

    setFixingId(repairId);
    try {
      const res = await fetch(`/api/repairs/${repairId}/fix`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '操作失败');
      }

      fetchRepairs();
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setFixingId(null);
    }
  };

  if (loading) {
    return <div className="empty-state">加载中...</div>;
  }

  return (
    <div>
      <h1 className="page-title">维修工单管理</h1>

      {repairs.length > 0 ? (
        <div className="repairs-list">
          {repairs.map(repair => (
            <div key={repair.id} className="repairs-card">
              <div className="repairs-card-header">
              <div className="repairs-card-title">{repair.toolName}</div>
              <span className="status-tag repairing">待维修</span>
            </div>
            <div className="repairs-card-meta">
              报告人：{repair.reporter} · {dayjs(repair.createdAt).format('YYYY-MM-DD HH:mm')}
            </div>
            <div className="repairs-card-desc">
              {repair.description || '无描述'}
            </div>
            <div className="repairs-card-actions">
              <button
                className="btn btn-primary"
                onClick={() => handleFix(repair.id)}
                disabled={fixingId === repair.id}
              >
                {fixingId === repair.id ? '处理中...' : '标记已修复'}
              </button>
            </div>
          </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">✅</div>
          <p>暂无待处理的维修工单</p>
        </div>
      )}
    </div>
  );
};

export default AdminRepairs;
