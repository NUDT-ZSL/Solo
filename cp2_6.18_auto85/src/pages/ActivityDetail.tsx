import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Users, Clock, Heart, ArrowLeft } from 'lucide-react';
import PhotoMasonry from '../components/PhotoMasonry';
import Toast from '../components/Toast';
import { api } from '../api';
import type { Activity, Photo, Child, RegistrationStatus } from '../types';
import './ActivityDetail.css';

function getRegistrationStatus(activity: Activity): RegistrationStatus {
  const registeredCount = activity.registrations.reduce(
    (sum, r) => sum + r.children.length,
    0
  );
  const ratio = registeredCount / activity.maxParticipants;
  if (ratio >= 1) return 'full';
  if (ratio >= 0.8) return 'filling';
  return 'available';
}

export default function ActivityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [favoriteCount, setFavoriteCount] = useState(0);

  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');
  const [children, setChildren] = useState<Child[]>([{ name: '', age: 1 }]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      loadActivityData();
    }
  }, [id]);

  const loadActivityData = async () => {
    try {
      setLoading(true);
      const [activityData, photosData] = await Promise.all([
        api.getActivity(id!),
        api.getPhotos(id!),
      ]);
      setActivity(activityData);
      setPhotos(photosData);
      setFavoriteCount(photosData.filter((p) => p.isFavorite).length);
    } catch (error) {
      console.error('Failed to load activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddChild = () => {
    if (children.length < 2) {
      setChildren([...children, { name: '', age: 1 }]);
    }
  };

  const handleRemoveChild = (index: number) => {
    if (children.length > 1) {
      setChildren(children.filter((_, i) => i !== index));
    }
  };

  const handleChildChange = (index: number, field: keyof Child, value: string | number) => {
    const newChildren = [...children];
    newChildren[index] = { ...newChildren[index], [field]: value };
    setChildren(newChildren);
  };

  function ageInRange(age: number, ageGroup: string): boolean {
    const match = ageGroup.match(/(\d+)-(\d+)岁/);
    if (!match) return false;
    const min = parseInt(match[1]);
    const max = parseInt(match[2]);
    return age >= min && age <= max;
  }

  function validateChildrenAge(): { valid: boolean; message?: string } {
    if (!activity) return { valid: true };
    
    for (const child of children) {
      if (!child.name.trim()) continue;
      const valid = activity.ageGroups.some(group => ageInRange(child.age, group));
      if (!valid) {
        return {
          valid: false,
          message: `儿童"${child.name}"的年龄(${child.age}岁)不在活动允许的年龄段范围内。\n活动允许的年龄段：${activity.ageGroups.join('、')}`
        };
      }
    }
    return { valid: true };
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!parentName.trim() || !phone.trim()) {
      alert('请填写家长姓名和联系电话');
      return;
    }

    const validChildren = children.filter((c) => c.name.trim() && c.age >= 1 && c.age <= 12);
    if (validChildren.length === 0) {
      alert('请至少填写一名儿童的信息');
      return;
    }

    const ageValidation = validateChildrenAge();
    if (!ageValidation.valid) {
      alert(ageValidation.message);
      return;
    }

    try {
      setSubmitting(true);
      await api.register(id!, {
        parentName: parentName.trim(),
        phone: phone.trim(),
        children: validChildren,
      });

      setToastMessage('报名成功！我们会尽快与您联系');
      setShowToast(true);

      setParentName('');
      setPhone('');
      setChildren([{ name: '', age: 1 }]);

      loadActivityData();
    } catch (error) {
      const message = error instanceof Error ? error.message : '报名失败，请稍后重试';
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleFavoriteChange = () => {
    setFavoriteCount(photos.filter((p) => p.isFavorite).length);
  };

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
          <button className="btn" onClick={() => navigate('/')}>
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const status = getRegistrationStatus(activity);
  const registeredCount = activity.registrations.reduce(
    (sum, r) => sum + r.children.length,
    0
  );
  const isFull = status === 'full';

  return (
    <div className="activity-detail">
      {showToast && (
        <Toast message={toastMessage} onClose={() => setShowToast(false)} />
      )}

      <div className="container">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={20} />
          返回活动列表
        </button>

        <div className="activity-hero">
          <div className="activity-cover">
            <img
              src={activity.coverImage}
              alt={activity.name}
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=parent%20child%20activity%20playful%20warm%20colors&image_size=landscape_16_9`;
              }}
            />
          </div>
          <div className="activity-info">
            <h1 className="activity-title">{activity.name}</h1>
            <div className="activity-tags">
              {activity.ageGroups.map((age) => (
                <span key={age} className="age-tag">
                  {age}
                </span>
              ))}
            </div>
            <div className="activity-meta">
              <div className="meta-item">
                <Calendar size={18} />
                <span>{formatDateTime(activity.dateTime)}</span>
              </div>
              <div className="meta-item">
                <MapPin size={18} />
                <span>{activity.location}</span>
              </div>
              <div className="meta-item">
                <Users size={18} />
                <span>
                  已报名 {registeredCount}/{activity.maxParticipants} 人
                </span>
              </div>
            </div>
            <div className={`activity-status-badge status-${status}`}>
              {status === 'available' && '可报名'}
              {status === 'filling' && '即将满员'}
              {status === 'full' && '已满'}
            </div>
          </div>
        </div>

        <div className="activity-content">
          <div className="activity-description">
            <h2 className="section-title">活动介绍</h2>
            <p>{activity.description}</p>
          </div>

          <div className="registration-section">
            <h2 className="section-title">我要报名</h2>
            {isFull ? (
              <div className="full-notice">
                <p>抱歉，活动名额已满</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="registration-form">
                <div className="form-group">
                  <label className="form-label">家长姓名 *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="请输入家长姓名"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">联系电话 *</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="请输入联系电话"
                    required
                  />
                </div>

                {children.map((child, index) => (
                  <div key={index} className="child-form-group">
                    <div className="child-form-header">
                      <h3 className="child-title">儿童 {index + 1}</h3>
                      {children.length > 1 && (
                        <button
                          type="button"
                          className="remove-child-btn"
                          onClick={() => handleRemoveChild(index)}
                        >
                          移除
                        </button>
                      )}
                    </div>
                    <div className="child-fields">
                      <div className="form-group">
                        <label className="form-label">儿童姓名 *</label>
                        <input
                          type="text"
                          className="form-input"
                          value={child.name}
                          onChange={(e) => handleChildChange(index, 'name', e.target.value)}
                          placeholder="请输入儿童姓名"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">儿童年龄 (1-12岁) *</label>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          className="form-input"
                          value={child.age}
                          onChange={(e) =>
                            handleChildChange(index, 'age', parseInt(e.target.value) || 1)
                          }
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {children.length < 2 && (
                  <button type="button" className="btn btn-outline add-child-btn" onClick={handleAddChild}>
                    + 添加另一名儿童
                  </button>
                )}

                <button type="submit" className="btn submit-btn" disabled={submitting}>
                  {submitting ? '提交中...' : '提交报名'}
                </button>
              </form>
            )}
          </div>

          {photos.length > 0 && (
            <div className="photos-section">
              <div className="photos-header">
                <h2 className="section-title">活动照片</h2>
                <div className="favorite-count">
                  <Heart size={18} fill="#f44336" color="#f44336" />
                  <span>精彩瞬间：{favoriteCount} 张</span>
                </div>
              </div>
              <PhotoMasonry photos={photos} onFavoriteChange={handleFavoriteChange} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
