import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import ActivityCard from './components/ActivityCard';
import PhotoMasonry from './components/PhotoMasonry';
import type { Activity, Photo, Registration, ToastMessage, Child, ActivityCreateData } from './types';
import * as api from './api';

const baseFontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const AGE_GROUPS = ['2-4', '4-6', '6-8', '8-10', '10-12'];

const Toast: React.FC<{ toasts: ToastMessage[] }> = ({ toasts }) => {
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      fontFamily: baseFontFamily,
    }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            width: '280px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: '#4caf50',
            color: '#fff',
            fontSize: '0.9rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            animation: 'slideIn 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '18px' }}>✓</span>
          {toast.message}
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
};

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
    color: '#999',
    fontFamily: baseFontFamily,
  }}>
    <div style={{ fontSize: '72px', marginBottom: '20px' }}>📁❓</div>
    <div style={{ fontSize: '1.1rem' }}>{message}</div>
  </div>
);

const getButtonStyle = (color = '#66bb6a', hoverColor = '#43a047'): React.CSSProperties => ({
  background: color,
  color: '#fff',
  border: 'none',
  borderRadius: '20px',
  padding: '10px 24px',
  fontSize: '0.95rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 0.2s ease',
  fontFamily: baseFontFamily,
});

const pageContainerStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '20px',
  minHeight: '100vh',
  fontFamily: baseFontFamily,
};

function formatDateTime(dateTimeStr: string) {
  try {
    const dt = new Date(dateTimeStr);
    const date = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    const time = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
    return { date, time };
  } catch {
    return { date: dateTimeStr, time: '' };
  }
}

function formatCreatedAt(isoStr: string) {
  try {
    const dt = new Date(isoStr);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  } catch {
    return isoStr;
  }
}

const HoverButton: React.FC<{
  style?: React.CSSProperties;
  hoverColor?: string;
  baseColor?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  children: React.ReactNode;
}> = ({ style, hoverColor, baseColor, onClick, disabled, type = 'button', children }) => {
  const bg = baseColor || '#66bb6a';
  const hbg = hoverColor || '#43a047';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...getButtonStyle(bg, hbg),
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = hbg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = bg;
      }}
    >
      {children}
    </button>
  );
};

const CreateActivityModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onCreate: (data: ActivityCreateData, cover: File) => Promise<void>;
  showToast: (msg: string) => void;
}> = ({ open, onClose, onCreate, showToast }) => {
  const [name, setName] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [location, setLocation] = useState('');
  const [ageGroups, setAgeGroups] = useState<string[]>([]);
  const [capacity, setCapacity] = useState(20);
  const [description, setDescription] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setDateTime('');
      setLocation('');
      setAgeGroups([]);
      setCapacity(20);
      setDescription('');
      setCoverFile(null);
      setCoverPreview('');
    }
  }, [open]);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      showToast('封面图大小不能超过5MB');
      return;
    }
    if (!/image\/(jpeg|jpg|png)/.test(f.type)) {
      showToast('仅支持 JPG/PNG 格式');
      return;
    }
    setCoverFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setCoverPreview(ev.target?.result as string || '');
    reader.readAsDataURL(f);
  };

  const toggleAgeGroup = (ag: string) => {
    setAgeGroups((prev) =>
      prev.includes(ag) ? prev.filter((x) => x !== ag) : [...prev, ag]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim() || !dateTime || !location.trim() || ageGroups.length === 0 || !coverFile) {
      showToast('请填写完整信息并上传封面图');
      return;
    }
    try {
      setCreating(true);
      await onCreate(
        {
          name: name.trim(),
          dateTime: new Date(dateTime).toISOString(),
          location: location.trim(),
          ageGroups,
          capacity: Number(capacity) || 20,
          description: description.trim(),
        },
        coverFile
      );
      showToast('活动创建成功');
      onClose();
    } catch (err: any) {
      showToast(err.message || '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid #ddd',
    fontSize: '0.95rem',
    fontFamily: baseFontFamily,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '0.9rem',
    color: '#555',
    fontWeight: 500,
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px',
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '20px',
          padding: '32px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          fontFamily: baseFontFamily,
        }}
      >
        <h2 style={{ margin: '0 0 24px', fontSize: '1.5rem', color: '#333' }}>🎪 创建新活动</h2>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>活动名称 *</label>
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：周末亲子读书会" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>活动时间 *</label>
            <input
              type="datetime-local"
              style={inputStyle}
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>活动地点 *</label>
            <input style={inputStyle} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="例如：社区活动中心" />
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>适合年龄段 *（多选）</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
            {AGE_GROUPS.map((ag) => (
              <button
                key={ag}
                type="button"
                onClick={() => toggleAgeGroup(ag)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '12px',
                  border: ageGroups.includes(ag) ? '2px solid #66bb6a' : '2px solid #ddd',
                  background: ageGroups.includes(ag) ? '#e8f5e9' : '#fff',
                  color: ageGroups.includes(ag) ? '#2e7d32' : '#666',
                  cursor: 'pointer',
                  fontFamily: baseFontFamily,
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                }}
              >
                {ag}岁
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>名额上限（默认20人）</label>
          <input
            type="number"
            min={1}
            style={inputStyle}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>活动封面图 *（JPG/PNG，≤5MB）</label>
          <div style={{
            border: '2px dashed #ddd',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: '#fafafa',
            overflow: 'hidden',
          }}>
            {coverPreview ? (
              <img src={coverPreview} alt="" style={{ maxHeight: '160px', borderRadius: '8px', objectFit: 'cover' }} />
            ) : (
              <div style={{ color: '#999' }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>📷</div>
                <div>点击上传封面图</div>
              </div>
            )}
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              id="cover-input"
            />
          </div>
          <label htmlFor="cover-input" style={{ display: 'block', marginTop: '8px', textAlign: 'center', color: '#66bb6a', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
            选择文件
          </label>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>活动描述</label>
          <textarea
            style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="介绍活动的具体内容、流程、注意事项等..."
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px',
              borderRadius: '20px',
              border: '1px solid #ddd',
              background: '#fff',
              cursor: 'pointer',
              fontFamily: baseFontFamily,
              fontSize: '0.95rem',
              color: '#666',
            }}
          >
            取消
          </button>
          <HoverButton onClick={handleSubmit} disabled={creating}>
            {creating ? '创建中...' : '✓ 创建活动'}
          </HoverButton>
        </div>
      </div>
    </div>
  );
};

const HomePage: React.FC<{
  activities: Activity[];
  registrationsMap: Record<string, Registration[]>;
  showToast: (msg: string) => void;
  onCreateActivity: (data: ActivityCreateData, cover: File) => Promise<void>;
  loadActivities: () => Promise<void>;
}> = ({ activities, registrationsMap, showToast, onCreateActivity, loadActivities }) => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [ageFilter, setAgeFilter] = useState<string>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const filtered = useMemo(() => {
    let result = [...activities];
    if (keyword.trim()) {
      const kw = keyword.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(kw) ||
          a.location.toLowerCase().includes(kw) ||
          a.description.toLowerCase().includes(kw)
      );
    }
    if (startDate) {
      const start = new Date(startDate).getTime();
      result = result.filter((a) => new Date(a.dateTime).getTime() >= start);
    }
    if (endDate) {
      const end = new Date(endDate + 'T23:59:59').getTime();
      result = result.filter((a) => new Date(a.dateTime).getTime() <= end);
    }
    if (ageFilter) {
      result = result.filter((a) => a.ageGroups.includes(ageFilter));
    }
    return result;
  }, [activities, keyword, startDate, endDate, ageFilter]);

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: windowWidth < 768 ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '24px',
    justifyItems: 'center',
    marginTop: '32px',
  };

  const searchBoxStyle: React.CSSProperties = {
    width: windowWidth < 768 ? '95%' : '50%',
    minWidth: windowWidth < 768 ? 'auto' : '320px',
    padding: '12px 20px',
    borderRadius: '24px',
    border: '2px solid transparent',
    background: '#f0f0f0',
    fontSize: '1rem',
    outline: 'none',
    fontFamily: baseFontFamily,
    transition: 'border 0.2s ease',
  };

  return (
    <div style={{ ...pageContainerStyle, background: '#fafafa' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <h1 style={{ margin: 0, color: '#333', fontSize: '1.8rem' }}>🎪 亲子活动平台</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <HoverButton onClick={() => setCreateOpen(true)}>
            + 创建活动
          </HoverButton>
          <Link to="/admin" style={{ textDecoration: 'none' }}>
            <HoverButton baseColor="#ffb74d" hoverColor="#ffa726">
              ⚙ 后台管理
            </HoverButton>
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="🔍 搜索活动名称、地点..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={searchBoxStyle}
          onFocus={(e) => (e.currentTarget.style.border = '2px solid #42a5f5')}
          onBlur={(e) => (e.currentTarget.style.border = '2px solid transparent')}
        />
      </div>

      <div style={{
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: '16px',
        padding: '16px',
        background: '#fff',
        borderRadius: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '0.9rem', color: '#666' }}>开始日期:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              fontFamily: baseFontFamily,
              fontSize: '0.9rem',
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '0.9rem', color: '#666' }}>结束日期:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              fontFamily: baseFontFamily,
              fontSize: '0.9rem',
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '0.9rem', color: '#666' }}>年龄段:</label>
          <select
            value={ageFilter}
            onChange={(e) => setAgeFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              fontFamily: baseFontFamily,
              fontSize: '0.9rem',
              background: '#fff',
            }}
          >
            <option value="">全部</option>
            {AGE_GROUPS.map((ag) => (
              <option key={ag} value={ag}>{ag}岁</option>
            ))}
          </select>
        </div>
        {(startDate || endDate || ageFilter || keyword) && (
          <button
            onClick={() => {
              setKeyword('');
              setStartDate('');
              setEndDate('');
              setAgeFilter('');
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '12px',
              border: '1px solid #ddd',
              background: '#fff',
              cursor: 'pointer',
              fontFamily: baseFontFamily,
              fontSize: '0.9rem',
              color: '#666',
            }}
          >
            清除筛选
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="没有找到匹配的活动" />
      ) : (
        <div style={gridStyle}>
          {filtered.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              registrations={registrationsMap[activity.id]}
              onClick={() => navigate(`/activity/${activity.id}`)}
            />
          ))}
        </div>
      )}

      <CreateActivityModal
        open={createOpen}
        onClose={setCreateOpen.bind(null, false)}
        onCreate={async (d, f) => {
          await onCreateActivity(d, f);
          await loadActivities();
        }}
        showToast={showToast}
      />
    </div>
  );
};

