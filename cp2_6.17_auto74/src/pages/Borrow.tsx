import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import type { Tool } from '../types';
import { CURRENT_USER } from '../types';

const DURATION_OPTIONS = [1, 2, 4, 8, 24];

const statusLabels: Record<Tool['status'], string> = {
  available: '可用',
  borrowed: '已借出',
  repairing: '维修中',
};

function Borrow() {
  const { toolId = '' } = useParams();
  const navigate = useNavigate();
  const [tool, setTool] = useState<Tool | null>(null);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState<number>(2);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetch(`/api/tools/${toolId}`)
      .then((res) => res.json())
      .then((data) => {
        setTool(data.tool);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        setError('加载工具信息失败');
      });
  }, [toolId]);

  const handleSubmit = useCallback(async () => {
    if (!tool || tool.status !== 'available') return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/borrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId: tool.id,
          userId: CURRENT_USER.id,
          userName: CURRENT_USER.name,
          durationHours: duration,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '提交失败');
      }

      setSuccessMsg('借用申请已提交！正在跳转到我的借用...');
      setTimeout(() => {
        navigate('/my-borrows');
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  }, [tool, duration, navigate]);

  const estimatedReturn = dayjs().add(duration, 'hour');

  if (loading) {
    return <div className="loading">正在加载工具信息...</div>;
  }

  if (!tool) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">❓</div>
        <div className="empty-state-text">工具不存在</div>
        <button
          className="btn btn-primary"
          style={{ marginTop: 20 }}
          onClick={() => navigate('/')}
        >
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div className="borrow-page">
      <h1 className="page-title">📝 发起借用申请</h1>

      <div className="borrow-tool-card">
        <div className="borrow-tool-header">
          <img src={tool.photo} alt={tool.name} />
          <div>
            <h1>{tool.name}</h1>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 10 }}>
              分类：{tool.category}
            </div>
            <span
              className={`tool-card-status ${tool.status}`}
              style={{ marginTop: 0 }}
            >
              {statusLabels[tool.status]}
            </span>
          </div>
        </div>

        <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 20 }}>
          {tool.description}
        </p>

        <div className="section">
          <div className="section-title">⚠️ 使用须知</div>
          <div className="usage-text">{tool.usageInstructions}</div>
        </div>
      </div>

      <div className="borrow-tool-card">
        <div className="form-group">
          <label className="form-label">借用人</label>
          <input
            type="text"
            className="form-input"
            value={CURRENT_USER.name}
            disabled
            style={{ background: '#f5f5f5' }}
          />
        </div>

        <div className="form-group">
          <label className="form-label">选择借用时长</label>
          <div className="duration-group">
            {DURATION_OPTIONS.map((hour) => (
              <button
                key={hour}
                type="button"
                className={`duration-option ${duration === hour ? 'selected' : ''}`}
                onClick={() => setDuration(hour)}
              >
                {hour < 24 ? `${hour} 小时` : '24 小时（1天）'}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            padding: 14,
            background: '#e3f2fd',
            borderRadius: 8,
            marginBottom: 24,
            fontSize: 13,
            color: '#1565c0',
          }}
        >
          <div>
            📅 预计归还时间：
            <strong style={{ marginLeft: 4 }}>
              {estimatedReturn.format('YYYY-MM-DD HH:mm')}
            </strong>
          </div>
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>
            超过此时间未归还，借用记录将被标记为逾期，请注意及时归还并提交使用反馈。
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: 12,
              background: '#ffebee',
              borderRadius: 8,
              color: '#c62828',
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            ❌ {error}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              padding: 12,
              background: '#e8f5e9',
              borderRadius: 8,
              color: '#2e7d32',
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            ✅ {successMsg}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/')}
            disabled={submitting}
          >
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={tool.status !== 'available' || submitting}
            style={{ flex: 1 }}
          >
            {submitting
              ? '提交中...'
              : tool.status !== 'available'
              ? '工具不可借用'
              : '确认借用'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Borrow;
