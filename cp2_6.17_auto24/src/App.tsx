import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import MapView from './map/MapView';
import ItemList from './item/ItemList';
import ItemCard from './item/ItemCard';
import NotificationCenter from './notification/NotificationCenter';
import { useApi } from './hooks/useApi';
import type { User, Item, Station } from './types';
import dayjs from 'dayjs';

interface AuthUser {
  id: string;
  username: string;
  phone: string;
}

function LoginForm({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const { post, loading } = useApi<{ success: boolean; user: AuthUser }>();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const body = isRegister ? { username, password, phone } : { username, password };
    
    const result = await post(endpoint, body);
    if (result?.success) {
      onLogin(result.user);
      localStorage.setItem('user', JSON.stringify(result.user));
      navigate('/');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo">🚇</div>
          <h1 className="auth-title">地铁失物招领</h1>
          <p className="auth-subtitle">{isRegister ? '创建新账号' : '欢迎回来'}</p>
        </div>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>用户名</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="请输入用户名"
              required
            />
          </div>
          
          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
            />
          </div>
          
          {isRegister && (
            <div className="form-group">
              <label>手机号</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="请输入手机号"
                required
              />
            </div>
          )}
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '提交中...' : (isRegister ? '注册' : '登录')}
          </button>
        </form>
        
        <div className="auth-switch">
          <span>{isRegister ? '已有账号？' : '没有账号？'}</span>
          <button className="link-btn" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? '立即登录' : '立即注册'}
          </button>
        </div>
        
        <div className="demo-hint">
          💡 演示账号: demo / 123456
        </div>
      </div>
      
      <style>{`
        .auth-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }
        
        .auth-card {
          width: 100%;
          max-width: 400px;
          background: #ffffff;
          border-radius: 20px;
          padding: 40px 32px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
        }
        
        .auth-header {
          text-align: center;
          margin-bottom: 32px;
        }
        
        .logo {
          font-size: 48px;
          margin-bottom: 12px;
        }
        
        .auth-title {
          font-size: 24px;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 8px 0;
        }
        
        .auth-subtitle {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }
        
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .form-group label {
          font-size: 13px;
          font-weight: 500;
          color: #374151;
        }
        
        .form-group input {
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 14px;
          transition: border-color 0.2s ease;
          outline: none;
        }
        
        .form-group input:focus {
          border-color: #6366f1;
        }
        
        .error-message {
          color: #ef4444;
          font-size: 13px;
          text-align: center;
        }
        
        .btn-primary {
          padding: 14px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: #ffffff;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: filter 0.2s ease, transform 0.2s ease;
        }
        
        .btn-primary:hover {
          filter: brightness(1.1);
        }
        
        .btn-primary:active {
          transform: scale(0.98);
        }
        
        .auth-switch {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 4px;
          margin-top: 20px;
          font-size: 13px;
          color: #6b7280;
        }
        
        .link-btn {
          background: none;
          border: none;
          color: #6366f1;
          font-weight: 500;
          cursor: pointer;
          padding: 0;
        }
        
        .demo-hint {
          margin-top: 20px;
          padding: 12px;
          background: #f3f4f6;
          border-radius: 8px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}

function PublishForm({ user }: { user: AuthUser }) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState<'lost' | 'found'>('lost');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stationId, setStationId] = useState('');
  const [stationName, setStationName] = useState('');
  const [location, setLocation] = useState('');
  const [time, setTime] = useState(dayjs().format('YYYY-MM-DDTHH:mm'));
  const [contact, setContact] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [stations, setStations] = useState<Station[]>([]);
  const [previewImage, setPreviewImage] = useState('');
  const { get, post, loading } = useApi<{ success: boolean; item: Item }>();
  const { get: getStations } = useApi<{ stations: Station[] }>();
  const navigate = useNavigate();

  useEffect(() => {
    getStations('/api/stations').then(result => {
      if (result) setStations(result.stations);
    });
  }, [getStations]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreviewImage(result);
        setImageUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = stations.find(s => s.id === e.target.value);
    if (selected) {
      setStationId(selected.id);
      setStationName(selected.name);
    }
  };

  const handleSubmit = async () => {
    const result = await post('/api/items', {
      type,
      title,
      description,
      stationId,
      stationName,
      location,
      time: dayjs(time).format('YYYY-MM-DD HH:mm'),
      contact,
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1586769852044-692d6e3703f0?w=400&h=300&fit=crop',
      userId: user.id,
      username: user.username,
    });
    
    if (result?.success) {
      await post('/api/matching/run');
      navigate('/');
    }
  };

  const nextStep = () => {
    if (step === 1 && (!title || !description)) return;
    if (step === 2 && (!stationId || !location || !time || !contact)) return;
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const stepAnimation = {
    animation: `slideIn 0.3s ease-out`,
  };

  return (
    <div className="publish-container">
      <div className="publish-header">
        <button className="back-btn" onClick={() => navigate('/')}>← 返回</button>
        <h2 className="publish-title">{type === 'lost' ? '📌 发布寻物启事' : '🎁 发布拾物信息'}</h2>
        <div className="step-indicator">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`step-dot ${step >= s ? 'active' : ''} ${step === s ? 'current' : ''}`}
            >
              {s}
            </div>
          ))}
        </div>
      </div>

      <div className="publish-content">
        <div className="publish-grid">
        {step === 1 && (
          <div className="step-content" style={stepAnimation}>
            <div className="type-selector">
              <button
                className={`type-btn ${type === 'lost' ? 'active lost' : ''}`}
                onClick={() => setType('lost')}
              >
                <span className="type-icon">🔍</span>
                <span className="type-text">我丢了东西</span>
              </button>
              <button
                className={`type-btn ${type === 'found' ? 'active found' : ''}`}
                onClick={() => setType('found')}
              >
                <span className="type-icon">🎁</span>
                <span className="type-text">我捡到东西</span>
              </button>
            </div>

            <div className="form-group">
              <label>物品名称 *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={type === 'lost' ? '例如：黑色钱包' : '例如：苹果手机'}
                required
              />
            </div>

            <div className="form-group">
              <label>详细描述 *</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="请详细描述物品的特征，如颜色、品牌、特殊标记等..."
                rows={4}
                required
              />
            </div>

            <div className="form-group">
              <label>物品图片</label>
              <div className="image-upload">
                {previewImage ? (
                  <div className="image-preview">
                    <img src={previewImage} alt="预览" />
                    <button
                      type="button"
                      className="remove-image"
                      onClick={() => { setPreviewImage(''); setImageUrl(''); }}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <label className="upload-label">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      hidden
                    />
                    <div className="upload-placeholder">
                      <span className="upload-icon">📷</span>
                      <span className="upload-text">点击上传图片</span>
                    </div>
                  </label>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-content" style={stepAnimation}>
            <div className="form-group">
              <label>站点 *</label>
              <select value={stationId} onChange={handleStationChange} required>
                <option value="">请选择站点</option>
                {stations.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} - {s.line}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>具体位置 *</label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="例如：1号线站台、A出口、安检口等"
                required
              />
            </div>

            <div className="form-group">
              <label>{type === 'lost' ? '丢失' : '拾取'}时间 *</label>
              <input
                type="datetime-local"
                value={time}
                onChange={e => setTime(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>联系方式 *</label>
              <input
                type="text"
                value={contact}
                onChange={e => setContact(e.target.value)}
                placeholder="手机号或微信号"
                required
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="step-content" style={stepAnimation}>
            <h3 className="preview-title">📋 信息预览</h3>
            <div className="preview-card">
              <div className="preview-image">
                <img src={imageUrl || 'https://images.unsplash.com/photo-1586769852044-692d6e3703f0?w=400&h=300&fit=crop'} alt={title} />
                <div className={`preview-type ${type}`}>
                  {type === 'lost' ? '寻物' : '拾物'}
                </div>
              </div>
              <div className="preview-details">
                <h4 className="preview-item-title">{title}</h4>
                <p className="preview-desc">{description}</p>
                <div className="preview-meta">
                  <div className="meta-row">
                    <span className="meta-label">📍 站点</span>
                    <span className="meta-value">{stationName}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">🏷️ 位置</span>
                    <span className="meta-value">{location}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">⏰ 时间</span>
                    <span className="meta-value">{dayjs(time).format('YYYY-MM-DD HH:mm')}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">📞 联系</span>
                    <span className="meta-value">{contact}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      <div className="publish-footer">
        {step > 1 && (
          <button className="btn-secondary" onClick={prevStep}>
            上一步
          </button>
        )}
        {step < 3 ? (
          <button className="btn-primary" onClick={nextStep}>
            下一步
          </button>
        ) : (
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? '发布中...' : '确认发布'}
          </button>
        )}
      </div>

      <style>{`
        .publish-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #f9fafb;
        }
        
        .publish-header {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: #ffffff;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .back-btn {
          background: rgba(255,255,255,0.2);
          border: none;
          color: #ffffff;
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .publish-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          flex: 1;
        }
        
        .step-indicator {
          display: flex;
          gap: 8px;
        }
        
        .step-dot {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(255,255,255,0.3);
          color: rgba(255,255,255,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.3s ease;
        }
        
        .step-dot.active {
          background: #ffffff;
          color: #6366f1;
        }
        
        .step-dot.current {
          transform: scale(1.1);
          box-shadow: 0 0 0 3px rgba(255,255,255,0.3);
        }
        
        .publish-content {
          flex: 1;
          padding: 24px 16px;
          width: 100%;
          max-width: 1440px;
          margin: 0 auto;
          overflow-y: auto;
        }
        
        .publish-grid {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 16px;
        }
        
        .publish-grid > .step-content {
          grid-column: span 12;
          max-width: 600px;
          width: 100%;
          margin: 0 auto;
        }
        
        @media (min-width: 768px) {
          .publish-content {
            padding: 32px 24px;
          }
          
          .publish-grid {
            gap: 20px;
          }
        }
        
        @media (min-width: 1024px) {
          .publish-content {
            padding: 40px 32px;
          }
          
          .publish-grid {
            gap: 24px;
          }
          
          .publish-grid > .step-content {
            grid-column: 3 / span 8;
            max-width: none;
          }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .type-selector {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 24px;
        }
        
        .type-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 20px;
          background: #ffffff;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .type-btn:hover {
          border-color: #c7d2fe;
        }
        
        .type-btn.active.lost {
          border-color: #ef4444;
          background: #fef2f2;
        }
        
        .type-btn.active.found {
          border-color: #10b981;
          background: #f0fdf4;
        }
        
        .type-icon {
          font-size: 32px;
        }
        
        .type-text {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 20px;
        }
        
        .form-group label {
          font-size: 13px;
          font-weight: 500;
          color: #374151;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 14px;
          transition: border-color 0.2s ease;
          outline: none;
          background: #ffffff;
          font-family: inherit;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          border-color: #6366f1;
        }
        
        .image-upload {
          border: 2px dashed #d1d5db;
          border-radius: 12px;
          overflow: hidden;
          min-height: 160px;
        }
        
        .upload-label {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 160px;
          cursor: pointer;
        }
        
        .upload-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: #9ca3af;
        }
        
        .upload-icon {
          font-size: 36px;
        }
        
        .upload-text {
          font-size: 13px;
        }
        
        .image-preview {
          position: relative;
          width: 100%;
        }
        
        .image-preview img {
          width: 100%;
          height: 200px;
          object-fit: cover;
        }
        
        .remove-image {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 28px;
          height: 28px;
          border: none;
          border-radius: 50%;
          background: rgba(0,0,0,0.5);
          color: #ffffff;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .preview-title {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 16px 0;
        }
        
        .preview-card {
          background: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.08);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .preview-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 24px rgba(0,0,0,0.12);
        }
        
        .preview-image {
          position: relative;
          width: 100%;
          height: 200px;
        }
        
        .preview-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .preview-type {
          position: absolute;
          top: 12px;
          left: 12px;
          padding: 4px 12px;
          border-radius: 6px;
          color: #ffffff;
          font-size: 12px;
          font-weight: 500;
        }
        
        .preview-type.lost {
          background: #ef4444;
        }
        
        .preview-type.found {
          background: #10b981;
        }
        
        .preview-details {
          padding: 16px;
        }
        
        .preview-item-title {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 8px 0;
        }
        
        .preview-desc {
          font-size: 14px;
          color: #6b7280;
          margin: 0 0 16px 0;
          line-height: 1.5;
        }
        
        .preview-meta {
          border-top: 1px solid #f3f4f6;
          padding-top: 16px;
        }
        
        .meta-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 13px;
        }
        
        .meta-label {
          color: #9ca3af;
        }
        
        .meta-value {
          color: #374151;
          font-weight: 500;
        }
        
        .publish-footer {
          padding: 16px 20px;
          background: #ffffff;
          border-top: 1px solid #e5e7eb;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
        
        .btn-primary,
        .btn-secondary {
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: #ffffff;
        }
        
        .btn-primary:hover {
          filter: brightness(1.1);
        }
        
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }
        
        .btn-secondary:hover {
          background: #e5e7eb;
        }
      `}</style>
    </div>
  );
}

function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [matchedItem, setMatchedItem] = useState<Item | null>(null);
  const { get, loading } = useApi<Item>();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      get(`/api/items/${id}`).then(result => {
        if (result) setItem(result);
      });
    }
  }, [id, get]);

  if (loading && !item) {
    return (
      <div className="detail-loading">
        <div className="spinner" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="detail-error">
        <p>物品不存在</p>
        <button onClick={() => navigate('/')}>返回首页</button>
      </div>
    );
  }

  return (
    <div className="detail-container">
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate('/')}>← 返回</button>
        <h2 className="detail-title">物品详情</h2>
      </div>

      <div className="detail-content">
        <div className="detail-image">
          <img src={item.imageUrl} alt={item.title} />
          <div className={`detail-type ${item.type}`}>
            {item.type === 'lost' ? '寻物' : '拾物'}
          </div>
          <div className="detail-status" style={{
            background: item.status === 'open' ? '#6366f1' : item.status === 'matched' ? '#10b981' : '#6b7280'
          }}>
            {item.status === 'open' ? '寻找中' : item.status === 'matched' ? '已匹配' : '已认领'}
          </div>
        </div>

        <div className="detail-info">
          <h1 className="item-title">{item.title}</h1>
          <p className="item-desc">{item.description}</p>

          <div className="info-section">
            <h3 className="section-title">📍 位置信息</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">站点</span>
                <span className="info-value">{item.stationName}</span>
              </div>
              <div className="info-item">
                <span className="info-label">具体位置</span>
                <span className="info-value">{item.location}</span>
              </div>
              <div className="info-item">
                <span className="info-label">{item.type === 'lost' ? '丢失时间' : '拾取时间'}</span>
                <span className="info-value">{item.time}</span>
              </div>
              <div className="info-item">
                <span className="info-label">发布时间</span>
                <span className="info-value">{dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')}</span>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h3 className="section-title">📞 联系方式</h3>
            <div className="contact-box">
              <span className="contact-value">{item.contact}</span>
            </div>
          </div>

          <div className="info-section">
            <h3 className="section-title">👤 发布者</h3>
            <div className="publisher-info">
              <div className="publisher-avatar">{item.username.charAt(0).toUpperCase()}</div>
              <span className="publisher-name">{item.username}</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .detail-container {
          min-height: 100vh;
          background: #f9fafb;
        }
        
        .detail-header {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: #ffffff;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .back-btn {
          background: rgba(255,255,255,0.2);
          border: none;
          color: #ffffff;
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .detail-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }
        
        .detail-content {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .detail-image {
          position: relative;
          width: 100%;
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 20px;
        }
        
        .detail-image img {
          width: 100%;
          height: 300px;
          object-fit: cover;
        }
        
        .detail-type,
        .detail-status {
          position: absolute;
          padding: 6px 14px;
          border-radius: 8px;
          color: #ffffff;
          font-size: 13px;
          font-weight: 500;
        }
        
        .detail-type {
          top: 16px;
          left: 16px;
        }
        
        .detail-type.lost {
          background: #ef4444;
        }
        
        .detail-type.found {
          background: #10b981;
        }
        
        .detail-status {
          top: 16px;
          right: 16px;
        }
        
        .detail-info {
          background: #ffffff;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.06);
        }
        
        .item-title {
          font-size: 24px;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 12px 0;
        }
        
        .item-desc {
          font-size: 15px;
          color: #6b7280;
          line-height: 1.6;
          margin: 0 0 24px 0;
        }
        
        .info-section {
          margin-bottom: 24px;
        }
        
        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin: 0 0 12px 0;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }
        
        .info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 12px;
          background: #f9fafb;
          border-radius: 8px;
        }
        
        .info-label {
          font-size: 12px;
          color: #9ca3af;
        }
        
        .info-value {
          font-size: 14px;
          color: #374151;
          font-weight: 500;
        }
        
        .contact-box {
          padding: 16px;
          background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%);
          border-radius: 8px;
          text-align: center;
        }
        
        .contact-value {
          font-size: 18px;
          font-weight: 600;
          color: #6366f1;
          letter-spacing: 1px;
        }
        
        .publisher-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .publisher-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 600;
        }
        
        .publisher-name {
          font-size: 15px;
          font-weight: 500;
          color: #374151;
        }
        
        .detail-loading,
        .detail-error {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e0e7ff;
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .detail-error button {
          padding: 10px 20px;
          background: #6366f1;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

function Navigation({ user, onLogout, unreadCount }: {
  user: AuthUser;
  onLogout: () => void;
  unreadCount: number;
}) {
  return (
    <nav className="app-nav">
      <div className="nav-brand">
        <span className="logo">🚇</span>
        <span className="brand-text">失物招领</span>
      </div>
      
      <div className="nav-links">
        <Link to="/" className="nav-link">
          <span className="nav-icon">🗺️</span>
          <span className="nav-text">地图</span>
        </Link>
        <Link to="/items" className="nav-link">
          <span className="nav-icon">📦</span>
          <span className="nav-text">全部</span>
        </Link>
        <Link to="/publish" className="nav-link publish">
          <span className="nav-icon">+</span>
          <span className="nav-text">发布</span>
        </Link>
        <Link to="/notifications" className="nav-link">
          <span className="nav-icon">🔔</span>
          <span className="nav-text">通知</span>
          {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
        </Link>
      </div>
      
      <div className="nav-user">
        <span className="user-name">{user.username}</span>
        <button className="logout-btn" onClick={onLogout}>退出</button>
      </div>
      
      <style>{`
        .app-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          background: #ffffff;
          border-bottom: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .nav-brand {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .logo {
          font-size: 28px;
        }
        
        .brand-text {
          font-size: 18px;
          font-weight: 700;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .nav-links {
          display: flex;
          gap: 4px;
        }
        
        .nav-link {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 8px;
          text-decoration: none;
          color: #6b7280;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
          position: relative;
        }
        
        .nav-link:hover {
          background: #f3f4f6;
          color: #374151;
        }
        
        .nav-link.publish {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: #ffffff;
        }
        
        .nav-link.publish:hover {
          filter: brightness(1.1);
        }
        
        .nav-icon {
          font-size: 16px;
        }
        
        .nav-badge {
          position: absolute;
          top: 2px;
          right: 2px;
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          background: #ef4444;
          color: #ffffff;
          border-radius: 9px;
          font-size: 10px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .nav-user {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .user-name {
          font-size: 14px;
          color: #374151;
          font-weight: 500;
        }
        
        .logout-btn {
          padding: 6px 14px;
          background: #f3f4f6;
          border: none;
          border-radius: 6px;
          color: #6b7280;
          font-size: 13px;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        
        .logout-btn:hover {
          background: #e5e7eb;
        }
        
        @media (max-width: 768px) {
          .app-nav {
            padding: 10px 12px;
          }
          
          .brand-text {
            display: none;
          }
          
          .nav-text {
            display: none;
          }
          
          .nav-link {
            padding: 8px 12px;
          }
          
          .user-name {
            display: none;
          }
        }
      `}</style>
    </nav>
  );
}

function MapPage() {
  return (
    <div className="page map-page">
      <MapView />
    </div>
  );
}

function ItemsPage() {
  const [filter, setFilter] = useState<'all' | 'lost' | 'found'>('all');
  
  return (
    <div className="page items-page">
      <div className="page-header">
        <h2 className="page-title">📦 全部物品</h2>
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            全部
          </button>
          <button
            className={`filter-tab ${filter === 'lost' ? 'active' : ''}`}
            onClick={() => setFilter('lost')}
          >
            寻物
          </button>
          <button
            className={`filter-tab ${filter === 'found' ? 'active' : ''}`}
            onClick={() => setFilter('found')}
          >
            拾物
          </button>
        </div>
      </div>
      <ItemList type={filter === 'all' ? undefined : filter} />
      
      <style>{`
        .page {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .page-header {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: #ffffff;
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .page-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }
        
        .filter-tabs {
          display: flex;
          gap: 4px;
          background: rgba(255,255,255,0.2);
          padding: 4px;
          border-radius: 8px;
        }
        
        .filter-tab {
          padding: 6px 16px;
          border: none;
          background: transparent;
          color: rgba(255,255,255,0.8);
          font-size: 13px;
          font-weight: 500;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .filter-tab.active {
          background: #ffffff;
          color: #6366f1;
        }
        
        .items-page {
          background: #f9fafb;
        }
        
        .map-page {
          height: 100%;
        }
      `}</style>
    </div>
  );
}

function NotificationsPage({ user }: { user: AuthUser }) {
  return <NotificationCenter userId={user.id} />;
}

function AppContent() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const { get } = useApi<{ success: boolean }>();

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (user) {
      const params = new URLSearchParams({ userId: user.id });
      fetch(`/api/messages?${params.toString()}`)
        .then(res => res.json())
        .then((messages: { read: boolean }[]) => {
          setUnreadCount(messages.filter(m => !m.read).length);
        });
      
      const interval = setInterval(() => {
        fetch(`/api/messages?${params.toString()}`)
          .then(res => res.json())
          .then((messages: { read: boolean }[]) => {
            setUnreadCount(messages.filter(m => !m.read).length);
          });
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleLogin = useCallback((authUser: AuthUser) => {
    setUser(authUser);
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('user');
  }, []);

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      <Navigation user={user} onLogout={handleLogout} unreadCount={unreadCount} />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/items" element={<ItemsPage />} />
          <Route path="/publish" element={<PublishForm user={user} />} />
          <Route path="/notifications" element={<NotificationsPage user={user} />} />
          <Route path="/item/:id" element={<ItemDetail />} />
        </Routes>
      </main>
      
      <style>{`
        .app-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        
        .app-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        button {
          font-family: inherit;
        }
        
        .container {
          width: 100%;
          max-width: 1440px;
          margin: 0 auto;
          padding: 0 16px;
        }
        
        @media (min-width: 768px) {
          .container {
            padding: 0 24px;
          }
        }
        
        @media (min-width: 1024px) {
          .container {
            padding: 0 32px;
          }
        }
        
        .grid {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 16px;
        }
        
        @media (min-width: 768px) {
          .grid {
            gap: 20px;
          }
        }
        
        @media (min-width: 1024px) {
          .grid {
            gap: 24px;
          }
        }
        
        .col-12 { grid-column: span 12; }
        .col-11 { grid-column: span 11; }
        .col-10 { grid-column: span 10; }
        .col-9 { grid-column: span 9; }
        .col-8 { grid-column: span 8; }
        .col-7 { grid-column: span 7; }
        .col-6 { grid-column: span 6; }
        .col-5 { grid-column: span 5; }
        .col-4 { grid-column: span 4; }
        .col-3 { grid-column: span 3; }
        .col-2 { grid-column: span 2; }
        .col-1 { grid-column: span 1; }
        
        @media (min-width: 768px) {
          .col-md-12 { grid-column: span 12; }
          .col-md-11 { grid-column: span 11; }
          .col-md-10 { grid-column: span 10; }
          .col-md-9 { grid-column: span 9; }
          .col-md-8 { grid-column: span 8; }
          .col-md-7 { grid-column: span 7; }
          .col-md-6 { grid-column: span 6; }
          .col-md-5 { grid-column: span 5; }
          .col-md-4 { grid-column: span 4; }
          .col-md-3 { grid-column: span 3; }
          .col-md-2 { grid-column: span 2; }
          .col-md-1 { grid-column: span 1; }
        }
        
        @media (min-width: 1024px) {
          .col-lg-12 { grid-column: span 12; }
          .col-lg-11 { grid-column: span 11; }
          .col-lg-10 { grid-column: span 10; }
          .col-lg-9 { grid-column: span 9; }
          .col-lg-8 { grid-column: span 8; }
          .col-lg-7 { grid-column: span 7; }
          .col-lg-6 { grid-column: span 6; }
          .col-lg-5 { grid-column: span 5; }
          .col-lg-4 { grid-column: span 4; }
          .col-lg-3 { grid-column: span 3; }
          .col-lg-2 { grid-column: span 2; }
          .col-lg-1 { grid-column: span 1; }
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: filter 0.2s ease, transform 0.2s ease;
        }
        
        .btn-primary:hover {
          filter: brightness(1.1);
        }
        
        .btn-primary:active {
          transform: scale(0.98);
        }
        
        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        
        .btn-secondary:hover {
          background: #e5e7eb;
        }
        
        .card {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.08);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .card:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 24px rgba(0,0,0,0.12);
        }
        
        .ripple {
          position: relative;
          overflow: hidden;
        }
        
        .ripple::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          background: rgba(255,255,255,0.3);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          transition: width 0.3s, height 0.3s;
        }
        
        .ripple:active::after {
          width: 200px;
          height: 200px;
        }
        
        .flex {
          display: flex;
        }
        
        .flex-col {
          flex-direction: column;
        }
        
        .items-center {
          align-items: center;
        }
        
        .justify-center {
          justify-content: center;
        }
        
        .justify-between {
          justify-content: space-between;
        }
        
        .gap-2 { gap: 8px; }
        .gap-3 { gap: 12px; }
        .gap-4 { gap: 16px; }
        
        .w-full {
          width: 100%;
        }
        
        .text-center {
          text-align: center;
        }
      `}</style>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
