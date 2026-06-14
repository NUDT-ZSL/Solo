import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { get, del } from '../../http';
import { ProjectListItem, Project, Chapter } from '../../types';

const ProjectList: React.FC = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer');
  const [inviteNickname, setInviteNickname] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (projectId) {
      loadProjectDetail(projectId);
    } else {
      setCurrentProject(null);
    }
  }, [projectId]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await get<ProjectListItem[]>('/projects');
      setProjects(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectDetail = async (id: string) => {
    try {
      const data = await get<Project>('/projects/' + id);
      setCurrentProject(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('确定要删除此项目吗？')) return;
    try {
      await del('/projects/' + id);
      setProjects(prev => prev.filter(p => p.id !== id));
      if (projectId === id) navigate('/');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddChapter = async () => {
    if (!currentProject) return;
    const title = prompt('请输入章节标题：');
    if (!title) return;
    const startDate = prompt('开始日期 (YYYY-MM-DD)：', new Date().toISOString().slice(0, 10)) || '';
    const endDate = prompt('截止日期 (YYYY-MM-DD)：', '') || '';
    try {
      const chapter = await get<Chapter>('/projects/' + currentProject.id + '/chapters', undefined as any);
      const resp = await (await import('../../http')).post<Chapter>('/projects/' + currentProject.id + '/chapters', { title, startDate, endDate });
      setCurrentProject(prev => prev ? { ...prev, chapters: [...prev.chapters, resp] } : null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleInvite = async () => {
    if (!currentProject || !inviteEmail) return;
    try {
      const collab = await (await import('../../http')).post('/projects/' + currentProject.id + '/collaborators', {
        email: inviteEmail,
        role: inviteRole,
        nickname: inviteNickname || inviteEmail.split('@')[0],
      });
      setCurrentProject(prev => prev ? { ...prev, collaborators: [...prev.collaborators, collab] } : null);
      setShowInvite(false);
      setInviteEmail('');
      setInviteNickname('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!projectId) {
    return (
      <div style={{ padding: '32px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#2d2d2d' }}>我的项目</h1>
          <Link to="/projects/new">
            <button style={{
              background: '#4a6cf7',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.3s ease-out',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#5a7cf7'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#4a6cf7'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              + 创建项目
            </button>
          </Link>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                width: 256,
                height: 180,
                borderRadius: 12,
                background: '#e0e0e0',
                animation: 'skeleton 0.8s infinite',
              }} />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
            <p style={{ fontSize: 16, marginBottom: 12 }}>还没有任何项目</p>
            <Link to="/projects/new">
              <button style={{
                background: '#4a6cf7',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 20px',
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.3s ease-out',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = '#5a7cf7'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#4a6cf7'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                创建第一个项目
              </button>
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
            {projects.map(project => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                style={{
                  display: 'block',
                  width: 256,
                  borderRadius: 12,
                  background: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  overflow: 'hidden',
                  textDecoration: 'none',
                  color: '#2d2d2d',
                  transition: 'box-shadow 0.3s ease, transform 0.3s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{
                  height: 120,
                  background: project.coverImage ? `url(${project.coverImage})` : 'linear-gradient(135deg, #4a6cf7 0%, #6c5ce7 100%)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {!project.coverImage && (
                    <span style={{ fontSize: 32, color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
                      {project.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div style={{ padding: '12px 14px' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.name}</h3>
                  <p style={{ fontSize: 12, color: '#888', marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {project.description || '暂无描述'}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#aaa' }}>{project.chapterCount} 章节 · {project.collaboratorCount} 协作者</span>
                    <button
                      onClick={(e) => handleDeleteProject(project.id, e)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ccc',
                        cursor: 'pointer',
                        fontSize: 12,
                        padding: '2px 6px',
                        borderRadius: 4,
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#e74c3c'}
                      onMouseLeave={e => e.currentTarget.style.color = '#ccc'}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
        <style>{`
          @keyframes skeleton {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
      </div>
    );
  }

  if (!currentProject) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>加载中...</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Link to="/" style={{ fontSize: 13, color: '#4a6cf7', textDecoration: 'none' }}>← 返回项目列表</Link>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{currentProject.name}</h2>
          <p style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{currentProject.description}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setShowInvite(true)}
            style={{
              background: '#fff',
              color: '#4a6cf7',
              border: '1px solid #4a6cf7',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.3s ease-out',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f0f4ff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
          >
            邀请协作者
          </button>
          <button
            onClick={handleAddChapter}
            style={{
              background: '#4a6cf7',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.3s ease-out',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#5a7cf7'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#4a6cf7'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            + 添加章节
          </button>
        </div>
      </div>

      {showInvite && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
        }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>邀请协作者</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>邮箱地址</label>
              <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="example@mail.com" style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, outline: 'none' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>昵称</label>
              <input value={inviteNickname} onChange={e => setInviteNickname(e.target.value)} placeholder="可选" style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, outline: 'none' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>角色</label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value as 'editor' | 'viewer')} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}>
                <option value="editor">编辑（可修改所有内容）</option>
                <option value="viewer">查看者（仅可查看和评论）</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowInvite(false)} style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13 }}>取消</button>
              <button onClick={handleInvite} style={{ padding: '8px 16px', border: 'none', borderRadius: 6, background: '#4a6cf7', color: '#fff', cursor: 'pointer', fontSize: 13 }}>发送邀请</button>
            </div>
          </div>
        </div>
      )}

      {currentProject.collaborators.length > 0 && (
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#888' }}>协作者：</span>
          {currentProject.collaborators.map((c, i) => (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 12, fontSize: 12,
              background: c.role === 'editor' ? '#eef2ff' : '#f5f5f5',
              color: c.role === 'editor' ? '#4a6cf7' : '#666',
            }}>
              <span style={{
                width: 20, height: 20, borderRadius: '50%',
                background: '#4a6cf7', color: '#fff', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 10,
              }}>
                {c.nickname.charAt(0)}
              </span>
              {c.nickname}
              <span style={{ fontSize: 10, opacity: 0.7 }}>({c.role === 'editor' ? '编辑' : '查看'})</span>
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {currentProject.chapters.map(chapter => {
          const avgProgress = Math.round(
            (chapter.stages.storyboard.progress + chapter.stages.lineArt.progress + chapter.stages.coloring.progress + chapter.stages.lettering.progress) / 4
          );
          return (
            <Link
              key={chapter.id}
              to={`/projects/${projectId}/chapters/${chapter.id}`}
              style={{
                display: 'block',
                width: 256,
                borderRadius: 12,
                background: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                padding: 16,
                textDecoration: 'none',
                color: '#2d2d2d',
                transition: 'box-shadow 0.3s ease, transform 0.3s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>{chapter.title}</h4>
              <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
                {(['storyboard', 'lineArt', 'coloring', 'lettering'] as const).map(key => (
                  <div key={key} style={{ flex: 1, height: 4, borderRadius: 2, background: '#e8e8e8', overflow: 'hidden' }}>
                    <div style={{ width: `${chapter.stages[key].progress}%`, height: '100%', borderRadius: 2, background: { storyboard: '#6c5ce7', lineArt: '#00b894', coloring: '#fdcb6e', lettering: '#74b9ff' }[key], transition: 'width 0.3s' }} />
                  </div>
                ))}
              </div>
              <span style={{ fontSize: 12, color: '#888' }}>总进度 {avgProgress}%</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default ProjectList;