const ActivityDetailPage: React.FC<{
  activities: Activity[];
  registrationsMap: Record<string, Registration[]>;
  photosMap: Record<string, Photo[]>;
  showToast: (msg: string) => void;
  loadActivityData: (id: string) => Promise<void>;
  loadAllData: () => Promise<void>;
}> = ({ activities, registrationsMap, photosMap, showToast, loadActivityData, loadAllData }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const activity = activities.find((a) => a.id === id);
  const actPhotos = photosMap[id!] || [];
  const actRegs = registrationsMap[id!] || [];
  const registeredCount = actRegs.length;
  const isFull = activity ? registeredCount >= activity.capacity : false;

  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');
  const [children, setChildren] = useState<{ name: string; age: string }[]>([{ name: '', age: '' }]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) loadActivityData(id);
  }, [id]);

  if (!activity) {
    return (
      <div style={pageContainerStyle}>
        <EmptyState message="活动不存在" />
      </div>
    );
  }

  const { date, time } = formatDateTime(activity.dateTime);
  const favoriteCount = actPhotos.filter((p) => p.favorite).length;

  const handleAddChild = () => {
    if (children.length < 2) setChildren([...children, { name: '', age: '' }]);
  };

  const handleRemoveChild = (idx: number) => {
    setChildren(children.filter((_, i) => i !== idx));
  };

  const handleChildChange = (idx: number, field: 'name' | 'age', value: string) => {
    const newChildren = [...children];
    newChildren[idx][field] = value;
    setChildren(newChildren);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentName.trim() || !phone.trim()) {
      showToast('请填写完整信息');
      return;
    }
    const validChildren = children.filter((c) => c.name.trim() && c.age.trim());
    if (validChildren.length === 0) {
      showToast('请至少填写一个儿童信息');
      return;
    }
    const invalidAge = validChildren.some((c) => Number(c.age) < 1 || Number(c.age) > 12);
    if (invalidAge) {
      showToast('儿童年龄必须在1-12岁之间');
      return;
    }
    if (isFull) {
      showToast('活动已满，无法报名');
      return;
    }
    try {
      setSubmitting(true);
      await api.registerActivity(id!, {
        parentName: parentName.trim(),
        phone: phone.trim(),
        children: validChildren.map((c): Child => ({ name: c.name.trim(), age: Number(c.age) })),
      });
      setParentName('');
      setPhone('');
      setChildren([{ name: '', age: '' }]);
      showToast('报名成功！');
      await loadActivityData(id!);
    } catch (err: any) {
      showToast(err.message || '报名失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (files.length > 30) {
      showToast('单次最多上传30张照片');
      return;
    }
    for (const f of Array.from(files)) {
      if (f.size > 8 * 1024 * 1024) {
        showToast('单张照片大小不能超过8MB');
        return;
      }
    }
    setIsUploading(true);
    setUploadProgress(0);
    api.uploadPhotos(
      id!,
      Array.from(files),
      (p) => setUploadProgress(p.percent)
    )
      .then(async () => {
        setUploadProgress(100);
        showToast(`成功上传 ${files.length} 张照片`);
        await loadActivityData(id!);
      })
      .catch((err) => {
        showToast(err.message || '上传失败');
      })
      .finally(() => {
        setIsUploading(false);
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
      });
  };

  const handleToggleFavorite = async (photoId: string) => {
    try {
      await api.togglePhotoFavorite(id!, photoId);
      await loadActivityData(id!);
    } catch (err: any) {
      showToast(err.message || '操作失败');
    }
  };

  const handleExportCSV = async () => {
    try {
      await api.exportRegistrationsCSV(id!);
      showToast('CSV导出成功');
    } catch (err: any) {
      showToast(err.message || '导出失败');
    }
  };

  const defaultCover =
    'data:image/svg+xml;charset=UTF-8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="0 0 600 300"><rect fill="#c8e6c9" width="600" height="300"/><text x="300" y="160" font-family="sans-serif" font-size="72" fill="#66bb6a" text-anchor="middle" dominant-baseline="central">🎪</text></svg>'
    );

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid #ddd',
    fontSize: '0.95rem',
    fontFamily: baseFontFamily,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const sectionStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '0.9rem',
    color: '#555',
    fontWeight: 500,
  };

  return (
    <div style={{ ...pageContainerStyle, background: '#fafafa' }}>
      <HoverButton
        baseColor="#90a4ae"
        hoverColor="#78909c"
        onClick={() => navigate('/')}
        style={{ marginBottom: '16px' }}
      >
        ← 返回首页
      </HoverButton>

      <div style={{
        width: '100%',
        height: '300px',
        borderRadius: '16px',
        overflow: 'hidden',
        marginBottom: '24px',
      }}>
        <img
          src={activity.coverImage || defaultCover}
          alt={activity.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => ((e.currentTarget as HTMLImageElement).src = defaultCover)}
        />
      </div>

      <div style={sectionStyle}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', color: '#333' }}>{activity.name}</h1>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
              {activity.ageGroups.map((ag) => (
                <span key={ag} style={{
                  background: '#81c784',
                  color: '#fff',
                  padding: '4px 12px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}>
                  {ag}岁
                </span>
              ))}
              <span style={{
                background: '#ffb74d',
                color: '#fff',
                padding: '4px 12px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}>
                👥 {registeredCount}/{activity.capacity}人
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.95rem', color: '#666' }}>📅 {date}</div>
            {time && <div style={{ fontSize: '0.95rem', color: '#666' }}>⏰ {time}</div>}
            <div style={{ fontSize: '0.95rem', color: '#666', marginTop: '4px' }}>📍 {activity.location}</div>
          </div>
        </div>
        {activity.description && (
          <p style={{ marginTop: '16px', color: '#555', lineHeight: 1.8, fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
            {activity.description}
          </p>
        )}
      </div>

      {!isFull ? (
        <div style={sectionStyle}>
          <h2 style={{ margin: 0, marginBottom: '20px', fontSize: '1.3rem', color: '#333' }}>📝 活动报名</h2>
          <form onSubmit={handleSubmit}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '16px',
            }}>
              <div>
                <label style={labelStyle}>家长姓名</label>
                <input
                  style={inputStyle}
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="请输入家长姓名"
                />
              </div>
              <div>
                <label style={labelStyle}>联系电话</label>
                <input
                  style={inputStyle}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="请输入联系电话"
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ ...labelStyle, fontSize: '1rem' }}>儿童信息（最多2名）</label>
              {children.map((child, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr auto',
                    gap: '12px',
                    marginTop: '10px',
                  }}
                >
                  <div>
                    <input
                      style={inputStyle}
                      placeholder={`儿童${idx + 1}姓名`}
                      value={child.name}
                      onChange={(e) => handleChildChange(idx, 'name', e.target.value)}
                    />
                  </div>
                  <div>
                    <input
                      style={inputStyle}
                      type="number"
                      min={1}
                      max={12}
                      placeholder="年龄1-12"
                      value={child.age}
                      onChange={(e) => handleChildChange(idx, 'age', e.target.value)}
                    />
                  </div>
                  {children.length > 1 && (
                    <HoverButton
                      baseColor="#ef5350"
                      hoverColor="#e53935"
                      type="button"
                      onClick={() => handleRemoveChild(idx)}
                      style={{ padding: '8px 16px' }}
                    >
                      删除
                    </HoverButton>
                  )}
                </div>
              ))}
              {children.length < 2 && (
                <button
                  type="button"
                  onClick={handleAddChild}
                  style={{
                    marginTop: '12px',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    border: '2px dashed #66bb6a',
                    background: '#fff',
                    color: '#66bb6a',
                    cursor: 'pointer',
                    fontFamily: baseFontFamily,
                    fontWeight: 600,
                  }}
                >
                  + 添加儿童
                </button>
              )}
            </div>

            <HoverButton type="submit" disabled={submitting}>
              {submitting ? '提交中...' : '提交报名'}
            </HoverButton>
          </form>
        </div>
      ) : (
        <div style={{ ...sectionStyle, textAlign: 'center' }}>
          <div style={{ fontSize: '48px' }}>😢</div>
          <p style={{ color: '#f44336', fontSize: '1.1rem', fontWeight: 600 }}>该活动已满员，暂时无法报名</p>
        </div>
      )}

      <div style={sectionStyle}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#333' }}>👨‍👩‍👧 报名名单 ({actRegs.length}人)</h2>
          {actRegs.length > 0 && (
            <HoverButton baseColor="#42a5f5" hoverColor="#1e88e5" onClick={handleExportCSV} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              📥 导出 CSV
            </HoverButton>
          )}
        </div>
        {actRegs.length === 0 ? (
          <EmptyState message="暂无报名记录" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#555' }}>报名时间</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#555' }}>家长姓名</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#555' }}>联系电话</th>
                  <th style={{ padding: