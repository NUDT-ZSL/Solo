import { useState, useEffect, useCallback } from 'react';
import {
  createEvent,
  updateEvent,
  deleteEvent,
  getStats,
  exportEventCSV,
  EventItem,
  EventStat,
} from '../api/events';

interface Props {
  events: EventItem[];
  onRefresh: () => void;
}

interface FormData {
  title: string;
  date: string;
  description: string;
  maxParticipants: number;
}

const emptyForm: FormData = {
  title: '',
  date: '',
  description: '',
  maxParticipants: 20,
};

export default function Admin({ events, onRefresh }: Props) {
  const [form, setForm] = useState<FormData>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [stats, setStats] = useState<EventStat[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  const loadStats = useCallback(async () => {
    const result = await getStats();
    if (!('error' in result)) {
      setStats(result);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [events, loadStats]);

  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!form.title.trim() || !form.date || form.maxParticipants <= 0) {
      setFormError('请填写完整信息');
      return;
    }

    if (editingId) {
      await updateEvent(editingId, {
        title: form.title.trim(),
        date: form.date,
        description: form.description.trim(),
        maxParticipants: form.maxParticipants,
      });
      setEditingId(null);
    } else {
      await createEvent({
        title: form.title.trim(),
        date: form.date,
        description: form.description.trim(),
        maxParticipants: form.maxParticipants,
      });
    }

    setForm(emptyForm);
    onRefresh();
    loadStats();
  };

  const handleEdit = (ev: EventItem) => {
    setEditingId(ev.id);
    setForm({
      title: ev.title,
      date: ev.date,
      description: ev.description,
      maxParticipants: ev.maxParticipants,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    await deleteEvent(id);
    setDeleteConfirmId(null);
    onRefresh();
    loadStats();
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
  };

  const maxRegistered = Math.max(...stats.map((s) => s.registeredCount), 1);
  const maxCheckedIn = Math.max(...stats.map((s) => s.checkedInCount), 1);
  const maxRate = 100;

  return (
    <div>
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '28px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          marginBottom: '32px',
        }}
      >
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>
          {editingId ? '✏️ 修改活动' : '➕ 创建新活动'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <div style={{ flex: '2 1 200px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: '#7f8c8d' }}>
                活动标题
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="输入活动标题"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: '#7f8c8d' }}>
                活动日期
              </label>
              <input
                type="date"
                value={form.date}
                min={today}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ flex: '1 1 120px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: '#7f8c8d' }}>
                最大人数
              </label>
              <input
                type="number"
                value={form.maxParticipants}
                min={1}
                onChange={(e) => setForm({ ...form, maxParticipants: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: '#7f8c8d' }}>
              活动简介
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="输入活动简介"
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {formError && (
            <p style={{ color: '#E74C3C', fontSize: '14px', marginBottom: '12px' }}>{formError}</p>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: '#3498DB',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'transform 0.1s ease',
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {editingId ? '保存修改' : '创建活动'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                取消
              </button>
            )}
          </div>
        </form>
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '28px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          marginBottom: '32px',
        }}
      >
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>
          📋 活动列表
        </h2>

        {events.length === 0 ? (
          <p style={{ color: '#95A5A6', textAlign: 'center', padding: '20px' }}>
            暂无活动，请创建新活动
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {events.map((ev) => (
              <div
                key={ev.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  background: '#F9F9F9',
                  borderRadius: '10px',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: '1 1 200px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                    {ev.title}
                  </h3>
                  <span style={{ fontSize: '13px', color: '#7f8c8d' }}>
                    {ev.date} · {ev.participants.length}/{ev.maxParticipants} 人
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleEdit(ev)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1px solid #3498DB',
                      background: '#fff',
                      color: '#3498DB',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(ev.id)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1px solid #E74C3C',
                      background: '#fff',
                      color: '#E74C3C',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    删除
                  </button>
                  <button
                    onClick={() => exportEventCSV(ev.id)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#8E44AD',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    ⬇ 导出CSV
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '28px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>
          📊 报名统计看板
        </h2>

        {stats.length === 0 ? (
          <p style={{ color: '#95A5A6', textAlign: 'center', padding: '20px' }}>
            暂无统计数据
          </p>
        ) : (
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: '#3498DB' }}>
              报名人数
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
              {stats.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '160px', fontSize: '13px', color: '#34495E', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.title}
                  </span>
                  <div style={{ flex: 1, height: '22px', background: '#ECF0F1', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${(s.registeredCount / maxRegistered) * 100}%`,
                        background: '#3498DB',
                        borderRadius: '4px',
                        transition: 'width 0.5s ease-out',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        paddingRight: '6px',
                        minWidth: s.registeredCount > 0 ? '28px' : '0',
                      }}
                    >
                      <span style={{ fontSize: '11px', color: '#fff', fontWeight: 600 }}>
                        {s.registeredCount}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: '#2ECC71' }}>
              签到人数
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
              {stats.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '160px', fontSize: '13px', color: '#34495E', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.title}
                  </span>
                  <div style={{ flex: 1, height: '22px', background: '#ECF0F1', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${maxCheckedIn > 0 ? (s.checkedInCount / maxCheckedIn) * 100 : 0}%`,
                        background: '#2ECC71',
                        borderRadius: '4px',
                        transition: 'width 0.5s ease-out',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        paddingRight: '6px',
                        minWidth: s.checkedInCount > 0 ? '28px' : '0',
                      }}
                    >
                      <span style={{ fontSize: '11px', color: '#fff', fontWeight: 600 }}>
                        {s.checkedInCount}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: '#F39C12' }}>
              报名率
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stats.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '160px', fontSize: '13px', color: '#34495E', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.title}
                  </span>
                  <div style={{ flex: 1, height: '22px', background: '#ECF0F1', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${(s.registrationRate / maxRate) * 100}%`,
                        background: '#F39C12',
                        borderRadius: '4px',
                        transition: 'width 0.5s ease-out',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        paddingRight: '6px',
                        minWidth: s.registrationRate > 0 ? '36px' : '0',
                      }}
                    >
                      <span style={{ fontSize: '11px', color: '#fff', fontWeight: 600 }}>
                        {s.registrationRate}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#E74C3C' }}>
              确认删除
            </h3>
            <p style={{ fontSize: '15px', color: '#34495E', marginBottom: '24px' }}>
              确定要删除这个活动吗？此操作不可撤销。
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#E74C3C',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
