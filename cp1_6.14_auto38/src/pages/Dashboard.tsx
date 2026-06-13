import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectApi, memberApi, Project, Member } from '../utils/api';

interface DashboardProps {
  currentMemberId: string;
}

export default function Dashboard({ currentMemberId }: DashboardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({
    title: '',
    date: '',
    venue: '',
    tracks: [{ title: '', key: '', difficulty: 'medium' as const, defaultParts: ['第一小提琴', '第二小提琴', '大提琴'] }],
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [projectsRes, membersRes] = await Promise.all([
        projectApi.getAll(),
        memberApi.getAll(),
      ]);
      setProjects(projectsRes.data);
      setMembers(membersRes.data);
    } catch (e) {
      console.error('Failed to load data:', e);
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.title || !newProject.date || !newProject.venue) return;
    try {
      await projectApi.create(newProject as any);
      setShowCreateModal(false);
      setNewProject({
        title: '',
        date: '',
        venue: '',
        tracks: [{ title: '', key: '', difficulty: 'medium', defaultParts: ['第一小提琴', '第二小提琴', '大提琴'] }],
      });
      await loadData();
    } catch (e) {
      console.error('Failed to create project:', e);
    }
  };

  const addTrack = () => {
    setNewProject({
      ...newProject,
      tracks: [...newProject.tracks, { title: '', key: '', difficulty: 'medium', defaultParts: ['第一小提琴', '第二小提琴', '大提琴'] }],
    });
  };

  const updateTrack = (index: number, field: string, value: string) => {
    const newTracks = [...newProject.tracks];
    (newTracks[index] as any)[field] = value;
    setNewProject({ ...newProject, tracks: newTracks });
  };

  const getMemberName = (id: string) => members.find((m) => m.id === id)?.name || id;

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
    const labels: Record<string, string> = {
      easy: '简单',
      medium: '中等',
      hard: '困难',
    };
    return labels[difficulty] || difficulty;
  };

  const getMyAssignments = () => {
    const assignments: Array<{ project: Project; trackTitle: string; part: string; status: string }> = [];
    projects.forEach((p) => {
      p.tracks.forEach((t) => {
        t.assignments.forEach((a) => {
          if (a.memberId === currentMemberId) {
            assignments.push({ project: p, trackTitle: t.title, part: a.part, status: a.status });
          }
        });
      });
    });
    return assignments;
  };

  const myAssignments = getMyAssignments();
  const confirmedCount = projects.flatMap((p) => p.tracks).flatMap((t) => t.assignments).filter((a) => a.status === 'confirmed').length;
  const pendingCount = projects.flatMap((p) => p.tracks).flatMap((t) => t.assignments).filter((a) => a.status === 'pending').length;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">仪表盘</h1>
        <p className="page-subtitle">欢迎回来，{getMemberName(currentMemberId)}</p>
      </div>

      <div className="grid grid-cols-3">
        <div className="card stat-card">
          <div className="stat-value">{projects.length}</div>
          <div className="stat-label">演出项目</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{confirmedCount}</div>
          <div className="stat-label">已确认参与</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{pendingCount}</div>
          <div className="stat-label">待确认</div>
        </div>
      </div>

      {myAssignments.length > 0 && (
        <div className="card">
          <div className="flex-between" style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600' }}>我的声部分配</h2>
          </div>
          {myAssignments.map((a, index) => (
            <div key={index} className="assignment-row">
              <div className="assignment-info">
                <div className="member-name">{a.trackTitle}</div>
                <div className="part-name">
                  {a.part} · {a.project.title} · {a.project.date}
                </div>
              </div>
              <span className={`badge ${getStatusBadge(a.status).className}`}>
                {getStatusBadge(a.status).text}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex-between" style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>近期演出</h2>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + 新建演出
        </button>
      </div>

      <div className="grid grid-cols-2">
        {projects.map((project) => (
          <div
            key={project.id}
            className="card project-card"
            onClick={() => navigate(`/project/${project.id}`)}
          >
            <h3>{project.title}</h3>
            <div className="project-meta">
              <span>📅 {project.date}</span>
              <span>📍 {project.venue}</span>
              <span>🎵 {project.tracks.length} 首曲目</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {project.tracks.map((track) => (
                <span key={track.id} className="badge badge-info">
                  {track.title}
                  <span className={`difficulty-${track.difficulty}`} style={{ marginLeft: '6px' }}>
                    · {getDifficultyLabel(track.difficulty)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">新建演出项目</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <div className="form-group">
              <label className="form-label">演出标题</label>
              <input
                type="text"
                className="form-input"
                value={newProject.title}
                onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                placeholder="如：2026春季音乐会"
              />
            </div>

            <div className="grid grid-cols-2">
              <div className="form-group">
                <label className="form-label">演出日期</label>
                <input
                  type="date"
                  className="form-input"
                  value={newProject.date}
                  onChange={(e) => setNewProject({ ...newProject, date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">演出场地</label>
                <input
                  type="text"
                  className="form-input"
                  value={newProject.venue}
                  onChange={(e) => setNewProject({ ...newProject, venue: e.target.value })}
                  placeholder="如：音乐厅"
                />
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div className="flex-between" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>曲目列表</label>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addTrack}>
                  + 添加曲目
                </button>
              </div>

              {newProject.tracks.map((track, index) => (
                <div key={index} className="card" style={{ background: '#0f172a', marginBottom: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">曲目 {index + 1} 名称</label>
                    <input
                      type="text"
                      className="form-input"
                      value={track.title}
                      onChange={(e) => updateTrack(index, 'title', e.target.value)}
                      placeholder="如：D大调卡农"
                    />
                  </div>
                  <div className="grid grid-cols-2">
                    <div className="form-group">
                      <label className="form-label">调性</label>
                      <input
                        type="text"
                        className="form-input"
                        value={track.key}
                        onChange={(e) => updateTrack(index, 'key', e.target.value)}
                        placeholder="如：D大调"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">难度</label>
                      <select
                        className="form-select"
                        value={track.difficulty}
                        onChange={(e) => updateTrack(index, 'difficulty', e.target.value)}
                      >
                        <option value="easy">简单</option>
                        <option value="medium">中等</option>
                        <option value="hard">困难</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleCreateProject}>
                创建项目
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
