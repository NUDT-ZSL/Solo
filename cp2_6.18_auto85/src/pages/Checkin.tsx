import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { api } from '../api';
import type { Activity, Registration } from '../types';
import './Checkin.css';

export default function Checkin() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [activityData, regsData] = await Promise.all([
        api.getActivity(id!),
        api.getRegistrations(id!),
      ]);
      setActivity(activityData);
      setRegistrations(regsData);
    } catch (error) {
      console.error('Failed to load checkin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCheckin = async (reg: Registration) => {
    try {
      setUpdatingId(reg.id);
      const newCheckedIn = !reg.checkedIn;
      await api.updateCheckin(id!, reg.id, newCheckedIn);
      
      setRegistrations(prev =>
        prev.map(r =>
          r.id === reg.id ? { ...r, checkedIn: newCheckedIn } : r
        )
      );
    } catch (error) {
      console.error('Failed to update checkin:', error);
      alert('签到状态更新失败，请稍后重试');
    } finally {
      setUpdatingId(null);
    }
  };

  const checkedInCount = registrations.filter(r => r.checkedIn).length;
  const totalCount = registrations.length;

  if (loading) {
    return (
      <div className="container">
        <div className="loading-state" style={{ padding: '100px 0' }}>
          <div className="spinner"></div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="container">
        <div className="empty-state" style={{ padding: '100px 0' }}>
          <p>活动不存在</p>
          <button className="btn" onClick={() => navigate('/admin')}>
            返回管理页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkin-page">
      <div className="container">
        <button className="back-btn" onClick={() => navigate('/admin')}>
          <ArrowLeft size={20} />
          返回管理页
        </button>

        <div className="checkin-header">
          <h1 className="checkin-title">{activity.name}</h1>
          <div className="checkin-stats">
            <div className="stat-item">
              <span className="stat-label">已签到</span>
              <span className="stat-value checked-in">{checkedInCount}</span>
            </div>
            <div className="stat-divider">/</div>
            <div className="stat-item">
              <span className="stat-label">总报名</span>
              <span className="stat-value">{totalCount}</span>
            </div>
          </div>
        </div>

        {registrations.length === 0 ? (
          <div className="empty-state">
            <p>暂无报名记录</p>
          </div>
        ) : (
          <div className="checkin-grid">
            {registrations.map((reg) => (
              <div
                key={reg.id}
                className={`checkin-card ${reg.checkedIn ? 'checked-in' : ''} ${updatingId === reg.id ? 'updating' : ''}`}
                onClick={() => handleToggleCheckin(reg)}
              >
                {reg.checkedIn && (
                  <div className="checkin-badge">
                    <Check size={18} />
                  </div>
                )}
                <div className="checkin-card-content">
                  <div className="parent-name">{reg.parentName}</div>
                  <div className="children-count">
                    {reg.children.length} 名儿童
                  </div>
                  <div className="children-names">
                    {reg.children.map((c, i) => (
                      <span key={i} className="child-tag">
                        {c.name}({c.age}岁)
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
