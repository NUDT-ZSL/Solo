import { useState } from 'react';

interface RegisterFormProps {
  onSubmit: (data: { nickname: string; avatarUrl: string; building: string }) => void;
  onCancel: () => void;
  loading?: boolean;
  existingBuildings?: string[];
}

const defaultBuildings = ['1号楼', '2号楼', '3号楼', '5号楼', '6号楼', '8号楼'];

export function RegisterForm({ onSubmit, onCancel, loading, existingBuildings = [] }: RegisterFormProps) {
  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [building, setBuilding] = useState('');
  const [customBuilding, setCustomBuilding] = useState('');
  const [error, setError] = useState('');

  const buildings = Array.from(new Set([...defaultBuildings, ...existingBuildings])).sort();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalBuilding = building === 'custom' ? customBuilding.trim() : building;

    if (!nickname.trim()) {
      setError('请填写昵称');
      return;
    }
    if (!finalBuilding) {
      setError('请选择或输入楼栋');
      return;
    }
    setError('');
    onSubmit({
      nickname: nickname.trim(),
      avatarUrl: avatarUrl.trim(),
      building: finalBuilding
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

  const previewAvatar = avatarUrl.trim() || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(nickname || 'default')}`;

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img
          src={previewAvatar}
          alt="头像预览"
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            border: '3px solid #f97316',
            marginBottom: '10px',
            background: '#f3f4f6',
            objectFit: 'cover'
          }}
        />
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>头像预览</span>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>昵称 *</label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="给自己取个好听的名字吧"
          style={inputStyle}
          maxLength={20}
          onFocus={(e) => (e.target.style.borderColor = '#f97316')}
          onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>所在楼栋 *</label>
        <select
          value={building}
          onChange={(e) => setBuilding(e.target.value)}
          style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = '#f97316')}
          onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
        >
          <option value="">请选择楼栋</option>
          {buildings.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
          <option value="custom">✏️ 自定义楼栋...</option>
        </select>
      </div>

      {building === 'custom' && (
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>输入楼栋名</label>
          <input
            type="text"
            value={customBuilding}
            onChange={(e) => setCustomBuilding(e.target.value)}
            placeholder="如：10号楼、A栋"
            style={inputStyle}
            maxLength={20}
            onFocus={(e) => (e.target.style.borderColor = '#f97316')}
            onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
          />
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>头像URL（可选，留空自动生成）</label>
        <input
          type="text"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://example.com/avatar.jpg"
          style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = '#f97316')}
          onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
        />
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

      <div style={{ padding: '12px', background: '#fffbeb', borderRadius: '8px', marginBottom: '20px' }}>
        <div style={{ fontSize: '12px', color: '#92400e', fontWeight: 600 }}>🎉 新用户福利</div>
        <div style={{ fontSize: '12px', color: '#b45309', marginTop: '4px' }}>
          注册即赠送 <strong style={{ color: '#f97316' }}>100 信用积分</strong>，开启你的邻里互助之旅！
        </div>
      </div>

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
          {loading ? '注册中...' : '加入社区'}
        </button>
      </div>
    </form>
  );
}
