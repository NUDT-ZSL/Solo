import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectApi, memberApi, assignmentApi, feedbackApi, adjustRequestApi, Project, Member, AdjustRequest } from '../utils/api';

interface ProjectDetailProps {
  currentMemberId: string;
}

function VirtualList<T>({ items, itemHeight, renderItem }: {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const visibleHeight = 500;

  const totalHeight = items.length * itemHeight;

  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(start + Math.ceil(visibleHeight / itemHeight) + 2, items.length);
    return { start: Math.max(0, start), end };
  }, [scrollTop, itemHeight, items.length]);

  return (
    <div
      ref={containerRef}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      style={{ maxHeight: visibleHeight, overflowY: 'auto', position: 'relative' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {items.slice(visibleRange.start, visibleRange.end).map((item, i) => (
          <div
            key={visibleRange.start + i}
            style={{ position: 'absolute', top: (visibleRange.start + i) * itemHeight, width: '100%', height: itemHeight }}
          >
            {renderItem(item, visibleRange.start + i)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProjectDetail({ currentMemberId }: ProjectDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustTrackId, setAdjustTrackId] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [requestedPart, setRequestedPart] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [feedbackPart, setFeedbackPart] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [adminRequests, setAdminRequests] = useState<AdjustRequest[]>([]);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedAdminRequest, setSelectedAdminRequest] = useState<AdjustRequest | null>(null);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadAdminRequests = useCallback(async () => {
    try {
      const res = await adjustRequestApi.getAll();
      const pending = res.data.filter((r) => r.status === 'pending');
      setAdminRequests(pending);
      if (pending.length > 0 && !selectedAdminRequest) {
        setSelectedAdminRequest(pending[0]);
      } else if (pending.length === 0) {
        setShowAdminModal(false);
        setSelectedAdminRequest(null);
      } else {
        const stillExists = pending.find((r) => r.id === selectedAdminRequest?.id);
        if (!stillExists) {
          setSelectedAdminRequest(pending[0]);
        } else {
          setSelectedAdminRequest(stillExists);
        }
      }
    } catch (e) {
      console.error('Failed to load admin requests:', e);
    }
  }, [selectedAdminRequest]);

  useEffect(() => {
    loadAdminRequests();
    const interval = setInterval(loadAdminRequests, 3000);
    return () => clearInterval(interval);
  }, [loadAdminRequests]);

  const loadData = async () => {
    if (!id) return;
    try {
      const [projectRes, membersRes] = await Promise.all([
        projectApi.getById(id),
        memberApi.getAll(),
      ]);
      setProject(projectRes.data);
      setMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
    } catch (e) {
      console.error('Failed to load data:', e);
    }
  };

  const handleStatusUpdate = async (trackId: string, memberId: string, status: 'confirmed' | 'pending' | 'adjust_request' | 'leave', extraData: Partial<any> = {}) => {
    if (!id) return;
    try {
      await assignmentApi.update(id, trackId, memberId, { status, ...extraData });
      await loadData();
      if (status === 'adjust_request') {
        await loadAdminRequests();
      }
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  };

  const handleAdjustSubmit = async () => {
    if (!adjustTrackId || !requestedPart) return;
    await handleStatusUpdate(adjustTrackId, currentMemberId, 'adjust_request', {
      adjustNote,
      requestedPart,
    });
    setShowAdjustModal(false);
    setAdjustNote('');
    setRequestedPart('');
    setAdjustTrackId('');
  };

  const handleFeedbackSubmit = async () => {
    if (!id || !feedbackPart || feedbackRating === 0) return;
    try {
      await feedbackApi.create({
        projectId: id,
        memberId: currentMemberId,
        rating: feedbackRating,
        note: feedbackNote,
        part: feedbackPart,
      });
      setShowFeedbackModal(false);
      setFeedbackRating(0);
      setFeedbackNote('');
      setFeedbackPart('');
    } catch (e) {
      console.error('Failed to submit feedback:', e);
    }
  };

  const handleAdminDecision = async (requestId: string, decision: 'approved' | 'rejected') => {
    try {
      await adjustRequestApi.update(requestId, decision);
      await loadAdminRequests();
      await loadData();
    } catch (e) {
      console.error('Failed to process request:', e);
    }
  };

  const getMemberName = (memberId: string) => members.find((m) => m.id === memberId)?.name || memberId;

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { className: string; text: string }> = {
      confirmed: { className: 'badge-success', text: '已确认' },
      pending: { className: 'badge-warning', text: '待确认' },
      adjust_request: { className: 'badge-info', text: '申请调整' },
      leave: { className: 'badge-danger', text: '请假' },
    };
    return badges[status] || { className: 'badge-info', text: status };
  };

  const getDifficultyLabel = (difficulty: string) => {
    const labels: Record<string, string> = { easy: '简单', medium: '中等', hard: '困难' };
    return labels[difficulty] || difficulty;
  };

  const getMyAssignments = () => {
    if (!project) return [];
    return (project.tracks || []).flatMap((t) =>
      (t.assignments || []).filter((a) => a.memberId === currentMemberId).map((a) => ({ ...a, track: t }))
    );
  };

  const myAssignments = getMyAssignments();

  if (!project) {
    return <div className="card">加载中...</div>;
  }

  const allAssignments = (project.tracks || []).flatMap((t) =>
    (t.assignments || []).map((a) => ({ ...a, track: t }))
  );

  return (
    <div>
      <div className="page-header">
        <div className="flex-between">
          <div>
            <h1 className="page-title">{project.title}</h1>
            <p className="page-subtitle">
              📅 {project.date} · 📍 {project.venue}
              {project.recent && <span> · 🕐 最近排练: {project.recent}</span>}
            </p>
          </div>
          <div className="flex gap-2">
            {adminRequests.length > 0 && (
              <button
                className="btn btn-danger"
                onClick={() => {
                  setSelectedAdminRequest(adminRequests[0]);
                  setShowAdminModal(true);
                }}
              >
                ⚠️ 调整申请 ({adminRequests.length})
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => navigate('/schedule')}>
              📅 排练时间
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/review')}>
              📊 排练回顾
            </button>
            <button className="btn btn-primary" onClick={() => {
              if (myAssignments.length > 0) {
                setFeedbackPart(myAssignments[0].part);
              }
              setShowFeedbackModal(true);
            }}>
              ✍️ 提交反馈
            </button>
          </div>
        </div>
      </div>

      {myAssignments.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>我的声部分配</h2>
          {myAssignments.map((a, index) => (
            <div key={index} className="assignment-row">
              <div className="assignment-info">
                <div className="member-name">{a.track.title}</div>
                <div className="part-name">{a.part} · {a.track.key}</div>
              </div>
              <div className="flex gap-2">
                <span className={`badge ${getStatusBadge(a.status).className}`}>
                  {getStatusBadge(a.status).text}
                </span>
                {a.status === 'adjust_request' && a.adjustNote && (
                  <span className="badge badge-info">申请: {a.adjustNote}</span>
                )}
              </div>
              <div className="action-buttons">
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => handleStatusUpdate(a.track.id, currentMemberId, 'confirmed')}
                  disabled={a.status === 'confirmed'}
                >
                  确认参加
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setAdjustTrackId(a.track.id);
                    setShowAdjustModal(true);
                  }}
                >
                  申请调整
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleStatusUpdate(a.track.id, currentMemberId, 'leave')}
                  disabled={a.status === 'leave'}
                >
                  请假
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>曲目列表</h2>
        {(project.tracks || []).map((track) => (
          <div key={track.id} className="track-item">
            <div className="track-header">
              <div>
                <span className="track-title">{track.title}</span>
                <span style={{ marginLeft: '12px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  {track.key}
                </span>
                <span
                  className={`difficulty-${track.difficulty}`}
                  style={{ marginLeft: '12px', fontSize: '13px', fontWeight: '500' }}
                >
                  {getDifficultyLabel(track.difficulty)}
                </span>
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                声部: {track.defaultParts.join(', ')}
              </div>
            </div>
            <div style={{ paddingLeft: '8px' }}>
              {track.assignments.length > 100 ? (
                <VirtualList
                  items={track.assignments}
                  itemHeight={56}
                  renderItem={(assignment) => (
                    <div className="assignment-row" style={{ height: '100%', padding: '8px 0' }}>
                      <div className="assignment-info">
                        <div className="member-name">{getMemberName(assignment.memberId)}</div>
                        <div className="part-name">{assignment.part}</div>
                      </div>
                      <span className={`badge ${getStatusBadge(assignment.status).className}`}>
                        {getStatusBadge(assignment.status).text}
                      </span>
                    </div>
                  )}
                />
              ) : (
                track.assignments.map((assignment, idx) => (
                  <div key={idx} className="assignment-row">
                    <div className="assignment-info">
                      <div className="member-name">{getMemberName(assignment.memberId)}</div>
                      <div className="part-name">{assignment.part}</div>
                    </div>
                    <span className={`badge ${getStatusBadge(assignment.status).className}`}>
                      {getStatusBadge(assignment.status).text}
                    </span>
                  </div>
                ))
              )}
              {track.assignments.length === 0 && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  暂无成员分配
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showAdminModal && selectedAdminRequest && (
        <div className="modal-overlay" onClick={() => setShowAdminModal(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              color: '#1e293b',
              width: '540px',
              borderRadius: '16px',
              padding: '24px',
              animation: 'slideUp 0.3s ease-out',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            <div className="modal-header">
              <h2 className="modal-title">声部调整申请</h2>
              <button className="modal-close" onClick={() => setShowAdminModal(false)}>×</button>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '8px', background: '#f1f5f9', borderRadius: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>
                  {selectedAdminRequest.memberName}
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  请求调整声部
                </span>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>项目：</span>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>{selectedAdminRequest.projectTitle}</span>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>曲目：</span>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>{selectedAdminRequest.trackTitle}</span>
              </div>
              <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: '#64748b' }}>{selectedAdminRequest.currentPart}</span>
                <span style={{ color: '#64748b' }}>→</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#f59e0b' }}>{selectedAdminRequest.requestedPart || '未指定'}</span>
              </div>
              {selectedAdminRequest.reason && (
                <div style={{ marginBottom: '8px', padding: '8px', background: '#fef3c7', borderRadius: '6px', fontSize: '13px' }}>
                  <strong>理由：</strong>{selectedAdminRequest.reason}
                </div>
              )}
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                申请时间：{new Date(selectedAdminRequest.createdAt).toLocaleString('zh-CN')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: '500', fontSize: '14px', transition: 'background 0.2s' }}
                onClick={() => handleAdminDecision(selectedAdminRequest.id, 'rejected')}
                onMouseOver={(e) => (e.target as HTMLElement).style.background = '#dc2626'}
                onMouseOut={(e) => (e.target as HTMLElement).style.background = '#ef4444'}
              >
                拒绝
              </button>
              <button
                style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: '500', fontSize: '14px', transition: 'background 0.2s' }}
                onClick={() => handleAdminDecision(selectedAdminRequest.id, 'approved')}
                onMouseOver={(e) => (e.target as HTMLElement).style.background = '#059669'}
                onMouseOut={(e) => (e.target as HTMLElement).style.background = '#10b981'}
              >
                批准
              </button>
            </div>
            {adminRequests.length > 1 && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
                  还有 {adminRequests.length - 1} 个待处理申请
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {adminRequests.filter((r) => r.id !== selectedAdminRequest.id).map((r) => (
                    <button
                      key={r.id}
                      style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: '12px', color: '#475569' }}
                      onClick={() => setSelectedAdminRequest(r)}
                    >
                      {r.memberName}: {r.currentPart} → {r.requestedPart}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showAdjustModal && (
        <div className="modal-overlay" onClick={() => setShowAdjustModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">申请声部调整</h2>
              <button className="modal-close" onClick={() => setShowAdjustModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">希望调整为</label>
              <input
                type="text"
                className="form-input"
                value={requestedPart}
                onChange={(e) => setRequestedPart(e.target.value)}
                placeholder="如：第二小提琴"
              />
            </div>
            <div className="form-group">
              <label className="form-label">调整理由</label>
              <textarea
                className="form-textarea"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="请说明调整理由..."
              />
            </div>
            <div className="flex gap-4" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowAdjustModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleAdjustSubmit}>
                提交申请
              </button>
            </div>
          </div>
        </div>
      )}

      {showFeedbackModal && (
        <div className="modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">排练反馈</h2>
              <button className="modal-close" onClick={() => setShowFeedbackModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">声部</label>
              <select
                className="form-select"
                value={feedbackPart}
                onChange={(e) => setFeedbackPart(e.target.value)}
              >
                <option value="">请选择声部</option>
                {myAssignments.map((a, idx) => (
                  <option key={idx} value={a.part}>{a.part} - {a.track.title}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">评分</label>
              <div className="rating-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`star ${(hoverRating || feedbackRating) >= star ? 'filled' : ''}`}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setFeedbackRating(star)}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">排练记录</label>
              <textarea
                className="form-textarea"
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                placeholder="记录本次排练的心得、问题或建议..."
              />
            </div>
            <div className="flex gap-4" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowFeedbackModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleFeedbackSubmit}>
                提交反馈
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
