import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animal,
  Application,
  Schedule,
  Volunteer,
  addAnimal,
  addSchedule,
  addVolunteer,
  deleteAnimal,
  getAnimals,
  getApplications,
  getSchedules,
  getVolunteers,
  updateApplicationStatus,
} from '../api';

const TIME_SLOTS = [
  '08:00-12:00',
  '12:00-16:00',
  '16:00-20:00',
  '20:00-24:00',
];

const DAYS = [
  { key: 'Mon', label: '周一' },
  { key: 'Tue', label: '周二' },
  { key: 'Wed', label: '周三' },
  { key: 'Thu', label: '周四' },
  { key: 'Fri', label: '周五' },
  { key: 'Sat', label: '周六' },
  { key: 'Sun', label: '周日' },
];

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function generateThumbnail(
  dataUrl: string,
  size = 150
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (size - w) / 2;
      const y = (size - h) / 2;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, x, y, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function SectionCard({
  title,
  icon,
  accentColor,
  children,
}: {
  title: string;
  icon: string;
  accentColor: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: '#ffffff',
        borderRadius: 16,
        padding: 28,
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
        marginBottom: 28,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: accentColor + '20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            color: accentColor,
          }}
        >
          {icon}
        </div>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            margin: 0,
            color: '#1f2937',
          }}
        >
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function ConflictTip({ show, onClose }: { show: boolean; onClose: () => void }) {
  if (!show) return null;
  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 200,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: '#ffffff',
        border: '2px solid #ef4444',
        color: '#b91c1c',
        padding: '16px 28px',
        borderRadius: 12,
        fontWeight: 600,
        boxShadow: '0 10px 40px rgba(239,68,68,0.2)',
        animation: 'fadeScaleIn 0.25s ease',
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes fadeScaleIn { from { opacity: 0; transform: translate(-50%,-50%) scale(0.8);} to { opacity:1; transform: translate(-50%,-50%) scale(1);} }
      `}</style>
      ⚠️ 该时段已有志愿者值班
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState<'animals' | 'applications' | 'schedule'>('animals');
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [conflictTip, setConflictTip] = useState(false);

  const [form, setForm] = useState({
    name: '',
    species: 'cat',
    breed: '',
    age: '',
    gender: '公',
    vaccinated: 'true',
    personality: '',
  });
  const [photoFile, setPhotoFile] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [volForm, setVolForm] = useState({
    name: '',
    phone: '',
    slots: [] as string[],
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [a, b, c, d] = await Promise.all([
        getAnimals(),
        getApplications(),
        getVolunteers(),
        getSchedules(),
      ]);
      setAnimals(a);
      setApplications(b);
      setVolunteers(c);
      setSchedules(d);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoName(file.name);
    const b64 = await fileToBase64(file);
    setPhotoFile(b64);
  };

  const handleAddAnimal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      let thumbnail: string | null = null;
      if (photoFile) {
        thumbnail = await generateThumbnail(photoFile, 150);
      }
      await addAnimal({
        ...form,
        photo: photoFile,
        thumbnail,
      } as any);
      setForm({
        name: '',
        species: 'cat',
        breed: '',
        age: '',
        gender: '公',
        vaccinated: 'true',
        personality: '',
      });
      setPhotoFile(null);
      setPhotoName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadAll();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAnimal = async (id: string) => {
    if (!confirm('确定删除此动物档案？')) return;
    await deleteAnimal(id);
    await loadAll();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await updateApplicationStatus(id, status);
    await loadAll();
  };

  const handleAddVolunteer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!volForm.name || !volForm.phone) return;
    await addVolunteer({
      name: volForm.name,
      phone: volForm.phone,
      availableSlots: volForm.slots,
    });
    setVolForm({ name: '', phone: '', slots: [] });
    await loadAll();
  };

  const toggleVolSlot = (slot: string) => {
    setVolForm((cur) => ({
      ...cur,
      slots: cur.slots.includes(slot)
        ? cur.slots.filter((s) => s !== slot)
        : [...cur.slots, slot],
    }));
  };

  const conflictMap = useMemo(() => {
    const map = new Map<string, number>();
    schedules.forEach((s) => {
      const key = `${s.day}-${s.timeSlot}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [schedules]);

  const handleCellClick = async (day: string, slot: string, volunteer: Volunteer) => {
    const key = `${day}-${slot}`;
    if ((conflictMap.get(key) || 0) >= 1) {
      const existing = schedules.find(
        (s) =>
          s.day === day &&
          s.timeSlot === slot &&
          s.volunteerId === volunteer._id
      );
      if (!existing) {
        setConflictTip(true);
        setTimeout(() => setConflictTip(false), 1800);
        return;
      }
    }
    const existing = schedules.find(
      (s) =>
        s.day === day &&
        s.timeSlot === slot &&
        s.volunteerId === volunteer._id
    );
    if (existing) {
      return;
    }
    await addSchedule({
      volunteerId: volunteer._id,
      volunteerName: volunteer.name,
      day,
      timeSlot: slot,
    });
    await loadAll();
  };

  const schedulesByKey = useMemo(() => {
    const m = new Map<string, Schedule[]>();
    schedules.forEach((s) => {
      const k = `${s.day}-${s.timeSlot}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(s);
    });
    return m;
  }, [schedules]);

  const inputStyle = (focused = false): React.CSSProperties => ({
    width: '100%',
    padding: '11px 14px',
    borderRadius: 12,
    border: `2px solid ${focused ? '#3b82f6' : '#e5e7eb'}`,
    fontSize: 14,
    outline: 'none',
    background: '#ffffff',
    color: '#1f2937',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
  });

  const tabBtn = (key: typeof tab, label: string, color: string) => (
    <button
      key={key}
      onClick={() => setTab(key)}
      style={{
        padding: '12px 22px',
        borderRadius: 14,
        border: 'none',
        fontWeight: 600,
        fontSize: 14,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        background: tab === key ? color : '#ffffff',
        color: tab === key ? '#ffffff' : '#4b5563',
        boxShadow: tab === key ? `0 4px 12px ${color}40` : 'none',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 80px 24px' }}>
      <style>{`
        @media (max-width: 768px) {
          .admin-tabs { flex-wrap: wrap; }
          .sched-table { overflow-x: auto; display: block; }
          .animal-list-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 800,
          margin: '0 0 24px 0',
          color: '#1f2937',
        }}
      >
        ⚙️ 管理后台
      </h1>
      <div
        className="admin-tabs"
        style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}
      >
        {tabBtn('animals', '🐾 动物档案管理', '#f97316')}
        {tabBtn('applications', '📋 领养申请处理', '#3b82f6')}
        {tabBtn('schedule', '📅 志愿者排班', '#34d399')}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#6b7280' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>加载中...
        </div>
      ) : (
        <>
          {tab === 'animals' && (
            <>
              <SectionCard title="添加动物档案" icon="➕" accentColor="#f97316">
                <form onSubmit={handleAddAnimal}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                      gap: 18,
                    }}
                  >
                    <div>
                      <label style={labelStyle}>名称</label>
                      <input
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="如：小橘"
                        style={inputStyle()}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>物种</label>
                      <select
                        value={form.species}
                        onChange={(e) => setForm({ ...form, species: e.target.value })}
                        style={inputStyle()}
                      >
                        <option value="cat">🐱 猫</option>
                        <option value="dog">🐶 狗</option>
                        <option value="other">🐾 其他</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>品种</label>
                      <input
                        required
                        value={form.breed}
                        onChange={(e) => setForm({ ...form, breed: e.target.value })}
                        placeholder="如：中华田园猫"
                        style={inputStyle()}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>年龄（岁）</label>
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.5"
                        value={form.age}
                        onChange={(e) => setForm({ ...form, age: e.target.value })}
                        placeholder="如：2"
                        style={inputStyle()}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>性别</label>
                      <select
                        value={form.gender}
                        onChange={(e) => setForm({ ...form, gender: e.target.value })}
                        style={inputStyle()}
                      >
                        <option value="公">公 ♂</option>
                        <option value="母">母 ♀</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>疫苗状态</label>
                      <select
                        value={form.vaccinated}
                        onChange={(e) => setForm({ ...form, vaccinated: e.target.value })}
                        style={inputStyle()}
                      >
                        <option value="true">✓ 已接种</option>
                        <option value="false">○ 待接种</option>
                      </select>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>性格描述</label>
                      <textarea
                        required
                        rows={3}
                        value={form.personality}
                        onChange={(e) => setForm({ ...form, personality: e.target.value })}
                        placeholder="请描述动物的性格特点、生活习惯等"
                        style={{ ...inputStyle(), resize: 'none' }}
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>上传照片（上传后自动生成150x150缩略图）</label>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 16,
                          flexWrap: 'wrap',
                        }}
                      >
                        <label
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '11px 20px',
                            borderRadius: 12,
                            background: '#eff6ff',
                            color: '#2563eb',
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: '2px dashed #93c5fd',
                            transition: 'all 0.3s ease',
                            fontSize: 14,
                          }}
                        >
                          📷 选择图片
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            style={{ display: 'none' }}
                          />
                        </label>
                        {photoName && (
                          <span style={{ color: '#6b7280', fontSize: 13 }}>{photoName}</span>
                        )}
                        {photoFile && (
                          <img
                            src={photoFile}
                            alt="预览"
                            style={{
                              width: 80,
                              height: 80,
                              objectFit: 'cover',
                              borderRadius: 12,
                              border: '2px solid #e5e7eb',
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 22, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        padding: '13px 32px',
                        borderRadius: 12,
                        border: 'none',
                        background: submitting ? '#9ca3af' : '#f97316',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: 15,
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {submitting ? '保存中...' : '✅ 保存档案'}
                    </button>
                  </div>
                </form>
              </SectionCard>

              <SectionCard title={`现有档案 (${animals.length})`} icon="📚" accentColor="#34d399">
                {animals.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                    暂无动物档案
                  </div>
                ) : (
                  <div
                    className="animal-list-grid"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                      gap: 16,
                    }}
                  >
                    {animals.map((a) => (
                      <div
                        key={a._id}
                        style={{
                          padding: 16,
                          borderRadius: 14,
                          border: '1px solid #e5e7eb',
                          display: 'flex',
                          gap: 14,
                          alignItems: 'center',
                          transition: 'all 0.3s ease',
                        }}
                      >
                        <div
                          style={{
                            width: 60,
                            height: 60,
                            borderRadius: 14,
                            overflow: 'hidden',
                            background:
                              a.species === 'cat'
                                ? 'linear-gradient(135deg,#fef3c7,#fde68a)'
                                : 'linear-gradient(135deg,#dbeafe,#bfdbfe)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {a.thumbnail ? (
                            <img
                              src={a.thumbnail}
                              alt={a.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <span style={{ fontSize: 30 }}>
                              {a.species === 'cat' ? '🐱' : a.species === 'dog' ? '🐶' : '🐾'}
                            </span>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: '#1f2937' }}>{a.name}</div>
                          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                            {a.breed} · {a.age}岁 · {a.gender}
                          </div>
                          <div
                            style={{
                              marginTop: 6,
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              background: a.vaccinated ? '#d1fae5' : '#fee2e2',
                              color: a.vaccinated ? '#065f46' : '#991b1b',
                              fontWeight: 600,
                            }}
                          >
                            {a.vaccinated ? '✓ 已接种' : '待接种'}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteAnimal(a._id)}
                          title="删除档案"
                          style={{
                            padding: '8px 10px',
                            borderRadius: 10,
                            border: 'none',
                            background: '#fef2f2',
                            color: '#dc2626',
                            cursor: 'pointer',
                            fontSize: 16,
                            transition: 'all 0.3s ease',
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </>
          )}

          {tab === 'applications' && (
            <SectionCard title={`领养申请列表 (${applications.length})`} icon="📋" accentColor="#3b82f6">
              {applications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
                  <div style={{ fontSize: 48, marginBottom: 10 }}>📭</div>
                  暂无领养申请
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'separate',
                      borderSpacing: 0,
                      minWidth: 700,
                    }}
                  >
                    <thead>
                      <tr>
                        {['时间', '申请动物', '申请人', '电话', '地址', '养宠经验', '状态', '操作'].map(
                          (h) => (
                            <th
                              key={h}
                              style={{
                                background: '#1e3a5f',
                                color: '#ffffff',
                                padding: '14px 16px',
                                textAlign: 'left',
                                fontWeight: 600,
                                fontSize: 13,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {applications.map((app, idx) => (
                        <tr
                          key={app._id}
                          style={{ background: idx % 2 === 0 ? '#ffffff' : '#f1f5f9' }}
                        >
                          <td style={cellStyle}>
                            {new Date(app.createdAt).toLocaleString('zh-CN')}
                          </td>
                          <td style={{ ...cellStyle, fontWeight: 600, color: '#f97316' }}>
                            {app.animalName}
                          </td>
                          <td style={cellStyle}>{app.applicantName}</td>
                          <td style={cellStyle}>{app.phone}</td>
                          <td style={{ ...cellStyle, maxWidth: 200 }}>{app.address}</td>
                          <td style={{ ...cellStyle, maxWidth: 220, fontSize: 12 }}>
                            <div
                              style={{
                                maxHeight: 52,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                              }}
                            >
                              {app.experience}
                            </div>
                          </td>
                          <td style={cellStyle}>
                            <StatusBadge status={app.status} />
                          </td>
                          <td style={cellStyle}>
                            <select
                              value={app.status}
                              onChange={(e) => handleStatusChange(app._id, e.target.value)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: 8,
                                border: '1px solid #d1d5db',
                                fontSize: 12,
                                background: '#ffffff',
                                cursor: 'pointer',
                              }}
                            >
                              <option value="pending">待处理</option>
                              <option value="approved">已通过</option>
                              <option value="rejected">已拒绝</option>
                              <option value="completed">已完成</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          )}

          {tab === 'schedule' && (
            <>
              <SectionCard title="添加志愿者" icon="🧑‍🤝‍🧑" accentColor="#34d399">
                <form onSubmit={handleAddVolunteer}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: 18,
                      alignItems: 'end',
                    }}
                  >
                    <div>
                      <label style={labelStyle}>姓名</label>
                      <input
                        required
                        value={volForm.name}
                        onChange={(e) => setVolForm({ ...volForm, name: e.target.value })}
                        placeholder="志愿者姓名"
                        style={inputStyle()}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>联系电话</label>
                      <input
                        required
                        value={volForm.phone}
                        onChange={(e) => setVolForm({ ...volForm, phone: e.target.value })}
                        placeholder="联系电话"
                        style={inputStyle()}
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>可服务时段（4小时为1区间，可多选）</label>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                        {TIME_SLOTS.map((s) => (
                          <button
                            type="button"
                            key={s}
                            onClick={() => toggleVolSlot(s)}
                            style={{
                              padding: '8px 16px',
                              borderRadius: 10,
                              border: `2px solid ${
                                volForm.slots.includes(s) ? '#34d399' : '#e5e7eb'
                              }`,
                              background: volForm.slots.includes(s) ? '#d1fae5' : '#ffffff',
                              color: volForm.slots.includes(s) ? '#065f46' : '#4b5563',
                              fontWeight: 600,
                              fontSize: 13,
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                            }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 22, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      style={{
                        padding: '12px 30px',
                        borderRadius: 12,
                        border: 'none',
                        background: '#34d399',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      ➕ 添加志愿者
                    </button>
                  </div>
                </form>
              </SectionCard>

              <SectionCard title="周视图排班表" icon="📅" accentColor="#8b5cf6">
                <p style={{ fontSize: 13, color: '#6b7280', margin: '-14px 0 18px 0' }}>
                  💡 点击空格子分配志愿者；<span style={{ color: '#dc2626', fontWeight: 600 }}>红色斜纹</span>
                  表示时段冲突
                </p>
                {volunteers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                    请先添加志愿者
                  </div>
                ) : (
                  <div className="sched-table">
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'separate',
                        borderSpacing: 0,
                        background: '#f8fafc',
                        borderRadius: 14,
                        overflow: 'hidden',
                        minWidth: 800,
                      }}
                    >
                      <thead>
                        <tr>
                          <th
                            style={{
                              background: '#1e3a5f',
                              color: '#ffffff',
                              padding: '14px 10px',
                              fontWeight: 600,
                              fontSize: 13,
                              width: 120,
                              textAlign: 'left',
                              position: 'sticky',
                              left: 0,
                              zIndex: 2,
                            }}
                          >
                            志愿者 \ 时段
                          </th>
                          {DAYS.map((d) => (
                            <th
                              key={d.key}
                              colSpan={TIME_SLOTS.length}
                              style={{
                                background: '#1e3a5f',
                                color: '#ffffff',
                                padding: '14px 10px',
                                fontWeight: 600,
                                fontSize: 14,
                                borderLeft: '1px solid rgba(255,255,255,0.1)',
                              }}
                            >
                              {d.label}
                            </th>
                          ))}
                        </tr>
                        <tr>
                          <th
                            style={{
                              background: '#274873',
                              color: '#ffffff',
                              padding: '8px 10px',
                              fontWeight: 500,
                              fontSize: 11,
                              position: 'sticky',
                              left: 0,
                              zIndex: 2,
                            }}
                          >
                          </th>
                          {DAYS.flatMap((d) =>
                            TIME_SLOTS.map((s) => (
                              <th
                                key={`${d.key}-${s}`}
                                style={{
                                  background: '#274873',
                                  color: '#cbd5e1',
                                  padding: '8px 6px',
                                  fontWeight: 500,
                                  fontSize: 11,
                                  borderLeft: '1px solid rgba(255,255,255,0.06)',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {s}
                              </th>
                            ))
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {volunteers.map((v, vi) => (
                          <tr
                            key={v._id}
                            style={{ background: vi % 2 === 0 ? '#ffffff' : '#f1f5f9' }}
                          >
                            <td
                              style={{
                                padding: '12px 10px',
                                fontWeight: 600,
                                color: '#1f2937',
                                borderBottom: '1px solid #e2e8f0',
                                position: 'sticky',
                                left: 0,
                                zIndex: 1,
                                background: 'inherit',
                                minWidth: 120,
                              }}
                            >
                              <div>{v.name}</div>
                              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                {v.phone}
                              </div>
                            </td>
                            {DAYS.flatMap((d) =>
                              TIME_SLOTS.map((s) => {
                                const key = `${d.key}-${s}`;
                                const cellList = schedulesByKey.get(key) || [];
                                const mine = cellList.find((x) => x.volunteerId === v._id);
                                const count = cellList.length;
                                const isConflict = count >= 2 || (count === 1 && !mine);
                                return (
                                  <td
                                    key={key}
                                    onClick={() => handleCellClick(d.key, s, v)}
                                    title={
                                      mine
                                        ? `${v.name} 值班`
                                        : isConflict
                                        ? '该时段已有志愿者值班（冲突）'
                                        : `点击安排 ${v.name} 值班`
                                    }
                                    style={{
                                      padding: '8px 6px',
                                      borderBottom: '1px solid #e2e8f0',
                                      borderLeft: '1px solid #e2e8f0',
                                      background: mine
                                        ? '#d1fae5'
                                        : isConflict
                                        ? 'repeating-linear-gradient(45deg, #fee2e2, #fee2e2 6px, #fecaca 6px, #fecaca 12px)'
                                        : 'transparent',
                                      cursor: 'pointer',
                                      textAlign: 'center',
                                      verticalAlign: 'middle',
                                      height: 52,
                                      transition: 'all 0.2s ease',
                                      fontSize: 12,
                                      fontWeight: mine ? 600 : 400,
                                      color: mine
                                        ? '#065f46'
                                        : isConflict
                                        ? '#b91c1c'
                                        : '#94a3b8',
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!mine)
                                        e.currentTarget.style.background = isConflict
                                          ? 'repeating-linear-gradient(45deg, #fecaca, #fecaca 6px, #fca5a5 6px, #fca5a5 12px)'
                                          : '#eff6ff';
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!mine)
                                        e.currentTarget.style.background = isConflict
                                          ? 'repeating-linear-gradient(45deg, #fee2e2, #fee2e2 6px, #fecaca 6px, #fecaca 12px)'
                                          : 'transparent';
                                    }}
                                  >
                                    {mine ? '✓ 值班' : isConflict ? '⛔ 冲突' : ''}
                                  </td>
                                );
                              })
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            </>
          )}
        </>
      )}
      <ConflictTip show={conflictTip} onClose={() => setConflictTip(false)} />
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#374151',
  fontWeight: 600,
  marginBottom: 6,
  display: 'block',
};

const cellStyle: React.CSSProperties = {
  padding: '14px 16px',
  borderBottom: '1px solid #e2e8f0',
  fontSize: 13,
  color: '#374151',
  verticalAlign: 'top',
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; text: string }> = {
    pending: { bg: '#fef3c7', color: '#92400e', text: '待处理' },
    approved: { bg: '#d1fae5', color: '#065f46', text: '已通过' },
    rejected: { bg: '#fee2e2', color: '#991b1b', text: '已拒绝' },
    completed: { bg: '#dbeafe', color: '#1e40af', text: '已完成' },
  };
  const cfg = map[status] || map.pending;
  return (
    <span
      style={{
        padding: '4px 12px',
        borderRadius: 20,
        background: cfg.bg,
        color: cfg.color,
        fontSize: 12,
        fontWeight: 600,
        display: 'inline-block',
      }}
    >
      {cfg.text}
    </span>
  );
}
