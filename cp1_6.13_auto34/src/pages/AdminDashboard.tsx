import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../App';
import { api, CourseType, Coach, Course, Booking } from '../utils/api';

type TabKey = 'overview' | 'courseTypes' | 'coaches' | 'courses' | 'bookings';

const NAV_ITEMS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'overview', label: '数据概览', icon: '📊' },
  { key: 'courseTypes', label: '课程类型', icon: '🏷️' },
  { key: 'coaches', label: '教练管理', icon: '👨‍🏫' },
  { key: 'courses', label: '课程排期', icon: '📅' },
  { key: 'bookings', label: '预约记录', icon: '📋' }
];

const DEFAULT_COLORS = ['#e9d5ff', '#fed7aa', '#fecaca', '#bfdbfe', '#bbf7d0', '#fde68a', '#fce7f3', '#ddd6fe'];

function Toast({ type, message }: { type: 'success' | 'error'; message: string }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 80,
        right: 24,
        padding: '14px 24px',
        borderRadius: 12,
        background: type === 'success' ? '#10b981' : '#ef4444',
        color: 'white',
        fontWeight: 600,
        zIndex: 99999,
        boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
        animation: 'slideInRight 0.3s ease'
      }}
    >
      {message}
      <style>{`@keyframes slideInRight { from { transform: translateX(120%); opacity:0; } to { transform: translateX(0); opacity:1; } }`}</style>
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  showInput = false,
  inputPlaceholder = '',
  confirmText = '确认'
}: {
  title: string;
  message: string;
  onConfirm: (val?: string) => void;
  onCancel: () => void;
  showInput?: boolean;
  inputPlaceholder?: string;
  confirmText?: string;
}) {
  const [val, setVal] = useState('');
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 16,
          padding: 28,
          width: '100%',
          maxWidth: 420
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10, color: '#1f2937' }}>{title}</h3>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>{message}</p>
        {showInput && (
          <textarea
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder={inputPlaceholder}
            style={{ width: '100%', minHeight: 80, marginBottom: 20, resize: 'vertical' }}
          />
        )}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '11px 18px',
              borderRadius: 10,
              background: '#f3f4f6',
              color: '#374151',
              fontWeight: 700
            }}
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(val)}
            style={{
              flex: 1,
              padding: '11px 18px',
              borderRadius: 10,
              background: '#dc2626',
              color: 'white',
              fontWeight: 700
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function CourseTypeEditor({
  initial,
  onSave,
  onCancel
}: {
  initial?: CourseType;
  onSave: (data: Partial<CourseType>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [color, setColor] = useState(initial?.color || DEFAULT_COLORS[0]);
  const [duration, setDuration] = useState(initial?.duration || 60);

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 16,
          padding: 28,
          width: '100%',
          maxWidth: 420
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, color: '#1f2937' }}>
          {initial ? '编辑课程类型' : '新增课程类型'}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
              课程名称
            </label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：瑜伽" style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
              卡片颜色
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {DEFAULT_COLORS.map((c) => (
                <div
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: c,
                    cursor: 'pointer',
                    border: color === c ? '3px solid #1f2937' : '2px solid rgba(0,0,0,0.08)',
                    transition: 'all 0.2s ease'
                  }}
                />
              ))}
            </div>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{ padding: 2, height: 36, width: '100%', cursor: 'pointer' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
              时长（分钟）
            </label>
            <input
              type="number"
              min={15}
              step={15}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '11px 18px',
              borderRadius: 10,
              background: '#f3f4f6',
              color: '#374151',
              fontWeight: 700
            }}
          >
            取消
          </button>
          <button
            onClick={() => onSave({ name, color, duration })}
            disabled={!name.trim()}
            style={{
              flex: 1,
              padding: '11px 18px',
              borderRadius: 10,
              background: name.trim() ? 'linear-gradient(135deg, #1e3a5f, #2d6a9f)' : '#9ca3af',
              color: 'white',
              fontWeight: 700
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

function CoachEditor({
  initial,
  onSave,
  onCancel
}: {
  initial?: Coach;
  onSave: (data: Partial<Coach>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [phone, setPhone] = useState(initial?.phone || '');

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 16,
          padding: 28,
          width: '100%',
          maxWidth: 420
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, color: '#1f2937' }}>
          {initial ? '编辑教练' : '新增教练'}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
              姓名
            </label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="教练姓名" style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
              联系电话
            </label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="手机号码" style={{ width: '100%' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '11px 18px',
              borderRadius: 10,
              background: '#f3f4f6',
              color: '#374151',
              fontWeight: 700
            }}
          >
            取消
          </button>
          <button
            onClick={() => onSave({ name, phone })}
            disabled={!name.trim()}
            style={{
              flex: 1,
              padding: '11px 18px',
              borderRadius: 10,
              background: name.trim() ? 'linear-gradient(135deg, #1e3a5f, #2d6a9f)' : '#9ca3af',
              color: 'white',
              fontWeight: 700
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

function CourseEditor({
  initial,
  courseTypes,
  coaches,
  onSave,
  onCancel
}: {
  initial?: Course;
  courseTypes: CourseType[];
  coaches: Coach[];
  onSave: (data: Partial<Course>) => void;
  onCancel: () => void;
}) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [date, setDate] = useState(initial?.date || todayStr);
  const [startTime, setStartTime] = useState(initial?.startTime || '09:00');
  const [endTime, setEndTime] = useState(initial?.endTime || '10:00');
  const [courseTypeId, setCourseTypeId] = useState(initial?.courseTypeId || courseTypes[0]?._id || '');
  const [coachId, setCoachId] = useState(initial?.coachId || coaches[0]?._id || '');
  const [capacity, setCapacity] = useState(initial?.capacity || 15);

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 16,
          padding: 28,
          width: '100%',
          maxWidth: 500,
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, color: '#1f2937' }}>
          {initial ? '编辑课程' : '新增课程排期'}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
              日期
            </label>
            <input
              type="date"
              value={date}
              min={todayStr}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
                开始时间
              </label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
                结束时间
              </label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={{ width: '100%' }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
              课程类型
            </label>
            <select value={courseTypeId} onChange={(e) => setCourseTypeId(e.target.value)} style={{ width: '100%' }}>
              {courseTypes.map((ct) => (
                <option key={ct._id} value={ct._id}>
                  {ct.name}（{ct.duration}分钟）
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
              分配教练
            </label>
            <select value={coachId} onChange={(e) => setCoachId(e.target.value)} style={{ width: '100%' }}>
              {coaches.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
              最大容量（人）
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '11px 18px',
              borderRadius: 10,
              background: '#f3f4f6',
              color: '#374151',
              fontWeight: 700
            }}
          >
            取消
          </button>
          <button
            onClick={() =>
              onSave({
                date,
                startTime,
                endTime,
                courseTypeId,
                coachId,
                capacity
              })
            }
            disabled={!courseTypeId || !coachId || startTime >= endTime}
            style={{
              flex: 1,
              padding: '11px 18px',
              borderRadius: 10,
              background:
                !courseTypeId || !coachId || startTime >= endTime
                  ? '#9ca3af'
                  : 'linear-gradient(135deg, #1e3a5f, #2d6a9f)',
              color: 'white',
              fontWeight: 700
            }}
          >
            {initial ? '保存修改' : '创建课程'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { courseTypes, coaches, refreshAll, courses, refreshCourses } = useApp();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [editingCT, setEditingCT] = useState<CourseType | null>(null);
  const [showCTEditor, setShowCTEditor] = useState(false);
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const [showCoachEditor, setShowCoachEditor] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [showCourseEditor, setShowCourseEditor] = useState(false);

  const [confirmState, setConfirmState] = useState<
    | null
    | {
        type: 'deleteCT' | 'deleteCoach' | 'deleteCourse';
        id: string;
        name?: string;
      }
  >(null);

  const [courseList, setCourseList] = useState<Course[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allCT, setAllCT] = useState<CourseType[]>([]);
  const [allCoaches, setAllCoaches] = useState<Coach[]>([]);

  useEffect(() => {
    setAllCT(courseTypes);
    setAllCoaches(coaches);
  }, [courseTypes, coaches]);

  useEffect(() => {
    setCourseList(courses);
  }, [courses]);

  useEffect(() => {
    if (activeTab === 'bookings') {
      api.getBookings().then(setBookings).catch(() => {});
    }
  }, [activeTab]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500);
  };

  const saveCT = async (data: Partial<CourseType>) => {
    try {
      if (editingCT) {
        await api.updateCourseType(editingCT._id, data);
        showToast('success', '课程类型已更新');
      } else {
        await api.createCourseType(data);
        showToast('success', '课程类型已创建');
      }
      setShowCTEditor(false);
      setEditingCT(null);
      refreshAll();
    } catch (e: any) {
      showToast('error', e.message || '操作失败');
    }
  };

  const saveCoach = async (data: Partial<Coach>) => {
    try {
      if (editingCoach) {
        await api.updateCoach(editingCoach._id, data);
        showToast('success', '教练信息已更新');
      } else {
        await api.createCoach(data);
        showToast('success', '教练已新增');
      }
      setShowCoachEditor(false);
      setEditingCoach(null);
      refreshAll();
    } catch (e: any) {
      showToast('error', e.message || '操作失败');
    }
  };

  const saveCourse = async (data: Partial<Course>) => {
    try {
      if (editingCourse) {
        await api.updateCourse(editingCourse._id, data);
        showToast('success', '课程已更新');
      } else {
        await api.createCourse(data);
        showToast('success', '课程创建成功');
      }
      setShowCourseEditor(false);
      setEditingCourse(null);
      refreshCourses();
    } catch (e: any) {
      showToast('error', e.message || '操作失败');
    }
  };

  const doDelete = async (reason?: string) => {
    if (!confirmState) return;
    try {
      if (confirmState.type === 'deleteCT') {
        await api.deleteCourseType(confirmState.id);
        showToast('success', '课程类型已删除');
      } else if (confirmState.type === 'deleteCoach') {
        await api.deleteCoach(confirmState.id);
        showToast('success', '教练已删除');
      } else if (confirmState.type === 'deleteCourse') {
        await api.deleteCourse(confirmState.id, reason);
        showToast('success', '课程已取消，通知已发送给会员');
      }
      setConfirmState(null);
      refreshAll();
    } catch (e: any) {
      showToast('error', e.message || '删除失败');
    }
  };

  const totalCourses = courseList.length;
  const activeCourses = courseList.filter((c) => c.status === 'active').length;
  const cancelledCourses = courseList.filter((c) => c.status === 'cancelled').length;
  const totalBookingsCount = courseList.reduce((s, c) => s + c.bookedCount, 0);

  const getCT = (id: string) => allCT.find((c) => c._id === id);
  const getCoach = (id: string) => allCoaches.find((c) => c._id === id);

  const renderOverview = () => (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 32
        }}
        className="admin-stats-grid"
      >
        {[
          { label: '总课程数', value: totalCourses, icon: '📅', color: 'linear-gradient(135deg, #3b82f6, #2d6a9f)', textColor: 'white' },
          { label: '进行中课程', value: activeCourses, icon: '✅', color: 'linear-gradient(135deg, #10b981, #059669)', textColor: 'white' },
          { label: '已取消课程', value: cancelledCourses, icon: '⛔', color: 'linear-gradient(135deg, #ef4444, #dc2626)', textColor: 'white' },
          { label: '累计预约人次', value: totalBookingsCount, icon: '👥', color: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', textColor: 'white' }
        ].map((s, i) => (
          <div
            key={i}
            style={{
              background: s.color,
              color: s.textColor,
              padding: 24,
              borderRadius: 16,
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 28px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: 20
        }}
        className="admin-overview-grid"
      >
        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 18, color: '#1e3a5f' }}>课程类型分布</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {allCT.map((ct) => {
              const count = courseList.filter((c) => c.courseTypeId === ct._id).length;
              const total = courseList.length || 1;
              const percent = Math.round((count / total) * 100);
              return (
                <div key={ct._id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{ct.name}</span>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>{count} 节 ({percent}%)</span>
                  </div>
                  <div style={{ height: 10, background: '#f3f4f6', borderRadius: 5, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${percent}%`,
                        height: '100%',
                        background: ct.color,
                        borderRadius: 5,
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 18, color: '#1e3a5f' }}>教练课程排行</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {allCoaches
              .map((coach) => ({
                coach,
                count: courseList.filter((c) => c.coachId === coach._id && c.status === 'active').length
              }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 5)
              .map((item, idx) => (
                <div
                  key={item.coach._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 10px',
                    borderRadius: 10,
                    background: idx === 0 ? '#fef3c7' : idx === 1 ? '#f3f4f6' : idx === 2 ? '#fde68a' : '#fafafa'
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: idx === 0 ? '#f59e0b' : idx === 1 ? '#6b7280' : idx === 2 ? '#d97706' : '#9ca3af',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 13
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1f2937' }}>{item.coach.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>本周 {item.count} 节课</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderCourseTypes = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e3a5f' }}>课程类型管理</h2>
        <button
          onClick={() => {
            setEditingCT(null);
            setShowCTEditor(true);
          }}
          style={{
            padding: '11px 20px',
            borderRadius: 10,
            background: 'linear-gradient(135deg, #1e3a5f, #2d6a9f)',
            color: 'white',
            fontWeight: 700,
            fontSize: 14
          }}
        >
          + 新增类型
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 16
        }}
      >
        {allCT.map((ct) => {
          const count = courseList.filter((c) => c.courseTypeId === ct._id).length;
          return (
            <div
              key={ct._id}
              style={{
                borderRadius: 14,
                background: ct.color,
                padding: 20,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 24px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#1f2937' }}>{ct.name}</div>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 8,
                    border: '2px solid rgba(0,0,0,0.15)'
                  }}
                />
              </div>
              <div style={{ fontSize: 13, color: '#4b5563', marginBottom: 14 }}>
                时长：{ct.duration} 分钟 · 共 {count} 节课
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => {
                    setEditingCT(ct);
                    setShowCTEditor(true);
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.85)',
                    color: '#1e3a5f',
                    fontSize: 12,
                    fontWeight: 700
                  }}
                >
                  编辑
                </button>
                <button
                  onClick={() =>
                    setConfirmState({ type: 'deleteCT', id: ct._id, name: ct.name })
                  }
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: '#dc2626',
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 700
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          );
        })}
        {allCT.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af', gridColumn: '1/-1' }}>
            暂无课程类型，点击右上角新增
          </div>
        )}
      </div>
    </div>
  );

  const renderCoaches = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e3a5f' }}>教练管理</h2>
        <button
          onClick={() => {
            setEditingCoach(null);
            setShowCoachEditor(true);
          }}
          style={{
            padding: '11px 20px',
            borderRadius: 10,
            background: 'linear-gradient(135deg, #1e3a5f, #2d6a9f)',
            color: 'white',
            fontWeight: 700,
            fontSize: 14
          }}
        >
          + 新增教练
        </button>
      </div>
      <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#374151' }}>教练</th>
              <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#374151' }}>联系电话</th>
              <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#374151' }}>本月课程数</th>
              <th style={{ textAlign: 'right', padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#374151' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {allCoaches.map((c, idx) => {
              const cnt = courseList.filter((x) => x.coachId === c._id && x.status === 'active').length;
              return (
                <tr
                  key={c._id}
                  style={{
                    height: 48,
                    background: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = '#eff6ff')}
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLTableRowElement).style.background =
                      idx % 2 === 0 ? '#ffffff' : '#f9fafb')
                  }
                >
                  <td style={{ padding: '0 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #2d6a9f, #1e3a5f)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 14
                        }}
                      >
                        {c.name.charAt(0)}
                      </div>
                      <span style={{ fontWeight: 600, color: '#1f2937' }}>{c.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '0 20px', color: '#6b7280', fontSize: 14 }}>{c.phone || '-'}</td>
                  <td style={{ padding: '0 20px' }}>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: 10,
                        background: cnt > 0 ? '#dbeafe' : '#f3f4f6',
                        color: cnt > 0 ? '#1e40af' : '#6b7280',
                        fontWeight: 700,
                        fontSize: 12
                      }}
                    >
                      {cnt} 节
                    </span>
                  </td>
                  <td style={{ padding: '0 20px', textAlign: 'right' }}>
                    <button
                      onClick={() => {
                        setEditingCoach(c);
                        setShowCoachEditor(true);
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        background: '#eff6ff',
                        color: '#1e40af',
                        fontSize: 12,
                        fontWeight: 700,
                        marginRight: 8
                      }}
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => setConfirmState({ type: 'deleteCoach', id: c._id, name: c.name })}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        background: '#fef2f2',
                        color: '#dc2626',
                        fontSize: 12,
                        fontWeight: 700
                      }}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              );
            })}
            {allCoaches.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 48, textAlign: 'center', color: '#9ca3af' }}>
                  暂无教练数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderCourses = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e3a5f' }}>课程排期管理</h2>
        <button
          onClick={() => {
            setEditingCourse(null);
            setShowCourseEditor(true);
          }}
          style={{
            padding: '11px 20px',
            borderRadius: 10,
            background: 'linear-gradient(135deg, #1e3a5f, #2d6a9f)',
            color: 'white',
            fontWeight: 700,
            fontSize: 14
          }}
        >
          + 新增课程
        </button>
      </div>
      <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#374151' }}>日期</th>
              <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#374151' }}>时间</th>
              <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#374151' }}>课程</th>
              <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#374151' }}>教练</th>
              <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#374151' }}>预约</th>
              <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#374151' }}>状态</th>
              <th style={{ textAlign: 'right', padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#374151' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {[...courseList]
              .sort((a, b) => {
                const d = a.date.localeCompare(b.date);
                if (d !== 0) return d;
                return a.startTime.localeCompare(b.startTime);
              })
              .map((c, idx) => {
                const ct = getCT(c.courseTypeId);
                const coach = getCoach(c.coachId);
                const full = c.bookedCount >= c.capacity;
                return (
                  <tr
                    key={c._id}
                    style={{
                      height: 48,
                      background: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = '#eff6ff')}
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLTableRowElement).style.background =
                        idx % 2 === 0 ? '#ffffff' : '#f9fafb')
                    }
                  >
                    <td style={{ padding: '0 20px', fontWeight: 600, color: '#1f2937', fontSize: 14 }}>{c.date}</td>
                    <td style={{ padding: '0 20px', color: '#6b7280', fontSize: 14 }}>
                      {c.startTime} - {c.endTime}
                    </td>
                    <td style={{ padding: '0 20px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '5px 12px',
                          borderRadius: 8,
                          background: ct?.color || '#e5e7eb',
                          color: '#1f2937',
                          fontWeight: 600,
                          fontSize: 12
                        }}
                      >
                        {ct?.name || '-'}
                      </span>
                    </td>
                    <td style={{ padding: '0 20px', color: '#374151', fontSize: 14 }}>{coach?.name || '-'}</td>
                    <td style={{ padding: '0 20px' }}>
                      <span style={{ fontWeight: 700, color: full ? '#dc2626' : '#1f2937', fontSize: 14 }}>
                        {c.bookedCount}
                      </span>
                      <span style={{ color: '#9ca3af', fontSize: 14 }}> / {c.capacity}</span>
                    </td>
                    <td style={{ padding: '0 20px' }}>
                      {c.status === 'active' ? (
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: 10,
                            background: '#dcfce7',
                            color: '#15803d',
                            fontSize: 12,
                            fontWeight: 600
                          }}
                        >
                          进行中
                        </span>
                      ) : (
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: 10,
                            background: '#fef2f2',
                            color: '#dc2626',
                            fontSize: 12,
                            fontWeight: 600
                          }}
                        >
                          已取消
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0 20px', textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          setEditingCourse(c);
                          setShowCourseEditor(true);
                        }}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 8,
                          background: '#eff6ff',
                          color: '#1e40af',
                          fontSize: 12,
                          fontWeight: 700,
                          marginRight: 8
                        }}
                      >
                        编辑
                      </button>
                      <button
                        onClick={() =>
                          setConfirmState({
                            type: 'deleteCourse',
                            id: c._id,
                            name: `${ct?.name || ''} ${c.date}`
                          })
                        }
                        disabled={c.status === 'cancelled'}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 8,
                          background: c.status === 'cancelled' ? '#f3f4f6' : '#fef2f2',
                          color: c.status === 'cancelled' ? '#9ca3af' : '#dc2626',
                          fontSize: 12,
                          fontWeight: 700
                        }}
                      >
                        取消课程
                      </button>
                    </td>
                  </tr>
                );
              })}
            {courseList.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: '#9ca3af' }}>
                  暂无课程安排，点击右上角创建
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderBookings = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e3a5f' }}>会员预约记录</h2>
        <button
          onClick={() => api.getBookings().then(setBookings)}
          style={{
            padding: '10px 18px',
            borderRadius: 10,
            background: '#f3f4f6',
            color: '#374151',
            fontWeight: 700,
            fontSize: 13
          }}
        >
          🔄 刷新
        </button>
      </div>
      <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#374151' }}>会员</th>
              <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#374151' }}>课程</th>
              <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#374151' }}>日期时间</th>
              <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#374151' }}>教练</th>
              <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#374151' }}>预约时间</th>
              <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#374151' }}>状态</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b, idx) => {
              const ct = b.courseType || getCT(b.course?.courseTypeId || '');
              return (
                <tr
                  key={b._id}
                  style={{
                    height: 48,
                    background: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = '#eff6ff')}
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLTableRowElement).style.background =
                      idx % 2 === 0 ? '#ffffff' : '#f9fafb')
                  }
                >
                  <td style={{ padding: '0 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 12
                        }}
                      >
                        {b.memberName.charAt(0)}
                      </div>
                      <span style={{ fontWeight: 600, color: '#1f2937', fontSize: 14 }}>{b.memberName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '0 20px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '5px 12px',
                        borderRadius: 8,
                        background: ct?.color || '#e5e7eb',
                        color: '#1f2937',
                        fontWeight: 600,
                        fontSize: 12
                      }}
                    >
                      {ct?.name || '-'}
                    </span>
                  </td>
                  <td style={{ padding: '0 20px', color: '#374151', fontSize: 14 }}>
                    {b.course ? `${b.course.date} ${b.course.startTime}` : '-'}
                  </td>
                  <td style={{ padding: '0 20px', color: '#374151', fontSize: 14 }}>{b.coach?.name || '-'}</td>
                  <td style={{ padding: '0 20px', color: '#6b7280', fontSize: 13 }}>
                    {new Date(b.createdAt).toLocaleString('zh-CN')}
                  </td>
                  <td style={{ padding: '0 20px' }}>
                    {b.status === 'booked' ? (
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: 10,
                          background: '#dcfce7',
                          color: '#15803d',
                          fontSize: 12,
                          fontWeight: 600
                        }}
                      >
                        已预约
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: 10,
                          background: '#f3f4f6',
                          color: '#6b7280',
                          fontSize: 12,
                          fontWeight: 600
                        }}
                      >
                        已取消
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 48, textAlign: 'center', color: '#9ca3af' }}>
                  暂无预约记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'courseTypes':
        return renderCourseTypes();
      case 'coaches':
        return renderCoaches();
      case 'courses':
        return renderCourses();
      case 'bookings':
        return renderBookings();
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)', background: '#f0f4f8' }}>
      {toast && <Toast type={toast.type} message={toast.message} />}

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 998,
            display: 'none'
          }}
          className="admin-sidebar-backdrop"
        />
      )}

      <aside
        style={{
          width: 220,
          flexShrink: 0,
          background: '#1f2937',
          color: 'white',
          padding: '24px 0',
          position: 'sticky',
          top: 56,
          height: 'calc(100vh - 56px)',
          overflowY: 'auto',
          zIndex: 999
        }}
        className={`admin-sidebar ${sidebarOpen ? 'admin-sidebar-open' : ''}`}
      >
        <div style={{ padding: '0 20px 16px', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: 1 }}>
          管 理 后 台
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column' }}>
          {NAV_ITEMS.map((item) => {
            const active = activeTab === item.key;
            return (
              <div
                key={item.key}
                onClick={() => {
                  setActiveTab(item.key);
                  setSidebarOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '13px 20px',
                  cursor: 'pointer',
                  borderLeft: active ? '4px solid #3b82f6' : '4px solid transparent',
                  paddingLeft: active ? 16 : 20,
                  background: active ? 'rgba(59,130,246,0.1)' : 'transparent',
                  color: active ? 'white' : 'rgba(255,255,255,0.7)',
                  fontWeight: active ? 700 : 500,
                  fontSize: 14,
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)';
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                }}
              >
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            );
          })}
        </nav>
      </aside>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            padding: '16px 24px',
            background: 'white',
            borderBottom: '1px solid #e5e7eb',
            display: 'none',
            alignItems: 'center',
            gap: 16
          }}
          className="admin-topbar-mobile"
        >
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: '#f3f4f6',
              fontSize: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ☰
          </button>
          <div style={{ fontWeight: 700, color: '#1e3a5f' }}>
            {NAV_ITEMS.find((i) => i.key === activeTab)?.label}
          </div>
        </div>

        <div style={{ padding: 24 }}>{renderContent()}</div>
      </div>

      {showCTEditor && (
        <CourseTypeEditor initial={editingCT || undefined} onSave={saveCT} onCancel={() => { setShowCTEditor(false); setEditingCT(null); }} />
      )}

      {showCoachEditor && (
        <CoachEditor initial={editingCoach || undefined} onSave={saveCoach} onCancel={() => { setShowCoachEditor(false); setEditingCoach(null); }} />
      )}

      {showCourseEditor && (
        <CourseEditor
          initial={editingCourse || undefined}
          courseTypes={allCT}
          coaches={allCoaches}
          onSave={saveCourse}
          onCancel={() => { setShowCourseEditor(false); setEditingCourse(null); }}
        />
      )}

      {confirmState && (
        <ConfirmDialog
          title={
            confirmState.type === 'deleteCT'
              ? '删除课程类型'
              : confirmState.type === 'deleteCoach'
              ? '删除教练'
              : '取消课程'
          }
          message={
            confirmState.type === 'deleteCourse'
              ? `确定取消课程「${confirmState.name}」？所有已预约的会员将收到取消通知。`
              : `确定删除「${confirmState.name}」？此操作不可恢复。`
          }
          showInput={confirmState.type === 'deleteCourse'}
          inputPlaceholder="请输入取消原因（将通知给会员）"
          confirmText={confirmState.type === 'deleteCourse' ? '确认取消课程' : '确认删除'}
          onCancel={() => setConfirmState(null)}
          onConfirm={doDelete}
        />
      )}

      <style>{`
        @media (max-width: 1023px) {
          .admin-sidebar {
            position: fixed !important;
            top: 56px !important;
            left: -240px;
            transition: left 0.25s ease;
          }
          .admin-sidebar-open {
            left: 0 !important;
          }
          .admin-sidebar-backdrop {
            display: block !important;
          }
          .admin-topbar-mobile {
            display: flex !important;
          }
        }
        @media (max-width: 767px) {
          .admin-stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .admin-overview-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
