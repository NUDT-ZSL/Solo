import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

interface StarInput {
  id: string;
  name: string;
  constellation: string;
  magnitude: string;
  observationMethod: string;
}

const WEATHER_OPTIONS = ['晴朗', '多云', '有云', '有月光'] as const;
const WEATHER_COLORS: Record<string, string> = {
  '晴朗': '#e3f2fd',
  '多云': '#cfd8dc',
  '有云': '#b0bec5',
  '有月光': '#fff3e0',
};
const WEATHER_TEXT_COLORS: Record<string, string> = {
  '晴朗': '#0d47a1',
  '多云': '#37474f',
  '有云': '#263238',
  '有月光': '#e65100',
};

const OBSERVATION_METHODS = ['肉眼', '双筒望远镜', '天文望远镜'];

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export default function NewRecordPage() {
  const navigate = useNavigate();

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [weather, setWeather] = useState<typeof WEATHER_OPTIONS[number]>('晴朗');
  const [photos, setPhotos] = useState<string[]>([]);
  const [stars, setStars] = useState<StarInput[]>([
    { id: genId(), name: '', constellation: '', magnitude: '', observationMethod: '肉眼' }
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  function getGeolocation() {
    if (!navigator.geolocation) {
      alert('浏览器不支持地理位置获取');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(4));
        setLongitude(pos.coords.longitude.toFixed(4));
        setGettingLocation(false);
      },
      (err) => {
        console.warn('获取地理位置失败:', err.message);
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const remaining = 3 - photos.length;
    const toAdd = Array.from(files).slice(0, remaining);
    toAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotos((prev) => prev.length < 3 ? [...prev, reader.result as string] : prev);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  function addStar() {
    setStars((prev) => [...prev, { id: genId(), name: '', constellation: '', magnitude: '', observationMethod: '肉眼' }]);
  }

  function removeStar(id: string) {
    setStars((prev) => prev.length > 1 ? prev.filter((s) => s.id !== id) : prev);
  }

  function updateStar(id: string, field: keyof StarInput, value: string) {
    setStars((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }

  function validate(): string[] {
    const errs: string[] = [];
    if (!date) errs.push('请填写观测日期');
    if (!locationName.trim()) errs.push('请填写观测地点名称');
    if (latitude && isNaN(parseFloat(latitude))) errs.push('纬度格式不正确');
    if (longitude && isNaN(parseFloat(longitude))) errs.push('经度格式不正确');

    stars.forEach((s, idx) => {
      if (!s.name.trim()) errs.push(`第 ${idx + 1} 颗星星未填写名称`);
      if (!s.constellation.trim()) errs.push(`第 ${idx + 1} 颗星星未填写星座`);
      if (s.magnitude !== '') {
        const m = parseFloat(s.magnitude);
        if (isNaN(m) || m < -1.46 || m > 6.0) {
          errs.push(`第 ${idx + 1} 颗星星的视星等需在 -1.46 到 6.0 之间`);
        }
      }
    });
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setSubmitting(true);

    const payload = {
      date,
      location: {
        name: locationName.trim(),
        latitude: latitude ? parseFloat(latitude) : 0,
        longitude: longitude ? parseFloat(longitude) : 0,
      },
      weather,
      photos,
      stars: stars.map((s) => ({
        id: s.id,
        name: s.name.trim(),
        constellation: s.constellation.trim(),
        magnitude: parseFloat(s.magnitude || '3.0'),
        observationMethod: s.observationMethod,
      })),
    };

    try {
      const res = await fetch('/api/stars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      navigate(`/detail/${data.id}`);
    } catch {
      setErrors(['保存失败，请检查服务器是否正常运行']);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/')} style={{
            background: '#1b2838', color: '#90caf9', border: 'none', borderRadius: '8px',
            padding: '10px 16px', fontSize: '14px'
          }}>
            ← 返回
          </button>
          <h1 style={{ color: '#90caf9', fontSize: '24px', fontWeight: 700 }}>
            🔭 新建观测记录
          </h1>
        </div>

        {errors.length > 0 && (
          <div style={{
            background: 'rgba(239,83,80,0.15)', border: '1px solid rgba(239,83,80,0.3)',
            borderRadius: '12px', padding: '16px', marginBottom: '20px'
          }}>
            {errors.map((err, i) => (
              <div key={i} style={{ color: '#ef5350', fontSize: '13px', lineHeight: 1.8 }}>
                · {err}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{
            borderRadius: '16px', padding: '24px', marginBottom: '20px',
            background: WEATHER_COLORS[weather],
            border: `2px solid ${WEATHER_COLORS[weather]}`,
            transition: 'background 0.3s ease',
            color: WEATHER_TEXT_COLORS[weather]
          }}>
            <div style={{
              display: 'inline-block', padding: '6px 14px', borderRadius: '20px',
              background: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600,
              marginBottom: '16px'
            }}>
              天气预览卡片
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>
              {date || 'YYYY年MM月DD日'}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.85 }}>
              📍 {locationName || '观测地点'} · {weather}
            </div>
          </div>

          <div style={{
            background: '#1b2838', borderRadius: '16px', padding: '24px',
            marginBottom: '20px', border: '0.5px solid #2a3f54'
          }}>
            <h2 style={{ color: '#90caf9', fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>
              📅 基本信息
            </h2>

            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#90caf9', marginBottom: '6px', fontWeight: 500 }}>
                  观测日期 *
                </label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{
                  width: '100%', padding: '10px 14px', borderRadius: '8px',
                  background: '#0d1b2a', border: '0.5px solid #2a3f54', color: '#e0e0e0',
                  fontSize: '14px', outline: 'none'
                }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#90caf9', marginBottom: '6px', fontWeight: 500 }}>
                  天气状况 *
                </label>
                <select value={weather} onChange={(e) => setWeather(e.target.value as any)} style={{
                  width: '100%', padding: '10px 14px', borderRadius: '8px',
                  background: '#0d1b2a', border: '0.5px solid #2a3f54', color: '#e0e0e0',
                  fontSize: '14px', outline: 'none', cursor: 'pointer'
                }}>
                  {WEATHER_OPTIONS.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#90caf9', marginBottom: '6px', fontWeight: 500 }}>
                观测地点名称 *
              </label>
              <input type="text" value={locationName} onChange={(e) => setLocationName(e.target.value)}
                placeholder="如：北京密云天文台"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '8px',
                  background: '#0d1b2a', border: '0.5px solid #2a3f54', color: '#e0e0e0',
                  fontSize: '14px', outline: 'none'
                }} />
            </div>

            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr 1fr auto', marginTop: '16px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#90caf9', marginBottom: '6px', fontWeight: 500 }}>
                  纬度
                </label>
                <input type="number" step="0.0001" value={latitude} onChange={(e) => setLatitude(e.target.value)}
                  placeholder="如：40.3828"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '8px',
                    background: '#0d1b2a', border: '0.5px solid #2a3f54', color: '#e0e0e0',
                    fontSize: '14px', outline: 'none'
                  }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#90caf9', marginBottom: '6px', fontWeight: 500 }}>
                  经度
                </label>
                <input type="number" step="0.0001" value={longitude} onChange={(e) => setLongitude(e.target.value)}
                  placeholder="如：116.8711"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '8px',
                    background: '#0d1b2a', border: '0.5px solid #2a3f54', color: '#e0e0e0',
                    fontSize: '14px', outline: 'none'
                  }} />
              </div>
              <button type="button" onClick={getGeolocation} disabled={gettingLocation} style={{
                background: '#1565c0', color: 'white', border: 'none', borderRadius: '8px',
                padding: '10px 16px', fontSize: '13px', whiteSpace: 'nowrap',
                opacity: gettingLocation ? 0.6 : 1
              }}>
                {gettingLocation ? '获取中...' : '📍 自动获取'}
              </button>
            </div>
          </div>

          <div style={{
            background: '#1b2838', borderRadius: '16px', padding: '24px',
            marginBottom: '20px', border: '0.5px solid #2a3f54'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: '#90caf9', fontSize: '16px', fontWeight: 600 }}>
                📷 观测照片 (最多3张)
              </h2>
              <span style={{ fontSize: '12px', color: '#78909c' }}>{photos.length}/3</span>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {photos.map((photo, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <img src={photo} alt={`照片 ${idx + 1}`} style={{
                    width: '120px', height: '120px', objectFit: 'cover', borderRadius: '10px',
                    border: '2px solid rgba(144,202,249,0.3)'
                  }} />
                  <button type="button" onClick={() => removePhoto(idx)} style={{
                    position: 'absolute', top: '-6px', right: '-6px', width: '22px', height: '22px',
                    borderRadius: '50%', background: '#ef5350', color: 'white', border: 'none',
                    fontSize: '14px', cursor: 'pointer', lineHeight: 1
                  }}>×</button>
                </div>
              ))}
              {photos.length < 3 && (
                <label style={{
                  width: '120px', height: '120px', borderRadius: '10px',
                  border: '2px dashed #2a3f54', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  color: '#78909c', fontSize: '12px', gap: '4px',
                  transition: 'all 0.2s'
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#1565c0';
                    e.currentTarget.style.color = '#90caf9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#2a3f54';
                    e.currentTarget.style.color = '#78909c';
                  }}>
                  <span style={{ fontSize: '28px' }}>+</span>
                  <span>添加照片</span>
                  <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} style={{ display: 'none' }} />
                </label>
              )}
            </div>
          </div>

          <div style={{
            background: '#1b2838', borderRadius: '16px', padding: '24px',
            marginBottom: '28px', border: '0.5px solid #2a3f54'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: '#90caf9', fontSize: '16px', fontWeight: 600 }}>
                ⭐ 观测星星列表
              </h2>
              <button type="button" onClick={addStar} style={{
                background: 'rgba(21,101,192,0.2)', color: '#90caf9', border: '1px solid rgba(21,101,192,0.4)',
                borderRadius: '8px', padding: '6px 14px', fontSize: '13px'
              }}>
                + 添加星星
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stars.map((star, idx) => (
                <div key={star.id} style={{
                  background: '#0d1b2a', borderRadius: '12px', padding: '16px',
                  border: '0.5px solid #1a2d42', position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute', top: '-10px', left: '14px',
                    background: '#7c4dff', color: 'white', padding: '2px 10px',
                    borderRadius: '10px', fontSize: '11px', fontWeight: 600
                  }}>
                    #{idx + 1}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 1fr auto', gap: '10px', marginTop: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#78909c', marginBottom: '4px' }}>名称 *</label>
                      <input type="text" value={star.name} onChange={(e) => updateStar(star.id, 'name', e.target.value)}
                        placeholder="如：天狼星" style={{
                          width: '100%', padding: '8px 10px', borderRadius: '6px',
                          background: '#1b2838', border: '0.5px solid #2a3f54', color: '#e0e0e0',
                          fontSize: '13px', outline: 'none'
                        }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#78909c', marginBottom: '4px' }}>星座 *</label>
                      <input type="text" value={star.constellation} onChange={(e) => updateStar(star.id, 'constellation', e.target.value)}
                        placeholder="如：大犬座" style={{
                          width: '100%', padding: '8px 10px', borderRadius: '6px',
                          background: '#1b2838', border: '0.5px solid #2a3f54', color: '#e0e0e0',
                          fontSize: '13px', outline: 'none'
                        }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#78909c', marginBottom: '4px' }}>视星等</label>
                      <input type="number" step="0.01" min="-1.46" max="6.0"
                        value={star.magnitude} onChange={(e) => updateStar(star.id, 'magnitude', e.target.value)}
                        placeholder="-1.46~6.0" style={{
                          width: '100%', padding: '8px 10px', borderRadius: '6px',
                          background: '#1b2838', border: '0.5px solid #2a3f54', color: '#e0e0e0',
                          fontSize: '13px', outline: 'none'
                        }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#78909c', marginBottom: '4px' }}>观测方式</label>
                      <select value={star.observationMethod} onChange={(e) => updateStar(star.id, 'observationMethod', e.target.value)} style={{
                        width: '100%', padding: '8px 10px', borderRadius: '6px',
                        background: '#1b2838', border: '0.5px solid #2a3f54', color: '#e0e0e0',
                        fontSize: '13px', outline: 'none', cursor: 'pointer'
                      }}>
                        {OBSERVATION_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button type="button" onClick={() => removeStar(star.id)} disabled={stars.length === 1}
                        style={{
                          width: '32px', height: '32px', borderRadius: '6px',
                          background: stars.length === 1 ? 'rgba(239,83,80,0.1)' : 'rgba(239,83,80,0.2)',
                          color: stars.length === 1 ? '#546e7a' : '#ef5350',
                          border: 'none', fontSize: '16px', cursor: stars.length === 1 ? 'not-allowed' : 'pointer'
                        }} title="删除">
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Link to="/" style={{
              padding: '12px 28px', borderRadius: '8px', fontSize: '14px',
              background: 'transparent', color: '#90caf9', border: '1px solid #2a3f54',
              textDecoration: 'none'
            }}>
              取消
            </Link>
            <button type="submit" disabled={submitting} style={{
              padding: '12px 32px', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
              background: '#1565c0', color: 'white', border: 'none',
              opacity: submitting ? 0.6 : 1,
              boxShadow: '0 4px 12px rgba(21,101,192,0.3)'
            }}
              onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.background = '#1976d2'; }}
              onMouseLeave={(e) => { if (!submitting) e.currentTarget.style.background = '#1565c0'; }}>
              {submitting ? '保存中...' : '💾 保存记录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
