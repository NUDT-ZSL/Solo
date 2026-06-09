import React, { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Objective, KeyResult, Quarter } from '../types';
import { ProgressBar } from './ProgressBar';
import { useWebSocket } from './WebSocketProvider';

interface OkrCardProps {
  objective: Objective;
  isNew?: boolean;
}

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

export const OkrCard: React.FC<OkrCardProps> = ({ objective, isNew }) => {
  const { currentUserId, currentUserColor, sendMessage } = useWebSocket();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: objective.title,
    description: objective.description,
    quarter: objective.quarter,
    owner: objective.owner
  });
  const [newKrTitle, setNewKrTitle] = useState('');
  const [draggedKrId, setDraggedKrId] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const isLockedByOthers = objective.lockedBy && objective.lockedBy !== currentUserId;
  const isLockedByMe = objective.lockedBy === currentUserId;
  const averageProgress = objective.keyResults.length
    ? Math.round(objective.keyResults.reduce((s, kr) => s + kr.progress, 0) / objective.keyResults.length)
    : 0;

  const startEdit = () => {
    if (isLockedByOthers) return;
    if (!isLockedByMe) {
      sendMessage('okr:locked', { objectiveId: objective.id });
    }
    setEditing(true);
    setEditData({
      title: objective.title,
      description: objective.description,
      quarter: objective.quarter,
      owner: objective.owner
    });
  };

  const cancelEdit = () => {
    setEditing(false);
    if (isLockedByMe) {
      sendMessage('okr:unlocked', { objectiveId: objective.id });
    }
  };

  const saveEdit = async () => {
    if (!editData.title.trim() || editData.title.length > 50) return;
    if (editData.description.length > 200) return;
    try {
      await fetch(`/api/okrs/${objective.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      });
      setEditing(false);
      if (isLockedByMe) {
        sendMessage('okr:unlocked', { objectiveId: objective.id });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteObjective = async () => {
    if (!confirm('确定删除该目标吗？')) return;
    try {
      await fetch(`/api/okrs/${objective.id}`, { method: 'DELETE' });
      if (isLockedByMe) {
        sendMessage('okr:unlocked', { objectiveId: objective.id });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addKeyResult = async () => {
    if (!newKrTitle.trim() || objective.keyResults.length >= 5) return;
    const newKr: KeyResult = {
      id: uuidv4(),
      title: newKrTitle.trim(),
      progress: 0
    };
    try {
      await fetch(`/api/okrs/${objective.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyResults: [...objective.keyResults, newKr] })
      });
      setNewKrTitle('');
    } catch (e) {
      console.error(e);
    }
  };

  const updateKrProgress = async (krId: string, progress: number) => {
    const newKrs = objective.keyResults.map(kr =>
      kr.id === krId ? { ...kr, progress } : kr
    );
    try {
      const res = await fetch(`/api/okrs/${objective.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyResults: newKrs })
      });
      if (res.ok) {
        sendMessage('okr:updated', await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateKrTitle = async (krId: string, title: string) => {
    const newKrs = objective.keyResults.map(kr =>
      kr.id === krId ? { ...kr, title } : kr
    );
    try {
      await fetch(`/api/okrs/${objective.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyResults: newKrs })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const deleteKr = async (krId: string) => {
    const newKrs = objective.keyResults.filter(kr => kr.id !== krId);
    try {
      await fetch(`/api/okrs/${objective.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyResults: newKrs })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const onDragStart = (e: React.DragEvent, krId: string) => {
    setDraggedKrId(krId);
    e.dataTransfer.effectAllowed = 'move';
    if (cardRef.current) {
      cardRef.current.style.opacity = '0.7';
      cardRef.current.style.transform = 'translateY(-4px)';
      cardRef.current.style.boxShadow = '0 12px 32px rgba(0,0,0,0.2)';
    }
  };

  const onDragEnd = () => {
    setDraggedKrId(null);
    if (cardRef.current) {
      cardRef.current.style.opacity = '1';
      cardRef.current.style.transform = '';
      cardRef.current.style.boxShadow = '';
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = async (e: React.DragEvent, targetKrId: string) => {
    e.preventDefault();
    if (!draggedKrId || draggedKrId === targetKrId) return;
    const krs = [...objective.keyResults];
    const fromIdx = krs.findIndex(kr => kr.id === draggedKrId);
    const toIdx = krs.findIndex(kr => kr.id === targetKrId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [removed] = krs.splice(fromIdx, 1);
    krs.splice(toIdx, 0, removed);
    try {
      await fetch(`/api/okrs/${objective.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyResults: krs })
      });
    } catch (err) {
      console.error(err);
    }
    setDraggedKrId(null);
  };

  const getSliderColor = (p: number): string => {
    if (p <= 30) return '#E74C3C';
    if (p <= 70) return '#F39C12';
    return '#27AE60';
  };

  return (
    <div
      ref={cardRef}
      style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        padding: '16px',
        transition: 'all 0.3s ease',
        animation: isNew ? 'slideInFromTop 0.4s ease' : undefined,
        position: 'relative',
        cursor: isLockedByOthers ? 'not-allowed' : 'default'
      }}
      onMouseEnter={(e) => {
        if (!draggedKrId) {
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        if (!draggedKrId) {
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
          e.currentTarget.style.transform = '';
        }
      }}
    >
      {isLockedByOthers && (
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(255,255,255,0.6)',
            borderRadius: '12px',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none'
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2C3E50" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <div style={{ fontSize: '12px', color: '#2C3E50', marginTop: '4px' }}>其他用户正在编辑</div>
          </div>
        </div>
      )}

      {(isLockedByMe || (objective.lockedBy && !isLockedByOthers)) && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: objective.lockColor || currentUserColor,
            animation: 'pulse 1.2s infinite',
            zIndex: 20
          }}
        />
      )}

      {editing ? (
        <div>
          <input
            value={editData.title}
            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
            placeholder="标题（最多50字）"
            maxLength={50}
            style={{ width: '100%', marginBottom: '8px', fontWeight: 600 }}
          />
          <textarea
            value={editData.description}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            placeholder="描述（最多200字）"
            maxLength={200}
            rows={2}
            style={{ width: '100%', marginBottom: '8px', resize: 'none' }}
          />
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <select
              value={editData.quarter}
              onChange={(e) => setEditData({ ...editData, quarter: e.target.value as Quarter })}
              style={{ flex: 1 }}
            >
              {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
            <input
              value={editData.owner}
              onChange={(e) => setEditData({ ...editData, owner: e.target.value })}
              placeholder="负责人"
              style={{ flex: 1 }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={saveEdit} style={btnPrimary}>保存</button>
            <button onClick={cancelEdit} style={btnSecondary}>取消</button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', paddingLeft: objective.lockedBy ? '18px' : 0 }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#2C3E50', marginBottom: '4px' }}>{objective.title}</h3>
              {objective.description && (
                <p style={{ fontSize: '13px', color: '#6B7C93', marginBottom: '8px' }}>{objective.description}</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
              <button onClick={() => setExpanded(!expanded)} style={btnIcon} title={expanded ? '收起' : '展开'}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7C93" strokeWidth="2" style={{ transform: expanded ? 'rotate(180deg)' : '', transition: 'transform 0.3s' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {!isLockedByOthers && (
                <>
                  <button onClick={startEdit} style={btnIcon} title="编辑">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7C93" strokeWidth="2">
                      <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </button>
                  <button onClick={deleteObjective} style={{ ...btnIcon, color: '#E74C3C' }} title="删除">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E74C3C" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', color: '#6B7C93', background: '#EEF2F7', padding: '2px 8px', borderRadius: '4px' }}>
              {objective.quarter}
            </span>
            <span style={{ fontSize: '12px', color: '#6B7C93' }}>👤 {objective.owner}</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: averageProgress >= 70 ? '#27AE60' : averageProgress >= 30 ? '#F39C12' : '#E74C3C', marginLeft: 'auto' }}>
              {averageProgress}%
            </span>
          </div>

          <ProgressBar progress={averageProgress} />

          {(expanded || objective.keyResults.length > 0) && (
            <div style={{ marginTop: '16px', borderTop: '1px solid #EEF2F7', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#2C3E50' }}>
                  关键结果 ({objective.keyResults.length}/5)
                </span>
              </div>
              {objective.keyResults.map((kr) => (
                <div
                  key={kr.id}
                  draggable={!isLockedByOthers}
                  onDragStart={(e) => onDragStart(e, kr.id)}
                  onDragEnd={onDragEnd}
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, kr.id)}
                  style={{
                    padding: '10px',
                    background: draggedKrId === kr.id ? '#F0F7FF' : '#FAFBFC',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    border: draggedKrId === kr.id ? '1px dashed #45B7D1' : '1px solid transparent',
                    transition: 'all 0.2s ease',
                    cursor: isLockedByOthers ? 'not-allowed' : 'grab'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" style={{ flexShrink: 0 }}>
                      <circle cx="9" cy="5" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="9" cy="19" r="1" />
                      <circle cx="15" cy="5" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="19" r="1" />
                    </svg>
                    <input
                      value={kr.title}
                      onChange={(e) => updateKrTitle(kr.id, e.target.value)}
                      disabled={isLockedByOthers}
                      style={{ flex: 1, fontSize: '13px', padding: '4px 8px', background: 'transparent', border: 'none' }}
                    />
                    <button onClick={() => deleteKr(kr.id)} style={btnIcon} disabled={isLockedByOthers}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={kr.progress}
                      onChange={(e) => updateKrProgress(kr.id, Number(e.target.value))}
                      disabled={isLockedByOthers}
                      style={{
                        flex: 1,
                        height: '6px',
                        accentColor: getSliderColor(kr.progress),
                        cursor: isLockedByOthers ? 'not-allowed' : 'pointer'
                      }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: getSliderColor(kr.progress), width: '36px', textAlign: 'right' }}>
                      {kr.progress}%
                    </span>
                  </div>
                </div>
              ))}

              {objective.keyResults.length < 5 && !isLockedByOthers && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <input
                    value={newKrTitle}
                    onChange={(e) => setNewKrTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addKeyResult()}
                    placeholder="添加关键结果..."
                    style={{ flex: 1, fontSize: '13px' }}
                  />
                  <button onClick={addKeyResult} style={btnSmall}>添加</button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const btnPrimary: React.CSSProperties = {
  padding: '6px 14px',
  background: '#2C3E50',
  color: '#fff',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: 500
};

const btnSecondary: React.CSSProperties = {
  padding: '6px 14px',
  background: '#EEF2F7',
  color: '#6B7C93',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: 500
};

const btnSmall: React.CSSProperties = {
  padding: '6px 12px',
  background: '#45B7D1',
  color: '#fff',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 500
};

const btnIcon: React.CSSProperties = {
  background: 'transparent',
  padding: '4px',
  borderRadius: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};
