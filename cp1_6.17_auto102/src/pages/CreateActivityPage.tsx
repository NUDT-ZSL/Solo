import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, FileText, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../utils/api';

const CreateActivityPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const doSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('请输入活动名称');
    if (!date) return setError('请选择活动日期');
    if (!location.trim()) return setError('请输入活动地点');
    if (location.trim().length > 200) return setError(`地点不能超过200字符（当前${location.trim().length}）`);
    if (!description.trim()) return setError('请输入活动说明');

    setSubmitting(true);
    try {
      const a = await api.post<any>('/activities', {
        name: name.trim(),
        date: new Date(date).toISOString(),
        location: location.trim(),
        description,
      });
      setSuccess(true);
      setTimeout(() => navigate(`/activity/${a.id}`), 1200);
    } catch (e: any) {
      setError(e?.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#212121', marginBottom: 6 }}>创建读书会活动</h1>
      <p style={{ fontSize: 14, color: '#757575', marginBottom: 28 }}>
        填写活动信息，发布后会出现在首页活动列表中
      </p>

      {success ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <CheckCircle size={56} color="#66BB6A" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#212121', marginBottom: 8 }}>活动创建成功！</h2>
          <p style={{ fontSize: 14, color: '#757575' }}>正在跳转到活动详情页...</p>
        </div>
      ) : (
        <form className="card" style={{ padding: 32 }} onSubmit={doSubmit}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <FileText size={14} color="#1976D2" /> 活动名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：《百年孤独》深度共读会"
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={14} color="#1976D2" /> 活动日期
            </label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={14} color="#1976D2" /> 活动地点
              </span>
              <span style={{ fontSize: 11, fontWeight: 400, color: '#9E9E9E' }}>{location.length}/200</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="例如：墨香书屋·二楼阅读区"
              maxLength={200}
              style={{
                borderColor: location.length > 200 ? '#FF5252' : undefined,
              }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">活动说明（支持换行）</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请详细描述本次读书会的主题、阅读书目、环节安排等信息..."
              rows={8}
              style={{ minHeight: 180 }}
            />
          </div>

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 12px',
              backgroundColor: '#FFEBEE',
              color: '#C62828',
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 20,
            }}>
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(-1)}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Send size={14} /> {submitting ? '提交中...' : '发布活动'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CreateActivityPage;
