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
        <div className="repairs-table" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>工具名称</th>
                <th>报告人</th>
                <th>问题描述</th>
                <th>报告时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {repairs.map(repair => (
                <tr key={repair.id}>
                  <td><strong>{repair.toolName}</strong></td>
                  <td>{repair.reporter}</td>
                  <td style={{ maxWidth: 300 }}>
                    {repair.description || '无描述'}
                  </td>
                  <td>
                    {dayjs(repair.createdAt).format('YYYY-MM-DD HH:mm')}
                  </td>
                  <td>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleFix(repair.id)}
                      disabled={fixingId === repair.id}
                      style={{ padding: '8px 16px', fontSize: 13 }}
                    >
                      {fixingId === repair.id ? '处理中...' : '标记已修复'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
