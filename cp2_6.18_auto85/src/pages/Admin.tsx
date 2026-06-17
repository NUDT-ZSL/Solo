import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, Upload, Image, Calendar, MapPin, Users, Trash2, QrCode } from 'lucide-react';
import Toast from '../components/Toast';
import { api } from '../api';
import type { Activity, Registration } from '../types';
import './Admin.css';

const AGE_GROUPS = ['2-4岁', '4-6岁', '6-8岁', '8-10岁', '10-12岁'];

type TabType = 'create' | 'list' | 'photos';

export default function Admin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const [name, setName] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [location, setLocation] = useState('');
  const [ageGroups, setAgeGroups] = useState<string[]>([]);
  const [maxParticipants, setMaxParticipants] = useState(20);
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const data = await api.getActivities();
      setActivities(data);
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  };

  const handleAgeGroupToggle = (age: string) => {
    if (ageGroups.includes(age)) {
      setAgeGroups(ageGroups.filter((a) => a !== age));
    } else {
      setAgeGroups([...ageGroups, age]);
    }
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('封面图不能超过5MB');
        return;
      }
      setCoverImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setCoverPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !dateTime || !location || !description || ageGroups.length === 0) {
      alert('请填写完整的活动信息');
      return;
    }

    if (!coverImage) {
      alert('请上传活动封面图');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('dateTime', dateTime);
      formData.append('location', location.trim());
      formData.append('ageGroups', JSON.stringify(ageGroups));
      formData.append('maxParticipants', maxParticipants.toString());
      formData.append('description', description.trim());
      formData.append('coverImage', coverImage);

      await api.createActivity(formData);

      setToastMessage('活动创建成功！');
      setShowToast(true);

      setName('');
      setDateTime('');
      setAgeGroups([]);
      setMaxParticipants(20);
      setDescription('');
      setCoverImage(null);
      setCoverPreview(null);

      loadActivities();
      setActiveTab('list');
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建失败，请稍后重试';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectActivity = async (activity: Activity) => {
    setSelectedActivity(activity);
    try {
      const regs = await api.getRegistrations(activity.id);
      setRegistrations(regs);
    } catch (error) {
      console.error('Failed to load registrations:', error);
    }
  };

  const handleExportCSV = () => {
    if (selectedActivity) {
      api.exportRegistrations(selectedActivity.id);
    }
  };

  const handlePhotoFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 30) {
      alert('最多只能上传30张照片');
      return;
    }

    const validFiles = files.filter((f) => f.size <= 8 * 1024 * 1024);
    if (validFiles.length !== files.length) {
      alert('部分文件超过8MB，已自动过滤');
    }

    setPhotoFiles(validFiles);
  };

  const handleUploadPhotos = async () => {
    if (!selectedActivity || photoFiles.length === 0) {
      return;
    }

    try {
      setLoading(true);
      setUploadProgress(0);

      await api.uploadPhotos(selectedActivity.id, photoFiles, (percent) => {
        setUploadProgress(percent);
      });

      setToastMessage('照片上传成功！');
      setShowToast(true);
      setPhotoFiles([]);
      setUploadProgress(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : '上传失败，请稍后重试';
      alert(message);
      setUploadProgress(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateTimeStr: string) => {
    return new Date(dateTimeStr).toLocaleString('zh-CN');
  };

  const getRegisteredCount = (activity: Activity) => {
    return activity.registrations.reduce((sum, r) => sum + r.children.length, 0);
  };

  return (
    <div className="admin-page">
      {showToast && (
        <Toast message={toastMessage} onClose={() => setShowToast(false)} />
      )}

      <div className="container">
        <h1 className="page-title">活动管理后台</h1>

        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            <Plus size={18} />
            创建活动
          </button>
          <button
            className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('list');
              loadActivities();
            }}
          >
            <Users size={18} />
            活动列表
          </button>
          <button
            className={`tab-btn ${activeTab === 'photos' ? 'active' : ''}`}
            onClick={() => setActiveTab('photos')}
          >
            <Image size={18} />
            照片上传
          </button>
        </div>

        {activeTab === 'create' && (
          <div className="tab-content">
            <form onSubmit={handleCreateActivity} className="create-form">
              <div className="form-section">
                <div className="form-group">
                  <label className="form-label">活动名称 *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="请输入活动名称"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      <Calendar size={16} /> 活动时间 *
                    </label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={dateTime}
                      onChange={(e) => setDateTime(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <MapPin size={16} /> 活动地点 *
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="请输入活动地点"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">适合年龄段 *</label>
                  <div className="checkbox-group">
                    {AGE_GROUPS.map((age) => (
                      <label key={age} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={ageGroups.includes(age)}
                        onChange={() => handleAgeGroupToggle(age)}
                      />
                      {age}
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Users size={16} /> 名额上限
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 20)}
                    min="1"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">活动描述 *</label>
                  <textarea
                    className="form-input"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="请输入活动描述"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">活动封面图 * (JPG/PNG，不超过5MB)</label>
                  <div className="cover-upload">
                    {coverPreview ? (
                      <div className="cover-preview">
                        <img src={coverPreview} alt="封面预览" />
                        <button
                          type="button"
                          className="remove-cover-btn"
                          onClick={() => {
                            setCoverImage(null);
                            setCoverPreview(null);
                          }}
                        >
                          <Trash2 size={16} />
                          移除
                        </button>
                      </div>
                    ) : (
                      <label className="upload-placeholder">
                        <Upload size={32} />
                        <span>点击上传封面图</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png"
                          onChange={handleCoverImageChange}
                          style={{ display: 'none' }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                <button type="submit" className="btn submit-btn" disabled={loading}>
                  {loading ? '创建中...' : '创建活动'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'list' && (
          <div className="tab-content">
            <div className="activity-list">
              {activities.length === 0 ? (
                <div className="empty-state">
                  <p>暂无活动，请先创建活动</p>
                </div>
              ) : (
                <div className="activity-selector">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className={`activity-item ${selectedActivity?.id === activity.id ? 'selected' : ''}`}
                      onClick={() => handleSelectActivity(activity)}
                    >
                      <div className="activity-item-cover">
                        <img src={activity.coverImage} alt={activity.name} />
                      </div>
                      <div className="activity-item-info">
                        <h3>{activity.name}</h3>
                        <p>{formatDateTime(activity.dateTime)}</p>
                        <p>{activity.location}</p>
                        <div className="activity-item-meta">
                          <span>
                          {activity.ageGroups.join(', ')
                        </span>
                          <span>
                          已报名 {getRegisteredCount(activity)}/{activity.maxParticipants}
                        </span>
                        </div>
                      </div>
                      <div className="activity-item-actions">
                        <button
                          className="btn btn-outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/checkin/${activity.id}`);
                          }}
                        >
                          <QrCode size={16} />
                          签到
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedActivity && (
                <div className="registrations-section">
                  <div className="section-header">
                    <h2>{selectedActivity.name} - 报名名单</h2>
                    <button className="btn btn-outline" onClick={handleExportCSV}>
                      <Download size={16} />
                      导出CSV
                    </button>
                  </div>

                  {registrations.length === 0 ? (
                    <p>暂无报名记录</p>
                  ) : (
                    <div className="table-container">
                      <table className="registrations-table">
                        <thead>
                          <tr>
                            <th>报名时间</th>
                            <th>家长姓名</th>
                            <th>联系电话</th>
                            <th>儿童名单</th>
                          </tr>
                        </thead>
                        <tbody>
                          {registrations.map((reg, index) => (
                            <tr key={reg.id} className={index % 2 === 1 ? 'alt-row' : ''}>
                              <td>{formatDateTime(reg.registeredAt)}</td>
                              <td>{reg.parentName}</td>
                              <td>{reg.phone}</td>
                              <td>
                                {reg.children.map((c) => `${c.name}(${c.age}岁)`).join('、')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="tab-content">
          {activities.length === 0 ? (
            <div className="empty-state">
              <p>暂无活动，请先创建活动</p>
            </div>
          ) : (
            <>
              <div className="activity-selector">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className={`activity-item ${selectedActivity?.id === activity.id ? 'selected' : ''}`}
                    onClick={() => handleSelectActivity(activity)}
                  >
                    <h3>{activity.name}</h3>
                    <p>{formatDateTime(activity.dateTime)}</p>
                  </div>
                ))}
              </div>

              {selectedActivity && (
                <div className="upload-section">
                  <h2>为 "{selectedActivity.name}" 上传照片</h2>
                  <p className="upload-hint">
                    支持 JPG/PNG/WebP 格式，单张不超过8MB，每次最多30张
                  </p>

                  <label className="photo-upload-area">
                    <Upload size={48} />
                    <p>点击或拖拽照片到此处上传</p>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoFilesChange}
                      style={{ display: 'none' }}
                    />
                  </label>

                  {photoFiles.length > 0 && (
                    <>
                    <div className="selected-photos">
                      <p>已选择 {photoFiles.length} 张照片</p>
                      {uploadProgress !== null && (
                        <div className="upload-progress">
                          <div className="progress-text">{uploadProgress}%</div>
                          <div className="progress-bar">
                            <div
                              className="progress-fill"
                              style={{ width: `${uploadProgress}% }}
                            />
                          </div>
                        </div>
                      )}
                      <button
                        className="btn"
                        onClick={handleUploadPhotos}
                        disabled={loading || uploadProgress !== null}
                      >
                        {loading ? '上传中...' : '开始上传'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
          </div>
        )}
      </div>
    </div>
  );
}
