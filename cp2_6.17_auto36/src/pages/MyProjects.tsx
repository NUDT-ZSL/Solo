import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Project } from '../types';

const MyProjects: React.FC = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    developer: '',
    screenshots: '',
    demoLink: '',
    progress: 0,
    fundingGoal: 10000,
  });

  useEffect(() => {
    const token = localStorage.getItem('dev_token');
    if (token) {
      setIsLoggedIn(true);
      loadProjects();
    }
  }, []);

  const loadProjects = () => {
    fetch('/api/developer/projects')
      .then((res) => res.json())
      .then((data) => setProjects(data));
  };

  const handleLogin = () => {
    fetch('/api/developer/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('密码错误');
        }
        return res.json();
      })
      .then((data) => {
        localStorage.setItem('dev_token', data.token);
        setIsLoggedIn(true);
        setLoginError('');
        loadProjects();
      })
      .catch(() => {
        setLoginError('密码错误，请重试');
      });
  };

  const handleLogout = () => {
    localStorage.removeItem('dev_token');
    setIsLoggedIn(false);
  };

  const openAddModal = () => {
    setEditingProject(null);
    setFormData({
      name: '',
      description: '',
      developer: '',
      screenshots: '',
      demoLink: '',
      progress: 0,
      fundingGoal: 10000,
    });
    setShowModal(true);
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description,
      developer: project.developer,
      screenshots: project.screenshots.join('\n'),
      demoLink: project.demoLink,
      progress: project.progress,
      fundingGoal: project.fundingGoal,
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm('确定要删除这个项目吗？')) return;

    fetch(`/api/projects/${id}`, { method: 'DELETE' })
      .then((res) => res.json())
      .then(() => {
        loadProjects();
      });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      alert('请输入项目名称');
      return;
    }

    const screenshots = formData.screenshots
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s);

    const payload = {
      name: formData.name,
      description: formData.description,
      developer: formData.developer,
      screenshots,
      demoLink: formData.demoLink,
      progress: Number(formData.progress),
      fundingGoal: Number(formData.fundingGoal),
    };

    if (editingProject) {
      fetch(`/api/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then((res) => res.json())
        .then(() => {
          setShowModal(false);
          loadProjects();
        });
    } else {
      fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then((res) => res.json())
        .then(() => {
          setShowModal(false);
          loadProjects();
        });
    }
  };

  if (!isLoggedIn) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '80vh',
        }}
      >
        <div
          style={{
            width: '400px',
            padding: '40px',
            backgroundColor: '#16213e',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}
        >
          <h2 style={{ fontSize: '24px', textAlign: 'center', marginBottom: '30px', color: '#ffffff' }}>
            开发者登录
          </h2>
          <input
            type="password"
            placeholder="请输入开发者密码"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setLoginError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: '8px',
              border: '1px solid #2a3f5f',
              backgroundColor: '#1a1a2e',
              color: '#ffffff',
              fontSize: '16px',
              marginBottom: '16px',
            }}
          />
          {loginError && (
            <p style={{ color: '#e94560', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>
              {loginError}
            </p>
          )}
          <button
            onClick={handleLogin}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '8px',
              backgroundColor: '#e94560',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#ff6b81';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#e94560';
            }}
          >
            登录
          </button>
          <p style={{ color: '#666', fontSize: '12px', textAlign: 'center', marginTop: '16px' }}>
            提示：默认密码 developer123
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
        }}
      >
        <h1 style={{ fontSize: '28px', color: '#ffffff' }}>我的项目</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={openAddModal}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              backgroundColor: '#e94560',
              color: '#ffffff',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'background-color 0.2s, transform 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#ff6b81';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#e94560';
            }}
          >
            + 新增项目
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              color: '#a0a0b0',
              fontSize: '14px',
              cursor: 'pointer',
              border: '1px solid #2a3f5f',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.borderColor = '#e94560';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#a0a0b0';
              e.currentTarget.style.borderColor = '#2a3f5f';
            }}
          >
            退出登录
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px',
            backgroundColor: '#16213e',
            borderRadius: '16px',
            color: '#a0a0b0',
          }}
        >
          <p style={{ fontSize: '18px', marginBottom: '20px' }}>还没有任何项目</p>
          <button
            onClick={openAddModal}
            style={{
              padding: '12px 32px',
              borderRadius: '8px',
              backgroundColor: '#e94560',
              color: '#ffffff',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            创建第一个项目
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: '20px',
          }}
        >
          {projects.map((project) => (
            <div
              key={project.id}
              style={{
                display: 'flex',
                gap: '20px',
                padding: '20px',
                backgroundColor: '#16213e',
                borderRadius: '12px',
                alignItems: 'center',
              }}
            >
              <img
                src={project.screenshots[0] || 'https://via.placeholder.com/120x80'}
                alt={project.name}
                style={{
                  width: '120px',
                  height: '80px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
                onClick={() => navigate(`/project/${project.id}`)}
              />
              <div style={{ flex: 1 }}>
                <h3
                  style={{
                    fontSize: '18px',
                    color: '#ffffff',
                    marginBottom: '6px',
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  {project.name}
                </h3>
                <p style={{ fontSize: '14px', color: '#a0a0b0', marginBottom: '8px' }}>
                  {project.developer}
                </p>
                <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: '#a0a0b0' }}>
                  <span>进度：{project.progress}%</span>
                  <span>❤️ {project.likes}</span>
                  <span>已筹 ¥{project.fundedAmount.toLocaleString()}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => openEditModal(project)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '6px',
                    backgroundColor: '#2a3f5f',
                    color: '#ffffff',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#3b5378';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#2a3f5f';
                  }}
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(project.id)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '6px',
                    backgroundColor: 'transparent',
                    color: '#e94560',
                    fontSize: '14px',
                    cursor: 'pointer',
                    border: '1px solid #e94560',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e94560';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#e94560';
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '600px',
              borderRadius: '16px',
              backgroundColor: '#ffffff',
              padding: '30px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <h2 style={{ fontSize: '24px', marginBottom: '24px', color: '#1a1a2e' }}>
              {editingProject ? '编辑项目' : '新增项目'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '6px' }}>
                  项目名称 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                    color: '#333',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '6px' }}>
                  开发者名称
                </label>
                <input
                  type="text"
                  value={formData.developer}
                  onChange={(e) => setFormData({ ...formData, developer: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                    color: '#333',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '6px' }}>
                  项目简介
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                    color: '#333',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '6px' }}>
                  截图URL（每行一张）
                </label>
                <textarea
                  value={formData.screenshots}
                  onChange={(e) => setFormData({ ...formData, screenshots: e.target.value })}
                  rows={3}
                  placeholder="https://example.com/screenshot1.png"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                    color: '#333',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '6px' }}>
                  Demo链接
                </label>
                <input
                  type="text"
                  value={formData.demoLink}
                  onChange={(e) => setFormData({ ...formData, demoLink: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                    color: '#333',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '6px' }}>
                    开发进度 (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progress}
                    onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #ddd',
                      fontSize: '14px',
                      color: '#333',
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '6px' }}>
                    众筹目标 (¥)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.fundingGoal}
                    onChange={(e) => setFormData({ ...formData, fundingGoal: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #ddd',
                      fontSize: '14px',
                      color: '#333',
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '30px' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '12px 28px',
                  borderRadius: '8px',
                  backgroundColor: '#f0f0f0',
                  color: '#666',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e0e0e0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f0f0';
                }}
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                style={{
                  padding: '12px 28px',
                  borderRadius: '8px',
                  backgroundColor: '#e94560',
                  color: '#ffffff',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s, transform 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#ff6b81';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#e94560';
                }}
              >
                {editingProject ? '保存' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyProjects;
