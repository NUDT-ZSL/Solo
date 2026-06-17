import { useEffect, useState, useCallback } from 'react';
import dayjs from 'dayjs';
import type { RepairOrder } from '../types';

function AdminRepairs() {
  const [repairs, setRepairs] = useState<RepairOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const loadRepairs = useCallback(() => {
    fetch('/api/repairs')
      .then((res) => res.json())
      .then((data: RepairOrder[]) => {
        setRepairs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadRepairs();
  }, [loadRepairs]);

  const handleResolve = useCallback(
    async (repair: RepairOrder) => {
      if (!confirm(`确认标记「${repair.toolName}」已修复？标记后该工具将恢复可用状态。`)) {
        return;
      }

      setResolvingId(repair.id);
      try {
        const res = await fetch(`/api/repairs/${repair.id}/resolve`, {
          method: 'POST',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '操作失败');

        setSuccessMsg(`✅「${repair.toolName}」已标记为修复完成`);
        setTimeout(() => setSuccessMsg(''), 2500);
        loadRepairs();
      } catch (err) {
        alert(err instanceof Error ? err.message : '操作失败');
      } finally {
        setResolvingId(null);
      }
    },
    [loadRepairs]
  );

  return (
    <div>
      <h1 className="page-title">🔧 维修工单管理</h1>

      {successMsg && <div className="success-message">{successMsg}</div>}

      <div
        style={{
          padding: 14,
          background: '#fff3e0',
          borderRadius: 12,
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ fontSize: 14, color: '#e65100' }}>
          ⚠️ 当前待处理维修工单：
          <strong style={{ fontSize: 18, marginLeft: 6 }}>{repairs.length}</strong>
          &nbsp;件
        </div>
        <div style={{ fontSize: 12, color: '#ef6c00' }}>
          标记修复后，工具将自动恢复可用状态
        </div>
      </div>

      {loading ? (
        <div className="loading">正在加载维修工单...</div>
      ) : repairs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎉</div>
          <div className="empty-state-text">太棒了！暂无待处理的维修工单</div>
        </div>
      ) : (
        <div className="repairs-list">
          {repairs.map((repair) => (
            <div key={repair.id} className="repair-card">
              <div className="repair-info" style={{ flex: 1 }}>
                <h3>🛠️ {repair.toolName}</h3>
                <div className="reporter">
                  报告人：{repair.reporterName} · ID: {repair.reporterId}
                </div>
                <div className="description">
                  💬 <strong>问题描述：</strong>
                  {repair.description || '（无详细描述）'}
                </div>
                <div className="time">
                  📅 工单生成时间：{dayjs(repair.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                </div>
              </div>
              <div>
                <button
                  className="btn btn-primary"
                  onClick={() => handleResolve(repair)}
                  disabled={resolvingId === repair.id}
                >
                  {resolvingId === repair.id ? '处理中...' : '✅ 标记已修复'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminRepairs;
