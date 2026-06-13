import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectApi, memberApi, assignmentApi, feedbackApi, Project, Member } from '../utils/api';

interface ProjectDetailProps {
  currentMemberId: string;
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

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    try {
      const [projectRes, membersRes] = await Promise.all([
        projectApi.getById(id),
        memberApi.getAll(),
      ]);
      setProject(projectRes.data);
      setMembers(membersRes.data);
    } catch (e) {
      console.error('Failed to load data:', e);
    }
  };

  const handleStatusUpdate = async (trackId: string, memberId: string, status: 'confirmed' | 'pending' | 'adjust_request' | 'leave', extraData: Partial<any> = {}) => {
    if (!id) return;
    try {
      await assignmentApi.update(id, trackId, memberId, { status, ...extraData });
      await loadData();
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
    return project.tracks.flatMap((t) =>
      t.assignments.filter((a) => a.memberId === currentMemberId).map((a) => ({ ...a, track: t }))
    );
  };

  const myAssignments = getMyAssignments();

  if (!project) {
    return <div className="card">加载中...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div className="flex-between">
          <div>
            <h1 className="page-title">{project.title}</h1>
            <p className="page-subtitle">
              📅 {project.date} · 📍 {project.venue}
            </p>
          </div>
          <div className="flex gap-2">
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
                <div className="part-name">
                  {a.part} · {a.track.key}
                </div>
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
        {project.tracks.map((track) => (
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
              {track.assignments.map((assignment, idx) => (
                <div key={idx} className="assignment-row">
                  <div className="assignment-info">
                    <div className="member-name">{getMemberName(assignment.memberId)}</div>
                    <div className="part-name">{assignment.part}</div>
                  </div>
                  <span className={`badge ${getStatusBadge(assignment.status).className}`}>
                    {getStatusBadge(assignment.status).text}
                  </span>
                </div>
              ))}
              {track.assignments.length === 0 && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  暂无成员分配
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

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
