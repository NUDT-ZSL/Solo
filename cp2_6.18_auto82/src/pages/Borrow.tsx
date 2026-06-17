import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Tool } from '../types';

const durationOptions = [
  { value: 1, label: '1小时' },
  { value: 2, label: '2小时' },
  { value: 4, label: '4小时' },
  { value: 8, label: '8小时' },
  { value: 24, label: '24小时' },
];

const Borrow: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tool, setTool] = useState<Tool | null>(null);
  const [memberName, setMemberName] = useState('');
  const [duration, setDuration] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTool = async () => {
      try {
        const res = await fetch(`/api/tools/${id}`);
        if (!res.ok) {
          throw new Error('工具不存在');
        }
        const data = await res.json();
        setTool(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };
    fetchTool();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim()) {
      setError('请输入您的姓名');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/borrow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toolId: id,
          memberName: memberName.trim(),
          duration,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '提交失败');
      }

      navigate('/my-borrows');
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusLabel = (status: Tool['status']) => {
    const labels = {
      available: '可用',
      borrowed: '已借出',
      repairing: '维修中',
    };
    return labels[status];
  };

  if (loading) {
    return <div className="empty-state">加载中...</div>;
  }

  if (error && !tool) {
    return <div className="empty-state">{error}</div>;
  }

  if (!tool) {
    return <div className="empty-state">工具不存在</div>;
  }

  return (
    <div>
      <h1 className="page-title">借用申请</h1>

      <div className="tool-info">
        <img src={tool.image} alt={tool.name} />
        <div className="tool-info-content">
          <h2>{tool.name}</h2>
          <p>{tool.description}</p>
          <span className={`status-tag ${tool.status}`}>
            {getStatusLabel(tool.status)}
          </span>
        </div>
      </div>

      {tool.status !== 'available' ? (
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <p>该工具当前不可借用</p>
          <a href="/" className="btn btn-secondary" style={{ marginTop: 16 }}>
            返回首页
          </a>
        </div>
      ) : (
        <form className="borrow-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="memberName">您的姓名</label>
            <input
              type="text"
              id="memberName"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              placeholder="请输入您的姓名"
              maxLength={20}
            />
          </div>

          <div className="form-group">
            <label>借用时长</label>
            <div className="duration-options">
              {durationOptions.map(option => (
                <div
                  key={option.value}
                  className={`duration-option${duration === option.value ? ' selected' : ''}`}
                  onClick={() => setDuration(option.value)}
                >
                  <div className="hours">{option.value}</div>
                  <div className="label">{option.label}</div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ color: '#f44336', marginBottom: 16, fontSize: 14 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={submitting}
          >
            {submitting ? '提交中...' : '确认借用'}
          </button>
        </form>
      )}
    </div>
  );
};

export default Borrow;
