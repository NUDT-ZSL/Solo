import React, { useState, useEffect, useCallback, useRef } from 'react';
import ProjectCard from './ProjectCard';
import InspirationBoard from './InspirationBoard';
import TaskList from './TaskList';
import {
  Project,
  Inspiration,
  Task,
  ProjectStatus,
  fetchProjects,
  fetchInspirations,
  fetchTasks,
  fetchAllTasks,
  createProject as apiCreateProject,
  createInspiration as apiCreateInspiration,
  createTask as apiCreateTask,
  toggleTaskCompletion as apiToggleTaskCompletion,
  updateTaskOrder as apiUpdateTaskOrder,
  updateProjectStatus as apiUpdateProjectStatus
} from '../data/mockData';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'home' | 'detail'>('home');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [inspirations, setInspirations] = useState<Inspiration[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    deadline: ''
  });
  const [contentVisible, setContentVisible] = useState(false);
  const [skeletonVisible, setSkeletonVisible] = useState(true);
  const [displayProgress, setDisplayProgress] = useState(0);
  const progressRef = useRef(0);
  const progressAnimRef = useRef<number | null>(null);

  const animateProgress = useCallback((target: number) => {
    const start = progressRef.current;
    const duration = 800;
    const startTime = performance.now();

    if (progressAnimRef.current !== null) {
      cancelAnimationFrame(progressAnimRef.current);
    }

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const current = Math.round(start + (target - start) * ease);
      progressRef.current = current;
      setDisplayProgress(current);
      if (t < 1) {
        progressAnimRef.current = requestAnimationFrame(step);
      }
    };

    progressAnimRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setContentVisible(false);
      setSkeletonVisible(true);
      const [projectsData, allTasksData] = await Promise.all([
        fetchProjects(),
        fetchAllTasks()
      ]);
      setProjects(projectsData);
      setAllTasks(allTasksData);
      setLoading(false);

      const completed = allTasksData.filter(t => t.completed).length;
      const total = allTasksData.length;
      progressRef.current = 0;
      const targetProgress = total > 0 ? Math.round((completed / total) * 100) : 0;

      setTimeout(() => {
        setSkeletonVisible(false);
      }, 100);

      setTimeout(() => {
        setContentVisible(true);
        animateProgress(targetProgress);
      }, 500);
    };
    loadInitialData();

    return () => {
      if (progressAnimRef.current !== null) {
        cancelAnimationFrame(progressAnimRef.current);
      }
    };
  }, [animateProgress]);

  useEffect(() => {
    if (!loading && !skeletonVisible) {
      const completed = allTasks.filter(t => t.completed).length;
      const total = allTasks.length;
      const targetProgress = total > 0 ? Math.round((completed / total) * 100) : 0;
      animateProgress(targetProgress);
    }
  }, [allTasks, loading, skeletonVisible, animateProgress]);

  const loadProjectDetail = useCallback(async (projectId: string) => {
    setLoading(true);
    setContentVisible(false);
    setSkeletonVisible(true);
    const [projectData, inspirationsData, tasksData, allTasksData] = await Promise.all([
      fetchProjects().then(p => p.find(p => p.id === projectId) || null),
      fetchInspirations(projectId),
      fetchTasks(projectId),
      fetchAllTasks()
    ]);
    if (projectData) {
      setCurrentProject(projectData);
      setInspirations(inspirationsData);
      setTasks(tasksData);
      setAllTasks(allTasksData);
    }
    setLoading(false);

    setTimeout(() => {
      setSkeletonVisible(false);
    }, 100);

    setTimeout(() => {
      setContentVisible(true);
    }, 500);
  }, []);

  const handleProjectClick = (projectId: string) => {
    setSelectedProjectId(projectId);
    setCurrentView('detail');
    loadProjectDetail(projectId);
  };

  const handleBackToHome = () => {
    setCurrentView('home');
    setSelectedProjectId(null);
    setCurrentProject(null);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name || !newProject.deadline) return;

    const project = await apiCreateProject({
      ...newProject,
      status: '待启动'
    });
    setProjects(prev => [...prev, project]);
    setNewProject({ name: '', description: '', deadline: '' });
    setShowCreateModal(false);
  };

  const handleAddInspiration = async (imageUrl: string, note: string) => {
    if (!selectedProjectId) return;
    const inspiration = await apiCreateInspiration({
      projectId: selectedProjectId,
      imageUrl,
      note
    });
    setInspirations(prev => [...prev, inspiration]);
  };

  const handleAddTask = async (name: string, assignee: string, priority: '高' | '中' | '低', estimatedHours: number) => {
    if (!selectedProjectId) return;
    const task = await apiCreateTask({
      projectId: selectedProjectId,
      name,
      assignee,
      priority,
      estimatedHours
    });
    setTasks(prev => [...prev, task]);
    setAllTasks(prev => [...prev, task]);
  };

  const handleToggleTask = async (taskId: string) => {
    const updatedTask = await apiToggleTaskCompletion(taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
    setAllTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
  };

  const handleReorderTasks = async (taskId: string, newOrder: number) => {
    await apiUpdateTaskOrder(taskId, newOrder);
    setTasks(prev => {
      const task = prev.find(t => t.id === taskId);
      if (!task) return prev;
      const oldOrder = task.order;
      return prev.map(t => {
        if (t.id === taskId) return { ...t, order: newOrder };
        if (oldOrder < newOrder && t.order > oldOrder && t.order <= newOrder) {
          return { ...t, order: t.order - 1 };
        }
        if (oldOrder > newOrder && t.order < oldOrder && t.order >= newOrder) {
          return { ...t, order: t.order + 1 };
        }
        return t;
      }).sort((a, b) => a.order - b.order);
    });
  };

  const handleStatusChange = async (projectId: string, status: ProjectStatus) => {
    const updated = await apiUpdateProjectStatus(projectId, status);
    setProjects(prev => prev.map(p => p.id === projectId ? updated : p));
    if (currentProject?.id === projectId) {
      setCurrentProject(updated);
    }
  };

  const getProgressColor = (progress: number) => {
    const r = Math.round(233 * (1 - progress / 100));
    const g = Math.round(69 * (progress / 100) + 186 * (progress / 100));
    const b = 96;
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div style={styles.app}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes shrink {
          from { transform: scaleY(1); opacity: 1; }
          to { transform: scaleY(0); opacity: 0; }
        }
        .skeleton {
          background: linear-gradient(90deg, #2a2a4a 25%, #3a3a5a 50%, #2a2a4a 75%);
          background-size: 200% 100%;
          animation: pulse 1.5s infinite;
          border-radius: 12px;
        }
        .skeleton-fade-out {
          animation: fadeOut 0.4s ease forwards;
          pointer-events: none;
        }
        .content-fade-in {
          animation: fadeIn 0.4s ease forwards;
        }
        @media (max-width: 1200px) {
          .project-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 768px) {
          .project-grid {
            grid-template-columns: 1fr !important;
          }
          .detail-container {
            flex-direction: column !important;
          }
        }
      `}</style>

      <header style={styles.header}>
        <h1 style={styles.logo}>🎨 创作者协作看板</h1>
        {currentView === 'detail' && (
          <button style={styles.backButton} onClick={handleBackToHome}>
            ← 返回首页
          </button>
        )}
        {currentView === 'home' && (
          <div style={styles.progressContainer}>
            <span style={styles.progressLabel}>全局进度</span>
            <div style={styles.progressBarWrapper}>
              <div
                style={{
                  ...styles.progressBarFill,
                  width: `${displayProgress}%`,
                  background: `linear-gradient(90deg, #e94560, ${getProgressColor(displayProgress)})`,
                  transition: 'width 0.5s ease, background 0.5s ease'
                }}
              />
            </div>
            <span style={styles.progressText}>{displayProgress}%</span>
          </div>
        )}
      </header>

      {currentView === 'home' ? (
        <main style={styles.main}>
          <div style={styles.topBar}>
            <h2 style={styles.pageTitle}>我的项目</h2>
            <button
              style={styles.createButton}
              onClick={() => setShowCreateModal(true)}
            >
              + 新建项目
            </button>
          </div>

          <div style={{ position: 'relative' }}>
            {loading || skeletonVisible ? (
              <div
                className={`project-grid skeleton ${!loading && !skeletonVisible ? '' : skeletonVisible && !loading ? 'skeleton-fade-out' : ''}`}
                style={styles.projectGrid}
              >
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} style={styles.skeletonCard} />
                ))}
              </div>
            ) : null}

            {!loading && contentVisible ? (
              <div
                className="project-grid content-fade-in"
                style={styles.projectGrid}
              >
                {projects.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onClick={() => handleProjectClick(project.id)}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </main>
      ) : (
        currentProject && (
          <main style={styles.detailMain}>
            <div style={styles.detailHeader}>
              <div>
                <h2 style={styles.projectTitle}>{currentProject.name}</h2>
                <p style={styles.projectDesc}>{currentProject.description}</p>
                <p style={styles.projectDeadline}>截止日期: {currentProject.deadline}</p>
              </div>
              <select
                value={currentProject.status}
                onChange={(e) => handleStatusChange(currentProject.id, e.target.value as ProjectStatus)}
                style={styles.statusSelect}
              >
                <option value="待启动">待启动</option>
                <option value="进行中">进行中</option>
                <option value="已延期">已延期</option>
                <option value="已完成">已完成</option>
              </select>
            </div>

            <div className="detail-container" style={styles.detailContainer}>
              <div style={styles.leftPanel}>
                <InspirationBoard
                  inspirations={inspirations}
                  onAddInspiration={handleAddInspiration}
                  loading={loading}
                  skeletonVisible={skeletonVisible}
                  contentVisible={contentVisible}
                />
              </div>
              <div style={styles.rightPanel}>
                <TaskList
                  tasks={tasks}
                  onAddTask={handleAddTask}
                  onToggleTask={handleToggleTask}
                  onReorderTasks={handleReorderTasks}
                  loading={loading}
                  skeletonVisible={skeletonVisible}
                  contentVisible={contentVisible}
                />
              </div>
            </div>
          </main>
        )
      )}

      {showCreateModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>创建新项目</h3>
            <form onSubmit={handleCreateProject} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>项目名称</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                  style={styles.input}
                  placeholder="请输入项目名称"
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>目标描述</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                  style={styles.textarea}
                  placeholder="请输入项目目标描述"
                  rows={3}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>截止日期</label>
                <input
                  type="date"
                  value={newProject.deadline}
                  onChange={(e) => setNewProject(prev => ({ ...prev, deadline: e.target.value }))}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ ...styles.button, ...styles.cancelButton }}
                >
                  取消
                </button>
                <button type="submit" style={styles.button}>
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#1a1a2e',
    color: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    transition: 'all 0.3s ease'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 40px',
    backgroundColor: '#16213e',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  logo: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 600,
    color: '#e94560'
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    color: '#ffffff',
    border: '1px solid #e94560',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.3s ease'
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  progressLabel: {
    fontSize: '14px',
    color: '#a0a0a0'
  },
  progressBarWrapper: {
    width: '200px',
    height: '8px',
    backgroundColor: '#2a2a4a',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '4px'
  },
  progressText: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#ffffff',
    minWidth: '45px',
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums'
  },
  main: {
    padding: '40px',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px'
  },
  pageTitle: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 600
  },
  createButton: {
    padding: '12px 24px',
    backgroundColor: '#e94560',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 500,
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
    transition: 'all 0.3s ease'
  },
  projectGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '24px',
    transition: 'all 0.3s ease'
  },
  skeletonCard: {
    height: '200px'
  },
  detailMain: {
    padding: '40px',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
    padding: '24px',
    backgroundColor: '#16213e',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
  },
  projectTitle: {
    margin: '0 0 10px 0',
    fontSize: '24px',
    fontWeight: 600
  },
  projectDesc: {
    margin: '0 0 8px 0',
    color: '#a0a0a0',
    fontSize: '14px'
  },
  projectDeadline: {
    margin: 0,
    color: '#e94560',
    fontSize: '14px',
    fontWeight: 500
  },
  statusSelect: {
    padding: '10px 16px',
    backgroundColor: '#1a1a2e',
    color: '#ffffff',
    border: '1px solid #3a3a5a',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  detailContainer: {
    display: 'flex',
    gap: '24px',
    transition: 'all 0.3s ease'
  },
  leftPanel: {
    flex: 1,
    minWidth: 0
  },
  rightPanel: {
    width: '400px',
    flexShrink: 0
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(8px)'
  },
  modalContent: {
    backgroundColor: '#16213e',
    padding: '32px',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '500px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
  },
  modalTitle: {
    margin: '0 0 24px 0',
    fontSize: '20px',
    fontWeight: 600,
    color: '#e94560'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    color: '#a0a0a0'
  },
  input: {
    padding: '12px 16px',
    backgroundColor: '#1a1a2e',
    border: '1px solid #3a3a5a',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    transition: 'all 0.3s ease'
  },
  textarea: {
    padding: '12px 16px',
    backgroundColor: '#1a1a2e',
    border: '1px solid #3a3a5a',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    resize: 'vertical',
    fontFamily: 'inherit',
    transition: 'all 0.3s ease'
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px'
  },
  button: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#e94560',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.3s ease'
  },
  cancelButton: {
    backgroundColor: 'transparent',
    border: '1px solid #3a3a5a'
  }
};

export default App;
