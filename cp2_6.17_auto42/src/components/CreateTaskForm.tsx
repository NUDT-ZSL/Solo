import { useState } from 'react';

interface CreateTaskFormProps {
  onSubmit: (data: {
    type: string;
    title: string;
    description: string;
    expectedTime: string;
    rewardPoints: number;
  }) => void;
  onCancel: () => void;
  loading?: boolean;
}

const taskTypes = [
  { value: 'express', label: '取快递', color: '#facc15' },
  { value: 'pet', label: '照看宠物', color: '#a78bfa' },
  { value: 'groupbuy', label: '团购拼单', color: '#34d399' },
  { value: 'other', label: '其他', color: '#9ca3af' }
];

export function CreateTaskForm({ onSubmit, onCancel, loading }: CreateTaskFormProps) {
  const [type, setType] = useState('express');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expectedTime, setExpectedTime] = useState('');
  const [rewardPoints, setRewardPoints] = useState(3);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('请填写任务标题');
      return;
    }
    setError('');
    onSubmit({
      type,
      title: title.trim(),
      description: description.trim(),
      expectedTime: expectedTime.trim(),
      rewardPoints
    });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '6px'
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>任务类型</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {taskTypes.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              style={{
                padding: '8px 4px',
                borderRadius: '8px',
                border: `2px solid ${type === t.value ? t.color : '#e5e7eb'}`,
                background: type === t.value ? `${t.color}15` : '#ffffff',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                color: type === t.value ? t.color : '#6b7280',
                transition: 'all 0.2s ease'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>任务标题 *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="简短描述一下需要帮助的事"
          style={inputStyle}
          maxLength={50}
          onFocus={(e) => (e.target.style.borderColor = '#f97316')}
          onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>详细描述</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="补充一些细节，比如快递大小、宠物性格、团购商品等..."
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
          maxLength={500}
          onFocus={(e) => (e.target.style.borderColor = '#f97316')}
          onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>期望完成时间</label>
        <input
          type="text"
          value={expectedTime}
          onChange={(e) => setExpectedTime(e.target.value)}
          placeholder="如：今天下午3点前、本周内"
          style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = '#f97316')}
          onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>
          奖励积分: <span style={{ color: '#f97316', fontSize: '18px' }}>{rewardPoints}</span> 分
        </label>
        <input
          type="range"
          min={1}
          max={10}
          value={rewardPoints}
          onChange={(e) => setRewardPoints(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: '#f97316' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af' }}>
          <span>1分</span>
          <span>5分</span>
          <span>10分</span>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginBottom: '16px',
            padding: '10px 12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#dc2626',
            fontSize: '13px'
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            background: '#ffffff',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            color: '#6b7280',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
          disabled={loading}
        >
          取消
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            background: loading ? '#fca5a5' : '#f97316',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            color: '#ffffff',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.background = '#ea580c';
          }}
          onMouseLeave={(e) => (e.currentTarget.style.background = loading ? '#fca5a5' : '#f97316')}
        >
          {loading ? '发布中...' : '发布任务'}
        </button>
      </div>
    </form>
  );
}
